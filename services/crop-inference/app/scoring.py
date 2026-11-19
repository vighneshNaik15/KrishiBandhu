import math

import numpy as np

from app.model_config import (
    MODEL_SCORE_MARGIN_THRESHOLD,
    MODEL_SCORE_THRESHOLD,
)


def softmax_scores(logits: np.ndarray, expected_classes: int) -> list[float]:
    values = np.asarray(logits, dtype=np.float64)
    if values.shape != (1, expected_classes):
        raise ValueError("The model output does not match its configured class count.")
    if not np.isfinite(values).all():
        raise ValueError("The model returned non-finite scores.")

    shifted = values[0] - np.max(values[0])
    exponentials = np.exp(shifted)
    denominator = float(np.sum(exponentials))
    if not math.isfinite(denominator) or denominator <= 0:
        raise ValueError("The model returned invalid scores.")
    return (exponentials / denominator).tolist()


def uncertainty_reasons(
    scores: list[float],
    source_width: int,
    source_height: int,
) -> list[str]:
    ordered = sorted(scores, reverse=True)
    reasons: list[str] = []
    if ordered[0] < MODEL_SCORE_THRESHOLD:
        reasons.append("low_model_score")
    if len(ordered) > 1 and ordered[0] - ordered[1] < MODEL_SCORE_MARGIN_THRESHOLD:
        reasons.append("small_score_margin")
    if min(source_width, source_height) < 224:
        reasons.append("low_source_resolution")
    return reasons
