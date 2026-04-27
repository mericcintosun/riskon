import { render, screen, fireEvent } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import AnalyticsProvider from '../../components/AnalyticsProvider';
import { ANALYTICS_CONFIG } from '../../config/analytics';
import * as analytics from '../../lib/analytics';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock analytics functions
jest.mock('../../lib/analytics', () => ({
  ...jest.requireActual('../../lib/analytics'),
  initializeAnalytics: jest.fn(),
  trackUserBehavior: {
    pageView: jest.fn(),
    click: jest.fn(),
    scroll: jest.fn(),
  },
  trackStellarEvent: jest.fn(),
  trackError: jest.fn(),
}));

// Mock window object
const mockGtag = jest.fn();
const mockPlausible = jest.fn();
const mockVa = jest.fn();

Object.defineProperty(window, 'gtag', {
  value: mockGtag,
  writable: true,
});

Object.defineProperty(window, 'plausible', {
  value: mockPlausible,
  writable: true,
});

Object.defineProperty(window, 'va', {
  value: mockVa,
  writable: true,
});

Object.defineProperty(window, 'dataLayer', {
  value: [],
  writable: true,
});

describe('Analytics Integration', () => {
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter).mockReturnValue(mockRouter);
    
    // Reset environment variables
    process.env.NEXT_PUBLIC_GA_ENABLED = 'true';
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = 'G-TEST123';
    process.env.NEXT_PUBLIC_SENTRY_ENABLED = 'true';
    process.env.NEXT_PUBLIC_SENTRY_DSN = 'https://test@sentry.io/123';
    process.env.NEXT_PUBLIC_PLAUSIBLE_ENABLED = 'true';
    process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN = 'test.com';
    process.env.NEXT_PUBLIC_VERCEL_ANALYTICS_ENABLED = 'true';
    process.env.NEXT_PUBLIC_PERFORMANCE_MONITORING_ENABLED = 'true';
    process.env.NEXT_PUBLIC_BEHAVIOR_TRACKING_ENABLED = 'true';
  });

  describe('AnalyticsProvider', () => {
    it('should initialize analytics on mount', () => {
      render(
        <AnalyticsProvider>
          <div>Test Content</div>
        </AnalyticsProvider>
      );

      expect(analytics.initializeAnalytics).toHaveBeenCalled();
    });

    it('should track page views on route changes', () => {
      render(
        <AnalyticsProvider>
          <div>Test Content</div>
        </AnalyticsProvider>
      );

      // Simulate router push
      mockRouter.push('/test-page');
      
      expect(analytics.trackUserBehavior.pageView).toHaveBeenCalledWith('/test-page');
      expect(analytics.trackStellarEvent).toHaveBeenCalledWith('navigation', { to: '/test-page' });
    });

    it('should handle errors gracefully', () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      
      analytics.initializeAnalytics.mockImplementation(() => {
        throw new Error('Analytics initialization failed');
      });

      render(
        <AnalyticsProvider>
          <div>Test Content</div>
        </AnalyticsProvider>
      );

      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });
  });

  describe('Analytics Configuration', () => {
    it('should correctly identify enabled services', () => {
      expect(ANALYTICS_CONFIG.googleAnalytics.enabled).toBe(true);
      expect(ANALYTICS_CONFIG.sentry.enabled).toBe(true);
      expect(ANALYTICS_CONFIG.plausible.enabled).toBe(true);
      expect(ANALYTICS_CONFIG.vercel.enabled).toBe(true);
      expect(ANALYTICS_CONFIG.performance.enabled).toBe(true);
      expect(ANALYTICS_CONFIG.behaviorTracking.enabled).toBe(true);
    });

    it('should have correct configuration values', () => {
      expect(ANALYTICS_CONFIG.googleAnalytics.measurementId).toBe('G-TEST123');
      expect(ANALYTICS_CONFIG.sentry.dsn).toBe('https://test@sentry.io/123');
      expect(ANALYTICS_CONFIG.plausible.domain).toBe('test.com');
    });
  });

  describe('Analytics Functions', () => {
    beforeEach(() => {
      // Reset mocks
      mockGtag.mockClear();
      mockPlausible.mockClear();
      mockVa.mockClear();
    });

    it('should track GA events when enabled', () => {
      const { trackGAEvent } = require('../../lib/analytics');
      
      trackGAEvent('test_event', { param1: 'value1' });

      expect(mockGtag).toHaveBeenCalledWith('event', 'test_event', {
        param1: 'value1',
        custom_map: { custom_parameter_1: 'stellar_network' }
      });
    });

    it('should track Plausible events when enabled', () => {
      const { trackPlausibleEvent } = require('../../lib/analytics');
      
      trackPlausibleEvent('test_event', { props: { param1: 'value1' } });

      expect(mockPlausible).toHaveBeenCalledWith('test_event', {
        props: { param1: 'value1' }
      });
    });

    it('should track Vercel events when enabled', () => {
      const { trackVercelEvent } = require('../../lib/analytics');
      
      trackVercelEvent('test_event', { param1: 'value1' });

      expect(mockVa).toHaveBeenCalledWith('track', 'test_event', {
        properties: { param1: 'value1' }
      });
    });

    it('should track Stellar events', () => {
      const { trackStellarEvent } = require('../../lib/analytics');
      
      trackStellarEvent('wallet_connected', { wallet_type: 'ledger' });

      expect(mockGtag).toHaveBeenCalledWith('event', 'stellar_wallet_connected', {
        wallet_type: 'ledger',
        network: 'testnet',
        app_version: '1.0.0'
      });

      expect(mockPlausible).toHaveBeenCalledWith('Stellar: wallet_connected', {
        props: {
          wallet_type: 'ledger',
          network: 'testnet',
          app_version: '1.0.0'
        }
      });
    });

    it('should track performance metrics', () => {
      const { trackPerformance } = require('../../lib/analytics');
      
      trackPerformance('FCP', 1200, { metric_id: 'test-123' });

      expect(mockGtag).toHaveBeenCalledWith('event', 'performance_metric', {
        metric_name: 'FCP',
        value: 1200,
        metric_id: 'test-123'
      });
    });

    it('should handle user behavior tracking', () => {
      const { trackUserBehavior } = require('../../lib/analytics');
      
      // Test page view
      trackUserBehavior.pageView('/test-path');
      expect(mockGtag).toHaveBeenCalledWith('event', 'page_view', expect.objectContaining({
        path: '/test-path'
      }));

      // Test click tracking
      const mockElement = {
        tagName: 'BUTTON',
        id: 'test-button',
        className: 'btn-primary',
        textContent: 'Click me'
      };
      trackUserBehavior.click(mockElement);
      expect(mockGtag).toHaveBeenCalledWith('event', 'element_click', expect.objectContaining({
        element_type: 'button',
        element_id: 'test-button'
      }));

      // Test scroll tracking
      trackUserBehavior.scroll(75);
      expect(mockGtag).toHaveBeenCalledWith('event', 'scroll_depth', expect.objectContaining({
        scroll_depth: 75
      }));
    });

    it('should track errors', () => {
      const { trackError } = require('../../lib/analytics');
      
      const testError = new Error('Test error');
      trackError(testError, { context: 'test' });

      expect(mockGtag).toHaveBeenCalledWith('event', 'javascript_error', expect.objectContaining({
        error_name: 'Error',
        error_message: 'Test error',
        context: { context: 'test' }
      }));
    });
  });

  describe('Privacy Features', () => {
    it('should anonymize data when enabled', () => {
      process.env.NEXT_PUBLIC_ANONYMIZE_DATA = 'true';
      
      const { trackUserBehavior } = require('../../lib/analytics');
      
      const mockElement = {
        tagName: 'BUTTON',
        id: 'test-button',
        className: 'btn-primary',
        textContent: 'This is a very long text content that should be truncated'
      };
      
      trackUserBehavior.click(mockElement);

      expect(mockGtag).toHaveBeenCalledWith('event', 'element_click', expect.objectContaining({
        text_content: expect.stringMatching(/^.{0,20}$/) // Should be truncated to 20 chars
      }));
    });

    it('should respect no-track attribute', () => {
      // Create a mock element with no-track attribute
      const mockElement = {
        tagName: 'BUTTON',
        closest: jest.fn().mockReturnValue(true) // Simulates finding data-no-track attribute
      };

      const { trackUserBehavior } = require('../../lib/analytics');
      
      trackUserBehavior.click(mockElement);

      // Should not track the click
      expect(mockGtag).not.toHaveBeenCalledWith('event', 'element_click', expect.any(Object));
    });
  });

  describe('Disabled Services', () => {
    beforeEach(() => {
      // Disable all services
      process.env.NEXT_PUBLIC_GA_ENABLED = 'false';
      process.env.NEXT_PUBLIC_PLAUSIBLE_ENABLED = 'false';
      process.env.NEXT_PUBLIC_VERCEL_ANALYTICS_ENABLED = 'false';
      process.env.NEXT_PUBLIC_BEHAVIOR_TRACKING_ENABLED = 'false';
    });

    it('should not track events when services are disabled', () => {
      const { trackGAEvent, trackPlausibleEvent, trackVercelEvent } = require('../../lib/analytics');
      
      trackGAEvent('test_event', {});
      trackPlausibleEvent('test_event', {});
      trackVercelEvent('test_event', {});

      expect(mockGtag).not.toHaveBeenCalled();
      expect(mockPlausible).not.toHaveBeenCalled();
      expect(mockVa).not.toHaveBeenCalled();
    });
  });
});
