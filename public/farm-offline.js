const route = '/farmer/farms';
const cacheName = 'krishibandhu-farm-shell-v2';
const isStatic = url => url.origin === self.location.origin && url.pathname.startsWith('/_next/static/');

const fetchPublic = (url, options = {}) =>
  fetch(url, { ...options, credentials: 'omit', redirect: 'error' });
const canCache = response => response.ok &&
  !/(?:private|no-store)/i.test(response.headers.get('cache-control') ?? '') &&
  !/(?:cookie|authorization|\*)/i.test(response.headers.get('vary') ?? '');

self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil((async () => {
  const keys = await caches.keys();
  await Promise.all(keys.filter(key => key.startsWith('krishibandhu-farm-shell-') && key !== cacheName)
    .map(key => caches.delete(key)));
  await self.clients.claim();
})()));

self.addEventListener('message', event => {
  if (event.data?.type !== 'CACHE_FARM_SHELL' || !Array.isArray(event.data.assets)) return;
  event.waitUntil((async () => {
    const cache = await caches.open(cacheName);
    const page = await fetchPublic(route, { cache: 'reload' });
    if (!canCache(page) || !page.headers.get('content-type')?.includes('text/html')) {
      event.ports[0]?.postMessage({ ready: false });
      return;
    }
    const html = await page.clone().text();
    const assets = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(match => match[1]);
    const urls = [...new Set([...assets, ...event.data.assets])]
      .map(asset => new URL(asset, self.location.origin)).filter(isStatic);
    await Promise.all(urls.map(async url => {
      if (await cache.match(url.href)) return;
      const asset = await fetchPublic(url);
      if (!canCache(asset)) throw new Error('Offline asset is unavailable.');
      await cache.put(url.href, asset);
    }));
    await cache.put(route, page);
    event.ports[0]?.postMessage({ ready: true });
  })().catch(() => event.ports[0]?.postMessage({ ready: false })));
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === 'navigate' && url.pathname === route) {
    event.respondWith(fetch(request).catch(async () =>
      (await caches.match(route, { cacheName })) ?? Response.error()));
  } else if (isStatic(url)) {
    event.respondWith((async () => {
      const cache = await caches.open(cacheName);
      const saved = await cache.match(request);
      if (saved) return saved;
      const response = await fetchPublic(url);
      if (canCache(response)) {
        await cache.put(request, response.clone()).catch(() => undefined);
      }
      return response;
    })());
  }
});
