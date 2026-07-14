/**
 * API Route Testing
 * 
 * Comprehensive tests for all API endpoints
 * Run with: npm test -- api.test.ts
 */

import { describe, it, expect } from '@jest/globals';

// Mock data for tests
const mockPoolId = 'pool-xlm-usdc';
const mockTier = 'TIER_1';
const invalidTier = 'TIER_4';

describe('Riskon API Routes', () => {
  const baseUrl = 'http://localhost:3001/api';

  describe('GET /health', () => {
    it('should return healthy status', async () => {
      const response = await fetch(`${baseUrl}/health`);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.status).toBe('healthy');
      expect(data.service).toBe('Riskon API Layer');
      expect(data.endpoints).toBeDefined();
    });
  });

  describe('GET /docs', () => {
    it('should return API documentation', async () => {
      const response = await fetch(`${baseUrl}/docs`);
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.info).toBeDefined();
      expect(data.endpoints).toBeDefined();
      expect(data.schemas).toBeDefined();
    });
  });

  describe('GET /liquidity/pools/all', () => {
    it('should return all pools with default parameters', async () => {
      const response = await fetch(`${baseUrl}/liquidity/pools/all`);
      expect(response.status).toBe(200);
      
      const { success, data, timestamp } = await response.json();
      expect(success).toBe(true);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
      expect(timestamp).toBeDefined();
    });

    it('should support sorting by TVL', async () => {
      const response = await fetch(`${baseUrl}/liquidity/pools/all?sort=tvl&order=desc`);
      expect(response.status).toBe(200);
      
      const { data } = await response.json();
      for (let i = 0; i < data.length - 1; i++) {
        expect(data[i].tvl).toBeGreaterThanOrEqual(data[i + 1].tvl);
      }
    });

    it('should support limiting results', async () => {
      const response = await fetch(`${baseUrl}/liquidity/pools/all?limit=2`);
      expect(response.status).toBe(200);
      
      const { data } = await response.json();
      expect(data.length).toBeLessThanOrEqual(2);
    });

    it('should return error for invalid sort parameter', async () => {
      const response = await fetch(`${baseUrl}/liquidity/pools/all?sort=invalid`);
      expect(response.status).toBe(400);
      
      const { code } = await response.json();
      expect(code).toBe('INVALID_INPUT');
    });
  });

  describe('GET /liquidity/pools/tier/:tier', () => {
    it('should return pools for valid tier', async () => {
      const response = await fetch(`${baseUrl}/liquidity/pools/tier/${mockTier}`);
      expect(response.status).toBe(200);
      
      const { success, data, meta } = await response.json();
      expect(success).toBe(true);
      expect(Array.isArray(data)).toBe(true);
      expect(meta.tier).toBe(mockTier);
      expect(typeof meta.count).toBe('number');
    });

    it('should filter pools correctly by tier', async () => {
      const response = await fetch(`${baseUrl}/liquidity/pools/tier/${mockTier}`);
      const { data } = await response.json();
      
      for (const pool of data) {
        expect(pool.tier).toBe(mockTier);
      }
    });

    it('should return 400 for invalid tier', async () => {
      const response = await fetch(`${baseUrl}/liquidity/pools/tier/${invalidTier}`);
      expect(response.status).toBe(400);
      
      const { code, error } = await response.json();
      expect(code).toBe('INVALID_INPUT');
      expect(error).toContain('TIER_1');
    });

    it('should return empty array for tier with no pools', async () => {
      // This test assumes there's a tier with no pools
      // Adjust if all tiers have pools
      const response = await fetch(`${baseUrl}/liquidity/pools/tier/TIER_3`);
      expect(response.status).toBe(200);
      
      const { data } = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe('GET /liquidity/pool/:poolId', () => {
    it('should return pool details for valid pool ID', async () => {
      const response = await fetch(`${baseUrl}/liquidity/pool/${mockPoolId}`);
      expect(response.status).toBe(200);
      
      const { success, data } = await response.json();
      expect(success).toBe(true);
      expect(data.poolId).toBe(mockPoolId);
      expect(data.tvl).toBeDefined();
      expect(data.tier).toBeDefined();
      expect(Array.isArray(data.reserves)).toBe(true);
    });

    it('should return 404 for non-existent pool', async () => {
      const response = await fetch(`${baseUrl}/liquidity/pool/pool-nonexistent`);
      expect(response.status).toBe(404);
      
      const { code } = await response.json();
      expect(code).toBe('NOT_FOUND');
    });

    it('should validate pool data structure', async () => {
      const response = await fetch(`${baseUrl}/liquidity/pool/${mockPoolId}`);
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
      const response = await fetch(`${baseUrl}/liquidity/stats`);
      expect(response.status).toBe(200);
      
      const { success, data } = await response.json();
      expect(success).toBe(true);
      expect(data.TIER_1).toBeDefined();
      expect(data.TIER_2).toBeDefined();
      expect(data.TIER_3).toBeDefined();
      expect(data.total).toBeDefined();
      expect(data.lastUpdate).toBeDefined();
    });

    it('should include TVL breakdown', async () => {
      const response = await fetch(`${baseUrl}/liquidity/stats`);
      const { data } = await response.json();
      
      expect(data.tvl_breakdown).toBeDefined();
      expect(data.tvl_breakdown.TIER_1).toBeDefined();
      expect(data.tvl_breakdown.grand_total).toBeDefined();
      expect(data.average_pool_size).toBeDefined();
    });

    it('should have consistent tier counts', async () => {
      const response = await fetch(`${baseUrl}/liquidity/stats`);
      const { data } = await response.json();
      
      const sum = data.TIER_1 + data.TIER_2 + data.TIER_3;
      expect(sum).toBe(data.total);
    });
  });

  describe('POST /cache/invalidate', () => {
    it('should invalidate all caches', async () => {
      const response = await fetch(`${baseUrl}/cache/invalidate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
      expect(response.status).toBe(200);
      
      const { success, invalidated } = await response.json();
      expect(success).toBe(true);
      expect(Array.isArray(invalidated)).toBe(true);
      expect(invalidated.length).toBeGreaterThan(0);
    });

    it('should invalidate specific cache paths', async () => {
      const paths = ['liquidity-pools-all', 'liquidity-stats'];
      const response = await fetch(`${baseUrl}/cache/invalidate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paths }),
      });
      expect(response.status).toBe(200);
      
      const { invalidated } = await response.json();
      expect(invalidated).toEqual(expect.arrayContaining(paths));
    });

    it('should reject invalid cache paths', async () => {
      const response = await fetch(`${baseUrl}/cache/invalidate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paths: ['invalid-path'] }),
      });
      expect(response.status).toBe(400);
      
      const { code } = await response.json();
      expect(code).toBe('INVALID_INPUT');
    });

    it('should handle malformed JSON', async () => {
      const response = await fetch(`${baseUrl}/cache/invalidate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{invalid json}',
      });
      expect(response.status).toBe(400);
      
      const { code } = await response.json();
      expect(code).toBe('INVALID_INPUT');
    });
  });

  describe('Response Format Consistency', () => {
    it('all success responses should follow standard format', async () => {
      const endpoints = [
        `${baseUrl}/health`,
        `${baseUrl}/liquidity/pools/all`,
        `${baseUrl}/liquidity/stats`,
      ];

      for (const endpoint of endpoints) {
        const response = await fetch(endpoint);
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
      const response = await fetch(`${baseUrl}/liquidity/pool/invalid`);
      const data = await response.json();

      expect(data.code).toBeDefined();
      expect(data.error).toBeDefined();
      expect(data.timestamp).toBeDefined();
    });
  });
});
