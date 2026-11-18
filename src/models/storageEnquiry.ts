import type { Timestamp } from 'firebase/firestore';

export type StorageEnquiryStatus = 'submitted' | 'reviewed' | 'closed';

export interface StorageEnquiry {
  enquiryId: string;
  facilityId: string;
  facilityName: string;
  farmerId: string;
  farmerName: string;
  commodity: string;
  quantity: number;
  quantityUnit: string;
  preferredStartDate: string;
  durationDays?: number;
  message: string;
  status: StorageEnquiryStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
