'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Timestamp } from 'firebase/firestore';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { useAuth } from '@/features/auth/AuthContext';
import { KONKAN_DISTRICTS, ROUTES } from '@/lib/constants';
import { JOB_CATEGORY_LABELS, PAYMENT_TYPE_LABELS, type JobCategory } from '@/models/job';
import { jobService } from '@/services/jobService';

const schema = z.object({
  category: z.string().min(1, 'Select a service.'),
  district: z.enum(['North Goa', 'South Goa']),
  taluka: z.string().trim().min(2, 'Enter the taluka.').max(80),
  village: z.string().trim().min(2, 'Enter the village.').max(80),
  farmLocation: z.string().trim().min(5, 'Enter a farm location or landmark.').max(300),
  approximateLandArea: z.coerce.number().positive().max(100000),
  landAreaUnit: z.enum(['acres', 'hectares']),
  cropType: z.string().trim().min(2, 'Enter the crop type.').max(100),
  startDate: z.string().min(1, 'Select the required date.'),
  resourceType: z.enum(['workers', 'machinery']),
  resourcesRequired: z.coerce.number().int().min(1).max(500),
  paymentAmount: z.preprocess(
    (value) => value === '' || value === undefined ? undefined : Number(value),
    z.number().positive().max(10000000).optional()
  ),
  paymentType: z.enum(['daily', 'per_job', 'hourly', 'negotiable']),
  instructions: z.string().trim().min(10, 'Add at least 10 characters of instructions.').max(2000),
});

type FormValues = z.input<typeof schema>;
type ValidFormValues = z.output<typeof schema>;

const categoryOptions = Object.entries(JOB_CATEGORY_LABELS).map(([value, label]) => ({ value, label }));
const districtOptions = (KONKAN_DISTRICTS.Goa ?? []).map((value) => ({ value, label: value }));
const paymentOptions = Object.entries(PAYMENT_TYPE_LABELS).map(([value, label]) => ({ value, label }));

function isJobCategory(value: string): value is JobCategory {
  return Object.prototype.hasOwnProperty.call(JOB_CATEGORY_LABELS, value);
}

export default function NewHarvestRequestPage() {
  const { userProfile } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues, unknown, ValidFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      district: 'North Goa',
      landAreaUnit: 'acres',
      resourceType: 'workers',
      resourcesRequired: 1,
      paymentType: 'negotiable',
    },
  });

  const onSubmit = async (data: ValidFormValues) => {
    if (!userProfile) {
      setError('Your farmer profile is not ready. Refresh and try again.');
      return;
    }
    if (!isJobCategory(data.category)) {
      setError('The selected service is invalid. Choose a service from the list.');
      return;
    }
    setError(null);

    try {
      const jobId = await jobService.create({
        requestType: 'harvest_service',
        farmerId: userProfile.uid,
        farmerUserId: userProfile.uid,
        farmerName: userProfile.name,
        title: `${JOB_CATEGORY_LABELS[data.category]} in ${data.village}`,
        description: data.instructions,
        category: data.category,
        workersRequired: data.resourceType === 'workers' ? data.resourcesRequired : 0,
        ...(data.resourceType === 'machinery' ? { equipmentRequiredCount: data.resourcesRequired } : {}),
        resourceType: data.resourceType,
        resourcesRequired: data.resourcesRequired,
        farmLocation: data.farmLocation,
        approximateLandArea: data.approximateLandArea,
        landAreaUnit: data.landAreaUnit,
        cropType: data.cropType,
        instructions: data.instructions,
        village: data.village,
        taluka: data.taluka,
        district: data.district,
        state: 'Goa',
        startDate: Timestamp.fromDate(new Date(`${data.startDate}T00:00:00`)),
        paymentType: data.paymentType,
        ...(data.paymentAmount !== undefined ? { paymentAmount: data.paymentAmount } : {}),
        status: 'published',
      });
      router.push(`${ROUTES.FARMER_JOBS}/${jobId}`);
    } catch {
      setError('The request could not be published. Check your connection and try again.');
    }
  };

  const categoriesForFarmer = categoryOptions.filter(({ value }) => !['other'].includes(value));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-bold font-heading text-neutral-900">Post a harvest or machinery request</h1>
        <p className="mt-1 text-sm text-neutral-600">Requests are visible to workers after publishing. Provider availability and prices are not guaranteed.</p>
      </header>
      {error && (
        <Alert variant="error" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Card className="space-y-4">
          <h2 className="font-semibold text-neutral-900">Service and crop</h2>
          <Select label="Required service" required options={categoriesForFarmer} error={errors.category?.message} {...register('category')} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Crop type" required error={errors.cropType?.message} {...register('cropType')} />
            <Input label="Approximate land area" type="number" step="0.01" min={0.01} required error={errors.approximateLandArea?.message} {...register('approximateLandArea')} />
          </div>
          <Select label="Land area unit" required options={[{ value: 'acres', label: 'Acres' }, { value: 'hectares', label: 'Hectares' }]} {...register('landAreaUnit')} />
          <Textarea label="Work instructions" required rows={4} hint="Include tools supplied, access conditions, and other relevant details." error={errors.instructions?.message} {...register('instructions')} />
        </Card>

        <Card className="space-y-4">
          <h2 className="font-semibold text-neutral-900">Location</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="District" required options={districtOptions} error={errors.district?.message} {...register('district')} />
            <Input label="Taluka" required placeholder="Enter your taluka" error={errors.taluka?.message} {...register('taluka')} />
            <Input label="Village" required placeholder="Enter your village" error={errors.village?.message} {...register('village')} />
            <Input label="Farm location or landmark" required error={errors.farmLocation?.message} {...register('farmLocation')} />
          </div>
        </Card>

        <Card className="space-y-4">
          <h2 className="font-semibold text-neutral-900">Schedule and requirement</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Required date" type="date" required min={new Date().toISOString().slice(0, 10)} error={errors.startDate?.message} {...register('startDate')} />
            <Select label="Need" required options={[{ value: 'workers', label: 'Workers' }, { value: 'machinery', label: 'Machinery/equipment' }]} error={errors.resourceType?.message} {...register('resourceType')} />
            <Input label="Number required" type="number" min={1} max={500} required error={errors.resourcesRequired?.message} {...register('resourcesRequired')} />
            <Input label="Expected budget (₹, optional)" type="number" min={1} step="0.01" error={errors.paymentAmount?.message} {...register('paymentAmount')} />
            <Select label="Budget basis" required options={paymentOptions} error={errors.paymentType?.message} {...register('paymentType')} />
          </div>
          <p className="text-sm text-neutral-600">Photo attachments are disabled. Include the details workers need in the work instructions.</p>
        </Card>

        <p className="text-xs text-neutral-500">
          Only North Goa and South Goa are enabled for this pilot. By publishing, you ask workers/providers to contact you through the application flow; this is not a guaranteed booking.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button type="submit" isLoading={isSubmitting}>Publish request</Button>
          <Button type="button" variant="secondary" onClick={() => router.push(ROUTES.FARMER_HARVEST_REQUESTS)}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}
