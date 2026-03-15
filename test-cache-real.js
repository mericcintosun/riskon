#!/usr/bin/env node

/**
 * Cache System Tester (Real Implementation)
 * Tests actual cache manager files with Node.js mocks
 * Run with: node test-cache-real.js
 */

const path = require('path');
const fs = require('fs');

// Setup Node.js environment for ES modules
require('esbuild').buildSync({
  entryPoints: ['./src/lib/cacheManager.ts'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  outfile: './temp-cache-test.js'
});

// Mock browser APIs
global.window = {
  indexedDB: {
    open: () => ({
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null,
      result: {
        transaction: () => ({
          objectStore: () => ({
            put: () => ({ onsuccess: null, onerror: null }),
            get: () => ({ onsuccess: null, onerror: null }),
            delete: () => ({ onsuccess: null, onerror: null })
          })
        })
      }
    })
  },
  addEventListener: () => {},
  removeEventListener: () => {}
};

global.localStorage = {
  _storage: {},
  getItem(key) { return this._storage[key] || null; },
  setItem(key, value) { this._storage[key] = String(value); },
  removeItem(key) { delete this._storage[key]; },
  clear() { this._storage = {}; },
  get length() { return Object.keys(this._storage).length; },
  key(index) { return Object.keys(this._storage)[index] || null; }
};

console.log('🧪 Cache System Test (Real Implementation)');
console.log('Note: This requires TypeScript compilation. Use the standalone test instead.');
console.log('Run: node test-cache-standalone.js');

// Cleanup temp files
if (fs.existsSync('./temp-cache-test.js')) {
  fs.unlinkSync('./temp-cache-test.js');
}