import { Timestamp } from 'firebase/firestore';

export interface Farmer {
  farmerId: string;
  userId: string;
  displayName: string;
  phone: string;

  // Location
  village?: string;
  taluka?: string;
  district: string;
  state: string;
  pincode?: string;

  // Farm details
  farmName?: string;
  farmDescription?: string;
  farmSizeAcres?: number;
  primaryProducts?: string[];

  // Status
  isVerified: boolean;
  isActive: boolean;

  // Images
  profileImageUrl?: string;
  farmImageUrl?: string;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CreateFarmerData {
  userId: string;
  displayName: string;
  phone: string;
  district: string;
  state: string;
  village?: string;
  taluka?: string;
  pincode?: string;
  farmName?: string;
  farmDescription?: string;
  farmSizeAcres?: number;
  primaryProducts?: string[];
}
