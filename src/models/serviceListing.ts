import type { Timestamp } from 'firebase/firestore';
import type { JobCategory } from '@/models/job';

export type ServiceListingStatus = 'pending' | 'approved' | 'rejected' | 'outdated';
export type ServiceChargeUnit = 'per_hour' | 'per_day' | 'per_job' | 'negotiable';

export interface ServiceListing {
  listingId: string;
  providerId: string;
  providerName: string;
  serviceCategories: JobCategory[];
  description: string;
  skills: string[];
  equipment: string[];
  experienceYears: number;
  district: 'North Goa' | 'South Goa';
  taluka: string;
  village?: string;
  availability: string;
  chargeAmount?: number;
  chargeUnit: ServiceChargeUnit;
  verificationStatus: ServiceListingStatus;
  isActive: boolean;
  createdBy: string;
  latitude?: number;
  longitude?: number;
  coordinatesVerifiedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export const GOA_SERVICE_DISTRICTS = ['North Goa', 'South Goa'] as const;

export const SERVICE_CHARGE_UNITS: Record<ServiceChargeUnit, string> = {
  per_hour: 'per hour',
  per_day: 'per day',
  per_job: 'per job',
  negotiable: 'Negotiable',
};
