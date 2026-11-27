import type {
  CropDiseasePrediction,
  SupportedCrop,
} from '@/models/cropDiseaseAssessment';
import { isLoopbackHostname, parseCropDoctorUrl } from '@/lib/cropDoctorUrl';

function getInferenceUrl(): string {
  const configuredUrl = process.env.NEXT_PUBLIC_CROP_DOCTOR_API_URL?.trim();
  if (!configuredUrl) throw new Error('Crop image analysis is currently unavailable.');

  const allowLocal = typeof window !== 'undefined' && isLoopbackHostname(window.location.hostname);
  const url = parseCropDoctorUrl(configuredUrl, allowLocal);
  if (!url) throw new Error('Crop image analysis is unavailable because the service URL is invalid.');
  return url.href.replace(/\/+$/, '');
}

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
  const response = await fetch(`${getInferenceUrl()}/models`, { cache: 'no-store', signal: AbortSignal.timeout(10_000) });
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
  const body = new FormData();
  body.append('crop', crop);
  body.append('image', image);

  const response = await fetch(`${getInferenceUrl()}/predict`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${idToken}` },
    body,
    redirect: 'error',
    signal: AbortSignal.timeout(45_000),
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
