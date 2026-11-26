'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle, Mail } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { AuthFrame, AuthIntro } from '@/features/auth/AuthFrame';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { ROUTES } from '@/lib/constants';

const schema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setError(null);
    try {
      await resetPassword(data.email);
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email.');
    }
  };

  return (
    <AuthFrame>
      <div role="status">
        {sent && (
          <>
            <span className="auth-reset-icon"><CheckCircle className="size-6" aria-hidden /></span>
            <AuthIntro title="Check your email" description="Use the link in your email to set a new password." />
          </>
        )}
      </div>
      {!sent && (
        <>
          <AuthIntro title="Reset your password" description="Enter your email address and we’ll send you a reset link." />
          {error && <Alert variant="error" className="mb-5">{error}</Alert>}

          <form onSubmit={handleSubmit(onSubmit)} className="auth-form" noValidate>
            <Input
              label="Email address" type="email" autoComplete="email" required
              leftIcon={<Mail aria-hidden className="size-4" />}
              error={errors.email?.message}
              {...register('email')}
            />
            <Button type="submit" fullWidth isLoading={isSubmitting} size="lg" className="auth-submit">
              Send reset link
            </Button>
          </form>
        </>
      )}

      <p className="auth-footer-link">
        <Link href={ROUTES.LOGIN} className="auth-text-link">Back to sign in</Link>
      </p>
    </AuthFrame>
  );
}
