'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, MapPin, Calendar, Users, IndianRupee, Send } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { jobService } from '@/services/jobService';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Textarea } from '@/components/ui/Input';
import { ROUTES } from '@/lib/constants';
import { JOB_CATEGORY_LABELS, PAYMENT_TYPE_LABELS, type JobStatus } from '@/models/job';
import { formatDate, formatPrice } from '@/utils/formatters';
import type { Job } from '@/models/job';
import { RequestPhotos } from '@/features/harvest-storage/RequestPhotos';
import { getFirebaseLoadErrorMessage } from '@/utils/firebaseErrors';

export default function WorkerJobDetailPage() {
  const params = useParams();
  const { userProfile } = useAuth();
  const jobId = params.jobId as string;

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [coverNote, setCoverNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    jobService.getById(jobId)
      .then(data => {
        if (!data) { setError('Job not found.'); return; }
        setJob(data);
      })
      .catch((loadError: unknown) => setError(getFirebaseLoadErrorMessage(loadError, 'Job details')))
      .finally(() => setLoading(false));
  }, [jobId]);

  const handleApply = async () => {
    if (!userProfile || !job || !['published', 'applications_open'].includes(job.status)) return;
    setApplying(true);
    try {
      await jobService.applyForJob({
        jobId: job.jobId,
        farmerId: job.farmerId,
        workerId: userProfile.uid,
        workerUserId: userProfile.uid,
        workerName: userProfile.name,
        ...(userProfile.phone ? { workerPhone: userProfile.phone } : {}),
        coverNote,
      });
      setApplied(true);
    } catch {
      setError('Failed to submit application. Please try again.');
    } finally {
      setApplying(false);
    }
  };

  const handleProgress = async (status: Extract<JobStatus, 'in_progress' | 'completion_pending'>) => {
    if (!job) return;
    try {
      await jobService.updateWorkerProgress(jobId, status);
      setJob({ ...job, status });
    } catch {
      setError('Could not update the work status. Refresh the page and try again.');
    }
  };

  if (loading) return <div className="max-w-3xl mx-auto space-y-4">{[1,2].map(i=><div key={i} className="h-40 bg-neutral-100 rounded-xl animate-pulse"/>)}</div>;
  if (error || !job) return <div className="max-w-3xl mx-auto"><Alert variant="error">{error ?? 'Job not found.'}</Alert></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link href={ROUTES.WORKER_JOBS} className="text-sm text-neutral-500 hover:text-neutral-700 flex items-center gap-1">
        <ArrowLeft className="w-4 h-4"/> Back to jobs
      </Link>

      <Card>
        <h1 className="text-xl font-bold font-heading text-neutral-900 mb-1">{job.title}</h1>
        <p className="text-sm text-neutral-500 mb-4">{job.farmerName} · {JOB_CATEGORY_LABELS[job.category]}</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5 text-sm">
          <div className="bg-neutral-50 rounded-lg p-3">
            <div className="flex items-center gap-1 text-neutral-500 text-xs mb-1"><MapPin className="w-3 h-3"/> Location</div>
            <p className="font-medium">{[job.village, job.district].filter(Boolean).join(', ')}</p>
          </div>
          <div className="bg-neutral-50 rounded-lg p-3">
            <div className="flex items-center gap-1 text-neutral-500 text-xs mb-1"><Calendar className="w-3 h-3"/> Start Date</div>
            <p className="font-medium">{formatDate(job.startDate)}</p>
          </div>
          <div className="bg-neutral-50 rounded-lg p-3">
            <div className="flex items-center gap-1 text-neutral-500 text-xs mb-1"><Users className="w-3 h-3"/> {job.resourceType === 'machinery' ? 'Equipment Needed' : 'Workers Needed'}</div>
            <p className="font-medium">{job.resourcesRequired ?? job.workersRequired}</p>
          </div>
          {job.paymentAmount && (
            <div className="bg-neutral-50 rounded-lg p-3">
              <div className="flex items-center gap-1 text-neutral-500 text-xs mb-1"><IndianRupee className="w-3 h-3"/> Payment</div>
              <p className="font-medium">{formatPrice(job.paymentAmount)} {PAYMENT_TYPE_LABELS[job.paymentType]}</p>
            </div>
          )}
        </div>

        <h2 className="font-semibold text-neutral-800 mb-2">Job Description</h2>
        <p className="text-sm text-neutral-600 whitespace-pre-wrap">{job.description}</p>
        {job.farmLocation && <p className="mt-3 text-sm text-neutral-600"><strong>Farm location:</strong> {job.farmLocation}</p>}
        {job.approximateLandArea !== undefined && <p className="mt-1 text-sm text-neutral-600"><strong>Land area:</strong> {job.approximateLandArea} {job.landAreaUnit ?? 'acres'}</p>}
        {job.cropType && <p className="mt-1 text-sm text-neutral-600"><strong>Crop:</strong> {job.cropType}</p>}
        <RequestPhotos paths={job.imagePaths ?? []} />

        {job.paymentNotes && (
          <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-100 text-sm text-amber-800">
            <strong>Payment notes:</strong> {job.paymentNotes}
          </div>
        )}
      </Card>

      {userProfile && job.selectedWorkerIds?.includes(userProfile.uid) ? (
        <Card className="space-y-3">
          <h2 className="font-semibold text-neutral-800">Assigned work</h2>
          {job.status === 'scheduled' && <Button onClick={() => handleProgress('in_progress')}>Mark work started</Button>}
          {job.status === 'in_progress' && <Button onClick={() => handleProgress('completion_pending')}>Submit work for completion confirmation</Button>}
          {job.status === 'completion_pending' && <Alert variant="success">Your completion request is awaiting confirmation from the farmer.</Alert>}
          {job.status === 'completed' && <Alert variant="success">The farmer confirmed this work as completed.</Alert>}
        </Card>
      ) : applied ? (
        <Alert variant="success">
          Your application has been submitted! The farmer will review and contact you.
        </Alert>
      ) : (
        <Card>
          <h2 className="font-semibold text-neutral-800 mb-4">Apply for this Job</h2>
          <div className="space-y-4">
            <Textarea
              label="Cover note (optional)"
              placeholder="Briefly describe your experience with this type of work..."
              value={coverNote}
              onChange={e => setCoverNote(e.target.value)}
              rows={3}
            />
            {error && <Alert variant="error" onDismiss={() => setError(null)}>{error}</Alert>}
            <Button onClick={handleApply} isLoading={applying} disabled={!['published', 'applications_open'].includes(job.status)} leftIcon={<Send className="w-4 h-4"/>} fullWidth>
              Submit Application
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
