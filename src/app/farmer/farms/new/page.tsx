'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TreePalm } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { farmService } from '@/services/farmService';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Card } from '@/components/ui/Card';
import { ROUTES, KONKAN_DISTRICTS, KONKAN_STATES, INDIAN_STATES } from '@/lib/constants';
import {
  SOIL_TYPE_LABELS, IRRIGATION_TYPE_LABELS, AREA_UNIT_LABELS,
  type SoilType, type IrrigationType, type AreaUnit,
} from '@/models/farm';

const schema = z.object({
  name: z.string().min(2, 'Farm name is required'),
  description: z.string().optional(),
  village: z.string().optional(),
  taluka: z.string().optional(),
  district: z.string().min(1, 'District is required'),
  state: z.string().min(1, 'State is required'),
  pincode: z.string().regex(/^\d{6}$/, 'Enter a valid 6-digit pincode').optional().or(z.literal('')),
  area: z.coerce.number().positive('Area must be a positive number'),
  areaUnit: z.enum(['acres', 'hectares', 'guntha', 'sqft']),
  soilType: z.string().optional(),
  irrigationType: z.string().optional(),
});

type FormInput = z.input<typeof schema>;
type FormData = z.output<typeof schema>;

const soilOptions = Object.entries(SOIL_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }));
const irrigationOptions = Object.entries(IRRIGATION_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }));
const areaUnitOptions = Object.entries(AREA_UNIT_LABELS).map(([v, l]) => ({ value: v, label: l }));
const stateOptions = INDIAN_STATES.map(s => ({ value: s, label: s }));

export default function NewFarmPage() {
  const { userProfile } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormInput, unknown, FormData>({
    resolver: zodResolver(schema),
    defaultValues: { state: 'Goa', areaUnit: 'acres' },
  });

  const watchedState = watch('state');
  const konkanDistricts = KONKAN_DISTRICTS[watchedState];
  const districtOptions = konkanDistricts
    ? konkanDistricts.map(d => ({ value: d, label: d }))
    : [{ value: '', label: 'Enter district name' }];

  const onSubmit = async (data: FormData) => {
    if (!userProfile) return;
    setError(null);
    try {
      const farmId = await farmService.create({
        farmerId: userProfile.uid,
        farmerUserId: userProfile.uid,
        name: data.name,
        description: data.description,
        village: data.village,
        taluka: data.taluka,
        district: data.district,
        state: data.state,
        pincode: data.pincode,
        area: data.area,
        areaUnit: data.areaUnit as AreaUnit,
        soilType: data.soilType as SoilType | undefined,
        irrigationType: data.irrigationType as IrrigationType | undefined,
      });
      router.push(`${ROUTES.FARMER_FARMS}/${farmId}`);
    } catch {
      setError('Failed to save farm. Please try again.');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-heading text-neutral-900">Add New Farm</h1>
        <p className="text-sm text-neutral-500 mt-1">Enter the details of your farm.</p>
      </div>

      {error && <Alert variant="error" onDismiss={() => setError(null)}>{error}</Alert>}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic info */}
        <Card>
          <h2 className="font-semibold text-neutral-800 mb-4 flex items-center gap-2">
            <TreePalm className="w-5 h-5 text-primary-600" aria-hidden />
            Farm Details
          </h2>
          <div className="space-y-4">
            <Input label="Farm name" required placeholder="e.g. Naik Coconut Farm" error={errors.name?.message} {...register('name')} />
            <Textarea label="Description" placeholder="Brief description of this farm..." hint="Optional" {...register('description')} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Area" type="number" required placeholder="e.g. 2.5" error={errors.area?.message} {...register('area')} />
              <Select label="Unit" required options={areaUnitOptions} error={errors.areaUnit?.message} {...register('areaUnit')} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Select label="Soil type" options={[{ value: '', label: 'Select soil type' }, ...soilOptions]} {...register('soilType')} />
              <Select label="Irrigation type" options={[{ value: '', label: 'Select type' }, ...irrigationOptions]} {...register('irrigationType')} />
            </div>
          </div>
        </Card>

        {/* Location */}
        <Card>
          <h2 className="font-semibold text-neutral-800 mb-4">Location</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Village / Ward" placeholder="e.g. Calangute" {...register('village')} />
              <Input label="Taluka" placeholder="e.g. Bardez" {...register('taluka')} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="State" required
                options={stateOptions}
                error={errors.state?.message}
                {...register('state')}
                onChange={(e) => { setValue('state', e.target.value); setValue('district', ''); }}
              />
              {konkanDistricts ? (
                <Select
                  label="District" required
                  options={districtOptions}
                  placeholder="Select district"
                  error={errors.district?.message}
                  {...register('district')}
                />
              ) : (
                <Input label="District" required placeholder="Enter district name" error={errors.district?.message} {...register('district')} />
              )}
            </div>
            <Input label="Pincode" placeholder="e.g. 403001" maxLength={6} error={errors.pincode?.message} {...register('pincode')} />
          </div>
        </Card>

        <div className="flex gap-3">
          <Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" isLoading={isSubmitting} leftIcon={<TreePalm className="w-4 h-4" />}>
            Save Farm
          </Button>
        </div>
      </form>
    </div>
  );
}
