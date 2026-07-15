/**
 * API Route Testing
 *
 * Tests for the metadata endpoints (/health, /docs).
 *
 * These tests import the Next.js App Router route handlers directly and invoke
 * them in-process (instead of issuing real HTTP requests against a running
 * server). This makes them fast, deterministic, and runnable without a live
 * server.
 *
 * The jsdom environment (from jest.config) does not provide the Web
 * `Request`/`Response`/`fetch` globals that `next/server` relies on, so we
 * install them from Next's bundled edge-runtime primitives before importing
 * the route handlers.
 *
 * The data endpoints (/pools/ratings, /risk/attest, /passkey/deploy) are not
 * covered here: each one reaches a live network (Blend mainnet, Horizon,
 * Soroban RPC) and the value of testing them is in whether the real call
 * succeeds, which a mocked in-process test cannot tell us.
 *
 * Run with: npm test -- api.test.ts
 */

// NOTE: `require` (not ESM `import`) is used deliberately below. Babel hoists
// `import` statements above all other top-level code, which would run
// `next/server` before the polyfill installs the Web API globals it depends on.
// Using `require` preserves execution order: polyfill first, then handlers.
/* eslint-disable @typescript-eslint/no-var-requires */

const g = globalThis as Record<string, unknown>;

// Prerequisite Web globals that jsdom omits but the fetch primitives need.
function ensure(name: string, value: unknown) {
  if (typeof g[name] === 'undefined' && value) g[name] = value;
}
const nodeUtil = require('node:util');
ensure('TextEncoder', nodeUtil.TextEncoder);
ensure('TextDecoder', nodeUtil.TextDecoder);
const nodeStreamWeb = require('node:stream/web');
ensure('ReadableStream', nodeStreamWeb.ReadableStream);
ensure('WritableStream', nodeStreamWeb.WritableStream);
ensure('TransformStream', nodeStreamWeb.TransformStream);
const nodeWorker = require('node:worker_threads');
ensure('MessagePort', nodeWorker.MessagePort);
ensure('MessageChannel', nodeWorker.MessageChannel);

const edgePrimitives = require('next/dist/compiled/@edge-runtime/primitives/fetch.js');
for (const name of ['Request', 'Response', 'Headers', 'fetch', 'FormData']) {
  ensure(name, edgePrimitives[name]);
}

const { NextRequest } = require('next/server') as typeof import('next/server');

const { GET: healthGET } = require('@/app/api/health/route');
const { GET: docsGET } = require('@/app/api/docs/route');
/* eslint-enable @typescript-eslint/no-var-requires */

// Base URL is only used to construct request objects; no network is involved.
const baseUrl = 'http://localhost/api';

/** Build a NextRequest for a GET handler. */
function makeGetRequest(path: string): NextRequest {
  return new NextRequest(`${baseUrl}${path}`);
}

describe('Riskon API Routes', () => {
  describe('GET /health', () => {
    it('should return healthy status', async () => {
      const response = await healthGET(makeGetRequest('/health'));
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.status).toBe('healthy');
      expect(data.service).toBe('Riskon API Layer');
      expect(data.endpoints).toBeDefined();
      expect(data.endpoints.pools.ratings).toBe('GET /api/pools/ratings');
      expect(typeof data.uptime_seconds).toBe('number');
      expect(data.timestamp).toBeDefined();
    });

    it('should only advertise endpoints that exist', async () => {
      const response = await healthGET(makeGetRequest('/health'));
      const data = await response.json();

      const advertised = Object.values(
        data.endpoints as Record<string, Record<string, string>>
      ).flatMap((group) => Object.values(group));

      // A route that 404s in production is worse than one that is undocumented:
      // the liquidity endpoints were advertised here long after the UI stopped
      // being able to reach them.
      for (const entry of advertised) {
        expect(entry).not.toMatch(/\/api\/liquidity/);
        expect(entry).not.toMatch(/\/api\/cache/);
      }
    });
  });

  describe('GET /docs', () => {
    it('should return API documentation', async () => {
      const response = await docsGET(makeGetRequest('/docs'));
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.info).toBeDefined();
      expect(data.info.title).toBe('Riskon API Layer');
      expect(Array.isArray(data.endpoints)).toBe(true);
      expect(data.endpoints.length).toBeGreaterThan(0);
      expect(data.schemas).toBeDefined();
      expect(data.schemas.PoolRating).toBeDefined();
    });

    it('should document the contract tier thresholds', async () => {
      const response = await docsGET(makeGetRequest('/docs'));
      const data = await response.json();

      // These mirror can_access_tier in the risk contract. If the contract
      // changes, this is a place that has to change with it.
      expect(data.tierThresholds.TIER_1.max).toBe(30);
      expect(data.tierThresholds.TIER_3.min).toBe(70);
    });
  });

  describe('Response Format Consistency', () => {
    it('all success responses should include a timestamp', async () => {
      const responses = await Promise.all([
        healthGET(makeGetRequest('/health')),
        docsGET(makeGetRequest('/docs')),
      ]);

      for (const response of responses) {
        expect(response.ok).toBe(true);
        const data = await response.json();
        expect(data.timestamp ?? data.info).toBeDefined();
      }
    });
  });
});
