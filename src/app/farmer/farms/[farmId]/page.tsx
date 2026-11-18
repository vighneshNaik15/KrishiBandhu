'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { MapPin, Ruler, Droplets, Layers, ArrowLeft, Edit, Sprout, Plus } from 'lucide-react';
import { farmService } from '@/services/farmService';
import { Card, EmptyState } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { ROUTES } from '@/lib/constants';
import { SOIL_TYPE_LABELS, IRRIGATION_TYPE_LABELS, AREA_UNIT_LABELS } from '@/models/farm';
import { getFirebaseLoadErrorMessage } from '@/utils/firebaseErrors';
import type { Farm } from '@/models/farm';

export default function FarmDetailPage() {
  const params = useParams();
  const router = useRouter();
  const farmId = params.farmId as string;
  const [farm, setFarm] = useState<Farm | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    farmService.getById(farmId)
      .then(data => {
        if (!data) { setError('Farm not found.'); return; }
        setFarm(data);
      })
      .catch((loadError: unknown) => setError(getFirebaseLoadErrorMessage(loadError, 'Farm details')))
      .finally(() => setLoading(false));
  }, [farmId]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        {[1,2,3].map(i => <div key={i} className="h-32 bg-neutral-100 rounded-xl animate-pulse"/>)}
      </div>
    );
  }

  if (error || !farm) {
    return (
      <div className="max-w-3xl mx-auto">
        <Alert variant="error">{error ?? 'Farm not found.'}</Alert>
        <Button variant="ghost" onClick={() => router.back()} className="mt-4" leftIcon={<ArrowLeft className="w-4 h-4"/>}>Go back</Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <button onClick={() => router.back()} className="text-sm text-neutral-500 hover:text-neutral-700 flex items-center gap-1 mb-2">
            <ArrowLeft className="w-4 h-4"/> Back
          </button>
          <h1 className="text-2xl font-bold font-heading text-neutral-900">{farm.name}</h1>
          {farm.description && <p className="text-sm text-neutral-500 mt-1">{farm.description}</p>}
        </div>
        <Link href={`${ROUTES.FARMER_FARMS}/${farmId}/edit`}>
          <Button variant="secondary" size="sm" leftIcon={<Edit className="w-4 h-4"/>}>Edit</Button>
        </Link>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <h2 className="font-semibold text-neutral-700 text-sm mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary-600"/> Location
          </h2>
          <div className="space-y-1 text-sm">
            {farm.village && <p><span className="text-neutral-500">Village:</span> <span className="font-medium">{farm.village}</span></p>}
            {farm.taluka && <p><span className="text-neutral-500">Taluka:</span> <span className="font-medium">{farm.taluka}</span></p>}
            <p><span className="text-neutral-500">District:</span> <span className="font-medium">{farm.district}</span></p>
            <p><span className="text-neutral-500">State:</span> <span className="font-medium">{farm.state}</span></p>
            {farm.pincode && <p><span className="text-neutral-500">Pincode:</span> <span className="font-medium">{farm.pincode}</span></p>}
          </div>
        </Card>

        <Card>
          <h2 className="font-semibold text-neutral-700 text-sm mb-3 flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary-600"/> Farm Info
          </h2>
          <div className="space-y-1 text-sm">
            <p><span className="text-neutral-500">Area:</span> <span className="font-medium">{farm.area} {AREA_UNIT_LABELS[farm.areaUnit] ?? farm.areaUnit}</span></p>
            {farm.soilType && <p><span className="text-neutral-500">Soil:</span> <span className="font-medium">{SOIL_TYPE_LABELS[farm.soilType]}</span></p>}
            {farm.irrigationType && <p><span className="text-neutral-500">Irrigation:</span> <span className="font-medium">{IRRIGATION_TYPE_LABELS[farm.irrigationType]}</span></p>}
          </div>
        </Card>
      </div>

      {/* Crops section */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-neutral-800 flex items-center gap-2">
            <Sprout className="w-5 h-5 text-primary-600"/> Crops on this Farm
          </h2>
          <Link href={`${ROUTES.FARMER_CROPS_NEW}?farmId=${farmId}`}>
            <Button size="sm" variant="secondary" leftIcon={<Plus className="w-4 h-4"/>}>Add Crop</Button>
          </Link>
        </div>
        <EmptyState
          title="No crops added yet"
          description="Add crops to track their growth, irrigation and harvest details."
          action={
            <Link href={`${ROUTES.FARMER_CROPS_NEW}?farmId=${farmId}`}>
              <Button size="sm" leftIcon={<Plus className="w-4 h-4"/>}>Add first crop</Button>
            </Link>
          }
        />
      </Card>
    </div>
  );
}
