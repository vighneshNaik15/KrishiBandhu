import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { COLLECTIONS } from '@/lib/constants';
import { PROVISIONAL_GOAN_FACILITIES } from '@/features/harvest-storage/seedFacilities';
import { fetchCsvRecords } from '@/features/resource-finder/csv';
import {
  toStorageFacilities as mapDatasetStorageFacilities,
  type StorageFacility as DatasetStorageFacility,
} from '@/features/resource-finder/storageFinder';
import type { StorageEnquiry } from '@/models/storageEnquiry';
import type { StorageFacility, StorageVerificationStatus } from '@/models/storageFacility';
import { getFirebaseLoadErrorMessage } from '@/utils/firebaseErrors';

const DIRECTORY_CONFIG_ID = '_directory-config';
const facilityCollection = collection(db, COLLECTIONS.STORAGE_FACILITIES);
const importedLeadIds = new Set(PROVISIONAL_GOAN_FACILITIES.map(facility => facility.facilityId));

function getFirestoreErrorCode(error: unknown): string | null {
  if (error && typeof error === 'object' && 'code' in error && typeof error.code === 'string') {
    return error.code;
  }
  return null;
}

function canUseBundledDirectory(error: unknown): boolean {
  const code = getFirestoreErrorCode(error);
  return code !== null && [
    'permission-denied',
    'firestore/permission-denied',
    'failed-precondition',
    'firestore/failed-precondition',
    'unavailable',
    'firestore/unavailable',
    'network-request-failed',
  ].includes(code);
}

function getDirectoryWarning(error: unknown): string {
  return `${getFirebaseLoadErrorMessage(error, 'The live Firestore directory')} Showing bundled source records; live admin-reviewed changes may be missing.`;
}

function mapFacility(id: string, data: Record<string, unknown>): StorageFacility {
  return { ...data, facilityId: id } as StorageFacility;
}

function mapSourceFacility(facility: DatasetStorageFacility): StorageFacility {
  const isCivilSuppliesLead = facility.type?.toLowerCase().includes('civil supplies') ?? false;
  return {
    facilityId: facility.id,
    name: facility.name,
    district: facility.district,
    ...(facility.address ? { address: facility.address } : {}),
    facilityKind: isCivilSuppliesLead ? 'market_warehouse' : 'storage_candidate',
    ...(facility.managerName ? { managerName: facility.managerName } : {}),
    ...(facility.type ? { storageType: facility.type } : {}),
    ...(facility.capacityMt !== null ? { listedCapacityMt: facility.capacityMt } : {}),
    ...(facility.contactNumber ? { phone: facility.contactNumber } : {}),
    verificationStatus: 'pending',
    sourceLabel: facility.sourceName ?? 'Supplied storage dataset (state not specified)',
    ...(facility.sourceUrl ? { sourceUrl: facility.sourceUrl } : {}),
    verificationNote: facility.verificationNote ??
      'Current operation, farmer access, and available capacity have not been independently verified.',
    isActive: true,
  };
}

async function getSourceDirectory(): Promise<StorageFacility[]> {
  const [storageRows, goaRows] = await Promise.all([
    fetchCsvRecords('/data/storage-finder.csv'),
    fetchCsvRecords('/data/goa-storage-leads.csv'),
  ]);
  const sourceFacilities = [
    ...mapDatasetStorageFacilities(storageRows),
    ...mapDatasetStorageFacilities(goaRows),
  ].map(mapSourceFacility);
  const sourceIds = new Set(sourceFacilities.map((facility) => facility.facilityId));
  return [
    ...sourceFacilities,
    ...PROVISIONAL_GOAN_FACILITIES.filter(
      (facility) => facility.isActive && !sourceIds.has(facility.facilityId)
    ),
  ];
}

function mergeFacilities(
  existing: StorageFacility[],
  additions: StorageFacility[]
): StorageFacility[] {
  const facilities = new Map(existing.map((facility) => [facility.facilityId, facility]));
  for (const facility of additions) facilities.set(facility.facilityId, facility);
  return [...facilities.values()];
}

export const storageFacilityService = {
  async getPublicDirectory(): Promise<{ facilities: StorageFacility[]; warning?: string }> {
    const sourceFacilities = await getSourceDirectory();
    let directoryIsSeeded = false;
    try {
      const config = await getDoc(doc(db, COLLECTIONS.STORAGE_FACILITIES, DIRECTORY_CONFIG_ID));
      directoryIsSeeded = config.exists() && config.data().seeded === true;
    } catch (error) {
      if (canUseBundledDirectory(error)) {
        return { facilities: sourceFacilities, warning: getDirectoryWarning(error) };
      }
      throw error;
    }

    const sourceOnlyFacilities = directoryIsSeeded
      ? sourceFacilities.filter(facility => !importedLeadIds.has(facility.facilityId))
      : sourceFacilities;
    try {
      const snapshot = await getDocs(query(
        facilityCollection,
        where('facilityKind', 'in', ['storage_candidate', 'market_warehouse']),
        where('isActive', '==', true),
        where('verificationStatus', '==', 'approved')
      ));
      return {
        facilities: mergeFacilities(
          sourceOnlyFacilities,
          snapshot.docs.map((entry) => mapFacility(entry.id, entry.data()))
        ),
      };
    } catch (error) {
      if (canUseBundledDirectory(error)) {
        return { facilities: sourceOnlyFacilities, warning: getDirectoryWarning(error) };
      }
      throw error;
    }
  },

  async getForAdmin(): Promise<{ facilities: StorageFacility[]; seeded: boolean }> {
    const snapshot = await getDocs(facilityCollection);
    const facilities = snapshot.docs
      .filter((entry) => entry.id !== DIRECTORY_CONFIG_ID)
      .map((entry) => mapFacility(entry.id, entry.data()));
    const config = snapshot.docs.find((entry) => entry.id === DIRECTORY_CONFIG_ID);
    return { facilities, seeded: config?.data().seeded === true };
  },

  async importInitialLeads(adminUid: string): Promise<number> {
    const existing = await getDocs(facilityCollection);
    const existingIds = new Set(existing.docs.map((entry) => entry.id));
    const batch = writeBatch(db);
    let imported = 0;

    for (const candidate of PROVISIONAL_GOAN_FACILITIES) {
      if (existingIds.has(candidate.facilityId)) continue;
      const { facilityId, ...data } = candidate;
      batch.set(doc(db, COLLECTIONS.STORAGE_FACILITIES, facilityId), {
        ...data,
        createdBy: adminUid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      imported += 1;
    }

    batch.set(doc(db, COLLECTIONS.STORAGE_FACILITIES, DIRECTORY_CONFIG_ID), {
      seeded: true,
      createdBy: adminUid,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    await batch.commit();
    return imported;
  },

  async updateAdmin(
    facilityId: string,
    data: Partial<Omit<StorageFacility, 'facilityId' | 'createdBy' | 'createdAt' | 'updatedAt'>>
  ): Promise<void> {
    await updateDoc(doc(db, COLLECTIONS.STORAGE_FACILITIES, facilityId), {
      ...data,
      updatedAt: serverTimestamp(),
      ...(data.verificationStatus === 'approved' ? { lastVerifiedAt: serverTimestamp() } : {}),
    });
  },

  async setStatus(facilityId: string, verificationStatus: StorageVerificationStatus): Promise<void> {
    await updateDoc(doc(db, COLLECTIONS.STORAGE_FACILITIES, facilityId), {
      verificationStatus,
      updatedAt: serverTimestamp(),
      ...(verificationStatus === 'approved' ? { lastVerifiedAt: serverTimestamp() } : {}),
    });
  },

  async remove(facilityId: string): Promise<void> {
    await updateDoc(doc(db, COLLECTIONS.STORAGE_FACILITIES, facilityId), {
      isActive: false,
      updatedAt: serverTimestamp(),
    });
  },

  async submitEnquiry(data: Omit<StorageEnquiry, 'enquiryId' | 'status' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const reference = await addDoc(collection(db, COLLECTIONS.STORAGE_ENQUIRIES), {
      ...data,
      status: 'submitted',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return reference.id;
  },

  async getEnquiries(): Promise<StorageEnquiry[]> {
    const snapshot = await getDocs(query(
      collection(db, COLLECTIONS.STORAGE_ENQUIRIES),
      where('status', 'in', ['submitted', 'reviewed']),
    ));
    return snapshot.docs.map((entry) => ({
      enquiryId: entry.id,
      ...entry.data(),
    } as StorageEnquiry));
  },

  async updateEnquiryStatus(enquiryId: string, status: StorageEnquiry['status']): Promise<void> {
    await updateDoc(doc(db, COLLECTIONS.STORAGE_ENQUIRIES, enquiryId), {
      status,
      updatedAt: serverTimestamp(),
    });
  },
};
