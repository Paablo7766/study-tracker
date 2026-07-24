const CACHE_NAME = 'study-tracker-v10';

const urlsToCache = [
  './index.html',
  './style.css',
  './app.js',
  './icon-192.png',
  './icon-512.png',
  './manifest.json',
  './js/app.js',
  './js/config.js',
  './js/supabase.js',
  './js/utils.js',
  './js/ui.js',
  './js/i18n.js',
  './js/storage.js',
  './js/dashboard.js',
  './js/subjects.js',
  './js/subjectGoals.js',
  './js/timer.js',
  './js/settings.js',
  './js/streak-modal.js',
  './js/tasks.js',
  './assets/icon.png',
  './assets/icon-32.png',
  './assets/icon-180.png',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await Promise.all(
        urlsToCache.map(async (url) => {
          try {
            const response = await fetch(url, { cache: 'reload' });
            if (response.ok) await cache.put(url, response);
          } catch (err) {
            console.warn('[SW] Precache omitido:', url);
          }
        })
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok) cache.put(request, fresh.clone());
    return fresh;
  } catch {
    return (
      (await cache.match(request)) ||
      (await cache.match('./index.html'))
    );
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
    .then((response) => {
      if (response && response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  if (cached) return cached;
  const fresh = await networkPromise;
  return fresh || new Response('Offline', { status: 503 });
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;
  const isChart = url.hostname === 'cdn.jsdelivr.net';
  if (!sameOrigin && !isChart) return;

  if (
    request.mode === 'navigate' ||
    (request.method === 'GET' && request.headers.get('accept')?.includes('text/html'))
  ) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Credenciales de Supabase: siempre red primero para no quedar con placeholders en caché.
  if (url.pathname.endsWith('/js/config.js')) {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});
