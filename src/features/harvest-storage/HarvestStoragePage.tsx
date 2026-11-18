'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { MapPin, Search, Warehouse } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card, EmptyState } from '@/components/ui/Card';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { useAuth } from '@/features/auth/AuthContext';
import { JOB_CATEGORY_LABELS, type JobCategory } from '@/models/job';
import type { ServiceListing } from '@/models/serviceListing';
import { GOA_SERVICE_DISTRICTS, SERVICE_CHARGE_UNITS } from '@/models/serviceListing';
import type { StorageFacility } from '@/models/storageFacility';
import { serviceListingService } from '@/services/serviceListingService';
import { storageFacilityService } from '@/services/storageFacilityService';
import { ROUTES } from '@/lib/constants';
import type { GoaMapPoint } from './GoaMap';
import { getFirebaseLoadErrorMessage } from '@/utils/firebaseErrors';

const GoaMap = dynamic(
  () => import('./GoaMap').then((module) => module.GoaMap),
  { ssr: false, loading: () => <div className="h-[420px] animate-pulse rounded-xl bg-neutral-100" /> }
);

const categoryOptions = Object.entries(JOB_CATEGORY_LABELS).map(([value, label]) => ({ value, label }));
const serviceDistrictOptions = [{ value: '', label: 'All Goa' }, ...GOA_SERVICE_DISTRICTS.map((value) => ({ value, label: value }))];
const baseStorageTypeOptions = [
  'Cold storage', 'Frozen storage', 'Chilled storage', 'Mushroom storage',
  'Fruit storage', 'Vegetable storage', 'Dairy storage', 'Dry warehouse',
  'Agricultural godown', 'Packhouse', 'Ripening chamber',
];

type ModuleTab = 'harvesting' | 'storage' | 'market-yards' | 'post-harvest';

function textOrUnavailable(value: string | number | undefined): string {
  return value === undefined || value === '' ? 'Not available' : String(value);
}

function facilityMapQuery(facility: StorageFacility): string {
  return [facility.address, facility.village, facility.taluka, facility.district]
    .filter(Boolean)
    .join(', ');
}

export default function HarvestStoragePage() {
  const [tab, setTab] = useState<ModuleTab>('harvesting');
  const [providers, setProviders] = useState<ServiceListing[]>([]);
  const [facilities, setFacilities] = useState<StorageFacility[]>([]);
  const [providerLoading, setProviderLoading] = useState(true);
  const [facilityLoading, setFacilityLoading] = useState(true);
  const [providerError, setProviderError] = useState<string | null>(null);
  const [facilityError, setFacilityError] = useState<string | null>(null);
  const [facilityWarning, setFacilityWarning] = useState<string | null>(null);
  const [providerDistrict, setProviderDistrict] = useState('');
  const [storageDistrict, setStorageDistrict] = useState('');
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [storageType, setStorageType] = useState('');
  const [commodity, setCommodity] = useState('');
  const [minimumCapacity, setMinimumCapacity] = useState('');
  const [maximumPrice, setMaximumPrice] = useState('');
  const [bookingFilter, setBookingFilter] = useState('');
  const [view, setView] = useState<'list' | 'map'>('list');

  useEffect(() => {
    serviceListingService.getApproved()
      .then(setProviders)
      .catch((loadError: unknown) => setProviderError(getFirebaseLoadErrorMessage(loadError, 'Harvest providers')))
      .finally(() => setProviderLoading(false));

    storageFacilityService.getPublicDirectory()
      .then((directory) => {
        setFacilities(directory.facilities);
        setFacilityWarning(directory.warning ?? null);
      })
      .catch((loadError: unknown) => setFacilityError(getFirebaseLoadErrorMessage(loadError, 'Storage listings')))
      .finally(() => setFacilityLoading(false));
  }, []);

  const storageDistrictOptions = useMemo(() => [
    { value: '', label: 'Select district' },
    ...Array.from(new Set(facilities.map((facility) => facility.district)))
      .sort((left, right) => left.localeCompare(right, 'en', { sensitivity: 'base' }))
      .map((value) => ({ value, label: value })),
  ], [facilities]);

  const storageTypeOptions = useMemo(() => [
    ...new Set([
      ...baseStorageTypeOptions,
      ...facilities.flatMap((facility) => facility.storageType ? [facility.storageType] : []),
    ]),
  ].sort((left, right) => left.localeCompare(right, 'en', { sensitivity: 'base' }))
    .map((value) => ({ value, label: value })), [facilities]);

  const filteredProviders = useMemo(() => providers.filter((provider) => {
    const matchesDistrict = !providerDistrict || provider.district === providerDistrict;
    const matchesCategory = !category || provider.serviceCategories.includes(category as JobCategory);
    const term = search.trim().toLowerCase();
    const matchesSearch = !term || [
      provider.providerName, provider.description, provider.taluka, provider.village,
      ...provider.skills, ...provider.equipment,
    ].some((value) => value?.toLowerCase().includes(term));
    return matchesDistrict && matchesCategory && matchesSearch;
  }), [providers, providerDistrict, category, search]);

  const filteredFacilities = useMemo(() => facilities.filter((facility) => {
    if (!storageDistrict) return false;
    if (facility.facilityKind === 'market_warehouse' && storageType) return false;
    const matchesDistrict = facility.district === storageDistrict;
    const matchesType = !storageType || facility.storageType === storageType;
    const matchesCommodity = !commodity || facility.commodities?.some((item) =>
      item.toLowerCase().includes(commodity.trim().toLowerCase())
    );
    const matchesCapacity = !minimumCapacity ||
      (facility.availableCapacityMt !== undefined && facility.availableCapacityMt >= Number(minimumCapacity));
    const matchesPrice = !maximumPrice ||
      (facility.price !== undefined && facility.price <= Number(maximumPrice));
    const availability = facility.bookingAvailability ?? 'not_verified';
    const matchesBooking = !bookingFilter || availability === bookingFilter;
    const term = search.trim().toLowerCase();
    const matchesSearch = !term || [facility.name, facility.address, facility.village, facility.taluka]
      .some((value) => value?.toLowerCase().includes(term));
    return matchesDistrict && matchesType && matchesCommodity && matchesCapacity &&
      matchesPrice && matchesBooking && matchesSearch;
  }), [facilities, storageDistrict, storageType, commodity, minimumCapacity, maximumPrice, bookingFilter, search]);

  const providerPoints = filteredProviders.flatMap((provider): GoaMapPoint[] => {
    if (provider.latitude === undefined || provider.longitude === undefined || !provider.coordinatesVerifiedAt) return [];
    return [{
      id: provider.listingId,
      name: provider.providerName,
      summary: `${provider.serviceCategories.map((item) => JOB_CATEGORY_LABELS[item]).join(', ')} · ${provider.taluka}, ${provider.district}`,
      latitude: provider.latitude,
      longitude: provider.longitude,
      directionsQuery: [provider.village, provider.taluka, provider.district, 'Goa'].filter(Boolean).join(', '),
    }];
  });

  const facilityPoints = filteredFacilities.flatMap((facility): GoaMapPoint[] => {
    if (facility.verificationStatus !== 'approved' ||
      facility.latitude === undefined || facility.longitude === undefined || !facility.coordinatesVerifiedAt) return [];
    return [{
      id: facility.facilityId,
      name: facility.name,
      summary: `${facility.storageType ?? 'Storage type not verified'} · ${facility.district}`,
      latitude: facility.latitude,
      longitude: facility.longitude,
      directionsQuery: facilityMapQuery(facility),
    }];
  });

  const tabs: { id: ModuleTab; label: string }[] = [
    { id: 'harvesting', label: 'Harvesting Services' },
    { id: 'storage', label: 'Cold Storage Finder' },
    { id: 'market-yards', label: 'Government Market Yards' },
    { id: 'post-harvest', label: 'Post-Harvest Management' },
  ];

  return (
    <div className="container-page section-padding space-y-6">
      <header className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary-700">Harvesting services · Goa pilot</p>
        <h1 className="mt-2 text-3xl font-bold font-heading text-neutral-900">Find help after the harvest</h1>
        <p className="mt-2 text-neutral-600">
          Discover Goa service providers, browse storage records by source district, and learn general post-harvest handling.
          Unverified information is clearly marked and is not a booking guarantee.
        </p>
      </header>

      <div role="tablist" aria-label="Harvest and storage sections" className="flex flex-wrap gap-2 border-b border-neutral-200">
        {tabs.map((item) => (
          <button
            key={item.id}
            id={`tab-${item.id}`}
            role="tab"
            aria-selected={tab === item.id}
            aria-controls={`panel-${item.id}`}
            onClick={() => { setTab(item.id); setView('list'); }}
            className={`rounded-t-lg px-4 py-3 text-sm font-medium ${tab === item.id ? 'border-b-2 border-primary-700 text-primary-800' : 'text-neutral-600 hover:bg-neutral-50'}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'harvesting' && (
        <section id="panel-harvesting" role="tabpanel" aria-labelledby="tab-harvesting" className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-neutral-900">Harvesting and farm services</h2>
              <p className="mt-1 text-sm text-neutral-600">No sample providers are listed. Workers can submit a real listing for review.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={ROUTES.FARMER_HARVEST_REQUEST_NEW}><Button>Post a request</Button></Link>
              <Link href={ROUTES.WORKER_SERVICE_PROFILE}><Button variant="secondary">Register as a provider</Button></Link>
            </div>
          </div>
          <Alert variant="info" title="Confirm current hire charges">
            No official July 2026 custom-hiring rate notice was verified for this directory. Provider charges are self-reported, not government rates; confirm the current terms before booking.
          </Alert>
          {providerError && <Alert variant="error">{providerError}</Alert>}
          <FinderFilters
            search={search}
            onSearch={setSearch}
            district={providerDistrict}
            onDistrict={setProviderDistrict}
            districtOptions={serviceDistrictOptions}
            category={category}
            onCategory={setCategory}
            categoryOptions={categoryOptions}
            view={view}
            onView={setView}
          />
          {providerLoading ? (
            <LoadingRows label="Loading providers" />
          ) : filteredProviders.length === 0 ? (
            <Card>
              <EmptyState
                title="No approved providers in this area yet"
                description="Providers may register their own service details. Farmers can still post a request for workers to apply."
                action={<Link href={ROUTES.FARMER_HARVEST_REQUEST_NEW}><Button>Post a harvest request</Button></Link>}
              />
            </Card>
          ) : view === 'map' ? (
            <MapPanel points={providerPoints} />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredProviders.map((provider) => (
                <Card key={provider.listingId}>
                  <h3 className="font-semibold text-neutral-900">{provider.providerName}</h3>
                  <p className="mt-1 text-sm text-neutral-600">{provider.taluka}, {provider.district}</p>
                  <p className="mt-3 text-sm text-neutral-700">{provider.description}</p>
                  <p className="mt-3 text-sm"><strong>Services:</strong> {provider.serviceCategories.map((item) => JOB_CATEGORY_LABELS[item]).join(', ')}</p>
                  <p className="mt-1 text-sm"><strong>Skills:</strong> {provider.skills.join(', ') || 'Not available'}</p>
                  <p className="mt-1 text-sm"><strong>Equipment:</strong> {provider.equipment.join(', ') || 'Not available'}</p>
                  <p className="mt-1 text-sm"><strong>Availability:</strong> {provider.availability}</p>
                  <p className="mt-1 text-sm"><strong>Indicative charges:</strong> {provider.chargeAmount === undefined ? 'Not available' : `₹${provider.chargeAmount.toLocaleString('en-IN')}`} {SERVICE_CHARGE_UNITS[provider.chargeUnit]}</p>
                  {provider.latitude !== undefined && provider.longitude !== undefined && provider.coordinatesVerifiedAt && (
                    <a className="mt-3 inline-block text-sm font-medium text-primary-700 underline" target="_blank" rel="noopener noreferrer"
                      href={`https://www.openstreetmap.org/search?query=${encodeURIComponent([provider.village, provider.taluka, provider.district, 'Goa'].filter(Boolean).join(', '))}`}>
                      Directions
                    </a>
                  )}
                </Card>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === 'storage' && (
        <section id="panel-storage" role="tabpanel" aria-labelledby="tab-storage" className="space-y-5">
          <div>
            <h2 className="text-xl font-semibold text-neutral-900">Cold storage and agricultural storage leads</h2>
            <p className="mt-1 text-sm text-neutral-600">
              Browse the supplied district-based storage dataset and separate Goa leads. The source dataset has no state field;
              all facilities remain unverified, and listed capacity is not available space.
            </p>
          </div>
          {facilityError && <Alert variant="error">{facilityError}</Alert>}
          {facilityWarning && <Alert variant="warning" title="Showing bundled source records">{facilityWarning}</Alert>}
          <Alert variant="warning" title="Confirm details before making plans">
            Listings may not be operating or accepting farm produce. Commodity acceptance, available capacity, rates, temperature,
            booking and contact details are shown only when supplied; treat them as unverified until confirmed directly. An enquiry is not a reservation.
          </Alert>
          <StorageFilters
            district={storageDistrict}
            onDistrict={setStorageDistrict}
            districtOptions={storageDistrictOptions}
            storageTypeOptions={storageTypeOptions}
            search={search}
            onSearch={setSearch}
            storageType={storageType}
            onStorageType={setStorageType}
            commodity={commodity}
            onCommodity={setCommodity}
            minimumCapacity={minimumCapacity}
            onMinimumCapacity={setMinimumCapacity}
            maximumPrice={maximumPrice}
            onMaximumPrice={setMaximumPrice}
            bookingFilter={bookingFilter}
            onBookingFilter={setBookingFilter}
            view={view}
            onView={setView}
          />
          {facilityLoading ? (
            <LoadingRows label="Loading storage records" />
          ) : !storageDistrict ? (
            <Card>
              <EmptyState
                icon={<Warehouse className="h-7 w-7" />}
                title="Select a district"
                description={`Choose from ${storageDistrictOptions.length - 1} districts to view the source records.`}
              />
            </Card>
          ) : filteredFacilities.length === 0 ? (
            <Card><EmptyState icon={<Warehouse className="h-7 w-7" />} title="No records match these filters" description="Clear filters or change the district. Unknown availability and prices are not treated as confirmed matches." /></Card>
          ) : view === 'map' ? (
            <MapPanel points={facilityPoints} />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredFacilities.map((facility) => (
                <StorageFacilityCard key={facility.facilityId} facility={facility} />
              ))}
            </div>
          )}
        </section>
      )}

      {tab === 'market-yards' && <GovernmentMarketYards />}

      {tab === 'post-harvest' && <PostHarvestGuidance />}
    </div>
  );
}

function FinderFilters({
  search, onSearch, district, onDistrict, districtOptions, category, onCategory, categoryOptions, view, onView,
}: {
  search: string;
  onSearch: (value: string) => void;
  district: string;
  onDistrict: (value: string) => void;
  districtOptions: { value: string; label: string }[];
  category: string;
  onCategory: (value: string) => void;
  categoryOptions: { value: string; label: string }[];
  view: 'list' | 'map';
  onView: (value: 'list' | 'map') => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_180px_220px_auto]">
      <Input aria-label="Search services" placeholder="Search providers, skills or equipment" leftIcon={<Search className="h-4 w-4" />} value={search} onChange={(event) => onSearch(event.target.value)} />
      <Select aria-label="District" options={districtOptions} value={district} onChange={(event) => onDistrict(event.target.value)} />
      <Select aria-label="Service category" options={[{ value: '', label: 'All service categories' }, ...categoryOptions]} value={category} onChange={(event) => onCategory(event.target.value)} />
      <ViewToggle view={view} onView={onView} />
    </div>
  );
}

function StorageFilters({
  district, onDistrict, districtOptions, storageTypeOptions, search, onSearch, storageType, onStorageType,
  commodity, onCommodity, minimumCapacity, onMinimumCapacity, maximumPrice,
  onMaximumPrice, bookingFilter, onBookingFilter, view, onView,
}: {
  district: string;
  onDistrict: (value: string) => void;
  districtOptions: { value: string; label: string }[];
  storageTypeOptions: { value: string; label: string }[];
  search: string;
  onSearch: (value: string) => void;
  storageType: string;
  onStorageType: (value: string) => void;
  commodity: string;
  onCommodity: (value: string) => void;
  minimumCapacity: string;
  onMinimumCapacity: (value: string) => void;
  maximumPrice: string;
  onMaximumPrice: (value: string) => void;
  bookingFilter: string;
  onBookingFilter: (value: string) => void;
  view: 'list' | 'map';
  onView: (value: 'list' | 'map') => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Input aria-label="Search storage" placeholder="Search name or location" leftIcon={<Search className="h-4 w-4" />} value={search} onChange={(event) => onSearch(event.target.value)} />
      <Select aria-label="District" options={districtOptions} value={district} onChange={(event) => onDistrict(event.target.value)} />
      <Select aria-label="Storage type" options={[{ value: '', label: 'All types' }, ...storageTypeOptions]} value={storageType} onChange={(event) => onStorageType(event.target.value)} />
      <Input aria-label="Accepted commodity" placeholder="Commodity accepted" value={commodity} onChange={(event) => onCommodity(event.target.value)} />
      <Input aria-label="Minimum available capacity" type="number" min={0} placeholder="Minimum available MT" value={minimumCapacity} onChange={(event) => onMinimumCapacity(event.target.value)} />
      <Input aria-label="Maximum price" type="number" min={0} placeholder="Maximum price" value={maximumPrice} onChange={(event) => onMaximumPrice(event.target.value)} />
      <Select aria-label="Booking availability" options={[
        { value: '', label: 'Any booking status' },
        { value: 'available', label: 'Available' },
        { value: 'unavailable', label: 'Unavailable' },
        { value: 'not_verified', label: 'Not verified' },
      ]} value={bookingFilter} onChange={(event) => onBookingFilter(event.target.value)} />
      <ViewToggle view={view} onView={onView} />
    </div>
  );
}

function ViewToggle({ view, onView }: { view: 'list' | 'map'; onView: (value: 'list' | 'map') => void }) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-neutral-200 p-1">
      <button type="button" onClick={() => onView('list')} aria-pressed={view === 'list'} className={`rounded-md px-3 py-2 text-sm ${view === 'list' ? 'bg-primary-50 text-primary-800' : 'text-neutral-600'}`}>List</button>
      <button type="button" onClick={() => onView('map')} aria-pressed={view === 'map'} className={`rounded-md px-3 py-2 text-sm ${view === 'map' ? 'bg-primary-50 text-primary-800' : 'text-neutral-600'}`}>Map</button>
    </div>
  );
}

function MapPanel({ points }: { points: GoaMapPoint[] }) {
  return (
    <div className="space-y-3">
      {points.length === 0 && (
        <Alert variant="info">
          No verified coordinates are available for the current results, so no facility/provider pins are shown. Admins must verify a location before it appears on the map.
        </Alert>
      )}
      <GoaMap points={points} />
    </div>
  );
}

function StorageFacilityCard({ facility }: { facility: StorageFacility }) {
  const { userProfile } = useAuth();
  const [showEnquiry, setShowEnquiry] = useState(false);
  const [enquiryStatus, setEnquiryStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onEnquire = async (formData: FormData) => {
    if (userProfile?.role !== 'farmer') {
      setError('Sign in with a farmer account to send an enquiry.');
      return;
    }
    const commodityValue = String(formData.get('commodity') ?? '').trim();
    const quantity = Number(formData.get('quantity'));
    const quantityUnit = String(formData.get('quantityUnit') ?? '').trim();
    const preferredStartDate = String(formData.get('preferredStartDate') ?? '');
    const durationValue = String(formData.get('durationDays') ?? '');
    const message = String(formData.get('message') ?? '').trim();
    if (commodityValue.length < 2 || !Number.isFinite(quantity) || quantity <= 0 ||
      !quantityUnit || !preferredStartDate || message.length < 10) {
      setError('Enter the commodity, a positive quantity, preferred date and at least 10 characters of details.');
      return;
    }
    const durationDays = durationValue ? Number(durationValue) : undefined;
    if (durationDays !== undefined && (!Number.isInteger(durationDays) || durationDays < 1 || durationDays > 3650)) {
      setError('Storage duration must be from 1 to 3650 days.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await storageFacilityService.submitEnquiry({
        facilityId: facility.facilityId,
        facilityName: facility.name,
        farmerId: userProfile.uid,
        farmerName: userProfile.name,
        commodity: commodityValue,
        quantity,
        quantityUnit,
        preferredStartDate,
        ...(durationDays !== undefined ? { durationDays } : {}),
        message,
      });
      setEnquiryStatus('Your enquiry was sent to KrishiBandhu for follow-up. It is not a booking or a confirmation of facility availability.');
      setShowEnquiry(false);
    } catch {
      setError('The enquiry was not submitted. Check your connection and Firebase permissions, then try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const location = [facility.village, facility.taluka, facility.district].filter(Boolean).join(', ');
  const directionsQuery = facilityMapQuery(facility);

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-neutral-900">{facility.name}</h3>
          <p className="mt-1 text-sm text-neutral-600">{location || facility.address || 'Location not available'}</p>
        </div>
        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-900">
          {facility.verificationStatus === 'approved' ? 'Verified listing' : 'Pending verification'}
        </span>
      </div>
      {facility.facilityKind === 'market_warehouse' && (
        <p className="mt-3 rounded-lg bg-blue-50 p-3 text-sm text-blue-900">Market/warehouse lead; not classified as a cold-storage facility.</p>
      )}
      <dl className="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        <InfoRow label="Storage type" value={textOrUnavailable(facility.storageType)} />
        <InfoRow label="Accepted commodities" value={facility.commodities?.join(', ') || 'Not verified'} />
        <InfoRow label="Listed/total capacity" value={facility.listedCapacityMt === undefined ? 'Not available' : `${facility.listedCapacityMt.toLocaleString('en-IN')} MT (unverified)`} />
        <InfoRow label="Available capacity" value={facility.availableCapacityMt === undefined ? 'Not verified' : `${facility.availableCapacityMt.toLocaleString('en-IN')} MT`} />
        <InfoRow label="Temperature range" value={textOrUnavailable(facility.temperatureRange)} />
        <InfoRow label="Humidity" value={textOrUnavailable(facility.humidityInformation)} />
        <InfoRow label="Price" value={facility.price === undefined ? 'Not available' : `₹${facility.price.toLocaleString('en-IN')} ${facility.priceUnit ?? ''}`} />
        <InfoRow label="Minimum booking" value={textOrUnavailable(facility.minimumBookingQuantity)} />
        <InfoRow label="Minimum duration" value={textOrUnavailable(facility.minimumStorageDuration)} />
        <InfoRow label="Opening hours" value={textOrUnavailable(facility.openingHours)} />
        <InfoRow label="Booking availability" value={facility.bookingAvailability ?? 'Not verified'} />
        <InfoRow label="Verification" value={facility.lastVerifiedAt ? `Verified ${facility.lastVerifiedAt.toDate().toLocaleDateString('en-IN')}` : 'Not verified'} />
      </dl>
      {facility.address && <p className="mt-3 text-sm text-neutral-600"><strong>Address:</strong> {facility.address}</p>}
      {facility.managerName && <p className="mt-2 text-sm text-neutral-600"><strong>Manager (source-provided):</strong> {facility.managerName}</p>}
      {facility.phone && <p className="mt-2 text-sm text-neutral-600"><strong>Contact (source-provided, unverified):</strong> <a className="underline" href={`tel:${facility.phone}`}>{facility.phone}</a></p>}
      {facility.email && <p className="mt-2 text-sm text-neutral-600"><strong>Email:</strong> {facility.email}</p>}
      {facility.website && <p className="mt-2 text-sm text-neutral-600"><a className="underline" href={facility.website} target="_blank" rel="noopener noreferrer">Facility website</a></p>}
      <p className="mt-3 text-xs text-accent-800">{facility.verificationNote}</p>
      <p className="mt-1 text-xs text-neutral-500">Source: {facility.sourceLabel}</p>
      {facility.sourceUrl && <a className="mt-2 inline-block text-sm text-primary-700 underline" href={facility.sourceUrl} target="_blank" rel="noopener noreferrer">View source</a>}
      <div className="mt-4 flex flex-wrap gap-2">
        {facility.latitude !== undefined && facility.longitude !== undefined && facility.coordinatesVerifiedAt ? (
          <a className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700" href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(directionsQuery)}`} target="_blank" rel="noopener noreferrer">
            Directions
          </a>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-neutral-500"><MapPin className="h-3.5 w-3.5" /> Directions not verified</span>
        )}
        {userProfile?.role === 'farmer' ? (
          <Button size="sm" variant="secondary" onClick={() => setShowEnquiry((open) => !open)}>Send enquiry</Button>
        ) : (
          <Link className="self-center text-sm text-primary-700 underline" href={ROUTES.LOGIN}>Sign in as a farmer to enquire</Link>
        )}
      </div>
      {enquiryStatus && <Alert className="mt-3" variant="success">{enquiryStatus}</Alert>}
      {error && <Alert className="mt-3" variant="error" onDismiss={() => setError(null)}>{error}</Alert>}
      {showEnquiry && (
        <form action={onEnquire} className="mt-4 space-y-3 rounded-lg bg-neutral-50 p-4">
          <p className="text-sm font-medium text-neutral-800">Enquiry to KrishiBandhu (not a booking)</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Commodity" name="commodity" required />
            <div className="grid grid-cols-2 gap-2">
              <Input label="Quantity" name="quantity" type="number" min={0.01} step="0.01" required />
              <Input label="Unit" name="quantityUnit" placeholder="kg, MT, crates" required />
            </div>
            <Input label="Preferred start date" name="preferredStartDate" type="date" required />
            <Input label="Duration in days (optional)" name="durationDays" type="number" min={1} max={3650} />
          </div>
          <Textarea label="Details" name="message" rows={3} minLength={10} maxLength={1000} required />
          <Button type="submit" size="sm" isLoading={submitting}>Submit enquiry</Button>
        </form>
      )}
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return <div><dt className="text-xs text-neutral-500">{label}</dt><dd className="font-medium text-neutral-800">{value}</dd></div>;
}

function PostHarvestGuidance() {
  const [commodity, setCommodity] = useState('');
  const guides: Record<string, string[]> = {
    general: [
      'Sort and grade produce gently; separate damaged or diseased items to reduce spoilage risk.',
      'Keep containers clean, dry and suitable for the crop. Avoid overfilling or compressing delicate produce.',
      'Move harvested produce out of direct sun and arrange prompt transport or suitable storage.',
      'Confirm crop-specific temperature, humidity and treatment requirements with an agricultural extension officer or qualified storage operator.',
    ],
    coconut: [
      'Keep harvested nuts clean and dry; separate cracked or visibly damaged nuts.',
      'Use ventilated, stable stacking and protect produce from rain and standing water.',
      'Confirm the intended end use and storage requirements with a local agricultural extension officer.',
    ],
    cashew: [
      'Separate raw nuts from apples and foreign material; avoid prolonged wetting after harvest.',
      'Dry and package only using locally approved crop-specific guidance; keep lots identified and protected from moisture.',
      'Ask a qualified local extension officer or processor about the correct moisture and storage requirements for your product.',
    ],
    mango: [
      'Handle fruit carefully to reduce bruising; sort damaged fruit away from sound fruit.',
      'Use clean, ventilated packaging and avoid direct sun while waiting for transport.',
      'Confirm maturity, ripening and temperature handling with a qualified local advisor or packhouse.',
    ],
    paddy: [
      'Keep harvested grain protected from rain and soil contamination.',
      'Dry and store only to locally recommended moisture standards; use clean, dry bags and pallets.',
      'Check stored grain regularly for moisture, insects and spoilage and seek local extension advice if problems appear.',
    ],
    vegetables: [
      'Sort gently, remove damaged produce and use clean, crop-appropriate packaging.',
      'Shade produce promptly and minimize delays between harvest, cooling and transport.',
      'Do not assume one temperature or humidity setting suits all vegetables; confirm crop-specific advice locally.',
    ],
  };
  const options = [
    { value: 'general', label: 'General handling' },
    { value: 'coconut', label: 'Coconut' },
    { value: 'cashew', label: 'Cashew' },
    { value: 'mango', label: 'Mango' },
    { value: 'paddy', label: 'Paddy' },
    { value: 'vegetables', label: 'Vegetables' },
  ];

  return (
    <section id="panel-post-harvest" role="tabpanel" aria-labelledby="tab-post-harvest" className="max-w-3xl space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-neutral-900">Post-harvest management</h2>
        <p className="mt-1 text-sm text-neutral-600">General educational guidance only; not certified technical advice.</p>
      </div>
      <Select label="Choose a commodity" options={options} value={commodity} onChange={(event) => setCommodity(event.target.value)} />
      {commodity ? (
        <Card>
          <ul className="list-disc space-y-3 pl-5 text-sm text-neutral-700">
            {guides[commodity].map((guide) => <li key={guide}>{guide}</li>)}
          </ul>
          <p className="mt-4 text-xs text-neutral-500">Handling requirements vary by variety, maturity, weather, and intended market. Ask a qualified local agricultural advisor for crop-specific instructions.</p>
        </Card>
      ) : (
        <Card><EmptyState title="Select a commodity" description="Choose a crop to view general sorting, handling and storage reminders." /></Card>
      )}
    </section>
  );
}

function GovernmentMarketYards() {
  const subYards = ['Ponda', 'Sanquelim', 'Mapusa', 'Curchorem', 'Canacona', 'Valpoi', 'Pernem'];

  return (
    <section id="panel-market-yards" role="tabpanel" aria-labelledby="tab-market-yards" className="max-w-4xl space-y-5">
      <header>
        <h2 className="text-xl font-semibold text-neutral-900">Goa Agricultural Produce &amp; Livestock Marketing Board</h2>
        <p className="mt-1 text-sm text-neutral-600">Market-yard names and Board-level facility information from the Government of Goa Economic Survey 2025–26.</p>
      </header>
      <Alert variant="info" title="Verify before visiting">
        The report lists Board-level facilities, but does not assign each amenity to every yard. Contact the relevant yard to confirm current opening, access, fees, storage availability and accepted produce.
      </Alert>
      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">Main market yard</p>
          <h3 className="mt-1 font-semibold text-neutral-900">Margao</h3>
        </Card>
        {subYards.map((yard) => (
          <Card key={yard}>
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Sub-yard</p>
            <h3 className="mt-1 font-semibold text-neutral-900">{yard}</h3>
          </Card>
        ))}
      </div>
      <Card className="space-y-2">
        <h3 className="font-semibold text-neutral-900">Facilities reported by the survey</h3>
        <p className="text-sm text-neutral-700">The Board-level report mentions stalls, godowns, cold storage, ripening chambers, weighing scales, fumigation and grading machines, and E-NAM infrastructure. It also reports free storage up to 21 days; confirm current terms and availability directly.</p>
        <a
          className="inline-block text-sm font-medium text-primary-700 underline"
          href="https://dpse.goa.gov.in/economic-survey-2025-26.pdf"
          target="_blank"
          rel="noopener noreferrer"
        >
          Official source: Goa Economic Survey 2025–26, Chapter 7, printed page 80
        </a>
      </Card>
    </section>
  );
}

function LoadingRows({ label }: { label: string }) {
  return <div className="grid gap-3 md:grid-cols-2" aria-label={label}>{[1, 2].map((row) => <div key={row} className="h-48 animate-pulse rounded-xl bg-neutral-100" />)}</div>;
}
