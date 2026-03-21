/**
 * API Type Definitions and Schemas
 * 
 * Provides type-safe request/response contracts for all API endpoints
 * using Zod for runtime validation and TypeScript for compile-time safety.
 * 
 * Addresses: Missing API route layer, type safety, request validation
 */

import { z } from 'zod';

// ─── Tier Validation ───────────────────────────────────────────────

export const TierSchema = z.enum(['TIER_1', 'TIER_2', 'TIER_3']);
export type Tier = z.infer<typeof TierSchema>;

// ─── Liquidity Pool Types ──────────────────────────────────────────

export const PoolReserveSchema = z.object({
  asset: z.string().describe('Asset code or "native" for XLM'),
  amount: z.string().describe('Reserve amount as string for precision'),
});

export const LiquidityPoolSchema = z.object({
  poolId: z.string().min(1).describe('Unique pool identifier'),
  tvl: z.number().min(0).describe('Total Value Locked in USD'),
  tier: TierSchema,
  reserves: z.array(PoolReserveSchema).describe('Pool reserve composition'),
  totalAccounts: z.number().min(0).describe('Number of accounts in pool'),
  totalShares: z.string().describe('Total shares issued'),
  lastModified: z.string().optional().describe('ISO timestamp of last update'),
  timestamp: z.string().describe('ISO timestamp when data was cached'),
});

export type LiquidityPool = z.infer<typeof LiquidityPoolSchema>;

// ─── Liquidity Statistics ─────────────────────────────────────────

export const LiquidityStatsSchema = z.object({
  TIER_1: z.number().min(0).describe('Count of TIER_1 pools'),
  TIER_2: z.number().min(0).describe('Count of TIER_2 pools'),
  TIER_3: z.number().min(0).describe('Count of TIER_3 pools'),
  total: z.number().min(0).describe('Total pool count'),
  lastUpdate: z.string().describe('ISO timestamp of last stats update'),
});

export type LiquidityStats = z.infer<typeof LiquidityStatsSchema>;

// ─── API Request Schemas ───────────────────────────────────────────

/**
 * GET /api/liquidity/pools/all
 * Query parameters for pool fetching
 */
export const GetPoolsQuerySchema = z.object({
  sort: z.enum(['tvl', 'accounts', 'newest']).optional().default('tvl').describe('Sort by field'),
  order: z.enum(['asc', 'desc']).optional().default('desc').describe('Sort order'),
  limit: z.coerce.number().min(1).max(200).optional().default(100).describe('Max results'),
});

export type GetPoolsQuery = z.infer<typeof GetPoolsQuerySchema>;

/**
 * GET /api/liquidity/pools/tier/:tier
 * Path parameter validation
 */
export const GetPoolsByTierParamsSchema = z.object({
  tier: TierSchema,
});

export type GetPoolsByTierParams = z.infer<typeof GetPoolsByTierParamsSchema>;

/**
 * GET /api/liquidity/pool/:poolId
 * Path parameter validation
 */
export const GetPoolDetailsParamsSchema = z.object({
  poolId: z.string().min(1).describe('Pool identifier'),
});

export type GetPoolDetailsParams = z.infer<typeof GetPoolDetailsParamsSchema>;

/**
 * POST /api/cache/invalidate
 * Request body for cache invalidation
 */
export const InvalidateCacheBodySchema = z.object({
  paths: z.array(z.string()).optional().describe('Specific cache paths to invalidate'),
  all: z.boolean().optional().default(false).describe('Invalidate all caches'),
  reason: z.string().optional().describe('Reason for invalidation for logging'),
});

export type InvalidateCacheBody = z.infer<typeof InvalidateCacheBodySchema>;

// ─── API Response Schemas ──────────────────────────────────────────

/**
 * Standard error response format
 */
export const ApiErrorSchema = z.object({
  error: z.string().describe('Error message'),
  code: z.enum([
    'INVALID_INPUT',
    'NOT_FOUND',
    'INTERNAL_ERROR',
    'SERVICE_UNAVAILABLE',
  ]).describe('Machine-readable error code'),
  details: z.record(z.any()).optional().describe('Additional error context'),
  timestamp: z.string().describe('ISO timestamp of error'),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;

/**
 * Success response wrapper
 */
export const ApiSuccessSchema = z.object({
  success: z.literal(true),
  data: z.any(),
  timestamp: z.string().describe('ISO timestamp of response'),
});

export type ApiSuccess<T = any> = {
  success: true;
  data: T;
  timestamp: string;
};

// ─── Pool Statistics Computation ───────────────────────────────────

/**
 * Compute TVL breakdown by tier
 */
export interface TvlBreakdown {
  TIER_1: { count: number; totalTvl: number };
  TIER_2: { count: number; totalTvl: number };
  TIER_3: { count: number; totalTvl: number };
  grand_total: number;
}

/**
 * Extended stats with TVL breakdown
 */
export interface ExtendedLiquidityStats extends LiquidityStats {
  tvl_breakdown: TvlBreakdown;
  average_pool_size: number;
}
