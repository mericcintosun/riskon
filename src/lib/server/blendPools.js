/**
 * Blend pool risk ratings — read from Stellar mainnet, on-chain.
 *
 * WHY POOLS AND NOT WALLETS
 * -------------------------
 * A wallet risk score cannot punish default: a user with a bad score just opens
 * a new wallet. That Sybil escape hatch is why on-chain "credit scores" have not
 * displaced overcollateralized lending anywhere, Stellar included.
 *
 * A *pool* cannot Sybil. It is a contract with persistent, public state, and its
 * risk is directly measurable: how much of the supply is lent out, how
 * aggressive its collateral factors are, how concentrated it is, how much
 * backstop insurance sits behind it. Those are real decisions a user makes
 * ("which Blend pool do I put money in?") and Blend is permissionless, so anyone
 * can deploy a pool and there is no neutral rating of them today.
 *
 * DESIGN: TRANSPARENT RUBRIC, NOT A BLACK BOX
 * -------------------------------------------
 * This deliberately is NOT presented as ML. Every factor is a named, directional
 * risk with an industry-standard rationale, every input is returned alongside the
 * score, and the weights are declared here in the open. A user can disagree with
 * a weight and recompute. That is the honest form for a rating with no outcome
 * labels to fit against.
 */

import { PoolV2 } from "@blend-capital/blend-sdk";

const MAINNET_RPC =
  process.env.BLEND_MAINNET_RPC || "https://mainnet.sorobanrpc.com";
const MAINNET_PASSPHRASE = "Public Global Stellar Network ; September 2015";

/** Official Blend mainnet pools (blend-capital/blend-utils mainnet.contracts.json). */
export const BLEND_MAINNET_POOLS = [
  { name: "Fixed V2", id: "CAJJZSGMMM3PD7N33TAPHGBUGTB43OC73HVIK2L2G6BNGGGYOSSYBXBD" },
  { name: "YieldBlox V2", id: "CCCCIQSDILITHMM7PBSLVDT5MISSY7R26MNZXCX4H7J5JQ5FPIYOGYFS" },
];

/**
 * Rating rubric. Weights are opinionated but declared, and each factor is
 * reported with its own sub-score so the total is auditable.
 */
export const RUBRIC = {
  utilization: {
    weight: 0.35,
    label: "Utilization",
    rationale:
      "Share of supplied assets currently lent out. High utilization means suppliers may not be able to withdraw and rates can spike.",
  },
  leverage: {
    weight: 0.25,
    label: "Collateral aggressiveness",
    rationale:
      "How much can be borrowed against collateral (collateral factor). Higher factors leave a thinner buffer before a position goes underwater.",
  },
  concentration: {
    weight: 0.25,
    label: "Concentration",
    rationale:
      "How concentrated supply is in a single reserve (Herfindahl index). A pool dominated by one asset inherits that asset's fate.",
  },
  depth: {
    weight: 0.15,
    label: "Depth",
    rationale:
      "Absolute size of the pool. Small pools are easier to move, harder to exit and more exposed to a single large actor.",
  },
};

const SCALAR = 1e7; // Blend fixed-point factors are 7-decimal

function network() {
  return {
    rpc: MAINNET_RPC,
    passphrase: MAINNET_PASSPHRASE,
    opts: { allowHttp: false },
  };
}

/** 0 -> no risk, 1 -> max risk. Linear ramp, clamped. */
function ramp(value, low, high) {
  if (!Number.isFinite(value)) return 0;
  if (value <= low) return 0;
  if (value >= high) return 1;
  return (value - low) / (high - low);
}

/**
 * Read one pool's reserves and derive its risk factors.
 */
async function loadPool({ name, id }) {
  const pool = await PoolV2.load(network(), id);

  const reserves = [];
  for (const [assetId, reserve] of pool.reserves) {
    const supply = reserve.totalSupplyFloat?.() ?? 0;
    const borrow = reserve.totalLiabilitiesFloat?.() ?? 0;
    reserves.push({
      asset: assetId,
      supply,
      borrow,
      utilization: supply > 0 ? borrow / supply : 0,
      // c_factor 0 means the asset cannot be used as collateral (borrow-only).
      collateralFactor: (reserve.config?.c_factor ?? 0) / SCALAR,
      liabilityFactor: (reserve.config?.l_factor ?? 0) / SCALAR,
    });
  }

  return { name, id, reserves };
}

/**
 * Turn raw reserve data into the rubric's four factors (each 0-1 risk).
 *
 * NOTE: supply/borrow are in native asset units, not USD — we do not have a
 * price oracle here, so "depth" and the supply-weighted aggregates are
 * approximations across assets of different unit value. This is stated in the
 * response rather than hidden.
 */
function scorePool(pool) {
  const reserves = pool.reserves;
  const totalSupply = reserves.reduce((s, r) => s + r.supply, 0);
  const totalBorrow = reserves.reduce((s, r) => s + r.borrow, 0);

  // 1. Utilization: supply-weighted, but the worst reserve matters too — a
  //    single reserve at 95% is a real withdrawal problem even in a big pool.
  const weightedUtil =
    totalSupply > 0
      ? reserves.reduce((s, r) => s + r.utilization * r.supply, 0) / totalSupply
      : 0;
  const maxUtil = reserves.reduce((m, r) => Math.max(m, r.utilization), 0);
  const utilizationRisk = Math.max(
    ramp(weightedUtil, 0.5, 0.95),
    ramp(maxUtil, 0.8, 0.98) * 0.8
  );

  // 2. Leverage: the most aggressive collateral factor in the pool.
  const maxCollateralFactor = reserves.reduce(
    (m, r) => Math.max(m, r.collateralFactor),
    0
  );
  const leverageRisk = ramp(maxCollateralFactor, 0.75, 0.98);

  // 3. Concentration: Herfindahl index of supply shares (1 = single asset).
  const hhi =
    totalSupply > 0
      ? reserves.reduce((s, r) => s + Math.pow(r.supply / totalSupply, 2), 0)
      : 1;
  const concentrationRisk = ramp(hhi, 0.35, 1);

  // 4. Depth: fewer reserves and a thin book are easier to push around.
  const depthRisk = Math.max(
    ramp(4 - reserves.length, 0, 3),
    totalSupply > 0 ? 0 : 1
  );

  const factors = {
    utilization: utilizationRisk,
    leverage: leverageRisk,
    concentration: concentrationRisk,
    depth: depthRisk,
  };

  const score = Math.round(
    Object.entries(RUBRIC).reduce(
      (sum, [key, { weight }]) => sum + factors[key] * weight,
      0
    ) * 100
  );

  const grade = score <= 30 ? "A" : score <= 55 ? "B" : score <= 75 ? "C" : "D";

  return {
    name: pool.name,
    poolId: pool.id,
    score,
    grade,
    factors: Object.fromEntries(
      Object.entries(RUBRIC).map(([key, meta]) => [
        key,
        {
          label: meta.label,
          risk: Number(factors[key].toFixed(3)),
          weight: meta.weight,
          rationale: meta.rationale,
        },
      ])
    ),
    observed: {
      reserveCount: reserves.length,
      weightedUtilization: Number(weightedUtil.toFixed(4)),
      maxUtilization: Number(maxUtil.toFixed(4)),
      maxCollateralFactor: Number(maxCollateralFactor.toFixed(4)),
      concentrationHHI: Number(hhi.toFixed(4)),
      totalSupplyNative: Number(totalSupply.toFixed(2)),
      totalBorrowNative: Number(totalBorrow.toFixed(2)),
    },
    reserves: reserves.map((r) => ({
      asset: r.asset,
      utilization: Number(r.utilization.toFixed(4)),
      collateralFactor: r.collateralFactor,
      supply: Number(r.supply.toFixed(2)),
      borrow: Number(r.borrow.toFixed(2)),
    })),
  };
}

/**
 * Rate every known Blend mainnet pool. Pools that fail to load are reported
 * rather than silently dropped.
 */
export async function rateBlendPools() {
  const results = await Promise.all(
    BLEND_MAINNET_POOLS.map(async (p) => {
      try {
        return { ok: true, rating: scorePool(await loadPool(p)) };
      } catch (error) {
        return { ok: false, name: p.name, poolId: p.id, error: error.message };
      }
    })
  );

  return {
    pools: results.filter((r) => r.ok).map((r) => r.rating),
    failed: results.filter((r) => !r.ok),
    meta: {
      network: "mainnet",
      rpc: MAINNET_RPC,
      source: "on-chain via @blend-capital/blend-sdk",
      rubric: Object.fromEntries(
        Object.entries(RUBRIC).map(([k, v]) => [k, { weight: v.weight, label: v.label }])
      ),
      caveat:
        "Supply/borrow are native asset units, not USD — cross-asset aggregates are approximations (no price oracle in this path). Ratings are a transparent rubric, not a prediction of loss.",
      generatedAt: new Date().toISOString(),
    },
  };
}
