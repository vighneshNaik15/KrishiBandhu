import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { registerHooks } from 'node:module';
import 'fake-indexeddb/auto';
import { initializeApp, deleteApp } from 'firebase/app';
import { collection, connectFirestoreEmulator, deleteDoc, doc, GeoPoint, getDoc, getDocs, getFirestore, query, serverTimestamp, setDoc, Timestamp, updateDoc, where } from 'firebase/firestore';

const projectId = 'demo-krishibandhu';
const port = Number(process.env.KB_RULES_PORT ?? 8086);
Object.assign(process.env, { NEXT_PUBLIC_FIREBASE_PROJECT_ID: projectId, NEXT_PUBLIC_FIREBASE_API_KEY: 'emulator-only' });
const hooks = registerHooks({ resolve(specifier, context, next) {
  if (specifier === './legacyPhotoService') return next('./legacyPhotoService.ts', context);
  return next(specifier.startsWith('@/') ? new URL('../../src/' + specifier.slice(2) + '.ts', import.meta.url).href : specifier, context);
} });
const { default: farmerApp, db } = await import('../../src/lib/firebase/config.ts');
const { commitFarmMutation, farmService } = await import('../../src/services/farmService.ts');
const { FarmCache, enqueueFarm, readWorkspace, synchronizeFarms } = await import('../../src/features/farms/farmCache.ts');
const { orderService } = await import('../../src/services/orderService.ts');
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
  // Simulate a rules denial and the same manual retry used by FarmWorkspace.
  await synchronizeFarms(cache, uid, allowed, async () => {
    throw Object.assign(new Error('Denied'), { code: 'permission-denied' });
  });
  const blocked = (await readWorkspace(cache)).pending;
  assert(blocked.every(op => op.failure === 'blocked'));
  await cache.queue.toCollection().modify(op => { delete op.failure; delete op.error; op.retryAt = 0; });
  assert.deepEqual((await readWorkspace(cache)).pending.map(op => op.id), blocked.map(op => op.id));
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
  const savedId = randomUUID();
  await cropDiseaseService.save(savedId, uid, { crop: 'rice', model_id: 'rice-mobilenetv2-v1', model_version: 'a'.repeat(64),
    predicted_class: 'Blast', scores: [{ class_name: 'Blast', score: 0.8 }], uncertain: true });
  assert((await cropDiseaseService.getByFarmer(uid)).some(row => row.assessmentId === savedId && !row.imageStoragePath));
  await denied(getDoc(doc(accounts.other, 'cropDiseaseAnalyses', savedId)));
  const report = doc(db, 'cropDiseaseAnalyses', first);
  await denied(setDoc(doc(db, 'cropDiseaseAnalyses', randomUUID()), { farmerUid: uid, assessedAt: Timestamp.now() }));
  await denied(updateDoc(report, { assessedAt: Timestamp.now() }));
  await denied(deleteDoc(report));
  console.log('PASS Disease History: owner query and ordering, denied cross-account, unscoped, anonymous, inactive and wrong-role access, validated metadata-only creation and immutable reports.');

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
  const stockId = randomUUID();
  const sellerProduct = { ...owner, farmerName: 'Test farmer', farmerDistrict: 'North Goa',
    farmerState: 'Goa', district: 'North Goa', state: 'Goa', name: 'Coconut', category: 'fruits',
    description: 'Test listing', price: 20, unit: 'piece', minimumOrderQuantity: 1,
    quantityAvailable: 2, images: [], status: 'active', ...timestamps() };
  await setDoc(doc(db, 'products', stockId), sellerProduct);
  const imageList = ['https://example.test/older-client/coconut.jpg'];
  const legacyProduct = doc(db, 'products', randomUUID());
  await setDoc(legacyProduct, { ...sellerProduct, images: imageList });
  assert.deepEqual((await getDoc(doc(accounts.buyer, 'products', legacyProduct.id))).data().images, imageList);
  for (const connection of Object.values(accounts)) {
    await denied(updateDoc(doc(connection, 'products', legacyProduct.id), { images: [], updatedAt: serverTimestamp() }));
    await denied(setDoc(doc(connection, 'products', randomUUID()), { ...sellerProduct, images: imageList }));
  }
  await denied(setDoc(doc(db, 'products', randomUUID()), { ...sellerProduct, images: 'invalid' }));
  await denied(updateDoc(legacyProduct, { images: [], farmerId: roleUid.other, updatedAt: serverTimestamp() }));
  await updateDoc(legacyProduct, { status: 'inactive', updatedAt: serverTimestamp() });
  await denied(getDoc(doc(accounts.buyer, 'products', legacyProduct.id)));
  console.log('PASS legacy Marketplace image references, buyer visibility, private listing protection, ownership and role denials.');
  await seed('users', roleUid.buyer, { ...strings({ uid: roleUid.buyer, name: 'Buyer', role: 'buyer' }), isActive: { booleanValue: true } });
  const request = { ...owner, productId: stockId, buyerId: roleUid.buyer, buyerName: 'Buyer',
    farmerName: 'Test farmer', productName: 'Coconut', productUnit: 'piece', quantity: 2,
    unitPrice: 20, totalAmount: 40, requestVersion: 1, status: 'pending', statusHistory: [], ...timestamps() };
  const firstRequest = randomUUID(), secondRequest = randomUUID();
  for (const id of [firstRequest, secondRequest]) await setDoc(doc(accounts.buyer, 'orders', id), request);
  await denied(setDoc(doc(accounts.buyer, 'orders', firstRequest), request));
  for (const overrides of [{ quantity: 3, totalAmount: 60 }, { quantity: 0 }, { unitPrice: 1 }, { buyerId: uid }, { farmerId: roleUid.other }]) {
    await denied(setDoc(doc(accounts.buyer, 'orders', randomUUID()), { ...request, ...overrides }));
  }
  await denied(setDoc(doc(accounts.worker, 'orders', randomUUID()), request));
  const outcomes = await Promise.allSettled([firstRequest, secondRequest].map(id => orderService.updateStatus(id, 'accepted', uid)));
  assert.equal(outcomes.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal((await getDoc(doc(db, 'products', stockId))).data().quantityAvailable, 0);
  const rejected = outcomes[0].status === 'rejected' ? firstRequest : secondRequest;
  await orderService.updateStatus(rejected, 'rejected', uid);
  assert.equal((await getDoc(doc(accounts.buyer, 'orders', rejected))).data().status, 'rejected');
  console.log('PASS simultaneous order acceptance, stock floor, rejection, invalid quantity, price and ownership.');

  const privateListing = randomUUID();
  await seed('serviceListings', privateListing, { ...strings({providerId: roleUid.worker, verificationStatus: 'pending'}), isActive: {booleanValue:true} });
  assert((await getDoc(doc(accounts.worker, 'serviceListings', privateListing))).exists());
  for (const connection of [db, accounts.buyer, accounts.signedOut]) {
    await denied(getDoc(doc(connection, 'serviceListings', privateListing)));
    await denied(updateDoc(doc(connection, 'serviceListings', privateListing), {verificationStatus:'approved'}));
  }
  await denied(updateDoc(doc(accounts.worker, 'serviceListings', privateListing), {verificationStatus:'approved', updatedAt:serverTimestamp()}));
  const facility = randomUUID();
  await seed('storageFacilities', facility, { ...strings({facilityKind:'storage_candidate', verificationStatus:'pending'}), isActive:{booleanValue:true} });
  await denied(getDoc(doc(db, 'storageFacilities', facility)));
  await denied(updateDoc(doc(accounts.worker, 'storageFacilities', facility), {verificationStatus:'approved'}));
  await denied(updateDoc(doc(accounts.worker, 'users', roleUid.worker), {role:'admin',updatedAt:serverTimestamp()}));
  console.log('PASS private directories and review permissions.');
  console.log('PASS existing permissions: public Marketplace and published jobs, application owner acceptance, participant-only order reads and denied malformed orders.');
} finally {
  await Promise.all([cache.delete(), ...apps.map(deleteApp)]);
}
