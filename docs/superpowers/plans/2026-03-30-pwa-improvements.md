# PWA Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add offline support, install prompt, and push notifications to the existing PWA setup (Issue #25).

**Architecture:** Four layers — (1) Enable & improve existing service worker with precaching and offline fallback, (2) Offline page and banner, (3) Install prompt with smart timing, (4) VAPID-based push notifications via existing Express backend + Redis.

**Tech Stack:** Service Worker API, Web Push API, `web-push` (backend), Redis, existing Next.js App Router + Express backend.

---

## File Structure

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `src/config/cacheConfig.ts` | Enable service worker by default |
| Modify | `public/sw.js` | Add precaching for app routes, offline fallback, push + notificationclick handlers |
| Create | `src/app/offline/page.js` | Offline fallback page |
| Create | `src/components/OfflineBanner.jsx` | Online/offline status banner |
| Create | `src/hooks/useInstallPrompt.js` | Install prompt logic hook |
| Create | `src/components/InstallPrompt.jsx` | Install prompt UI component |
| Create | `src/lib/pushNotifications.js` | Push notification client utilities |
| Create | `src/components/NotificationSettings.jsx` | Notification preferences UI |
| Create | `backend/pushService.js` | Web Push sending service |
| Create | `backend/pushRoutes.js` | Push API REST endpoints |
| Modify | `backend/package.json` | Add `web-push` dependency |
| Modify | `backend/liquidityMonitor.js` | Mount push routes, trigger liquidity notifications |
| Modify | `src/app/layout.js` | Add OfflineBanner, InstallPrompt, auto-register SW |
| Modify | `src/lib/analytics.js` | Add `app_installed` event tracker |
| Modify | `src/app/page.js` | Trigger risk tier push notification |
| Modify | `src/components/BlendDashboard.jsx` | Trigger transaction push notification |

---

### Task 1: Enable Service Worker by Default

**Files:**
- Modify: `src/config/cacheConfig.ts:50`

- [ ] **Step 1: Change `ENABLE_SERVICE_WORKER` to `true`**

In `src/config/cacheConfig.ts`, change line 50 from:

```ts
  ENABLE_SERVICE_WORKER: false, // Default to disabled, user can enable
```

to:

```ts
  ENABLE_SERVICE_WORKER: true, // Enabled by default for PWA support
```

- [ ] **Step 2: Commit**

```bash
git add src/config/cacheConfig.ts
git commit -m "feat(pwa): enable service worker by default"
```

---

### Task 2: Improve Service Worker — Precaching, Offline Fallback, Push Handlers

**Files:**
- Modify: `public/sw.js`

- [ ] **Step 1: Update `public/sw.js` with the complete new content**

Replace the entire contents of `public/sw.js` with:

```js
// Service Worker for Riskon PWA
// Handles: static asset caching, API caching, offline fallback, push notifications

const CACHE_NAME = 'riskon-cache-v2';
const STATIC_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const API_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// App shell routes to precache
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

// Horizon API patterns to cache
const HORIZON_API_PATTERNS = [
  /^https:\/\/horizon(-testnet)?\.stellar\.org\/accounts\/[^\/]+$/,
  /^https:\/\/horizon(-testnet)?\.stellar\.org\/accounts\/[^\/]+\/payments/,
  /^https:\/\/horizon(-testnet)?\.stellar\.org\/accounts\/[^\/]+\/transactions/,
];

// ── Install ────────────────────────────────────────────────

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

// ── Activate ───────────────────────────────────────────────

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

// ── Fetch ──────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const { url, method } = request;

  if (method !== 'GET') return;

  // Horizon API — stale-while-revalidate
  if (isHorizonAPICall(url)) {
    event.respondWith(handleAPIRequest(request));
    return;
  }

  // Navigation requests — network-first, fallback to cache, then offline page
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  // Static assets — cache-first
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
```

- [ ] **Step 2: Commit**

```bash
git add public/sw.js
git commit -m "feat(pwa): improve service worker with precaching, offline fallback, and push handlers"
```

---

### Task 3: Create Offline Page

**Files:**
- Create: `src/app/offline/page.js`

- [ ] **Step 1: Create `src/app/offline/page.js`**

```js
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function OfflinePage() {
  const router = useRouter();

  useEffect(() => {
    const handleOnline = () => {
      router.push("/");
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 text-center border border-white/20">
          <div className="w-16 h-16 mx-auto mb-6 bg-amber-500/20 rounded-2xl flex items-center justify-center">
            <svg
              className="w-8 h-8 text-amber-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18.364 5.636a9 9 0 010 12.728m-2.829-2.829a5 5 0 000-7.07m-4.243 4.243a1 1 0 110-2.828"
              />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-white mb-4">
            You&apos;re Offline
          </h1>

          <p className="text-white/70 mb-6">
            It looks like you&apos;ve lost your internet connection. Some
            features may be unavailable until you&apos;re back online.
          </p>

          <p className="text-white/50 text-sm mb-6">
            This page will automatically redirect when your connection is
            restored.
          </p>

          <button
            onClick={() => window.location.reload()}
            className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02]"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/offline/page.js
git commit -m "feat(pwa): add offline fallback page"
```

---

### Task 4: Create Offline Banner

**Files:**
- Create: `src/components/OfflineBanner.jsx`

- [ ] **Step 1: Create `src/components/OfflineBanner.jsx`**

```jsx
"use client";

import { useState, useEffect } from "react";

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    setIsOffline(!navigator.onLine);

    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-600 text-white text-center py-2 px-4 text-sm font-medium">
      You&apos;re offline. Showing cached data.
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/OfflineBanner.jsx
git commit -m "feat(pwa): add offline status banner component"
```

---

### Task 5: Create Install Prompt Hook and Component

**Files:**
- Create: `src/hooks/useInstallPrompt.js`
- Create: `src/components/InstallPrompt.jsx`
- Modify: `src/lib/analytics.js`

- [ ] **Step 1: Create `src/hooks/useInstallPrompt.js`**

```js
"use client";

import { useState, useEffect, useCallback } from "react";

const DISMISS_KEY = "install_prompt_dismissed";
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days
const MIN_PAGE_VISITS = 2;
const VISIT_COUNT_KEY = "install_prompt_visits";

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    // Check if already installed
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone;
    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Track page visits
    const visits = parseInt(sessionStorage.getItem(VISIT_COUNT_KEY) || "0", 10) + 1;
    sessionStorage.setItem(VISIT_COUNT_KEY, String(visits));

    // Check if dismissed recently
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt && Date.now() - parseInt(dismissedAt, 10) < DISMISS_DURATION) {
      return;
    }

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (visits >= MIN_PAGE_VISITS) {
        setCanInstall(true);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return false;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setCanInstall(false);
    return outcome === "accepted";
  }, [deferredPrompt]);

  const dismissPrompt = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setCanInstall(false);
  }, []);

  return { canInstall, isInstalled, promptInstall, dismissPrompt };
}
```

- [ ] **Step 2: Add `trackAppInstalled` to `src/lib/analytics.js`**

Add at the end of the file:

```js
// ── PWA Events ─────────────────────────────────────────────

export function trackAppInstalled() {
  track('app_installed');
}
```

- [ ] **Step 3: Create `src/components/InstallPrompt.jsx`**

```jsx
"use client";

import { useInstallPrompt } from "../hooks/useInstallPrompt";
import { trackAppInstalled } from "../lib/analytics";

export default function InstallPrompt() {
  const { canInstall, promptInstall, dismissPrompt } = useInstallPrompt();

  if (!canInstall) return null;

  const handleInstall = async () => {
    const accepted = await promptInstall();
    if (accepted) {
      trackAppInstalled();
    }
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md">
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 shadow-2xl flex items-center gap-4">
        <img src="/icon-192.png" alt="Riskon" className="w-12 h-12 rounded-xl" />
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm">Install Riskon</p>
          <p className="text-white/60 text-xs">
            Add to home screen for quick access
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={dismissPrompt}
            className="text-white/50 hover:text-white/80 text-xs px-2 py-1"
          >
            Not now
          </button>
          <button
            onClick={handleInstall}
            className="bg-violet-500 hover:bg-violet-600 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            Install
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useInstallPrompt.js src/components/InstallPrompt.jsx src/lib/analytics.js
git commit -m "feat(pwa): add install prompt with smart timing and analytics"
```

---

### Task 6: Integrate Offline Banner, Install Prompt, and Auto-Register SW into Layout

**Files:**
- Modify: `src/app/layout.js`

- [ ] **Step 1: Add imports to `src/app/layout.js`**

Add after the existing SpeedInsights import:

```js
import OfflineBanner from "../components/OfflineBanner";
import InstallPrompt from "../components/InstallPrompt";
```

- [ ] **Step 2: Add components to the body**

Add `<OfflineBanner />` and `<InstallPrompt />` right after `<SpeedInsights />` inside the body tag:

```jsx
        <Analytics />
        <SpeedInsights />
        <OfflineBanner />
        <InstallPrompt />
```

- [ ] **Step 3: Auto-register service worker**

Add a new client component for SW registration. Create `src/components/ServiceWorkerRegistrar.jsx`:

```jsx
"use client";

import { useEffect } from "react";
import { serviceWorkerManager } from "../lib/serviceWorkerManager";

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    serviceWorkerManager.register();
  }, []);

  return null;
}
```

Then import and add it in `layout.js`. Add to imports:

```js
import ServiceWorkerRegistrar from "../components/ServiceWorkerRegistrar";
```

Add inside the body, after `<InstallPrompt />`:

```jsx
        <ServiceWorkerRegistrar />
```

- [ ] **Step 4: Commit**

```bash
git add src/app/layout.js src/components/ServiceWorkerRegistrar.jsx
git commit -m "feat(pwa): integrate offline banner, install prompt, and auto SW registration into layout"
```

---

### Task 7: Create Push Notification Client Utilities

**Files:**
- Create: `src/lib/pushNotifications.js`

- [ ] **Step 1: Create `src/lib/pushNotifications.js`**

```js
const PUSH_API_URL = process.env.NEXT_PUBLIC_PUSH_API_URL || "";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function requestPermission() {
  if (!("Notification" in window)) {
    return "unsupported";
  }
  if (Notification.permission === "granted") {
    return "granted";
  }
  if (Notification.permission === "denied") {
    return "denied";
  }
  return await Notification.requestPermission();
}

export async function subscribe(walletAddress, preferences) {
  const permission = await requestPermission();
  if (permission !== "granted") {
    return { success: false, reason: permission };
  }

  const registration = await navigator.serviceWorker.ready;
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  if (!vapidKey) {
    return { success: false, reason: "no_vapid_key" };
  }

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey),
  });

  const response = await fetch(`${PUSH_API_URL}/push/subscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      walletAddress,
      subscription: subscription.toJSON(),
      preferences: preferences || {
        riskAlerts: true,
        txUpdates: true,
        liquidityAlerts: true,
      },
    }),
  });

  if (!response.ok) {
    return { success: false, reason: "server_error" };
  }

  return { success: true, subscription };
}

export async function unsubscribe(walletAddress) {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  if (subscription) {
    await subscription.unsubscribe();
  }

  if (PUSH_API_URL) {
    await fetch(`${PUSH_API_URL}/push/unsubscribe`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ walletAddress }),
    });
  }

  return { success: true };
}

export async function updatePreferences(walletAddress, preferences) {
  const response = await fetch(`${PUSH_API_URL}/push/preferences`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ walletAddress, preferences }),
  });

  return { success: response.ok };
}

export async function getSubscriptionStatus() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { supported: false, subscribed: false, permission: "unsupported" };
  }

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  return {
    supported: true,
    subscribed: !!subscription,
    permission: Notification.permission,
  };
}

export async function triggerNotification(walletAddress, type, data) {
  if (!PUSH_API_URL) return { success: false, reason: "no_api_url" };

  const response = await fetch(`${PUSH_API_URL}/push/notify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ walletAddress, type, data }),
  });

  return { success: response.ok };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/pushNotifications.js
git commit -m "feat(pwa): add push notification client utilities"
```

---

### Task 8: Create Notification Settings Component

**Files:**
- Create: `src/components/NotificationSettings.jsx`

- [ ] **Step 1: Create `src/components/NotificationSettings.jsx`**

```jsx
"use client";

import { useState, useEffect } from "react";
import { useWallet } from "../contexts/WalletContext";
import {
  subscribe,
  unsubscribe,
  updatePreferences,
  getSubscriptionStatus,
} from "../lib/pushNotifications";

export default function NotificationSettings() {
  const { walletAddress, isConnected } = useWallet();
  const [status, setStatus] = useState({
    supported: false,
    subscribed: false,
    permission: "default",
  });
  const [preferences, setPreferences] = useState({
    riskAlerts: true,
    txUpdates: true,
    liquidityAlerts: true,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getSubscriptionStatus().then(setStatus);
  }, []);

  if (!isConnected || !status.supported) return null;

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const result = await subscribe(walletAddress, preferences);
      if (result.success) {
        setStatus((prev) => ({ ...prev, subscribed: true, permission: "granted" }));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    setLoading(true);
    try {
      await unsubscribe(walletAddress);
      setStatus((prev) => ({ ...prev, subscribed: false }));
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (key) => {
    const updated = { ...preferences, [key]: !preferences[key] };
    setPreferences(updated);
    if (status.subscribed) {
      await updatePreferences(walletAddress, updated);
    }
  };

  const toggles = [
    { key: "riskAlerts", label: "Risk Score Alerts", desc: "When your risk tier changes" },
    { key: "txUpdates", label: "Transaction Updates", desc: "When transactions complete or fail" },
    { key: "liquidityAlerts", label: "Liquidity Alerts", desc: "Significant pool changes" },
  ];

  return (
    <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
      <h3 className="text-lg font-semibold text-white mb-4">Push Notifications</h3>

      {status.permission === "denied" && (
        <p className="text-amber-400 text-sm mb-4">
          Notifications are blocked. Please enable them in your browser settings.
        </p>
      )}

      {!status.subscribed ? (
        <button
          onClick={handleSubscribe}
          disabled={loading || status.permission === "denied"}
          className="w-full bg-violet-500 hover:bg-violet-600 disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-xl transition-colors mb-4"
        >
          {loading ? "Enabling..." : "Enable Notifications"}
        </button>
      ) : (
        <>
          <div className="space-y-3 mb-4">
            {toggles.map(({ key, label, desc }) => (
              <label
                key={key}
                className="flex items-center justify-between p-3 bg-white/5 rounded-xl cursor-pointer"
              >
                <div>
                  <p className="text-white text-sm font-medium">{label}</p>
                  <p className="text-white/50 text-xs">{desc}</p>
                </div>
                <button
                  onClick={() => handleToggle(key)}
                  className={`w-10 h-6 rounded-full transition-colors relative ${
                    preferences[key] ? "bg-violet-500" : "bg-white/20"
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                      preferences[key] ? "left-5" : "left-1"
                    }`}
                  />
                </button>
              </label>
            ))}
          </div>

          <button
            onClick={handleUnsubscribe}
            disabled={loading}
            className="w-full bg-white/10 hover:bg-white/20 text-white/70 font-medium py-2 px-4 rounded-xl transition-colors text-sm"
          >
            {loading ? "Disabling..." : "Disable All Notifications"}
          </button>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/NotificationSettings.jsx
git commit -m "feat(pwa): add notification settings UI component"
```

---

### Task 9: Backend — Push Service and Routes

**Files:**
- Create: `backend/pushService.js`
- Create: `backend/pushRoutes.js`
- Modify: `backend/package.json`

- [ ] **Step 1: Install `web-push` in backend**

```bash
cd "/Users/darshan/Documents/stellar 2/riskon/backend"
npm install web-push
```

- [ ] **Step 2: Create `backend/pushService.js`**

```js
const webpush = require("web-push");

// Configure VAPID
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_EMAIL = process.env.VAPID_EMAIL || "mailto:admin@riskon.app";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

/**
 * Send a push notification to a specific wallet's subscriptions
 */
async function sendNotification(redisClient, walletAddress, payload) {
  try {
    const data = await redisClient.get(`push:${walletAddress}`);
    if (!data) return { success: false, reason: "no_subscription" };

    const record = JSON.parse(data);
    const subscription = record.subscription;

    // Check if user wants this notification type
    if (payload.type && record.preferences) {
      const typeMap = {
        risk_alert: "riskAlerts",
        tx_update: "txUpdates",
        liquidity_alert: "liquidityAlerts",
      };
      const prefKey = typeMap[payload.type];
      if (prefKey && !record.preferences[prefKey]) {
        return { success: false, reason: "preference_disabled" };
      }
    }

    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return { success: true };
  } catch (error) {
    // If subscription expired, clean up
    if (error.statusCode === 410) {
      await redisClient.del(`push:${walletAddress}`);
      return { success: false, reason: "subscription_expired" };
    }
    console.error("Push notification error:", error);
    return { success: false, reason: error.message };
  }
}

/**
 * Send push notification to multiple wallets
 */
async function sendBulkNotification(redisClient, walletAddresses, payload) {
  const results = await Promise.allSettled(
    walletAddresses.map((addr) => sendNotification(redisClient, addr, payload))
  );
  return {
    sent: results.filter((r) => r.status === "fulfilled" && r.value.success).length,
    failed: results.filter((r) => r.status === "rejected" || !r.value?.success).length,
  };
}

module.exports = { sendNotification, sendBulkNotification };
```

- [ ] **Step 3: Create `backend/pushRoutes.js`**

```js
const express = require("express");

function createPushRouter(redisClient) {
  const router = express.Router();

  // Subscribe to push notifications
  router.post("/subscribe", async (req, res) => {
    try {
      const { walletAddress, subscription, preferences } = req.body;

      if (!walletAddress || !subscription) {
        return res.status(400).json({ error: "walletAddress and subscription are required" });
      }

      const record = {
        subscription,
        preferences: preferences || {
          riskAlerts: true,
          txUpdates: true,
          liquidityAlerts: true,
        },
        createdAt: Date.now(),
      };

      await redisClient.set(`push:${walletAddress}`, JSON.stringify(record));
      res.json({ success: true });
    } catch (error) {
      console.error("Push subscribe error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Unsubscribe from push notifications
  router.delete("/unsubscribe", async (req, res) => {
    try {
      const { walletAddress } = req.body;

      if (!walletAddress) {
        return res.status(400).json({ error: "walletAddress is required" });
      }

      await redisClient.del(`push:${walletAddress}`);
      res.json({ success: true });
    } catch (error) {
      console.error("Push unsubscribe error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update notification preferences
  router.put("/preferences", async (req, res) => {
    try {
      const { walletAddress, preferences } = req.body;

      if (!walletAddress || !preferences) {
        return res.status(400).json({ error: "walletAddress and preferences are required" });
      }

      const data = await redisClient.get(`push:${walletAddress}`);
      if (!data) {
        return res.status(404).json({ error: "No subscription found" });
      }

      const record = JSON.parse(data);
      record.preferences = preferences;
      await redisClient.set(`push:${walletAddress}`, JSON.stringify(record));
      res.json({ success: true });
    } catch (error) {
      console.error("Push preferences error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get VAPID public key
  router.get("/vapid-key", (req, res) => {
    const key = process.env.VAPID_PUBLIC_KEY;
    if (!key) {
      return res.status(500).json({ error: "VAPID keys not configured" });
    }
    res.json({ publicKey: key });
  });

  // Trigger a notification (called by frontend after events)
  router.post("/notify", async (req, res) => {
    try {
      const { walletAddress, type, data } = req.body;

      if (!walletAddress || !type) {
        return res.status(400).json({ error: "walletAddress and type are required" });
      }

      const { sendNotification } = require("./pushService");

      const titles = {
        risk_alert: "Risk Tier Changed",
        tx_update: "Transaction Update",
        liquidity_alert: "Liquidity Alert",
      };

      const payload = {
        title: titles[type] || "Riskon Notification",
        body: data?.message || "You have a new notification",
        type,
        url: data?.url || "/",
      };

      const result = await sendNotification(redisClient, walletAddress, payload);
      res.json(result);
    } catch (error) {
      console.error("Push notify error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}

module.exports = { createPushRouter };
```

- [ ] **Step 4: Commit**

```bash
git add backend/pushService.js backend/pushRoutes.js backend/package.json backend/package-lock.json
git commit -m "feat(pwa): add backend push notification service and API routes"
```

---

### Task 10: Mount Push Routes in Backend Server

**Files:**
- Modify: `backend/liquidityMonitor.js`

- [ ] **Step 1: Add CORS and push routes to `backend/liquidityMonitor.js`**

After the existing `const app = express();` and `app.use(express.json());` lines (around lines 251-253), add:

```js
const cors = require("cors");
const { createPushRouter } = require("./pushRoutes");

app.use(cors());
app.use("/push", createPushRouter(redisClient));
```

Note: `cors` is already a dependency in `backend/package.json`. The `app.use(express.json())` line already exists.

- [ ] **Step 2: Commit**

```bash
git add backend/liquidityMonitor.js
git commit -m "feat(pwa): mount push notification routes in backend server"
```

---

### Task 11: Trigger Push Notifications from Frontend Events

**Files:**
- Modify: `src/app/page.js`
- Modify: `src/components/BlendDashboard.jsx`

- [ ] **Step 1: Add push notification import to `src/app/page.js`**

Add to imports:

```js
import { triggerNotification } from "../lib/pushNotifications";
```

- [ ] **Step 2: Trigger risk alert notification after successful score submission**

In `submitRiskScore`, after the existing `trackRiskTierChanged("unknown", tier);` line (added in the observability task), add:

```js
      triggerNotification(walletAddress, "risk_alert", {
        message: `Your risk tier changed to Tier ${tier}`,
        url: "/",
      });
```

- [ ] **Step 3: Add push notification import to `src/components/BlendDashboard.jsx`**

Add to imports:

```js
import { triggerNotification } from "../lib/pushNotifications";
```

- [ ] **Step 4: Trigger transaction notifications in BlendDashboard**

In `handleBlendOperation`, after the existing `trackTransactionSuccess(operationType, amount, selectedAsset, result);` line inside the tx hash success block, add:

```js
        triggerNotification(walletAddress, "tx_update", {
          message: `${operationType} of ${amount} ${selectedAsset} completed successfully`,
          url: "/wallet",
        });
```

In the catch block, after `trackTransactionFailed(operationType, error.message);`, add:

```js
      triggerNotification(walletAddress, "tx_update", {
        message: `${operationType} failed: ${error.message}`,
        url: "/wallet",
      });
```

- [ ] **Step 5: Commit**

```bash
git add src/app/page.js src/components/BlendDashboard.jsx
git commit -m "feat(pwa): trigger push notifications for risk tier changes and transactions"
```

---

### Task 12: Final Build Verification

**Files:**
- No new files

- [ ] **Step 1: Verify frontend build**

```bash
cd "/Users/darshan/Documents/stellar 2/riskon"
npm run build
```

Expected: Clean build with no errors.

- [ ] **Step 2: Verify backend dependencies**

```bash
cd "/Users/darshan/Documents/stellar 2/riskon/backend"
npm install
node -e "require('web-push'); require('./pushService'); require('./pushRoutes'); console.log('Backend modules OK')"
```

Expected: `Backend modules OK`

- [ ] **Step 3: Commit spec and plan docs**

```bash
cd "/Users/darshan/Documents/stellar 2/riskon"
git add docs/
git commit -m "docs: add PWA improvements spec and implementation plan"
```
