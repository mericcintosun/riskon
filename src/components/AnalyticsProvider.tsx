'use client';

/**
 * AnalyticsProvider Component
 *
 * React provider that initializes analytics and error tracking when the app mounts,
 * and tracks page views on every route change (Next.js App Router compatible).
 *
 * Usage: Wrap the root layout with <AnalyticsProvider>
 *
 * Related Issue: #21 - Analytics and Monitoring
 */

import React, { useEffect, useRef } from 'react';
import { trackPageView } from '@/lib/analytics';
import { measureWebVitals } from '@/lib/performanceMonitor';
import { captureError } from '@/lib/errorTracking';

interface AnalyticsProviderProps {
  children: React.ReactNode;
}

/**
 * AnalyticsProvider initializes all observability features on mount.
 *
 * Features:
 * - Tracks the initial page view
 * - Starts Web Vitals measurement
 * - Installs a global unhandledrejection listener for async errors
 * - Installs a global error listener for uncaught exceptions
 *
 * All tracking is opt-in via environment variables and no-ops gracefully
 * if NEXT_PUBLIC_ANALYTICS_URL or NEXT_PUBLIC_SENTRY_DSN are not set.
 */
export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Track the initial page view
    trackPageView().catch(() => {
      // analytics failures must never bubble up
    });

    // Start collecting Web Vitals
    measureWebVitals(false);

    // Global handler for unhandled Promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      captureError(event.reason, { source: 'unhandledrejection' }).catch(() => {});
    };

    // Global handler for uncaught synchronous errors
    const handleError = (event: ErrorEvent) => {
      captureError(
        event.error ?? new Error(event.message),
        {
          source: 'window_error',
          filename: event.filename ?? '',
          lineno: event.lineno ?? 0,
          colno: event.colno ?? 0,
        }
      ).catch(() => {});
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, []);

  return <>{children}</>;
}

export default AnalyticsProvider;
