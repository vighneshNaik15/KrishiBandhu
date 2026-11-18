import { Timestamp } from 'firebase/firestore';

export interface WorkerProfile {
  workerId: string;
  userId: string;
  displayName: string;
  phone: string;
  profileImageUrl?: string;

  // Location
  village?: string;
  taluka?: string;
  district: string;
  state: string;
  pincode?: string;

  // Work details
  skills: string[];
  experienceYears?: number;
  bio?: string;
  dailyRate?: number;
  isAvailable: boolean;

  // Platform
  isVerified: boolean;
  isActive: boolean;
  rating?: number;
  totalJobsCompleted: number;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface SchemeDocument {
  schemeId: string;
  name: string;
  description: string;
  benefits: string;
  eligibility: string;
  requiredDocuments: string[];
  applicationProcess: string;
  officialLink?: string;
  state: string;
  district?: string;
  category: 'subsidy' | 'loan' | 'insurance' | 'training' | 'other';
  isActive: boolean;
  lastVerifiedAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Notification {
  notificationId: string;
  userId: string;
  type:
    | 'job_application'
    | 'application_accepted'
    | 'application_rejected'
    | 'job_scheduled'
    | 'work_completed'
    | 'product_enquiry'
    | 'order_update'
    | 'scheme_update'
    | 'admin_announcement'
    | 'general';
  title: string;
  body: string;
  relatedId?: string;    // jobId, productId, orderId etc.
  relatedType?: string;  // 'job', 'product', 'order'
  isRead: boolean;
  createdAt: Timestamp;
}

export interface Review {
  reviewId: string;
  reviewerId: string;
  reviewerName: string;
  revieweeId: string;
  relatedId: string;    // jobId or orderId
  relatedType: 'job' | 'order';
  rating: number;       // 1–5
  comment?: string;
  isReported: boolean;
  createdAt: Timestamp;
}

export interface Transaction {
  transactionId: string;
  relatedId: string;        // jobId or orderId
  relatedType: 'job' | 'order';
  fromUserId: string;
  toUserId: string;
  amount: number;
  paymentMethod: 'cash' | 'upi' | 'bank_transfer' | 'pending';
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
