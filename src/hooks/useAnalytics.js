import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  trackGAEvent, 
  trackGAPageView, 
  trackPlausibleEvent, 
  trackVercelEvent, 
  trackPerformance, 
  trackUserBehavior, 
  trackStellarEvent, 
  trackError 
} from '../lib/analytics';

export default function useAnalytics() {
  const router = useRouter();

  // Track page views
  const trackPageView = useCallback((path) => {
    trackGAPageView(path);
    trackUserBehavior.pageView(path);
  }, []);

  // Track custom events
  const trackEvent = useCallback((eventName, parameters = {}) => {
    trackGAEvent(eventName, parameters);
    trackPlausibleEvent(eventName, { props: parameters });
    trackVercelEvent(eventName, parameters);
  }, []);

  // Track Stellar-specific events
  const trackStellar = useCallback((eventName, parameters = {}) => {
    trackStellarEvent(eventName, parameters);
  }, []);

  // Track performance metrics
  const trackPerformanceMetric = useCallback((metricName, value, tags = {}) => {
    trackPerformance(metricName, value, tags);
  }, []);

  // Track user interactions
  const trackInteraction = useCallback((action, context = {}) => {
    trackEvent('user_interaction', {
      action,
      ...context,
    });
  }, []);

  // Track wallet events
  const trackWalletEvent = useCallback((eventName, walletType, context = {}) => {
    trackStellar('wallet_' + eventName, {
      wallet_type: walletType,
      ...context,
    });
  }, []);

  // Track transaction events
  const trackTransaction = useCallback((status, transactionType, context = {}) => {
    trackStellar('transaction_' + status, {
      transaction_type: transactionType,
      ...context,
    });
  }, []);

  // Track form submissions
  const trackFormSubmission = useCallback((formName, success = true, context = {}) => {
    trackEvent('form_submission', {
      form_name: formName,
      success,
      ...context,
    });
  }, []);

  // Track errors
  const trackCustomError = useCallback((error, context = {}) => {
    trackError(error, context);
  }, []);

  // Track feature usage
  const trackFeatureUsage = useCallback((featureName, context = {}) => {
    trackEvent('feature_used', {
      feature_name: featureName,
      ...context,
    });
  }, []);

  // Track navigation events
  const trackNavigation = useCallback((from, to, method = 'click') => {
    trackEvent('navigation', {
      from,
      to,
      method,
    });
  }, []);

  // Track search queries
  const trackSearch = useCallback((query, resultCount = 0, context = {}) => {
    trackEvent('search', {
      query,
      result_count: resultCount,
      ...context,
    });
  }, []);

  // Track content engagement
  const trackEngagement = useCallback((contentType, contentId, action, context = {}) => {
    trackEvent('content_engagement', {
      content_type: contentType,
      content_id: contentId,
      action,
      ...context,
    });
  }, []);

  return {
    // Basic tracking
    trackPageView,
    trackEvent,
    trackStellar,
    trackPerformanceMetric,
    
    // User interactions
    trackInteraction,
    trackWalletEvent,
    trackTransaction,
    trackFormSubmission,
    trackCustomError,
    
    // Feature tracking
    trackFeatureUsage,
    trackNavigation,
    trackSearch,
    trackEngagement,
  };
}
