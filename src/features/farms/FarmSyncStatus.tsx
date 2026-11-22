'use client';

import { useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { useFarmOfflineShell } from './useFarmOfflineShell';
import { useFarmWorkspace } from './FarmWorkspace';

export function FarmSyncStatus() {
  const { online, syncing, pending, error, retry, discard } = useFarmWorkspace();
  const offlineReady = useFarmOfflineShell(online);
  const [actionError, setActionError] = useState(false);
  const failed = pending.filter(op => op.error);
  const act = (work: () => Promise<void>) => {
    setActionError(false);
    void work().catch(() => setActionError(true));
  };

  return (
    <div className="mx-auto mb-4 max-w-5xl space-y-2">
      <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-700">
        <p role="status">{online ? 'Online' : 'Offline'}
          {online && syncing ? ' · Syncing' : ''}
          {pending.length ? ` · ${pending.length} pending` : ''}
          {failed.length ? ` · ${failed.length} failed` : ''}
          {online && offlineReady ? ' | Offline access ready' : ''}
        </p>
        {online && (error || failed.some(op => op.failure !== 'conflict')) && (
          <Button size="sm" variant="secondary" disabled={syncing} onClick={() => act(retry)}>Retry sync</Button>
        )}
      </div>
      {!online && <p className="text-sm text-neutral-600">Changes are saved on this device. Map tiles may be unavailable.</p>}
      {error && <Alert variant="warning">{error}</Alert>}
      {actionError && <Alert variant="error">Could not update the local sync queue. Please try again.</Alert>}
      {failed.map(op => (
        <Alert key={op.id} variant="warning">
          <p>{op.kind === 'delete' ? 'Plot deletion' : op.details.name}. {op.error}</p>
          {op.failure === 'conflict' && (
            <Button size="sm" variant="secondary" disabled={!online || syncing} onClick={() => {
              if (confirm('Discard your local changes for this plot and reload the server version?')) {
                act(() => discard(op.farmId));
              }
            }}>Use server version</Button>
          )}
        </Alert>
      ))}
    </div>
  );
}
