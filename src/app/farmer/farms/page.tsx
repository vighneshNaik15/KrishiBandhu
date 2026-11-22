'use client';

import React, { useMemo, useState } from 'react';
import { Plus, TreePalm, MapPin, Ruler, Edit, Trash2 } from 'lucide-react';
import { FarmMap } from '@/features/farms/ClientFarmMap';
import { useFarmWorkspace } from '@/features/farms/FarmWorkspace';
import FarmForm from '@/features/farms/FarmForm';
import { FarmDetail } from '@/features/farms/FarmDetail';
import { Card, EmptyState } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { SOIL_TYPE_LABELS, AREA_UNIT_LABELS } from '@/models/farm';
import type { Farm } from '@/models/farm';

export default function FarmerFarmsPage() {
  const { farms, ready, error, save } = useFarmWorkspace();
  const [view, setView] = useState<'list' | 'map'>('list');
  const [editor, setEditor] = useState<{ farm?: Farm } | null>(null);
  const [detailId, setDetailId] = useState<string>();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const shapes = useMemo(() => farms.filter(farm => farm.boundary?.length)
    .map(farm => ({
      id: farm.farmId,
      name: farm.name,
      points: farm.boundary ?? [],
      onSelect: () => setDetailId(farm.farmId),
    })), [farms]);
  const mapPoints = useMemo(() => shapes.flatMap(shape => shape.points), [shapes]);
  const selected = farms.find(farm => farm.farmId === detailId);

  const handleDelete = async (farm: Farm) => {
    if (!confirm(`Delete "${farm.name}"?`)) return;
    setDeleting(farm.farmId);
    setActionError(null);
    try {
      await save({ kind: 'delete', farm });
    } catch {
      setActionError('Could not queue the deletion. Refresh the plot and try again.');
    } finally {
      setDeleting(null);
    }
  };
  if (editor) return <FarmForm farm={editor.farm} onClose={() => setEditor(null)} />;
  if (selected) return <FarmDetail farm={selected} onBack={() => setDetailId(undefined)}
    onEdit={() => { setDetailId(undefined); setEditor({ farm: selected }); }} />;

  return (
    <div id="farm-mapping" className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-neutral-900">My Farms</h1>
          <p className="text-sm text-neutral-500 mt-1">Manage all your farms in one place.</p>
        </div>
        <Button onClick={() => setEditor({})} leftIcon={<Plus className="w-4 h-4" />}>Add Farm</Button>
      </div>

      {actionError && <Alert variant="error" onDismiss={() => setActionError(null)}>{actionError}</Alert>}

      <div className="flex flex-wrap gap-2" aria-label="Farm views">
        <Button variant={view === 'list' ? 'primary' : 'secondary'} aria-pressed={view === 'list'}
          onClick={() => setView('list')}>Farm list</Button>
        <Button variant={view === 'map' ? 'primary' : 'secondary'} aria-pressed={view === 'map'}
          onClick={() => setView('map')}>Farm Mapping</Button>
      </div>

      {!ready && !error ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-48 bg-neutral-100 rounded-xl animate-pulse"/>)}
        </div>
      ) : view === 'map' ? (
        <Card className="space-y-3">
          {shapes.length === 0 && <p className="text-sm text-neutral-600">Add a boundary to a farm to show it on the map.</p>}
          {shapes.length > 0 && shapes.length < farms.length && (
            <p className="text-sm text-neutral-600">{farms.length - shapes.length} farms without a boundary are available in the farm list.</p>
          )}
          <FarmMap shapes={shapes} initialPoints={mapPoints} />
        </Card>
      ) : farms.length === 0 ? (
        <Card>
          <EmptyState
            icon={<TreePalm className="w-8 h-8"/>}
            title="No farms added yet"
            description="Add your farm to manage crops, post agricultural jobs and track activity."
            action={
              <Button onClick={() => setEditor({})} leftIcon={<Plus className="w-4 h-4"/>}>Add your first farm</Button>
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
                  <button onClick={() => setEditor({ farm })} className="p-1.5 rounded-lg text-neutral-400 hover:text-primary-600 hover:bg-primary-50 transition-colors" aria-label="Edit farm">
                      <Edit className="w-4 h-4"/>
                  </button>
                  <button
                    onClick={() => handleDelete(farm)}
                    disabled={deleting === farm.farmId}
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    aria-label="Delete farm"
                  >
                    <Trash2 className="w-4 h-4"/>
                  </button>
                </div>
              </div>

              <button type="button" className="w-full text-left" onClick={() => setDetailId(farm.farmId)}>
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
                    <span>{farm.area.toLocaleString(undefined, { maximumSignificantDigits: 7 })} {AREA_UNIT_LABELS[farm.areaUnit] ?? farm.areaUnit}</span>
                  </div>
                  {farm.soilType && (
                    <div className="inline-block text-xs px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 font-medium mt-1">
                      {SOIL_TYPE_LABELS[farm.soilType] ?? farm.soilType}
                    </div>
                  )}
                </div>
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
