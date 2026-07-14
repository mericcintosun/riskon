/**
 * GET /api/docs
 * 
 * API documentation endpoint
 * Provides OpenAPI-like documentation for all endpoints
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const docs = {
    info: {
      title: 'Riskon API Layer',
      version: '1.0.0',
      description:
        'Type-safe API routes for liquidity monitoring and cache management',
      baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
    },
    endpoints: [
      {
        path: '/liquidity/pools/all',
        method: 'GET',
        description: 'Fetch all liquidity pools with tier classification',
        parameters: {
          query: [
            {
              name: 'sort',
              in: 'query',
              type: 'enum',
              enum: ['tvl', 'accounts', 'newest'],
              default: 'tvl',
              description: 'Field to sort by',
            },
            {
              name: 'order',
              in: 'query',
              type: 'enum',
              enum: ['asc', 'desc'],
              default: 'desc',
              description: 'Sort order',
            },
            {
              name: 'limit',
              in: 'query',
              type: 'integer',
              min: 1,
              max: 200,
              default: 100,
              description: 'Maximum number of results',
            },
          ],
        },
        response: {
          status: 200,
          schema: {
            success: 'boolean',
            data: 'LiquidityPool[]',
            timestamp: 'string (ISO-8601)',
          },
        },
        example:
          'GET /api/liquidity/pools/all?sort=tvl&order=desc&limit=50',
      },
      {
        path: '/liquidity/pools/tier/:tier',
        method: 'GET',
        description: 'Fetch liquidity pools filtered by risk tier',
        parameters: {
          path: [
            {
              name: 'tier',
              type: 'enum',
              enum: ['TIER_1', 'TIER_2', 'TIER_3'],
              required: true,
              description:
                'Risk tier: TIER_1 (TVL ≥$1M), TIER_2 ($250k-$1M), TIER_3 (<$250k)',
            },
          ],
        },
        response: {
          status: 200,
          schema: {
            success: 'boolean',
            data: 'LiquidityPool[]',
            meta: { tier: 'string', count: 'number' },
            timestamp: 'string (ISO-8601)',
          },
        },
        example: 'GET /api/liquidity/pools/tier/TIER_1',
      },
      {
        path: '/liquidity/pool/:poolId',
        method: 'GET',
        description: 'Fetch detailed information for a specific pool',
        parameters: {
          path: [
            {
              name: 'poolId',
              type: 'string',
              required: true,
              description: 'Unique pool identifier',
            },
          ],
        },
        response: {
          status: 200,
          schema: {
            success: 'boolean',
            data: 'LiquidityPool',
            timestamp: 'string (ISO-8601)',
          },
          errors: [
            {
              status: 404,
              code: 'NOT_FOUND',
              message: 'Pool with specified ID not found',
            },
            {
              status: 400,
              code: 'INVALID_INPUT',
              message: 'Invalid pool ID format',
            },
          ],
        },
        example: 'GET /api/liquidity/pool/pool-xlm-usdc',
      },
      {
        path: '/liquidity/stats',
        method: 'GET',
        description:
          'Fetch aggregated liquidity statistics (pool counts, TVL breakdown)',
        parameters: {},
        response: {
          status: 200,
          schema: {
            success: 'boolean',
            data: 'ExtendedLiquidityStats',
            timestamp: 'string (ISO-8601)',
          },
        },
        example: 'GET /api/liquidity/stats',
      },
      {
        path: '/cache/invalidate',
        method: 'POST',
        description: 'Trigger cache invalidation for liquidity data',
        parameters: {
          body: [
            {
              name: 'paths',
              type: 'string[]',
              required: false,
              description: 'Specific cache paths to invalidate',
              example: [
                'liquidity-pools-all',
                'liquidity-stats',
                'liquidity-pools-tier-1',
              ],
            },
            {
              name: 'all',
              type: 'boolean',
              required: false,
              default: false,
              description: 'Invalidate all caches',
            },
            {
              name: 'reason',
              type: 'string',
              required: false,
              description: 'Reason for invalidation (for logging)',
            },
          ],
        },
        response: {
          status: 200,
          schema: {
            success: 'boolean',
            invalidated: 'string[]',
            meta: { reason: 'string', timestamp: 'string' },
            timestamp: 'string (ISO-8601)',
          },
        },
        example: `POST /api/cache/invalidate
Body: { "all": true, "reason": "scheduled refresh" }`,
      },
      {
        path: '/health',
        method: 'GET',
        description: 'API health check endpoint',
        response: {
          status: 200,
          schema: {
            status: 'string',
            service: 'string',
            uptime_seconds: 'number',
            endpoints: 'object',
            timestamp: 'string (ISO-8601)',
          },
        },
        example: 'GET /api/health',
      },
    ],
    schemas: {
      LiquidityPool: {
        poolId: 'string (unique identifier)',
        tvl: 'number (USD)',
        tier: 'TIER_1 | TIER_2 | TIER_3',
        reserves: 'Array<{ asset: string, amount: string }>',
        totalAccounts: 'number',
        totalShares: 'string (precise decimal)',
        lastModified: 'string (ISO-8601)',
        timestamp: 'string (ISO-8601)',
      },
      LiquidityStats: {
        TIER_1: 'number (pool count)',
        TIER_2: 'number (pool count)',
        TIER_3: 'number (pool count)',
        total: 'number (total pool count)',
        lastUpdate: 'string (ISO-8601)',
      },
      ExtendedLiquidityStats: {
        '...LiquidityStats': 'all fields from LiquidityStats',
        tvl_breakdown: 'object (TVL by tier)',
        average_pool_size: 'number (USD)',
      },
      ApiError: {
        error: 'string (error message)',
        code:
          'INVALID_INPUT | NOT_FOUND | INTERNAL_ERROR | SERVICE_UNAVAILABLE',
        details: 'object (additional context)',
        timestamp: 'string (ISO-8601)',
      },
    },
    validCachePaths: [
      'liquidity-pools-all',
      'liquidity-pools-tier-1',
      'liquidity-pools-tier-2',
      'liquidity-pools-tier-3',
      'liquidity-stats',
      'risk-tier-data',
      'user-profile',
    ],
    tierThresholds: {
      TIER_1: { min: 1000000, description: '≥ $1,000,000 TVL' },
      TIER_2: { min: 250000, max: 1000000, description: '$250k - $1M TVL' },
      TIER_3: { max: 250000, description: '< $250k TVL' },
    },
    notes: [
      'All timestamps are in ISO-8601 format (UTC)',
      'TVL values are in USD',
      'Pool IDs are stable and should be used as cache keys',
      'Use cache/invalidate endpoint to refresh data on demand',
      'Tier classification is automatic based on TVL thresholds',
      'All endpoints support CORS and standard HTTP methods',
    ],
  };

  return NextResponse.json(docs, { status: 200 });
}
