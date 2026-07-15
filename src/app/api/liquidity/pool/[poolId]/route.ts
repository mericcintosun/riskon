/**
 * GET /api/liquidity/pool/:poolId
 * 
 * Fetch detailed information for a specific liquidity pool
 * 
 * Path parameters:
 *   - poolId: string - The unique pool identifier
 * 
 * Returns: { success: true, data: LiquidityPool, timestamp: string }
 * Error (404): { error: "Pool not found", code: "NOT_FOUND", ... }
 */

import { NextRequest, NextResponse } from 'next/server';
import { GetPoolDetailsParamsSchema, LiquidityPoolSchema } from '@/types/api';
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ poolId: string }> }
) {
  try {
    // Await params in Next.js 16
    const resolvedParams = await params;
    
    // Validate pool ID parameter
    const validatedParams = GetPoolDetailsParamsSchema.parse({
      poolId: resolvedParams.poolId,
    });

    // Find the pool
    const allPools = generateMockPools();
    const pool = allPools.find((p) => p.poolId === validatedParams.poolId);

    // Return 404 if not found
    if (!pool) {
      return NextResponse.json(
        {
          error: `Pool with ID "${validatedParams.poolId}" not found`,
          code: 'NOT_FOUND',
          details: {
            poolId: validatedParams.poolId,
            available_pools: allPools.map((p) => p.poolId),
          },
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    // Validate pool data
    const validatedPool = LiquidityPoolSchema.parse(pool);

    return NextResponse.json(
      {
        success: true,
        data: validatedPool,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(`❌ Error fetching pool details:`, error);

    if (error instanceof z.ZodError) {
      const pathError = error.issues.find((e) => e.path.includes('poolId'));
      if (pathError) {
        return NextResponse.json(
          {
            error: 'Invalid pool ID format',
            code: 'INVALID_INPUT',
            details: { message: pathError.message },
            timestamp: new Date().toISOString(),
          },
          { status: 400 }
        );
      }
    }

    const message =
      error instanceof Error ? error.message : 'Failed to fetch pool details';

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
