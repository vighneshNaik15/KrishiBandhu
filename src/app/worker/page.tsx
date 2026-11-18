'use client';

import React from 'react';
import Link from 'next/link';
import { Briefcase, CheckSquare, Star, User, Tractor } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { StatCard } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ROUTES } from '@/lib/constants';

export default function WorkerDashboardPage() {
  const { userProfile } = useAuth();

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-heading text-neutral-900">
          Welcome, {userProfile?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-sm text-neutral-500 mt-1">Find agricultural jobs near you.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Open Jobs Nearby" value="—" icon={<Briefcase className="w-5 h-5" />} accentColor="blue" />
        <StatCard label="My Applications" value="—" icon={<CheckSquare className="w-5 h-5" />} accentColor="green" />
        <StatCard label="Jobs Completed" value="—" icon={<CheckSquare className="w-5 h-5" />} accentColor="amber" />
        <StatCard label="My Rating" value="—" icon={<Star className="w-5 h-5" />} accentColor="green" />
      </div>

      <EmptyState
        icon={<Briefcase className="w-6 h-6" />}
        title="Complete your profile to find jobs"
        description="Add your skills and location to browse agricultural jobs near you."
      />
      <div className="flex flex-wrap gap-3">
        <Link href={ROUTES.WORKER_SERVICE_PROFILE}>
          <Button leftIcon={<Tractor className="h-4 w-4" />}>Register Harvest Services</Button>
        </Link>
        <Link href={ROUTES.WORKER_JOBS}>
          <Button variant="secondary">Find harvest work</Button>
        </Link>
      </div>
    </div>
  );
}
