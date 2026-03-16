# Observability Setup (Issue #21)

This document describes the minimal observability stack integrated into Riskon:

- **Error tracking & tracing:** Sentry (`@sentry/nextjs`)
- **Privacy-friendly analytics:** Plausible (cookie-free pageview tracking)

## 1) Environment Variables

Add these to your `.env.local`:

```bash
SENTRY_DSN=
PLAUSIBLE_DOMAIN=
```

Optional tuning:

```bash
SENTRY_TRACES_SAMPLE_RATE=0.1
NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=0.1
SLOW_API_THRESHOLD_MS=1000
```

## 2) What is integrated

### Sentry

- `next.config.mjs` is wrapped with `withSentryConfig(...)`.
- Server init: `sentry.server.config.js`
- Edge init: `sentry.edge.config.js`
- Client init: `instrumentation-client.js`
- App Router instrumentation hook: `instrumentation.js`
- Client global error capture: `src/app/global-error.jsx`

This captures both server and client runtime errors and enables performance tracing via `tracesSampleRate`.

### Plausible (GDPR-friendly)

- Script is injected in `src/components/PlausibleAnalytics.jsx`.
- Added to root layout in `src/app/layout.js`.
- Uses `https://plausible.io/js/script.js` with `data-domain`.
- Tracks pageviews without cookies by default.

## 3) Slow API route monitoring

A helper is provided at `src/lib/monitoring/apiMonitoring.js`:

- Wrap API route handlers with `monitorApiRoute(routeName, handler)`.
- Captures route errors to Sentry.
- Emits a Sentry warning message when duration exceeds `SLOW_API_THRESHOLD_MS`.

Example:

```ts
import { NextResponse } from "next/server";
import { monitorApiRoute } from "@/lib/monitoring/apiMonitoring";

export async function GET() {
  return monitorApiRoute("example-get", async () => {
    // your route logic
    return NextResponse.json({ ok: true });
  });
}
```

## 4) Install and run

```bash
npm install
npm run dev
```

For production validation:

```bash
npm run build
npm start
```

## 5) Notes

- DSN is intentionally exposed to browser telemetry via `NEXT_PUBLIC_SENTRY_DSN` (mapped from `SENTRY_DSN` in `next.config.mjs`), which is standard Sentry behavior.
- Keep sampling rates conservative to control telemetry volume and cost.
- If `PLAUSIBLE_DOMAIN` is empty, Plausible script is not loaded.
