from dataclasses import dataclass
from io import BytesIO

import numpy as np
from PIL import Image, UnidentifiedImageError

MAX_IMAGE_BYTES = 5 * 1024 * 1024
MAX_IMAGE_PIXELS = 30_000_000
ALLOWED_FORMATS = ("JPEG", "PNG", "WEBP")


class InvalidImageError(ValueError):
    pass


@dataclass(frozen=True)
class PreparedImage:
    batch: np.ndarray
    image_format: str
    source_width: int
    source_height: int


def preprocess_image(contents: bytes) -> PreparedImage:
    if not contents:
        raise InvalidImageError("The uploaded image is empty.")
    if len(contents) > MAX_IMAGE_BYTES:
        raise InvalidImageError("The image must be 5 MB or smaller.")

    try:
        with Image.open(BytesIO(contents), formats=ALLOWED_FORMATS) as source:
            image_format = (source.format or "").upper()
            if image_format not in ALLOWED_FORMATS:
                raise InvalidImageError("Use a JPEG, PNG, or WebP image.")

            source_width, source_height = source.size
            if source_width < 1 or source_height < 1:
                raise InvalidImageError("The image has invalid dimensions.")
            if source_width * source_height > MAX_IMAGE_PIXELS:
                raise InvalidImageError("The image dimensions are too large to process.")

            if source.mode == "RGB":
                resized = source.resize((224, 224), Image.Resampling.BILINEAR)
            else:
                with source.convert("RGB") as image:
                    resized = image.resize((224, 224), Image.Resampling.BILINEAR)
            pixels = np.asarray(resized, dtype=np.float32) / 255.0
    except InvalidImageError:
        raise
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as error:
        raise InvalidImageError("The uploaded file is not a readable image.") from error

    return PreparedImage(
        batch=np.expand_dims(pixels, axis=0),
        image_format=image_format,
        source_width=source_width,
        source_height=source_height,
    )
