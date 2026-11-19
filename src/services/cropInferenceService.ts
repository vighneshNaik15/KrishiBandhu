import type {
  CropDiseasePrediction,
  SupportedCrop,
} from '@/models/cropDiseaseAssessment';

const inferenceUrl = process.env.NEXT_PUBLIC_CROP_DOCTOR_API_URL?.replace(/\/+$/, '');

export interface CropModelStatus {
  crop: SupportedCrop;
  model_id: string;
  classes: string[];
  available: boolean;
  version: string | null;
  error: string | null;
}

interface ModelStatusResponse {
  models: CropModelStatus[];
}

export async function getCropModelStatuses(): Promise<CropModelStatus[]> {
  if (!inferenceUrl) {
    throw new Error('Set NEXT_PUBLIC_CROP_DOCTOR_API_URL to the running inference service.');
  }

  const response = await fetch(`${inferenceUrl}/models`, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`The inference service returned HTTP ${response.status} while loading model status.`);
  }

  const result = await response.json() as ModelStatusResponse;
  if (!Array.isArray(result.models)) {
    throw new Error('The inference service returned an invalid model-status response.');
  }
  return result.models;
}

export async function analyzeCropImage(
  crop: SupportedCrop,
  image: File,
  idToken: string
): Promise<CropDiseasePrediction> {
  if (!inferenceUrl) {
    throw new Error('Set NEXT_PUBLIC_CROP_DOCTOR_API_URL to the running inference service.');
  }

  const body = new FormData();
  body.append('crop', crop);
  body.append('image', image);

  const response = await fetch(`${inferenceUrl}/predict`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${idToken}` },
    body,
  });
  const result = await response.json().catch(() => null) as
    | CropDiseasePrediction
    | { detail?: string }
    | null;

  if (!response.ok) {
    const detail = result && 'detail' in result && typeof result.detail === 'string'
      ? result.detail
      : `The inference service returned HTTP ${response.status}.`;
    throw new Error(detail);
  }

  if (
    !result ||
    !('scores' in result) ||
    !Array.isArray(result.scores) ||
    !result.scores.length ||
    result.crop !== crop
  ) {
    throw new Error('The inference service returned an invalid prediction response.');
  }
  return result;
}
