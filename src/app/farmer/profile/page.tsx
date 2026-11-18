'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { useAuth } from '@/features/auth/AuthContext';
import { INDIAN_STATES } from '@/lib/constants';
import { farmerService } from '@/services/farmerService';
import type { Farmer } from '@/models/farmer';

const profileSchema = z.object({
  displayName: z.string().trim().min(2, 'Enter your name'),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
  village: z.string().trim().optional(),
  taluka: z.string().trim().optional(),
  district: z.string().trim().min(1, 'Enter your district'),
  state: z.string().min(1, 'Select your state'),
  farmName: z.string().trim().optional(),
  farmDescription: z.string().trim().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const stateOptions = INDIAN_STATES.map((state) => ({ value: state, label: state }));

export default function FarmerProfilePage() {
  const { userProfile, refreshUserProfile } = useAuth();
  const [profile, setProfile] = useState<Farmer | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: userProfile?.name ?? '',
      phone: userProfile?.phone ?? '',
      state: '',
    },
  });

  useEffect(() => {
    if (!userProfile?.uid) return;
    let active = true;

    farmerService.getByUserId(userProfile.uid)
      .then((result) => {
        if (!active) return;
        setProfile(result);
        setProfileLoaded(true);
        reset({
          displayName: result?.displayName ?? userProfile.name,
          phone: result?.phone ?? userProfile.phone ?? '',
          village: result?.village ?? '',
          taluka: result?.taluka ?? '',
          district: result?.district ?? '',
          state: result?.state ?? '',
          farmName: result?.farmName ?? '',
          farmDescription: result?.farmDescription ?? '',
        });
      })
      .catch(() => {
        if (active) {
          setProfileLoaded(false);
          setError('Could not load your farmer profile. Check your connection and try again.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [loadAttempt, reset, userProfile]);

  const retryProfileLoad = () => {
    setError(null);
    setProfileLoaded(false);
    setLoading(true);
    setLoadAttempt((attempt) => attempt + 1);
  };

  const onSubmit = async (data: ProfileFormData) => {
    if (!userProfile) return;
    setError(null);
    setSaved(false);

    try {
      if (profile) {
        await farmerService.updateProfile(userProfile.uid, data);
      } else {
        await farmerService.createProfile({
          userId: userProfile.uid,
          ...data,
        });
      }

      const updatedProfile = await farmerService.getByUserId(userProfile.uid);
      if (!updatedProfile) {
        throw new Error('Your profile was saved but could not be reloaded. Refresh to check the saved data.');
      }
      setProfile(updatedProfile);
      await refreshUserProfile();
      setSaved(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save your profile. Please try again.');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-heading text-neutral-900">Farmer Profile</h1>
        <p className="text-sm text-neutral-500 mt-1">Keep your contact and farm location details up to date.</p>
      </div>

      {error && <Alert variant="error" onDismiss={() => setError(null)}>{error}</Alert>}
      {saved && <Alert variant="success" onDismiss={() => setSaved(false)}>Profile saved successfully.</Alert>}

      {loading ? (
        <div className="h-72 rounded-xl bg-neutral-100 animate-pulse" aria-label="Loading profile" />
      ) : profileLoaded ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <h2 className="font-semibold text-neutral-800 mb-4">Contact details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Full name" required error={errors.displayName?.message} {...register('displayName')} />
              <Input label="Mobile number" type="tel" required error={errors.phone?.message} {...register('phone')} />
            </div>
          </Card>

          <Card>
            <h2 className="font-semibold text-neutral-800 mb-4">Location and farm</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Village / Ward" {...register('village')} />
                <Input label="Taluka" {...register('taluka')} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="District" required error={errors.district?.message} {...register('district')} />
                <Select
                  label="State"
                  required
                  options={stateOptions}
                  placeholder="Select state"
                  error={errors.state?.message}
                  {...register('state')}
                />
              </div>
              <Input label="Farm name (optional)" {...register('farmName')} />
              <Textarea label="About your farm (optional)" rows={3} {...register('farmDescription')} />
            </div>
          </Card>

          <Button type="submit" isLoading={isSubmitting}>Save profile</Button>
        </form>
      ) : (
        <Card>
          <p className="text-sm text-neutral-600 mb-4">Your profile was not loaded, so editing is disabled to avoid overwriting existing information.</p>
          <Button type="button" variant="secondary" onClick={retryProfileLoad}>Try again</Button>
        </Card>
      )}
    </div>
  );
}
