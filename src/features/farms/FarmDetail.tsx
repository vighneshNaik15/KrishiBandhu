'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { MapPin, Layers, Edit, Sprout, Plus } from 'lucide-react';
import { FarmMap } from './ClientFarmMap';
import { Card, EmptyState } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { PageIntro } from '@/components/ui/PageIntro';
import { useAuth } from '@/features/auth/AuthContext';
import { ROUTES } from '@/lib/constants';
import { SOIL_TYPE_LABELS, IRRIGATION_TYPE_LABELS, AREA_UNIT_LABELS, type Farm } from '@/models/farm';
import { CROP_GROWTH_STAGE_LABELS, type Crop } from '@/models/crop';
import { cropService } from '@/services/cropService';
import { getFirebaseLoadErrorMessage } from '@/utils/firebaseErrors';
import { useFarmWorkspace } from './FarmWorkspace';

export function FarmDetail({ farm, onBack, onEdit }: { farm: Farm; onBack: () => void; onEdit: () => void }) {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <PageIntro title={farm.name} description={farm.description} actions={<>
        <Button onClick={onBack} variant="ghost">Back</Button>
        <Button onClick={onEdit} variant="secondary" leftIcon={<Edit className="size-4" />}>Edit</Button>
      </>} />

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
            <p><span className="text-neutral-500">Area:</span> <span className="font-medium">{farm.area.toLocaleString(undefined, { maximumSignificantDigits: 7 })} {AREA_UNIT_LABELS[farm.areaUnit] ?? farm.areaUnit}</span></p>
            {farm.soilType && <p><span className="text-neutral-500">Soil:</span> <span className="font-medium">{SOIL_TYPE_LABELS[farm.soilType]}</span></p>}
            {farm.irrigationType && <p><span className="text-neutral-500">Irrigation:</span> <span className="font-medium">{IRRIGATION_TYPE_LABELS[farm.irrigationType]}</span></p>}
          </div>
        </Card>
      </div>

      {farm.boundary?.length ? (
        <Card className="space-y-3">
          <h2 className="font-semibold text-neutral-800">Farm boundary</h2>
          <FarmMap shapes={[{ id: farm.farmId, name: farm.name, points: farm.boundary }]}
            initialPoints={farm.boundary} />
        </Card>
      ) : null}

      <FarmCrops key={farm.farmId} farmId={farm.farmId} />
    </div>
  );
}

function FarmCrops({ farmId }: { farmId: string }) {
  const { online } = useFarmWorkspace();
  const { userProfile } = useAuth();
  const farmerId = userProfile?.uid;
  const [crops, setCrops] = useState<Crop[]>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!online || !farmerId) return;
    let active = true;
    cropService.getByFarm(farmId, farmerId)
      .then(result => {
        if (!active) return;
        setCrops(result);
        setError(null);
      })
      .catch(loadError => {
        if (active) setError(getFirebaseLoadErrorMessage(loadError, 'Crops on this farm'));
      });
    return () => { active = false; };
  }, [farmId, farmerId, online]);

  return (
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-neutral-800 flex items-center gap-2">
            <Sprout className="w-5 h-5 text-primary-600"/> Crops on this Farm
          </h2>
          {online && farmerId && (
            <Link href={`${ROUTES.FARMER_CROPS_NEW}?farmId=${farmId}`}>
              <Button size="sm" variant="secondary" leftIcon={<Plus className="w-4 h-4"/>}>Add Crop</Button>
            </Link>
          )}
        </div>
        {!online || !farmerId ? <p className="text-sm text-neutral-600">Connect to the internet to load current crop records.</p>
          : error ? <Alert variant="error">{error}</Alert>
          : !crops ? <p role="status" className="text-sm text-neutral-600">Loading crops…</p>
          : crops.length === 0 ? <EmptyState title="No crops added yet" description="Add crops to track their growth, irrigation and harvest details." />
          : <ul className="divide-y divide-neutral-100">
            {crops.map(crop => (
              <li key={crop.cropId} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <span className="font-medium text-neutral-900">{crop.name}</span>
                <span className="text-neutral-600">{CROP_GROWTH_STAGE_LABELS[crop.currentGrowthStage]}</span>
              </li>
            ))}
          </ul>}
      </Card>
  );
}
