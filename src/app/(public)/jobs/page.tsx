'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Briefcase, MapPin, Calendar, Users, IndianRupee } from 'lucide-react';
import { jobService } from '@/services/jobService';
import { Input, Select } from '@/components/ui/Input';
import { Card, EmptyState } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { ROUTES, KONKAN_DISTRICTS } from '@/lib/constants';
import { JOB_CATEGORY_LABELS, PAYMENT_TYPE_LABELS } from '@/models/job';
import { formatDate, formatPrice } from '@/utils/formatters';
import { getFirebaseLoadErrorMessage } from '@/utils/firebaseErrors';
import type { Job } from '@/models/job';

const GOA_DISTRICTS = KONKAN_DISTRICTS['Goa'] ?? [];
const MH_DISTRICTS = KONKAN_DISTRICTS['Maharashtra'] ?? [];
const ALL_DISTRICTS = [...GOA_DISTRICTS, ...MH_DISTRICTS];
const districtOptions = [{ value: '', label: 'All areas' }, ...ALL_DISTRICTS.map(d => ({ value: d, label: d }))];

function getJobLoadError(error: unknown): string {
  return getFirebaseLoadErrorMessage(error, 'Jobs');
}

export default function PublicJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [district, setDistrict] = useState('');

  useEffect(() => {
    let active = true;
    jobService.getPublished({ district: district || undefined })
      .then((results) => {
        if (active) setJobs(results);
      })
      .catch((loadError: unknown) => {
        if (active) setError(getJobLoadError(loadError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [district]);

  const changeDistrict = (value: string) => {
    setDistrict(value);
    setLoading(true);
    setJobs([]);
    setError(null);
  };

  const filtered = jobs.filter(j =>
    !search ||
    j.title.toLowerCase().includes(search.toLowerCase()) ||
    JOB_CATEGORY_LABELS[j.category]?.toLowerCase().includes(search.toLowerCase()) ||
    j.district.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="container-page section-padding">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold font-heading text-neutral-900 mb-2">Agricultural Job Board</h1>
        <p className="text-neutral-500 max-w-xl mx-auto">Find agricultural work opportunities posted by farmers across Goa and Konkan.</p>
      </div>

      <div className="flex gap-3 flex-col sm:flex-row mb-8">
        <Input placeholder="Search jobs..." leftIcon={<Search className="w-4 h-4"/>} value={search} onChange={e => setSearch(e.target.value)} className="flex-1"/>
        <Select options={districtOptions} value={district} onChange={e => changeDistrict(e.target.value)} disabled={loading} className="sm:w-48"/>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {loading ? (
        <div className="space-y-3">{[1,2,3,4].map(i=><div key={i} className="h-32 bg-neutral-100 rounded-xl animate-pulse"/>)}</div>
      ) : error ? null : filtered.length === 0 ? (
        <EmptyState icon={<Briefcase className="w-8 h-8"/>} title="No jobs found" description="Try adjusting your search or check back later."/>
      ) : (
        <div className="space-y-3">
          {filtered.map(job => (
            <Card key={job.jobId} hover>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-semibold text-neutral-900">{job.title}</h3>
                    <Badge variant="success">{JOB_CATEGORY_LABELS[job.category]}</Badge>
                  </div>
                  <p className="text-sm text-neutral-600 truncate-2 mb-3">{job.description}</p>
                  <div className="flex flex-wrap gap-4 text-xs text-neutral-500">
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-primary-500"/> {[job.village, job.district].filter(Boolean).join(', ')}</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-primary-500"/> {formatDate(job.startDate)}</span>
                    <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5 text-primary-500"/> {job.workersRequired} needed</span>
                    {job.paymentAmount && <span className="flex items-center gap-1"><IndianRupee className="w-3.5 h-3.5 text-primary-500"/> {formatPrice(job.paymentAmount)} {PAYMENT_TYPE_LABELS[job.paymentType]}</span>}
                  </div>
                </div>
                <Link href={`${ROUTES.WORKER_JOBS}/${job.jobId}`} className="shrink-0">
                  <span className="text-xs text-primary-600 font-medium hover:text-primary-700">View & Apply →</span>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
