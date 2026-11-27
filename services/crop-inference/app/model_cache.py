import gc
import hashlib
import json
import logging
import re
import sys
from collections.abc import Callable
from functools import partial
from importlib.util import find_spec
from pathlib import Path
from threading import Lock
from typing import Any

import numpy as np

from app.model_config import INPUT_SIZE, MODELS, CropModelConfig
from app.scoring import softmax_scores

logger = logging.getLogger("crop-inference")
LITERT_MANIFEST = "model-versions.json"
_SHA256 = re.compile(r"[0-9a-f]{64}")


class ModelUnavailableError(RuntimeError):
    pass


def load_keras_model(path: Path, config: CropModelConfig) -> Any:
    import tensorflow as tf
    import tensorflow_hub as hub

    model = tf.keras.models.load_model(
        path, custom_objects={"KerasLayer": hub.KerasLayer}, compile=False
    )
    if tuple(model.input_shape)[1:] != (*INPUT_SIZE, 3):
        raise ValueError(f"Unexpected model input shape: {model.input_shape}")
    if tuple(model.output_shape)[-1] != len(config.labels):
        raise ValueError(f"Unexpected model output shape: {model.output_shape}")
    return model


def litert_filename(config: CropModelConfig) -> str:
    return Path(config.filename).with_suffix(".tflite").name


def sha256_file(path: Path) -> str:
    with path.open("rb") as model_file:
        return hashlib.file_digest(model_file, "sha256").hexdigest()


def _load_litert_predictor(path: Path, config: CropModelConfig) -> Callable[[Any], Any]:
    from ai_edge_litert.interpreter import Interpreter

    interpreter = Interpreter(model_path=str(path), num_threads=1)
    interpreter.allocate_tensors()
    (model_input,) = interpreter.get_input_details()
    (model_output,) = interpreter.get_output_details()
    if tuple(model_input["shape"]) != (1, *INPUT_SIZE, 3) or model_input["dtype"] != np.float32:
        raise ValueError("Unexpected LiteRT model input.")
    if tuple(model_output["shape"]) != (1, len(config.labels)) or model_output["dtype"] != np.float32:
        raise ValueError("Unexpected LiteRT model output.")

    def predict(batch: Any) -> Any:
        interpreter.set_tensor(model_input["index"], batch)
        interpreter.invoke()
        return interpreter.get_tensor(model_output["index"])

    return predict


def _read_manifest(directory: Path) -> dict[str, Any]:
    try:
        manifest = json.loads((directory / LITERT_MANIFEST).read_text(encoding="utf-8"))
        if isinstance(manifest, dict):
            return manifest
    except (OSError, ValueError):
        logger.exception("Could not read the LiteRT model manifest.")
    return {}


class CropModelCache:
    def __init__(self, directory: Path, runtime: str = "keras") -> None:
        if runtime not in ("keras", "litert"):
            raise ValueError("CROP_MODEL_RUNTIME must be keras or litert.")
        self._directory = directory
        self._runtime = runtime
        self._lock = Lock()
        self._model: Callable[[Any], Any] | None = None
        self._crop: str | None = None
        self._versions: dict[str, str] = {}
        self._errors: dict[str, str] = {}

        packages = ("ai_edge_litert",) if runtime == "litert" else ("tensorflow", "tensorflow_hub")
        runtime_installed = all(find_spec(name) is not None for name in packages)
        manifest = _read_manifest(directory) if runtime == "litert" and runtime_installed else {}
        for crop, config in MODELS.items():
            if not runtime_installed:
                self._errors[crop] = "tensorflow_runtime_unavailable"
                continue
            try:
                digest = sha256_file(self._path(config))
            except OSError:
                self._errors[crop] = "model_file_missing"
                logger.warning("Model file missing or unreadable for crop %s.", crop)
                continue
            if runtime == "litert":
                entry = manifest.get(crop)
                source = entry.get("source_sha256") if isinstance(entry, dict) else None
                if not isinstance(source, str) or not _SHA256.fullmatch(source) or entry.get("artifact_sha256") != digest:
                    self._errors[crop] = "model_load_failed"
                    logger.error("LiteRT artifact or manifest mismatch for crop %s.", crop)
                    continue
                digest = source
            self._versions[crop] = digest

    def _path(self, config: CropModelConfig) -> Path:
        filename = litert_filename(config) if self._runtime == "litert" else config.filename
        return self._directory / filename

    def _load(self, config: CropModelConfig) -> Callable[[Any], Any]:
        if self._runtime == "litert":
            return _load_litert_predictor(self._path(config), config)
        model = load_keras_model(self._path(config), config)
        # A direct call avoids a tf.data pipeline for the single-image batch.
        return partial(model, training=False)

    @property
    def loaded_count(self) -> int:
        return int(self._crop is not None)

    def status(self, crop: str) -> dict[str, Any]:
        error = self._errors.get(crop)
        return {
            "available": error is None,
            "version": self._versions.get(crop) if error is None else None,
            "error": error,
        }

    def _release(self) -> None:
        self._crop = None
        self._model = None
        # Loading may fail after TensorFlow was imported, so clear its state even
        # when there was no usable model to cache.
        if self._runtime == "keras":
            tensorflow = sys.modules.get("tensorflow")
            if tensorflow is not None:
                tensorflow.keras.backend.clear_session()
                gc.collect()

    def close(self) -> None:
        with self._lock:
            if self._model is not None:
                self._release()

    def predict(self, crop: str, batch: Any) -> tuple[str, list[float]]:
        with self._lock:
            if crop not in self._versions:
                raise ModelUnavailableError(crop)
            if self._crop != crop:
                if self._model is not None:
                    self._release()
                config = MODELS[crop]
                try:
                    self._model = self._load(config)
                except ImportError:
                    self._errors[crop] = "tensorflow_runtime_unavailable"
                    logger.exception("Model runtime unavailable for crop %s.", crop)
                except Exception:
                    self._errors[crop] = "model_load_failed"
                    logger.exception("Could not load crop model %s.", config.model_id)
                if self._model is None:
                    self._release()
                    raise ModelUnavailableError(crop)

                self._crop = crop
                self._errors.pop(crop, None)
                logger.info("Loaded model %s for %s.", config.model_id, crop)

            scores = softmax_scores(self._model(batch), len(MODELS[crop].labels))
            return self._versions[crop], scores
