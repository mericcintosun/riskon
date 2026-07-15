/**
 * POST /api/risk/attest
 *
 * Trusted risk-score attestation.
 *
 * The browser may *display* a locally computed score, but only this endpoint
 * writes one on-chain: it re-derives the score from data the server itself
 * fetches from Horizon and signs `admin_set_risk_tier` with the oracle admin
 * key. That removes the self-reported-score hole in the old client-side write
 * path, and the 24h cooldown is enforced from the contract's own timestamp
 * (so it cannot be cleared from the client).
 *
 * Request body: { address: string, chosenTier?: "TIER_1"|"TIER_2"|"TIER_3" }
 * Returns: { success, data: { score, tier, hash, ... }, timestamp }
 */

import { NextRequest, NextResponse } from "next/server";

import { attestRiskScore, OracleError } from "@/lib/server/riskOracle.js";

// Always run server-side, never statically optimised.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function errorResponse(
  message: string,
  code: string,
  status: number,
  details?: unknown
) {
  return NextResponse.json(
    { error: message, code, details, timestamp: new Date().toISOString() },
    { status }
  );
}

export async function POST(request: NextRequest) {
  let body: { address?: string; chosenTier?: string };

  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON in request body", "INVALID_INPUT", 400);
  }

  try {
    const result = await attestRiskScore(body?.address, {
      chosenTier: body?.chosenTier,
    });

    return NextResponse.json(
      {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof OracleError) {
      return errorResponse(
        error.message,
        error.code,
        error.status,
        error.details
      );
    }

    console.error("❌ Risk attestation failed:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Risk attestation failed",
      "INTERNAL_ERROR",
      500
    );
  }
}
