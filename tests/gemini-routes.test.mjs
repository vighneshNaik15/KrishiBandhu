import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import test from 'node:test';

const hooks = registerHooks({
  resolve(specifier, context, next) {
    if (specifier === 'server-only') return next('data:text/javascript,export%20{}', context);
    if (specifier === '../gemini') return next('../gemini.ts', context);
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
const request = body => new Request('http://localhost/test', {
  method: 'POST', body: JSON.stringify(body),
});

for (const [route, body, expected] of payloads) {
  test(`${Object.keys(body)[0]} validates responses and handles Gemini failures`, async t => {
    const original = process.env.GEMINI_API_KEY;
    t.after(() => {
      if (original === undefined) delete process.env.GEMINI_API_KEY;
      else process.env.GEMINI_API_KEY = original;
    });

    delete process.env.GEMINI_API_KEY;
    assert.equal((await route(request(body))).status, 503);
    process.env.GEMINI_API_KEY = 'fake-local-test-value';

    let upstream;
    t.mock.method(globalThis, 'fetch', async (url, options) => {
      assert.equal(url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent');
      assert.equal(new Headers(options.headers).get('x-goog-api-key'), 'fake-local-test-value');
      const sent = JSON.parse(options.body);
      assert.equal(sent.contents[0].role, 'user');
      assert.equal(sent.generationConfig.responseMimeType, 'application/json');
      assert.equal(sent.generationConfig.responseJsonSchema.type, 'object');
      return upstream();
    });

    upstream = () => Response.json({ candidates: [{ finishReason: 'STOP', content: {
      parts: [{ text: 'Skipped thought', thought: true }, { text: JSON.stringify(expected) }],
    } }] });
    const success = await route(request(body));
    assert.equal(success.status, 200);
    assert.deepEqual(await success.json(), expected);

    upstream = () => Response.json({ error: { message: 'Invalid secret response',
      details: [{ reason: 'API_KEY_INVALID' }] } }, { status: 400 });
    const invalid = await route(request(body));
    assert.equal(invalid.status, 503);
    assert.match((await invalid.json()).error, /credentials were rejected/);

    upstream = () => Response.json({}, { status: 429, headers: { 'Retry-After': '30' } });
    const limited = await route(request(body));
    assert.equal(limited.status, 429);
    assert.equal(limited.headers.get('Retry-After'), '30');

    upstream = () => Response.json({}, { status: 404 });
    assert.match((await (await route(request(body))).json()).error, /model is unavailable/);
    upstream = () => Response.json({ candidates: [{ finishReason: 'MAX_TOKENS' }] });
    assert.equal((await route(request(body))).status, 502);
    upstream = () => { throw new DOMException('Timed out', 'TimeoutError'); };
    assert.equal((await route(request(body))).status, 504);
  });
}
