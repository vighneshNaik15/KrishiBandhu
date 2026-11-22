import {
  collection,
  doc,
  getDoc,
  getDocs,
  getDocsFromServer,
  getDocFromServer,
  runTransaction,
  GeoPoint,
  addDoc,
  updateDoc,
  deleteField,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { COLLECTIONS } from '@/lib/constants';
import { boundaryArea, SQUARE_METRES_PER_UNIT } from '@/features/farms/boundary';
import type { Farm, CreateFarmData } from '@/models/farm';

export type FarmDetails = Omit<CreateFarmData, 'farmerId' | 'farmerUserId'>;

export function farmDetails(data: FarmDetails) {
  const { boundary, area, areaUnit } = data;
  const measuredArea = boundary ? boundaryArea(boundary) / SQUARE_METRES_PER_UNIT[areaUnit] : area;
  if (!Number.isFinite(measuredArea) || measuredArea <= 0) throw new Error('Invalid farm area.');
  return {
    ...Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)),
    ...(boundary ? { boundary: boundary.map(point => new GeoPoint(point.latitude, point.longitude)) } : {}),
    area: measuredArea,
  } as FarmDetails;
}

export const farmService = {
  async getById(farmId: string): Promise<Farm | null> {
    const snap = await getDoc(doc(db, COLLECTIONS.FARMS, farmId));
    return snap.exists() ? ({ ...snap.data(), farmId: snap.id } as Farm) : null;
  },

  async getByFarmer(farmerId: string, fromServer = false): Promise<Farm[]> {
    const q = query(
      collection(db, COLLECTIONS.FARMS),
      where('farmerId', '==', farmerId),
      where('farmerUserId', '==', farmerId),
      where('isActive', '==', true),
      orderBy('createdAt', 'desc')
    );
    const snap = await (fromServer ? getDocsFromServer(q) : getDocs(q));
    return snap.docs.map((d) => ({ ...d.data(), farmId: d.id } as Farm));
  },

  async create(data: CreateFarmData): Promise<string> {
    const ref = await addDoc(collection(db, COLLECTIONS.FARMS), {
      ...farmDetails(data),
      images: [],
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  },

  async update(farmId: string, data: FarmDetails): Promise<void> {
    const details = farmDetails(data);
    await updateDoc(doc(db, COLLECTIONS.FARMS, farmId), {
      ...details,
      mutationId: deleteField(),
      boundary: details.boundary ?? deleteField(),
      soilType: data.soilType ?? deleteField(),
      irrigationType: data.irrigationType ?? deleteField(),
      updatedAt: serverTimestamp(),
    });
  },

  async delete(farmId: string): Promise<void> {
    // Soft delete
    await updateDoc(doc(db, COLLECTIONS.FARMS, farmId), {
      mutationId: deleteField(),
      isActive: false,
      updatedAt: serverTimestamp(),
    });
  },
};


export type FarmMutation = {
  id: string;
  uid: string;
  farmId: string;
  base: string | null;
} & ({ kind: 'create' | 'update'; details: FarmDetails } | { kind: 'delete' });

export function farmVersion(farm: Farm): string {
  return farm.mutationId ?? `${farm.updatedAt.seconds}:${farm.updatedAt.nanoseconds}`;
}

export class FarmConflict extends Error {}

export async function commitFarmMutation(mutation: FarmMutation, allowed: () => boolean): Promise<Farm> {
  const ref = doc(db, COLLECTIONS.FARMS, mutation.farmId);
  const checkSession = () => {
    if (!allowed()) throw new Error('The farmer session changed.');
  };
  checkSession();
  if (mutation.kind === 'create') {
    try {
      await runTransaction(db, async tx => {
        checkSession();
        // Keep creates server-only, including when the browser can reach the network
        // but Firebase is unavailable. The rules authorize the new farm document.
        await tx.get(doc(db, COLLECTIONS.USERS, mutation.uid));
        checkSession();
        tx.set(ref, {
          ...farmDetails(mutation.details),
          farmerId: mutation.uid,
          farmerUserId: mutation.uid,
          mutationId: mutation.id,
          images: [],
          isActive: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });
    } catch (error) {
      checkSession();
      if (!(error instanceof Error) || !('code' in error) || error.code !== 'permission-denied') throw error;
      const existing = await getDocFromServer(ref).catch(() => null);
      if (existing?.data()?.mutationId !== mutation.id) throw error;
    }
  } else {
    await runTransaction(db, async tx => {
      checkSession();
      const snapshot = await tx.get(ref);
      checkSession();
      const current = snapshot.data() as Farm | undefined;
      if (current?.mutationId === mutation.id) return;
      if (!current?.isActive || farmVersion(current) !== mutation.base) {
        throw new FarmConflict('This plot changed on another device.');
      }
      const details = mutation.kind === 'delete' ? null : farmDetails(mutation.details);
      const changes = details ? {
        ...details,
        boundary: details.boundary ?? deleteField(),
        soilType: details.soilType ?? deleteField(),
        irrigationType: details.irrigationType ?? deleteField(),
      } : { isActive: false };
      tx.update(ref, { ...changes, mutationId: mutation.id, updatedAt: serverTimestamp() });
    });
  }

  checkSession();
  const saved = await getDocFromServer(ref);
  checkSession();
  const farm = { ...saved.data(), farmId: ref.id } as Farm;
  if (farm.mutationId !== mutation.id) throw new FarmConflict('This plot changed on another device.');
  return farm;
}
