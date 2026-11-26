'use client';

import { PageIntro } from '@/components/ui/PageIntro';
import { useEffect, useState } from 'react';
import { Briefcase, CheckSquare, Clock, Tractor } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { Card, EmptyState, LoadingState, StatCard } from '@/components/ui/Card';
import { ButtonLink } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { ROUTES } from '@/lib/constants';
import type { JobApplication } from '@/models/job';
import { jobService } from '@/services/jobService';
import { getFirebaseLoadErrorMessage } from '@/utils/firebaseErrors';

export default function WorkerDashboardPage() {
  const { userProfile } = useAuth();
  const workerId = userProfile?.uid;
  const [applications, setApplications] = useState<JobApplication[]>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!workerId) return;
    let active = true;
    jobService.getApplicationsByWorker(workerId)
      .then(result => { if (active) setApplications(result); })
      .catch(loadError => {
        if (active) setError(getFirebaseLoadErrorMessage(loadError, 'Your applications'));
      });
    return () => { active = false; };
  }, [workerId]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageIntro title={`Welcome, ${userProfile?.name?.split(' ')[0] ?? 'worker'}`} eyebrow="Worker overview" tone="photo"
        description="Find local farm work and follow the progress of your applications."
        actions={<ButtonLink href={ROUTES.WORKER_JOBS} variant="lime" leftIcon={<Briefcase className="size-4" />}>Find Jobs</ButtonLink>} />

      {error && <Alert variant="error">{error}</Alert>}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="My Applications" value={applications?.length ?? '—'} icon={<Briefcase className="w-5 h-5" />} accentColor="green" />
        <StatCard label="Pending Review" value={applications?.filter(application => application.status === 'pending').length ?? '—'} icon={<Clock className="w-5 h-5" />} accentColor="amber" />
        <StatCard label="Accepted Applications" value={applications?.filter(application => application.status === 'accepted').length ?? '—'} icon={<CheckSquare className="w-5 h-5" />} accentColor="green" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold text-forest">Applications</h2>
          {applications ? (
            applications.length > 0 ? (
              <>
                <p className="mt-2 text-neutral-600">Review application status and update your applications.</p>
                <ButtonLink href={ROUTES.WORKER_APPLICATIONS} variant="secondary" className="mt-4">My Applications</ButtonLink>
              </>
            ) : (
              <EmptyState icon={<Briefcase className="size-5" />} title="No applications yet"
                description="Your applications will appear here after you apply for a job."
                action={<ButtonLink href={ROUTES.WORKER_JOBS} variant="secondary">Browse jobs</ButtonLink>} />
            )
          ) : !error && <LoadingState label="Loading applications…" className="mt-4" />}
        </Card>
        <Card>
          <span aria-hidden className="mb-4 grid size-12 place-items-center rounded-xl bg-primary-50 text-primary-700">
            <Tractor className="size-5" />
          </span>
          <h2 className="text-lg font-semibold text-forest">Offer harvest services</h2>
          <p className="mt-2 text-neutral-600">Publish your services so farmers can find your listing.</p>
          <ButtonLink href={ROUTES.WORKER_SERVICE_PROFILE} variant="secondary" className="mt-4">Register Harvest Services</ButtonLink>
        </Card>
      </div>
    </div>
  );
}
