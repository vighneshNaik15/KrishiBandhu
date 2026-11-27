'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Briefcase, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { jobService } from '@/services/jobService';
import { Card, EmptyState } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ROUTES } from '@/lib/constants';
import { formatDate } from '@/utils/formatters';
import { getFirebaseLoadErrorMessage } from '@/utils/firebaseErrors';
import type { JobApplication } from '@/models/job';

const STATUS_ICONS = {
  pending: <Clock className="w-4 h-4 text-amber-500"/>,
  accepted: <CheckCircle className="w-4 h-4 text-primary-500"/>,
  rejected: <XCircle className="w-4 h-4 text-red-500"/>,
  withdrawn: <XCircle className="w-4 h-4 text-neutral-400"/>,
  completed: <CheckCircle className="w-4 h-4 text-primary-700"/>,
};

const STATUS_VARIANTS: Record<string, 'warning' | 'success' | 'error' | 'neutral'> = {
  pending: 'warning',
  accepted: 'success',
  rejected: 'error',
  withdrawn: 'neutral',
  completed: 'success',
};

export default function WorkerApplicationsPage() {
  const { userProfile } = useAuth();
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userProfile?.uid) return;
    jobService.getApplicationsByWorker(userProfile.uid)
      .then(setApplications)
      .catch((loadError: unknown) => setError(getFirebaseLoadErrorMessage(loadError, 'Your applications')))
      .finally(() => setLoading(false));
  }, [userProfile?.uid]);

  const handleWithdraw = async (applicationId: string) => {
    if (!confirm('Withdraw this application?')) return;
    try {
      await jobService.updateApplication(applicationId, 'withdrawn');
      setApplications(prev => prev.map(a => a.applicationId === applicationId ? { ...a, status: 'withdrawn' } : a));
    } catch {
      setError('Failed to withdraw application.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-heading text-neutral-900">My Applications</h1>
        <p className="text-sm text-neutral-500 mt-1">Track the status of your job applications.</p>
      </div>

      {error && <Alert variant="error" onDismiss={() => setError(null)}>{error}</Alert>}

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="h-24 bg-neutral-100 rounded-xl animate-pulse"/>)}</div>
      ) : error ? null : applications.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Briefcase className="w-8 h-8"/>}
            title="No applications yet"
            description="Browse available agricultural jobs and apply to get started."
            action={<Link href={ROUTES.WORKER_JOBS}><Button>Browse Jobs</Button></Link>}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {applications.map(app => (
            <Card key={app.applicationId}>
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-semibold text-neutral-900">Job Application</h3>
                    <Badge variant={STATUS_VARIANTS[app.status] ?? 'neutral'}>
                      <span className="flex items-center gap-1">
                        {STATUS_ICONS[app.status as keyof typeof STATUS_ICONS]}
                        {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                      </span>
                    </Badge>
                  </div>
                  <p className="text-xs text-neutral-500">Applied: {formatDate(app.appliedAt)}</p>
                  {app.coverNote && <p className="text-xs text-neutral-600 mt-1 truncate-2">{app.coverNote}</p>}
                </div>
                <div className="flex gap-2 shrink-0">
                  <Link href={`${ROUTES.WORKER_JOBS}/${app.jobId}`}>
                    <Button size="sm" variant="secondary">View Job</Button>
                  </Link>
                  {app.status === 'pending' && (
                    <Button size="sm" variant="ghost" onClick={() => handleWithdraw(app.applicationId)}>Withdraw</Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
