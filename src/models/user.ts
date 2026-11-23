import { Timestamp } from 'firebase/firestore';

export type UserRole = 'buyer' | 'farmer' | 'worker' | 'admin';

export interface User {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  state?: string;
  district?: string;
  role: UserRole;
  profileImageUrl?: string;
  isActive: boolean;
  isVerified: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CreateUserData {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  state?: string;
  district?: string;
  role: UserRole;
}
