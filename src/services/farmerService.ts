import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { COLLECTIONS } from '@/lib/constants';
import type { CreateFarmerData, Farmer } from '@/models/farmer';

export const farmerService = {
  async getByUserId(userId: string): Promise<Farmer | null> {
    const snapshot = await getDoc(doc(db, COLLECTIONS.FARMER_PROFILES, userId));
    return snapshot.exists()
      ? ({ farmerId: snapshot.id, ...snapshot.data() } as Farmer)
      : null;
  },

  async createProfile(data: CreateFarmerData): Promise<void> {
    await setDoc(doc(db, COLLECTIONS.FARMER_PROFILES, data.userId), {
      ...data,
      farmerId: data.userId,
      isVerified: false,
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  },

  async updateProfile(
    userId: string,
    data: Partial<Pick<Farmer, 'displayName' | 'phone' | 'village' | 'taluka' | 'district' | 'state' | 'pincode' | 'farmName' | 'farmDescription' | 'farmSizeAcres' | 'primaryProducts' | 'profileImageUrl' | 'farmImageUrl'>>
  ): Promise<void> {
    const batch = writeBatch(db);
    batch.set(doc(db, COLLECTIONS.FARMER_PROFILES, userId), {
      ...data,
      farmerId: userId,
      userId,
      updatedAt: serverTimestamp(),
    }, { merge: true });

    if (data.displayName !== undefined || data.phone !== undefined) {
      batch.update(doc(db, COLLECTIONS.USERS, userId), {
        ...(data.displayName !== undefined ? { name: data.displayName } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();
  },
};
