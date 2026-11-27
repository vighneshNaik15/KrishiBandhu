import argparse
import gc
import json
from pathlib import Path
from tempfile import TemporaryDirectory

import numpy as np

from app.model_cache import LITERT_MANIFEST, litert_filename, load_keras_model, sha256_file
from app.model_config import INPUT_SIZE, MODELS, CropModelConfig


def _convert(source: Path, config: CropModelConfig, inputs: list[np.ndarray]) -> bytes:
    import tensorflow as tf

    model = load_keras_model(source, config)
    converter = tf.lite.TFLiteConverter.from_keras_model(model)
    converter.target_spec.supported_ops = [tf.lite.OpsSet.TFLITE_BUILTINS]
    artifact = converter.convert()
    interpreter = tf.lite.Interpreter(model_content=artifact, num_threads=1)
    interpreter.allocate_tensors()
    input_index = interpreter.get_input_details()[0]["index"]
    output_index = interpreter.get_output_details()[0]["index"]
    for batch in inputs:
        interpreter.set_tensor(input_index, batch)
        interpreter.invoke()
        original = model(batch, training=False).numpy()
        converted = interpreter.get_tensor(output_index)
        np.testing.assert_allclose(converted, original, rtol=0.0001, atol=0.00025)
        np.testing.assert_array_equal(converted.argmax(axis=1), original.argmax(axis=1))
    return artifact


def main() -> None:
    parser = argparse.ArgumentParser(description="Export and verify float32 LiteRT crop models.")
    parser.add_argument("source", type=Path, help="Directory containing the four original .h5 models")
    parser.add_argument("output", type=Path, help="New directory for the deployment artifacts")
    arguments = parser.parse_args()
    if arguments.output.exists():
        parser.error("The output directory must be new.")

    import tensorflow as tf

    shape = (1, *INPUT_SIZE, 3)
    inputs = [np.full(shape, level, dtype=np.float32) for level in (0.0, 0.4, 1.0)]
    inputs.append(np.random.default_rng(808).random(shape, dtype=np.float32))

    arguments.output.parent.mkdir(parents=True, exist_ok=True)
    with TemporaryDirectory(dir=arguments.output.parent) as staging:
        directory = Path(staging) / "export"
        directory.mkdir()
        manifest = {}
        for crop, config in MODELS.items():
            source = arguments.source / config.filename
            artifact = directory / litert_filename(config)
            artifact.write_bytes(_convert(source, config, inputs))
            manifest[crop] = {"source_sha256": sha256_file(source), "artifact_sha256": sha256_file(artifact)}
            tf.keras.backend.clear_session()
            gc.collect()
            print(f"{crop}: float32 compatibility checks passed", flush=True)
        (directory / LITERT_MANIFEST).write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
        directory.rename(arguments.output)


if __name__ == "__main__":
    main()
