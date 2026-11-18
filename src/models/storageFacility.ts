import type { Timestamp } from 'firebase/firestore';

export type StorageVerificationStatus = 'pending' | 'approved' | 'rejected' | 'outdated';

export interface StorageFacility {
  facilityId: string;
  name: string;
  district: string;
  taluka?: string;
  village?: string;
  address?: string;
  facilityKind: 'storage_candidate' | 'market_warehouse';
  managerName?: string;
  storageType?: string;
  commodities?: string[];
  listedCapacityMt?: number;
  availableCapacityMt?: number;
  temperatureRange?: string;
  humidityInformation?: string;
  price?: number;
  priceUnit?: string;
  bookingAvailability?: 'available' | 'unavailable' | 'not_verified';
  minimumBookingQuantity?: string;
  minimumStorageDuration?: string;
  openingHours?: string;
  bookingMethod?: string;
  phone?: string;
  email?: string;
  website?: string;
  latitude?: number;
  longitude?: number;
  coordinatesVerifiedAt?: Timestamp;
  verificationStatus: StorageVerificationStatus;
  lastVerifiedAt?: Timestamp;
  sourceLabel: string;
  sourceUrl?: string;
  verificationNote: string;
  createdBy?: string;
  isActive: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}
