'use client';

import { useState } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { userService } from '@/services/userService';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';

export default function AccountProfile() {
  const { userProfile, refreshUserProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'saved' | 'error'>();
  if (!userProfile) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold font-heading">Profile</h1>
      <Card>
        <form key={userProfile.uid} className="space-y-4" onSubmit={async event => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const name = String(data.get('name') ?? '').trim();
          if (name.length < 2) { setStatus('error'); return; }
          setSaving(true);
          setStatus(undefined);
          try {
            await userService.update(userProfile.uid, { name, phone: String(data.get('phone') ?? '').trim() });
            await refreshUserProfile();
            setStatus('saved');
          } catch {
            setStatus('error');
          } finally {
            setSaving(false);
          }
        }}>
          {status && <Alert variant={status === 'saved' ? 'success' : 'error'}>
            {status === 'saved' ? 'Profile saved.' : 'Could not save your profile. Check your name and try again.'}
          </Alert>}
          <Input label="Full name" name="name" defaultValue={userProfile.name} minLength={2} maxLength={100} required />
          <Input label="Email address" type="email" value={userProfile.email} readOnly />
          <Input label="Phone number" name="phone" type="tel" maxLength={30} defaultValue={userProfile.phone} />
          {userProfile.district && userProfile.state && (
            <p className="text-sm text-neutral-600">Registered location · {userProfile.district}, {userProfile.state}</p>
          )}
          <Button type="submit" isLoading={saving}>Save profile</Button>
        </form>
      </Card>
    </div>
  );
}
