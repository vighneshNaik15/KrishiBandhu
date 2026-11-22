'use client';

import { liveQuery } from 'dexie';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { auth, db } from '@/lib/firebase/config';
import { commitFarmMutation, farmDetails, farmService } from '@/services/farmService';
import { FarmCache, enqueueFarm, readWorkspace, replaceCachedFarms, synchronizeFarms } from './farmCache';

type Snapshot = Awaited<ReturnType<typeof readWorkspace>>;
type Workspace = Snapshot & {
  ready: boolean;
  online: boolean;
  syncing: boolean;
  error: string | null;
  save: (action: Parameters<typeof enqueueFarm>[2]) => Promise<string>;
  retry: () => Promise<void>;
  discard: (farmId: string) => Promise<void>;
};

const FarmContext = createContext<Workspace | null>(null);
const empty = { farms: [], pending: [] };

export function FarmWorkspace({ children }: { children: React.ReactNode }) {
  const { firebaseUser, userProfile, offlineFarmerUid } = useAuth();
  if (!firebaseUser || (firebaseUser.uid !== offlineFarmerUid &&
    (firebaseUser.uid !== userProfile?.uid || !userProfile.isActive))) return null;
  return <FarmerCache key={firebaseUser.uid} uid={firebaseUser.uid}>{children}</FarmerCache>;
}

function FarmerCache({ uid, children }: { uid: string; children: React.ReactNode }) {
  const [cache] = useState(() => new FarmCache(db.app.options.projectId ?? '', uid));
  const [snapshot, setSnapshot] = useState<Snapshot>();
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(false);
  const busy = useRef(false);
  const allowed = useCallback(() => mounted.current && auth.currentUser?.uid === uid, [uid]);

  const run = useCallback(async (refresh: boolean) => {
    if (!allowed() || !navigator.onLine || busy.current) return;
    busy.current = true;
    setSyncing(true);
    const work = async () => {
      if (!allowed() || !navigator.onLine) return;
      await synchronizeFarms(cache, uid, () => allowed() && navigator.onLine, commitFarmMutation);
      if (refresh && allowed() && navigator.onLine) {
        const farms = await farmService.getByFarmer(uid, true);
        if (allowed()) await replaceCachedFarms(cache, uid, farms);
      }
    };
    try {
      if (navigator.locks) await navigator.locks.request(cache.name, work);
      else await work();
      if (allowed()) setError(null);
    } catch {
      if (allowed()) setError('Could not refresh farms. You can still use saved plots.');
    } finally {
      busy.current = false;
      if (allowed()) setSyncing(false);
    }
  }, [allowed, cache, uid]);

  useEffect(() => {
    mounted.current = true;
    const subscription = liveQuery(() => readWorkspace(cache)).subscribe({
      next: data => { if (allowed()) setSnapshot(data); },
      error: () => { if (allowed()) setError('Farm storage is unavailable on this device.'); },
    });
    const connectionChanged = () => {
      setOnline(navigator.onLine);
      if (navigator.onLine) void run(true);
    };
    window.addEventListener('online', connectionChanged);
    window.addEventListener('offline', connectionChanged);
    const timer = window.setInterval(() => {
      void cache.queue.count().then(count => { if (count) void run(false); }).catch(() => undefined);
    }, 3000);
    queueMicrotask(connectionChanged);
    return () => {
      mounted.current = false;
      subscription.unsubscribe();
      window.clearInterval(timer);
      window.removeEventListener('online', connectionChanged);
      window.removeEventListener('offline', connectionChanged);
    };
  }, [allowed, cache, run]);

  const save: Workspace['save'] = async action => {
    if (!allowed()) throw new Error('The farmer session changed.');
    const normalized = action.kind === 'delete' ? action : {
      ...action,
      details: { ...farmDetails(action.details), boundary: action.details.boundary,
        soilType: action.details.soilType, irrigationType: action.details.irrigationType },
    };
    const id = await enqueueFarm(cache, uid, normalized);
    void run(false);
    return id;
  };

  const retry = async () => {
    if (!allowed()) return;
    await cache.queue.toCollection().modify(op => {
      if (op.failure !== 'conflict') {
        delete op.failure;
        delete op.error;
        op.retryAt = 0;
      }
    });
    await run(true);
  };

  const discard = async (farmId: string) => {
    if (!allowed()) return;
    const work = async () => {
      if (!allowed()) return;
      const farms = await farmService.getByFarmer(uid, true);
      if (!allowed()) return;
      await cache.transaction('rw', cache.farms, cache.queue, async () => {
        await replaceCachedFarms(cache, uid, farms);
        await cache.queue.where('farmId').equals(farmId).delete();
      });
    };
    if (navigator.locks) await navigator.locks.request(cache.name, work);
    else await work();
  };

  return <FarmContext.Provider value={{ ...(snapshot ?? empty), ready: Boolean(snapshot),
    online, syncing, error, save, retry, discard }}>{children}</FarmContext.Provider>;
}

export function useFarmWorkspace() {
  const workspace = useContext(FarmContext);
  if (!workspace) throw new Error('Farm workspace is unavailable.');
  return workspace;
}
