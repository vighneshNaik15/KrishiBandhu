'use client';

import { PageIntro } from '@/components/ui/PageIntro';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { GeoPoint } from 'firebase/firestore';
import { FarmMap } from './ClientFarmMap';
import { boundaryArea, MAX_BOUNDARY_POINTS, SQUARE_METRES_PER_UNIT, type BoundaryPoint } from './boundary';
import { TreePalm } from 'lucide-react';
import { useFarmWorkspace } from './FarmWorkspace';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Card } from '@/components/ui/Card';
import { ROUTES, KONKAN_DISTRICTS, INDIAN_STATES } from '@/lib/constants';
import {
  SOIL_TYPE_LABELS, IRRIGATION_TYPE_LABELS, AREA_UNIT_LABELS,
  type SoilType, type IrrigationType, type Farm,
} from '@/models/farm';

const schema = z.object({
  name: z.string().trim().min(2, 'Farm name is required').max(120),
  description: z.string().optional(),
  village: z.string().optional(),
  taluka: z.string().optional(),
  district: z.string().min(1, 'District is required'),
  state: z.string().min(1, 'State is required'),
  pincode: z.string().regex(/^\d{6}$/, 'Enter a valid 6-digit pincode').optional().or(z.literal('')),
  area: z.coerce.number().nonnegative('Area must be a positive number'),
  areaUnit: z.enum(['acres', 'hectares', 'guntha', 'sqft', 'sqm']),
  soilType: z.string().optional(),
  irrigationType: z.string().optional(),
});

type FormInput = z.input<typeof schema>;
type FormData = z.output<typeof schema>;

const soilOptions = Object.entries(SOIL_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }));
const irrigationOptions = Object.entries(IRRIGATION_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }));
const areaUnitOptions = Object.entries(AREA_UNIT_LABELS).map(([v, l]) => ({ value: v, label: l }));
const stateOptions = INDIAN_STATES.map(s => ({ value: s, label: s }));

export default function FarmForm({ farm, onClose }: { farm?: Farm; onClose?: () => void }) {
  const { save } = useFarmWorkspace();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [initialPoints] = useState<readonly BoundaryPoint[]>(farm?.boundary ?? []);
  const [points, setPoints] = useState(initialPoints);
  let squareMetres: number | undefined;
  let boundaryError: string | undefined;
  if (points.length) {
    try {
      squareMetres = boundaryArea(points);
    } catch (validationError) {
      boundaryError = (validationError as Error).message;
    }
  }

  const { register, handleSubmit, control, setValue, formState: { errors, isSubmitting } } = useForm<FormInput, unknown, FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: farm?.name ?? '',
      description: farm?.description ?? '',
      village: farm?.village ?? '',
      taluka: farm?.taluka ?? '',
      district: farm?.district ?? '',
      state: farm?.state ?? 'Goa',
      pincode: farm?.pincode ?? '',
      area: farm?.area ?? 0,
      areaUnit: farm?.areaUnit ?? 'acres',
      soilType: farm?.soilType ?? '',
      irrigationType: farm?.irrigationType ?? '',
    },
  });

  const unit = useWatch({ control, name: 'areaUnit' });
  const mappedArea = squareMetres === undefined ? undefined : squareMetres / SQUARE_METRES_PER_UNIT[unit];

  const watchedState = useWatch({ control, name: 'state' });
  const konkanDistricts = KONKAN_DISTRICTS[watchedState];
  const districtOptions = konkanDistricts
    ? konkanDistricts.map(d => ({ value: d, label: d }))
    : [{ value: '', label: 'Enter district name' }];

  const onSubmit = async (data: FormData) => {
    setError(null);
    if (boundaryError || (mappedArea === undefined && data.area <= 0)) {
      setError(boundaryError ?? 'Enter an area greater than zero or draw your boundary.');
      return;
    }
    try {
      const details = {
        name: data.name,
        description: data.description ?? '',
        village: data.village ?? '',
        taluka: data.taluka ?? '',
        district: data.district,
        state: data.state,
        pincode: data.pincode ?? '',
        boundary: points.length ? points.map(point => new GeoPoint(point.latitude, point.longitude)) : undefined,
        area: mappedArea ?? data.area,
        areaUnit: data.areaUnit,
        soilType: (data.soilType || undefined) as SoilType | undefined,
        irrigationType: (data.irrigationType || undefined) as IrrigationType | undefined,
      };
      await save(farm ? { kind: 'update', farm, details } : { kind: 'create', details });
      if (onClose) onClose();
      else router.push(ROUTES.FARMER_FARMS);
    } catch (error) {
      setError(error instanceof Error && error.name === 'Error' && error.message.includes('another tab')
        ? error.message : 'Could not save this plot on this device. Please try again.');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageIntro title={farm ? 'Edit Farm' : 'Add New Farm'}
        description="Enter the farm details and use the map if you want to record a field boundary." />

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
              {points.length ? (
                <Input label="Mapped area" readOnly value={mappedArea === undefined ? '' :
                  mappedArea.toLocaleString(undefined, { maximumSignificantDigits: 7 })} />
              ) : (
                <Input label="Area" type="number" min="0" step="any" error={errors.area?.message} {...register('area')} />
              )}
              <Select label="Unit" required options={areaUnitOptions} error={errors.areaUnit?.message} {...register('areaUnit')} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Select label="Soil type" options={[{ value: '', label: 'Select soil type' }, ...soilOptions]} {...register('soilType')} />
              <Select label="Irrigation type" options={[{ value: '', label: 'Select type' }, ...irrigationOptions]} {...register('irrigationType')} />
            </div>
          </div>
        </Card>

        <Card className="space-y-3">
          <h2 className="font-semibold text-neutral-800">Farm boundary</h2>
          <p className="text-sm text-neutral-600">Tap each corner in order. The map closes the boundary and calculates the area when you add the third corner.</p>
          <FarmMap shapes={[]} initialPoints={initialPoints} draft={points}
            onCorner={point => setPoints(current => current.length < MAX_BOUNDARY_POINTS ? [...current, point] : current)} />
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="secondary" disabled={!points.length}
              onClick={() => setPoints(current => current.slice(0, -1))}>Undo corner</Button>
            <Button type="button" variant="secondary" disabled={!points.length}
              onClick={() => setPoints([])}>Clear boundary</Button>
            <span className="text-sm text-neutral-600" aria-live="polite">{points.length} / {MAX_BOUNDARY_POINTS} corners</span>
          </div>
          {boundaryError && <Alert variant="warning">{boundaryError}</Alert>}
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
          <Button type="button" variant="secondary" onClick={() => onClose ? onClose() : router.push(farm ? `${ROUTES.FARMER_FARMS}/${farm.farmId}` : ROUTES.FARMER_FARMS)}>Cancel</Button>
          <Button type="submit" isLoading={isSubmitting} leftIcon={<TreePalm className="w-4 h-4" />}>
            Save Farm
          </Button>
        </div>
      </form>
    </div>
  );
}
