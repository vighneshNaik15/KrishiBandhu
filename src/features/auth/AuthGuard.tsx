'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/AuthContext';
import type { UserRole } from '@/models/user';
import { ROUTES } from '@/lib/constants';

// Role → dashboard route mapping
const ROLE_DASHBOARD: Record<UserRole, string> = {
  farmer: ROUTES.FARMER_DASHBOARD,
  worker: ROUTES.WORKER_DASHBOARD,
  buyer: ROUTES.BUYER_DASHBOARD,
  admin: ROUTES.ADMIN_DASHBOARD,
};

interface AuthGuardProps {
  children: React.ReactNode;
  /** If provided, only users with this role may access the route */
  requiredRole?: UserRole;
  /** Redirect here when unauthenticated (default: /login) */
  redirectTo?: string;
}

/**
 * Client-side route guard.
 * - Unauthenticated users are redirected to login.
 * - Wrong-role users are redirected to their own dashboard.
 * - Shows a loading spinner while auth state is resolving.
 */
export function AuthGuard({ children, requiredRole, redirectTo = ROUTES.LOGIN }: AuthGuardProps) {
  const { firebaseUser, userProfile, offlineFarmerUid, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const offlineFarmAccess = Boolean(offlineFarmerUid && offlineFarmerUid === firebaseUser?.uid &&
    requiredRole === 'farmer' && pathname === ROUTES.FARMER_FARMS);

  useEffect(() => {
    if (loading) return;

    if (!firebaseUser) {
      router.replace(redirectTo);
      return;
    }

    if (requiredRole && userProfile?.role !== requiredRole && !offlineFarmAccess) {
      const correctDashboard = userProfile
        ? ROLE_DASHBOARD[userProfile.role]
        : ROUTES.LOGIN;
      router.replace(correctDashboard);
    }
  }, [loading, firebaseUser, userProfile, requiredRole, offlineFarmAccess, redirectTo, router]);

  if (loading) {
    return <AuthLoadingScreen />;
  }

  if (!firebaseUser) return null;
  if (requiredRole && userProfile?.role !== requiredRole && !offlineFarmAccess) return null;

  return <>{children}</>;
}

function AuthLoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-primary-200 border-t-primary-600 animate-spin" />
        <p className="text-sm text-neutral-500">Loading…</p>
      </div>
    </div>
  );
}
