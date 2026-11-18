'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Sprout, Calendar, Ruler, Edit, Trash2 } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { cropService } from '@/services/cropService';
import { Card, EmptyState } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { ROUTES } from '@/lib/constants';
import { CROP_CATEGORY_LABELS, CROP_GROWTH_STAGE_LABELS } from '@/models/crop';
import { formatDate } from '@/utils/formatters';
import { getFirebaseLoadErrorMessage } from '@/utils/firebaseErrors';
import type { Crop } from '@/models/crop';

export default function FarmerCropsPage() {
  const { userProfile } = useAuth();
  const [crops, setCrops] = useState<Crop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userProfile?.uid) return;
    cropService.getByFarmer(userProfile.uid)
      .then(setCrops)
      .catch((loadError: unknown) => setError(getFirebaseLoadErrorMessage(loadError, 'Your crops')))
      .finally(() => setLoading(false));
  }, [userProfile?.uid]);

  const handleDelete = async (cropId: string, name: string) => {
    if (!confirm(`Delete crop "${name}"?`)) return;
    try {
      await cropService.delete(cropId);
      setCrops(prev => prev.filter(c => c.cropId !== cropId));
    } catch {
      setError('Failed to delete crop.');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-neutral-900">My Crops</h1>
          <p className="text-sm text-neutral-500 mt-1">Track all crops across your farms.</p>
        </div>
        <Link href={ROUTES.FARMER_CROPS_NEW}>
          <Button leftIcon={<Plus className="w-4 h-4" />}>Add Crop</Button>
        </Link>
      </div>

      {error && <Alert variant="error" onDismiss={() => setError(null)}>{error}</Alert>}

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 bg-neutral-100 rounded-xl animate-pulse"/>)}</div>
      ) : error ? null : crops.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Sprout className="w-8 h-8"/>}
            title="No crops added yet"
            description="Add crops to your farms to track growth, irrigation and harvest schedules."
            action={<Link href={ROUTES.FARMER_CROPS_NEW}><Button leftIcon={<Plus className="w-4 h-4"/>}>Add first crop</Button></Link>}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {crops.map(crop => (
            <Card key={crop.cropId}>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center shrink-0">
                    <Sprout className="w-5 h-5 text-primary-600" aria-hidden/>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-neutral-900">{crop.name}</h3>
                      {crop.variety && <span className="text-xs text-neutral-500">({crop.variety})</span>}
                      <Badge variant="success" className="text-xs">{CROP_GROWTH_STAGE_LABELS[crop.currentGrowthStage]}</Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-1 flex-wrap">
                      <span className="text-xs text-neutral-500">{CROP_CATEGORY_LABELS[crop.category]}</span>
                      {crop.sowingDate && (
                        <span className="text-xs text-neutral-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3"/> Sown: {formatDate(crop.sowingDate)}
                        </span>
                      )}
                      <span className="text-xs text-neutral-500 flex items-center gap-1">
                        <Ruler className="w-3 h-3"/> {crop.cultivatedArea} {crop.areaUnit}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Link href={`${ROUTES.FARMER_CROPS}/${crop.cropId}/edit`}>
                    <button className="p-1.5 rounded-lg text-neutral-400 hover:text-primary-600 hover:bg-primary-50 transition-colors" aria-label="Edit crop">
                      <Edit className="w-4 h-4"/>
                    </button>
                  </Link>
                  <button
                    onClick={() => handleDelete(crop.cropId, crop.name)}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    aria-label="Delete crop"
                  >
                    <Trash2 className="w-4 h-4"/>
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
