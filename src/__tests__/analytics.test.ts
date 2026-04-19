/**
 * Tests for src/lib/analytics.ts
 *
 * Issue #21 - Analytics and Monitoring
 * Follows TESTING.md conventions: Jest + jsdom, beforeEach setup, mocked externals
 */

import {
  trackEvent,
  trackPageView,
  trackRiskScoreCalculated,
  trackWalletConnected,
  trackTierAccessed,
  trackScoreCommitted,
  Analytics,
  type AnalyticsEvent,
} from '../lib/analytics';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** Mock fetch globally */
const mockFetch = jest.fn();

beforeAll(() => {
  global.fetch = mockFetch;
});

beforeEach(() => {
  mockFetch.mockClear();
  mockFetch.mockResolvedValue(new Response(null, { status: 200 }));
});

// Reset environment between tests
const originalEnv = process.env;

afterEach(() => {
  process.env = { ...originalEnv };
});

// ---------------------------------------------------------------------------
// 1. No-op when NEXT_PUBLIC_ANALYTICS_URL is absent
// ---------------------------------------------------------------------------

describe('trackEvent — no analytics URL configured', () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_ANALYTICS_URL;
  });

  test('does not call fetch when analytics URL is not set', async () => {
    await trackEvent({ name: 'test_event' });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  test('resolves without throwing when URL is absent', async () => {
    await expect(trackEvent({ name: 'test_event', props: { key: 'value' } })).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 2. Sends events when configured
// ---------------------------------------------------------------------------

describe('trackEvent — with analytics URL configured', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_ANALYTICS_URL = 'https://plausible.example.com';
  });

  test('calls fetch with POST method', async () => {
    await trackEvent({ name: 'test_event' });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [, options] = mockFetch.mock.calls[0];
    expect(options.method).toBe('POST');
  });

  test('sends event name in payload', async () => {
    await trackEvent({ name: 'Risk Score Calculated' });
    const [, options] = mockFetch.mock.calls[0];
    const body = JSON.parse(options.body as string);
    expect(body.n).toBe('Risk Score Calculated');
  });

  test('sends props in payload', async () => {
    await trackEvent({ name: 'test', props: { tier: 'TIER_1', mode: 'manual' } });
    const [, options] = mockFetch.mock.calls[0];
    const body = JSON.parse(options.body as string);
    expect(body.p).toEqual({ tier: 'TIER_1', mode: 'manual' });
  });

  test('targets the correct endpoint', async () => {
    await trackEvent({ name: 'test' });
    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('/api/event');
  });

  test('does not throw if fetch rejects', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    await expect(trackEvent({ name: 'test' })).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 3. trackPageView
// ---------------------------------------------------------------------------

describe('trackPageView', () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_ANALYTICS_URL;
  });

  test('resolves without throwing when not configured', async () => {
    await expect(trackPageView('/wallet')).resolves.toBeUndefined();
  });

  test('uses provided path in event props (when configured)', async () => {
    process.env.NEXT_PUBLIC_ANALYTICS_URL = 'https://plausible.example.com';
    await trackPageView('/wallet');
    expect(mockFetch).toHaveBeenCalled();
    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body.p.page).toBe('/wallet');
  });
});

// ---------------------------------------------------------------------------
// 4. Privacy guarantees — no PII in props
// ---------------------------------------------------------------------------

describe('Privacy — no PII in event props', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_ANALYTICS_URL = 'https://plausible.example.com';
  });

  test('trackRiskScoreCalculated sends only tier and mode — not score', async () => {
    await trackRiskScoreCalculated('TIER_1', 'automated');
    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body.p).toEqual({ tier: 'TIER_1', mode: 'automated' });
    // Numeric score must not be present
    expect(Object.keys(body.p)).not.toContain('score');
  });

  test('trackWalletConnected sends only method — not address', async () => {
    await trackWalletConnected('passkey');
    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body.p).toEqual({ method: 'passkey' });
    expect(Object.keys(body.p)).not.toContain('address');
  });

  test('trackTierAccessed sends only tier — not address', async () => {
    await trackTierAccessed('TIER_2');
    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body.p).toEqual({ tier: 'TIER_2' });
    expect(Object.keys(body.p)).not.toContain('address');
  });

  test('trackScoreCommitted sends only success flag', async () => {
    await trackScoreCommitted(true);
    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body.p).toEqual({ success: true });
  });
});

// ---------------------------------------------------------------------------
// 5. Convenience object export
// ---------------------------------------------------------------------------

describe('Analytics export object', () => {
  test('exports all expected functions', () => {
    expect(typeof Analytics.trackEvent).toBe('function');
    expect(typeof Analytics.trackPageView).toBe('function');
    expect(typeof Analytics.trackRiskScoreCalculated).toBe('function');
    expect(typeof Analytics.trackWalletConnected).toBe('function');
    expect(typeof Analytics.trackTierAccessed).toBe('function');
    expect(typeof Analytics.trackScoreCommitted).toBe('function');
  });
});
