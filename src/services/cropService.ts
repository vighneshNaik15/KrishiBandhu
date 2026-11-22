import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc,
  query, where, orderBy, serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { COLLECTIONS } from '@/lib/constants';
import type { Crop, CreateCropData } from '@/models/crop';
import { Timestamp } from 'firebase/firestore';

export const cropService = {
  async getById(cropId: string): Promise<Crop | null> {
    const snap = await getDoc(doc(db, COLLECTIONS.CROPS, cropId));
    return snap.exists() ? ({ cropId: snap.id, ...snap.data() } as Crop) : null;
  },

  async getByFarmer(farmerUserId: string): Promise<Crop[]> {
    const q = query(
      collection(db, COLLECTIONS.CROPS),
      where('farmerUserId', '==', farmerUserId),
      where('farmerId', '==', farmerUserId),
      where('isActive', '==', true),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ cropId: d.id, ...d.data() } as Crop));
  },

  async getByFarm(farmId: string, farmerUserId: string): Promise<Crop[]> {
    const q = query(
      collection(db, COLLECTIONS.CROPS),
      where('farmId', '==', farmId),
      where('farmerUserId', '==', farmerUserId),
      where('farmerId', '==', farmerUserId),
      where('isActive', '==', true),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ cropId: d.id, ...d.data() } as Crop));
  },

  async create(data: CreateCropData): Promise<string> {
    const ref = await addDoc(collection(db, COLLECTIONS.CROPS), {
      ...Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)),
      sowingDate: data.sowingDate ? Timestamp.fromDate(data.sowingDate) : null,
      expectedHarvestDate: data.expectedHarvestDate ? Timestamp.fromDate(data.expectedHarvestDate) : null,
      actualHarvestDate: null,
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  },

  async update(cropId: string, data: Partial<Crop>): Promise<void> {
    await updateDoc(doc(db, COLLECTIONS.CROPS, cropId), {
      ...data,
      updatedAt: serverTimestamp(),
    });
  },

  async delete(cropId: string): Promise<void> {
    await updateDoc(doc(db, COLLECTIONS.CROPS, cropId), {
      isActive: false,
      updatedAt: serverTimestamp(),
    });
  },
};
