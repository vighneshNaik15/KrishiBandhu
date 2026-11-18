import {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { COLLECTIONS } from '@/lib/constants';
import type { JobCategory } from '@/models/job';
import type { ServiceListing, ServiceListingStatus } from '@/models/serviceListing';

type CreateServiceListing = Pick<
  ServiceListing,
  | 'providerId'
  | 'providerName'
  | 'serviceCategories'
  | 'description'
  | 'skills'
  | 'equipment'
  | 'experienceYears'
  | 'district'
  | 'taluka'
  | 'availability'
  | 'chargeUnit'
> & {
  village?: string;
  chargeAmount?: number;
};

function mapListing(id: string, data: Omit<ServiceListing, 'listingId'>): ServiceListing {
  return { listingId: id, ...data };
}

export const serviceListingService = {
  async getApproved(filters: { district?: string; category?: JobCategory } = {}): Promise<ServiceListing[]> {
    const constraints = [
      where('isActive', '==', true),
      where('verificationStatus', '==', 'approved'),
      ...(filters.district ? [where('district', '==', filters.district)] : []),
      ...(filters.category ? [where('serviceCategories', 'array-contains', filters.category)] : []),
      orderBy('createdAt', 'desc'),
    ];
    const snapshot = await getDocs(query(collection(db, COLLECTIONS.SERVICE_LISTINGS), ...constraints));
    return snapshot.docs.map((entry) => mapListing(entry.id, entry.data() as Omit<ServiceListing, 'listingId'>));
  },

  async getByProvider(providerId: string): Promise<ServiceListing[]> {
    const snapshot = await getDocs(query(
      collection(db, COLLECTIONS.SERVICE_LISTINGS),
      where('providerId', '==', providerId),
      orderBy('createdAt', 'desc')
    ));
    return snapshot.docs.map((entry) => mapListing(entry.id, entry.data() as Omit<ServiceListing, 'listingId'>));
  },

  async getForAdmin(): Promise<ServiceListing[]> {
    const snapshot = await getDocs(query(
      collection(db, COLLECTIONS.SERVICE_LISTINGS),
      orderBy('createdAt', 'desc')
    ));
    return snapshot.docs.map((entry) => mapListing(entry.id, entry.data() as Omit<ServiceListing, 'listingId'>));
  },

  async create(data: CreateServiceListing): Promise<string> {
    const reference = await addDoc(collection(db, COLLECTIONS.SERVICE_LISTINGS), {
      ...data,
      createdBy: data.providerId,
      verificationStatus: 'pending',
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return reference.id;
  },

  async updateOwn(
    listingId: string,
    data: Partial<Omit<CreateServiceListing, 'providerId'>>
  ): Promise<void> {
    await updateDoc(doc(db, COLLECTIONS.SERVICE_LISTINGS, listingId), {
      ...data,
      verificationStatus: 'pending',
      updatedAt: serverTimestamp(),
    });
  },

  async review(listingId: string, status: ServiceListingStatus): Promise<void> {
    await updateDoc(doc(db, COLLECTIONS.SERVICE_LISTINGS, listingId), {
      verificationStatus: status,
      updatedAt: serverTimestamp(),
    });
  },
};
