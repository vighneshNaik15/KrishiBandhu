'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, MapPin, Calendar, Users, IndianRupee, CheckCircle, XCircle, Clock } from 'lucide-react';
import { jobService } from '@/services/jobService';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { ROUTES } from '@/lib/constants';
import { JOB_CATEGORY_LABELS, JOB_STATUS_LABELS, PAYMENT_TYPE_LABELS } from '@/models/job';
import { formatDate, formatPrice } from '@/utils/formatters';
import type { Job, JobApplication } from '@/models/job';
import { RequestPhotos } from '@/features/harvest-storage/RequestPhotos';
import { getFirebaseLoadErrorMessage } from '@/utils/firebaseErrors';

export default function FarmerJobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params.jobId as string;

  const [job, setJob] = useState<Job | null>(null);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    const loadJob = async () => {
      try {
        const jobData = await jobService.getById(jobId);
        if (!jobData) { setError('Job not found.'); return; }
        const apps = await jobService.getApplicationsByJob(jobId, jobData.farmerUserId);
        setJob(jobData);
        setApplications(apps);
      } catch (loadError: unknown) {
        setError(getFirebaseLoadErrorMessage(loadError, 'Job details and applications'));
      } finally {
        setLoading(false);
      }
    };
    void loadJob();
  }, [jobId]);

  const handleApplicationUpdate = async (applicationId: string, status: JobApplication['status']) => {
    setUpdating(applicationId);
    try {
      await jobService.updateApplication(applicationId, status);
      setApplications(prev => prev.map(a => a.applicationId === applicationId ? { ...a, status } : a));
      if (status === 'accepted') {
        const updatedJob = await jobService.getById(jobId);
        if (updatedJob) setJob(updatedJob);
      }
    } catch {
      setError('Failed to update application.');
    } finally {
      setUpdating(null);
    }
  };

  const handleFarmerStatus = async (status: 'scheduled' | 'completed') => {
    try {
      await jobService.updateStatus(jobId, status);
      setJob(prev => prev ? { ...prev, status } : prev);
    } catch {
      setError('Could not update the request status. Refresh the page and try again.');
    }
  };

  const handlePublish = async () => {
    if (!job) return;
    try {
      await jobService.updateStatus(jobId, 'published');
      setJob(prev => prev ? { ...prev, status: 'published' } : prev);
    } catch { setError('Failed to publish job.'); }
  };

  if (loading) return <div className="max-w-4xl mx-auto space-y-4">{[1,2].map(i=><div key={i} className="h-40 bg-neutral-100 rounded-xl animate-pulse"/>)}</div>;
  if (error || !job) return <div className="max-w-4xl mx-auto"><Alert variant="error">{error ?? 'Job not found.'}</Alert><Button variant="ghost" onClick={() => router.back()} className="mt-4" leftIcon={<ArrowLeft className="w-4 h-4"/>}>Go back</Button></div>;

  const pending = applications.filter(a => a.status === 'pending');
  const accepted = applications.filter(a => a.status === 'accepted');

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start gap-4">
        <button onClick={() => router.back()} className="mt-1 p-1 rounded text-neutral-400 hover:text-neutral-700">
          <ArrowLeft className="w-5 h-5"/>
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h1 className="text-2xl font-bold font-heading text-neutral-900">{job.title}</h1>
            <Badge variant={job.status === 'completed' ? 'success' : job.status === 'cancelled' ? 'error' : 'info'}>
              {JOB_STATUS_LABELS[job.status]}
            </Badge>
          </div>
          <p className="text-sm text-neutral-500">{JOB_CATEGORY_LABELS[job.category]}</p>
        </div>
        {job.status === 'draft' && (
          <Button size="sm" onClick={handlePublish}>Publish Job</Button>
        )}
        {job.requestType === 'harvest_service' && job.status === 'worker_selected' && (
          <Button size="sm" onClick={() => handleFarmerStatus('scheduled')}>Confirm schedule</Button>
        )}
        {job.requestType === 'harvest_service' && job.status === 'completion_pending' && (
          <Button size="sm" onClick={() => handleFarmerStatus('completed')}>Confirm completion</Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-2 space-y-4">
          <div>
            <h2 className="font-semibold text-neutral-800 mb-2">Description</h2>
            <p className="text-sm text-neutral-600 whitespace-pre-wrap">{job.description}</p>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2 text-neutral-600"><MapPin className="w-4 h-4 text-primary-500"/> {[job.village, job.taluka, job.district].filter(Boolean).join(', ')}</div>
            <div className="flex items-center gap-2 text-neutral-600"><Calendar className="w-4 h-4 text-primary-500"/> Start: {formatDate(job.startDate)}</div>
            <div className="flex items-center gap-2 text-neutral-600"><Users className="w-4 h-4 text-primary-500"/> {job.resourcesRequired ?? job.workersRequired} {job.resourceType === 'machinery' ? 'equipment needed' : 'workers needed'}</div>
            {job.paymentAmount && <div className="flex items-center gap-2 text-neutral-600"><IndianRupee className="w-4 h-4 text-primary-500"/> {formatPrice(job.paymentAmount)} {PAYMENT_TYPE_LABELS[job.paymentType]}</div>}
          </div>
          {job.farmLocation && <p className="text-sm text-neutral-600"><strong>Farm location:</strong> {job.farmLocation}</p>}
          {job.approximateLandArea !== undefined && <p className="text-sm text-neutral-600"><strong>Land area:</strong> {job.approximateLandArea} {job.landAreaUnit ?? 'acres'}</p>}
          {job.cropType && <p className="text-sm text-neutral-600"><strong>Crop:</strong> {job.cropType}</p>}
          <RequestPhotos paths={job.imagePaths ?? []} />
          {job.paymentNotes && <p className="text-xs text-neutral-500 bg-neutral-50 rounded-lg p-3">{job.paymentNotes}</p>}
        </Card>

        <Card>
          <h2 className="font-semibold text-neutral-800 mb-3">Applications</h2>
          <div className="space-y-1">
            <div className="flex justify-between text-sm"><span className="text-neutral-500">Total</span><span className="font-semibold">{applications.length}</span></div>
            <div className="flex justify-between text-sm"><span className="text-neutral-500">Pending</span><span className="font-semibold text-amber-600">{pending.length}</span></div>
            <div className="flex justify-between text-sm"><span className="text-neutral-500">Accepted</span><span className="font-semibold text-primary-600">{accepted.length}</span></div>
          </div>
        </Card>
      </div>

      {/* Applications */}
      {applications.length > 0 && (
        <Card>
          <h2 className="font-semibold text-neutral-800 mb-4">Applicants ({applications.length})</h2>
          <div className="space-y-3">
            {applications.map(app => (
              <div key={app.applicationId} className="flex items-center justify-between gap-4 p-3 rounded-lg border border-neutral-200 bg-neutral-50">
                <div className="min-w-0">
                  <p className="font-medium text-sm text-neutral-900">{app.workerName}</p>
                  {app.workerPhone && <p className="text-xs text-neutral-500">{app.workerPhone}</p>}
                  {app.coverNote && <p className="text-xs text-neutral-600 mt-1 truncate-2">{app.coverNote}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {app.status === 'pending' ? (
                    <>
                      <Button size="sm" variant="primary" onClick={() => handleApplicationUpdate(app.applicationId, 'accepted')} isLoading={updating === app.applicationId} leftIcon={<CheckCircle className="w-3.5 h-3.5"/>}>Accept</Button>
                      <Button size="sm" variant="ghost" onClick={() => handleApplicationUpdate(app.applicationId, 'rejected')} leftIcon={<XCircle className="w-3.5 h-3.5"/>}>Reject</Button>
                    </>
                  ) : (
                    <Badge variant={app.status === 'accepted' ? 'success' : app.status === 'rejected' ? 'error' : 'neutral'}>
                      {app.status}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
