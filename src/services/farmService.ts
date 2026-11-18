import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { COLLECTIONS } from '@/lib/constants';
import type { Farm, CreateFarmData } from '@/models/farm';

export const farmService = {
  async getById(farmId: string): Promise<Farm | null> {
    const snap = await getDoc(doc(db, COLLECTIONS.FARMS, farmId));
    return snap.exists() ? ({ farmId: snap.id, ...snap.data() } as Farm) : null;
  },

  async getByFarmer(farmerId: string): Promise<Farm[]> {
    const q = query(
      collection(db, COLLECTIONS.FARMS),
      where('farmerId', '==', farmerId),
      where('farmerUserId', '==', farmerId),
      where('isActive', '==', true),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ farmId: d.id, ...d.data() } as Farm));
  },

  async create(data: CreateFarmData): Promise<string> {
    const ref = await addDoc(collection(db, COLLECTIONS.FARMS), {
      ...data,
      images: [],
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  },

  async update(farmId: string, data: Partial<Farm>): Promise<void> {
    await updateDoc(doc(db, COLLECTIONS.FARMS, farmId), {
      ...data,
      updatedAt: serverTimestamp(),
    });
  },

  async delete(farmId: string): Promise<void> {
    // Soft delete
    await updateDoc(doc(db, COLLECTIONS.FARMS, farmId), {
      isActive: false,
      updatedAt: serverTimestamp(),
    });
  },
};
