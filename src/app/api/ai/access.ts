import 'server-only';

const uidLimits = new Map<string, number>();
let windowStart = 0;
let total = 0;
const windowMs = 60_000;
const maxBodyBytes = 48 * 1024;

function errorResponse(status: number, error: string) {
  return Response.json({ error }, {
    status, headers: { 'Cache-Control': 'no-store', ...(status === 429 ? { 'Retry-After': '60' } : {}) },
  });
}

export async function authorizeAi(request: Request): Promise<Response | null> {
  const token = request.headers.get('authorization')?.match(/^Bearer ([A-Za-z0-9_.-]{1,4096})$/i)?.[1];
  if (!token) return errorResponse(401, 'Sign in as a farmer to continue.');
  const project = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const key = process.env.FIREBASE_AUTH_API_KEY?.trim() || process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!project || !key) return errorResponse(503, 'Sign-in verification is unavailable.');

  const demo = project === 'demo-krishibandhu' && process.env.NEXT_PUBLIC_FIREBASE_EMULATORS === '1';
  const identity = demo ? 'http://127.0.0.1:9099/identitytoolkit.googleapis.com' : 'https://identitytoolkit.googleapis.com';
  const firestore = demo ? 'http://127.0.0.1:8080' : 'https://firestore.googleapis.com';
  try {
    const lookup = await fetch(identity + '/v1/accounts:lookup?key=' + encodeURIComponent(key), {
      method: 'POST', body: JSON.stringify({ idToken: token }),
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(5000),
    });
    if (!lookup.ok) {
      return [400, 401, 403].includes(lookup.status)
        ? errorResponse(401, 'Your sign-in could not be verified. Sign in again.')
        : errorResponse(503, 'Sign-in verification is unavailable.');
    }
    const { users } = await lookup.json();
    const user = Array.isArray(users) && users.length === 1 ? users[0] : null;
    const uid = user?.localId;
    if (typeof uid !== 'string' || !uid || uid.includes('/') || uid === '.' || uid === '..' || user.disabled === true) {
      return errorResponse(401, 'Your sign-in could not be verified.');
    }
    const profile = await fetch(firestore + '/v1/projects/' + encodeURIComponent(project) +
      '/databases/(default)/documents/users/' + encodeURIComponent(uid), {
      headers: { Authorization: 'Bearer ' + token },
      cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(5000),
    });
    if (!profile.ok) {
      return [401, 403, 404].includes(profile.status)
        ? errorResponse(403, 'An active farmer account is required.')
        : errorResponse(503, 'Farmer access could not be verified.');
    }
    const { fields } = await profile.json();
    if (fields?.role?.stringValue !== 'farmer' || fields?.isActive?.booleanValue !== true) {
      return errorResponse(403, 'An active farmer account is required.');
    }
    const now = Date.now();
    if (now - windowStart >= windowMs) {
      windowStart = now;
      total = 0;
      uidLimits.clear();
    }
    const count = uidLimits.get(uid) ?? 0;
    if (count >= 10 || total >= 60) return errorResponse(429, 'AI request limit reached. Try again in a minute.');
    uidLimits.set(uid, count + 1);
    total++;
    return null;
  } catch {
    return errorResponse(503, 'Sign-in verification is unavailable.');
  }
}

export async function readAiJson(request: Request): Promise<{ body: unknown } | { error: Response }> {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') ?? '')) {
    return { error: errorResponse(415, 'Use a JSON request.') };
  }
  const tooLarge = () => ({ error: errorResponse(413, 'The AI request is too large.') });
  if (Number(request.headers.get('content-length')) > maxBodyBytes) return tooLarge();
  const reader = request.body?.getReader();
  if (!reader) return { error: errorResponse(400, 'Missing request body.') };
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let size = 0;
  let text = '';
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBodyBytes) {
        void reader.cancel().catch(() => undefined);
        return tooLarge();
      }
      text += decoder.decode(value, { stream: true });
    }
    return { body: JSON.parse(text + decoder.decode()) };
  } catch {
    return { error: errorResponse(400, 'Invalid JSON body.') };
  } finally {
    reader.releaseLock();
  }
}
