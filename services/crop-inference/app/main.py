import asyncio
import logging
import os
from collections.abc import AsyncGenerator
from concurrent.futures import ThreadPoolExecutor
from contextlib import asynccontextmanager
from pathlib import Path
from time import monotonic
from typing import Any

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from starlette.datastructures import UploadFile
from starlette.formparsers import MultiPartException, MultiPartParser

from app.image_processing import (
    InvalidImageError,
    MAX_IMAGE_BYTES,
    preprocess_image,
)
from app.model_cache import CropModelCache, ModelUnavailableError
from app.model_config import INPUT_SIZE, MODELS
from app.scoring import uncertainty_reasons

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger("crop-inference")

_inference_window = 0.0
_inference_counts: dict[str, int] = {}
_inference_total = 0


def _limit_inference(uid: str) -> None:
    # Called on the async request loop before reading the upload.
    global _inference_window, _inference_total
    now = monotonic()
    if now - _inference_window >= 60:
        _inference_window = now
        _inference_counts.clear()
        _inference_total = 0
    count = _inference_counts.get(uid, 0)
    if count >= 8 or _inference_total >= 32:
        raise HTTPException(status_code=429, detail="Inference limit reached. Try again in a minute.",
                            headers={"Retry-After": "60"})
    _inference_counts[uid] = count + 1
    _inference_total += 1


_bearer = HTTPBearer(auto_error=False)


def _model_directory() -> Path:
    configured = os.getenv("CROP_MODEL_DIR")
    return Path(configured).expanduser() if configured else Path(__file__).parent.parent / "models"


@asynccontextmanager
async def lifespan(application: FastAPI):
    cache = CropModelCache(_model_directory(), os.getenv("CROP_MODEL_RUNTIME", "keras"))
    application.state.model_cache = cache
    application.state.inference_slot = asyncio.Lock()
    # Keep Keras session setup, inference and teardown on the same thread.
    with ThreadPoolExecutor(max_workers=1) as executor:
        application.state.inference_executor = executor
        try:
            yield
        finally:
            await asyncio.get_running_loop().run_in_executor(executor, cache.close)


app = FastAPI(
    title="KrishiBandhu Crop Inference",
    version="1.0.0",
    lifespan=lifespan,
)

allowed_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:3000").split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
)


def _authenticated_farmer(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> str:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="A Firebase sign-in token is required.")

    try:
        import firebase_admin
        from firebase_admin import auth, firestore
    except ImportError as error:
        logger.exception("Firebase Admin SDK is not installed.")
        raise HTTPException(status_code=503, detail="Firebase authentication is unavailable.") from error

    try:
        firebase_admin.get_app()
    except ValueError:
        options = {}
        project_id = os.getenv("FIREBASE_PROJECT_ID")
        if project_id:
            options["projectId"] = project_id
        try:
            firebase_admin.initialize_app(options=options or None)
        except Exception as error:
            logger.exception("Firebase Admin could not initialize with Application Default Credentials.")
            raise HTTPException(status_code=503, detail="Firebase authentication is unavailable.") from error

    try:
        claims = auth.verify_id_token(credentials.credentials, check_revoked=True)
    except (ValueError, auth.InvalidIdTokenError, auth.ExpiredIdTokenError, auth.RevokedIdTokenError) as error:
        raise HTTPException(status_code=401, detail="The Firebase sign-in token is invalid or expired.") from error
    except Exception as error:
        logger.exception("Firebase ID-token verification failed.")
        raise HTTPException(status_code=503, detail="Firebase authentication is unavailable.") from error

    uid = claims.get("uid")
    if not isinstance(uid, str) or not uid:
        raise HTTPException(status_code=401, detail="The Firebase token has no user identifier.")

    try:
        profile = firestore.client().collection("users").document(uid).get()
    except Exception as error:
        logger.exception("Could not verify the farmer profile.")
        raise HTTPException(status_code=503, detail="Farmer authorization is unavailable.") from error

    profile_data = profile.to_dict() if profile.exists else None
    if not profile_data or profile_data.get("role") != "farmer" or profile_data.get("isActive") is not True:
        raise HTTPException(status_code=403, detail="An active farmer account is required.")
    return uid


def _predict(cache: CropModelCache, crop: str, image_batch: Any) -> dict[str, Any]:
    config = MODELS[crop]
    try:
        version, scores = cache.predict(crop, image_batch)
    except ModelUnavailableError as error:
        raise HTTPException(status_code=503, detail=f"The {crop} model is not available.") from error
    except Exception as error:
        logger.exception("Inference failed for crop %s.", crop)
        raise HTTPException(status_code=500, detail="The crop image could not be analyzed.") from error

    ranked = sorted(
        zip(config.labels, scores, strict=True),
        key=lambda item: item[1],
        reverse=True,
    )
    return {
        "crop": crop,
        "predicted_class": ranked[0][0],
        "model_id": config.model_id,
        "model_version": version,
        "scores": [
            {"class_name": label, "score": float(score)}
            for label, score in ranked
        ],
    }


@app.get("/health")
async def health(request: Request) -> dict[str, Any]:
    return {
        "status": "ok",
        "models_loaded": request.app.state.model_cache.loaded_count,
        "models_expected": len(MODELS),
    }


@app.get("/models")
async def model_status(request: Request) -> dict[str, Any]:
    cache = request.app.state.model_cache
    return {
        "input_size": list(INPUT_SIZE),
        "preprocessing": "RGB float32 values scaled to [0, 1] by division by 255",
        "models": [
            {
                "crop": crop,
                "model_id": config.model_id,
                "classes": list(config.labels),
                **cache.status(crop),
            }
            for crop, config in MODELS.items()
        ],
    }


_MAX_MULTIPART_BYTES = MAX_IMAGE_BYTES + 64 * 1024
_IMAGE_SIZE_MESSAGE = "The image must be 5 MB or smaller."


class UploadTooLarge(MultiPartException):
    pass


async def _bounded_body(request: Request) -> AsyncGenerator[bytes, None]:
    received = 0
    async for chunk in request.stream():
        received += len(chunk)
        if received > _MAX_MULTIPART_BYTES:
            raise UploadTooLarge(_IMAGE_SIZE_MESSAGE)
        yield chunk


async def _read_image(request: Request) -> tuple[str, bytes]:
    parser = MultiPartParser(request.headers, _bounded_body(request), max_files=1, max_fields=1)
    try:
        form = await parser.parse()
    except UploadTooLarge as error:
        raise HTTPException(status_code=413, detail=error.message) from error
    except MultiPartException as error:
        raise HTTPException(status_code=400, detail=error.message) from error

    try:
        crop = form.get("crop")
        image = form.get("image")
        if not isinstance(crop, str) or crop not in MODELS or not isinstance(image, UploadFile):
            raise HTTPException(status_code=422, detail="Choose a supported crop and attach a photo.")
        return crop, await image.read(MAX_IMAGE_BYTES + 1)
    finally:
        await form.close()


@app.post("/predict")
async def predict(
    request: Request,
    farmer_uid: str = Depends(_authenticated_farmer),
) -> dict[str, Any]:
    if not request.headers.get("content-type", "").lower().startswith("multipart/form-data;"):
        raise HTTPException(status_code=415, detail="Use a multipart crop photo upload.")
    try:
        declared_size = int(request.headers.get("content-length", "0"))
    except ValueError as error:
        raise HTTPException(status_code=400, detail="Invalid content length.") from error
    if declared_size > _MAX_MULTIPART_BYTES:
        raise HTTPException(status_code=413, detail=_IMAGE_SIZE_MESSAGE)

    _limit_inference(farmer_uid)
    # Keep only one request's upload, decoded image and inference in flight.
    state = request.app.state
    loop = asyncio.get_running_loop()
    async with state.inference_slot:
        crop, contents = await _read_image(request)
        try:
            prepared = await loop.run_in_executor(state.inference_executor, preprocess_image, contents)
        except InvalidImageError as error:
            status_code = 413 if len(contents) > MAX_IMAGE_BYTES else 400
            raise HTTPException(status_code=status_code, detail=str(error)) from error
        del contents

        result = await loop.run_in_executor(state.inference_executor, _predict, state.model_cache, crop, prepared.batch)
    reasons = uncertainty_reasons(
        [score["score"] for score in result["scores"]],
        prepared.source_width,
        prepared.source_height,
    )
    result.update(
        {
            "uncertain": bool(reasons),
            "uncertainty_reasons": reasons,
            "review_required": True,
            "source_image": {
                "width": prepared.source_width,
                "height": prepared.source_height,
                "format": prepared.image_format,
            },
        }
    )
    return result
