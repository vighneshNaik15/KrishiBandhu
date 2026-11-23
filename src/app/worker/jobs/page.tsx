'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, MapPin, Calendar, Users, IndianRupee } from 'lucide-react';
import { jobService } from '@/services/jobService';
import { Card, EmptyState } from '@/components/ui/Card';
import { Input, Select } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { ROUTES, KONKAN_DISTRICTS } from '@/lib/constants';
import { JOB_CATEGORY_LABELS, PAYMENT_TYPE_LABELS } from '@/models/job';
import { formatDate, formatPrice } from '@/utils/formatters';
import { getFirebaseLoadErrorMessage } from '@/utils/firebaseErrors';
import type { Job } from '@/models/job';
import { useAuth } from '@/features/auth/AuthContext';

const GOA_DISTRICTS = KONKAN_DISTRICTS['Goa'] ?? [];
const MH_DISTRICTS = KONKAN_DISTRICTS['Maharashtra'] ?? [];
const ALL_DISTRICTS = [...GOA_DISTRICTS, ...MH_DISTRICTS];
const districtOptions = [{ value: '', label: 'All districts' }, ...ALL_DISTRICTS.map(d => ({ value: d, label: d }))];

function getJobLoadError(error: unknown): string {
  return getFirebaseLoadErrorMessage(error, 'Jobs');
}

export default function WorkerJobsPage() {
  const { userProfile } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [district, setDistrict] = useState(() => userProfile?.district ?? '');
  const [search, setSearch] = useState('');

  useEffect(() => {
    let active = true;
    jobService.getPublished({ district: district || undefined })
      .then(result => { if (active) setJobs(result); })
      .catch((loadError: unknown) => { if (active) setError(getJobLoadError(loadError)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [district]);

  const filtered = jobs.filter(j =>
    !search || j.title.toLowerCase().includes(search.toLowerCase()) ||
    j.description.toLowerCase().includes(search.toLowerCase()) ||
    JOB_CATEGORY_LABELS[j.category]?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-heading text-neutral-900">Find Agricultural Jobs</h1>
        <p className="text-sm text-neutral-500 mt-1">Browse jobs posted by farmers across Goa and Konkan.</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-col sm:flex-row">
        <Input
          aria-label="Search jobs"
          placeholder="Search jobs by title or category..."
          leftIcon={<Search className="w-4 h-4"/>}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1"
        />
        <Select
          aria-label="District"
          options={districtOptions}
          value={district}
          onChange={e => { setDistrict(e.target.value); setLoading(true); setError(null); }}
          className="sm:w-48"
        />
      </div>

      {error && <Alert variant="error" onDismiss={() => setError(null)}>{error}</Alert>}

      {loading ? (
        <div className="space-y-3">{[1,2,3,4].map(i=><div key={i} className="h-32 bg-neutral-100 rounded-xl animate-pulse"/>)}</div>
      ) : error ? null : filtered.length === 0 ? (
        <EmptyState
          title="No jobs found"
          description={search || district ? 'Try adjusting your filters.' : 'No jobs are currently posted in your area.'}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map(job => (
            <Link key={job.jobId} href={`${ROUTES.WORKER_JOBS}/${job.jobId}`}>
              <Card hover>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-semibold text-neutral-900">{job.title}</h3>
                      <Badge variant="success">{JOB_CATEGORY_LABELS[job.category]}</Badge>
                    </div>
                    <p className="text-xs text-neutral-500 mb-2 truncate">{job.farmerName}</p>
                    <p className="text-sm text-neutral-600 truncate-2 mb-3">{job.description}</p>
                    <div className="flex flex-wrap gap-4 text-xs text-neutral-500">
                      <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-primary-500"/> {[job.village, job.district].filter(Boolean).join(', ')}</span>
                      <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-primary-500"/> {formatDate(job.startDate)}</span>
                      <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5 text-primary-500"/> {job.resourcesRequired ?? job.workersRequired} {job.resourceType === 'machinery' ? 'equipment' : 'needed'}</span>
                      {job.paymentAmount && <span className="flex items-center gap-1"><IndianRupee className="w-3.5 h-3.5 text-primary-500"/> {formatPrice(job.paymentAmount)} {PAYMENT_TYPE_LABELS[job.paymentType]}</span>}
                    </div>
                  </div>
                  <span className="shrink-0 rounded-lg bg-primary-600 px-3 py-2 text-sm font-semibold text-white">View job</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
