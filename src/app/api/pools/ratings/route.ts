/**
 * GET /api/pools/ratings
 *
 * Transparent risk ratings for Blend's permissionless mainnet lending pools,
 * read live from chain. Unlike a wallet score, a pool cannot Sybil away a bad
 * rating — it is a contract with persistent public state — and "which pool do I
 * put money in?" is a decision users actually make.
 *
 * Every rating ships with the raw inputs and the rubric weights so it can be
 * audited or recomputed. Cached briefly since pool state moves slowly.
 */

import { NextResponse } from "next/server";

import { rateBlendPools } from "@/lib/server/blendPools.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// Pool state changes per-ledger but not meaningfully within a minute.
export const revalidate = 0;

let cache: { at: number; payload: unknown } | null = null;
const CACHE_MS = 60_000;

export async function GET() {
  try {
    if (cache && Date.now() - cache.at < CACHE_MS) {
      return NextResponse.json(cache.payload, {
        status: 200,
        headers: { "x-cache": "HIT" },
      });
    }

    const data = await rateBlendPools();

    const payload = {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };

    cache = { at: Date.now(), payload };

    return NextResponse.json(payload, {
      status: 200,
      headers: { "x-cache": "MISS" },
    });
  } catch (error) {
    console.error("❌ Pool rating failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to rate Blend pools",
        code: "INTERNAL_ERROR",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
