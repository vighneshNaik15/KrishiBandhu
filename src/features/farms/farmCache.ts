import Dexie, { type Table } from 'dexie';
import { GeoPoint, Timestamp } from 'firebase/firestore';
import type { Farm } from '@/models/farm';
import { FarmConflict, farmVersion, type FarmDetails, type FarmMutation } from '@/services/farmService';

type Point = Pick<GeoPoint, 'latitude' | 'longitude'>;
type StoredDetails = Omit<FarmDetails, 'boundary' | 'coordinates'> & {
  boundary?: Point[];
  coordinates?: Point;
};
type StoredFarm = Omit<Farm, 'createdAt' | 'updatedAt' | 'boundary' | 'coordinates'> & {
  boundary?: Point[];
  coordinates?: Point;
  createdAt: { seconds: number; nanoseconds: number };
  updatedAt: { seconds: number; nanoseconds: number };
};
type StoredMutation = Exclude<FarmMutation, { kind: 'create' | 'update' }> |
  (Omit<Extract<FarmMutation, { kind: 'create' | 'update' }>, 'details'> & { details: StoredDetails });
type Pending = StoredMutation & { attempt: number; retryAt: number; error?: string; failure?: 'blocked' | 'conflict' };
type QueueRow = Pending & { sequence?: number };

export class FarmCache extends Dexie {
  farms!: Table<StoredFarm, string>;
  queue!: Table<QueueRow, number>;

  constructor(project: string, uid: string) {
    super('krishibandhu-farms:' + JSON.stringify([project, uid]));
    this.version(1).stores({ farms: 'farmId', queue: '++sequence, farmId' });
  }
}

const storePoint = ({ latitude, longitude }: Point): Point => ({ latitude, longitude });
const restorePoint = ({ latitude, longitude }: Point) => new GeoPoint(latitude, longitude);

function storeFarm(farm: Farm): StoredFarm {
  return {
    ...farm,
    coordinates: farm.coordinates && storePoint(farm.coordinates),
    boundary: Array.isArray(farm.boundary) && farm.boundary.every(point => point instanceof GeoPoint)
      ? farm.boundary.map(storePoint) : undefined,
    createdAt: { seconds: farm.createdAt.seconds, nanoseconds: farm.createdAt.nanoseconds },
    updatedAt: { seconds: farm.updatedAt.seconds, nanoseconds: farm.updatedAt.nanoseconds },
  };
}

function restoreDetails(details: StoredDetails): FarmDetails {
  return {
    ...details,
    ...(details.coordinates ? { coordinates: restorePoint(details.coordinates) } : { coordinates: undefined }),
    boundary: details.boundary?.map(restorePoint),
  };
}

function restoreFarm(row: StoredFarm): Farm {
  return {
    ...row,
    createdAt: new Timestamp(row.createdAt.seconds, row.createdAt.nanoseconds),
    updatedAt: new Timestamp(row.updatedAt.seconds, row.updatedAt.nanoseconds),
    coordinates: row.coordinates && restorePoint(row.coordinates),
    boundary: row.boundary?.map(restorePoint),
  };
}

export async function readWorkspace(cache: FarmCache) {
  const [stored, pending] = await cache.transaction('r', cache.farms, cache.queue, () =>
    Promise.all([cache.farms.toArray(), cache.queue.toArray()]));
  const visible = new Map(stored.map(farm => [farm.farmId, restoreFarm(farm)]));
  for (const op of pending) {
    if (op.kind === 'delete') {
      visible.delete(op.farmId);
      continue;
    }
    const current = visible.get(op.farmId);
    const now = Timestamp.now();
    visible.set(op.farmId, {
      ...current,
      ...restoreDetails(op.details),
      coordinates: op.details.coordinates ? restorePoint(op.details.coordinates) : current?.coordinates,
      farmId: op.farmId,
      farmerId: op.uid,
      farmerUserId: op.uid,
      mutationId: op.id,
      images: current?.images ?? [],
      isActive: true,
      createdAt: current?.createdAt ?? now,
      updatedAt: now,
    });
  }
  return {
    farms: [...visible.values()].sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis()),
    pending,
  };
}

export async function enqueueFarm(cache: FarmCache, uid: string, action:
  { kind: 'create'; details: FarmDetails } |
  { kind: 'update'; farm: Farm; details: FarmDetails } |
  { kind: 'delete'; farm: Farm },
) {
  if (action.kind !== 'create' && (action.farm.farmerId !== uid || action.farm.farmerUserId !== uid)) {
    throw new Error('This plot belongs to a different farmer.');
  }
  const farmId = action.kind === 'create' ? crypto.randomUUID() : action.farm.farmId;
  const common = {
    uid, farmId, id: crypto.randomUUID(), attempt: 0, retryAt: 0,
    base: action.kind === 'create' ? null : farmVersion(action.farm),
  };
  await cache.transaction('rw', cache.queue, async () => {
    const previous = await cache.queue.where('farmId').equals(farmId).last();
    if (previous && previous.id !== common.base) {
      throw new FarmConflict('This plot was edited in another tab. Reopen it to see the latest local changes.');
    }
    await cache.queue.add(action.kind === 'delete' ? { ...common, kind: 'delete' } :
      { ...common, kind: action.kind, details: {
        ...action.details,
        coordinates: action.details.coordinates && storePoint(action.details.coordinates),
        boundary: action.details.boundary?.map(storePoint),
      } });
  });
  return farmId;
}

export async function replaceCachedFarms(cache: FarmCache, uid: string, farms: Farm[]) {
  const owned = farms.filter(farm => farm.farmerId === uid && farm.farmerUserId === uid);
  await cache.transaction('rw', cache.farms, async () => {
    await cache.farms.clear();
    await cache.farms.bulkPut(owned.map(storeFarm));
  });
}

export async function synchronizeFarms(cache: FarmCache, uid: string, allowed: () => boolean,
  commit: (op: FarmMutation, allowed: () => boolean) => Promise<Farm>, now = Date.now) {
  const touched = new Set<string>();
  for (const entry of await cache.queue.toArray()) {
    if (!allowed()) return;
    if (entry.uid !== uid || entry.sequence === undefined || touched.has(entry.farmId)) continue;
    touched.add(entry.farmId);
    if (entry.failure || entry.retryAt > now()) continue;
    const sequence = entry.sequence;
    try {
      const saved = await commit(entry.kind === 'delete' ? entry :
        { ...entry, details: restoreDetails(entry.details) }, allowed);
      if (!allowed()) return;
      if (saved.farmerId !== uid || saved.farmerUserId !== uid) throw new Error('Farmer ownership mismatch.');
      await cache.transaction('rw', cache.farms, cache.queue, async () => {
        if ((await cache.queue.get(sequence))?.id !== entry.id) return;
        if (saved.isActive) await cache.farms.put(storeFarm(saved));
        else await cache.farms.delete(saved.farmId);
        await cache.queue.delete(sequence);
      });
      touched.delete(entry.farmId);
    } catch (error) {
      if (!allowed()) return;
      const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
      const failure = error instanceof FarmConflict ? 'conflict' :
        ['permission-denied', 'invalid-argument', 'unauthenticated'].includes(String(code)) ? 'blocked' : undefined;
      const attempt = entry.attempt + 1;
      await cache.queue.update(sequence, {
        failure,
        attempt,
        retryAt: now() + Math.min(60_000, 2000 * 2 ** Math.min(attempt - 1, 5)),
        error: failure === 'conflict' ? 'This plot changed on another device.' :
          failure === 'blocked' ? 'Firebase rejected this change. Check your access, then retry.' :
          'Could not reach Firebase. Your change will retry automatically.',
      });
    }
  }
}
