'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Briefcase, CheckSquare, Clock, Tractor } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { StatCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
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
      <div>
        <h1 className="text-2xl font-bold font-heading text-neutral-900">
          Welcome, {userProfile?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-sm text-neutral-500 mt-1">Find agricultural jobs near you.</p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="My Applications" value={applications?.length ?? '—'} icon={<Briefcase className="w-5 h-5" />} accentColor="green" />
        <StatCard label="Pending Review" value={applications?.filter(application => application.status === 'pending').length ?? '—'} icon={<Clock className="w-5 h-5" />} accentColor="amber" />
        <StatCard label="Accepted Applications" value={applications?.filter(application => application.status === 'accepted').length ?? '—'} icon={<CheckSquare className="w-5 h-5" />} accentColor="green" />
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href={ROUTES.WORKER_JOBS}>
          <Button leftIcon={<Briefcase className="h-4 w-4" />}>Find Jobs</Button>
        </Link>
        <Link href={ROUTES.WORKER_SERVICE_PROFILE}>
          <Button variant="secondary" leftIcon={<Tractor className="h-4 w-4" />}>Register Harvest Services</Button>
        </Link>
        <Link href={ROUTES.WORKER_APPLICATIONS}>
          <Button variant="secondary">My Applications</Button>
        </Link>
      </div>
    </div>
  );
}
