import * as Sentry from '@sentry/nextjs';
import { ANALYTICS_CONFIG } from './src/config/analytics';

if (ANALYTICS_CONFIG.sentry.enabled) {
  Sentry.init({
    dsn: ANALYTICS_CONFIG.sentry.dsn,
    environment: ANALYTICS_CONFIG.sentry.environment,
    tracesSampleRate: ANALYTICS_CONFIG.sentry.tracesSampleRate,

    // Performance monitoring
    integrations: [
      new Sentry.BrowserTracing(),
    ],

    // beforeSend to filter out sensitive data
    beforeSend(event) {
      // Remove sensitive data from request body
      if (event.request?.data) {
        const sensitiveKeys = ['password', 'token', 'secret', 'key', 'private', 'auth', 'authorization'];
        const sanitizedData = { ...event.request.data };
        
        sensitiveKeys.forEach(key => {
          if (sanitizedData[key]) {
            sanitizedData[key] = '***';
          }
        });
        
        event.request.data = sanitizedData;
      }

      // Sanitize URL parameters
      if (event.request?.url) {
        const url = new URL(event.request.url);
        const sensitiveParams = ['password', 'token', 'secret', 'key', 'private', 'auth'];
        sensitiveParams.forEach(param => url.searchParams.delete(param));
        event.request.url = url.toString();
      }

      return event;
    },

    // Set tags and context
    initialScope: {
      tags: {
        component: 'backend',
        framework: 'nextjs',
        stellar_network: process.env.NEXT_PUBLIC_STELLAR_NETWORK || 'testnet',
        app_version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      },
    },

    // Ignore specific errors
    ignoreErrors: [
      // Network errors
      'Network request failed',
      'Failed to fetch',
      // Known harmless errors
      'AbortError',
      // Timeout errors
      'TIMEOUT',
      'Request timeout',
    ],

    // Deny URLs for certain files
    denyUrls: [
      // Internal health checks
      /\/health/i,
      /\/ping/i,
      /\/status/i,
      // Third-party services
      /googletagmanager\.com/i,
      /google-analytics\.com/i,
      /doubleclick\.net/i,
    ],
  });
}
