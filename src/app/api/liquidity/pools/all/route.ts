/**
 * GET /api/liquidity/pools/all
 * 
 * Fetch all liquidity pools with tier classification and TVL data
 * 
 * Query parameters:
 *   - sort: 'tvl' | 'accounts' | 'newest' (default: tvl)
 *   - order: 'asc' | 'desc' (default: desc)
 *   - limit: number 1-200 (default: 100)
 * 
 * Returns: { success: true, data: LiquidityPool[], timestamp: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { GetPoolsQuerySchema, LiquidityPoolSchema } from '@/types/api';

/**
 * Mock data generator for pools
 * In production, this would call the backend liquidityMonitor service
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
 * Sort pools by specified criteria
 */
function sortPools(
  pools: any[],
  sortBy: string = 'tvl',
  order: 'asc' | 'desc' = 'desc'
): any[] {
  const sorted = [...pools].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'tvl':
        comparison = (a.tvl || 0) - (b.tvl || 0);
        break;
      case 'accounts':
        comparison = (a.totalAccounts || 0) - (b.totalAccounts || 0);
        break;
      case 'newest':
        comparison =
          new Date(a.lastModified || 0).getTime() -
          new Date(b.lastModified || 0).getTime();
        break;
      default:
        comparison = (a.tvl || 0) - (b.tvl || 0);
    }

    return order === 'desc' ? -comparison : comparison;
  });

  return sorted;
}

export async function GET(request: NextRequest) {
  try {
    // Parse and validate query parameters
    const searchParams = request.nextUrl.searchParams;
    const queryParams = {
      sort: searchParams.get('sort') || 'tvl',
      order: searchParams.get('order') || 'desc',
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 100,
    };

    // Validate query parameters
    const validatedQuery = GetPoolsQuerySchema.parse(queryParams);

    // Get pools (in production, call backend service)
    let pools = generateMockPools();

    // Apply sorting
    pools = sortPools(pools, validatedQuery.sort, validatedQuery.order);

    // Apply limit
    pools = pools.slice(0, validatedQuery.limit);

    // Validate response data
    const validatedPools = z.array(LiquidityPoolSchema).parse(pools);

    return NextResponse.json(
      {
        success: true,
        data: validatedPools,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('❌ Error fetching liquidity pools:', error);

    const message =
      error instanceof Error ? error.message : 'Failed to fetch liquidity pools';

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

// Import at the end to avoid circular dependencies
import { z } from 'zod';
