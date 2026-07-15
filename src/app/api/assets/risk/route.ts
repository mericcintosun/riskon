/**
 * GET /api/assets/risk?code=USDC
 *
 * Issuer risk for a Stellar asset code, read live from chain.
 *
 * Answers two questions no Stellar tool currently surfaces, both of which are
 * on-chain facts rather than predictions:
 *
 *   1. Is this the real asset? 387 mainnet issuers call themselves USDC.
 *   2. What can the issuer do to you? Freeze the balance, or seize it.
 *
 * Unlike a wallet score, the subject cannot Sybil away a bad result: the issuer
 * address is the asset's identity.
 */

import { NextRequest, NextResponse } from "next/server";

import { rateAssetIssuers } from "@/lib/server/assetIssuers.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const revalidate = 0;

// Issuer flags and holder counts move on the order of days, not seconds, but
// each lookup pages Horizon several times — worth not repeating per request.
const CACHE_MS = 300_000;
const cache = new Map<string, { at: number; payload: unknown }>();

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.json(
      {
        error: "Missing required query parameter: code (e.g. ?code=USDC)",
        code: "INVALID_INPUT",
        timestamp: new Date().toISOString(),
      },
      { status: 400 }
    );
  }

  const key = code.trim().toUpperCase();

  try {
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_MS) {
      return NextResponse.json(hit.payload, {
        status: 200,
        headers: { "x-cache": "HIT" },
      });
    }

    const data = await rateAssetIssuers(key);

    if (data.issuerCount === 0) {
      return NextResponse.json(
        {
          error: `No issuer on Stellar mainnet issues an asset with code "${key}".`,
          code: "NOT_FOUND",
          timestamp: new Date().toISOString(),
        },
        { status: 404 }
      );
    }

    const payload = {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };

    cache.set(key, { at: Date.now(), payload });

    return NextResponse.json(payload, {
      status: 200,
      headers: { "x-cache": "MISS" },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to rate asset issuers";

    // A rejected asset code is the caller's mistake, not a server fault. The
    // liquidity routes used to collapse this distinction into a 500.
    const isValidation = message.startsWith("Asset code must be");

    if (!isValidation) {
      console.error("❌ Asset issuer rating failed:", error);
    }

    return NextResponse.json(
      {
        error: message,
        code: isValidation ? "INVALID_INPUT" : "INTERNAL_ERROR",
        timestamp: new Date().toISOString(),
      },
      { status: isValidation ? 400 : 500 }
    );
  }
}
