'use client';

import { useEffect, useMemo, useState } from 'react';
import { MapPin, Sprout, Store } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { Card, EmptyState } from '@/components/ui/Card';
import { Select } from '@/components/ui/Input';
import {
  fetchCsvRecords,
} from '@/features/resource-finder/csv';
import {
  filterMarkets,
  getMarketDistricts,
  getMarketFacets,
  getMarketStates,
  toMarketRecords,
  type MarketRecord,
} from '@/features/resource-finder/marketFinder';

export default function MarketFinderPage() {
  const [records, setRecords] = useState<MarketRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState('');
  const [district, setDistrict] = useState('');
  const [commodityGroup, setCommodityGroup] = useState('');
  const [variety, setVariety] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    fetchCsvRecords('/data/market-finder.csv', controller.signal)
      .then((rows) => setRecords(toMarketRecords(rows)))
      .catch((loadError: unknown) => {
        if (!controller.signal.aborted) {
          setError(loadError instanceof Error ? loadError.message : 'Could not load market data.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, []);

  const states = useMemo(() => getMarketStates(records), [records]);
  const districts = useMemo(
    () => getMarketDistricts(records, state),
    [records, state]
  );
  const facets = useMemo(
    () => getMarketFacets(records, state, district, commodityGroup),
    [records, state, district, commodityGroup]
  );
  const markets = useMemo(
    () => district
      ? filterMarkets(records, { state, district, commodityGroup, variety })
      : [],
    [records, state, district, commodityGroup, variety]
  );

  return (
    <div className="container-page section-padding space-y-8">
      <header className="max-w-3xl">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-11 h-11 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center">
            <Store className="w-5 h-5" aria-hidden />
          </div>
          <p className="text-sm font-semibold uppercase tracking-wide text-primary-700">Market Finder</p>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold font-heading text-neutral-900">Find agricultural markets</h1>
        <p className="mt-2 text-neutral-600">
          Browse markets by state and district, then narrow results by the commodity group or variety
          recorded in the source dataset.
        </p>
      </header>

      {error && <Alert variant="error">{error}</Alert>}

      <Card>
        <h2 className="font-semibold text-neutral-900 mb-4">Choose a location and crop group</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Select
            label="State"
            options={states.map((value) => ({ value, label: value }))}
            placeholder={loading ? 'Loading statesâ€¦' : 'Select state'}
            value={state}
            disabled={loading || Boolean(error)}
            onChange={(event) => {
              setState(event.target.value);
              setDistrict('');
              setCommodityGroup('');
              setVariety('');
            }}
          />
          <Select
            label="District"
            options={districts.map((value) => ({ value, label: value }))}
            placeholder="Select district"
            value={district}
            disabled={!state || Boolean(error)}
            onChange={(event) => {
              setDistrict(event.target.value);
              setCommodityGroup('');
              setVariety('');
            }}
          />
          <Select
            label="Commodity group"
            options={[
              { value: '', label: 'All groups' },
              ...facets.commodityGroups.map((value) => ({ value, label: value })),
            ]}
            value={commodityGroup}
            disabled={!district || Boolean(error)}
            onChange={(event) => {
              setCommodityGroup(event.target.value);
              setVariety('');
            }}
          />
          <Select
            label="Variety"
            options={[
              { value: '', label: 'All varieties' },
              ...facets.varieties.map((value) => ({ value, label: value })),
            ]}
            value={variety}
            disabled={!district || Boolean(error)}
            onChange={(event) => setVariety(event.target.value)}
          />
        </div>
      </Card>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4" aria-label="Loading markets">
          {[1, 2, 3].map((item) => <div key={item} className="h-40 rounded-xl bg-neutral-100 animate-pulse" />)}
        </div>
      ) : district && !error ? (
        <section aria-live="polite">
          <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
            <h2 className="text-xl font-semibold text-neutral-900">
              Markets in {district}, {state}
            </h2>
            <p className="text-sm text-neutral-500">
              {markets.length} {markets.length === 1 ? 'market' : 'markets'}
            </p>
          </div>
          {markets.length === 0 ? (
            <Card>
              <EmptyState
                icon={<Store className="w-7 h-7" aria-hidden />}
                title="No markets match these filters"
                description="Try another commodity group or variety from the source data."
              />
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {markets.map((market) => (
                  <Card key={market.id}>
                    <h3 className="text-lg font-semibold text-neutral-900">{market.marketName}</h3>
                    <p className="mt-2 flex items-center gap-2 text-sm text-neutral-600">
                      <MapPin className="w-4 h-4 text-primary-600 shrink-0" aria-hidden />
                      {market.district}, {market.state}
                    </p>
                    {market.commodityGroups.length > 0 && (
                      <div className="mt-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Commodity group</p>
                        <p className="mt-1 text-sm text-neutral-800">{market.commodityGroups.join(', ')}</p>
                      </div>
                    )}
                    {market.varieties.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 flex items-center gap-1">
                          <Sprout className="w-3.5 h-3.5" aria-hidden />
                          Available varieties
                        </p>
                        <p className="mt-1 text-sm text-neutral-800">{market.varieties.join(', ')}</p>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
              <p className="mt-4 text-xs text-neutral-500">
                Repeated source rows are grouped by market for display; their distinct groups and varieties are retained.
              </p>
            </>
          )}
        </section>
      ) : !error ? (
        <Card>
          <EmptyState
            icon={<MapPin className="w-7 h-7" aria-hidden />}
            title="Select a state and district"
            description="Market information will appear here for the selected location."
          />
        </Card>
      ) : null}
    </div>
  );
}
