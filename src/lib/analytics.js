import { ANALYTICS_CONFIG, isGoogleAnalyticsEnabled, isSentryEnabled, isPlausibleEnabled, isVercelAnalyticsEnabled, isPerformanceMonitoringEnabled, isBehaviorTrackingEnabled } from '../config/analytics';

// Google Analytics tracking
export const trackGAEvent = (eventName, parameters = {}) => {
  if (!isGoogleAnalyticsEnabled()) return;

  try {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', eventName, {
        ...parameters,
        custom_map: { custom_parameter_1: 'stellar_network' }
      });
    }
  } catch (error) {
    console.error('Google Analytics tracking error:', error);
  }
};

export const trackGAPageView = (path) => {
  if (!isGoogleAnalyticsEnabled()) return;

  try {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('config', ANALYTICS_CONFIG.googleAnalytics.measurementId, {
        page_path: path,
      });
    }
  } catch (error) {
    console.error('Google Analytics page view error:', error);
  }
};

// Plausible Analytics tracking
export const trackPlausibleEvent = (eventName, options = {}) => {
  if (!isPlausibleEnabled()) return;

  try {
    if (typeof window !== 'undefined' && window.plausible) {
      window.plausible(eventName, options);
    }
  } catch (error) {
    console.error('Plausible tracking error:', error);
  }
};

// Vercel Analytics tracking
export const trackVercelEvent = (eventName, properties = {}) => {
  if (!isVercelAnalyticsEnabled()) return;

  try {
    if (typeof window !== 'undefined' && window.va) {
      window.va('track', eventName, { properties });
    }
  } catch (error) {
    console.error('Vercel Analytics tracking error:', error);
  }
};

// Performance monitoring
export const trackPerformance = (metricName, value, tags = {}) => {
  if (!isPerformanceMonitoringEnabled()) return;

  try {
    // Track performance metrics
    const performanceData = {
      metric: metricName,
      value,
      tags,
      timestamp: Date.now(),
      url: typeof window !== 'undefined' ? window.location.pathname : 'unknown',
    };

    // Send to analytics services
    trackGAEvent('performance_metric', {
      metric_name: metricName,
      value,
      ...tags,
    });

    trackPlausibleEvent('Performance: ' + metricName, {
      props: { value, ...tags }
    });

    // Log for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('Performance tracked:', performanceData);
    }
  } catch (error) {
    console.error('Performance tracking error:', error);
  }
};

// Web Vitals tracking
export const trackWebVitals = (metric) => {
  if (!isPerformanceMonitoringEnabled()) return;

  const { name, value, id } = metric;
  trackPerformance(name, value, { metric_id: id });
};

// User behavior tracking (Privacy-friendly)
export const trackUserBehavior = {
  // Track page views
  pageView: (path) => {
    if (!isBehaviorTrackingEnabled() || !ANALYTICS_CONFIG.behaviorTracking.trackPageViews) return;

    try {
      const pageData = {
        path,
        referrer: typeof document !== 'undefined' ? document.referrer : '',
        timestamp: Date.now(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      };

      // Anonymize data if enabled
      if (ANALYTICS_CONFIG.behaviorTracking.anonymizeData) {
        pageData.userAgent = pageData.userAgent.substring(0, 50); // Truncate user agent
        pageData.referrer = new URL(pageData.referrer || '').origin; // Only keep origin
      }

      trackGAEvent('page_view', pageData);
      trackPlausibleEvent('pageview', { props: { path: pageData.path } });
      trackVercelEvent('page_view', { path: pageData.path });
    } catch (error) {
      console.error('Page view tracking error:', error);
    }
  },

  // Track clicks (privacy-friendly)
  click: (element, context = {}) => {
    if (!isBehaviorTrackingEnabled() || !ANALYTICS_CONFIG.behaviorTracking.trackClicks) return;

    try {
      const clickData = {
        element_type: element.tagName.toLowerCase(),
        element_id: element.id || '',
        element_class: element.className || '',
        text_content: ANALYTICS_CONFIG.behaviorTracking.anonymizeData 
          ? (element.textContent?.substring(0, 20) || '') 
          : (element.textContent || ''),
        timestamp: Date.now(),
        path: typeof window !== 'undefined' ? window.location.pathname : '',
        ...context,
      };

      trackGAEvent('element_click', clickData);
      trackPlausibleEvent('Click: ' + clickData.element_type, { 
        props: { 
          element: clickData.element_type,
          path: clickData.path 
        } 
      });
    } catch (error) {
      console.error('Click tracking error:', error);
    }
  },

  // Track scroll events (privacy-friendly)
  scroll: (scrollDepth) => {
    if (!isBehaviorTrackingEnabled() || !ANALYTICS_CONFIG.behaviorTracking.trackScrolls) return;

    try {
      const scrollData = {
        scroll_depth: Math.round(scrollDepth),
        timestamp: Date.now(),
        path: typeof window !== 'undefined' ? window.location.pathname : '',
      };

      trackGAEvent('scroll_depth', scrollData);
      trackPlausibleEvent('Scroll: ' + scrollData.scroll_depth + '%', { 
        props: { 
          depth: scrollData.scroll_depth,
          path: scrollData.path 
        } 
      });
    } catch (error) {
      console.error('Scroll tracking error:', error);
    }
  },
};

// Stellar-specific tracking
export const trackStellarEvent = (eventName, parameters = {}) => {
  try {
    const stellarParams = {
      ...parameters,
      network: process.env.NEXT_PUBLIC_STELLAR_NETWORK || 'testnet',
      app_version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
    };

    trackGAEvent('stellar_' + eventName, stellarParams);
    trackPlausibleEvent('Stellar: ' + eventName, { props: stellarParams });
    trackVercelEvent('stellar_' + eventName, stellarParams);
  } catch (error) {
    console.error('Stellar event tracking error:', error);
  }
};

// Error tracking
export const trackError = (error, context = {}) => {
  try {
    const errorData = {
      error_name: error.name || 'UnknownError',
      error_message: error.message || 'Unknown error',
      error_stack: error.stack || '',
      context,
      timestamp: Date.now(),
      path: typeof window !== 'undefined' ? window.location.pathname : '',
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    };

    trackGAEvent('javascript_error', errorData);
    trackPlausibleEvent('Error: ' + errorData.error_name, { 
      props: { 
        error: errorData.error_name,
        path: errorData.path 
      } 
    });
    trackVercelEvent('javascript_error', errorData);

    // Also send to Sentry if enabled
    if (isSentryEnabled()) {
      import('@sentry/nextjs').then(Sentry => {
        Sentry.captureException(error, { extra: context });
      });
    }
  } catch (trackingError) {
    console.error('Error tracking failed:', trackingError);
  }
};

// Initialize analytics
export const initializeAnalytics = () => {
  if (typeof window === 'undefined') return;

  try {
    // Track initial page view
    trackUserBehavior.pageView(window.location.pathname);

    // Set up performance monitoring
    if (isPerformanceMonitoringEnabled()) {
      // Track Web Vitals
      import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
        getCLS(trackWebVitals);
        getFID(trackWebVitals);
        getFCP(trackWebVitals);
        getLCP(trackWebVitals);
        getTTFB(trackWebVitals);
      }).catch(() => {
        // Fallback if web-vitals is not available
        console.warn('Web Vitals not available');
      });
    }

    // Set up scroll tracking
    if (isBehaviorTrackingEnabled() && ANALYTICS_CONFIG.behaviorTracking.trackScrolls) {
      let maxScrollDepth = 0;
      const trackScrollDepth = () => {
        const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollDepth = (window.scrollY / scrollHeight) * 100;
        
        if (scrollDepth > maxScrollDepth && scrollDepth % 25 < 5) { // Track at 25%, 50%, 75%, 100%
          maxScrollDepth = scrollDepth;
          trackUserBehavior.scroll(scrollDepth);
        }
      };

      window.addEventListener('scroll', trackScrollDepth, { passive: true });
    }

    // Set up click tracking
    if (isBehaviorTrackingEnabled() && ANALYTICS_CONFIG.behaviorTracking.trackClicks) {
      document.addEventListener('click', (event) => {
        const element = event.target;
        if (element.closest('[data-no-track]')) return; // Respect privacy preferences
        
        trackUserBehavior.click(element, {
          coordinates: { x: event.clientX, y: event.clientY },
        });
      }, { passive: true });
    }

  } catch (error) {
    console.error('Analytics initialization error:', error);
  }
};
