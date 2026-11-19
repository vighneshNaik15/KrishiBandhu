import unittest
from io import BytesIO

import numpy as np
from PIL import Image

from app.image_processing import InvalidImageError, preprocess_image
from app.model_config import MODELS
from app.scoring import softmax_scores, uncertainty_reasons


def encoded_image(size: tuple[int, int], image_format: str = "JPEG") -> bytes:
    image = Image.new("RGB", size, (255, 128, 0))
    buffer = BytesIO()
    image.save(buffer, format=image_format)
    return buffer.getvalue()


class ImagePreprocessingTests(unittest.TestCase):
    def test_preprocesses_rgb_and_scales_to_model_input(self) -> None:
        prepared = preprocess_image(encoded_image((320, 240)))

        self.assertEqual(prepared.batch.shape, (1, 224, 224, 3))
        self.assertEqual(prepared.batch.dtype, np.float32)
        self.assertTrue(np.all(prepared.batch >= 0))
        self.assertTrue(np.all(prepared.batch <= 1))
        self.assertEqual((prepared.source_width, prepared.source_height), (320, 240))

    def test_rejects_unreadable_or_oversized_images(self) -> None:
        with self.assertRaises(InvalidImageError):
            preprocess_image(b"not an image")

        with self.assertRaises(InvalidImageError):
            preprocess_image(encoded_image((224, 224), "GIF"))

        with self.assertRaises(InvalidImageError):
            preprocess_image(b"x" * (5 * 1024 * 1024 + 1))


class ScoringTests(unittest.TestCase):
    def test_softmax_returns_normalized_scores_for_configured_output(self) -> None:
        scores = softmax_scores(np.array([[2.0, 1.0, 0.0]]), 3)

        self.assertAlmostEqual(sum(scores), 1.0)
        self.assertGreater(scores[0], scores[1])

    def test_rejects_wrong_output_dimensions(self) -> None:
        with self.assertRaises(ValueError):
            softmax_scores(np.array([[1.0, 2.0]]), 3)

    def test_flags_low_score_margin_and_low_resolution(self) -> None:
        reasons = uncertainty_reasons([0.49, 0.46, 0.03, 0.02], 180, 400)

        self.assertEqual(
            reasons,
            ["low_model_score", "small_score_margin", "low_source_resolution"],
        )


class ModelConfigurationTests(unittest.TestCase):
    def test_training_label_order_matches_each_output_dimension(self) -> None:
        expected = {
            "rice": ("Bacterialblight", "Blast", "Brownspot", "Tungro"),
            "cotton": ("bacterial_blight", "curl_virus", "fussarium_wilt", "healthy"),
            "maize": ("Blight", "Common_Rust", "Gray_Leaf_Spot", "Healthy"),
            "sugarcane": ("Bacterial Blight", "Healthy", "Red Rot"),
        }

        self.assertEqual(
            {crop: config.labels for crop, config in MODELS.items()},
            expected,
        )


if __name__ == "__main__":
    unittest.main()
