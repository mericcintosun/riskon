"use client";

/**
 * Riskon → Blend Oracle Bridge
 *
 * This module is the haberci (oracle/messenger) integration between
 * Riskon's on-chain credit scores and Blend Protocol's lending pools.
 *
 * How it works:
 *  1. A user's Riskon score is fetched from the RiskTierContract on Soroban.
 *  2. The score is mapped to Blend-compatible parameters:
 *       - maxLTV           (Loan-to-Value ceiling)
 *       - collateralFactor (efficiency of deposited collateral)
 *       - rateAdjustmentBps (basis-point discount/premium on borrow rate)
 *       - allowedAssets    (which assets the tier may borrow)
 *       - maxBorrowUSD     (per-transaction borrow cap for this address)
 *  3. Before any borrow operation, validateBlendOperation() gates the tx.
 *  4. The on-chain get_blend_params() contract function exposes the same
 *     data so Blend's smart-contract pool can query it directly.
 */

const SOROBAN_RPC =
  process.env.NEXT_PUBLIC_SOROBAN_RPC ||
  "https://soroban-testnet.stellar.org";

const RISKON_CONTRACT_ID =
  process.env.NEXT_PUBLIC_RISK_TIER_CONTRACT_ID || "";

// ─────────────────────────────────────────────────────────────────────────────
// Tier-based Blend parameters
// These map 1-to-1 with the BlendParams struct in the Soroban contract.
// ─────────────────────────────────────────────────────────────────────────────
export const RISKON_BLEND_PARAMS = {
  TIER_1: {
    label: "Low Risk",
    color: "green",
    badge: "⭐ Prime Borrower",
    // LTV & collateral
    maxLTV: 0.85,           // 85% – premium credit history
    collateralFactor: 0.90, // 90% collateral efficiency
    maxLTVBps: 8500,
    collateralFactorBps: 9000,
    // Interest rate adjustment in basis points (negative = discount)
    rateAdjustmentBps: -50, // −0.50 % discount
    // Borrow cap (rough USD equivalent, real impl queries price oracle)
    maxBorrowUSD: 50000,
    // Allowed borrow assets
    allowedAssets: ["XLM", "USDC", "BLND", "wETH", "wBTC"],
    // Which pool tiers this credit tier can access
    poolAccess: ["TIER_1", "TIER_2", "TIER_3"],
    description:
      "Excellent on-chain history. Maximum LTV, discounted rates, all assets available.",
  },
  TIER_2: {
    label: "Medium Risk",
    color: "yellow",
    badge: "🔵 Standard Borrower",
    maxLTV: 0.70,
    collateralFactor: 0.75,
    maxLTVBps: 7000,
    collateralFactorBps: 7500,
    rateAdjustmentBps: 0,   // Standard market rate
    maxBorrowUSD: 20000,
    allowedAssets: ["XLM", "USDC", "BLND"],
    poolAccess: ["TIER_2", "TIER_3"],
    description:
      "Standard on-chain history. Moderate LTV, market rates, major assets available.",
  },
  TIER_3: {
    label: "High Risk",
    color: "red",
    badge: "🔴 Restricted Borrower",
    maxLTV: 0.50,
    collateralFactor: 0.55,
    maxLTVBps: 5000,
    collateralFactorBps: 5500,
    rateAdjustmentBps: 250, // +2.50 % premium
    maxBorrowUSD: 5000,
    allowedAssets: ["XLM", "USDC"],
    poolAccess: ["TIER_3"],
    description:
      "Limited on-chain history or high leverage. Conservative LTV, premium rates.",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Score → Tier helper
// ─────────────────────────────────────────────────────────────────────────────
export function scoreToTier(score) {
  if (score === null || score === undefined) return "TIER_3";
  if (score <= 30) return "TIER_1";
  if (score <= 70) return "TIER_2";
  return "TIER_3";
}

// ─────────────────────────────────────────────────────────────────────────────
// Rate display helper
// ─────────────────────────────────────────────────────────────────────────────
export function formatRateAdjustment(basisPoints) {
  if (basisPoints === 0) return "Standard Rate";
  const pct = (Math.abs(basisPoints) / 100).toFixed(2);
  return basisPoints < 0
    ? `−${pct}% discount`
    : `+${pct}% premium`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Fetch the user's Riskon tier directly from the Soroban RPC.
// Falls back gracefully when the contract isn't configured or RPC fails.
// ─────────────────────────────────────────────────────────────────────────────
export async function fetchOnChainRiskTier(userAddress) {
  if (!RISKON_CONTRACT_ID || !userAddress) return null;

  try {
    // Build a minimal Soroban simulation request for get_risk_tier(user).
    // Production: replace with proper XDR built via @stellar/stellar-sdk
    // ContractClient / TransactionBuilder.
    const body = {
      jsonrpc: "2.0",
      id: 1,
      method: "simulateTransaction",
      params: {
        transaction: buildGetRiskTierXdr(userAddress),
      },
    };

    const res = await fetch(SOROBAN_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error(`RPC HTTP ${res.status}`);
    const json = await res.json();

    if (json.result?.results?.[0]?.xdr) {
      return parseRiskTierResult(json.result.results[0].xdr);
    }
    return null;
  } catch (err) {
    console.warn(
      "⚠️ Riskon oracle RPC query failed – falling back to local score:",
      err.message
    );
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main API – called by BlendDashboard and blendUtils
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve Blend parameters for a user.
 *
 * Priority order:
 *  1. On-chain RiskTierContract (most authoritative)
 *  2. localScore from TensorFlow.js model (browser-computed)
 *  3. Worst-case defaults (TIER_3)
 *
 * @param {string|null} userAddress  – Stellar G... address
 * @param {number|null} localScore   – Score from local TF.js model
 * @returns {Promise<BlendOracleResult>}
 */
export async function getBlendParamsForUser(userAddress, localScore = null) {
  // 1. Try on-chain oracle
  const onChain = userAddress
    ? await fetchOnChainRiskTier(userAddress)
    : null;

  // 2. Resolve score + tier
  const score =
    onChain?.score ?? (localScore !== null ? localScore : 100);
  const tier = onChain?.tier ?? scoreToTier(score);
  const params = RISKON_BLEND_PARAMS[tier] || RISKON_BLEND_PARAMS.TIER_3;

  return {
    // Credit data
    score,
    tier,
    // Blend parameters
    ...params,
    // Convenience flags
    canAccessTier1: tier === "TIER_1",
    canAccessTier2: tier === "TIER_1" || tier === "TIER_2",
    canAccessTier3: true,
    // Provenance metadata
    dataSource: onChain
      ? "on-chain"
      : localScore !== null
      ? "local-model"
      : "default",
    lastUpdated: onChain?.timestamp
      ? new Date(Number(onChain.timestamp) * 1000)
      : null,
  };
}

/**
 * Pre-flight oracle validation for a Blend operation.
 *
 * Returns { allowed, errors, warnings } so the UI can block or warn
 * the user before they sign with their Passkey.
 *
 * @param {string} operationType  – "supply" | "borrow" | "withdraw" | "repay"
 * @param {string} asset          – e.g. "XLM", "USDC"
 * @param {string|number} amount  – Human-readable amount (not stroops)
 * @param {Object} blendParams    – Result of getBlendParamsForUser()
 * @returns {{ allowed: boolean, errors: string[], warnings: string[] }}
 */
export function validateBlendOperation(operationType, asset, amount, blendParams) {
  const errors = [];
  const warnings = [];

  if (!blendParams) {
    warnings.push("Riskon oracle data not loaded – operating with default limits.");
    return { allowed: true, errors, warnings };
  }

  if (operationType === "borrow") {
    // 1. Asset eligibility check
    if (asset && !blendParams.allowedAssets.includes(asset)) {
      errors.push(
        `Your credit tier (${blendParams.tier} – ${blendParams.label}) does not permit borrowing ${asset}. ` +
          `Eligible assets: ${blendParams.allowedAssets.join(", ")}.`
      );
    }

    // 2. Borrow cap check (rough USD estimate)
    const usdEstimate = estimateUSD(asset, parseFloat(amount) || 0);
    if (usdEstimate > 0 && usdEstimate > blendParams.maxBorrowUSD) {
      warnings.push(
        `Requested amount (~$${usdEstimate.toLocaleString(undefined, { maximumFractionDigits: 0 })}) ` +
          `exceeds your tier cap of $${blendParams.maxBorrowUSD.toLocaleString()}. ` +
          `Improve your Riskon score to raise this limit.`
      );
    }

    // 3. Score freshness warning
    if (blendParams.dataSource === "default") {
      warnings.push(
        "No Riskon score found for this address. Generate your credit score first to unlock better rates."
      );
    }
  }

  return { allowed: errors.length === 0, errors, warnings };
}

// ─────────────────────────────────────────────────────────────────────────────
// Private helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Rough USD price lookup for testnet assets.
 * Production: query Blend's price oracle contract.
 */
function estimateUSD(asset, amount) {
  const prices = {
    XLM: 0.11,
    USDC: 1.0,
    BLND: 0.05,
    wETH: 3200,
    wBTC: 65000,
  };
  return (prices[asset] || 1) * amount;
}

/**
 * Build the XDR for simulating get_risk_tier(user).
 *
 * NOTE: This is a stub. A full implementation uses:
 *   import { Contract, TransactionBuilder, Networks, Account }
 *     from "@stellar/stellar-sdk";
 *
 *   const contract = new Contract(RISKON_CONTRACT_ID);
 *   const tx = new TransactionBuilder(sourceAccount, { fee: "100", networkPassphrase: Networks.TESTNET })
 *     .addOperation(contract.call("get_risk_tier", nativeToScVal(Address.fromString(userAddress))))
 *     .setTimeout(30).build();
 *   return tx.toEnvelope().toXDR("base64");
 */
function buildGetRiskTierXdr(userAddress) {
  // Placeholder – replace with real TransactionBuilder XDR in production
  return `placeholder_simulate_get_risk_tier_${userAddress}`;
}

/**
 * Parse the Soroban simulation XDR result back to { score, tier, timestamp }.
 *
 * NOTE: In production, use scValToNative() from @stellar/stellar-sdk.
 */
function parseRiskTierResult(xdr) {
  // Placeholder – real impl: scValToNative(xdr.ScVal.fromXDR(xdr, "base64"))
  return null;
}
