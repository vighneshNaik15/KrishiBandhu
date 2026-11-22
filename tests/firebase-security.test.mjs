import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { registerHooks } from 'node:module';
import test from 'node:test';

const hooks = registerHooks({
  resolve(specifier, context, next) {
    return next(specifier === 'server-only' ? 'data:text/javascript,export%20{}' : specifier, context);
  },
});
const { authorizeAi } = await import('../src/app/api/ai/access.ts');
hooks.deregister();

test('Firebase emulator authorizes a farmer and denies legacy photo writes', {
  skip: process.env.FIRESTORE_EMULATOR_HOST !== '127.0.0.1:8080' ||
    process.env.FIREBASE_AUTH_EMULATOR_HOST !== '127.0.0.1:9099' ||
    process.env.FIREBASE_STORAGE_EMULATOR_HOST !== '127.0.0.1:9199',
}, async () => {
  const project = 'demo-krishibandhu';
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = project;
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'demo-key';
  process.env.NEXT_PUBLIC_FIREBASE_EMULATORS = '1';
  const signup = await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: randomUUID() + '@example.test', password: 'Disposable-test-only-358!', returnSecureToken: true }),
  });
  const { localId, idToken } = await signup.json();
  assert.ok(localId && idToken);
  const profile = await fetch(`http://127.0.0.1:8080/v1/projects/${project}/databases/(default)/documents/users/${localId}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
    body: JSON.stringify({ fields: { role: { stringValue: 'farmer' }, isActive: { booleanValue: true } } }),
  });
  assert.equal(profile.status, 200);
  const authorization = { Authorization: 'Bearer ' + idToken };
  const decision = await authorizeAi(new Request('http://localhost/api/ai/advisory', { headers: authorization }));
  assert.equal(decision, null, decision ? await decision.text() : undefined);

  for (const path of [`cropDiseaseReports/${localId}/test/image.jpg`, `harvestRequests/${localId}/test/image.jpg`]) {
    const response = await fetch(`http://127.0.0.1:9199/v0/b/${project}.appspot.com/o?uploadType=media&name=${encodeURIComponent(path)}`, {
      method: 'POST', headers: { ...authorization, 'Content-Type': 'image/jpeg' }, body: new Uint8Array([255, 216, 255]),
    });
    assert.equal(response.status, 403);
  }
});
