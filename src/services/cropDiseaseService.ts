import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { readLegacyPhoto } from './legacyPhotoService';
import { COLLECTIONS } from '@/lib/constants';
import type {
  CropDiseaseAssessment,
} from '@/models/cropDiseaseAssessment';

export const cropDiseaseService = {
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
