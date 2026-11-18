'use client';

import { AuthGuard } from '@/features/auth/AuthGuard';
import { DashboardShell } from '@/components/layout/DashboardShell';

export default function AdminLayout({ children }: LayoutProps<'/'>) {
  return (
    <AuthGuard requiredRole="admin">
      <DashboardShell>{children}</DashboardShell>
    </AuthGuard>
  );
}
