import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import test from 'node:test';

const hooks = registerHooks({
  resolve(specifier, context, next) {
    if (specifier === 'server-only') return next('data:text/javascript,export%20{}', context);
    if (specifier === '../gemini' || specifier === '../access') return next(specifier + '.ts', context);
    return next(specifier, context);
  },
});
const { POST: advisory } = await import('../src/app/api/ai/advisory/route.ts');
const { POST: schemes } = await import('../src/app/api/ai/schemes/route.ts');
hooks.deregister();

const payloads = [
  [advisory, { question: 'How should I mulch mango trees?' },
    { answer: 'Keep mulch away from the trunk.', suggestedFollowups: [], confidence: .8 }],
  [schemes, { query: 'crop insurance' }, { schemes: [], message: 'Test results' }],
];
const request = (body, token) => new Request('http://localhost/test', {
  method: 'POST', body: JSON.stringify(body),
  headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
});
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'demo-krishibandhu';
process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'demo-key';

for (const [route, body, expected] of payloads) {
  test(`${Object.keys(body)[0]} validates responses and handles Gemini failures`, async t => {
    const original = process.env.GEMINI_API_KEY;
    t.after(() => {
      if (original === undefined) delete process.env.GEMINI_API_KEY;
      else process.env.GEMINI_API_KEY = original;
    });

    const uid = 'test-' + Object.keys(body)[0];
    const authorizedRequest = () => request(body, uid);
    assert.equal((await route(request(body))).status, 401);
    let role = 'farmer';
    let upstream;
    t.mock.method(globalThis, 'fetch', async (url, options) => {
      if (url.includes('/accounts:lookup?')) {
        const { idToken } = JSON.parse(options.body);
        if (idToken === 'invalid') return Response.json({}, { status: 401 });
        return Response.json({ users: [{ localId: uid }] });
      }
      if (url.includes('/documents/users/')) {
        assert.equal(new Headers(options.headers).get('authorization'), 'Bearer ' + uid);
        return Response.json({ fields: { role: { stringValue: role }, isActive: { booleanValue: true } } });
      }
      assert.equal(url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent');
      assert.equal(new Headers(options.headers).get('x-goog-api-key'), 'fake-local-test-value');
      const sent = JSON.parse(options.body);
      assert.equal(sent.contents[0].role, 'user');
      assert.equal(sent.generationConfig.responseMimeType, 'application/json');
      assert.equal(sent.generationConfig.responseJsonSchema.type, 'object');
      return upstream();
    });

    assert.equal((await route(request(body, 'invalid'))).status, 401);
    role = 'buyer';
    assert.equal((await route(authorizedRequest())).status, 403);
    role = 'farmer';
    assert.equal((await route(request({ oversized: 'x'.repeat(50 * 1024) }, uid))).status, 413);
    delete process.env.GEMINI_API_KEY;
    assert.equal((await route(authorizedRequest())).status, 503);
    process.env.GEMINI_API_KEY = 'fake-local-test-value';

    upstream = () => Response.json({ candidates: [{ finishReason: 'STOP', content: {
      parts: [{ text: 'Skipped thought', thought: true }, { text: JSON.stringify(expected) }],
    } }] });
    const success = await route(authorizedRequest());
    assert.equal(success.status, 200);
    assert.deepEqual(await success.json(), expected);

    upstream = () => Response.json({ error: { message: 'Invalid secret response',
      details: [{ reason: 'API_KEY_INVALID' }] } }, { status: 400 });
    const invalid = await route(authorizedRequest());
    assert.equal(invalid.status, 503);
    assert.match((await invalid.json()).error, /credentials were rejected/);

    upstream = () => Response.json({}, { status: 429, headers: { 'Retry-After': '30' } });
    const limited = await route(authorizedRequest());
    assert.equal(limited.status, 429);
    assert.equal(limited.headers.get('Retry-After'), '30');

    upstream = () => Response.json({}, { status: 404 });
    assert.match((await (await route(authorizedRequest())).json()).error, /model is unavailable/);
    upstream = () => Response.json({ candidates: [{ finishReason: 'MAX_TOKENS' }] });
    assert.equal((await route(authorizedRequest())).status, 502);
    upstream = () => { throw new DOMException('Timed out', 'TimeoutError'); };
    assert.equal((await route(authorizedRequest())).status, 504);
    for (let remaining = 0; remaining < 3; remaining++) await route(authorizedRequest());
    assert.equal((await route(authorizedRequest())).status, 429);
  });
}
