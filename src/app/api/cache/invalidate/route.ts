/**
 * POST /api/cache/invalidate
 * 
 * Trigger cache invalidation for liquidity data or all caches
 * Used to force refresh of pool data when updates occur
 * 
 * Request body:
 * {
 *   paths?: string[] - Specific cache paths to invalidate
 *   all?: boolean - Invalidate all caches (default: false)
 *   reason?: string - Reason for invalidation (for logging)
 * }
 * 
 * Returns: { success: true, invalidated: string[], timestamp: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { InvalidateCacheBodySchema } from '@/types/api';
import { z } from 'zod';

/**
 * Valid cache paths that can be invalidated
 */
const VALID_CACHE_PATHS = [
  'liquidity-pools-all',
  'liquidity-pools-tier-1',
  'liquidity-pools-tier-2',
  'liquidity-pools-tier-3',
  'liquidity-stats',
  'risk-tier-data',
  'user-profile',
];

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();

    // Validate request body
    const validatedBody = InvalidateCacheBodySchema.parse(body);

    // Determine which caches to invalidate
    let invalidatedPaths: string[] = [];

    if (validatedBody.all) {
      // Invalidate all known caches
      invalidatedPaths = [...VALID_CACHE_PATHS];
    } else if (validatedBody.paths && validatedBody.paths.length > 0) {
      // Validate specified paths
      invalidatedPaths = validatedBody.paths.filter((path) => {
        if (!VALID_CACHE_PATHS.includes(path)) {
          console.warn(`⚠️ Invalid cache path: ${path}`);
          return false;
        }
        return true;
      });

      if (invalidatedPaths.length === 0) {
        return NextResponse.json(
          {
            error: `No valid cache paths provided. Valid paths: ${VALID_CACHE_PATHS.join(', ')}`,
            code: 'INVALID_INPUT',
            details: { received_paths: validatedBody.paths },
            timestamp: new Date().toISOString(),
          },
          { status: 400 }
        );
      }
    } else {
      // If no paths or all specified, default to all
      invalidatedPaths = [...VALID_CACHE_PATHS];
    }

    // Log invalidation for debugging
    console.log(
      `📦 Cache invalidation triggered | Paths: ${invalidatedPaths.join(', ')} | Reason: ${validatedBody.reason || 'not specified'}`
    );

    // In production, you would:
    // 1. Broadcast a message to all connected clients via WebSocket or Server-Sent Events
    // 2. Delete cache entries from the backend cache store (Redis)
    // 3. Trigger a refresh of the monitoring data
    //
    // For now, we'll just log the action and return success

    return NextResponse.json(
      {
        success: true,
        invalidated: invalidatedPaths,
        meta: {
          reason: validatedBody.reason || 'manual invalidation',
          timestamp: new Date().toISOString(),
          note: 'Clients should be notified via WebSocket to refresh their caches',
        },
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('❌ Error invalidating cache:', error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          error: 'Invalid JSON in request body',
          code: 'INVALID_INPUT',
          details: { message: error.message },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          code: 'INVALID_INPUT',
          details: { validation_errors: error.errors },
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      );
    }

    const message =
      error instanceof Error ? error.message : 'Failed to invalidate cache';

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
