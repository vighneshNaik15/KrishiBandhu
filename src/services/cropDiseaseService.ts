import {
  collection,
  getDocs, doc, setDoc, serverTimestamp,
  limit,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { readLegacyPhoto } from './legacyPhotoService';
import { COLLECTIONS } from '@/lib/constants';
import type {
  CropDiseaseAssessment, CropDiseasePrediction,
} from '@/models/cropDiseaseAssessment';

export const cropDiseaseService = {
  async save(id: string, farmerUid: string, prediction: CropDiseasePrediction) {
    await setDoc(doc(db, COLLECTIONS.CROP_DISEASE_ANALYSES, id), {
      assessmentId: id, farmerUid, selectedCrop: prediction.crop,
      predictedDisease: prediction.predicted_class, modelId: prediction.model_id,
      modelVersion: prediction.model_version, modelScore: prediction.scores[0].score,
      alternativeScores: [], assessedAt: serverTimestamp(),
      status: prediction.uncertain ? 'uncertain' : 'unverified',
    });
  },

  async getByFarmer(farmerUid: string): Promise<CropDiseaseAssessment[]> {
    const assessmentsQuery = query(
      collection(db, COLLECTIONS.CROP_DISEASE_ANALYSES),
      where('farmerUid', '==', farmerUid),
      orderBy('assessedAt', 'desc'),
      limit(30)
    );
    const snapshot = await getDocs(assessmentsQuery);
    return snapshot.docs.map((assessment) => ({
      assessmentId: assessment.id,
      ...assessment.data(),
    } as CropDiseaseAssessment));
  },

  async getImage(report: CropDiseaseAssessment): Promise<Blob> {
    if (!report.imageStoragePath) throw new Error('Report photo is unavailable.');
    return readLegacyPhoto(report.imageStoragePath);
  },
};
