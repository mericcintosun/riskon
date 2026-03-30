# Observability Design Spec

**Date**: 2026-03-30
**Status**: Approved
**Category**: Observability

## Problem

Production issue detection is difficult. No analytics, error tracking, or performance monitoring exists. The app has an `ErrorBoundary` with Sentry stubs but nothing is wired up.

## Solution

Three-layer observability stack using Vercel Analytics, Vercel Speed Insights, and Sentry.

## Architecture

| Layer | Tool | Purpose |
|-------|------|---------|
| Analytics | `@vercel/analytics` | Page views + custom user behavior events |
| Performance | `@vercel/speed-insights` | Web Vitals (LCP, FID, CLS, TTFB, INP) |
| Error Tracking | `@sentry/nextjs` | Error capture, stack traces, breadcrumbs |

## Custom Events (via Vercel Analytics `track()`)

### Wallet Events
- `wallet_connected` — properties: `{ wallet_type }`
- `wallet_disconnected` — properties: `{ wallet_type }`
- `wallet_error` — properties: `{ error_message }`

### Transaction Events
- `transaction_submitted` — properties: `{ type, amount, asset }`
- `transaction_success` — properties: `{ type, amount, asset, tx_hash }`
- `transaction_failed` — properties: `{ type, error_message }`

### Risk Score Events
- `risk_score_lookup` — properties: `{ address }`
- `risk_tier_changed` — properties: `{ old_tier, new_tier }`

## Integration Points

### 1. Root Layout (`src/app/layout.js`)
Add `<Analytics />` and `<SpeedInsights />` components from Vercel packages. These are drop-in components that auto-detect the Vercel environment.

### 2. ErrorBoundary (`src/components/ErrorBoundary.jsx`)
Wire the existing `logErrorToService()` method to call `Sentry.captureException()`. The component already has the integration point ready.

### 3. Analytics Utility Module (`src/lib/analytics.ts`)
Create a centralized module that exports typed tracking functions:
- `trackWalletEvent(event, properties)`
- `trackTransactionEvent(event, properties)`
- `trackRiskScoreEvent(event, properties)`

This module wraps `track()` from `@vercel/analytics` so event names and properties are consistent across the codebase.

### 4. Wallet Tracking (`src/contexts/WalletContext.js` or `src/providers/WalletProvider.jsx`)
Call analytics functions on wallet connect/disconnect/error.

### 5. Transaction Tracking
Instrument transaction submission points in lending/borrowing flows.

### 6. Sentry Configuration
- `sentry.client.config.js` — Client-side Sentry init
- `sentry.server.config.js` — Server-side Sentry init
- `sentry.edge.config.js` — Edge runtime Sentry init
- `next.config.mjs` — Wrap with `withSentryConfig()`
- `src/app/global-error.js` — Sentry global error page

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SENTRY_DSN` | Yes (for Sentry) | Sentry project DSN |
| `SENTRY_AUTH_TOKEN` | Build-time only | For source map uploads |
| `SENTRY_ORG` | Build-time only | Sentry organization slug |
| `SENTRY_PROJECT` | Build-time only | Sentry project slug |

Vercel Analytics and Speed Insights require no environment variables — they auto-detect when deployed on Vercel.

## Bundle Impact

- `@vercel/analytics`: ~1KB gzipped
- `@vercel/speed-insights`: ~1.5KB gzipped
- `@sentry/nextjs`: ~30KB gzipped (tree-shaken, lazy-loaded where possible)

## Privacy

All three tools are privacy-friendly:
- Vercel Analytics: no cookies, GDPR-compliant
- Vercel Speed Insights: no cookies, no PII
- Sentry: no PII by default, configurable scrubbing

No cookie consent banner is required.

## Files to Create
- `src/lib/analytics.ts` — Centralized analytics utility
- `sentry.client.config.js` — Sentry client config
- `sentry.server.config.js` — Sentry server config
- `sentry.edge.config.js` — Sentry edge config
- `src/app/global-error.js` — Sentry global error page

## Files to Modify
- `package.json` — Add dependencies
- `src/app/layout.js` — Add Analytics + SpeedInsights components
- `src/components/ErrorBoundary.jsx` — Wire Sentry.captureException
- `src/contexts/WalletContext.js` or `src/providers/WalletProvider.jsx` — Add wallet tracking
- `next.config.mjs` — Wrap with withSentryConfig
- `src/config/env.ts` — Add Sentry DSN to env schema
