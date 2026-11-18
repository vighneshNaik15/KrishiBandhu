'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Briefcase, Plus } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, EmptyState } from '@/components/ui/Card';
import { useAuth } from '@/features/auth/AuthContext';
import { JOB_CATEGORY_LABELS, JOB_STATUS_LABELS, type Job } from '@/models/job';
import { jobService } from '@/services/jobService';
import { ROUTES } from '@/lib/constants';
import { getFirebaseLoadErrorMessage } from '@/utils/firebaseErrors';

export default function FarmerHarvestRequestsPage() {
  const { userProfile } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userProfile?.uid) return;
    jobService.getByFarmer(userProfile.uid)
      .then((items) => setJobs(items.filter((job) => job.requestType === 'harvest_service')))
      .catch((loadError: unknown) => setError(getFirebaseLoadErrorMessage(loadError, 'Harvest requests')))
      .finally(() => setLoading(false));
  }, [userProfile?.uid]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold font-heading text-neutral-900">My harvest requests</h1>
          <p className="mt-1 text-sm text-neutral-600">Review worker applications and track your Goa service requests.</p>
        </div>
        <Link href={ROUTES.FARMER_HARVEST_REQUEST_NEW}><Button leftIcon={<Plus className="h-4 w-4" />}>Post request</Button></Link>
      </header>
      {error && <Alert variant="error">{error}</Alert>}
      {loading ? (
        <div className="space-y-3" aria-label="Loading harvest requests">{[1, 2, 3].map((item) => <div key={item} className="h-28 animate-pulse rounded-xl bg-neutral-100" />)}</div>
      ) : error ? null : jobs.length === 0 ? (
        <Card><EmptyState icon={<Briefcase className="h-7 w-7" />} title="No harvest requests yet" description="Post a harvest or machinery request; it will appear here with its applications and status." action={<Link href={ROUTES.FARMER_HARVEST_REQUEST_NEW}><Button>Post your first request</Button></Link>} /></Card>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <Card key={job.jobId}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-neutral-900">{job.title}</h2>
                  <p className="mt-1 text-sm text-neutral-600">{JOB_CATEGORY_LABELS[job.category]} · {job.village}, {job.district}</p>
                </div>
                <Badge variant={job.status === 'completed' ? 'success' : job.status === 'cancelled' ? 'error' : 'info'}>{JOB_STATUS_LABELS[job.status]}</Badge>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link href={`${ROUTES.FARMER_JOBS}/${job.jobId}`}><Button size="sm" variant="secondary">Review applications</Button></Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
