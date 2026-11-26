'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { AuthFrame, AuthIntro } from '@/features/auth/AuthFrame';
import { AuthPasswordInput } from '@/features/auth/AuthPasswordInput';
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
      // The auth context supplies the error message.
    }
  };

  useEffect(() => {
    if (userProfile?.isActive) {
      const jobId = new URLSearchParams(window.location.search).get('workerJob');
      const workerJob = userProfile.role === 'worker' && jobId && /^[a-zA-Z0-9_-]+$/.test(jobId);
      router.replace(workerJob ? `${ROUTES.WORKER_JOBS}/${jobId}` : ROLE_REDIRECT[userProfile.role]);
    }
  }, [userProfile, router]);

  return (
    <AuthFrame>
      <AuthIntro title="Welcome back" description="Sign in to pick up where you left off." />

      {error && (
        <Alert variant="error" className="mb-5" onDismiss={clearError}>{error}</Alert>
      )}
      {userProfile && !userProfile.isActive && (
        <Alert variant="warning" className="mb-5">This account is inactive. Contact KrishiBandhu support if you need access.</Alert>
      )}
      {offlineFarmerUid && (
        <Link className="auth-text-link mb-5 inline-block" href={ROUTES.FARMER_FARMS}>Open saved farms</Link>
      )}
      {firebaseUser && !userProfile?.isActive && !loading && (
        <div className="mb-5 flex flex-wrap gap-2">
          {!offlineFarmerUid && (
            <Button type="button" variant="secondary" disabled={isSubmitting} onClick={retryUserProfile}>
              Retry loading profile
            </Button>
          )}
          <Button type="button" variant="ghost" disabled={isSubmitting} onClick={logout}>Sign out</Button>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="auth-form" noValidate>
        <Input
          label="Email address"
          type="email"
          autoComplete="email"
          required
          leftIcon={<Mail aria-hidden className="size-4" />}
          error={errors.email?.message}
          {...register('email')}
        />

        <AuthPasswordInput
          label="Password"
          autoComplete="current-password"
          required
          visible={showPassword}
          onToggle={() => setShowPassword(current => !current)}
          error={errors.password?.message}
          {...register('password')}
        />

        <Link href={ROUTES.FORGOT_PASSWORD} className="auth-text-link auth-recovery">Forgot password?</Link>

        <Button type="submit" fullWidth isLoading={!error && (isSubmitting || loading)}
          disabled={isSubmitting || loading} size="lg" className="auth-submit">
          Sign in
        </Button>
      </form>

      <p className="auth-footer-link">
        New to KrishiBandhu? <Link href={ROUTES.REGISTER} className="auth-text-link">Create an account</Link>
      </p>
    </AuthFrame>
  );
}
