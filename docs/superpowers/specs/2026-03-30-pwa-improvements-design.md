# PWA Improvements Design Spec

**Date**: 2026-03-30
**Status**: Approved
**Category**: Feature
**Issue**: PWA Features Improvements #25

## Problem

PWA support exists (manifest, service worker, caching config, IndexedDB) but offline functionality is missing, there's no install prompt, no background sync, and no push notifications. The service worker is disabled by default and not auto-registered.

## Solution

Four-layer PWA enhancement: improved service worker, offline experience, install prompt, and push notifications.

## Architecture

| Layer | Purpose |
|-------|---------|
| Service Worker | Enable by default, cache app shell + API responses, serve offline fallback, handle push events |
| Offline Experience | Offline page, cached data display, "you're offline" banner |
| Install Prompt | Custom install button with smart timing, `beforeinstallprompt` interception |
| Push Notifications | VAPID-based Web Push via existing Express backend + Redis for subscriptions |

---

## Layer 1: Service Worker Improvements

### Changes to existing files

**`src/config/cacheConfig.ts`**
- Change `ENABLE_SERVICE_WORKER` from `false` to `true`

**`src/lib/serviceWorkerManager.ts`**
- No changes needed — already has `register()`, `enable()`, `getStatus()`

**`src/components/RiskDataInitializer.jsx`** (or equivalent app-level component)
- Auto-register service worker on app mount (call `ServiceWorkerManager.register()`)
- Currently SW only registers when user manually enables via CacheManagementDashboard

**`public/sw.js`**
- Add precache list for static app routes (`/`, `/about`, `/features`, `/pricing`, `/how-it-works`, `/technologies`, `/wallet`, `/landing`)
- Add offline fallback: when network fails and no cache hit, serve `/offline`
- Add `push` event listener for push notifications (see Layer 4)
- Add `notificationclick` event listener for notification click handling

### Caching Strategy
- **App shell (HTML pages)**: Network-first, fall back to cache, then offline page
- **Static assets (JS/CSS/images/fonts)**: Cache-first (existing behavior, keep as-is)
- **API calls (Horizon/Soroban)**: Stale-while-revalidate with 5-min TTL (existing behavior, keep as-is)

---

## Layer 2: Offline Experience

### New: Offline Page (`src/app/offline/page.js`)
- Client component with dark theme matching app design
- Shows "You're offline" heading with wifi-off icon
- Displays last-cached risk score and wallet info from IndexedDB/localStorage if available
- "Try Again" button that calls `window.location.reload()`
- Auto-detects when connection restores via `online` event and redirects to `/`
- Must be precached by the service worker so it's available offline

### New: Offline Banner (`src/components/OfflineBanner.jsx`)
- Small, non-intrusive banner at the top of the viewport
- Appears when `navigator.onLine` becomes `false` (listens to `offline` event)
- Disappears when `online` event fires
- Text: "You're offline. Showing cached data."
- Styled as a subtle amber/warning bar
- Added to root layout so it's visible on all pages

---

## Layer 3: Install Prompt

### New: `src/hooks/useInstallPrompt.js`
- Intercepts `beforeinstallprompt` event, stores the deferred prompt
- Tracks page visit count in sessionStorage
- Only shows install prompt after 2+ page navigations (not immediately)
- Checks if app is already installed (`display-mode: standalone` media query)
- Tracks dismissal in localStorage with 7-day expiry
- Exposes: `canInstall`, `isInstalled`, `promptInstall()`, `dismissPrompt()`

### New: `src/components/InstallPrompt.jsx`
- Renders a dismissible banner/card when `canInstall` is true
- Shows app icon, name, and "Install Riskon" CTA button
- "Not now" dismiss option
- Calls `trackEvent('app_installed')` via analytics on successful install
- Hidden when already installed or dismissed within 7 days
- Positioned as a bottom sheet / floating card

### Integration
- Add `<InstallPrompt />` to root layout, alongside `<OfflineBanner />`

---

## Layer 4: Push Notifications

### Client Side

**New: `src/lib/pushNotifications.js`**
- `requestPermission()` — asks for notification permission
- `subscribe(walletAddress, preferences)` — creates PushSubscription via `registration.pushManager.subscribe()`, sends to backend
- `unsubscribe(walletAddress)` — unsubscribes and notifies backend
- `updatePreferences(walletAddress, preferences)` — updates which notification types the user wants
- `getSubscriptionStatus()` — checks current subscription state
- Uses `NEXT_PUBLIC_VAPID_PUBLIC_KEY` for applicationServerKey
- Uses `NEXT_PUBLIC_PUSH_API_URL` for backend API calls

**New: `src/components/NotificationSettings.jsx`**
- UI for managing notification preferences
- Three toggles:
  - Risk score alerts (tier changes)
  - Transaction updates (completion/failure)
  - Liquidity alerts (significant pool changes)
- Subscribe/unsubscribe button
- Shows current permission state
- Only visible when wallet is connected (notifications are keyed to wallet address)

**`public/sw.js` additions**
- `push` event listener: receives notification payload, shows notification via `self.registration.showNotification()`
- `notificationclick` event listener: opens the app to the relevant page based on notification type
  - Risk alerts → `/` (main page with risk score)
  - Transaction updates → `/wallet`
  - Liquidity alerts → `/` (BlendDashboard)

### Backend Side (existing Express server at `backend/`)

**New: `backend/pushService.js`**
- Uses `web-push` npm package
- VAPID key management (reads from env vars)
- `sendNotification(walletAddress, payload)` — sends push to all subscriptions for a wallet
- `sendBulkNotification(walletAddresses, payload)` — batch send
- Notification payload format: `{ type, title, body, url, data }`

**New: `backend/pushRoutes.js`**
- `POST /push/subscribe` — stores subscription + preferences in Redis (key: `push:${walletAddress}`)
- `DELETE /push/unsubscribe` — removes subscription from Redis
- `PUT /push/preferences` — updates notification type preferences
- `GET /push/vapid-key` — returns the public VAPID key
- Input validation on all endpoints

**Modify: `backend/liquidityMonitor.js`**
- After detecting significant liquidity changes, call `pushService.sendBulkNotification()` for users subscribed to liquidity alerts

**Redis Schema:**
```
push:{walletAddress} → JSON {
  subscription: PushSubscription object,
  preferences: { riskAlerts: bool, txUpdates: bool, liquidityAlerts: bool },
  createdAt: timestamp
}
```

**New dependency for backend:**
- `web-push` npm package (added to `backend/package.json`)

### Notification Triggers

| Event | Where triggered | Who receives |
|-------|----------------|-------------|
| Risk tier change | `src/app/page.js` after `submitRiskScore` success — calls backend endpoint | The user whose tier changed |
| Transaction complete/fail | `src/components/BlendDashboard.jsx` after `handleBlendOperation` result — calls backend endpoint | The user who submitted the transaction |
| Liquidity change | `backend/liquidityMonitor.js` when significant change detected | All users subscribed to liquidity alerts |

For risk and transaction notifications, the client sends a "notify me" request to the backend after the event occurs. The backend then pushes the notification back via Web Push. This avoids the client needing to send push notifications directly.

---

## Environment Variables

| Variable | Where | Required | Description |
|----------|-------|----------|-------------|
| `VAPID_PUBLIC_KEY` | Backend | Yes (for push) | VAPID public key |
| `VAPID_PRIVATE_KEY` | Backend | Yes (for push) | VAPID private key |
| `VAPID_EMAIL` | Backend | Yes (for push) | Contact email for VAPID |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Frontend | Yes (for push) | Same public key, client-accessible |
| `NEXT_PUBLIC_PUSH_API_URL` | Frontend | Yes (for push) | Backend push API URL |

VAPID keys can be generated via `web-push generate-vapid-keys`.

---

## Files Summary

### New Files
- `src/app/offline/page.js` — Offline fallback page
- `src/components/OfflineBanner.jsx` — Online/offline status banner
- `src/hooks/useInstallPrompt.js` — Install prompt logic hook
- `src/components/InstallPrompt.jsx` — Install prompt UI
- `src/lib/pushNotifications.js` — Push notification client utilities
- `src/components/NotificationSettings.jsx` — Notification preferences UI
- `backend/pushService.js` — Web Push sending service
- `backend/pushRoutes.js` — Push API endpoints

### Modified Files
- `src/config/cacheConfig.ts` — Enable service worker by default
- `public/sw.js` — Add precaching, offline fallback, push/notification handlers
- `src/app/layout.js` — Add OfflineBanner and InstallPrompt components, auto-register SW
- `src/app/page.js` — Trigger risk tier notification after score submission
- `src/components/BlendDashboard.jsx` — Trigger transaction notification after operation
- `backend/liquidityMonitor.js` — Trigger liquidity notifications
- `backend/package.json` — Add `web-push` dependency
- `src/lib/analytics.js` — Add `app_installed` event tracker

### Privacy
- Push subscriptions tied to wallet address (no PII collected)
- Users control which notification types they receive via toggles
- Unsubscribe removes all data from Redis
- No tracking beyond what user explicitly opts into
