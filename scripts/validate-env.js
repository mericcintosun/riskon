#!/usr/bin/env node
/**
 * Manual validation script for environment variables
 *
 * This script tests the environment validation module with various scenarios:
 * 1. Valid configuration
 * 2. Missing required variables
 * 3. Invalid URL format
 * 4. Invalid contract ID format
 * 5. Invalid port number
 * 6. Invalid network type
 *
 * Run with: node scripts/validate-env.js
 */

const fs = require('fs');
const path = require('path');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function section(title) {
  console.log(`\n${colors.cyan}${'='.repeat(60)}`);
  console.log(`${title}`);
  console.log(`${'='.repeat(60)}${colors.reset}\n`);
}

// Test Case 1: Valid Configuration
section('Test 1: Valid Configuration');
(() => {
  const backup = { ...process.env };

  // Set valid environment variables
  process.env.NEXT_PUBLIC_RPC_URL = 'https://soroban-testnet.stellar.org';
  process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';
  process.env.NEXT_PUBLIC_RISK_TIER_CONTRACT_ID = 'CD6NTP2JCX4F3V4RLIJFLGSG7SVTAPXMKKD3BTF4DY5NCV7YAO3OLABN';
  process.env.NODE_ENV = 'development';
  process.env.REDIS_PORT = '6379';
  process.env.LIQUIDITY_API_PORT = '3001';

  try {
    // Delete require cache to force re-evaluation
    delete require.cache[require.resolve('../src/config/env.ts')];

    const { validateEnv } = require('../src/config/env.ts');
    const env = validateEnv();

    log('green', '✅ PASS: Valid configuration accepted');
    log('blue', `   RPC URL: ${env.NEXT_PUBLIC_RPC_URL}`);
    log('blue', `   Redis Port: ${env.REDIS_PORT}`);
  } catch (error) {
    log('red', '❌ FAIL: Valid configuration rejected');
    log('red', `   Error: ${error.message}`);
  } finally {
    process.env = { ...backup };
  }
})();

// Test Case 2: Missing Required Variable
section('Test 2: Missing Required Variable (NEXT_PUBLIC_RPC_URL)');
(() => {
  const backup = { ...process.env };

  // Clear required variable
  delete process.env.NEXT_PUBLIC_RPC_URL;
  process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';
  process.env.NODE_ENV = 'development';

  try {
    delete require.cache[require.resolve('../src/config/env.ts')];

    const { validateClientEnv } = require('../src/config/env.ts');
    validateClientEnv();

    log('red', '❌ FAIL: Missing required variable not detected');
  } catch (error) {
    if (error.message.includes('NEXT_PUBLIC_RPC_URL')) {
      log('green', '✅ PASS: Missing variable detected correctly');
      log('blue', `   Error message: ${error.message.split('\\n')[1]}`);
    } else {
      log('red', '❌ FAIL: Wrong error message');
      log('red', `   Error: ${error.message}`);
    }
  } finally {
    process.env = { ...backup };
  }
})();

// Test Case 3: Invalid URL Format
section('Test 3: Invalid URL Format');
(() => {
  const backup = { ...process.env };

  process.env.NEXT_PUBLIC_RPC_URL = 'not-a-valid-url';
  process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';
  process.env.NODE_ENV = 'development';

  try {
    delete require.cache[require.resolve('../src/config/env.ts')];

    const { validateClientEnv } = require('../src/config/env.ts');
    validateClientEnv();

    log('red', '❌ FAIL: Invalid URL format not detected');
  } catch (error) {
    if (error.message.includes('valid URL') || error.message.includes('url')) {
      log('green', '✅ PASS: Invalid URL format detected correctly');
      log('blue', `   Error includes URL validation`);
    } else {
      log('red', '❌ FAIL: Wrong error message');
      log('red', `   Error: ${error.message}`);
    }
  } finally {
    process.env = { ...backup };
  }
})();

// Test Case 4: Invalid Contract ID Format
section('Test 4: Invalid Contract ID Format');
(() => {
  const backup = { ...process.env };

  process.env.NEXT_PUBLIC_RPC_URL = 'https://soroban-testnet.stellar.org';
  process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';
  process.env.NEXT_PUBLIC_RISK_TIER_CONTRACT_ID = 'INVALID_CONTRACT_ID';
  process.env.NODE_ENV = 'development';

  try {
    delete require.cache[require.resolve('../src/config/env.ts')];

    const { validateClientEnv } = require('../src/config/env.ts');
    validateClientEnv();

    log('red', '❌ FAIL: Invalid contract ID format not detected');
  } catch (error) {
    if (error.message.includes('contract ID') || error.message.includes('56 characters')) {
      log('green', '✅ PASS: Invalid contract ID format detected correctly');
      log('blue', `   Error includes contract ID validation`);
    } else {
      log('red', '❌ FAIL: Wrong error message');
      log('red', `   Error: ${error.message}`);
    }
  } finally {
    process.env = { ...backup };
  }
})();

// Test Case 5: Invalid Port Number
section('Test 5: Invalid Port Number');
(() => {
  const backup = { ...process.env };

  process.env.NEXT_PUBLIC_RPC_URL = 'https://soroban-testnet.stellar.org';
  process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';
  process.env.REDIS_PORT = '99999'; // Invalid port (> 65535)
  process.env.NODE_ENV = 'development';

  try {
    delete require.cache[require.resolve('../src/config/env.ts')];

    const { validateServerEnv } = require('../src/config/env.ts');
    validateServerEnv();

    log('red', '❌ FAIL: Invalid port number not detected');
  } catch (error) {
    if (error.message.includes('Port') || error.message.includes('65535')) {
      log('green', '✅ PASS: Invalid port number detected correctly');
      log('blue', `   Error includes port validation`);
    } else {
      log('red', '❌ FAIL: Wrong error message');
      log('red', `   Error: ${error.message}`);
    }
  } finally {
    process.env = { ...backup };
  }
})();

// Test Case 6: Invalid Network Type
section('Test 6: Invalid Network Type');
(() => {
  const backup = { ...process.env };

  process.env.NEXT_PUBLIC_RPC_URL = 'https://soroban-testnet.stellar.org';
  process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';
  process.env.STELLAR_NETWORK = 'INVALID_NETWORK';
  process.env.NODE_ENV = 'development';

  try {
    delete require.cache[require.resolve('../src/config/env.ts')];

    const { validateServerEnv } = require('../src/config/env.ts');
    validateServerEnv();

    log('red', '❌ FAIL: Invalid network type not detected');
  } catch (error) {
    if (error.message.includes('TESTNET') || error.message.includes('PUBLIC')) {
      log('green', '✅ PASS: Invalid network type detected correctly');
      log('blue', `   Error includes network validation`);
    } else {
      log('red', '❌ FAIL: Wrong error message');
      log('red', `   Error: ${error.message}`);
    }
  } finally {
    process.env = { ...backup };
  }
})();

// Test Case 7: Boolean Environment Variable Parsing
section('Test 7: Boolean Environment Variable Parsing');
(() => {
  const backup = { ...process.env };

  process.env.NEXT_PUBLIC_RPC_URL = 'https://soroban-testnet.stellar.org';
  process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';
  process.env.NEXT_PUBLIC_PASSKEY_ENABLED = 'true';
  process.env.FEATURE_LIQUIDITY_MONITORING = '1';
  process.env.DEBUG_CONTRACT_CALLS = 'false';
  process.env.NODE_ENV = 'development';

  try {
    delete require.cache[require.resolve('../src/config/env.ts')];

    const { validateEnv } = require('../src/config/env.ts');
    const env = validateEnv();

    if (env.NEXT_PUBLIC_PASSKEY_ENABLED === true &&
        env.FEATURE_LIQUIDITY_MONITORING === true &&
        env.DEBUG_CONTRACT_CALLS === false) {
      log('green', '✅ PASS: Boolean parsing works correctly');
      log('blue', `   PASSKEY_ENABLED: ${env.NEXT_PUBLIC_PASSKEY_ENABLED} (type: ${typeof env.NEXT_PUBLIC_PASSKEY_ENABLED})`);
      log('blue', `   LIQUIDITY_MONITORING: ${env.FEATURE_LIQUIDITY_MONITORING} (type: ${typeof env.FEATURE_LIQUIDITY_MONITORING})`);
      log('blue', `   DEBUG_CONTRACT_CALLS: ${env.DEBUG_CONTRACT_CALLS} (type: ${typeof env.DEBUG_CONTRACT_CALLS})`);
    } else {
      log('red', '❌ FAIL: Boolean parsing incorrect');
    }
  } catch (error) {
    log('red', '❌ FAIL: Boolean parsing failed');
    log('red', `   Error: ${error.message}`);
  } finally {
    process.env = { ...backup };
  }
})();

// Summary
section('Test Summary');
log('cyan', '📋 All validation tests completed!');
log('cyan', '   Review the results above to ensure all tests passed.');
log('cyan', '   ✅ = Test passed correctly');
log('cyan', '   ❌ = Test failed');
console.log('');
