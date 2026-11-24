'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card, EmptyState } from '@/components/ui/Card';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { useAuth } from '@/features/auth/AuthContext';
import { JOB_CATEGORY_LABELS, type JobCategory } from '@/models/job';
import { GOA_SERVICE_DISTRICTS, SERVICE_CHARGE_UNITS, type ServiceListing } from '@/models/serviceListing';
import { serviceListingService } from '@/services/serviceListingService';
import { getFirebaseLoadErrorMessage, getFirebaseOperationErrorMessage } from '@/utils/firebaseErrors';

const chargeUnitValues = ['per_hour', 'per_day', 'per_job', 'negotiable'] as const;
const schema = z.object({
  district: z.enum(['North Goa', 'South Goa']),
  taluka: z.string().trim().min(2, 'Enter your taluka.').max(80),
  village: z.string().trim().max(80).optional(),
  experienceYears: z.number({ error: 'Enter your years of experience.' }).int('Enter a whole number.').min(0).max(80),
  skills: z.string().trim().min(3, 'Add at least one skill.').max(500)
    .refine((value) => parseList(value).length > 0, 'Add at least one skill.'),
  equipment: z.string().trim().max(500).optional(),
  availability: z.string().trim().min(3, 'Describe when you are available.').max(300),
  description: z.string().trim().min(20, 'Add at least 20 characters about your service.').max(1000),
  chargeAmount: z.preprocess(
    (value) => value === '' || value === undefined ? undefined : Number(value),
    z.number({ error: 'Enter a valid charge.' }).min(1, 'Enter at least ₹1.').max(10000000)
      .multipleOf(0.01, 'Use up to two decimal places.').optional()
  ),
  chargeUnit: z.enum(chargeUnitValues),
  serviceCategories: z.array(z.string()).min(1, 'Select at least one service.'),
});

type FormValues = z.input<typeof schema>;
type ValidFormValues = z.output<typeof schema>;

const categoryOptions = Object.entries(JOB_CATEGORY_LABELS) as [JobCategory, string][];
const districtOptions = GOA_SERVICE_DISTRICTS.map((district) => ({ value: district, label: district }));
const chargeOptions = Object.entries(SERVICE_CHARGE_UNITS).map(([value, label]) => ({ value, label }));

function isJobCategory(value: string): value is JobCategory {
  return Object.prototype.hasOwnProperty.call(JOB_CATEGORY_LABELS, value);
}

function parseList(value: string): string[] {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function statusLabel(status: ServiceListing['verificationStatus']): string {
  return status === 'approved' ? 'Approved' : status === 'pending' ? 'Pending admin review' :
    status === 'rejected' ? 'Not approved' : 'Needs re-verification';
}

export default function WorkerServicesPage() {
  const { userProfile } = useAuth();
  return userProfile ? <WorkerListings key={userProfile.uid} /> : null;
}

function WorkerListings() {
  const { userProfile } = useAuth();
  const providerId = userProfile?.uid;
  const [listings, setListings] = useState<ServiceListing[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [listingsVersion, setListingsVersion] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string>();
  const [success, setSuccess] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting, submitCount } } = useForm<FormValues, unknown, ValidFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      district: 'North Goa',
      experienceYears: 0,
      chargeUnit: 'negotiable',
      serviceCategories: [],
    },
  });

  useEffect(() => {
    if (!providerId) return;
    let cancelled = false;
    serviceListingService.getByProvider(providerId)
      .then((result) => {
        if (cancelled) return;
        setListings(result);
        setLoadError(null);
      })
      .catch((loadError: unknown) => {
        if (!cancelled) setLoadError(getFirebaseLoadErrorMessage(loadError, 'Your service listings'));
      })
      .finally(() => {
        if (!cancelled) setLoadingListings(false);
      });
    return () => { cancelled = true; };
  }, [providerId, listingsVersion]);

  const onSubmit = async (data: ValidFormValues) => {
    if (!userProfile) {
      setSubmitError('Your account profile is not ready. Refresh the page and try again.');
      return;
    }
    const categories = data.serviceCategories.filter(isJobCategory);
    if (categories.length !== data.serviceCategories.length) {
      setSubmitError('One or more selected services are invalid. Please choose from the list.');
      return;
    }
    setSubmitError(null);
    setSuccess(null);
    try {
      const fields = {
        providerName: userProfile.name,
        serviceCategories: categories,
        description: data.description,
        skills: parseList(data.skills),
        equipment: parseList(data.equipment ?? ''),
        experienceYears: data.experienceYears,
        district: data.district,
        taluka: data.taluka,
        ...(data.village ? { village: data.village } : {}),
        availability: data.availability,
        ...(data.chargeAmount !== undefined ? { chargeAmount: data.chargeAmount } : {}),
        chargeUnit: data.chargeUnit,
      };
      if (editing) {
        await serviceListingService.updateOwn(editing, fields);
      } else {
        await serviceListingService.create({ ...fields, providerId: userProfile.uid });
      }
      setEditing(undefined);
      reset({
        district: data.district,
        experienceYears: 0,
        chargeUnit: 'negotiable',
        serviceCategories: [],
      });
      setSuccess('Your listing was submitted for admin review. It will not appear in public search until approved.');
      setListingsVersion((version) => version + 1);
    } catch (saveError: unknown) {
      setSubmitError(getFirebaseOperationErrorMessage(saveError, 'Submitting your service listing'));
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold font-heading text-neutral-900">Offer Harvesting Services</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Register your skills and service area in North Goa or South Goa. Your listing needs admin approval before it is shown to farmers.
        </p>
      </header>

      <Card>
        <form noValidate onSubmit={handleSubmit(onSubmit, () => {
          setSubmitError(null);
          setSuccess(null);
        })} className="space-y-5">
          <fieldset aria-describedby={errors.serviceCategories ? 'service-categories-error' : undefined}>
            <legend className="mb-2 text-sm font-medium text-neutral-700">Services you offer *</legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {categoryOptions.map(([value, label]) => (
                <label key={value} className="flex items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm">
                  <input type="checkbox" value={value} {...register('serviceCategories')} />
                  <span>{label}</span>
                </label>
              ))}
            </div>
            {errors.serviceCategories?.message && <p id="service-categories-error" className="mt-1 text-sm text-red-600">{errors.serviceCategories.message}</p>}
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="District" required options={districtOptions} error={errors.district?.message} {...register('district')} />
            <Input label="Taluka" required placeholder="Enter your taluka" error={errors.taluka?.message} {...register('taluka')} />
            <Input label="Village (optional)" placeholder="Enter your village" error={errors.village?.message} {...register('village')} />
            <Input label="Years of experience" type="number" min={0} max={80} required error={errors.experienceYears?.message} {...register('experienceYears', { valueAsNumber: true })} />
          </div>

          <Input label="Skills (comma-separated)" required placeholder="e.g. coconut climbing, safe harvesting" error={errors.skills?.message} {...register('skills')} />
          <Input label="Equipment or machinery (optional)" placeholder="e.g. ladder, tractor model" error={errors.equipment?.message} {...register('equipment')} />
          <Input label="Availability" required placeholder="e.g. Weekdays, advance booking required" error={errors.availability?.message} {...register('availability')} />
          <Textarea label="Service description" required rows={4} hint="Describe the work you offer in at least 20 characters." error={errors.description?.message} {...register('description')} />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Indicative charge (optional)" type="number" min={1} step="0.01" hint="This is your stated price, not a platform guarantee." error={errors.chargeAmount?.message} {...register('chargeAmount')} />
            <Select label="Charge basis" required options={chargeOptions} error={errors.chargeUnit?.message} {...register('chargeUnit')} />
          </div>

          {submitCount > 0 && Object.keys(errors).length > 0 && (
            <Alert variant="error">Check the highlighted fields before submitting.</Alert>
          )}
          {submitError && <Alert variant="error">{submitError}</Alert>}
          {success && <Alert variant="success">{success}</Alert>}
          <Button type="submit" isLoading={isSubmitting}>{editing ? 'Save listing changes' : 'Submit service listing'}</Button>
          {editing && <Button type="button" variant="secondary" onClick={() => { setEditing(undefined); reset(); }}>Cancel edit</Button>}
        </form>
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900">My listings</h2>
        {loadError && <Alert variant="error">{loadError}</Alert>}
        {loadingListings ? (
          <div className="h-24 animate-pulse rounded-xl bg-neutral-100" aria-label="Loading service listings" />
        ) : loadError && listings.length === 0 ? null : listings.length === 0 ? (
          <Card><EmptyState title="No service listings yet" description="Your submitted listings will appear here with their review status." /></Card>
        ) : (
          listings.map((listing) => (
            <Card key={listing.listingId}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-neutral-900">
                    {listing.serviceCategories.map((category) => JOB_CATEGORY_LABELS[category]).join(', ')}
                  </h3>
                  <p className="mt-1 text-sm text-neutral-600">{listing.taluka}, {listing.district}</p>
                </div>
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">{statusLabel(listing.verificationStatus)}</span>
              </div>
              <p className="mt-3 text-sm text-neutral-600">{listing.description}</p>
              <Button variant="secondary" onClick={() => {
                setEditing(listing.listingId);
                setSuccess(null);
                setSubmitError(null);
                reset({ ...listing, skills: listing.skills.join(', '), equipment: listing.equipment.join(', '),
                  village: listing.village ?? '', chargeAmount: listing.chargeAmount ?? '' });
                window.scrollTo({ top: 0 });
              }}>Edit listing</Button>
            </Card>
          ))
        )}
      </section>
    </div>
  );
}
