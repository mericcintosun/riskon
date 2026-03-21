/**
 * GET /api/liquidity/stats
 * 
 * Fetch aggregated liquidity pool statistics
 * Includes tier distribution, TVL breakdown, and metadata
 * 
 * Returns: { success: true, data: ExtendedLiquidityStats, timestamp: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { LiquidityStatsSchema, ExtendedLiquidityStats, TvlBreakdown } from '@/types/api';
import { z } from 'zod';

/**
 * Mock data matching other routes
 */
function generateMockPools(): any[] {
  return [
    {
      poolId: 'pool-xlm-usdc',
      tvl: 2500000,
      tier: 'TIER_1',
      reserves: [
        { asset: 'native', amount: '5000000' },
        { asset: 'USDC', amount: '2500000' },
      ],
      totalAccounts: 1250,
      totalShares: '5623.4521890',
      lastModified: new Date(Date.now() - 300000).toISOString(),
      timestamp: new Date().toISOString(),
    },
    {
      poolId: 'pool-usdc-eurc',
      tvl: 800000,
      tier: 'TIER_2',
      reserves: [
        { asset: 'USDC', amount: '800000' },
        { asset: 'EURC', amount: '750000' },
      ],
      totalAccounts: 340,
      totalShares: '1247.8934567',
      lastModified: new Date(Date.now() - 600000).toISOString(),
      timestamp: new Date().toISOString(),
    },
    {
      poolId: 'pool-xlm-usdt',
      tvl: 450000,
      tier: 'TIER_2',
      reserves: [
        { asset: 'native', amount: '3750000' },
        { asset: 'USDT', amount: '450000' },
      ],
      totalAccounts: 568,
      totalShares: '4134.5678901',
      lastModified: new Date(Date.now() - 1200000).toISOString(),
      timestamp: new Date().toISOString(),
    },
    {
      poolId: 'pool-experimental-token',
      tvl: 50000,
      tier: 'TIER_3',
      reserves: [
        { asset: 'XLM', amount: '400000' },
        { asset: 'CUSTOM_TOKEN', amount: '50000' },
      ],
      totalAccounts: 89,
      totalShares: '234.5678901',
      lastModified: new Date(Date.now() - 1800000).toISOString(),
      timestamp: new Date().toISOString(),
    },
  ];
}

/**
 * Compute TVL breakdown by tier and other statistics
 */
function computeStatistics(pools: any[]): ExtendedLiquidityStats {
  const tvlBreakdown: TvlBreakdown = {
    TIER_1: { count: 0, totalTvl: 0 },
    TIER_2: { count: 0, totalTvl: 0 },
    TIER_3: { count: 0, totalTvl: 0 },
    grand_total: 0,
  };

  pools.forEach((pool) => {
    const tier = pool.tier as 'TIER_1' | 'TIER_2' | 'TIER_3';
    tvlBreakdown[tier].count += 1;
    tvlBreakdown[tier].totalTvl += pool.tvl || 0;
    tvlBreakdown.grand_total += pool.tvl || 0;
  });

  const avgPoolSize = pools.length > 0 
    ? tvlBreakdown.grand_total / pools.length 
    : 0;

  return {
    TIER_1: tvlBreakdown.TIER_1.count,
    TIER_2: tvlBreakdown.TIER_2.count,
    TIER_3: tvlBreakdown.TIER_3.count,
    total: pools.length,
    lastUpdate: new Date().toISOString(),
    tvl_breakdown: tvlBreakdown,
    average_pool_size: Math.round(avgPoolSize),
  };
}

export async function GET(request: NextRequest) {
  try {
    // Get all pools
    const pools = generateMockPools();

    // Compute statistics
    const stats = computeStatistics(pools);

    // Validate base stats match schema
    const baseStats = {
      TIER_1: stats.TIER_1,
      TIER_2: stats.TIER_2,
      TIER_3: stats.TIER_3,
      total: stats.total,
      lastUpdate: stats.lastUpdate,
    };

    LiquidityStatsSchema.parse(baseStats);

    return NextResponse.json(
      {
        success: true,
        data: stats,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('❌ Error computing liquidity statistics:', error);

    const message =
      error instanceof Error ? error.message : 'Failed to compute stats';

    return NextResponse.json(
      {
        error: message,
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
