/**
 * Tests for src/lib/errorTracking.ts
 *
 * Issue #21 - Analytics and Monitoring
 * Follows TESTING.md conventions: Jest + jsdom, beforeEach, mocked externals
 */

import {
  captureError,
  captureMessage,
  setUserContext,
  clearUserContext,
  withErrorTracking,
  scrubSensitiveData,
  scrubContext,
  ErrorTracking,
} from '../lib/errorTracking';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const mockFetch = jest.fn();

beforeAll(() => {
  global.fetch = mockFetch;
});

beforeEach(() => {
  mockFetch.mockClear();
  mockFetch.mockResolvedValue(new Response(null, { status: 200 }));
  clearUserContext();
});

const originalEnv = process.env;

afterEach(() => {
  process.env = { ...originalEnv };
});

// ---------------------------------------------------------------------------
// 1. scrubSensitiveData
// ---------------------------------------------------------------------------

describe('scrubSensitiveData', () => {
  test('redacts Stellar secret keys (S... 56 chars)', () => {
    const secret = 'SCZANGBA5XTONSOXE2IYZ5BXCATD2ZIGJCXNWKJNSDCG7QKZY5DGKJDA';
    const result = scrubSensitiveData(`My secret is ${secret}`);
    expect(result).not.toContain(secret);
    expect(result).toContain('[REDACTED]');
  });

  test('truncates Stellar public addresses (G... 56 chars)', () => {
    const address = 'GAHJJJKMOKYE4RVPZEWZTKH5FVI4PA3VL7GK2LFNUBSGBV3NQKZJXJB';
    const result = scrubSensitiveData(`Address: ${address}`);
    // Should be truncated, not redacted
    expect(result).not.toContain(address);
    expect(result).toContain('...');
  });

  test('redacts strings containing "password"', () => {
    const result = scrubSensitiveData('password: supersecret');
    expect(result).toContain('[REDACTED]');
  });

  test('redacts strings containing "private_key"', () => {
    const result = scrubSensitiveData('private_key: abc123');
    expect(result).toContain('[REDACTED]');
  });

  test('leaves safe strings untouched', () => {
    const safe = 'Risk score calculation failed at step 3';
    expect(scrubSensitiveData(safe)).toBe(safe);
  });

  test('handles empty string gracefully', () => {
    expect(scrubSensitiveData('')).toBe('');
  });

  test('handles non-string input gracefully', () => {
    // @ts-expect-error testing runtime safety
    expect(() => scrubSensitiveData(null)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 2. scrubContext
// ---------------------------------------------------------------------------

describe('scrubContext', () => {
  test('scrubs sensitive string values in context', () => {
    const ctx = { secret: 'SCZANGBA5XTONSOXE2IYZ5BXCATD2ZIGJCXNWKJNSDCG7QKZY5DGKJDA', tier: 'TIER_1' };
    const result = scrubContext(ctx);
    expect(result.secret).toContain('[REDACTED]');
    expect(result.tier).toBe('TIER_1');
  });

  test('passes through numeric values unchanged', () => {
    const ctx = { retryCount: 3, latency: 120 };
    const result = scrubContext(ctx);
    expect(result.retryCount).toBe(3);
    expect(result.latency).toBe(120);
  });

  test('passes through boolean values unchanged', () => {
    const ctx = { success: true };
    expect(scrubContext(ctx).success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 3. captureError — no-op without DSN
// ---------------------------------------------------------------------------

describe('captureError — no Sentry DSN configured', () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SENTRY_DSN;
  });

  test('resolves without throwing', async () => {
    await expect(captureError(new Error('test error'))).resolves.toBeUndefined();
  });

  test('does not call fetch when DSN is absent', async () => {
    await captureError(new Error('test'));
    expect(mockFetch).not.toHaveBeenCalled();
  });

  test('accepts non-Error objects', async () => {
    await expect(captureError('just a string error')).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 4. captureAndMessage — sends payload when DSN is set
// ---------------------------------------------------------------------------

describe('captureError / captureMessage — with DSN configured', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = 'https://sentry.example.com';
  });

  test('calls fetch when DSN is present', async () => {
    await captureError(new Error('test error'));
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  test('does not include raw secret keys in payload', async () => {
    const secretKey = 'SCZANGBA5XTONSOXE2IYZ5BXCATD2ZIGJCXNWKJNSDCG7QKZY5DGKJDA';
    await captureError(new Error(`Secret: ${secretKey}`));
    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(JSON.stringify(body)).not.toContain(secretKey);
  });

  test('captureMessage sends at correct severity', async () => {
    await captureMessage('Contract call failed', 'warning');
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body.level).toBe('warning');
  });

  test('does not throw when fetch rejects', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    await expect(captureError(new Error('test'))).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 5. withErrorTracking HOF
// ---------------------------------------------------------------------------

describe('withErrorTracking', () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SENTRY_DSN;
  });

  test('calls the wrapped function normally', async () => {
    const fn = jest.fn().mockResolvedValue('result');
    const wrapped = withErrorTracking(fn, { operation: 'test' });
    const result = await wrapped();
    expect(result).toBe('result');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('re-throws errors from the wrapped function', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('underlying error'));
    const wrapped = withErrorTracking(fn);
    await expect(wrapped()).rejects.toThrow('underlying error');
  });

  test('captures error before re-throwing', async () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = 'https://sentry.example.com';
    const fn = jest.fn().mockRejectedValue(new Error('captured'));
    const wrapped = withErrorTracking(fn);
    try {
      await wrapped();
    } catch {
      // expected
    }
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// 6. Convenience export object
// ---------------------------------------------------------------------------

describe('ErrorTracking export object', () => {
  test('exports all expected functions', () => {
    expect(typeof ErrorTracking.captureError).toBe('function');
    expect(typeof ErrorTracking.captureMessage).toBe('function');
    expect(typeof ErrorTracking.setUserContext).toBe('function');
    expect(typeof ErrorTracking.clearUserContext).toBe('function');
    expect(typeof ErrorTracking.withErrorTracking).toBe('function');
    expect(typeof ErrorTracking.scrubSensitiveData).toBe('function');
    expect(typeof ErrorTracking.scrubContext).toBe('function');
  });
});
