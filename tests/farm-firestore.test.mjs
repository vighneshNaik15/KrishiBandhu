import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import 'fake-indexeddb/auto';
import { registerHooks } from 'node:module';
import test from 'node:test';
import { initializeApp, deleteApp } from 'firebase/app';
import {
  connectFirestoreEmulator, doc, GeoPoint, getDoc, getFirestore, Timestamp,
  deleteDoc, getDocs, collection, query, where, orderBy, runTransaction, serverTimestamp, setDoc, updateDoc,
} from 'firebase/firestore';

const host = process.env.FIRESTORE_EMULATOR_HOST;
const projectId = 'demo-krishibandhu';

test('farm service round-trips mapped and legacy farms and enforces farmer ownership', {
  skip: host ? false : 'Start the Firestore emulator and set FIRESTORE_EMULATOR_HOST.',
}, async () => {
  assert.match(host, /^(127\.0\.0\.1|localhost):\d+$/);
  const [hostname, port] = host.split(':');
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'test-api-key';
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = projectId;

  const hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
      if (specifier.startsWith('@/')) {
        return nextResolve(new URL('../src/' + specifier.slice(2) + '.ts', import.meta.url).href, context);
      }
      return nextResolve(specifier, context);
    },
  });
  const { default: ownerApp, db } = await import('../src/lib/firebase/config.ts');
  const { jobService } = await import('../src/services/jobService.ts');
  const { productService } = await import('../src/services/productService.ts');
  const { farmService, commitFarmMutation } = await import('../src/services/farmService.ts');
  const { FarmCache, enqueueFarm, readWorkspace, synchronizeFarms } =
    await import('../src/features/farms/farmCache.ts');
  hooks.deregister();
  const owner = randomUUID();
  const outsider = randomUUID();
  const otherApp = initializeApp({ projectId, apiKey: 'test-api-key' }, outsider);
  const otherDb = getFirestore(otherApp);
  const cache = new FarmCache(projectId, owner);
  const otherCache = new FarmCache(projectId, outsider);

  try {
    connectFirestoreEmulator(db, hostname, Number(port), { mockUserToken: { sub: owner } });
    connectFirestoreEmulator(otherDb, hostname, Number(port), { mockUserToken: { sub: outsider } });
    await Promise.all([[db, owner], [otherDb, outsider]].map(([client, uid]) =>
      setDoc(doc(client, 'users', uid), {
        uid, name: 'Test Farmer', email: uid + '@example.test', role: 'farmer',
        isActive: true, isVerified: false, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      })));

    // These are the owner-scoped queries used by the farmer dashboard.
    for (const [name, field, sort] of [
      ['products', 'farmerId', 'createdAt'],
      ['orders', 'farmerId', 'createdAt'],
      ['cropDiseaseAnalyses', 'farmerUid', 'assessedAt'],
    ]) {
      const dashboardQuery = client => query(collection(client, name), where(field, '==', owner), orderBy(sort, 'desc'));
      assert.equal((await getDocs(dashboardQuery(db))).size, 0);
      if (name !== 'products') {
        await assert.rejects(getDocs(dashboardQuery(otherDb)), { code: 'permission-denied' });
      }
    }

    const product = doc(db, 'products', randomUUID());
    const listing = {
      farmerId: owner, farmerUserId: owner, farmerName: 'Test Farmer',
      farmerDistrict: 'North Goa', farmerState: 'Goa', district: 'North Goa', state: 'Goa',
      name: 'Coconut', category: 'coconut_products', description: 'Local coconut',
      price: 25, unit: 'piece', minimumOrderQuantity: 1, quantityAvailable: 4,
      status: 'active', createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    };
    const forgedImages = ['https://example.test/forged-image.jpg'];
    await assert.rejects(setDoc(product, { ...listing, images: forgedImages }), { code: 'permission-denied' });
    await setDoc(product, { ...listing, images: [] });
    await assert.rejects(updateDoc(product, { images: forgedImages, updatedAt: serverTimestamp() }),
      { code: 'permission-denied' });
    await updateDoc(product, { status: 'inactive', updatedAt: serverTimestamp() });

    const harvestId = await jobService.create({
      requestType: 'harvest_service', farmerId: owner, farmerUserId: owner, farmerName: 'Test Farmer',
      title: 'Harvest rice', description: 'Bring equipment for harvesting.', category: 'harvesting',
      workersRequired: 2, district: 'North Goa', state: 'Goa', startDate: Timestamp.now(),
      paymentType: 'negotiable', farmLocation: 'Test village road', approximateLandArea: 1,
      landAreaUnit: 'acres', cropType: 'Rice', instructions: 'Bring equipment for harvesting.',
      resourceType: 'workers', resourcesRequired: 2, status: 'published',
    });
    const harvest = await jobService.getById(harvestId);
    assert.equal(harvest.status, 'published');
    assert.equal(harvest.imagePaths, undefined);

    await productService.update(product.id, { name: 'Dry coconut', price: 30, quantityAvailable: 0 });
    const edited = await productService.getById(product.id);
    assert.equal(edited.name, 'Dry coconut');
    assert.equal(edited.quantityAvailable, 0);
    assert.deepEqual(edited.images, []);


    const details = { name: 'Coastal farm', district: 'North Goa', state: 'Goa', area: 1, areaUnit: 'hectares' };
    const boundary = [new GeoPoint(15.4, 74), new GeoPoint(15.4, 74.001), new GeoPoint(15.401, 74)];
    const ownerFields = { farmerId: owner, farmerUserId: owner };
    const farmId = await farmService.create({ ...details, ...ownerFields, boundary });
    const legacyId = await farmService.create({ ...details, ...ownerFields });
    const stored = await farmService.getById(farmId);
    assert.equal(stored.boundary.length, 3);
    assert.ok(stored.boundary[2].isEqual(boundary[2]));
    assert.ok(stored.area > 0.5 && stored.area < 0.7);
    assert.equal((await farmService.getById(legacyId)).boundary, undefined);
    assert.deepEqual(new Set((await farmService.getByFarmer(owner)).map(farm => farm.farmId)), new Set([farmId, legacyId]));

    const foreignFarm = doc(otherDb, 'farms', farmId);
    await assert.rejects(getDocs(collection(otherDb, 'farms')), { code: 'permission-denied' });
    await assert.rejects(deleteDoc(foreignFarm), { code: 'permission-denied' });
    await assert.rejects(deleteDoc(doc(db, 'farms', farmId)), { code: 'permission-denied' });
    await assert.rejects(updateDoc(foreignFarm, { isActive: false, updatedAt: serverTimestamp() }),
      { code: 'permission-denied' });
    await assert.rejects(setDoc(doc(otherDb, 'farms', randomUUID()), {
      ...details, ...ownerFields, images: [], isActive: true,
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    }), { code: 'permission-denied' });
    await assert.rejects(updateDoc(doc(db, 'farms', farmId), {
      farmerId: outsider, farmerUserId: outsider, updatedAt: serverTimestamp(),
    }), { code: 'permission-denied' });
    await assert.rejects(getDoc(foreignFarm), { code: 'permission-denied' });
    await assert.rejects(updateDoc(foreignFarm, { name: 'Other farmer', updatedAt: serverTimestamp() }),
      { code: 'permission-denied' });
    await assert.rejects(updateDoc(doc(db, 'farms', farmId), { boundary: [boundary[0]], updatedAt: serverTimestamp() }),
      { code: 'permission-denied' });

    await farmService.update(farmId, { ...details, name: 'Edited plot', boundary, areaUnit: 'sqm' });
    const updated = await farmService.getById(farmId);
    assert.equal(updated.name, 'Edited plot');
    assert.ok(updated.area > 5000 && updated.area < 7000);
    await farmService.update(farmId, details);
    assert.equal((await farmService.getById(farmId)).boundary, undefined);
    await farmService.delete(farmId);
    assert.deepEqual((await farmService.getByFarmer(owner)).map(farm => farm.farmId), [legacyId]);
    const active = () => true;
    const queuedId = await enqueueFarm(cache, owner, { kind: 'create', details: { ...details, boundary } });
    const before = await readWorkspace(cache);
    assert.equal(before.farms[0].farmId, queuedId);
    assert.equal((await readWorkspace(otherCache)).farms.length, 0);
    await enqueueFarm(cache, owner, {
      kind: 'update', farm: before.farms[0], details: { ...details, name: 'Edited offline', boundary },
    });
    await synchronizeFarms(cache, owner, () => false, () => assert.fail('Offline or signed-out sync ran'));
    assert.equal((await readWorkspace(cache)).pending.length, 2);
    cache.close();
    await cache.open();
    assert.equal((await readWorkspace(cache)).farms[0].name, 'Edited offline');

    let retries = 0;
    await synchronizeFarms(cache, owner, active, async () => {
      retries++;
      throw Object.assign(new Error('Network unavailable'), { code: 'unavailable' });
    }, () => 0);
    assert.match((await readWorkspace(cache)).pending[0].error, /retry automatically/);
    await synchronizeFarms(cache, owner, active, async () => { retries++; }, () => 1999);
    assert.equal(retries, 1);

    // Simulate losing the response after the first create reached Firestore.
    const create = (await readWorkspace(cache)).pending[0];
    await commitFarmMutation({ ...create, details: { ...details, boundary } }, active);
    await synchronizeFarms(cache, owner, active, commitFarmMutation);
    assert.equal((await readWorkspace(cache)).pending.length, 0);
    const synced = await farmService.getById(queuedId);
    assert.equal(synced.name, 'Edited offline');
    assert.equal((await farmService.getByFarmer(owner)).filter(farm => farm.farmId === queuedId).length, 1);

    await enqueueFarm(cache, owner, {
      kind: 'update', farm: synced, details: { ...details, name: 'Local version' },
    });
    await farmService.update(queuedId, { ...details, name: 'Remote version' });
    await synchronizeFarms(cache, owner, active, commitFarmMutation);
    assert.equal((await readWorkspace(cache)).pending[0].failure, 'conflict');
    assert.equal((await farmService.getById(queuedId)).name, 'Remote version');
    await cache.queue.clear();

    await enqueueFarm(otherCache, outsider, { kind: 'create', details });
    await synchronizeFarms(otherCache, outsider, active, commitFarmMutation);
    assert.equal((await readWorkspace(otherCache)).pending[0].failure, 'blocked');
    assert.equal((await readWorkspace(cache)).farms.some(farm => farm.farmerUserId === outsider), false);

    const crop = doc(db, 'crops', randomUUID());
    await setDoc(crop, {
      ...ownerFields, farmId: legacyId, name: 'Rice', category: 'cereal', season: 'kharif',
      cultivatedArea: 1, areaUnit: 'acres', currentGrowthStage: 'sown', isActive: true,
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
    assert.equal((await getDoc(crop)).data().farmId, legacyId);
    const assessmentId = randomUUID();
    const assessment = doc(db, 'cropDiseaseAnalyses', assessmentId);
    await runTransaction(db, async transaction => {
      await transaction.get(doc(db, 'users', owner));
      transaction.set(assessment, {
        assessmentId, farmerUid: owner, selectedCrop: 'rice', predictedDisease: 'Blast',
        modelId: 'rice-mobilenetv2-v1', modelVersion: 'a'.repeat(64), modelScore: 0.7,
        alternativeScores: [], imageStoragePath: `cropDiseaseReports/${owner}/${assessmentId}/image.jpg`,
        assessedAt: serverTimestamp(), status: 'unverified',
      });
    }, { maxAttempts: 1 });
    assert.equal((await getDoc(assessment)).data().selectedCrop, 'rice');
    await assert.rejects(getDoc(doc(otherDb, 'cropDiseaseAnalyses', assessmentId)), { code: 'permission-denied' });
  } finally {
    await Promise.all([cache.delete(), otherCache.delete(), deleteApp(ownerApp), deleteApp(otherApp)]);
  }
});
