'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import GoogleAnalytics from './GoogleAnalytics';
import PlausibleAnalytics from './PlausibleAnalytics';
import VercelAnalytics from './VercelAnalytics';
import SentryErrorTracking from './SentryErrorTracking';
import { initializeAnalytics, trackUserBehavior, trackStellarEvent, trackError } from '../lib/analytics';
import { ANALYTICS_CONFIG } from '../config/analytics';

export default function AnalyticsProvider({ children }) {
  const router = useRouter();

  useEffect(() => {
    // Initialize all analytics services
    initializeAnalytics();

    // Set up router tracking for page changes
    const handleRouteChange = (url) => {
      trackUserBehavior.pageView(url);
      trackStellarEvent('navigation', { to: url });
    };

    // Listen for route changes
    if (router) {
      const originalPush = router.push;
      const originalReplace = router.replace;

      router.push = (...args) => {
        const result = originalPush(...args);
        if (typeof args[0] === 'string') {
          handleRouteChange(args[0]);
        }
        return result;
      };

      router.replace = (...args) => {
        const result = originalReplace(...args);
        if (typeof args[0] === 'string') {
          handleRouteChange(args[0]);
        }
        return result;
      };
    }

    // Set up global error tracking
    const handleError = (event) => {
      trackError(event.error || new Error(event.message), {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        type: 'uncaught_error',
      });
    };

    const handleUnhandledRejection = (event) => {
      trackError(event.reason || new Error('Unhandled promise rejection'), {
        type: 'unhandled_rejection',
      });
    };

    // Set up performance monitoring
    const observePerformance = () => {
      if (!ANALYTICS_CONFIG.performance.enabled) return;

      // Track navigation timing
      if (typeof window !== 'undefined' && 'performance' in window) {
        window.addEventListener('load', () => {
          setTimeout(() => {
            const navigation = performance.getEntriesByType('navigation')[0];
            if (navigation) {
              const loadTime = navigation.loadEventEnd - navigation.loadEventStart;
              trackStellarEvent('page_load_time', { 
                load_time_ms: Math.round(loadTime),
                dom_content_loaded: Math.round(navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart),
              });
            }
          }, 0);
        });
      }
    };

    // Add event listeners
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    observePerformance();

    // Generate and store anonymized user ID
    const generateUserId = () => {
      if (typeof window !== 'undefined' && !localStorage.getItem('analytics_user_id')) {
        const userId = 'user_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
        localStorage.setItem('analytics_user_id', userId);
      }
    };

    generateUserId();

    // Track initial app load
    trackStellarEvent('app_loaded', {
      timestamp: Date.now(),
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent.substring(0, 100) : '',
      screen_resolution: typeof screen !== 'undefined' ? `${screen.width}x${screen.height}` : '',
    });

    // Cleanup function
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [router]);

  return (
    <>
      <GoogleAnalytics />
      <PlausibleAnalytics />
      <VercelAnalytics />
      <SentryErrorTracking />
      {children}
    </>
  );
}
