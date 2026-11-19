import type { Timestamp } from 'firebase/firestore';

export type SupportedCrop = 'rice' | 'cotton' | 'maize' | 'sugarcane';

export interface CropDiseaseScore {
  class_name: string;
  score: number;
}

export interface CropDiseasePrediction {
  crop: SupportedCrop;
  predicted_class: string;
  model_id: string;
  model_version: string;
  scores: CropDiseaseScore[];
  uncertain: boolean;
  uncertainty_reasons: string[];
  review_required: true;
  source_image: {
    width: number;
    height: number;
    format: 'JPEG' | 'PNG' | 'WEBP';
  };
}

export interface CropDiseaseAssessment {
  assessmentId: string;
  farmerUid: string;
  selectedCrop: SupportedCrop;
  predictedDisease: string;
  modelId: string;
  modelVersion: string;
  modelScore: number;
  alternativeScores: CropDiseaseScore[];
  imageStoragePath: string;
  assessedAt: Timestamp;
  status: 'uncertain' | 'unverified';
}
