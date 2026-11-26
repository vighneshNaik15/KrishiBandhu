'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Mail, Lock, Phone } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { RegistrationFrame } from '@/features/auth/AuthFrame';
import { AuthPasswordInput } from '@/features/auth/AuthPasswordInput';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { ROUTES } from '@/lib/constants';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number').optional().or(z.literal('')),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type FormData = z.infer<typeof schema>;

export default function RegisterBuyerPage() {
  const { register: registerUser, error, clearError } = useAuth();
  const router = useRouter();
  const [showPass, setShowPass] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    clearError();
    try {
      await registerUser({
        name: data.name,
        email: data.email,
        password: data.password,
        phone: data.phone || undefined,
        role: 'buyer',
      });
      router.replace(ROUTES.BUYER_DASHBOARD);
    } catch {
      // Error is set in context
    }
  };

  return (
    <RegistrationFrame title="Create your buyer account" description="Browse seasonal produce from farmers across Goa and Konkan.">
      {error && <Alert variant="error" className="mb-5" onDismiss={clearError}>{error}</Alert>}

      <form onSubmit={handleSubmit(onSubmit)} className="auth-form" noValidate>
        <div className="auth-field-pair">
          <Input
            label="Full name" required autoComplete="name"
            leftIcon={<User aria-hidden className="size-4" />}
            error={errors.name?.message}
            {...register('name')}
          />
          <Input
            label="Email address" type="email" required autoComplete="email"
            leftIcon={<Mail aria-hidden className="size-4" />}
            error={errors.email?.message}
            {...register('email')}
          />
        </div>

        <Input
          label="Mobile number (optional)" type="tel" autoComplete="tel"
          leftIcon={<Phone aria-hidden className="size-4" />}
          placeholder="10-digit number"
          error={errors.phone?.message}
          {...register('phone')}
        />

        <div className="auth-field-pair">
          <AuthPasswordInput
            label="Password" required autoComplete="new-password"
            visible={showPass}
            onToggle={() => setShowPass(current => !current)}
            hint="At least 8 characters"
            error={errors.password?.message}
            {...register('password')}
          />
          <Input
            label="Confirm password" type="password" required autoComplete="new-password"
            leftIcon={<Lock aria-hidden className="size-4" />}
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />
        </div>

        <Button type="submit" fullWidth isLoading={isSubmitting} size="lg" className="auth-submit">
          Create Buyer Account
        </Button>
      </form>
    </RegistrationFrame>
  );
}
