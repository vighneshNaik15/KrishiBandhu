'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, CheckCircle } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
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

  if (sent) {
    return (
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-primary-600" aria-hidden />
          </div>
          <h1 className="text-xl font-bold font-heading text-neutral-900 mb-2">Check your email</h1>
          <p className="text-sm text-neutral-500 mb-6">
            We&apos;ve sent a password reset link to your email. Click the link to set a new password.
          </p>
          <Link href={ROUTES.LOGIN}>
            <Button variant="secondary" fullWidth>Back to sign in</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold font-heading text-neutral-900 mb-1">Reset your password</h1>
          <p className="text-sm text-neutral-500">Enter your email and we&apos;ll send you a reset link.</p>
        </div>

        {error && <Alert variant="error" className="mb-6">{error}</Alert>}

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5" noValidate>
          <Input
            label="Email address" type="email" required
            leftIcon={<Mail className="w-4 h-4" />}
            error={errors.email?.message}
            {...register('email')}
          />
          <Button type="submit" fullWidth isLoading={isSubmitting} size="lg">
            Send reset link
          </Button>
        </form>

        <p className="text-center text-sm text-neutral-500 mt-6">
          <Link href={ROUTES.LOGIN} className="text-primary-600 font-semibold hover:text-primary-700">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
