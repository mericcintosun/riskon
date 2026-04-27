// Analytics Configuration
export const ANALYTICS_CONFIG = {
  // Google Analytics
  googleAnalytics: {
    enabled: process.env.NEXT_PUBLIC_GA_ENABLED === 'true',
    measurementId: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
  },

  // Sentry Error Tracking
  sentry: {
    enabled: process.env.NEXT_PUBLIC_SENTRY_ENABLED === 'true',
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: parseFloat(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE || '0.1'),
  },

  // Plausible Analytics (Privacy-friendly)
  plausible: {
    enabled: process.env.NEXT_PUBLIC_PLAUSIBLE_ENABLED === 'true',
    domain: process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN,
    scriptUrl: process.env.NEXT_PUBLIC_PLAUSIBLE_SCRIPT_URL || 'https://plausible.io/js/script.js',
  },

  // Vercel Analytics
  vercel: {
    enabled: process.env.NEXT_PUBLIC_VERCEL_ANALYTICS_ENABLED === 'true',
  },

  // Performance Monitoring
  performance: {
    enabled: process.env.NEXT_PUBLIC_PERFORMANCE_MONITORING_ENABLED === 'true',
    sampleRate: parseFloat(process.env.NEXT_PUBLIC_PERFORMANCE_SAMPLE_RATE || '0.1'),
  },

  // User Behavior Tracking (Privacy-friendly)
  behaviorTracking: {
    enabled: process.env.NEXT_PUBLIC_BEHAVIOR_TRACKING_ENABLED === 'true',
    trackClicks: process.env.NEXT_PUBLIC_TRACK_CLICKS === 'true',
    trackScrolls: process.env.NEXT_PUBLIC_TRACK_SCROLLS === 'true',
    trackPageViews: process.env.NEXT_PUBLIC_TRACK_PAGE_VIEWS !== 'false', // Default to true
    anonymizeData: process.env.NEXT_PUBLIC_ANONYMIZE_DATA !== 'false', // Default to true
  },
};

// Helper functions to check if analytics features are enabled
export const isGoogleAnalyticsEnabled = () => ANALYTICS_CONFIG.googleAnalytics.enabled && ANALYTICS_CONFIG.googleAnalytics.measurementId;
export const isSentryEnabled = () => ANALYTICS_CONFIG.sentry.enabled && ANALYTICS_CONFIG.sentry.dsn;
export const isPlausibleEnabled = () => ANALYTICS_CONFIG.plausible.enabled && ANALYTICS_CONFIG.plausible.domain;
export const isVercelAnalyticsEnabled = () => ANALYTICS_CONFIG.vercel.enabled;
export const isPerformanceMonitoringEnabled = () => ANALYTICS_CONFIG.performance.enabled;
export const isBehaviorTrackingEnabled = () => ANALYTICS_CONFIG.behaviorTracking.enabled;
