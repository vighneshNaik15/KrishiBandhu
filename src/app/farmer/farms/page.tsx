'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, TreePalm, MapPin, Ruler, Edit, Trash2 } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { farmService } from '@/services/farmService';
import { Card, EmptyState } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { ROUTES } from '@/lib/constants';
import { SOIL_TYPE_LABELS, AREA_UNIT_LABELS } from '@/models/farm';
import { getFirebaseLoadErrorMessage } from '@/utils/firebaseErrors';
import type { Farm } from '@/models/farm';

export default function FarmerFarmsPage() {
  const { userProfile } = useAuth();
  const [farmLoad, setFarmLoad] = useState<{
    farmerId: string;
    farms: Farm[];
    error: string | null;
  }>({ farmerId: '', farms: [], error: null });
  const [deleting, setDeleting] = useState<string | null>(null);

  const farmerId = userProfile?.uid ?? '';
  const currentFarmLoad = farmLoad.farmerId === farmerId;
  const farms = currentFarmLoad ? farmLoad.farms : [];
  const error = currentFarmLoad ? farmLoad.error : null;
  const loading = !farmerId || !currentFarmLoad;

  useEffect(() => {
    if (!farmerId) return;

    let active = true;
    farmService.getByFarmer(farmerId)
      .then((data) => {
        if (active) setFarmLoad({ farmerId, farms: data, error: null });
      })
      .catch((loadError: unknown) => {
        if (active) {
          setFarmLoad({
            farmerId,
            farms: [],
            error: getFirebaseLoadErrorMessage(loadError, 'Your farms'),
          });
        }
      });

    return () => { active = false; };
  }, [farmerId]);

  const handleDelete = async (farmId: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setDeleting(farmId);
    try {
      await farmService.delete(farmId);
      setFarmLoad((current) => current.farmerId === farmerId
        ? { ...current, farms: current.farms.filter((farm) => farm.farmId !== farmId) }
        : current);
    } catch {
      setFarmLoad((current) => current.farmerId === farmerId
        ? { ...current, error: 'Failed to delete farm.' }
        : current);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-neutral-900">My Farms</h1>
          <p className="text-sm text-neutral-500 mt-1">Manage all your farms in one place.</p>
        </div>
        <Link href={ROUTES.FARMER_FARMS_NEW}>
          <Button leftIcon={<Plus className="w-4 h-4" />}>Add Farm</Button>
        </Link>
      </div>

      {error && (
        <Alert
          variant="error"
          onDismiss={() => setFarmLoad((current) => ({ ...current, error: null }))}
        >
          {error}
        </Alert>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-48 bg-neutral-100 rounded-xl animate-pulse"/>)}
        </div>
      ) : error ? null : farms.length === 0 ? (
        <Card>
          <EmptyState
            icon={<TreePalm className="w-8 h-8"/>}
            title="No farms added yet"
            description="Add your farm to manage crops, post agricultural jobs and track activity."
            action={
              <Link href={ROUTES.FARMER_FARMS_NEW}>
                <Button leftIcon={<Plus className="w-4 h-4"/>}>Add your first farm</Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {farms.map(farm => (
            <Card key={farm.farmId} hover className="relative">
              {/* Farm header */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center shrink-0">
                  <TreePalm className="w-5 h-5 text-primary-600" aria-hidden />
                </div>
                <div className="flex gap-1 shrink-0">
                  <Link href={`${ROUTES.FARMER_FARMS}/${farm.farmId}/edit`}>
                    <button className="p-1.5 rounded-lg text-neutral-400 hover:text-primary-600 hover:bg-primary-50 transition-colors" aria-label="Edit farm">
                      <Edit className="w-4 h-4"/>
                    </button>
                  </Link>
                  <button
                    onClick={() => handleDelete(farm.farmId, farm.name)}
                    disabled={deleting === farm.farmId}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    aria-label="Delete farm"
                  >
                    <Trash2 className="w-4 h-4"/>
                  </button>
                </div>
              </div>

              <Link href={`${ROUTES.FARMER_FARMS}/${farm.farmId}`}>
                <h3 className="font-semibold text-neutral-900 mb-1">{farm.name}</h3>
                {farm.description && (
                  <p className="text-xs text-neutral-500 mb-3 truncate-2">{farm.description}</p>
                )}

                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                    <MapPin className="w-3.5 h-3.5 shrink-0" aria-hidden />
                    <span>{[farm.village, farm.taluka, farm.district].filter(Boolean).join(', ')}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                    <Ruler className="w-3.5 h-3.5 shrink-0" aria-hidden />
                    <span>{farm.area} {AREA_UNIT_LABELS[farm.areaUnit] ?? farm.areaUnit}</span>
                  </div>
                  {farm.soilType && (
                    <div className="inline-block text-xs px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 font-medium mt-1">
                      {SOIL_TYPE_LABELS[farm.soilType] ?? farm.soilType}
                    </div>
                  )}
                </div>
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
