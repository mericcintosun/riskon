/**
 * Tests for src/lib/performanceMonitor.ts
 *
 * Issue #21 - Analytics and Monitoring
 * Follows TESTING.md conventions: Jest + jsdom, beforeEach, mocked externals
 */

import {
  rateVital,
  trackApiLatency,
  trackComponentRender,
  getMetricsSummary,
  clearMetrics,
  measureWebVitals,
  PerformanceMonitoring,
  type WebVitalName,
} from '../lib/performanceMonitor';

// ---------------------------------------------------------------------------
// Setup — mock performance and PerformanceObserver
// ---------------------------------------------------------------------------

const mockMark = jest.fn();
const mockMeasure = jest.fn();
const mockGetEntriesByName = jest.fn();
const mockClearMarks = jest.fn();
const mockClearMeasures = jest.fn();
const mockGetEntriesByType = jest.fn();
const mockNow = jest.fn(() => 100);

beforeEach(() => {
  clearMetrics();
  mockMark.mockClear();
  mockMeasure.mockClear();
  mockGetEntriesByName.mockClear();
  mockClearMarks.mockClear();
  mockClearMeasures.mockClear();
  mockGetEntriesByType.mockClear();
  mockNow.mockReset();
  mockNow.mockReturnValue(100);

  // Mock performance API
  Object.defineProperty(global, 'performance', {
    writable: true,
    value: {
      now: mockNow,
      mark: mockMark,
      measure: mockMeasure,
      getEntriesByName: mockGetEntriesByName,
      getEntriesByType: mockGetEntriesByType,
      clearMarks: mockClearMarks,
      clearMeasures: mockClearMeasures,
    },
  });

  // Default getEntriesByName returns a measure entry
  mockGetEntriesByName.mockReturnValue([{ duration: 42 }]);
  // Default navigation timing
  mockGetEntriesByType.mockReturnValue([{ responseStart: 200, requestStart: 100 }]);
});

// ---------------------------------------------------------------------------
// 1. rateVital
// ---------------------------------------------------------------------------

describe('rateVital', () => {
  test('rates LCP as good when under 2500ms', () => {
    expect(rateVital('LCP', 1000)).toBe('good');
  });

  test('rates LCP as needs-improvement between 2500ms and 4000ms', () => {
    expect(rateVital('LCP', 3000)).toBe('needs-improvement');
  });

  test('rates LCP as poor above 4000ms', () => {
    expect(rateVital('LCP', 5000)).toBe('poor');
  });

  test('rates CLS as good when under 0.1', () => {
    expect(rateVital('CLS', 0.05)).toBe('good');
  });

  test('rates FCP as good when under 1800ms', () => {
    expect(rateVital('FCP', 1000)).toBe('good');
  });

  test('rates TTFB as good when under 800ms', () => {
    expect(rateVital('TTFB', 500)).toBe('good');
  });

  test('rates FID as poor above 300ms', () => {
    expect(rateVital('FID', 400)).toBe('poor');
  });

  test('handles unknown metric gracefully', () => {
    // @ts-expect-error testing unknown metric
    expect(rateVital('UNKNOWN', 999)).toBe('good');
  });
});

// ---------------------------------------------------------------------------
// 2. trackApiLatency
// ---------------------------------------------------------------------------

describe('trackApiLatency', () => {
  test('records a metric after start/end cycle', async () => {
    mockNow.mockReturnValueOnce(0).mockReturnValueOnce(150);
    const timer = trackApiLatency('horizon_fetch');
    timer.start();
    await timer.end();

    const summary = getMetricsSummary();
    expect(summary.count).toBe(1);
    expect(summary.metrics[0].name).toBe('api_latency_horizon_fetch');
    expect(summary.metrics[0].unit).toBe('ms');
  });

  test('does not record a metric if start was never called', async () => {
    const timer = trackApiLatency('missing_start');
    await timer.end();
    expect(getMetricsSummary().count).toBe(0);
  });

  test('records multiple timers independently', async () => {
    mockNow
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(50)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(200);

    const t1 = trackApiLatency('op_a');
    const t2 = trackApiLatency('op_b');
    t1.start();
    await t1.end();
    t2.start();
    await t2.end();

    const names = getMetricsSummary().metrics.map((m) => m.name);
    expect(names).toContain('api_latency_op_a');
    expect(names).toContain('api_latency_op_b');
  });
});

// ---------------------------------------------------------------------------
// 3. trackComponentRender
// ---------------------------------------------------------------------------

describe('trackComponentRender', () => {
  test('calls performance.mark and performance.measure', async () => {
    const tracker = trackComponentRender('RiskScoreCard');
    tracker.start();
    await tracker.end();

    expect(mockMark).toHaveBeenCalledWith('render_start_RiskScoreCard');
    expect(mockMark).toHaveBeenCalledWith('render_end_RiskScoreCard');
    expect(mockMeasure).toHaveBeenCalledWith(
      'render_RiskScoreCard',
      'render_start_RiskScoreCard',
      'render_end_RiskScoreCard'
    );
  });

  test('records metric from measure entry', async () => {
    mockGetEntriesByName.mockReturnValue([{ duration: 25 }]);
    const tracker = trackComponentRender('TierBadge');
    tracker.start();
    await tracker.end();

    const summary = getMetricsSummary();
    expect(summary.count).toBeGreaterThan(0);
    const m = summary.metrics.find((m) => m.name === 'render_TierBadge');
    expect(m).toBeDefined();
    expect(m!.value).toBe(25);
  });

  test('clears marks and measures after recording', async () => {
    const tracker = trackComponentRender('CleanupTest');
    tracker.start();
    await tracker.end();

    expect(mockClearMarks).toHaveBeenCalledWith('render_start_CleanupTest');
    expect(mockClearMarks).toHaveBeenCalledWith('render_end_CleanupTest');
    expect(mockClearMeasures).toHaveBeenCalledWith('render_CleanupTest');
  });
});

// ---------------------------------------------------------------------------
// 4. getMetricsSummary and clearMetrics
// ---------------------------------------------------------------------------

describe('getMetricsSummary / clearMetrics', () => {
  test('returns empty summary initially', () => {
    const summary = getMetricsSummary();
    expect(summary.count).toBe(0);
    expect(summary.metrics).toHaveLength(0);
  });

  test('clearMetrics resets count to 0', async () => {
    mockNow.mockReturnValueOnce(0).mockReturnValueOnce(10);
    const timer = trackApiLatency('test_clear');
    timer.start();
    await timer.end();
    expect(getMetricsSummary().count).toBe(1);

    clearMetrics();
    expect(getMetricsSummary().count).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 5. measureWebVitals — no-op in non-browser
// ---------------------------------------------------------------------------

describe('measureWebVitals', () => {
  test('does not throw when PerformanceObserver is unavailable', () => {
    const originalPO = global.PerformanceObserver;
    // @ts-expect-error removing PerformanceObserver
    delete global.PerformanceObserver;
    expect(() => measureWebVitals()).not.toThrow();
    global.PerformanceObserver = originalPO;
  });
});

// ---------------------------------------------------------------------------
// 6. Convenience export object
// ---------------------------------------------------------------------------

describe('PerformanceMonitoring export object', () => {
  test('exports all expected functions', () => {
    expect(typeof PerformanceMonitoring.measureWebVitals).toBe('function');
    expect(typeof PerformanceMonitoring.trackApiLatency).toBe('function');
    expect(typeof PerformanceMonitoring.trackComponentRender).toBe('function');
    expect(typeof PerformanceMonitoring.getMetricsSummary).toBe('function');
    expect(typeof PerformanceMonitoring.clearMetrics).toBe('function');
    expect(typeof PerformanceMonitoring.rateVital).toBe('function');
  });
});
