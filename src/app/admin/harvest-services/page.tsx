'use client';

import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, EmptyState } from '@/components/ui/Card';
import { useAuth } from '@/features/auth/AuthContext';
import type { ServiceListing } from '@/models/serviceListing';
import type { StorageEnquiry } from '@/models/storageEnquiry';
import type { StorageFacility, StorageVerificationStatus } from '@/models/storageFacility';
import { JOB_CATEGORY_LABELS } from '@/models/job';
import { serviceListingService } from '@/services/serviceListingService';
import { storageFacilityService } from '@/services/storageFacilityService';
import { getFirebaseLoadErrorMessage, getFirebaseOperationErrorMessage } from '@/utils/firebaseErrors';

type AdminData = {
  facilities: StorageFacility[];
  services: ServiceListing[];
  enquiries: StorageEnquiry[];
  seeded: boolean;
};

function statusVariant(status: string): 'success' | 'warning' | 'error' | 'neutral' {
  if (status === 'approved' || status === 'reviewed') return 'success';
  if (status === 'rejected' || status === 'closed') return 'error';
  if (status === 'pending' || status === 'submitted') return 'warning';
  return 'neutral';
}

export default function AdminHarvestServicesPage() {
  const { userProfile } = useAuth();
  const [data, setData] = useState<AdminData>({
    facilities: [],
    services: [],
    enquiries: [],
    seeded: false,
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchData = useCallback(async (): Promise<AdminData> => {
    const [directory, services, enquiries] = await Promise.all([
      storageFacilityService.getForAdmin(),
      serviceListingService.getForAdmin(),
      storageFacilityService.getEnquiries(),
    ]);
    return {
        facilities: directory.facilities,
        services,
        enquiries,
        seeded: directory.seeded,
    };
  }, []);

  useEffect(() => {
    let active = true;
    void fetchData()
      .then((result) => {
        if (active) setData(result);
      })
      .catch((loadError: unknown) => {
        if (active) setError(getFirebaseLoadErrorMessage(loadError, 'Harvest and storage review data'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [fetchData]);

  const perform = async (key: string, successMessage: string, action: () => Promise<unknown>) => {
    setBusy(key);
    setError(null);
    setSuccess(null);
    try {
      await action();
      setSuccess(successMessage);
    } catch (operationError: unknown) {
      setError(getFirebaseOperationErrorMessage(operationError, 'The requested change'));
      setBusy(null);
      return;
    }

    try {
      setData(await fetchData());
    } catch (loadError: unknown) {
      setError(`The change was saved, but ${getFirebaseLoadErrorMessage(loadError, 'updated review data').toLowerCase()}`);
    } finally {
      setBusy(null);
    }
  };

  const importLeads = () => {
    if (!userProfile?.uid) {
      setError('Your admin profile is not ready. Refresh and try again.');
      return;
    }
    void perform(
      'import',
      'The provisional facility leads were imported. They remain marked pending verification.',
      () => storageFacilityService.importInitialLeads(userProfile.uid)
    );
  };

  const verifyFacility = (
    facility: StorageFacility,
    sourceLabel: string,
    sourceUrl: string,
    verificationNote: string
  ) => {
    void perform(
      `facility:${facility.facilityId}:approved`,
      'Facility approved with its verification source and note.',
      () => storageFacilityService.updateAdmin(facility.facilityId, {
        verificationStatus: 'approved',
        sourceLabel,
        sourceUrl,
        verificationNote,
      })
    );
  };

  const updateFacilityStatus = (facilityId: string, status: StorageVerificationStatus) => {
    void perform(
      `facility:${facilityId}:${status}`,
      `Facility status updated to ${status}.`,
      () => storageFacilityService.setStatus(facilityId, status)
    );
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-neutral-900">Harvest &amp; Storage Review</h1>
          <p className="mt-1 max-w-3xl text-sm text-neutral-600">
            Review provider submissions, storage leads and farmer enquiries. Approve a facility only after verifying its details with an authoritative source.
          </p>
        </div>
        <Button onClick={importLeads} isLoading={busy === 'import'} disabled={data.seeded}>
          {data.seeded ? 'Provisional leads imported' : 'Import provisional leads'}
        </Button>
      </header>

      {error && <Alert variant="error" onDismiss={() => setError(null)}>{error}</Alert>}
      {success && <Alert variant="success" onDismiss={() => setSuccess(null)}>{success}</Alert>}

      {loading ? (
        <div className="space-y-3" aria-label="Loading harvest review data">{[1, 2, 3].map((item) => <div key={item} className="h-28 animate-pulse rounded-xl bg-neutral-100" />)}</div>
      ) : (
        <>
          <section className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">Storage facility leads</h2>
              <p className="text-sm text-neutral-600">Initial leads are provisional user-provided information and are not confirmed operating facilities.</p>
            </div>
            {data.facilities.length === 0 ? (
              <Card><EmptyState title="No facility records imported" description="Import the provisional lead list to review it in Firestore." /></Card>
            ) : data.facilities.map((facility) => (
              <FacilityReviewCard
                key={facility.facilityId}
                facility={facility}
                busy={busy}
                onVerify={verifyFacility}
                onStatus={updateFacilityStatus}
              />
            ))}
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-neutral-900">Provider listings</h2>
            {data.services.length === 0 ? (
              <Card><EmptyState title="No provider submissions" description="Worker-submitted service listings will appear here for moderation." /></Card>
            ) : data.services.map((service) => (
              <Card key={service.listingId}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-neutral-900">{service.providerName}</h3>
                    <p className="mt-1 text-sm text-neutral-600">
                      {service.serviceCategories.map((category) => JOB_CATEGORY_LABELS[category]).join(', ')}
                    </p>
                    <p className="mt-1 text-xs text-neutral-500">{service.taluka}, {service.district} · {service.experienceYears} years experience</p>
                    <p className="mt-2 text-sm text-neutral-700">{service.description}</p>
                  </div>
                  <Badge variant={statusVariant(service.verificationStatus)}>{service.verificationStatus}</Badge>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => void perform(
                    `service:${service.listingId}:approved`,
                    'Provider listing approved.',
                    () => serviceListingService.review(service.listingId, 'approved')
                  )} isLoading={busy === `service:${service.listingId}:approved`}>Approve</Button>
                  <Button size="sm" variant="secondary" onClick={() => void perform(
                    `service:${service.listingId}:rejected`,
                    'Provider listing rejected.',
                    () => serviceListingService.review(service.listingId, 'rejected')
                  )} isLoading={busy === `service:${service.listingId}:rejected`}>Reject</Button>
                </div>
              </Card>
            ))}
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-neutral-900">Storage enquiries</h2>
            {data.enquiries.length === 0 ? (
              <Card><EmptyState title="No open enquiries" description="Farmer enquiries will appear here for follow-up." /></Card>
            ) : data.enquiries.map((enquiry) => (
              <Card key={enquiry.enquiryId}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-neutral-900">{enquiry.facilityName}</h3>
                    <p className="mt-1 text-sm text-neutral-600">{enquiry.commodity} · {enquiry.quantity} {enquiry.quantityUnit} · requested by {enquiry.farmerName}</p>
                    <p className="mt-2 text-sm text-neutral-700">{enquiry.message}</p>
                    <p className="mt-1 text-xs text-neutral-500">Preferred start date: {enquiry.preferredStartDate}</p>
                  </div>
                  <Badge variant={statusVariant(enquiry.status)}>{enquiry.status}</Badge>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => void perform(
                    `enquiry:${enquiry.enquiryId}:reviewed`,
                    'Enquiry marked reviewed.',
                    () => storageFacilityService.updateEnquiryStatus(enquiry.enquiryId, 'reviewed')
                  )} isLoading={busy === `enquiry:${enquiry.enquiryId}:reviewed`}>Mark reviewed</Button>
                  <Button size="sm" variant="ghost" onClick={() => void perform(
                    `enquiry:${enquiry.enquiryId}:closed`,
                    'Enquiry closed.',
                    () => storageFacilityService.updateEnquiryStatus(enquiry.enquiryId, 'closed')
                  )} isLoading={busy === `enquiry:${enquiry.enquiryId}:closed`}>Close</Button>
                </div>
              </Card>
            ))}
          </section>
        </>
      )}
    </div>
  );
}

function FacilityReviewCard({
  facility,
  busy,
  onVerify,
  onStatus,
}: {
  facility: StorageFacility;
  busy: string | null;
  onVerify: (facility: StorageFacility, sourceLabel: string, sourceUrl: string, verificationNote: string) => void;
  onStatus: (facilityId: string, status: StorageVerificationStatus) => void;
}) {
  const [sourceLabel, setSourceLabel] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [verificationNote, setVerificationNote] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleApprove = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const parsedUrl = new URL(sourceUrl);
      if (!['http:', 'https:'].includes(parsedUrl.protocol) ||
        sourceLabel.trim().length < 3 || verificationNote.trim().length < 15) {
        setValidationError('Add an official source label, a valid HTTPS/HTTP source URL, and a verification note of at least 15 characters.');
        return;
      }
    } catch {
      setValidationError('Enter a valid source URL before approving this facility.');
      return;
    }
    setValidationError(null);
    onVerify(facility, sourceLabel.trim(), sourceUrl.trim(), verificationNote.trim());
  };

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-neutral-900">{facility.name}</h3>
          <p className="mt-1 text-sm text-neutral-600">{facility.address ?? [facility.village, facility.taluka, facility.district].filter(Boolean).join(', ')}</p>
          <p className="mt-2 text-xs text-neutral-500">
            {facility.facilityKind === 'market_warehouse' ? 'Market/warehouse lead' : 'Storage candidate'}
            {' · '}Source: {facility.sourceLabel}
            {' · '}Capacity: {facility.listedCapacityMt === undefined ? 'not provided' : `${facility.listedCapacityMt} MT`}
          </p>
          <p className="mt-1 text-xs text-neutral-500">{facility.verificationNote}</p>
        </div>
        <Badge variant={statusVariant(facility.verificationStatus)}>{facility.verificationStatus}</Badge>
      </div>
      <form onSubmit={handleApprove} className="mt-4 space-y-3">
        <p className="text-sm font-medium text-neutral-800">Approval requires a traceable source and a fresh verification note.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            aria-label="Official source label"
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            placeholder="Official source name"
            value={sourceLabel}
            onChange={(event) => setSourceLabel(event.target.value)}
          />
          <input
            aria-label="Official source URL"
            type="url"
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            placeholder="https://..."
            value={sourceUrl}
            onChange={(event) => setSourceUrl(event.target.value)}
          />
        </div>
        <textarea
          aria-label="Verification note"
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          rows={2}
          placeholder="What was verified, and when?"
          value={verificationNote}
          onChange={(event) => setVerificationNote(event.target.value)}
        />
        {validationError && <p className="text-sm text-red-600" role="alert">{validationError}</p>}
        <div className="flex flex-wrap gap-2">
          <Button size="sm" type="submit" isLoading={busy === `facility:${facility.facilityId}:approved`}>Approve verified record</Button>
          <Button size="sm" type="button" variant="secondary" onClick={() => onStatus(facility.facilityId, 'rejected')} isLoading={busy === `facility:${facility.facilityId}:rejected`}>Reject</Button>
          <Button size="sm" type="button" variant="ghost" onClick={() => onStatus(facility.facilityId, 'outdated')} isLoading={busy === `facility:${facility.facilityId}:outdated`}>Needs re-verification</Button>
        </div>
      </form>
    </Card>
  );
}
