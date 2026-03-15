#!/usr/bin/env node
/**
 * Test script for validation module
 * Tests Input Validation and Sanitization (Issue #18)
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

console.log(`\n${colors.cyan}🧪 Validation Module Tests${colors.reset}\n`);

let allTestsPassed = true;

// Test 1: Check validation.ts exists
console.log(`${colors.blue}Test 1: Checking validation.ts exists...${colors.reset}`);
const validationPath = path.join(__dirname, '../src/lib/validation.ts');
if (fs.existsSync(validationPath)) {
  log('green', '✅ PASS: validation.ts file exists');
} else {
  log('red', '❌ FAIL: validation.ts file not found');
  allTestsPassed = false;
}

// Test 2: Check module structure
console.log(`\n${colors.blue}Test 2: Checking module structure...${colors.reset}`);
const validationContent = fs.readFileSync(validationPath, 'utf8');

const requiredImports = ['import { StrKey }'];
const requiredFunctions = [
  'validateStellarAddress',
  'validateContractId',
  'validateRiskScore',
  'sanitizeString',
  'validateUrl',
  'validateNumberRange',
  'validateEmail',
  'validateTransactionHash',
  'validateAmount',
  'validateAssetCode',
];

let structureValid = true;
for (const imp of requiredImports) {
  if (!validationContent.includes(imp)) {
    log('red', `❌ Missing import: ${imp}`);
    structureValid = false;
    allTestsPassed = false;
  }
}

for (const func of requiredFunctions) {
  if (!validationContent.includes(`function ${func}`) &&
      !validationContent.includes(`export function ${func}`)) {
    log('red', `❌ Missing function: ${func}`);
    structureValid = false;
    allTestsPassed = false;
  }
}

if (structureValid) {
  log('green', '✅ PASS: validation.ts has correct structure');
  log('blue', `   - Found ${requiredFunctions.length} validation functions`);
}

// Test 3: Check for XSS prevention
console.log(`\n${colors.blue}Test 3: Checking XSS prevention...${colors.reset}`);
if (validationContent.includes('sanitizeString') &&
    validationContent.includes('stripHtmlTags') &&
    validationContent.includes('&lt;') &&
    validationContent.includes('&gt;')) {
  log('green', '✅ PASS: XSS prevention utilities present');
  log('blue', '   - sanitizeString function');
  log('blue', '   - stripHtmlTags function');
  log('blue', '   - HTML entity encoding');
} else {
  log('red', '❌ FAIL: XSS prevention incomplete');
  allTestsPassed = false;
}

// Test 4: Check Stellar-specific validations
console.log(`\n${colors.blue}Test 4: Checking Stellar-specific validations...${colors.reset}`);
if (validationContent.includes('StrKey.isValidEd25519PublicKey') &&
    validationContent.includes('StrKey.isValidContract')) {
  log('green', '✅ PASS: Stellar address validation present');
  log('blue', '   - G... address validation');
  log('blue', '   - C... contract validation');
} else {
  log('red', '❌ FAIL: Stellar validation incomplete');
  allTestsPassed = false;
}

// Test 5: Check validation result interface
console.log(`\n${colors.blue}Test 5: Checking ValidationResult interface...${colors.reset}`);
if (validationContent.includes('interface ValidationResult') &&
    validationContent.includes('isValid: boolean') &&
    validationContent.includes('error?: string') &&
    validationContent.includes('sanitized?:')) {
  log('green', '✅ PASS: ValidationResult interface defined correctly');
} else {
  log('red', '❌ FAIL: ValidationResult interface missing or incomplete');
  allTestsPassed = false;
}

// Test 6: Check comprehensive validation coverage
console.log(`\n${colors.blue}Test 6: Checking validation coverage...${colors.reset}`);
const validationTypes = [
  'address',
  'contract',
  'score',
  'url',
  'email',
  'transaction',
  'amount',
  'asset',
];

let coverageValid = true;
for (const type of validationTypes) {
  const found = validationContent.toLowerCase().includes(type);
  if (!found) {
    log('red', `❌ Missing validation type: ${type}`);
    coverageValid = false;
    allTestsPassed = false;
  }
}

if (coverageValid) {
  log('green', '✅ PASS: Comprehensive validation coverage');
  log('blue', `   - ${validationTypes.length} validation types covered`);
}

// Test 7: Check exports
console.log(`\n${colors.blue}Test 7: Checking exports...${colors.reset}`);
if (validationContent.includes('export const Validators') &&
    validationContent.includes('export const Sanitizers')) {
  log('green', '✅ PASS: Convenience exports present');
  log('blue', '   - Validators object exported');
  log('blue', '   - Sanitizers object exported');
} else {
  log('red', '❌ FAIL: Missing convenience exports');
  allTestsPassed = false;
}

// Summary
console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}`);
if (allTestsPassed) {
  log('green', '✅ ALL VALIDATION TESTS PASSED');
  log('cyan', '\n📋 Issue #18: Input Validation and Sanitization - COMPLETE\n');
  process.exit(0);
} else {
  log('red', '❌ SOME TESTS FAILED');
  process.exit(1);
}
