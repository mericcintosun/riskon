/**
 * GET /api/liquidity/pools/tier/:tier
 * 
 * Fetch liquidity pools filtered by risk tier
 * 
 * Path parameters:
 *   - tier: 'TIER_1' | 'TIER_2' | 'TIER_3'
 * 
 * Returns: { success: true, data: LiquidityPool[], timestamp: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { GetPoolsByTierParamsSchema, LiquidityPoolSchema, TierSchema } from '@/types/api';
import { z } from 'zod';

/**
 * Mock data matching all/route.ts
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tier: string }> }
) {
  try {
    // Await params in Next.js 16
    const resolvedParams = await params;
    
    // Validate tier parameter
    const validatedParams = GetPoolsByTierParamsSchema.parse({
      tier: resolvedParams.tier.toUpperCase(),
    });

    // Get all pools and filter by tier
    const allPools = generateMockPools();
    const tierPools = allPools
      .filter((pool) => pool.tier === validatedParams.tier)
      .sort((a, b) => (b.tvl || 0) - (a.tvl || 0)); // Sort by TVL descending

    // Validate response data
    const validatedPools = z.array(LiquidityPoolSchema).parse(tierPools);

    return NextResponse.json(
      {
        success: true,
        data: validatedPools,
        meta: {
          tier: validatedParams.tier,
          count: validatedPools.length,
        },
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(`❌ Error fetching pools for tier:`, error);

    if (error instanceof z.ZodError) {
      const tierError = error.errors.find((e) => e.path.includes('tier'));
      if (tierError) {
        return NextResponse.json(
          {
            error: `Invalid tier. Must be one of: TIER_1, TIER_2, TIER_3`,
            code: 'INVALID_INPUT',
            details: { received: error.errors[0]?.message },
            timestamp: new Date().toISOString(),
          },
          { status: 400 }
        );
      }
    }

    const message =
      error instanceof Error ? error.message : 'Failed to fetch tier pools';

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
