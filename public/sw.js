// Service Worker for Riskon PWA
// Handles: static asset caching, API caching, offline fallback, push notifications

const CACHE_NAME = 'riskon-cache-v2';
const STATIC_CACHE_TTL = 24 * 60 * 60 * 1000;
const API_CACHE_TTL = 5 * 60 * 1000;

const APP_SHELL = [
  '/',
  '/offline',
  '/about',
  '/features',
  '/pricing',
  '/how-it-works',
  '/technologies',
  '/wallet',
  '/landing',
  '/manifest.json',
];

const HORIZON_API_PATTERNS = [
  /^https:\/\/horizon(-testnet)?\.stellar\.org\/accounts\/[^\/]+$/,
  /^https:\/\/horizon(-testnet)?\.stellar\.org\/accounts\/[^\/]+\/payments/,
  /^https:\/\/horizon(-testnet)?\.stellar\.org\/accounts\/[^\/]+\/transactions/,
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL);
    }).catch((error) => {
      console.error('SW: Precache failed:', error);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME && name.startsWith('riskon-cache-')) {
            return caches.delete(name);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const { url, method } = request;

  if (method !== 'GET') return;

  if (isHorizonAPICall(url)) {
    event.respondWith(handleAPIRequest(request));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(handleStaticAssetRequest(request));
    return;
  }
});

function isHorizonAPICall(url) {
  return HORIZON_API_PATTERNS.some(pattern => pattern.test(url));
}

function isStaticAsset(url) {
  const urlObj = new URL(url);
  if (urlObj.origin === self.location.origin) {
    return url.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/);
  }
  return false;
}

async function handleNavigationRequest(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;
    return cache.match('/offline');
  }
}

async function handleAPIRequest(request) {
  try {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      const cachedDate = cachedResponse.headers.get('sw-cached-date');
      if (cachedDate) {
        const cacheAge = Date.now() - parseInt(cachedDate);
        if (cacheAge < API_CACHE_TTL) {
          fetchAndCache(request, cache).catch(() => {});
          return cachedResponse;
        }
      }
    }

    return await fetchAndCache(request, cache);
  } catch (error) {
    const cache = await caches.open(CACHE_NAME);
    const fallback = await cache.match(request);
    if (fallback) return fallback;
    return new Response('Network error', { status: 503, statusText: 'Service Unavailable' });
  }
}

async function handleStaticAssetRequest(request) {
  try {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;

    const response = await fetch(request);
    if (response.ok) {
      const headers = new Headers(response.headers);
      headers.set('sw-cached-date', Date.now().toString());
      const toCache = new Response(response.clone().body, {
        status: response.status,
        statusText: response.statusText,
        headers: headers,
      });
      cache.put(request, toCache);
    }
    return response;
  } catch (error) {
    return new Response('Asset not found', { status: 404, statusText: 'Not Found' });
  }
}

async function fetchAndCache(request, cache) {
  const response = await fetch(request);
  if (response.ok) {
    const headers = new Headers(response.headers);
    headers.set('sw-cached-date', Date.now().toString());
    const toCache = new Response(response.clone().body, {
      status: response.status,
      statusText: response.statusText,
      headers: headers,
    });
    await cache.put(request, toCache);
  }
  return response;
}

// ── Push Notifications ─────────────────────────────────────

self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const { title, body, url, type } = data;

    const options = {
      body: body || '',
      icon: '/icon-192.png',
      badge: '/icon-32.png',
      tag: type || 'default',
      data: { url: url || '/', type: type || 'default' },
      actions: [
        { action: 'open', title: 'Open' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
    };

    event.waitUntil(self.registration.showNotification(title || 'Riskon', options));
  } catch (error) {
    console.error('SW: Push notification error:', error);
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existingClient = clients.find((c) => c.url.includes(self.location.origin));
      if (existingClient) {
        existingClient.navigate(url);
        return existingClient.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});

// ── Message Handling ───────────────────────────────────────

self.addEventListener('message', (event) => {
  const { type } = event.data;

  switch (type) {
    case 'CLEAR_API_CACHE':
      clearHorizonAPICache();
      break;
    case 'CLEAR_ALL_CACHE':
      clearAllCaches();
      break;
    case 'GET_CACHE_STATUS':
      getCacheStatus().then((status) => {
        event.ports[0].postMessage(status);
      });
      break;
  }
});

async function clearHorizonAPICache() {
  const cache = await caches.open(CACHE_NAME);
  const requests = await cache.keys();
  const horizonRequests = requests.filter((r) => isHorizonAPICall(r.url));
  await Promise.all(horizonRequests.map((r) => cache.delete(r)));
}

async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map((name) => caches.delete(name)));
}

async function getCacheStatus() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const requests = await cache.keys();
    return {
      cacheName: CACHE_NAME,
      totalEntries: requests.length,
      apiCacheEntries: requests.filter((r) => isHorizonAPICall(r.url)).length,
      staticCacheEntries: requests.filter((r) => isStaticAsset(r.url)).length,
      timestamp: Date.now(),
    };
  } catch (error) {
    return { error: error.message, timestamp: Date.now() };
  }
}
