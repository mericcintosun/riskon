/**
 * GET /api/docs
 *
 * API documentation endpoint.
 * Provides OpenAPI-like documentation for all endpoints.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const docs = {
    info: {
      title: 'Riskon API Layer',
      version: '2.0.0',
      description:
        'Pool ratings read from Blend mainnet, server-side wallet risk attestation, and passkey smart-wallet deployment.',
      baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
    },
    endpoints: [
      {
        path: '/pools/ratings',
        method: 'GET',
        description:
          "Risk ratings for Blend's mainnet lending pools, read live from chain. Every rating ships with its raw inputs and the rubric weights so it can be recomputed independently.",
        parameters: {},
        response: {
          status: 200,
          schema: {
            success: 'boolean',
            data: {
              pools: 'PoolRating[]',
              failed: 'Array<{ name, poolId, error }> (pools that failed to load)',
              meta: 'object (network, rpc, source, rubric, caveat, generatedAt)',
            },
            timestamp: 'string (ISO-8601)',
          },
        },
        notes: [
          'Cached in-process for 60s; the x-cache header reports HIT or MISS.',
          'Pools that fail to load are reported in `failed`, never silently dropped.',
        ],
        example: 'GET /api/pools/ratings',
      },
      {
        path: '/risk/attest',
        method: 'POST',
        description:
          'Compute a wallet activity score from chain data the server fetches itself, then write it on-chain signed by the oracle admin key. The score cannot be self-reported: the request body carries only the address.',
        parameters: {
          body: [
            {
              name: 'address',
              type: 'string',
              required: true,
              description: 'Stellar address (G...) or smart wallet contract (C...) to score',
            },
          ],
        },
        response: {
          status: 200,
          schema: {
            success: 'boolean',
            data: 'object (score, tier, transaction hash)',
            timestamp: 'string (ISO-8601)',
          },
          errors: [
            {
              status: 422,
              code: 'INVALID_INPUT',
              message:
                'Wallet has too little history to score. No score is invented for thin accounts.',
            },
            {
              status: 429,
              code: 'RATE_LIMITED',
              message:
                "Rate limited. Read from the contract's own timestamp, so it cannot be cleared client-side. Includes retry_after.",
            },
            {
              status: 503,
              code: 'SERVICE_UNAVAILABLE',
              message: 'NOT_CONFIGURED — the oracle signing key is absent in this environment.',
            },
          ],
        },
        notes: [
          'Requires a CSRF token (double-submit cookie); use csrfFetch from the client.',
        ],
        example: 'POST /api/risk/attest\nBody: { "address": "G..." }',
      },
      {
        path: '/passkey/deploy',
        method: 'POST',
        description:
          'Submit a passkey smart-wallet deploy transaction to Soroban RPC, wrapped in a fee-bump paid by the sponsor account.',
        parameters: {
          body: [
            {
              name: 'xdr',
              type: 'string',
              required: true,
              description: 'Signed deploy transaction envelope produced by passkey-kit',
            },
          ],
        },
        response: {
          status: 200,
          schema: {
            success: 'boolean',
            hash: 'string (transaction hash)',
            contractId: 'string (deployed smart wallet address)',
          },
        },
        notes: [
          'The fee-bump is required, not incidental: passkey-kit builds the inner transaction at the SDK default of 100 stroops because it expects a relayer to pay. Raw submission always fails with txInsufficientFee.',
        ],
        example: 'POST /api/passkey/deploy\nBody: { "xdr": "AAAA..." }',
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
      PoolRating: {
        name: 'string (pool name)',
        poolId: 'string (contract address)',
        score: 'number (0-100, higher = more risk)',
        grade: 'A | B | C | D',
        factors:
          'Record<string, { label, risk (0-1), weight, rationale }> — the rubric, itemised',
        observed: 'object (raw measurements the score was derived from)',
        reserves: 'Array<{ asset, utilization, collateralFactor, supply, borrow }>',
      },
      ApiError: {
        error: 'string (error message)',
        code: 'INVALID_INPUT | NOT_FOUND | INTERNAL_ERROR | SERVICE_UNAVAILABLE',
        details: 'object (additional context)',
        timestamp: 'string (ISO-8601)',
      },
    },
    tierThresholds: {
      note: 'Thresholds are enforced by the risk contract itself (can_access_tier); the model must agree with them.',
      TIER_1: { max: 30, description: 'score ≤ 30' },
      TIER_2: { min: 30, max: 70, description: 'score 30-70' },
      TIER_3: { min: 70, description: 'score ≥ 70' },
    },
    notes: [
      'All timestamps are in ISO-8601 format (UTC).',
      'A wallet score is an activity percentile relative to the real Stellar population — not a default prediction. Stellar exposes no default or liquidation labels, so no outcome-validated credit model is possible here.',
      'Pool ratings are a transparent rubric with declared weights, deliberately not presented as ML.',
      'Pool supply and borrow figures are in native asset units, not USD: there is no price oracle in this path.',
      'Mutating endpoints require a CSRF token (double-submit cookie).',
    ],
  };

  return NextResponse.json(docs, { status: 200 });
}
