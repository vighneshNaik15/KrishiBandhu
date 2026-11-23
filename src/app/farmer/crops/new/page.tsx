'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Sprout } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { cropService } from '@/services/cropService';
import { farmService } from '@/services/farmService';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Card } from '@/components/ui/Card';
import { getFirebaseLoadErrorMessage, getFirebaseOperationErrorMessage } from '@/utils/firebaseErrors';
import { ROUTES } from '@/lib/constants';
import {
  CROP_CATEGORY_LABELS, CROP_GROWTH_STAGE_LABELS, CROP_SEASON_LABELS,
  type CropCategory, type CropGrowthStage, type CropSeason,
} from '@/models/crop';
import { AREA_UNIT_LABELS } from '@/models/farm';
import type { Farm } from '@/models/farm';

const schema = z.object({
  farmId: z.string().min(1, 'Please select a farm'),
  name: z.string().trim().min(2, 'Crop name is required'),
  localName: z.string().optional(),
  category: z.string().min(1, 'Please select a category'),
  variety: z.string().optional(),
  season: z.string().min(1, 'Please select a season'),
  currentGrowthStage: z.string().min(1, 'Please select growth stage'),
  cultivatedArea: z.coerce.number().positive('Area must be a positive number'),
  areaUnit: z.string().min(1, 'Please select a unit'),
  sowingDate: z.string().optional(),
  expectedHarvestDate: z.string().optional(),
  irrigationDetails: z.string().optional(),
  fertilizerDetails: z.string().optional(),
  pestManagementDetails: z.string().optional(),
}).refine(({ sowingDate, expectedHarvestDate }) => !sowingDate || !expectedHarvestDate || expectedHarvestDate >= sowingDate, {
  path: ['expectedHarvestDate'],
  message: 'Expected harvest must be on or after the sowing date',
});

type FormInput = z.input<typeof schema>;
type FormData = z.output<typeof schema>;

const catOptions = Object.entries(CROP_CATEGORY_LABELS).map(([v,l]) => ({ value: v, label: l }));
const stageOptions = Object.entries(CROP_GROWTH_STAGE_LABELS).map(([v,l]) => ({ value: v, label: l }));
const seasonOptions = Object.entries(CROP_SEASON_LABELS).map(([v,l]) => ({ value: v, label: l }));
const unitOptions = Object.entries(AREA_UNIT_LABELS).map(([v,l]) => ({ value: v, label: l }));

export default function NewCropPage() {
  const { userProfile } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedFarmId = searchParams.get('farmId') ?? '';

  const farmerId = userProfile?.uid;
  const [farmResult, setFarmResult] = useState<{ uid: string; farms: Farm[]; error?: string }>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!farmerId) return;
    let active = true;
    farmService.getByFarmer(farmerId).then(farms => {
      if (active) setFarmResult({ uid: farmerId, farms });
    }).catch(loadError => {
      if (active) setFarmResult({ uid: farmerId, farms: [], error: getFirebaseLoadErrorMessage(loadError, 'Farms') });
    });
    return () => { active = false; };
  }, [farmerId]);

  const currentFarms = farmResult?.uid === farmerId ? farmResult : undefined;
  const farmOptions = currentFarms?.farms.map(farm => ({ value: farm.farmId, label: farm.name })) ?? [];

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormInput, unknown, FormData>({
    resolver: zodResolver(schema),
    defaultValues: { farmId: preselectedFarmId, areaUnit: 'acres', currentGrowthStage: 'sowing', season: 'kharif' },
  });

  const onSubmit = async (data: FormData) => {
    if (!userProfile) return;
    if (!farmOptions.some(farm => farm.value === data.farmId)) {
      setError('Select one of your saved farms before saving this crop.');
      return;
    }
    setError(null);
    try {
      await cropService.create({
        farmId: data.farmId,
        farmerId: userProfile.uid,
        farmerUserId: userProfile.uid,
        name: data.name,
        localName: data.localName,
        category: data.category as CropCategory,
        variety: data.variety,
        season: data.season as CropSeason,
        currentGrowthStage: data.currentGrowthStage as CropGrowthStage,
        cultivatedArea: data.cultivatedArea,
        areaUnit: data.areaUnit,
        sowingDate: data.sowingDate ? new Date(data.sowingDate) : undefined,
        expectedHarvestDate: data.expectedHarvestDate ? new Date(data.expectedHarvestDate) : undefined,
        irrigationDetails: data.irrigationDetails,
        fertilizerDetails: data.fertilizerDetails,
        pestManagementDetails: data.pestManagementDetails,
      });
      router.push(ROUTES.FARMER_CROPS);
    } catch (saveError) {
      setError(getFirebaseOperationErrorMessage(saveError, 'Saving the crop'));
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-heading text-neutral-900">Add New Crop</h1>
        <p className="text-sm text-neutral-500 mt-1">Track a crop on one of your farms.</p>
      </div>

      <form noValidate onSubmit={handleSubmit(onSubmit, () => setError('Check the highlighted crop fields, then try again.'))} className="space-y-6">
        <Card>
          <h2 className="font-semibold text-neutral-800 mb-4 flex items-center gap-2">
            <Sprout className="w-5 h-5 text-primary-600"/> Crop Details
          </h2>
          <div className="space-y-4">
            {!currentFarms ? <p role="status" className="text-sm text-neutral-600">Loading farms...</p>
              : currentFarms.error ? <Alert variant="error">{currentFarms.error}</Alert>
              : farmOptions.length === 0 ? (
                <Alert variant="info">Save a farm before adding a crop. <Link href={ROUTES.FARMER_FARMS} className="underline">Open My Farms</Link></Alert>
              ) : (
              <Select label="Farm" required options={farmOptions} placeholder="Select a farm" error={errors.farmId?.message} {...register('farmId')} />
            )}
            <div className="grid grid-cols-2 gap-4">
              <Input label="Crop name" required placeholder="e.g. Coconut" error={errors.name?.message} {...register('name')} />
              <Input label="Local name" placeholder="e.g. Narlel" {...register('localName')} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Select label="Category" required options={catOptions} placeholder="Select category" error={errors.category?.message} {...register('category')} />
              <Input label="Variety" placeholder="e.g. Tall Variety" {...register('variety')} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Select label="Season" required options={seasonOptions} error={errors.season?.message} {...register('season')} />
              <Select label="Current Stage" required options={stageOptions} error={errors.currentGrowthStage?.message} {...register('currentGrowthStage')} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Cultivated Area" type="number" step="any" required placeholder="e.g. 1.5" error={errors.cultivatedArea?.message} {...register('cultivatedArea')} />
              <Select label="Unit" required options={unitOptions} error={errors.areaUnit?.message} {...register('areaUnit')} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Sowing Date" type="date" {...register('sowingDate')} />
              <Input label="Expected Harvest" type="date" error={errors.expectedHarvestDate?.message} {...register('expectedHarvestDate')} />
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="font-semibold text-neutral-800 mb-4">Management Details (Optional)</h2>
          <div className="space-y-4">
            <Textarea label="Irrigation details" placeholder="Describe your irrigation schedule..." rows={2} {...register('irrigationDetails')} />
            <Textarea label="Fertilizer details" placeholder="Type, quantity and schedule..." rows={2} {...register('fertilizerDetails')} />
            <Textarea label="Pest management" placeholder="Describe pest/disease management..." rows={2} {...register('pestManagementDetails')} />
          </div>
        </Card>

        {error && <Alert variant="error" onDismiss={() => setError(null)}>{error}</Alert>}
        <div className="flex gap-3">
          <Button type="button" variant="secondary" onClick={() => router.push(ROUTES.FARMER_CROPS)}>Cancel</Button>
          <Button type="submit" disabled={!farmOptions.length} isLoading={isSubmitting} leftIcon={<Sprout className="w-4 h-4"/>}>Save Crop</Button>
        </div>
      </form>
    </div>
  );
}
