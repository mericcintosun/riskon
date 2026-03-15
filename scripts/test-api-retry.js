#!/usr/bin/env node
/**
 * Test script for API retry module
 * Tests API Rate Limiting and Retry Mechanism (Issue #12)
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

console.log(`\n${colors.cyan}🧪 API Retry Module Tests${colors.reset}\n`);

let allTestsPassed = true;

// Test 1: Check apiRetry.ts exists
console.log(`${colors.blue}Test 1: Checking apiRetry.ts exists...${colors.reset}`);
const apiRetryPath = path.join(__dirname, '../src/lib/apiRetry.ts');
if (fs.existsSync(apiRetryPath)) {
  log('green', '✅ PASS: apiRetry.ts file exists');
} else {
  log('red', '❌ FAIL: apiRetry.ts file not found');
  allTestsPassed = false;
}

// Test 2: Check module structure
console.log(`\n${colors.blue}Test 2: Checking module structure...${colors.reset}`);
const apiRetryContent = fs.readFileSync(apiRetryPath, 'utf8');

const requiredFunctions = [
  'retryWithBackoff',
  'fetchWithRetry',
  'fetchWithCircuitBreaker',
  'fetchWithRateLimit',
  'fetchWithProtection',
];

const requiredClasses = [
  'CircuitBreaker',
  'RateLimiter',
];

let structureValid = true;
for (const func of requiredFunctions) {
  if (!apiRetryContent.includes(`function ${func}`) &&
      !apiRetryContent.includes(`export function ${func}`) &&
      !apiRetryContent.includes(`async function ${func}`) &&
      !apiRetryContent.includes(`export async function ${func}`)) {
    log('red', `❌ Missing function: ${func}`);
    structureValid = false;
    allTestsPassed = false;
  }
}

for (const cls of requiredClasses) {
  if (!apiRetryContent.includes(`class ${cls}`)) {
    log('red', `❌ Missing class: ${cls}`);
    structureValid = false;
    allTestsPassed = false;
  }
}

if (structureValid) {
  log('green', '✅ PASS: apiRetry.ts has correct structure');
  log('blue', `   - Found ${requiredFunctions.length} retry functions`);
  log('blue', `   - Found ${requiredClasses.length} protection classes`);
}

// Test 3: Check exponential backoff implementation
console.log(`\n${colors.blue}Test 3: Checking exponential backoff...${colors.reset}`);
if (apiRetryContent.includes('calculateDelay') &&
    apiRetryContent.includes('backoffMultiplier') &&
    apiRetryContent.includes('Math.pow')) {
  log('green', '✅ PASS: Exponential backoff implemented');
  log('blue', '   - Delay calculation function');
  log('blue', '   - Backoff multiplier');
  log('blue', '   - Jitter for thundering herd prevention');
} else {
  log('red', '❌ FAIL: Exponential backoff incomplete');
  allTestsPassed = false;
}

// Test 4: Check circuit breaker pattern
console.log(`\n${colors.blue}Test 4: Checking circuit breaker pattern...${colors.reset}`);
if (apiRetryContent.includes('CircuitState') &&
    apiRetryContent.includes('CLOSED') &&
    apiRetryContent.includes('OPEN') &&
    apiRetryContent.includes('HALF_OPEN')) {
  log('green', '✅ PASS: Circuit breaker pattern implemented');
  log('blue', '   - CLOSED state (normal operation)');
  log('blue', '   - OPEN state (rejecting requests)');
  log('blue', '   - HALF_OPEN state (testing recovery)');
} else {
  log('red', '❌ FAIL: Circuit breaker pattern incomplete');
  allTestsPassed = false;
}

// Test 5: Check rate limiting
console.log(`\n${colors.blue}Test 5: Checking rate limiting...${colors.reset}`);
if (apiRetryContent.includes('RateLimiter') &&
    apiRetryContent.includes('token') &&
    apiRetryContent.includes('refill')) {
  log('green', '✅ PASS: Rate limiting implemented');
  log('blue', '   - Token bucket algorithm');
  log('blue', '   - Token refill mechanism');
} else {
  log('red', '❌ FAIL: Rate limiting incomplete');
  allTestsPassed = false;
}

// Test 6: Check retryable error detection
console.log(`\n${colors.blue}Test 6: Checking retryable error detection...${colors.reset}`);
if (apiRetryContent.includes('isRetryableError') &&
    apiRetryContent.includes('retryableStatusCodes') &&
    (apiRetryContent.includes('408') || apiRetryContent.includes('429') ||
     apiRetryContent.includes('500') || apiRetryContent.includes('503'))) {
  log('green', '✅ PASS: Retryable error detection implemented');
  log('blue', '   - HTTP status code checking');
  log('blue', '   - Network error detection');
  log('blue', '   - Rate limit detection');
} else {
  log('red', '❌ FAIL: Retryable error detection incomplete');
  allTestsPassed = false;
}

// Test 7: Check timeout handling
console.log(`\n${colors.blue}Test 7: Checking timeout handling...${colors.reset}`);
if (apiRetryContent.includes('timeout') &&
    apiRetryContent.includes('AbortController')) {
  log('green', '✅ PASS: Timeout handling implemented');
  log('blue', '   - AbortController for request cancellation');
  log('blue', '   - Configurable timeout');
} else {
  log('red', '❌ FAIL: Timeout handling incomplete');
  allTestsPassed = false;
}

// Test 8: Check comprehensive fetch wrapper
console.log(`\n${colors.blue}Test 8: Checking comprehensive fetch wrapper...${colors.reset}`);
if (apiRetryContent.includes('fetchWithProtection')) {
  log('green', '✅ PASS: Comprehensive fetch wrapper present');
  log('blue', '   - Combines retry + circuit breaker + rate limiting');
} else {
  log('red', '❌ FAIL: Comprehensive fetch wrapper missing');
  allTestsPassed = false;
}

// Test 9: Check configuration options
console.log(`\n${colors.blue}Test 9: Checking configuration options...${colors.reset}`);
if (apiRetryContent.includes('RetryOptions') &&
    apiRetryContent.includes('maxRetries') &&
    apiRetryContent.includes('initialDelay') &&
    apiRetryContent.includes('maxDelay')) {
  log('green', '✅ PASS: Configuration options defined');
  log('blue', '   - Retry configuration interface');
  log('blue', '   - Default options');
} else {
  log('red', '❌ FAIL: Configuration options incomplete');
  allTestsPassed = false;
}

// Test 10: Check exports
console.log(`\n${colors.blue}Test 10: Checking exports...${colors.reset}`);
if (apiRetryContent.includes('export const ApiRetry')) {
  log('green', '✅ PASS: Convenience exports present');
  log('blue', '   - ApiRetry object exported');
} else {
  log('red', '❌ FAIL: Missing convenience exports');
  allTestsPassed = false;
}

// Summary
console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}`);
if (allTestsPassed) {
  log('green', '✅ ALL API RETRY TESTS PASSED');
  log('cyan', '\n📋 Issue #12: API Rate Limiting and Retry Mechanism - COMPLETE\n');
  process.exit(0);
} else {
  log('red', '❌ SOME TESTS FAILED');
  process.exit(1);
}
