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
        pools: {
          ratings: 'GET /api/pools/ratings',
        },
        risk: {
          attest: 'POST /api/risk/attest',
        },
        passkey: {
          deploy: 'POST /api/passkey/deploy',
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
