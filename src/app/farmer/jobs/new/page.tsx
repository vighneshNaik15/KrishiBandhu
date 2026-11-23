'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Briefcase } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { useAuth } from '@/features/auth/AuthContext';
import { jobService } from '@/services/jobService';
import { farmService } from '@/services/farmService';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Card } from '@/components/ui/Card';
import { ROUTES, KONKAN_DISTRICTS, INDIAN_STATES } from '@/lib/constants';
import { JOB_CATEGORY_LABELS, PAYMENT_TYPE_LABELS, type JobCategory, type PaymentType } from '@/models/job';
import type { Farm } from '@/models/farm';
import { getFirebaseLoadErrorMessage, getFirebaseOperationErrorMessage } from '@/utils/firebaseErrors';

const schema = z.object({
  title: z.string().min(5, 'Job title must be at least 5 characters'),
  description: z.string().min(20, 'Please provide a detailed description (at least 20 characters)'),
  category: z.string().min(1, 'Please select a category'),
  workersRequired: z.coerce.number().int().positive('Must require at least 1 worker'),
  farmId: z.string().optional(),
  village: z.string().optional(),
  taluka: z.string().optional(),
  district: z.string().min(1, 'District is required'),
  state: z.string().min(1, 'State is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional(),
  paymentType: z.string().min(1, 'Please select payment type'),
  paymentAmount: z.literal('').or(z.coerce.number().positive('Enter an amount greater than zero')).optional(),
  paymentNotes: z.string().optional(),
  publishNow: z.boolean().default(true),
}).refine(({ startDate, endDate }) => !endDate || endDate >= startDate, {
  path: ['endDate'],
  message: 'End date must be on or after the start date',
});

type FormInput = z.input<typeof schema>;
type FormData = z.output<typeof schema>;

const catOptions = Object.entries(JOB_CATEGORY_LABELS).map(([v,l]) => ({ value: v, label: l }));
const paymentOptions = Object.entries(PAYMENT_TYPE_LABELS).map(([v,l]) => ({ value: v, label: l }));
const stateOptions = INDIAN_STATES.map(s => ({ value: s, label: s }));

export default function NewJobPage() {
  const { userProfile } = useAuth();
  const router = useRouter();
  const [farms, setFarms] = useState<Farm[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [farmError, setFarmError] = useState<string | null>(null);

  useEffect(() => {
    if (!userProfile?.uid) return;
    let active = true;
    farmService.getByFarmer(userProfile.uid)
      .then(result => { if (active) setFarms(result); })
      .catch(loadError => { if (active) setFarmError(getFirebaseLoadErrorMessage(loadError, 'Saved farms')); });
    return () => { active = false; };
  }, [userProfile?.uid]);

  const { register, handleSubmit, control, setValue, formState: { errors, isSubmitting } } = useForm<FormInput, unknown, FormData>({
    resolver: zodResolver(schema),
    defaultValues: { state: 'Goa', paymentType: 'daily', publishNow: true, workersRequired: 1 },
  });

  const [watchedState, startDate] = useWatch({ control, name: ['state', 'startDate'] });
  const konkanDistricts = KONKAN_DISTRICTS[watchedState];
  const districtOptions = konkanDistricts?.map(d => ({ value: d, label: d })) ?? [];

  const onSubmit = async (data: FormData) => {
    if (!userProfile) {
      setError('Your session is unavailable. Sign in again to post a job.');
      return;
    }
    setError(null);
    try {
      const selectedFarm = farms.find(f => f.farmId === data.farmId);
      const jobId = await jobService.create({
        farmerUserId: userProfile.uid,
        farmerId: userProfile.uid,
        farmerName: userProfile.name,
        farmId: selectedFarm?.farmId,
        farmName: selectedFarm?.name,
        title: data.title,
        description: data.description,
        category: data.category as JobCategory,
        workersRequired: data.workersRequired,
        village: data.village,
        taluka: data.taluka,
        district: data.district,
        state: data.state,
        startDate: Timestamp.fromDate(new Date(data.startDate)),
        endDate: data.endDate ? Timestamp.fromDate(new Date(data.endDate)) : undefined,
        paymentType: data.paymentType as PaymentType,
        paymentAmount: data.paymentAmount || undefined,
        paymentNotes: data.paymentNotes,
        status: data.publishNow ? 'published' : 'draft',
      });
      router.push(`${ROUTES.FARMER_JOBS}/${jobId}`);
    } catch (postError: unknown) {
      setError(getFirebaseOperationErrorMessage(postError, data.publishNow ? 'Publishing the job' : 'Saving the draft'));
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-heading text-neutral-900">Post a Job</h1>
        <p className="text-sm text-neutral-500 mt-1">Find skilled agricultural workers near you.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit, () => setError(null))} className="space-y-6">
        <Card>
          <h2 className="font-semibold text-neutral-800 mb-4">Job Details</h2>
          <div className="space-y-4">
            <Input label="Job title" required placeholder="e.g. Coconut Harvesting Workers Needed" error={errors.title?.message} {...register('title')} />
            <Textarea label="Description" required placeholder="Describe the work, any specific skills needed, tools provided, etc." rows={4} error={errors.description?.message} {...register('description')} />
            <div className="grid grid-cols-2 gap-4">
              <Select label="Work category" required options={catOptions} placeholder="Select category" error={errors.category?.message} {...register('category')} />
              <Input label="Workers required" type="number" required min={1} error={errors.workersRequired?.message} {...register('workersRequired')} />
            </div>
            {farms.length > 0 && (
              <Select label="Farm (optional)" options={[{ value: '', label: 'No specific farm' }, ...farms.map(f => ({ value: f.farmId, label: f.name }))]} {...register('farmId')} />
            )}
            {farmError && <p className="text-sm text-amber-800">{farmError} You can still post without linking a farm.</p>}
          </div>
        </Card>

        <Card>
          <h2 className="font-semibold text-neutral-800 mb-4">Location</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Village" placeholder="e.g. Mapusa" {...register('village')} />
              <Input label="Taluka" placeholder="e.g. Bardez" {...register('taluka')} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Select label="State" required options={stateOptions} error={errors.state?.message} {...register('state')} onChange={e => { setValue('state', e.target.value); setValue('district', ''); }} />
              {konkanDistricts ? (
                <Select label="District" required options={districtOptions} placeholder="Select district" error={errors.district?.message} {...register('district')} />
              ) : (
                <Input label="District" required error={errors.district?.message} {...register('district')} />
              )}
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="font-semibold text-neutral-800 mb-4">Schedule & Payment</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Start date" type="date" required error={errors.startDate?.message} {...register('startDate')} />
              <Input label="End date (optional)" type="date" min={startDate || undefined} error={errors.endDate?.message} {...register('endDate')} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Select label="Payment type" required options={paymentOptions} error={errors.paymentType?.message} {...register('paymentType')} />
              <Input label="Amount (₹)" type="number" step="any" placeholder="e.g. 500" error={errors.paymentAmount?.message} {...register('paymentAmount')} />
            </div>
            <Input label="Payment notes" placeholder="e.g. Paid at end of day, food provided" {...register('paymentNotes')} />
          </div>
        </Card>

        <div className="flex items-center gap-3">
          <input type="checkbox" id="publishNow" {...register('publishNow')} className="w-4 h-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500" defaultChecked />
          <label htmlFor="publishNow" className="text-sm text-neutral-700">Publish immediately (workers can apply right away)</label>
        </div>

        {error && <Alert variant="error" onDismiss={() => setError(null)}>{error}</Alert>}

        <div className="flex gap-3">
          <Button type="button" variant="secondary" onClick={() => router.push(ROUTES.FARMER_JOBS)}>Cancel</Button>
          <Button type="submit" isLoading={isSubmitting} leftIcon={<Briefcase className="w-4 h-4"/>}>Post Job</Button>
        </div>
      </form>
    </div>
  );
}
