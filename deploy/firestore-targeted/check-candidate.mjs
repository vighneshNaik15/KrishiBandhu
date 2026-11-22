import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { registerHooks } from 'node:module';
import 'fake-indexeddb/auto';
import { initializeApp, deleteApp } from 'firebase/app';
import { collection, connectFirestoreEmulator, deleteDoc, doc, GeoPoint, getDoc, getDocs, getFirestore, query, serverTimestamp, setDoc, Timestamp, updateDoc, where } from 'firebase/firestore';

const projectId = 'demo-krishibandhu';
const port = 8086;
Object.assign(process.env, { NEXT_PUBLIC_FIREBASE_PROJECT_ID: projectId, NEXT_PUBLIC_FIREBASE_API_KEY: 'emulator-only' });
const hooks = registerHooks({ resolve(specifier, context, next) {
  if (specifier === './legacyPhotoService') return next('./legacyPhotoService.ts', context);
  return next(specifier.startsWith('@/') ? new URL('../../src/' + specifier.slice(2) + '.ts', import.meta.url).href : specifier, context);
} });
const { default: farmerApp, db } = await import('../../src/lib/firebase/config.ts');
const { commitFarmMutation, farmService } = await import('../../src/services/farmService.ts');
const { FarmCache, enqueueFarm, readWorkspace, synchronizeFarms } = await import('../../src/features/farms/farmCache.ts');
const { cropDiseaseService } = await import('../../src/services/cropDiseaseService.ts');
hooks.deregister();
const uid = randomUUID();
const cache = new FarmCache(projectId, uid);
const apps = [farmerApp];
const denied = operation => assert.rejects(operation, { code: 'permission-denied' });
const timestamps = () => ({ createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
const roleUid = {};
const accounts = {};
connectFirestoreEmulator(db, '127.0.0.1', port, { mockUserToken: { sub: uid } });

async function seed(collectionName, id, fields) {
  const response = await fetch(`http://127.0.0.1:${port}/v1/projects/${projectId}/databases/(default)/documents/${collectionName}/${id}`, {
    method: 'PATCH', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  assert(response.ok, await response.text());
}
const strings = object => Object.fromEntries(Object.entries(object).map(([key, value]) => [key, { stringValue: value }]));

try {
  await setDoc(doc(db, 'users', uid), { uid, name: 'Test farmer', email: `${uid}@example.test`, role: 'farmer', isActive: true, isVerified: false, ...timestamps() });
  for (const role of ['other', 'inactive', 'worker', 'buyer', 'signedOut']) {
    const id = randomUUID();
    roleUid[role] = id;
    const app = initializeApp({ projectId, apiKey: 'emulator-only' }, id);
    apps.push(app);
    const connection = getFirestore(app);
    connectFirestoreEmulator(connection, '127.0.0.1', port, role === 'signedOut' ? {} : { mockUserToken: { sub: id } });
    accounts[role] = connection;
    if (role !== 'signedOut') await seed('users', id, { ...strings({ uid: id, role: ['other', 'inactive'].includes(role) ? 'farmer' : role }), isActive: { booleanValue: role !== 'inactive' } });
  }
  const owner = { farmerId: uid, farmerUserId: uid };
  const boundary = [new GeoPoint(15.4, 74), new GeoPoint(15.4, 74.001), new GeoPoint(15.401, 74)];
  const details = { name: 'Coconut test', village: 'Mapusa', district: 'North Goa', state: 'Goa', area: 1, areaUnit: 'acres' };
  const legacyId = await farmService.create({ ...details, ...owner });
  await farmService.update(legacyId, { ...details, name: 'Legacy edit' });
  const unmappedId = await enqueueFarm(cache, uid, { kind: 'create', details });
  const mappedId = await enqueueFarm(cache, uid, { kind: 'create', details: { ...details, boundary } });
  const allowed = () => true;
  const operation = (await readWorkspace(cache)).pending.find(entry => entry.farmId === unmappedId);
  await commitFarmMutation(operation, allowed);
  await synchronizeFarms(cache, uid, allowed, commitFarmMutation);
  assert.equal((await readWorkspace(cache)).pending.length, 0);
  assert.equal((await farmService.getByFarmer(uid)).filter(farm => farm.farmId === unmappedId).length, 1);
  const mapped = await farmService.getById(mappedId);
  assert.equal(mapped.boundary.length, 3);
  await enqueueFarm(cache, uid, { kind: 'update', farm: mapped, details: { ...details, boundary, name: 'Synced edit' } });
  await synchronizeFarms(cache, uid, allowed, commitFarmMutation);
  const edited = await farmService.getById(mappedId);
  assert.equal(edited.name, 'Synced edit');
  const farmRef = doc(db, 'farms', mappedId);
  await denied(updateDoc(farmRef, { mutationId: edited.mutationId, name: 'Repeated marker', updatedAt: serverTimestamp() }));
  await denied(updateDoc(farmRef, { mutationId: '-'.repeat(36), updatedAt: serverTimestamp() }));
  await denied(updateDoc(farmRef, { mutationId: randomUUID(), boundary: boundary.slice(0, 2), updatedAt: serverTimestamp() }));
  await denied(updateDoc(farmRef, { mutationId: randomUUID(), farmerUserId: roleUid.other, updatedAt: serverTimestamp() }));
  await denied(deleteDoc(farmRef));
  for (const [role, connection] of Object.entries(accounts)) {
    const target = doc(connection, 'farms', mappedId);
    await denied(getDoc(target));
    await denied(updateDoc(target, { mutationId: randomUUID(), isActive: false, updatedAt: serverTimestamp() }));
    const forgedOwner = role === 'other' ? owner : { farmerId: roleUid[role], farmerUserId: roleUid[role] };
    await denied(setDoc(doc(connection, 'farms', randomUUID()), { ...details, ...forgedOwner, mutationId: randomUUID(), images: [], isActive: true, ...timestamps() }));
  }
  await enqueueFarm(cache, uid, { kind: 'delete', farm: edited });
  await synchronizeFarms(cache, uid, allowed, commitFarmMutation);
  assert.equal((await farmService.getById(mappedId)).isActive, false);
  assert.equal((await readWorkspace(cache)).pending.length, 0);
  await farmService.delete(legacyId);
  console.log('PASS farm sync: mapped/unmapped create, idempotent retry, edit, soft delete, legacy operations and owner isolation.');

  const first = randomUUID();
  const second = randomUUID();
  const privateReport = randomUUID();
  for (const [id, farmerUid, assessedAt] of [[first, uid, '2026-11-19T00:00:00Z'], [second, uid, '2026-11-20T00:00:00Z'], [privateReport, roleUid.other, '2026-11-21T00:00:00Z']]) {
    await seed('cropDiseaseAnalyses', id, { ...strings({ assessmentId: id, farmerUid }), assessedAt: { timestampValue: assessedAt } });
  }
  assert.deepEqual((await cropDiseaseService.getByFarmer(uid)).map(report => report.assessmentId), [second, first]);
  assert((await getDoc(doc(db, 'cropDiseaseAnalyses', first))).exists());
  await denied(cropDiseaseService.getByFarmer(roleUid.other));
  await denied(getDoc(doc(db, 'cropDiseaseAnalyses', privateReport)));
  await denied(getDocs(collection(db, 'cropDiseaseAnalyses')));
  for (const [role, connection] of Object.entries(accounts)) {
    await denied(getDoc(doc(connection, 'cropDiseaseAnalyses', first)));
    await denied(getDocs(query(collection(connection, 'cropDiseaseAnalyses'), where('farmerUid', '==', role === 'other' ? uid : roleUid[role]))));
  }
  const report = doc(db, 'cropDiseaseAnalyses', first);
  await denied(setDoc(doc(db, 'cropDiseaseAnalyses', randomUUID()), { farmerUid: uid, assessedAt: Timestamp.now() }));
  await denied(updateDoc(report, { assessedAt: Timestamp.now() }));
  await denied(deleteDoc(report));
  console.log('PASS Disease History: owner query and ordering, denied cross-account, unscoped, anonymous, inactive and wrong-role access, denied all writes.');

  const productId = randomUUID();
  await seed('products', productId, strings({ ...owner, status: 'active' }));
  assert((await getDoc(doc(accounts.signedOut, 'products', productId))).exists());
  const jobId = randomUUID();
  await seed('jobs', jobId, strings({ ...owner, status: 'published' }));
  assert((await getDoc(doc(accounts.worker, 'jobs', jobId))).exists());
  const applicationId = randomUUID();
  await seed('jobApplications', applicationId, strings({ farmerId: uid, workerId: roleUid.worker, workerUserId: roleUid.worker, jobId, status: 'pending' }));
  await updateDoc(doc(db, 'jobApplications', applicationId), { status: 'accepted', updatedAt: serverTimestamp() });
  assert((await getDoc(doc(accounts.worker, 'jobApplications', applicationId))).exists());
  await denied(getDoc(doc(accounts.other, 'jobApplications', applicationId)));
  const orderId = randomUUID();
  await seed('orders', orderId, strings({ farmerId: uid, buyerId: roleUid.buyer, status: 'pending' }));
  assert((await getDoc(doc(db, 'orders', orderId))).exists());
  assert((await getDoc(doc(accounts.buyer, 'orders', orderId))).exists());
  await denied(getDoc(doc(accounts.other, 'orders', orderId)));
  await denied(setDoc(doc(accounts.buyer, 'orders', randomUUID()), { buyerId: roleUid.buyer, farmerId: uid }));
  console.log('PASS existing permissions: public Marketplace and published jobs, application owner acceptance, participant-only order reads and denied order creation.');
} finally {
  await Promise.all([cache.delete(), ...apps.map(deleteApp)]);
}
