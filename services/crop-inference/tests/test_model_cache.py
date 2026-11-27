import asyncio
import json
import tempfile
import threading
import unittest
import weakref
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

import numpy as np

from app.main import app, health, lifespan, model_status
from app.model_cache import LITERT_MANIFEST, CropModelCache, ModelUnavailableError, sha256_file
from app.model_config import MODELS


class CropModelCacheTests(unittest.TestCase):
    def setUp(self):
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        self.directory = Path(directory.name)
        for config in MODELS.values():
            (self.directory / config.filename).write_bytes(config.crop.encode())
        runtime = patch("app.model_cache.find_spec", return_value=object())
        runtime.start()
        self.addCleanup(runtime.stop)

    def test_status_endpoints_keep_the_cache_cold(self):
        async def check():
            async with lifespan(app):
                request = SimpleNamespace(app=app)
                self.assertEqual(await health(request), {
                    "status": "ok", "models_loaded": 0, "models_expected": 4,
                })
                models = (await model_status(request))["models"]
                self.assertTrue(all(model["available"] for model in models))
                self.assertTrue(all(len(model["version"]) == 64 for model in models))

        with patch("app.main._model_directory", return_value=self.directory), \
             patch.dict("os.environ", {"CROP_MODEL_RUNTIME": "keras"}), \
             patch("app.model_cache.load_keras_model") as load:
            asyncio.run(check())
            load.assert_not_called()

    def test_concurrent_crop_switch_evicts_before_loading_and_reuses_warm_model(self):
        cache = CropModelCache(self.directory)
        self.addCleanup(cache.close)
        predicting = threading.Event()
        switch_requested = threading.Event()
        finish = threading.Event()
        loaded = []
        references = []

        class Model:
            def __init__(self, crop):
                self.crop = crop

            def __call__(self, batch, *, training):
                if self.crop == "cotton":
                    predicting.set()
                    if not finish.wait(timeout=5):
                        raise TimeoutError("Test did not release the prediction.")
                return np.zeros((1, len(MODELS[self.crop].labels)))

        def load(path, config):
            self.assertTrue(all(reference() is None for reference in references))
            model = Model(config.crop)
            references.append(weakref.ref(model))
            loaded.append(config.crop)
            return model

        def switch_crop():
            switch_requested.set()
            return cache.predict("maize", None)

        with patch("app.model_cache.load_keras_model", side_effect=load), ThreadPoolExecutor(2) as pool:
            first = pool.submit(cache.predict, "cotton", None)
            try:
                self.assertTrue(predicting.wait(timeout=5))
                second = pool.submit(switch_crop)
                self.assertTrue(switch_requested.wait(timeout=5))
                self.assertFalse(second.done())
            finally:
                finish.set()
            self.assertEqual(sum(first.result(timeout=5)[1]), 1.0)
            self.assertEqual(sum(second.result(timeout=5)[1]), 1.0)
            cache.predict("maize", None)

        self.assertEqual(loaded, ["cotton", "maize"])
        self.assertEqual(cache.loaded_count, 1)
        cache.close()
        self.assertEqual(cache.loaded_count, 0)
        self.assertTrue(all(reference() is None for reference in references))

    def test_litert_preserves_the_original_version_and_rejects_mismatched_files(self):
        config = MODELS["rice"]
        converted = self.directory / "rice.tflite"
        converted.write_bytes(b"converted model")
        version = sha256_file(self.directory / config.filename)
        (self.directory / LITERT_MANIFEST).write_text(json.dumps({"rice": {
            "source_sha256": version, "artifact_sha256": sha256_file(converted),
        }}), encoding="utf-8")

        cache = CropModelCache(self.directory, "litert")
        self.assertEqual(cache.status("rice"), {"available": True, "version": version, "error": None})
        converted.write_bytes(b"different file")
        invalid_cache = CropModelCache(self.directory, "litert")
        self.assertEqual(invalid_cache.status("rice")["error"], "model_load_failed")
        with self.assertRaises(ModelUnavailableError):
            invalid_cache.predict("rice", None)
