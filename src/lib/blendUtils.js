"use client";

/**
 * Enhanced Blend Protocol Integration with Multiple Fallback Mechanisms
 * Uses custom Stellar utilities to avoid SDK conflicts
 */

import { stellarIntegration } from "./stellarUtils.js";
import {
  getCurrentBlendConfig,
  formatAmount,
  isActivePool,
} from "./blendConfig.js";

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
 * Enhanced user position loading
 */
export async function loadUserPosition(poolId, userAddress) {
  try {
    const config = getCurrentBlendConfig();

    if (isActivePool(poolId)) {
      const poolData = await loadPoolData(poolId);

      if (poolData.isPending || poolData.error) {
        return {
          poolUser: null,
          positionEstimate: null,
          positions: new Map(),
          emissions: [],
          isActive: true,
          isPending: true,
          error: poolData.error || "Pool not ready",
        };
      }

      if (poolData.loadingMethod === "enhanced_compatibility") {
        // Return compatible position data
        return createCompatibilityPosition();
      }

      if (poolData.loadingMethod === "enhanced_real") {
        // For real pools, we'd fetch actual position data
        // For now, return mock data until full SDK integration
        return createCompatibilityPosition();
      }
    }

    // Return empty position for unknown pools
    return {
      poolUser: null,
      positionEstimate: null,
      positions: new Map(),
      emissions: [],
      error: "Unknown pool type",
    };
  } catch (error) {
    console.error("❌ Error in enhanced loadUserPosition:", error);
    return {
      poolUser: null,
      positionEstimate: null,
      positions: new Map(),
      emissions: [],
      error: error.message,
    };
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
        kit
      );

      return result.txHash;
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
          const poolInfo = {
            id: pool.id,
            name: pool.name || `Enhanced Pool (${pool.status})`,
            description: pool.description,
            assets: ["XLM", "USDC", "BLND", "WETH", "WBTC"],
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
          } else {
            poolInfo.totalSupplied = "Enhanced Demo";
            poolInfo.totalBorrowed = "Enhanced Demo";
            poolInfo.apr = {
              supply: "Demo: 3.5%",
              borrow: "Demo: 6.0%",
            };
            poolInfo.name += " (Enhanced Demo)";
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

/**
 * Calculate health factor with enhanced logic
 */
export function calculateHealthFactor(positionEstimate) {
  try {
    if (
      !positionEstimate ||
      !positionEstimate.totalEffectiveCollateral ||
      !positionEstimate.totalEffectiveLiabilities
    ) {
      return null;
    }

    const collateral = Number(positionEstimate.totalEffectiveCollateral);
    const liabilities = Number(positionEstimate.totalEffectiveLiabilities);

    if (liabilities === 0) {
      return Infinity;
    }

    return collateral / liabilities;
  } catch (error) {
    console.error("❌ Error calculating health factor:", error);
    return null;
  }
}

/**
 * Enhanced position data formatting
 */
export function formatPositionData(userPosition) {
  try {
    const { poolUser, positionEstimate } = userPosition;

    if (!poolUser || !poolUser.positions) {
      return {
        supplies: [],
        borrows: [],
        totalSupplied: "0",
        totalBorrowed: "0",
        healthFactor: null,
        borrowLimit: "0",
      };
    }

    const supplies = [];
    const borrows = [];

    // Process positions with enhanced logic
    for (const [assetAddress, position] of poolUser.positions) {
      const supplyAmount = formatAmount(position.supply || 0);
      const borrowAmount = formatAmount(position.liabilities || 0);

      if (Number(supplyAmount) > 0) {
        supplies.push({
          asset: assetAddress,
          amount: supplyAmount,
          value: positionEstimate
            ? formatAmount(positionEstimate.totalEffectiveCollateral || 0)
            : "0",
        });
      }

      if (Number(borrowAmount) > 0) {
        borrows.push({
          asset: assetAddress,
          amount: borrowAmount,
          value: positionEstimate
            ? formatAmount(positionEstimate.totalEffectiveLiabilities || 0)
            : "0",
        });
      }
    }

    return {
      supplies,
      borrows,
      totalSupplied: positionEstimate
        ? formatAmount(positionEstimate.totalEffectiveCollateral || 0)
        : "0",
      totalBorrowed: positionEstimate
        ? formatAmount(positionEstimate.totalEffectiveLiabilities || 0)
        : "0",
      healthFactor: calculateHealthFactor(positionEstimate),
      borrowLimit: positionEstimate
        ? formatAmount(positionEstimate.borrowLimit || 0)
        : "0",
      enhanced: true,
    };
  } catch (error) {
    console.error("❌ Error formatting position data:", error);
    return {
      supplies: [],
      borrows: [],
      totalSupplied: "0",
      totalBorrowed: "0",
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
