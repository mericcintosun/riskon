/**
 * API Route Testing
 *
 * Comprehensive tests for all API endpoints.
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
const { GET: poolsAllGET } = require('@/app/api/liquidity/pools/all/route');
const { GET: poolsTierGET } = require('@/app/api/liquidity/pools/tier/[tier]/route');
const { GET: poolDetailsGET } = require('@/app/api/liquidity/pool/[poolId]/route');
const { GET: statsGET } = require('@/app/api/liquidity/stats/route');
const { POST: cacheInvalidatePOST } = require('@/app/api/cache/invalidate/route');
/* eslint-enable @typescript-eslint/no-var-requires */

// Base URL is only used to construct request objects; no network is involved.
const baseUrl = 'http://localhost/api';

// Mock data expectations (mirrors the hardcoded mock pools in the routes)
const mockPoolId = 'pool-xlm-usdc';
const mockTier = 'TIER_1';
const invalidTier = 'TIER_4';

/** Build a NextRequest for a GET handler. */
function makeGetRequest(path: string): NextRequest {
  return new NextRequest(`${baseUrl}${path}`);
}

/** Build a NextRequest for the cache-invalidate POST handler. */
function makePostRequest(path: string, body: string): NextRequest {
  return new NextRequest(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
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
      expect(data.endpoints.liquidity.all_pools).toBe(
        'GET /api/liquidity/pools/all'
      );
      expect(typeof data.uptime_seconds).toBe('number');
      expect(data.timestamp).toBeDefined();
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
      expect(data.schemas.LiquidityPool).toBeDefined();
      expect(data.validCachePaths).toContain('liquidity-pools-all');
    });
  });

  describe('GET /liquidity/pools/all', () => {
    it('should return all pools with default parameters', async () => {
      const response = await poolsAllGET(makeGetRequest('/liquidity/pools/all'));
      expect(response.status).toBe(200);

      const { success, data, timestamp } = await response.json();
      expect(success).toBe(true);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(4);
      expect(timestamp).toBeDefined();

      const ids = data.map((p: { poolId: string }) => p.poolId);
      expect(ids).toContain('pool-xlm-usdc');
      expect(ids).toContain('pool-experimental-token');
    });

    it('should support sorting by TVL', async () => {
      const response = await poolsAllGET(
        makeGetRequest('/liquidity/pools/all?sort=tvl&order=desc')
      );
      expect(response.status).toBe(200);

      const { data } = await response.json();
      for (let i = 0; i < data.length - 1; i++) {
        expect(data[i].tvl).toBeGreaterThanOrEqual(data[i + 1].tvl);
      }
      // Highest TVL pool is the TIER_1 XLM/USDC pool at 2,500,000.
      expect(data[0].poolId).toBe('pool-xlm-usdc');
      expect(data[0].tvl).toBe(2500000);
    });

    it('should support limiting results', async () => {
      const response = await poolsAllGET(
        makeGetRequest('/liquidity/pools/all?limit=2')
      );
      expect(response.status).toBe(200);

      const { data } = await response.json();
      expect(data.length).toBe(2);
    });

    it('should return an error for invalid sort parameter', async () => {
      const response = await poolsAllGET(
        makeGetRequest('/liquidity/pools/all?sort=invalid')
      );
      // The route validates the query with Zod; an invalid enum value throws
      // and is caught by the generic handler, which responds 500/INTERNAL_ERROR.
      expect(response.status).toBe(500);

      const { code, error } = await response.json();
      expect(code).toBe('INTERNAL_ERROR');
      expect(error).toBeDefined();
    });
  });

  describe('GET /liquidity/pools/tier/:tier', () => {
    it('should return pools for valid tier', async () => {
      const response = await poolsTierGET(
        makeGetRequest(`/liquidity/pools/tier/${mockTier}`),
        { params: Promise.resolve({ tier: mockTier }) }
      );
      expect(response.status).toBe(200);

      const { success, data, meta } = await response.json();
      expect(success).toBe(true);
      expect(Array.isArray(data)).toBe(true);
      expect(meta.tier).toBe(mockTier);
      expect(typeof meta.count).toBe('number');
      expect(meta.count).toBe(data.length);
      // TIER_1 has exactly one mock pool.
      expect(meta.count).toBe(1);
    });

    it('should filter pools correctly by tier', async () => {
      const response = await poolsTierGET(
        makeGetRequest(`/liquidity/pools/tier/${mockTier}`),
        { params: Promise.resolve({ tier: mockTier }) }
      );
      const { data } = await response.json();

      expect(data.length).toBeGreaterThan(0);
      for (const pool of data) {
        expect(pool.tier).toBe(mockTier);
      }
    });

    it('should return 400 for invalid tier', async () => {
      const response = await poolsTierGET(
        makeGetRequest(`/liquidity/pools/tier/${invalidTier}`),
        { params: Promise.resolve({ tier: invalidTier }) }
      );
      expect(response.status).toBe(400);

      const { code, error } = await response.json();
      expect(code).toBe('INVALID_INPUT');
      expect(error).toContain('TIER_1');
    });

    it('should return pools for TIER_3 (mid/low tier)', async () => {
      const response = await poolsTierGET(
        makeGetRequest('/liquidity/pools/tier/TIER_3'),
        { params: Promise.resolve({ tier: 'TIER_3' }) }
      );
      expect(response.status).toBe(200);

      const { data, meta } = await response.json();
      expect(Array.isArray(data)).toBe(true);
      expect(meta.tier).toBe('TIER_3');
      // TIER_3 has exactly one mock pool (the experimental token pool).
      expect(data.every((p: { tier: string }) => p.tier === 'TIER_3')).toBe(
        true
      );
    });
  });

  describe('GET /liquidity/pool/:poolId', () => {
    it('should return pool details for valid pool ID', async () => {
      const response = await poolDetailsGET(
        makeGetRequest(`/liquidity/pool/${mockPoolId}`),
        { params: Promise.resolve({ poolId: mockPoolId }) }
      );
      expect(response.status).toBe(200);

      const { success, data } = await response.json();
      expect(success).toBe(true);
      expect(data.poolId).toBe(mockPoolId);
      expect(data.tvl).toBe(2500000);
      expect(data.tier).toBe('TIER_1');
      expect(Array.isArray(data.reserves)).toBe(true);
      expect(data.reserves.length).toBe(2);
    });

    it('should return 404 for non-existent pool', async () => {
      const response = await poolDetailsGET(
        makeGetRequest('/liquidity/pool/pool-nonexistent'),
        { params: Promise.resolve({ poolId: 'pool-nonexistent' }) }
      );
      expect(response.status).toBe(404);

      const { code } = await response.json();
      expect(code).toBe('NOT_FOUND');
    });

    it('should validate pool data structure', async () => {
      const response = await poolDetailsGET(
        makeGetRequest(`/liquidity/pool/${mockPoolId}`),
        { params: Promise.resolve({ poolId: mockPoolId }) }
      );
      const { data } = await response.json();

      expect(typeof data.poolId).toBe('string');
      expect(typeof data.tvl).toBe('number');
      expect(['TIER_1', 'TIER_2', 'TIER_3']).toContain(data.tier);
      expect(typeof data.totalAccounts).toBe('number');
      expect(typeof data.totalShares).toBe('string');
      expect(typeof data.timestamp).toBe('string');
    });
  });

  describe('GET /liquidity/stats', () => {
    it('should return aggregated statistics', async () => {
      const response = await statsGET(makeGetRequest('/liquidity/stats'));
      expect(response.status).toBe(200);

      const { success, data } = await response.json();
      expect(success).toBe(true);
      expect(data.TIER_1).toBeDefined();
      expect(data.TIER_2).toBeDefined();
      expect(data.TIER_3).toBeDefined();
      expect(data.total).toBe(4);
      expect(data.lastUpdate).toBeDefined();
    });

    it('should include TVL breakdown', async () => {
      const response = await statsGET(makeGetRequest('/liquidity/stats'));
      const { data } = await response.json();

      expect(data.tvl_breakdown).toBeDefined();
      expect(data.tvl_breakdown.TIER_1).toBeDefined();
      expect(data.tvl_breakdown.grand_total).toBeDefined();
      // Sum of all mock pool TVLs: 2.5M + 800k + 450k + 50k = 3.8M
      expect(data.tvl_breakdown.grand_total).toBe(3800000);
      expect(data.average_pool_size).toBeDefined();
      expect(data.average_pool_size).toBe(950000);
    });

    it('should have consistent tier counts', async () => {
      const response = await statsGET(makeGetRequest('/liquidity/stats'));
      const { data } = await response.json();

      const sum = data.TIER_1 + data.TIER_2 + data.TIER_3;
      expect(sum).toBe(data.total);
      // TIER_1: 1, TIER_2: 2, TIER_3: 1
      expect(data.TIER_1).toBe(1);
      expect(data.TIER_2).toBe(2);
      expect(data.TIER_3).toBe(1);
    });
  });

  describe('POST /cache/invalidate', () => {
    it('should invalidate all caches', async () => {
      const response = await cacheInvalidatePOST(
        makePostRequest('/cache/invalidate', JSON.stringify({ all: true }))
      );
      expect(response.status).toBe(200);

      const { success, invalidated } = await response.json();
      expect(success).toBe(true);
      expect(Array.isArray(invalidated)).toBe(true);
      expect(invalidated.length).toBeGreaterThan(0);
      expect(invalidated).toContain('liquidity-pools-all');
    });

    it('should invalidate specific cache paths', async () => {
      const paths = ['liquidity-pools-all', 'liquidity-stats'];
      const response = await cacheInvalidatePOST(
        makePostRequest('/cache/invalidate', JSON.stringify({ paths }))
      );
      expect(response.status).toBe(200);

      const { invalidated } = await response.json();
      expect(invalidated).toEqual(expect.arrayContaining(paths));
    });

    it('should reject invalid cache paths', async () => {
      const response = await cacheInvalidatePOST(
        makePostRequest(
          '/cache/invalidate',
          JSON.stringify({ paths: ['invalid-path'] })
        )
      );
      expect(response.status).toBe(400);

      const { code } = await response.json();
      expect(code).toBe('INVALID_INPUT');
    });

    it('should handle malformed JSON', async () => {
      const response = await cacheInvalidatePOST(
        makePostRequest('/cache/invalidate', '{invalid json}')
      );
      expect(response.status).toBe(400);

      const { code } = await response.json();
      expect(code).toBe('INVALID_INPUT');
    });
  });

  describe('Response Format Consistency', () => {
    it('all success responses should follow standard format', async () => {
      const responses = await Promise.all([
        healthGET(makeGetRequest('/health')),
        poolsAllGET(makeGetRequest('/liquidity/pools/all')),
        statsGET(makeGetRequest('/liquidity/stats')),
      ]);

      for (const response of responses) {
        const data = await response.json();

        if (response.ok) {
          expect(data.timestamp).toBeDefined();
          if (data.success !== undefined) {
            expect(data.success).toBe(true);
          }
        }
      }
    });

    it('error responses should include code and timestamp', async () => {
      const response = await poolDetailsGET(
        makeGetRequest('/liquidity/pool/invalid'),
        { params: Promise.resolve({ poolId: 'invalid' }) }
      );

      const data = await response.json();

      expect(data.code).toBeDefined();
      expect(data.error).toBeDefined();
      expect(data.timestamp).toBeDefined();
    });
  });
});
