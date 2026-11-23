import {
  collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc, runTransaction,
  query, where, orderBy, limit, serverTimestamp, arrayUnion, Timestamp,
} from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/config';
import { COLLECTIONS, JOBS_PER_PAGE } from '@/lib/constants';
import type { Job, JobApplication, JobStatus, JobCategory } from '@/models/job';

export const jobService = {
  async getById(jobId: string): Promise<Job | null> {
    const snap = await getDoc(doc(db, COLLECTIONS.JOBS, jobId));
    return snap.exists() ? ({ jobId: snap.id, ...snap.data() } as Job) : null;
  },

  async getByFarmer(farmerUserId: string): Promise<Job[]> {
    const q = query(
      collection(db, COLLECTIONS.JOBS),
      where('farmerUserId', '==', farmerUserId),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ jobId: d.id, ...d.data() } as Job));
  },

  /** Get published jobs visible to workers */
  async getPublished(filters: { category?: JobCategory; district?: string } = {}): Promise<Job[]> {
    const constraints = [
      where('status', 'in', ['published', 'applications_open']),
      ...(filters.district ? [where('district', '==', filters.district)] : []),
      ...(filters.category ? [where('category', '==', filters.category)] : []),
      orderBy('createdAt', 'desc'),
      limit(JOBS_PER_PAGE),
    ];
    const q = query(collection(db, COLLECTIONS.JOBS), ...constraints);
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ jobId: d.id, ...d.data() } as Job));
  },

  async create(data: Omit<Job, 'jobId' | 'createdAt' | 'updatedAt' | 'selectedWorkerIds' | 'statusHistory'>): Promise<string> {
    const ref = await addDoc(collection(db, COLLECTIONS.JOBS), {
      ...Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)),
      selectedWorkerIds: [],
      statusHistory: [{ status: data.status, changedAt: Timestamp.now() }],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  },

  async updateStatus(jobId: string, status: JobStatus, note?: string): Promise<void> {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('You must be signed in to update a job.');
    await updateDoc(doc(db, COLLECTIONS.JOBS, jobId), {
      status,
      statusHistory: arrayUnion({
        status,
        changedAt: Timestamp.now(),
        changedBy: currentUser.uid,
        ...(note ? { note } : {}),
      }),
      updatedAt: serverTimestamp(),
    });
  },

  async updateWorkerProgress(jobId: string, status: 'in_progress' | 'completion_pending', note?: string): Promise<void> {
    await this.updateStatus(jobId, status, note);
  },

  async update(jobId: string, data: Partial<Job>): Promise<void> {
    await updateDoc(doc(db, COLLECTIONS.JOBS, jobId), { ...data, updatedAt: serverTimestamp() });
  },

  // Applications
  async getApplicationsByJob(jobId: string, farmerId: string): Promise<JobApplication[]> {
    const q = query(
      collection(db, COLLECTIONS.JOB_APPLICATIONS),
      where('jobId', '==', jobId),
      where('farmerId', '==', farmerId),
      orderBy('appliedAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ applicationId: d.id, ...d.data() } as JobApplication));
  },

  async getApplicationsByWorker(workerId: string): Promise<JobApplication[]> {
    const q = query(
      collection(db, COLLECTIONS.JOB_APPLICATIONS),
      where('workerId', '==', workerId),
      orderBy('appliedAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ applicationId: d.id, ...d.data() } as JobApplication));
  },

  async getWorkerApplication(jobId: string, workerId: string): Promise<JobApplication | null> {
    const snap = await getDocs(query(
      collection(db, COLLECTIONS.JOB_APPLICATIONS),
      where('workerId', '==', workerId),
      where('jobId', '==', jobId)
    ));
    const application = snap.docs.find(entry => entry.data().status === 'accepted') ?? snap.docs[0];
    return application ? ({ ...application.data(), applicationId: application.id } as JobApplication) : null;
  },

  async applyForJob(data: Omit<JobApplication, 'applicationId' | 'appliedAt' | 'updatedAt' | 'status'>): Promise<string> {
    const existing = await this.getWorkerApplication(data.jobId, data.workerId);
    if (existing) return existing.applicationId;

    const ref = doc(db, COLLECTIONS.JOB_APPLICATIONS, `${data.jobId}:${data.workerId}`);
    try {
      await setDoc(ref, {
        ...data,
        status: 'pending',
        appliedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      const saved = await this.getWorkerApplication(data.jobId, data.workerId).catch(() => null);
      if (!saved) throw error;
      return saved.applicationId;
    }
    return ref.id;
  },

  async updateApplication(applicationId: string, status: JobApplication['status']): Promise<void> {
    await runTransaction(db, async (transaction) => {
      const applicationRef = doc(db, COLLECTIONS.JOB_APPLICATIONS, applicationId);
      const application = await transaction.get(applicationRef);
      if (!application.exists()) throw new Error('The application no longer exists.');
      const applicationData = application.data() as JobApplication;
      if (applicationData.status !== 'pending') {
        throw new Error('This application has already been reviewed.');
      }

      if (status === 'accepted') {
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error('You must be signed in to review an application.');
        const jobRef = doc(db, COLLECTIONS.JOBS, applicationData.jobId);
        const job = await transaction.get(jobRef);
        if (!job.exists()) throw new Error('The job no longer exists.');
        const jobData = job.data() as Job;
        if (jobData.status !== 'published' && jobData.status !== 'applications_open') {
          throw new Error('This job is no longer accepting applications.');
        }
        const selectedWorkerIds = jobData.selectedWorkerIds ?? [];
        const selectedApplicationIds = jobData.selectedApplicationIds ?? [];
        const requiredCount = jobData.resourcesRequired ?? jobData.workersRequired;
        if (selectedWorkerIds.includes(applicationData.workerId)) {
          throw new Error('This worker has already been selected.');
        }
        if (selectedWorkerIds.length >= requiredCount) {
          throw new Error('This request already has the required number of workers or providers.');
        }
        const nextSelectedWorkerIds = [...selectedWorkerIds, applicationData.workerId];
        const nextStatus: JobStatus = nextSelectedWorkerIds.length >= requiredCount
          ? 'worker_selected'
          : 'applications_open';
        const jobUpdate = {
          selectedWorkerIds: nextSelectedWorkerIds,
          selectedApplicationIds: [...selectedApplicationIds, applicationId],
          updatedAt: serverTimestamp(),
        };
        if (jobData.status !== nextStatus) {
          transaction.update(jobRef, {
            ...jobUpdate,
            status: nextStatus,
            statusHistory: arrayUnion({
              status: nextStatus,
              changedAt: Timestamp.now(),
              changedBy: currentUser.uid,
            }),
          });
        } else {
          transaction.update(jobRef, jobUpdate);
        }
      }

      transaction.update(applicationRef, {
        status,
        updatedAt: serverTimestamp(),
      });
    });
  },
};
