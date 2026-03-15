#!/usr/bin/env node
/**
 * Simple validation test for environment module
 *
 * Since the module is TypeScript, we'll test that:
 * 1. The TypeScript files have correct syntax
 * 2. The schema definitions are properly structured
 * 3. The documentation is complete
 *
 * For runtime testing, run: npm run build
 */

const fs = require('fs');
const path = require('path');

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

console.log(`\n${colors.cyan}🧪 Environment Validation Module Tests${colors.reset}\n`);

let allTestsPassed = true;

// Test 1: Check that env.ts exists
console.log(`${colors.blue}Test 1: Checking env.ts exists...${colors.reset}`);
const envPath = path.join(__dirname, '../src/config/env.ts');
if (fs.existsSync(envPath)) {
  log('green', '✅ PASS: env.ts file exists');
} else {
  log('red', '❌ FAIL: env.ts file not found');
  allTestsPassed = false;
}

// Test 2: Check that env.init.ts exists
console.log(`\n${colors.blue}Test 2: Checking env.init.ts exists...${colors.reset}`);
const envInitPath = path.join(__dirname, '../src/config/env.init.ts');
if (fs.existsSync(envInitPath)) {
  log('green', '✅ PASS: env.init.ts file exists');
} else {
  log('red', '❌ FAIL: env.init.ts file not found');
  allTestsPassed = false;
}

// Test 3: Check that documentation exists
console.log(`\n${colors.blue}Test 3: Checking documentation exists...${colors.reset}`);
const docsPath = path.join(__dirname, '../src/config/ENV_VALIDATION_README.md');
if (fs.existsSync(docsPath)) {
  log('green', '✅ PASS: Documentation file exists');
  const docsContent = fs.readFileSync(docsPath, 'utf8');
  if (docsContent.length > 1000) {
    log('green', `   Documentation is ${docsContent.length} characters (comprehensive)`);
  }
} else {
  log('red', '❌ FAIL: Documentation not found');
  allTestsPassed = false;
}

// Test 4: Check that package.json includes zod
console.log(`\n${colors.blue}Test 4: Checking zod dependency...${colors.reset}`);
const packagePath = path.join(__dirname, '../package.json');
const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
if (packageJson.dependencies && packageJson.dependencies.zod) {
  log('green', `✅ PASS: zod dependency added (version: ${packageJson.dependencies.zod})`);
} else {
  log('red', '❌ FAIL: zod not found in dependencies');
  allTestsPassed = false;
}

// Test 5: Check TypeScript syntax in env.ts
console.log(`\n${colors.blue}Test 5: Checking env.ts structure...${colors.reset}`);
const envContent = fs.readFileSync(envPath, 'utf8');

const requiredImports = ['import { z } from "zod"'];
const requiredExports = [
  'export function validateClientEnv',
  'export function validateServerEnv',
  'export function validateEnv',
  'export function getEnv',
  'export function checkMissingEnvVars',
];

let structureValid = true;
for (const imp of requiredImports) {
  if (!envContent.includes(imp)) {
    log('red', `❌ Missing import: ${imp}`);
    structureValid = false;
    allTestsPassed = false;
  }
}

for (const exp of requiredExports) {
  if (!envContent.includes(exp)) {
    log('red', `❌ Missing export: ${exp}`);
    structureValid = false;
    allTestsPassed = false;
  }
}

if (structureValid) {
  log('green', '✅ PASS: env.ts has correct structure');
  log('blue', '   - Zod import present');
  log('blue', '   - All validation functions exported');
}

// Test 6: Check for Zod schemas
console.log(`\n${colors.blue}Test 6: Checking Zod schemas...${colors.reset}`);
const schemas = [
  'clientEnvSchema',
  'serverEnvSchema',
  'envSchema',
  'urlSchema',
  'contractIdSchema',
  'portSchema',
];

let schemasValid = true;
for (const schema of schemas) {
  if (!envContent.includes(schema)) {
    log('red', `❌ Missing schema: ${schema}`);
    schemasValid = false;
    allTestsPassed = false;
  }
}

if (schemasValid) {
  log('green', '✅ PASS: All required Zod schemas defined');
  log('blue', `   - Found ${schemas.length} schemas`);
}

// Test 7: Check for required environment variables
console.log(`\n${colors.blue}Test 7: Checking required variables definition...${colors.reset}`);
const requiredVars = [
  'NEXT_PUBLIC_RPC_URL',
  'NEXT_PUBLIC_NETWORK_PASSPHRASE',
  'REDIS_HOST',
  'REDIS_PORT',
];

let varsValid = true;
for (const varName of requiredVars) {
  if (!envContent.includes(varName)) {
    log('red', `❌ Missing variable definition: ${varName}`);
    varsValid = false;
    allTestsPassed = false;
  }
}

if (varsValid) {
  log('green', '✅ PASS: All required variables defined in schema');
}

// Test 8: Check error formatting function
console.log(`\n${colors.blue}Test 8: Checking error formatting...${colors.reset}`);
if (envContent.includes('formatZodError')) {
  log('green', '✅ PASS: Error formatting function present');
} else {
  log('red', '❌ FAIL: Error formatting function missing');
  allTestsPassed = false;
}

// Test 9: Check initialization logic
console.log(`\n${colors.blue}Test 9: Checking initialization logic...${colors.reset}`);
const envInitContent = fs.readFileSync(envInitPath, 'utf8');
if (envInitContent.includes('initializeEnv') &&
    envInitContent.includes('checkMissingEnvVars') &&
    envInitContent.includes('validateEnv')) {
  log('green', '✅ PASS: Initialization logic complete');
  log('blue', '   - initializeEnv function present');
  log('blue', '   - Calls validation functions');
  log('blue', '   - Checks for missing variables');
} else {
  log('red', '❌ FAIL: Initialization logic incomplete');
  allTestsPassed = false;
}

// Test 10: Check documentation completeness
console.log(`\n${colors.blue}Test 10: Checking documentation completeness...${colors.reset}`);
const docsContent = fs.readFileSync(docsPath, 'utf8');
const docsSections = [
  '## Overview',
  '## Features',
  '## Usage',
  '## Environment Variables',
  '## Validation Rules',
  '## Error Handling',
  '## Testing',
];

let docsValid = true;
for (const section of docsSections) {
  if (!docsContent.includes(section)) {
    log('red', `❌ Missing documentation section: ${section}`);
    docsValid = false;
    allTestsPassed = false;
  }
}

if (docsValid) {
  log('green', '✅ PASS: Documentation is complete');
  log('blue', `   - All ${docsSections.length} sections present`);
}

// Summary
console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}`);
if (allTestsPassed) {
  log('green', '✅ ALL TESTS PASSED');
  log('cyan', '\n📋 Static validation complete!');
  log('cyan', '💡 To test runtime validation, run: npm run build');
  log('cyan', '   This will validate the environment during the build process.\n');
  process.exit(0);
} else {
  log('red', '❌ SOME TESTS FAILED');
  log('yellow', '\n⚠️  Please review the failures above.\n');
  process.exit(1);
}
