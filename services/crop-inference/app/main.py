import hashlib
import logging
import os
import threading
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.responses import JSONResponse
from starlette.concurrency import run_in_threadpool

from app.image_processing import (
    InvalidImageError,
    preprocess_image,
)
from app.model_config import INPUT_SIZE, MODELS
from app.scoring import softmax_scores, uncertainty_reasons

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger("crop-inference")

_models: dict[str, Any] = {}
_model_status: dict[str, dict[str, Any]] = {}
_prediction_lock = threading.Lock()
_bearer = HTTPBearer(auto_error=False)


def _model_directory() -> Path:
    configured = os.getenv("CROP_MODEL_DIR")
    return Path(configured).expanduser() if configured else Path(__file__).parent.parent / "models"


def _load_models() -> None:
    try:
        import tensorflow as tf
        import tensorflow_hub as hub
    except ImportError:
        logger.exception("TensorFlow and TensorFlow Hub are required to load crop models.")
        for crop, config in MODELS.items():
            _model_status[crop] = {
                "model_id": config.model_id,
                "available": False,
                "version": None,
                "error": "tensorflow_runtime_unavailable",
            }
        return

    model_directory = _model_directory()
    for crop, config in MODELS.items():
        model_path = model_directory / config.filename
        if not model_path.is_file():
            _model_status[crop] = {
                "model_id": config.model_id,
                "available": False,
                "version": None,
                "error": "model_file_missing",
            }
            logger.error("Model file is missing for crop %s.", crop)
            continue

        try:
            model = tf.keras.models.load_model(
                model_path,
                custom_objects={"KerasLayer": hub.KerasLayer},
                compile=False,
            )
            input_shape = tuple(model.input_shape)
            output_shape = tuple(model.output_shape)
            if input_shape[1:] != (*INPUT_SIZE, 3):
                raise ValueError(f"Unexpected model input shape: {input_shape}")
            if output_shape[-1] != len(config.labels):
                raise ValueError(f"Unexpected model output shape: {output_shape}")

            digest = hashlib.sha256()
            with model_path.open("rb") as model_file:
                for chunk in iter(lambda: model_file.read(1024 * 1024), b""):
                    digest.update(chunk)

            _models[crop] = model
            _model_status[crop] = {
                "model_id": config.model_id,
                "available": True,
                "version": digest.hexdigest(),
                "error": None,
            }
            logger.info("Loaded model %s for %s.", config.model_id, crop)
        except Exception:
            _model_status[crop] = {
                "model_id": config.model_id,
                "available": False,
                "version": None,
                "error": "model_load_failed",
            }
            logger.exception("Could not load crop model %s.", config.model_id)


@asynccontextmanager
async def lifespan(_: FastAPI):
    _load_models()
    yield
    _models.clear()
    _model_status.clear()


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


def _predict(crop: str, image_batch: Any) -> dict[str, Any]:
    config = MODELS[crop]
    model = _models.get(crop)
    status = _model_status.get(crop, {})
    if model is None or not status.get("available"):
        raise HTTPException(status_code=503, detail=f"The {crop} model is not available.")

    try:
        with _prediction_lock:
            logits = model.predict(image_batch, verbose=0)
        scores = softmax_scores(logits, len(config.labels))
    except HTTPException:
        raise
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
        "model_version": status["version"],
        "scores": [
            {"class_name": label, "score": float(score)}
            for label, score in ranked
        ],
    }


@app.get("/health")
def health() -> JSONResponse:
    ready = len(_models) == len(MODELS)
    return JSONResponse(
        status_code=200 if ready else 503,
        content={
            "status": "ok" if ready else "degraded",
            "models_loaded": len(_models),
            "models_expected": len(MODELS),
        },
    )


@app.get("/models")
def model_status() -> dict[str, Any]:
    return {
        "input_size": list(INPUT_SIZE),
        "preprocessing": "RGB float32 values scaled to [0, 1] by division by 255",
        "models": [
            {
                "crop": crop,
                "model_id": config.model_id,
                "classes": list(config.labels),
                **_model_status.get(
                    crop,
                    {
                        "available": False,
                        "version": None,
                        "error": "model_not_loaded",
                    },
                ),
            }
            for crop, config in MODELS.items()
        ],
    }


@app.post("/predict")
async def predict(
    crop: str = Form(...),
    image: UploadFile = File(...),
    _: str = Depends(_authenticated_farmer),
) -> dict[str, Any]:
    if crop not in MODELS:
        raise HTTPException(status_code=422, detail="Choose rice, cotton, maize, or sugarcane.")

    contents = await image.read(5 * 1024 * 1024 + 1)
    try:
        prepared = preprocess_image(contents)
    except InvalidImageError as error:
        message = str(error)
        status_code = 413 if len(contents) > 5 * 1024 * 1024 else 400
        raise HTTPException(status_code=status_code, detail=message) from error

    result = await run_in_threadpool(_predict, crop, prepared.batch)
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
