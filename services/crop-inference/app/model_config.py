from dataclasses import dataclass


@dataclass(frozen=True)
class CropModelConfig:
    crop: str
    model_id: str
    filename: str
    labels: tuple[str, ...]


MODELS: dict[str, CropModelConfig] = {
    "rice": CropModelConfig(
        crop="rice",
        model_id="rice-mobilenetv2-v1",
        filename="rice.h5",
        labels=("Bacterialblight", "Blast", "Brownspot", "Tungro"),
    ),
    "cotton": CropModelConfig(
        crop="cotton",
        model_id="cotton-mobilenetv2-v1",
        filename="cotton_model.h5",
        labels=("bacterial_blight", "curl_virus", "fussarium_wilt", "healthy"),
    ),
    "maize": CropModelConfig(
        crop="maize",
        model_id="maize-mobilenetv2-v1",
        filename="maize_model.h5",
        labels=("Blight", "Common_Rust", "Gray_Leaf_Spot", "Healthy"),
    ),
    "sugarcane": CropModelConfig(
        crop="sugarcane",
        model_id="sugarcane-mobilenetv2-v1",
        filename="sugercane_model.h5",
        labels=("Bacterial Blight", "Healthy", "Red Rot"),
    ),
}

INPUT_SIZE = (224, 224)
MODEL_SCORE_THRESHOLD = 0.55
MODEL_SCORE_MARGIN_THRESHOLD = 0.10
