"use client";

/**
 * A wallet's real Blend activity, read from Horizon.
 *
 * WHAT THIS REPLACES
 * ------------------
 * The previous version could never match anything, so it always reported "No
 * Blend Protocol History Found" no matter what a wallet had done:
 *
 *   * Its contract list was two placeholders, self-labelled "Example Blend pool"
 *     and "Another pool". Neither is a Blend pool.
 *   * It matched with `op.source_account === contract`. For a Soroban call,
 *     source_account is always the invoker (G...), never the contract.
 *   * Its fallback matched `JSON.stringify(op.parameters).includes(contract)`.
 *     Horizon returns parameters as base64 XDR, so a C... address never appears
 *     as readable text there — that check cannot fire either.
 *
 * It also fabricated what it did report: liquidity contribution was
 * `(totalLendVolume / 10000) * 100` with the comment "Assume pool TVL ~10k", and
 * that invented percentage gated a +5 score bonus.
 *
 * HOW DETECTION ACTUALLY WORKS
 * ----------------------------
 * Verified against a real Blend supply this project made
 * (tx b3469518f9be9794e25fd7111fe219175676c0cd0f207fc5da1f976a6bd290f5):
 *   * parameters[0] is the invoked contract as an XDR ScVal Address — decode it
 *     and compare to the pool id. Horizon's own `address` field is empty for
 *     invoke_host_function, so it cannot be used.
 *   * parameters[1] is the function symbol, e.g. `submit`.
 *   * asset_balance_changes carries the real transfers, with real amounts.
 *
 * NO SCORE IMPACT IS COMPUTED HERE. The old UI promised this history could
 * "influence your credit score", but the callback it relied on was never wired
 * (the component declared no props), so the feature was inert. Rather than make
 * an invented bonus real, the promise is gone: the risk model is a calibrated
 * population percentile, and bolting an ad-hoc bonus onto it would uncalibrate
 * the only thing that makes it meaningful.
 */

import { xdr, Address } from "@stellar/stellar-sdk";

import { BLEND_CONTRACTS } from "./blendConfig";

const HORIZON_URL = "https://horizon-testnet.stellar.org";
const PAGE_LIMIT = 200;
const MAX_PAGES = 5;

/** Pools whose activity counts as Blend activity. Real, from blendConfig. */
const BLEND_POOL_IDS = new Set([BLEND_CONTRACTS.MAIN_POOL_V2]);

async function getJson(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Horizon ${res.status}`);
  return res.json();
}

/** Decode the contract a Soroban operation invoked, or null. */
export function invokedContract(op) {
  const first = op?.parameters?.[0];
  if (!first || first.type !== "Address") return null;
  try {
    return Address.fromScVal(xdr.ScVal.fromXDR(first.value, "base64")).toString();
  } catch {
    return null;
  }
}

/** Decode the invoked function name, or null. */
export function invokedFunction(op) {
  const second = op?.parameters?.[1];
  if (!second) return null;
  try {
    return xdr.ScVal.fromXDR(second.value, "base64").sym().toString();
  } catch {
    return null;
  }
}

async function fetchOperations(address) {
  const out = [];
  let url = `${HORIZON_URL}/accounts/${address}/operations?order=desc&limit=${PAGE_LIMIT}&include_failed=false`;

  for (let page = 0; page < MAX_PAGES && url; page++) {
    const data = await getJson(url);
    const records = data?._embedded?.records ?? [];
    if (records.length === 0) break;
    out.push(...records);
    url = records.length === PAGE_LIMIT ? data?._links?.next?.href : null;
  }

  return out;
}

/**
 * Real Blend interactions for a wallet.
 * Returns { supported: false } for smart wallets — Horizon's /accounts endpoints
 * are ed25519-only and answer 400 for a contract address.
 */
export async function analyzeBlendHistory(address) {
  if (typeof address !== "string" || !address.startsWith("G")) {
    return {
      supported: false,
      reason:
        "Blend history is read from Horizon's account operations, which exist for account addresses (G...) only.",
    };
  }

  const operations = await fetchOperations(address);

  const interactions = [];
  for (const op of operations) {
    if (op.type !== "invoke_host_function") continue;

    const contract = invokedContract(op);
    if (!contract || !BLEND_POOL_IDS.has(contract)) continue;

    // Real amounts, from the transfers the ledger actually recorded.
    const transfers = (op.asset_balance_changes ?? []).map((c) => ({
      assetType: c.asset_type,
      assetCode: c.asset_code ?? "XLM",
      amount: parseFloat(c.amount) || 0,
      direction: c.from === address ? "out" : "in",
    }));

    interactions.push({
      hash: op.transaction_hash,
      at: op.created_at,
      pool: contract,
      action: invokedFunction(op) ?? "unknown",
      transfers,
    });
  }

  const allTransfers = interactions.flatMap((i) => i.transfers);
  const sent = allTransfers
    .filter((t) => t.direction === "out")
    .reduce((sum, t) => sum + t.amount, 0);
  const received = allTransfers
    .filter((t) => t.direction === "in")
    .reduce((sum, t) => sum + t.amount, 0);

  return {
    supported: true,
    interactions,
    summary: {
      count: interactions.length,
      // Native asset units, deliberately not converted to USD: there is no price
      // oracle on this path. The old UI rendered these through
      // toLocaleString("en-US", { style: "currency", currency: "USD" }).
      sentNative: Number(sent.toFixed(7)),
      receivedNative: Number(received.toFixed(7)),
      firstAt: interactions.at(-1)?.at ?? null,
      lastAt: interactions[0]?.at ?? null,
    },
    meta: {
      pools: [...BLEND_POOL_IDS],
      source:
        "Horizon /accounts/{id}/operations; contract decoded from parameters[0]",
      scanned: operations.length,
      truncated: operations.length >= PAGE_LIMIT * MAX_PAGES,
    },
  };
}
