"use client";

/**
 * Enhanced Blend Protocol Integration with Multiple Fallback Mechanisms
 * Uses custom Stellar utilities to avoid SDK conflicts.
 * Integrates with the Riskon Oracle bridge for credit-gated operations.
 */

import { stellarIntegration } from "./stellarUtils.js";
import {
  getCurrentBlendConfig,
  formatAmount,
  isActivePool,
  BLEND_NETWORK,
  BLEND_ASSETS,
} from "./blendConfig.js";
import {
  getBlendParamsForUser,
  validateBlendOperation as riskonValidate,
} from "./riskonBlendOracle.js";

// Initialize integration on module load
let integrationReady = false;
stellarIntegration
  .initialize()
  .then(() => {
    integrationReady = true;
  })
  .catch((error) => {
    console.warn(
      "Integration initialization failed, using fallback modes:",
      error
    );
  });

/**
 * Enhanced pool data loading with multiple strategies
 */
export async function loadPoolData(poolId) {
  try {
    const config = getCurrentBlendConfig();

    // Check pool type first
    if (isActivePool(poolId)) {
      try {
        // Use our enhanced integration for pool discovery
        const poolResults = await stellarIntegration.getPoolsWithStatus({
          [poolId]: poolId,
        });

        if (poolResults.length > 0) {
          const poolInfo = poolResults[0];

          return {
            pool: poolInfo.isReal
              ? createRealPoolData(poolInfo)
              : createCompatibilityPoolData(poolInfo),
            poolOracle: poolInfo.health?.network ? createMockOracle() : null,
            poolEstimate: poolInfo.canOperate ? createMockEstimate() : null,
            reserves: poolInfo.canOperate ? createMockReserves() : new Map(),
            config: poolInfo.canOperate ? createMockConfig() : null,
            isActive: true,
            isPending: !poolInfo.canOperate,
            status: poolInfo.status,
            capabilities: poolInfo.capabilities,
            health: poolInfo.health,
            loadingMethod: poolInfo.isReal
              ? "enhanced_real"
              : "enhanced_compatibility",
            lastChecked: poolInfo.lastChecked,
          };
        }
      } catch (error) {
        console.error("❌ Enhanced pool discovery failed:", error);
        return createErrorPoolData(poolId, error);
      }
    }

    // Unknown pool type
    console.warn("⚠️ Unknown pool type");
    return createErrorPoolData(poolId, new Error("Unknown pool type"));
  } catch (error) {
    console.error("❌ Critical error in enhanced loadPoolData:", error);
    return createErrorPoolData(poolId, error);
  }
}

/**
 * Load real user position from the Blend pool via the Blend SDK.
 * Falls back to an empty position if the pool contract is not available
 * (e.g. after a testnet reset) or if the user has no position yet.
 */
export async function loadUserPosition(poolId, userAddress) {
  // Always return at least an empty-position shell so the UI cards render.
  const emptyResult = {
    poolUser: { positions: new Map(), emissions: [] },
    positionEstimate: null,
    positions: new Map(),
    emissions: [],
    isActive: true,
  };

  if (!userAddress) return emptyResult;

  try {
    const { PoolV2, PoolV1, PoolUser, PoolOracle, PositionsEstimate } =
      await import("@blend-capital/blend-sdk");

    const PoolClass = PoolV2 ?? PoolV1;

    // 1. Load the pool (reserves, config, oracle address)
    let pool;
    try {
      pool = await PoolClass.load(BLEND_NETWORK, poolId);
    } catch (poolErr) {
      console.warn(
        "⚠️ Pool contract not found on testnet (may have been reset):",
        poolErr.message
      );
      return emptyResult;
    }

    // 2. Load the user's position from the pool contract
    let poolUser;
    try {
      poolUser = await PoolUser.load(BLEND_NETWORK, poolId, pool, userAddress);
    } catch (userErr) {
      // No position on-chain yet (new user) — return empty
      console.info("ℹ️ No on-chain position found for user:", userErr.message);
      return emptyResult;
    }

    // 3. Build a positions map keyed by asset address (what formatPositionData expects)
    const positionsMap = new Map();
    for (const [assetAddress, reserve] of pool.reserves.entries()) {
      const supplyAmt =
        poolUser.getCollateralFloat(reserve) +
        poolUser.getSupplyFloat(reserve);
      const liabAmt = poolUser.getLiabilitiesFloat(reserve);
      if (supplyAmt > 0 || liabAmt > 0) {
        positionsMap.set(assetAddress, {
          supply: supplyAmt,
          liabilities: liabAmt,
        });
      }
    }

    // 4. Optionally build USD-value estimates via the pool oracle
    let positionEstimate = null;
    try {
      const oracleId = pool.config?.oracle;
      if (oracleId) {
        const assets = Array.from(pool.reserves.keys());
        const poolOracle = await PoolOracle.load(BLEND_NETWORK, oracleId, assets);
        positionEstimate = PositionsEstimate.build(
          pool,
          poolOracle,
          poolUser.positions
        );
      }
    } catch (oracleErr) {
      console.warn("⚠️ Oracle unavailable, skipping value estimates:", oracleErr.message);
    }

    return {
      poolUser: { positions: positionsMap, emissions: [] },
      positionEstimate,
      positions: positionsMap,
      emissions: [],
      isActive: true,
    };
  } catch (error) {
    console.error("❌ Error in loadUserPosition:", error);
    return emptyResult;
  }
}

/**
 * Enhanced operation creation using multiple strategies
 */
export async function createBlendOperation(
  poolId,
  userAddress,
  operationType,
  assetAddress,
  amount
) {
  try {
    const config = getCurrentBlendConfig();

    if (isActivePool(poolId)) {
      // Use enhanced integration for operation creation
      const operation = await stellarIntegration.executeOperation(
        poolId,
        operationType,
        amount,
        assetAddress,
        null // wallet kit passed separately
      );

      return {
        operation: null, // Enhanced operations handle differently
        operationData: operation,
        type: operationType,
        amount,
        asset: assetAddress,
        enhanced: true,
        poolId,
      };
    }

    throw new Error("Only active pools support operations");
  } catch (error) {
    console.error("❌ Error creating enhanced operation:", error);
    throw new Error(
      `Failed to create ${operationType} operation: ${error.message}`
    );
  }
}

/**
 * Enhanced operation execution
 */
export async function executeEnhancedOperation(
  kit,
  userAddress,
  operationData
) {
  try {
    if (operationData.enhanced) {
      // Use enhanced integration
      const result = await stellarIntegration.executeOperation(
        operationData.poolId,
        operationData.type,
        operationData.amount,
        operationData.asset,
        kit,
        userAddress
      );

      // executeOperation returns a string hash for real transactions,
      // or an object { txHash: '...' } for simulated ones.
      return typeof result === "string" ? result : result.txHash || result;
    }

    // Fallback to simulation
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return `ENHANCED_SIM_${Date.now()}`;
  } catch (error) {
    console.error("❌ Error executing enhanced operation:", error);
    throw new Error(`Failed to execute enhanced operation: ${error.message}`);
  }
}

/**
 * Get available pools using enhanced discovery
 */
export async function getAvailablePools() {
  try {
    const config = getCurrentBlendConfig();

    // Enhanced discovery for active pools
    const activePools = [];

    if (Object.keys(config.ACTIVE_POOLS).length > 0) {
      try {
        const poolResults = await stellarIntegration.getPoolsWithStatus(
          config.ACTIVE_POOLS
        );

        for (const pool of poolResults) {
          // Skip pools that are unavailable / not found on testnet
          if (
            pool.status !== "FULLY_OPERATIONAL" &&
            pool.status !== "NETWORK_READY" &&
            pool.status !== "CONTRACT_EXISTS"
          ) {
            continue;
          }

          // Use POOL_METADATA assets if available, otherwise fall back to defaults
          const metadata = config.POOL_METADATA?.[pool.id];
          const poolAssets = metadata?.assets ?? ["XLM", "USDC", "BLND", "WETH", "WBTC"];

          const poolInfo = {
            id: pool.id,
            name: pool.name || `Enhanced Pool (${pool.status})`,
            description: pool.description,
            assets: poolAssets,
            isActive: true,
            isDemo: false,
            isPending: !pool.canOperate,
            status: pool.status,
            capabilities: pool.capabilities,
            health: pool.health,
            lastChecked: pool.lastChecked,
          };

          // Set pool info based on status
          if (pool.status === "FULLY_OPERATIONAL") {
            poolInfo.totalSupplied = "Live Data";
            poolInfo.totalBorrowed = "Live Data";
            poolInfo.apr = {
              supply: "Live APR",
              borrow: "Live APR",
            };
            poolInfo.name += " (Fully Operational)";
          } else if (pool.status === "NETWORK_READY") {
            poolInfo.totalSupplied = "Network Ready";
            poolInfo.totalBorrowed = "Network Ready";
            poolInfo.apr = {
              supply: "Est: 4.5%",
              borrow: "Est: 7.2%",
            };
            poolInfo.name += " (Network Ready)";
          } else if (pool.status === "CONTRACT_EXISTS") {
            poolInfo.totalSupplied = "Contract Found";
            poolInfo.totalBorrowed = "Contract Found";
            poolInfo.apr = {
              supply: "Demo: 4.0%",
              borrow: "Demo: 6.8%",
            };
            poolInfo.name += " (Contract Mode)";
          }

          activePools.push(poolInfo);
        }
      } catch (discoveryError) {
        console.warn(
          "⚠️ Enhanced pool discovery failed, using fallback:",
          discoveryError
        );

        // Add fallback pool entries
        for (const [poolKey, poolId] of Object.entries(config.ACTIVE_POOLS)) {
          activePools.push({
            id: poolId,
            name: `${poolKey} (Discovery Failed)`,
            description: "Enhanced discovery failed - using fallback mode",
            assets: ["XLM", "USDC", "BLND"],
            totalSupplied: "Discovery Failed",
            totalBorrowed: "Discovery Failed",
            apr: {
              supply: "N/A",
              borrow: "N/A",
            },
            isActive: true,
            isDemo: false,
            isPending: true,
            error: discoveryError.message,
            canRetry: true,
          });
        }
      }
    }

    const allPools = activePools;

    return allPools;
  } catch (error) {
    console.error("❌ Critical error in enhanced pool discovery:", error);

    // Return empty array if no pools available
    return [];
  }
}

// Helper functions for creating different types of pool data

function createRealPoolData(poolInfo) {
  return {
    id: poolInfo.id,
    loadUser: async (address) => ({
      positions: createMockPositions(),
      emissions: [],
    }),
    reserves: createMockReserves(),
    config: createMockConfig(),
  };
}

function createCompatibilityPoolData(poolInfo) {
  return {
    id: poolInfo.id,
    loadUser: async (address) => ({
      positions: createMockPositions(),
      emissions: [],
    }),
    reserves: new Map(),
    config: null,
  };
}

function createErrorPoolData(poolId, error) {
  return {
    pool: null,
    poolOracle: null,
    poolEstimate: null,
    reserves: new Map(),
    config: null,
    isActive: true,
    isPending: true,
    error: error.message,
    errorType: "ENHANCED_ERROR",
    canRetry: true,
  };
}

function createCompatibilityPosition() {
  return {
    poolUser: {
      positions: createMockPositions(),
      emissions: [],
    },
    positionEstimate: createMockEstimate(),
    positions: createMockPositions(),
    emissions: [],
    isActive: true,
  };
}

function createMockPositions() {
  const positions = new Map();
  // Add some mock position data
  return positions;
}

function createMockReserves() {
  const reserves = new Map();
  // Add mock reserve data
  return reserves;
}

function createMockConfig() {
  return {
    oracle: "mock_oracle",
    backstop: "mock_backstop",
  };
}

function createMockOracle() {
  return {
    getPrices: () => new Map(),
  };
}

function createMockEstimate() {
  return {
    totalEffectiveCollateral: 0,
    totalEffectiveLiabilities: 0,
    borrowLimit: 0,
  };
}

// Rough USD spot prices for testnet assets (used when oracle is unavailable)
export const ROUGH_USD_PRICES = {
  XLM:  0.11,
  USDC: 1.0,
  BLND: 0.05,
  wETH: 3200,
  wBTC: 65000,
};

// Reverse-lookup: contract address → ticker (e.g. "XLM", "USDC")
const ADDRESS_TO_TICKER = Object.fromEntries(
  Object.entries(BLEND_ASSETS || {}).map(([ticker, addr]) => [addr, ticker])
);

function roughUSD(assetAddress, amount) {
  const ticker = ADDRESS_TO_TICKER[assetAddress] ?? "USDC";
  return (ROUGH_USD_PRICES[ticker] ?? 1) * (Number(amount) || 0);
}

/** Convert USD amount to token units for a given asset address. */
export function usdToTokens(assetAddress, usdAmount) {
  const ticker = ADDRESS_TO_TICKER[assetAddress] ?? "USDC";
  const price = ROUGH_USD_PRICES[ticker] ?? 1;
  return price > 0 ? usdAmount / price : 0;
}

/** Get the rough USD price for an asset ticker (e.g. "XLM"). */
export function getAssetUSDPrice(ticker) {
  return ROUGH_USD_PRICES[ticker] ?? 1;
}

/**
 * Calculate health factor with enhanced logic.
 * Works even without the oracle (falls back to rough USD prices).
 */
export function calculateHealthFactor(positionEstimate) {
  try {
    if (!positionEstimate) return null;
    const collateral = Number(positionEstimate.totalEffectiveCollateral ?? 0);
    const liabilities = Number(positionEstimate.totalEffectiveLiabilities ?? 0);
    if (liabilities === 0) return collateral > 0 ? Infinity : null;
    return collateral / liabilities;
  } catch (error) {
    console.error("❌ Error calculating health factor:", error);
    return null;
  }
}

/** @internal Compute health factor directly from the raw positions map. */
function computeRoughHealthFactor(positionsMap, cFactorDefault = 0.75) {
  let collateralUSD = 0;
  let liabilitiesUSD = 0;
  for (const [addr, pos] of positionsMap.entries()) {
    collateralUSD += roughUSD(addr, pos.supply || 0) * cFactorDefault;
    liabilitiesUSD += roughUSD(addr, pos.liabilities || 0);
  }
  if (liabilitiesUSD === 0) return collateralUSD > 0 ? Infinity : null;
  return collateralUSD / liabilitiesUSD;
}

/** @internal Compute total supplied USD from positions map (rough prices). */
function computeRoughSuppliedUSD(positionsMap) {
  let total = 0;
  for (const [addr, pos] of positionsMap.entries()) {
    total += roughUSD(addr, pos.supply || 0);
  }
  return total;
}

/** @internal Compute total borrowed USD from positions map (rough prices). */
function computeRoughBorrowedUSD(positionsMap) {
  let total = 0;
  for (const [addr, pos] of positionsMap.entries()) {
    total += roughUSD(addr, pos.liabilities || 0);
  }
  return total;
}

/**
 * Enhanced position data formatting.
 * Handles both real SDK floats (from PoolUser.getCollateralFloat etc.)
 * and legacy stroop-based bigint mock data.
 *
 * @param {object} userPosition  – result of loadUserPosition()
 * @param {object|null} blendParams – result of loadRiskonBlendParams() (credit score params)
 */
export function formatPositionData(userPosition, blendParams = null) {
  try {
    const { poolUser, positionEstimate } = userPosition;

    if (!poolUser || !poolUser.positions) {
      return {
        supplies: [],
        borrows: [],
        totalSupplied: "0",
        totalBorrowed: "0",
        suppliedUSD: 0,
        borrowedUSD: 0,
        healthFactor: null,
        borrowLimit: "0",
      };
    }

    const supplies = [];
    const borrows = [];

    // position.supply / .liabilities are already floating-point from the SDK
    // (e.g. 10.0 XLM). Format to 7 decimal places for display.
    const fmt = (v) => Number(v).toFixed(7);

    for (const [assetAddress, position] of poolUser.positions) {
      const supplyAmt = Number(position.supply || 0);
      const liabAmt = Number(position.liabilities || 0);

      if (supplyAmt > 0) {
        supplies.push({
          asset: assetAddress,
          amount: fmt(supplyAmt),
          usd: roughUSD(assetAddress, supplyAmt),
        });
      }

      if (liabAmt > 0) {
        borrows.push({
          asset: assetAddress,
          amount: fmt(liabAmt),
          usd: roughUSD(assetAddress, liabAmt),
        });
      }
    }

    // ── USD totals ─────────────────────────────────────────────────────────
    const suppliedUSD = positionEstimate?.totalSupplied
      ?? positionEstimate?.totalEffectiveCollateral
      ?? computeRoughSuppliedUSD(poolUser.positions);

    const borrowedUSD = positionEstimate?.totalBorrowed
      ?? positionEstimate?.totalEffectiveLiabilities
      ?? computeRoughBorrowedUSD(poolUser.positions);

    const totalSupplied = suppliedUSD.toFixed(4);
    const totalBorrowed = borrowedUSD.toFixed(4);

    // ── Health factor ───────────────────────────────────────────────────────
    // Prefer oracle-computed values; fall back to rough calculation.
    let healthFactor = calculateHealthFactor(positionEstimate);
    if (healthFactor === null) {
      healthFactor = computeRoughHealthFactor(
        poolUser.positions,
        blendParams?.collateralFactor ?? 0.75
      );
    }

    // ── Credit-score-adjusted borrow limit ─────────────────────────────────
    // Position-based capacity: totalSupplied * maxLTV - alreadyBorrowed
    // Tier cap: blendParams.maxBorrowUSD
    // Effective = min(position-based, tier cap)
    let borrowLimitUSD;
    if (positionEstimate?.borrowCap !== undefined) {
      borrowLimitUSD = positionEstimate.borrowCap;
    } else {
      const maxLTV = blendParams?.maxLTV ?? 0.75;
      const positionBased = Math.max(0, suppliedUSD * maxLTV - borrowedUSD);
      const tierCap = blendParams?.maxBorrowUSD ?? Infinity;
      borrowLimitUSD = Math.min(positionBased, tierCap);
    }
    const borrowLimit = borrowLimitUSD.toFixed(4);

    return {
      supplies,
      borrows,
      totalSupplied,
      totalBorrowed,
      suppliedUSD,
      borrowedUSD,
      healthFactor,
      borrowLimit,      // USD string (for display)
      borrowLimitUSD,   // raw USD number (for validation)
      enhanced: true,
    };
  } catch (error) {
    console.error("❌ Error formatting position data:", error);
    return {
      supplies: [],
      borrows: [],
      totalSupplied: "0",
      totalBorrowed: "0",
      suppliedUSD: 0,
      borrowedUSD: 0,
      healthFactor: null,
      borrowLimit: "0",
      enhanced: false,
    };
  }
}

// Legacy function aliases for backward compatibility
export const createSupplyOperation = (
  poolId,
  userAddress,
  assetAddress,
  amount
) => createBlendOperation(poolId, userAddress, "supply", assetAddress, amount);

export const createBorrowOperation = (
  poolId,
  userAddress,
  assetAddress,
  amount
) => createBlendOperation(poolId, userAddress, "borrow", assetAddress, amount);

export const createWithdrawOperation = (
  poolId,
  userAddress,
  assetAddress,
  amount
) =>
  createBlendOperation(poolId, userAddress, "withdraw", assetAddress, amount);

export const createRepayOperation = (
  poolId,
  userAddress,
  assetAddress,
  amount
) => createBlendOperation(poolId, userAddress, "repay", assetAddress, amount);

export const executeBlendOperation = executeEnhancedOperation;

// ─────────────────────────────────────────────────────────────────────────────
// Riskon Oracle helpers (re-exported for convenience)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Load Riskon-based Blend parameters for a user.
 * Wraps getBlendParamsForUser from the oracle module.
 *
 * @param {string|null} userAddress
 * @param {number|null} localScore  – TF.js model score (fallback)
 */
export async function loadRiskonBlendParams(userAddress, localScore = null) {
  try {
    return await getBlendParamsForUser(userAddress, localScore);
  } catch (err) {
    console.error("❌ Failed to load Riskon Blend params:", err);
    return null;
  }
}

/**
 * Pre-flight Riskon oracle check for a Blend operation.
 * Returns the same shape as validateBlendOperation from the oracle module.
 *
 * @param {string} operationType
 * @param {string} asset
 * @param {string|number} amount
 * @param {Object|null} blendParams  – from loadRiskonBlendParams()
 */
export function checkRiskonOperationAccess(
  operationType,
  asset,
  amount,
  blendParams
) {
  return riskonValidate(operationType, asset, amount, blendParams);
}
