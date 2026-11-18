'use client';

import { AuthGuard } from '@/features/auth/AuthGuard';
import { DashboardShell } from '@/components/layout/DashboardShell';

export default function WorkerLayout({ children }: LayoutProps<'/'>) {
  return (
    <AuthGuard requiredRole="worker">
      <DashboardShell>{children}</DashboardShell>
    </AuthGuard>
  );
}
