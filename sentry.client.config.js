import * as Sentry from '@sentry/nextjs';
import { ANALYTICS_CONFIG } from './src/config/analytics';

if (ANALYTICS_CONFIG.sentry.enabled) {
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
          /^https:\/\/.*\.stellar\.org/,
          /^https:\/\/yourdomain\.com/,
        ],
      }),
    ],

    // beforeSend to filter out sensitive data
    beforeSend(event) {
      // Remove sensitive data from breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.filter(breadcrumb => {
          if (breadcrumb.message && breadcrumb.message.includes('password')) {
            return false;
          }
          if (breadcrumb.message && breadcrumb.message.includes('private')) {
            return false;
          }
          if (breadcrumb.message && breadcrumb.message.includes('secret')) {
            return false;
          }
          if (breadcrumb.message && breadcrumb.message.includes('token')) {
            return false;
          }
          return true;
        });
      }

      // Sanitize URL parameters
      if (event.request?.url) {
        const url = new URL(event.request.url);
        const sensitiveParams = ['password', 'token', 'secret', 'key', 'private', 'auth'];
        sensitiveParams.forEach(param => url.searchParams.delete(param));
        event.request.url = url.toString();
      }

      // Sanitize exception messages
      if (event.exception?.values) {
        event.exception.values = event.exception.values.map(exception => ({
          ...exception,
          value: exception.value?.replace(/password[=:]\s*[^\s&]+/gi, 'password=***')
                                    .replace(/token[=:]\s*[^\s&]+/gi, 'token=***')
                                    .replace(/secret[=:]\s*[^\s&]+/gi, 'secret=***')
                                    .replace(/key[=:]\s*[^\s&]+/gi, 'key=***')
        }));
      }

      return event;
    },

    // Set tags and context
    initialScope: {
      tags: {
        component: 'frontend',
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
      // Browser extensions
      'Non-Error promise rejection captured',
      // Third-party script errors
      'Script error',
      'ResizeObserver loop limit exceeded',
      // Known harmless errors
      'AbortError',
    ],

    // Deny URLs for certain files
    denyUrls: [
      // Chrome extensions
      /extensions\//i,
      /^chrome:\/\//i,
      /^chrome-extension:\/\//i,
      // Firefox extensions
      /^resource:\/\//i,
      /^moz-extension:\/\//i,
      // Third-party scripts
      /googletagmanager\.com/i,
      /google-analytics\.com/i,
      /doubleclick\.net/i,
      /facebook\.com/i,
      /connect\.facebook\.net/i,
    ],
  });
}
