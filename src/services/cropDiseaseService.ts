import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, storage } from '@/lib/firebase/config';
import { COLLECTIONS } from '@/lib/constants';
import type {
  CropDiseaseAssessment,
  CropDiseasePrediction,
} from '@/models/cropDiseaseAssessment';

const IMAGE_FORMAT: Record<CropDiseasePrediction['source_image']['format'], {
  extension: string;
  contentType: string;
}> = {
  JPEG: { extension: 'jpg', contentType: 'image/jpeg' },
  PNG: { extension: 'png', contentType: 'image/png' },
  WEBP: { extension: 'webp', contentType: 'image/webp' },
};

export const cropDiseaseService = {
  async saveReport(
    farmerUid: string,
    image: File,
    prediction: CropDiseasePrediction
  ): Promise<void> {
    const format = IMAGE_FORMAT[prediction.source_image.format];
    if (!format) {
      throw new Error('The inference service returned an unsupported image format.');
    }

    const assessmentRef = doc(collection(db, COLLECTIONS.CROP_DISEASE_ANALYSES));
    const imageStoragePath =
      `cropDiseaseReports/${farmerUid}/${assessmentRef.id}/image.${format.extension}`;
    const imageRef = ref(storage, imageStoragePath);

    await uploadBytes(imageRef, image, { contentType: format.contentType });

    try {
      await setDoc(assessmentRef, {
        assessmentId: assessmentRef.id,
        farmerUid,
        selectedCrop: prediction.crop,
        predictedDisease: prediction.predicted_class,
        modelId: prediction.model_id,
        modelVersion: prediction.model_version,
        modelScore: prediction.scores[0]?.score ?? 0,
        alternativeScores: prediction.scores.slice(1),
        imageStoragePath,
        assessedAt: serverTimestamp(),
        status: prediction.uncertain ? 'uncertain' : 'unverified',
      });
    } catch (error) {
      try {
        await deleteObject(imageRef);
      } catch (cleanupError) {
        console.error('Failed to remove an image after its report could not be saved.', cleanupError);
        throw new Error('The report could not be saved, and its image could not be removed. Contact support.');
      }
      throw error;
    }
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

  async getImageUrl(imageStoragePath: string): Promise<string> {
    return getDownloadURL(ref(storage, imageStoragePath));
  },
};
