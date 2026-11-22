'use client';

import { useEffect, useState } from 'react';

export function useFarmOfflineShell(online: boolean) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !online || !('serviceWorker' in navigator) ||
        window.location.pathname !== '/farmer/farms') return;
    let cancelled = false;
    const channel = new MessageChannel();
    channel.port1.onmessage = event => { if (!cancelled) setReady(event.data.ready === true); };
    void (async () => {
      const registration = await navigator.serviceWorker.register('/farm-offline.js', { scope: '/farmer/farms' });
      const worker = registration.active ?? registration.installing ?? registration.waiting;
      if (!worker) return;
      if (worker.state !== 'activated') {
        await new Promise<void>((resolve, reject) => {
          const stateChanged = () => {
            if (worker.state === 'activated' || worker.state === 'redundant') {
              worker.removeEventListener('statechange', stateChanged);
              if (worker.state === 'activated') resolve();
              else reject(new Error('Offline worker did not activate.'));
            }
          };
          worker.addEventListener('statechange', stateChanged);
          stateChanged();
        });
      }
      await import('./FarmMap');
      if (cancelled) return;
      const assets = performance.getEntriesByType('resource').map(resource => resource.name);
      worker.postMessage({ type: 'CACHE_FARM_SHELL', assets }, [channel.port2]);
    })().catch(() => undefined);
    return () => {
      cancelled = true;
      channel.port1.close();
    };
  }, [online]);
  return ready;
}
