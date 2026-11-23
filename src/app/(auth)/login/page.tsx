'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { ROUTES } from '@/lib/constants';
import type { UserRole } from '@/models/user';

const schema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type FormData = z.infer<typeof schema>;

const ROLE_REDIRECT: Record<UserRole, string> = {
  farmer: ROUTES.FARMER_DASHBOARD,
  worker: ROUTES.WORKER_DASHBOARD,
  buyer: ROUTES.BUYER_DASHBOARD,
  admin: ROUTES.ADMIN_DASHBOARD,
};

export default function LoginPage() {
  const { login, logout, retryUserProfile, error, clearError, firebaseUser, userProfile, offlineFarmerUid, loading } = useAuth();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setShowPassword(false);
    try {
      await login(data.email, data.password);
    } catch {
      // Error is set in context
    }
  };

  // Once logged in, redirect to correct dashboard
  React.useEffect(() => {
    if (userProfile?.isActive) {
      const jobId = new URLSearchParams(window.location.search).get('workerJob');
      const workerJob = userProfile.role === 'worker' && jobId && /^[a-zA-Z0-9_-]+$/.test(jobId);
      router.replace(workerJob ? `${ROUTES.WORKER_JOBS}/${jobId}` : ROLE_REDIRECT[userProfile.role]);
    }
  }, [userProfile, router]);

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold font-heading text-neutral-900 mb-1">Welcome back</h1>
          <p className="text-sm text-neutral-500">Sign in to your KrishiBandhu account</p>
        </div>

        {error && (
          <Alert variant="error" className="mb-6" onDismiss={clearError}>
            {error}
          </Alert>
        )}
        {userProfile && !userProfile.isActive && (
          <Alert variant="warning" className="mb-6">This account is inactive. Contact KrishiBandhu support if you need access.</Alert>
        )}
        {offlineFarmerUid && (
          <Link className="mb-6 block text-primary-700 underline" href={ROUTES.FARMER_FARMS}>Open saved farms</Link>
        )}
        {firebaseUser && !userProfile?.isActive && !loading && (
          <div className="mb-6 flex flex-wrap gap-2">
            {!offlineFarmerUid && (
              <Button type="button" variant="secondary" disabled={isSubmitting} onClick={retryUserProfile}>
                Retry loading profile
              </Button>
            )}
            <Button type="button" variant="ghost" disabled={isSubmitting} onClick={logout}>Sign out</Button>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
          <Input
            label="Email address"
            type="email"
            autoComplete="email"
            required
            leftIcon={<Mail className="w-4 h-4" />}
            error={errors.email?.message}
            {...register('email')}
          />

          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            leftIcon={<Lock className="w-4 h-4" />}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-neutral-400 hover:text-neutral-700"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
            error={errors.password?.message}
            {...register('password')}
          />

          <div className="flex justify-end -mt-2">
            <Link
              href={ROUTES.FORGOT_PASSWORD}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              Forgot password?
            </Link>
          </div>

          <Button
            type="submit"
            fullWidth
            isLoading={!error && (isSubmitting || loading)}
            disabled={isSubmitting || loading}
            size="lg"
          >
            Sign in
          </Button>
        </form>

        <p className="text-center text-sm text-neutral-500 mt-6">
          Don&apos;t have an account?{' '}
          <Link href={ROUTES.REGISTER} className="text-primary-600 font-semibold hover:text-primary-700">
            Create one free
          </Link>
        </p>
      </div>
    </div>
  );
}
