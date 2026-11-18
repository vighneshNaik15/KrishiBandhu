import { Timestamp } from 'firebase/firestore';

export type JobCategory =
  | 'coconut_harvesting'
  | 'arecanut_harvesting'
  | 'paddy_harvesting'
  | 'cashew_harvesting'
  | 'mango_harvesting'
  | 'vegetable_harvesting'
  | 'spraying'
  | 'pruning'
  | 'weeding'
  | 'land_preparation'
  | 'tractor_rental'
  | 'rotavator_rental'
  | 'ploughing'
  | 'planting'
  | 'irrigation'
  | 'fertilizing'
  | 'general_labour'
  | 'other';

export type JobStatus =
  | 'draft'
  | 'published'
  | 'applications_open'
  | 'worker_selected'
  | 'scheduled'
  | 'in_progress'
  | 'completion_pending'
  | 'completed'
  | 'cancelled'
  | 'closed';

export type PaymentType = 'daily' | 'per_job' | 'hourly' | 'negotiable';

export interface Job {
  jobId: string;
  farmerId: string;
  farmerUserId: string;
  farmerName: string;
  farmId?: string;
  farmName?: string;

  // Job details
  title: string;
  description: string;
  category: JobCategory;
  workersRequired: number;

  // Location
  village?: string;
  taluka?: string;
  district: string;
  state: string;

  // Timing
  startDate: Timestamp;
  endDate?: Timestamp;
  durationDays?: number;

  // Payment
  paymentType: PaymentType;
  paymentAmount?: number;
  paymentNotes?: string;
  requestType?: 'harvest_service';
  farmLocation?: string;
  approximateLandArea?: number;
  landAreaUnit?: 'acres' | 'hectares';
  cropType?: string;
  equipmentRequiredCount?: number;
  resourceType?: 'workers' | 'machinery';
  resourcesRequired?: number;
  instructions?: string;
  imagePaths?: string[];

  // Lifecycle
  status: JobStatus;
  statusHistory: { status: JobStatus; changedAt: Timestamp; changedBy?: string; note?: string }[];

  // Worker selection
  selectedWorkerIds: string[];
  selectedApplicationIds?: string[];
  maxApplicants?: number;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface JobApplication {
  applicationId: string;
  jobId: string;
  farmerId: string;
  workerId: string;
  workerUserId: string;
  workerName: string;
  workerPhone?: string;
  workerSkills?: string[];

  coverNote?: string;
  expectedPayment?: number;

  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn' | 'completed';
  appliedAt: Timestamp;
  updatedAt: Timestamp;
}

export const JOB_CATEGORY_LABELS: Record<JobCategory, string> = {
  coconut_harvesting: 'Coconut Harvesting',
  arecanut_harvesting: 'Areca Nut Harvesting',
  paddy_harvesting: 'Paddy Harvesting',
  cashew_harvesting: 'Cashew Harvesting',
  mango_harvesting: 'Mango Harvesting',
  vegetable_harvesting: 'Vegetable Harvesting',
  spraying: 'Spraying',
  pruning: 'Pruning / Trimming',
  weeding: 'Weeding',
  land_preparation: 'Land Preparation',
  tractor_rental: 'Tractor Rental',
  rotavator_rental: 'Rotavator Rental',
  ploughing: 'Ploughing',
  planting: 'Planting / Transplanting',
  irrigation: 'Irrigation Work',
  fertilizing: 'Fertilizer Application',
  general_labour: 'General Agricultural Labour',
  other: 'Other',
};

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  draft: 'Draft',
  published: 'Published',
  applications_open: 'Applications Open',
  worker_selected: 'Worker Selected',
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  completion_pending: 'Completion Awaiting Confirmation',
  completed: 'Completed',
  cancelled: 'Cancelled',
  closed: 'Closed',
};

export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  daily: 'Per Day',
  per_job: 'Per Job',
  hourly: 'Per Hour',
  negotiable: 'Negotiable',
};
