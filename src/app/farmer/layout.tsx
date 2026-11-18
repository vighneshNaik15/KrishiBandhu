'use client';

import { AuthGuard } from '@/features/auth/AuthGuard';
import { DashboardShell } from '@/components/layout/DashboardShell';

export default function FarmerLayout({ children }: LayoutProps<'/'>) {
  return (
    <AuthGuard requiredRole="farmer">
      <DashboardShell>{children}</DashboardShell>
    </AuthGuard>
  );
}
