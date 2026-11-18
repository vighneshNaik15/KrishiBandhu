'use client';

import { AuthGuard } from '@/features/auth/AuthGuard';
import { DashboardShell } from '@/components/layout/DashboardShell';

export default function BuyerLayout({ children }: LayoutProps<'/'>) {
  return (
    <AuthGuard requiredRole="buyer">
      <DashboardShell>{children}</DashboardShell>
    </AuthGuard>
  );
}
