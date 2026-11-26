'use client';

import { PageIntro } from '@/components/ui/PageIntro';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Briefcase, MapPin, Calendar, Users, IndianRupee } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { jobService } from '@/services/jobService';
import { Card, EmptyState, LoadingState } from '@/components/ui/Card';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { ROUTES } from '@/lib/constants';
import { JOB_CATEGORY_LABELS, JOB_STATUS_LABELS, PAYMENT_TYPE_LABELS } from '@/models/job';
import { formatDate, formatPrice } from '@/utils/formatters';
import { getFirebaseLoadErrorMessage } from '@/utils/firebaseErrors';
import type { Job } from '@/models/job';

const STATUS_COLORS: Record<string, 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
  draft: 'neutral',
  published: 'info',
  applications_open: 'success',
  worker_selected: 'warning',
  scheduled: 'warning',
  in_progress: 'info',
  completion_pending: 'warning',
  completed: 'success',
  cancelled: 'error',
  closed: 'neutral',
};

export default function FarmerJobsPage() {
  const { userProfile } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userProfile?.uid) return;
    jobService.getByFarmer(userProfile.uid)
      .then(setJobs)
      .catch((loadError: unknown) => setError(getFirebaseLoadErrorMessage(loadError, 'Your job postings')))
      .finally(() => setLoading(false));
  }, [userProfile?.uid]);

  const activeJobs = jobs.filter(j => !['completed', 'cancelled', 'closed'].includes(j.status));

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageIntro title="My Job Postings" description={loading || error ? 'Manage agricultural jobs and review applications.' : `${activeJobs.length} active job${activeJobs.length !== 1 ? 's' : ''}`}
        actions={<ButtonLink href={ROUTES.FARMER_JOBS_NEW} leftIcon={<Plus className="size-4" />}>Post Job</ButtonLink>} />

      {error && <Alert variant="error" onDismiss={() => setError(null)}>{error}</Alert>}

      {loading ? (
        <LoadingState label="Loading job postings…" />
      ) : error ? null : jobs.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Briefcase className="w-8 h-8"/>}
            title="No jobs posted yet"
            description="Post agricultural jobs to find skilled workers in your area."
            action={<Link href={ROUTES.FARMER_JOBS_NEW}><Button leftIcon={<Plus className="w-4 h-4"/>}>Post first job</Button></Link>}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {jobs.map(job => (
            <Card key={job.jobId}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-semibold text-neutral-900">{job.title}</h3>
                    <Badge variant={STATUS_COLORS[job.status] ?? 'neutral'}>
                      {JOB_STATUS_LABELS[job.status] ?? job.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-neutral-500 mb-2">{JOB_CATEGORY_LABELS[job.category]}</p>
                  <div className="flex flex-wrap gap-4 text-xs text-neutral-500">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5"/> {job.district}, {job.state}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5"/> Start: {formatDate(job.startDate)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5"/> {job.resourcesRequired ?? job.workersRequired} {job.resourceType === 'machinery' ? 'equipment' : 'worker(s)'}
                    </span>
                    {job.paymentAmount && (
                      <span className="flex items-center gap-1">
                        <IndianRupee className="w-3.5 h-3.5"/> {formatPrice(job.paymentAmount)} {PAYMENT_TYPE_LABELS[job.paymentType]}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Link href={`${ROUTES.FARMER_JOBS}/${job.jobId}`}>
                    <Button size="sm" variant="secondary">View</Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
