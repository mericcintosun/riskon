/**
 * GET /api/health
 * 
 * Health check endpoint for monitoring API status
 * Returns uptime and endpoint information
 */

import { NextRequest, NextResponse } from 'next/server';

const startTime = Date.now();

export async function GET(request: NextRequest) {
  const uptime = Math.floor((Date.now() - startTime) / 1000);

  return NextResponse.json(
    {
      status: 'healthy',
      service: 'Riskon API Layer',
      uptime_seconds: uptime,
      endpoints: {
        liquidity: {
          all_pools: 'GET /api/liquidity/pools/all',
          pools_by_tier: 'GET /api/liquidity/pools/tier/:tier',
          pool_details: 'GET /api/liquidity/pool/:poolId',
          statistics: 'GET /api/liquidity/stats',
        },
        cache: {
          invalidate: 'POST /api/cache/invalidate',
        },
        system: {
          health: 'GET /api/health',
          docs: 'GET /api/docs',
        },
      },
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}
