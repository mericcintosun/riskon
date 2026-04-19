/**
 * Performance Monitoring Module
 *
 * Provides Web Vitals measurement and custom performance tracking for Riskon.
 * Uses browser-native Performance API — no external dependencies required.
 *
 * Integrates with the analytics module to optionally report vitals as events.
 *
 * Related Issue: #21 - Analytics and Monitoring
 */

import { trackEvent } from './analytics';

/** Standard Web Vitals metric names */
export type WebVitalName = 'CLS' | 'FID' | 'FCP' | 'LCP' | 'TTFB' | 'INP';

/** A captured performance metric */
export interface PerformanceMetric {
  name: string;
  value: number;
  /** Unit: 'ms' for time-based metrics, 'score' for layout shift */
  unit: 'ms' | 'score';
  timestamp: number;
}

/** Summary of all collected metrics */
export interface MetricsSummary {
  metrics: PerformanceMetric[];
  count: number;
}

/** Rating thresholds (following Google's Core Web Vitals guidelines) */
const VITALS_THRESHOLDS: Record<WebVitalName, { good: number; needsImprovement: number }> = {
  CLS: { good: 0.1, needsImprovement: 0.25 },
  FID: { good: 100, needsImprovement: 300 },
  FCP: { good: 1800, needsImprovement: 3000 },
  LCP: { good: 2500, needsImprovement: 4000 },
  TTFB: { good: 800, needsImprovement: 1800 },
  INP: { good: 200, needsImprovement: 500 },
};

/**
 * Rates a Web Vital value against Google's thresholds.
 *
 * @param name - Metric name
 * @param value - Measured value
 * @returns 'good' | 'needs-improvement' | 'poor'
 */
export function rateVital(
  name: WebVitalName,
  value: number
): 'good' | 'needs-improvement' | 'poor' {
  const t = VITALS_THRESHOLDS[name];
  if (!t) return 'good';
  if (value <= t.good) return 'good';
  if (value <= t.needsImprovement) return 'needs-improvement';
  return 'poor';
}

/** Collected metrics store */
const _metrics: PerformanceMetric[] = [];

/**
 * Records a performance metric to the in-memory store and optionally
 * forwards it to the analytics pipeline.
 *
 * @param metric - The metric to record
 * @param reportToAnalytics - Whether to fire a trackEvent (default: false)
 */
async function recordMetric(
  metric: PerformanceMetric,
  reportToAnalytics = false
): Promise<void> {
  _metrics.push(metric);

  if (reportToAnalytics) {
    await trackEvent({
      name: 'Performance Metric',
      props: {
        metric_name: metric.name,
        value: metric.value,
        unit: metric.unit,
      },
    });
  }
}

/**
 * Measures Core Web Vitals using PerformanceObserver.
 * Silently no-ops in environments without PerformanceObserver (e.g. Node).
 *
 * @param reportToAnalytics - Whether to forward metrics to analytics (default: false)
 */
export function measureWebVitals(reportToAnalytics = false): void {
  if (typeof window === 'undefined' || typeof PerformanceObserver === 'undefined') {
    return;
  }

  // Largest Contentful Paint
  try {
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1] as PerformanceEntry & { startTime: number };
      recordMetric(
        { name: 'LCP', value: lastEntry.startTime, unit: 'ms', timestamp: Date.now() },
        reportToAnalytics
      );
    });
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch {
    // Not supported in all browsers
  }

  // First Contentful Paint
  try {
    const fcpObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          recordMetric(
            { name: 'FCP', value: entry.startTime, unit: 'ms', timestamp: Date.now() },
            reportToAnalytics
          );
        }
      }
    });
    fcpObserver.observe({ type: 'paint', buffered: true });
  } catch {
    // Not supported in all browsers
  }

  // Cumulative Layout Shift
  try {
    const clsObserver = new PerformanceObserver((list) => {
      let clsValue = 0;
      for (const entry of list.getEntries()) {
        const layoutEntry = entry as PerformanceEntry & { value: number; hadRecentInput: boolean };
        if (!layoutEntry.hadRecentInput) {
          clsValue += layoutEntry.value;
        }
      }
      if (clsValue > 0) {
        recordMetric(
          { name: 'CLS', value: clsValue, unit: 'score', timestamp: Date.now() },
          reportToAnalytics
        );
      }
    });
    clsObserver.observe({ type: 'layout-shift', buffered: true });
  } catch {
    // Not supported in all browsers
  }

  // Time to First Byte (from navigation timing)
  try {
    const navEntries = window.performance.getEntriesByType('navigation');
    if (navEntries.length > 0) {
      const nav = navEntries[0] as PerformanceNavigationTiming;
      const ttfb = nav.responseStart - nav.requestStart;
      recordMetric(
        { name: 'TTFB', value: ttfb, unit: 'ms', timestamp: Date.now() },
        reportToAnalytics
      );
    }
  } catch {
    // Not supported in all browsers
  }
}

/**
 * Tracks API call latency using performance.now().
 * Call `start()` before the request and `end()` after.
 *
 * @param operationName - Human-readable name for the operation
 * @param reportToAnalytics - Whether to forward to analytics (default: false)
 * @returns Object with start() and end() methods
 *
 * @example
 * const timer = trackApiLatency('horizon_fetch');
 * timer.start();
 * await fetchHorizonData(address);
 * timer.end();
 */
export function trackApiLatency(
  operationName: string,
  reportToAnalytics = false
): { start: () => void; end: () => Promise<void> } {
  let startTime: number | null = null;

  return {
    start(): void {
      startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    },
    async end(): Promise<void> {
      if (startTime === null) return;
      const duration =
        (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startTime;

      await recordMetric(
        {
          name: `api_latency_${operationName}`,
          value: Math.round(duration),
          unit: 'ms',
          timestamp: Date.now(),
        },
        reportToAnalytics
      );
    },
  };
}

/**
 * Tracks the render time of a component or code block.
 * Uses performance.mark() and performance.measure() for precision.
 *
 * @param componentName - Name of the component/block being measured
 * @param reportToAnalytics - Whether to forward to analytics (default: false)
 * @returns Object with start() and end() methods
 */
export function trackComponentRender(
  componentName: string,
  reportToAnalytics = false
): { start: () => void; end: () => Promise<void> } {
  const startMark = `render_start_${componentName}`;
  const endMark = `render_end_${componentName}`;
  const measureName = `render_${componentName}`;

  return {
    start(): void {
      if (typeof performance !== 'undefined' && performance.mark) {
        try {
          performance.mark(startMark);
        } catch {
          // performance.mark not supported
        }
      }
    },
    async end(): Promise<void> {
      if (typeof performance !== 'undefined' && performance.mark && performance.measure) {
        try {
          performance.mark(endMark);
          performance.measure(measureName, startMark, endMark);
          const measures = performance.getEntriesByName(measureName);
          if (measures.length > 0) {
            const duration = measures[measures.length - 1].duration;
            await recordMetric(
              {
                name: `render_${componentName}`,
                value: Math.round(duration),
                unit: 'ms',
                timestamp: Date.now(),
              },
              reportToAnalytics
            );
            performance.clearMarks(startMark);
            performance.clearMarks(endMark);
            performance.clearMeasures(measureName);
          }
        } catch {
          // performance.measure not supported
        }
      }
    },
  };
}

/**
 * Returns a snapshot of all collected performance metrics.
 */
export function getMetricsSummary(): MetricsSummary {
  return {
    metrics: [..._metrics],
    count: _metrics.length,
  };
}

/**
 * Clears all collected metrics from the in-memory store.
 * Useful in tests or on route changes.
 */
export function clearMetrics(): void {
  _metrics.length = 0;
}

/**
 * Convenience export object following the project's existing module pattern.
 */
export const PerformanceMonitoring = {
  measureWebVitals,
  trackApiLatency,
  trackComponentRender,
  getMetricsSummary,
  clearMetrics,
  rateVital,
};

export default PerformanceMonitoring;
