'use client';

import { PageIntro } from '@/components/ui/PageIntro';
import { useEffect, useMemo, useState } from 'react';
import { MapPin, Package, Phone, UserRound, Warehouse } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { Card, EmptyState } from '@/components/ui/Card';
import { Select } from '@/components/ui/Input';
import { fetchCsvRecords } from '@/features/resource-finder/csv';
import {
  filterStorageByDistrict,
  getStorageDistricts,
  toStorageFacilities,
  type StorageFacility,
} from '@/features/resource-finder/storageFinder';

const capacityFormatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });

export default function StorageFinderPage() {
  const [records, setRecords] = useState<StorageFacility[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [district, setDistrict] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      fetchCsvRecords('/data/storage-finder.csv', controller.signal),
      fetchCsvRecords('/data/goa-storage-leads.csv', controller.signal),
    ])
      .then(([sourceRows, goaRows]) =>
        setRecords([
          ...toStorageFacilities(sourceRows),
          ...toStorageFacilities(goaRows),
        ])
      )
      .catch((loadError: unknown) => {
        if (!controller.signal.aborted) {
          setError(loadError instanceof Error ? loadError.message : 'Could not load storage data.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, []);

  const districts = useMemo(() => getStorageDistricts(records), [records]);
  const facilities = useMemo(
    () => filterStorageByDistrict(records, district),
    [records, district]
  );
  const hasUnverifiedLeads = facilities.some((facility) => facility.unverifiedLead);
  const sourceUrl = facilities.find((facility) => facility.sourceUrl)?.sourceUrl;

  return (
    <div className="container-page directory-page">
      <PageIntro title="Find harvest storage"
        description="Browse storage records by district. Manager and contact details appear when the source provides them."
        eyebrow="Storage Finder" icon={<Warehouse />} />

      {error && <Alert variant="error">{error}</Alert>}

      <Card>
        <div className="max-w-xl">
          <Select
            label="District"
            options={districts.map((value) => ({ value, label: value }))}
            placeholder={loading ? 'Loading districts…' : 'Select district'}
            value={district}
            disabled={loading || Boolean(error)}
            onChange={(event) => setDistrict(event.target.value)}
          />
          <p className="mt-2 text-xs text-neutral-500">
            The original dataset has no state field. Goa results are separate Civil Supplies leads and are not confirmed as farmer-accessible harvest storage.
          </p>
        </div>
      </Card>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" aria-label="Loading storage facilities">
          {[1, 2, 3].map((item) => <div key={item} className="h-48 rounded-xl bg-neutral-100 animate-pulse" />)}
        </div>
      ) : district && !error ? (
        <section aria-live="polite">
          {hasUnverifiedLeads && (
            <Alert variant="warning" title="Unverified Civil Supplies storage leads" className="mb-4">
              Facility details are transcribed from indexed text of a Goa Civil Supplies Citizen&apos;s Charter PDF uploaded in 2021.
              Farmer harvest-storage access, current operation, addresses and listed capacities have not been independently confirmed.
              Verify details with the department before visiting.
              {sourceUrl && (
                <>
                  {' '}
                  <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="font-semibold underline">
                    View the source charter
                  </a>
                </>
              )}
            </Alert>
          )}
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
            <h2 className="text-xl font-semibold text-neutral-900">Storage in {district}</h2>
            <p className="text-sm text-neutral-500">
              {facilities.length} {facilities.length === 1 ? 'record' : 'records'}
            </p>
          </div>
          {facilities.length === 0 ? (
            <Card>
              <EmptyState
                icon={<Warehouse className="w-7 h-7" aria-hidden />}
                title="No storage records for this district"
                description="The supplied dataset contains no facilities for this district. No storage names or contact details have been added without a verified source."
              />
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {facilities.map((facility) => (
                <Card key={facility.id}>
                  <h3 className="text-lg font-semibold text-neutral-900">{facility.name}</h3>
                  {facility.unverifiedLead && (
                    <p className="mt-2 inline-flex rounded-full bg-accent-50 px-3 py-1 text-xs font-medium text-accent-800">
                      Unverified lead
                    </p>
                  )}
                  {facility.type && (
                    <p className="mt-2 inline-flex rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700">
                      {facility.type}
                    </p>
                  )}
                  <div className="mt-4 space-y-3 text-sm text-neutral-700">
                    <p className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 mt-0.5 text-primary-600 shrink-0" aria-hidden />
                      <span>
                        {facility.address ?? (facility.unverifiedLead
                          ? 'Address not confirmed in source'
                          : 'Address not listed in source')}
                      </span>
                    </p>
                    <p className="flex items-start gap-2">
                      <Package className="w-4 h-4 mt-0.5 text-primary-600 shrink-0" aria-hidden />
                      <span>
                        {facility.unverifiedLead ? 'Listed capacity:' : 'Capacity:'}{' '}
                        {facility.capacityMt === null
                          ? 'Not listed in source'
                          : `${capacityFormatter.format(facility.capacityMt)} MT`}
                      </span>
                    </p>
                    {facility.verificationNote && (
                      <p className="text-xs text-accent-800">{facility.verificationNote}</p>
                    )}
                    {facility.sourceName && (
                      <p className="text-xs text-neutral-500">
                        {facility.sourceName}
                        {facility.sourceUploadYear ? ` (uploaded ${facility.sourceUploadYear})` : ''}
                      </p>
                    )}
                    {(facility.managerName || facility.contactNumber) && (
                      <div className="border-t border-neutral-100 pt-3 space-y-2">
                        {facility.managerName && (
                          <p className="flex items-start gap-2">
                            <UserRound className="w-4 h-4 mt-0.5 text-neutral-500 shrink-0" aria-hidden />
                            <span>Manager: {facility.managerName}</span>
                          </p>
                        )}
                        {facility.contactNumber && (
                          <p className="flex items-start gap-2">
                            <Phone className="w-4 h-4 mt-0.5 text-neutral-500 shrink-0" aria-hidden />
                            <span>Contact: {facility.contactNumber}</span>
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      ) : !error ? (
        <Card>
          <EmptyState
            icon={<MapPin className="w-7 h-7" aria-hidden />}
            title="Select a district"
            description="Available storage records for the selected district will appear here."
          />
        </Card>
      ) : null}
    </div>
  );
}
