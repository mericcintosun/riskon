'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { ANALYTICS_CONFIG, isSentryEnabled } from '../config/analytics';

export default function SentryErrorTracking() {
  useEffect(() => {
    if (isSentryEnabled()) {
      // Initialize Sentry
      Sentry.init({
        dsn: ANALYTICS_CONFIG.sentry.dsn,
        environment: ANALYTICS_CONFIG.sentry.environment,
        tracesSampleRate: ANALYTICS_CONFIG.sentry.tracesSampleRate,
        
        // Performance monitoring
        integrations: [
          new Sentry.BrowserTracing({
            // Set `tracePropagationTargets` to control for which URLs distributed tracing should be enabled
            tracePropagationTargets: [
              'localhost',
              /^https:\/\/yourdomain\.com/,
              /^https:\/\/.*\.stellar\.org/,
            ],
          }),
        ],
        
        // beforeSend to filter out sensitive data
        beforeSend(event) {
          // Remove sensitive data from breadcrumbs
          if (event.breadcrumbs) {
            event.breadcrumbs = event.breadcrumbs.filter(breadcrumb => {
              // Filter out breadcrumbs that might contain sensitive information
              if (breadcrumb.message && breadcrumb.message.includes('password')) {
                return false;
              }
              if (breadcrumb.message && breadcrumb.message.includes('private')) {
                return false;
              }
              return true;
            });
          }

          // Sanitize URL parameters to remove sensitive data
          if (event.request?.url) {
            const url = new URL(event.request.url);
            url.searchParams.delete('password');
            url.searchParams.delete('token');
            url.searchParams.delete('secret');
            url.searchParams.delete('key');
            event.request.url = url.toString();
          }

          return event;
        },

        // Set user context (anonymized)
        initialScope: {
          tags: {
            component: 'frontend',
            framework: 'nextjs',
          },
        },
      });

      // Set user context if available (anonymized)
      if (typeof window !== 'undefined') {
        const userId = localStorage.getItem('analytics_user_id');
        if (userId) {
          Sentry.setUser({
            id: userId.substring(0, 8), // Only store first 8 characters for privacy
          });
        }
      }

      // Add custom context for Stellar-related errors
      Sentry.setTag('stellar_network', process.env.NEXT_PUBLIC_STELLAR_NETWORK || 'testnet');
      Sentry.setTag('app_version', process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0');
    }
  }, []);

  return null;
}
