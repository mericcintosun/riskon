# Observability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add analytics, error tracking, performance monitoring, and custom user behavior events to the Riskon app.

**Architecture:** Three-layer observability: Vercel Analytics (page views + custom events), Vercel Speed Insights (Web Vitals), and Sentry (error tracking). A centralized `analytics.js` module provides typed tracking helpers used across wallet, transaction, and risk score flows.

**Tech Stack:** `@vercel/analytics`, `@vercel/speed-insights`, `@sentry/nextjs`

---

## File Structure

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `src/lib/analytics.js` | Centralized event tracking helpers wrapping `@vercel/analytics` `track()` |
| Create | `sentry.client.config.js` | Sentry client-side initialization |
| Create | `sentry.server.config.js` | Sentry server-side initialization |
| Create | `sentry.edge.config.js` | Sentry edge runtime initialization |
| Create | `src/app/global-error.js` | Next.js App Router global error page with Sentry reporting |
| Modify | `package.json` | Add 3 new dependencies |
| Modify | `next.config.mjs` | Wrap config with `withSentryConfig()` |
| Modify | `src/app/layout.js` | Add `<Analytics />` and `<SpeedInsights />` components |
| Modify | `src/components/ErrorBoundary.jsx` | Wire `Sentry.captureException()` in `logErrorToService()` |
| Modify | `src/contexts/WalletContext.js` | Add wallet event tracking calls |
| Modify | `src/components/BlendDashboard.jsx` | Add transaction event tracking calls |
| Modify | `src/app/page.js` | Add risk score event tracking calls |
| Modify | `src/config/env.ts` | Add `NEXT_PUBLIC_SENTRY_DSN` to client env schema |

---

### Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install packages**

```bash
cd "/Users/darshan/Documents/stellar 2/riskon"
npm install @vercel/analytics @vercel/speed-insights @sentry/nextjs
```

- [ ] **Step 2: Verify installation**

```bash
cd "/Users/darshan/Documents/stellar 2/riskon"
node -e "require('@vercel/analytics'); require('@vercel/speed-insights'); require('@sentry/nextjs'); console.log('All packages installed successfully')"
```

Expected: `All packages installed successfully`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add observability dependencies (vercel analytics, speed insights, sentry)"
```

---

### Task 2: Create Analytics Utility Module

**Files:**
- Create: `src/lib/analytics.js`

- [ ] **Step 1: Create `src/lib/analytics.js`**

```js
import { track } from '@vercel/analytics';

// ── Wallet Events ──────────────────────────────────────────

export function trackWalletConnected(walletType) {
  track('wallet_connected', { wallet_type: walletType });
}

export function trackWalletDisconnected(walletType) {
  track('wallet_disconnected', { wallet_type: walletType });
}

export function trackWalletError(errorMessage) {
  track('wallet_error', { error_message: errorMessage });
}

// ── Transaction Events ─────────────────────────────────────

export function trackTransactionSubmitted(type, amount, asset) {
  track('transaction_submitted', { type, amount: String(amount), asset });
}

export function trackTransactionSuccess(type, amount, asset, txHash) {
  track('transaction_success', { type, amount: String(amount), asset, tx_hash: txHash });
}

export function trackTransactionFailed(type, errorMessage) {
  track('transaction_failed', { type, error_message: errorMessage });
}

// ── Risk Score Events ──────────────────────────────────────

export function trackRiskScoreLookup(address) {
  track('risk_score_lookup', { address });
}

export function trackRiskTierChanged(oldTier, newTier) {
  track('risk_tier_changed', { old_tier: String(oldTier), new_tier: String(newTier) });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/analytics.js
git commit -m "feat: add centralized analytics tracking utility"
```

---

### Task 3: Add Vercel Analytics and Speed Insights to Layout

**Files:**
- Modify: `src/app/layout.js:1-2` (imports) and `src/app/layout.js:49-50` (components)

- [ ] **Step 1: Add imports to `src/app/layout.js`**

Add after line 2 (`import "./globals.css";`):

```js
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
```

- [ ] **Step 2: Add components inside `<body>` in `src/app/layout.js`**

Add `<Analytics />` and `<SpeedInsights />` right after the closing `</ErrorBoundary>` tag, as siblings inside `<body>`. The body should look like:

```jsx
<body className="bg-black min-h-screen text-white antialiased flex flex-col">
  <ErrorBoundary>
    <ToastProvider>
      <WalletProvider>
        <RiskDataInitializer />
        <div className="flex-1">
          {children}
        </div>
        <Footer />
      </WalletProvider>
    </ToastProvider>
  </ErrorBoundary>
  <Analytics />
  <SpeedInsights />
</body>
```

- [ ] **Step 3: Verify the app builds**

```bash
cd "/Users/darshan/Documents/stellar 2/riskon"
npm run build
```

Expected: Build succeeds without errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/layout.js
git commit -m "feat: add Vercel Analytics and Speed Insights to root layout"
```

---

### Task 4: Configure Sentry

**Files:**
- Create: `sentry.client.config.js`
- Create: `sentry.server.config.js`
- Create: `sentry.edge.config.js`
- Create: `src/app/global-error.js`
- Modify: `next.config.mjs`
- Modify: `src/config/env.ts`

- [ ] **Step 1: Add `NEXT_PUBLIC_SENTRY_DSN` to env schema in `src/config/env.ts`**

Add to the `clientEnvSchema` object, after the `NEXT_PUBLIC_ENVIRONMENT` field (line 80):

```ts
  // Observability
  NEXT_PUBLIC_SENTRY_DSN: urlSchema.optional(),
```

- [ ] **Step 2: Create `sentry.client.config.js` in project root**

```js
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Only enable in production
  enabled: process.env.NODE_ENV === "production",

  // Set tracesSampleRate to 1.0 to capture 100% of transactions for performance monitoring.
  // Adjust in production to a lower value to reduce costs.
  tracesSampleRate: 0.1,

  // Capture Replay for 10% of all sessions, plus 100% of sessions with an error.
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration(),
  ],
});
```

- [ ] **Step 3: Create `sentry.server.config.js` in project root**

```js
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  enabled: process.env.NODE_ENV === "production",

  tracesSampleRate: 0.1,
});
```

- [ ] **Step 4: Create `sentry.edge.config.js` in project root**

```js
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  enabled: process.env.NODE_ENV === "production",

  tracesSampleRate: 0.1,
});
```

- [ ] **Step 5: Create `src/app/global-error.js`**

```js
"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body className="bg-black min-h-screen text-white flex items-center justify-center">
        <div className="text-center p-8">
          <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
          <button
            onClick={() => reset()}
            className="bg-violet-500 hover:bg-violet-600 text-white px-6 py-3 rounded-xl"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
```

- [ ] **Step 6: Wrap `next.config.mjs` with `withSentryConfig`**

Replace the entire `next.config.mjs` with the following. The only changes are: (1) import `withSentryConfig` at top, (2) wrap the export at the bottom.

```js
import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const isProduction = process.env.NODE_ENV === "production";

const contentSecurityPolicy = `
  default-src 'self';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  object-src 'none';
  script-src 'self' 'unsafe-inline' ${isProduction ? "" : "'unsafe-eval'"} https:;
  style-src 'self' 'unsafe-inline' https:;
  img-src 'self' data: blob: https:;
  font-src 'self' data: https:;
  connect-src 'self' https://horizon-testnet.stellar.org https://soroban-testnet.stellar.org https://*.stellar.org https://*.sentry.io https:;
  worker-src 'self' blob:;
  frame-src 'self';
  upgrade-insecure-requests;
`
  .replace(/\s{2,}/g, " ")
  .trim();

const nextConfig = {
  transpilePackages: [
    "passkey-kit",
    "passkey-factory-sdk",
    "passkey-kit-sdk",
    "sac-sdk",
    "@stellar/stellar-sdk",
  ],
  turbopack: {
    resolveAlias: {
      "sodium-native": "./src/lib/mocks/empty.js",
    },
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        "sodium-native": false,
      };
    }
    return config;
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: contentSecurityPolicy,
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // Suppress source map upload logs during build
  silent: true,

  // Upload source maps for better stack traces
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,
});
```

Note: The CSP `connect-src` directive now includes `https://*.sentry.io` to allow Sentry to send error reports.

- [ ] **Step 7: Verify the app builds**

```bash
cd "/Users/darshan/Documents/stellar 2/riskon"
npm run build
```

Expected: Build succeeds. Sentry warnings about missing DSN are expected locally (it's disabled outside production).

- [ ] **Step 8: Commit**

```bash
git add sentry.client.config.js sentry.server.config.js sentry.edge.config.js src/app/global-error.js next.config.mjs src/config/env.ts
git commit -m "feat: configure Sentry error tracking with client, server, and edge configs"
```

---

### Task 5: Wire Sentry into ErrorBoundary

**Files:**
- Modify: `src/components/ErrorBoundary.jsx:1-2` (imports) and `src/components/ErrorBoundary.jsx:34-41` (`logErrorToService` method)

- [ ] **Step 1: Add Sentry import to `src/components/ErrorBoundary.jsx`**

Add after line 3 (`import React from "react";`):

```js
import * as Sentry from "@sentry/nextjs";
```

- [ ] **Step 2: Replace the `logErrorToService` method body**

Replace the `logErrorToService` method (lines 34-41) with:

```js
  logErrorToService(error, errorInfo) {
    Sentry.captureException(error, {
      contexts: {
        react: { componentStack: errorInfo?.componentStack },
      },
    });
  }
```

This removes the production-only guard because Sentry's own `enabled` flag (set in `sentry.client.config.js`) handles that. In development, Sentry is disabled so the call is a no-op.

- [ ] **Step 3: Commit**

```bash
git add src/components/ErrorBoundary.jsx
git commit -m "feat: wire Sentry.captureException into ErrorBoundary"
```

---

### Task 6: Add Wallet Event Tracking

**Files:**
- Modify: `src/contexts/WalletContext.js`

- [ ] **Step 1: Add analytics import to `src/contexts/WalletContext.js`**

Add after line 9 (the `import` from `../lib/passkeyWallet`):

```js
import { trackWalletConnected, trackWalletDisconnected, trackWalletError } from "../lib/analytics";
```

- [ ] **Step 2: Track wallet connect success**

In the `connectWallet` function, after the `return` statement at line 104 (the direct wallet connection success path), add tracking right before the return. The block around lines 98-105 should become:

```js
        setConnectedWallet(sanitizedWalletName);

        // Save to localStorage
        setSafeLocalStorageItem("connectedWallet", sanitizedWalletName);
        setSafeLocalStorageItem("walletAddress", validatedAddress.sanitized);

        trackWalletConnected(sanitizedWalletName);

        return {
          success: true,
          walletName: sanitizedWalletName,
          address: validatedAddress.sanitized,
        };
```

- [ ] **Step 3: Track modal wallet connect success**

In the modal `onWalletSelected` callback, after line 135 (`setSafeLocalStorageItem("walletAddress", ...)`), add before the `resolve()`:

```js
                  trackWalletConnected(sanitizedWalletName);
```

- [ ] **Step 4: Track wallet disconnect**

In the `disconnectWallet` function, after line 244 (`setConnectedWallet(null);`), add:

```js
    trackWalletDisconnected(connectedWallet || "unknown");
```

- [ ] **Step 5: Track wallet errors**

In the `connectWallet` catch block, before `throw enhancedError;` (line 233), add:

```js
      trackWalletError(enhancedError.message);
```

- [ ] **Step 6: Track passkey connect success**

In `connectPasskey`, after line 283 (`setSafeLocalStorageItem("passkeyKeyId", ...)`), add:

```js
        trackWalletConnected("Passkey");
```

- [ ] **Step 7: Commit**

```bash
git add src/contexts/WalletContext.js
git commit -m "feat: add wallet connect/disconnect/error analytics tracking"
```

---

### Task 7: Add Transaction Event Tracking

**Files:**
- Modify: `src/components/BlendDashboard.jsx`

- [ ] **Step 1: Add analytics import to `src/components/BlendDashboard.jsx`**

Add at the top imports section:

```js
import { trackTransactionSubmitted, trackTransactionSuccess, trackTransactionFailed } from "../lib/analytics";
```

- [ ] **Step 2: Track transaction submitted**

In `handleBlendOperation`, after the amount validation (after line 173 `throw new Error("Please enter a valid amount");`), add before the `createBlendOperation` call:

```js
      trackTransactionSubmitted(operationType, amount, selectedAsset);
```

- [ ] **Step 3: Track transaction success**

After the successful transaction hash check (line 194), inside the `if (result && typeof result === "string" && result.length === 64)` block, add:

```js
        trackTransactionSuccess(operationType, amount, selectedAsset, result);
```

And in the `else` block (line 209, simulation success), add:

```js
        trackTransactionSuccess(operationType, amount, selectedAsset, "simulation");
```

- [ ] **Step 4: Track transaction failure**

In the catch block (after line 222 `console.error("DeFi transaction error:", error);`), add:

```js
      trackTransactionFailed(operationType, error.message);
```

- [ ] **Step 5: Commit**

```bash
git add src/components/BlendDashboard.jsx
git commit -m "feat: add transaction analytics tracking to BlendDashboard"
```

---

### Task 8: Add Risk Score Event Tracking

**Files:**
- Modify: `src/app/page.js`

- [ ] **Step 1: Add analytics import to `src/app/page.js`**

Add to the imports section at the top:

```js
import { trackRiskScoreLookup, trackRiskTierChanged } from "../lib/analytics";
```

- [ ] **Step 2: Track risk score submission**

In `submitRiskScore`, after line 369 (`setIsLoading(true);`), add:

```js
      trackRiskScoreLookup(walletAddress);
```

- [ ] **Step 3: Track risk tier change on successful submission**

After the `setTransactionHash(hash);` line (line 384), add:

```js
      // Track risk tier change
      const tier = riskScore <= 30 ? 1 : riskScore <= 70 ? 2 : 3;
      trackRiskTierChanged("unknown", tier);
```

- [ ] **Step 4: Commit**

```bash
git add src/app/page.js
git commit -m "feat: add risk score analytics tracking"
```

---

### Task 9: Update Environment Documentation

**Files:**
- Modify: `src/config/ENV_VALIDATION_README.md` (if it exists, add the new env vars)

- [ ] **Step 1: Check if ENV_VALIDATION_README.md exists and update it**

If the file exists, add the following to the appropriate section:

```md
### Observability

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SENTRY_DSN` | No (required for error tracking) | Sentry project DSN URL |
| `SENTRY_AUTH_TOKEN` | No (build-time only) | Sentry auth token for source map uploads |
| `SENTRY_ORG` | No (build-time only) | Sentry organization slug |
| `SENTRY_PROJECT` | No (build-time only) | Sentry project slug |
```

- [ ] **Step 2: Verify final build**

```bash
cd "/Users/darshan/Documents/stellar 2/riskon"
npm run build
```

Expected: Clean build with no errors.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: complete observability setup - analytics, error tracking, and performance monitoring"
```
