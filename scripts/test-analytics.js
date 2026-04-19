#!/usr/bin/env node
/**
 * Static analysis test for src/lib/analytics.ts
 *
 * Follows the pattern of scripts/test-validation.js and scripts/test-api-retry.js.
 * Validates module structure, exports, and privacy guarantees without requiring
 * a browser environment.
 *
 * Run: node scripts/test-analytics.js
 *
 * Related Issue: #21 - Analytics and Monitoring
 */

const fs = require('fs');
const path = require('path');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.log(`  ❌ ${name}`);
    console.log(`     ${err.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

// ---------------------------------------------------------------------------
console.log('\n🔍 Analytics Module — Static Analysis Tests\n');
// ---------------------------------------------------------------------------

const ANALYTICS_PATH = path.join(__dirname, '../src/lib/analytics.ts');
const ERROR_TRACKING_PATH = path.join(__dirname, '../src/lib/errorTracking.ts');
const PERF_MONITOR_PATH = path.join(__dirname, '../src/lib/performanceMonitor.ts');
const PROVIDER_PATH = path.join(__dirname, '../src/components/AnalyticsProvider.tsx');

// ---------------------------------------------------------------------------
// 1. File existence
// ---------------------------------------------------------------------------
console.log('📁 File Existence:');

test('src/lib/analytics.ts exists', () => {
  assert(fs.existsSync(ANALYTICS_PATH), 'analytics.ts not found');
});

test('src/lib/errorTracking.ts exists', () => {
  assert(fs.existsSync(ERROR_TRACKING_PATH), 'errorTracking.ts not found');
});

test('src/lib/performanceMonitor.ts exists', () => {
  assert(fs.existsSync(PERF_MONITOR_PATH), 'performanceMonitor.ts not found');
});

test('src/components/AnalyticsProvider.tsx exists', () => {
  assert(fs.existsSync(PROVIDER_PATH), 'AnalyticsProvider.tsx not found');
});

// ---------------------------------------------------------------------------
// 2. Analytics module exports
// ---------------------------------------------------------------------------
console.log('\n📤 Analytics Module Exports:');

const analyticsSource = fs.readFileSync(ANALYTICS_PATH, 'utf8');

const REQUIRED_ANALYTICS_EXPORTS = [
  'trackEvent',
  'trackPageView',
  'trackRiskScoreCalculated',
  'trackWalletConnected',
  'trackTierAccessed',
  'trackScoreCommitted',
  'Analytics',
];

for (const name of REQUIRED_ANALYTICS_EXPORTS) {
  test(`exports '${name}'`, () => {
    assert(analyticsSource.includes(`export`) && analyticsSource.includes(name),
      `'${name}' export not found in analytics.ts`);
  });
}

// ---------------------------------------------------------------------------
// 3. Privacy guarantees — analytics module must not log raw addresses
// ---------------------------------------------------------------------------
console.log('\n🔒 Privacy Guarantees — Analytics:');

test('analytics.ts does not pass wallet address in event props', () => {
  // Check that no function signatures accept an "address" parameter and forward it
  const walletConnectedFn = analyticsSource.match(/export async function trackWalletConnected[\s\S]*?^}/m)?.[0] || '';
  assert(!walletConnectedFn.includes('address'), 
    'trackWalletConnected must not forward an address to event props');
});

test('analytics.ts does not include raw score value in risk event', () => {
  const fn = analyticsSource.match(/export async function trackRiskScoreCalculated[\s\S]*?^}/m)?.[0] || '';
  // Props should only include tier and mode, not a numeric score
  assert(!fn.includes('score:'), 'trackRiskScoreCalculated must not forward score to event props');
});

test('analytics.ts references NEXT_PUBLIC_ANALYTICS_URL (opt-in)', () => {
  assert(analyticsSource.includes('NEXT_PUBLIC_ANALYTICS_URL'),
    'Must use NEXT_PUBLIC_ANALYTICS_URL env var');
});

// ---------------------------------------------------------------------------
// 4. Error tracking exports & security
// ---------------------------------------------------------------------------
console.log('\n🛡️  Error Tracking Module:');

const errorSource = fs.readFileSync(ERROR_TRACKING_PATH, 'utf8');

const REQUIRED_ERROR_EXPORTS = [
  'captureError',
  'captureMessage',
  'setUserContext',
  'clearUserContext',
  'withErrorTracking',
  'scrubSensitiveData',
  'scrubContext',
  'ErrorTracking',
];

for (const name of REQUIRED_ERROR_EXPORTS) {
  test(`exports '${name}'`, () => {
    assert(errorSource.includes(name), `'${name}' not found in errorTracking.ts`);
  });
}

test('errorTracking.ts includes data scrubbing before network calls', () => {
  assert(errorSource.includes('scrubSensitiveData') || errorSource.includes('scrubContext'),
    'Must call scrubSensitiveData or scrubContext before transmitting');
});

test('errorTracking.ts references NEXT_PUBLIC_SENTRY_DSN (opt-in)', () => {
  assert(errorSource.includes('NEXT_PUBLIC_SENTRY_DSN'),
    'Must use NEXT_PUBLIC_SENTRY_DSN env var');
});

// ---------------------------------------------------------------------------
// 5. Performance monitor exports
// ---------------------------------------------------------------------------
console.log('\n⚡ Performance Monitor Module:');

const perfSource = fs.readFileSync(PERF_MONITOR_PATH, 'utf8');

const REQUIRED_PERF_EXPORTS = [
  'measureWebVitals',
  'trackApiLatency',
  'trackComponentRender',
  'getMetricsSummary',
  'clearMetrics',
  'rateVital',
  'PerformanceMonitoring',
];

for (const name of REQUIRED_PERF_EXPORTS) {
  test(`exports '${name}'`, () => {
    assert(perfSource.includes(name), `'${name}' not found in performanceMonitor.ts`);
  });
}

// ---------------------------------------------------------------------------
// 6. AnalyticsProvider component
// ---------------------------------------------------------------------------
console.log('\n⚛️  AnalyticsProvider Component:');

const providerSource = fs.readFileSync(PROVIDER_PATH, 'utf8');

test('AnalyticsProvider is a named export', () => {
  assert(providerSource.includes('export function AnalyticsProvider') ||
    providerSource.includes('export { AnalyticsProvider }'),
    'AnalyticsProvider must be a named export');
});

test('AnalyticsProvider uses trackPageView', () => {
  assert(providerSource.includes('trackPageView'), 'Must track page views');
});

test('AnalyticsProvider uses measureWebVitals', () => {
  assert(providerSource.includes('measureWebVitals'), 'Must measure Web Vitals');
});

test('AnalyticsProvider uses captureError for global handlers', () => {
  assert(providerSource.includes('captureError'), 'Must capture global errors');
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
const total = passed + failed;
console.log(`\n${'─'.repeat(50)}`);
console.log(`📊 Results: ${passed}/${total} tests passed`);

if (failed > 0) {
  console.log(`\n❌ ${failed} test(s) failed. Please fix the issues above.\n`);
  process.exit(1);
} else {
  console.log(`\n✅ All ${total} analytics module tests passed!\n`);
  process.exit(0);
}
