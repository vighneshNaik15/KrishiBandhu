'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, User, Mail, Lock, Phone } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { Input, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { ROUTES, KONKAN_DISTRICTS, KONKAN_STATES } from '@/lib/constants';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
  state: z.string().min(1, 'Please select your state'),
  district: z.string().min(1, 'Please select your district'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;

const STATE_OPTIONS = KONKAN_STATES.map((s) => ({ value: s, label: s }));

export default function RegisterWorkerPage() {
  const { register: registerUser, error, clearError } = useAuth();
  const router = useRouter();
  const [showPass, setShowPass] = useState(false);

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { state: 'Goa' },
  });

  const watchedState = watch('state');
  const districtOptions = (KONKAN_DISTRICTS[watchedState] ?? []).map((d) => ({ value: d, label: d }));

  const onSubmit = async (data: FormData) => {
    clearError();
    try {
      await registerUser({
        name: data.name,
        email: data.email,
        password: data.password,
        phone: data.phone,
        role: 'worker',
      });
      router.replace(ROUTES.WORKER_DASHBOARD);
    } catch {
      // Error is set in context
    }
  };

  return (
    <div className="w-full max-w-lg">
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold font-heading text-neutral-900 mb-1">Register as Worker</h1>
          <p className="text-sm text-neutral-500">Find agricultural jobs across Goa and Konkan.</p>
        </div>

        {error && (
          <Alert variant="error" className="mb-6" onDismiss={clearError}>{error}</Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <Input label="Full name" required leftIcon={<User className="w-4 h-4" />} error={errors.name?.message} {...register('name')} />
          <Input label="Email address" type="email" required autoComplete="email" leftIcon={<Mail className="w-4 h-4" />} error={errors.email?.message} {...register('email')} />
          <Input label="Mobile number" type="tel" required leftIcon={<Phone className="w-4 h-4" />} error={errors.phone?.message} placeholder="10-digit number" {...register('phone')} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="State" required options={STATE_OPTIONS} error={errors.state?.message} {...register('state')} onChange={(e) => { setValue('state', e.target.value); setValue('district', ''); }} />
            <Select label="District" required options={districtOptions} placeholder="Select district" error={errors.district?.message} {...register('district')} />
          </div>
          <Input label="Password" type={showPass ? 'text' : 'password'} required autoComplete="new-password" leftIcon={<Lock className="w-4 h-4" />} rightIcon={<button type="button" onClick={() => setShowPass(!showPass)} className="text-neutral-400 hover:text-neutral-700">{showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>} hint="At least 8 characters" error={errors.password?.message} {...register('password')} />
          <Input label="Confirm password" type="password" required autoComplete="new-password" leftIcon={<Lock className="w-4 h-4" />} error={errors.confirmPassword?.message} {...register('confirmPassword')} />
          <Button type="submit" fullWidth isLoading={isSubmitting} size="lg" className="mt-2">Create Worker Account</Button>
        </form>

        <p className="text-center text-sm text-neutral-500 mt-6">
          Already have an account?{' '}
          <Link href={ROUTES.LOGIN} className="text-primary-600 font-semibold hover:text-primary-700">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
