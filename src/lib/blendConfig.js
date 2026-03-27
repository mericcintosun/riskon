"use client";

// Blend Protocol Configuration for Stellar Network

// Network configuration for Blend SDK
export const BLEND_NETWORK = {
  rpc: "https://soroban-testnet.stellar.org",
  passphrase: "Test SDF Network ; September 2015",
  // Allow HTTP for testnet (since we're using HTTPS, this is optional but good for flexibility)
  opts: { allowHttp: false }
};

// Asset configurations — from blend-utils testnet.contracts.json (verified live)
export const BLEND_ASSETS = {
  // Native Stellar Lumens (XLM)
  XLM: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
  
  // Stablecoins
  USDC: "CAQCFVLOBK5GIULPNZRGATJJMIZL5BSP7X5YJVMGCPTUEPFM4AVSRCJU",
  
  // Blend Native Token
  BLND: "CB22KRA3YZVCNCQI64JQ5WE7UY2VAV7WFLK6A2JN3HEX56T2EDAFO7QF",
  
  // Wrapped Assets
  wETH: "CAZAQB3D7KSLSNOSQKYD2V4JP5V2Y3B4RDJZRLBFCCIXDCTE3WHSY3UE",
  wBTC: "CAP5AMC2OHNVREO66DFIN6DHJMPOBAJ2KCDDIMFBR7WWJH5RZBFM3UEI"
};

// Blend V2 Protocol Contract Addresses — from blend-utils testnet.contracts.json (live on testnet)
export const BLEND_CONTRACTS = {
  // V1 Core Contracts
  MAIN_POOL_V1: "CCLBPEYS3XFK65MYYXSBMOGKFHWOCNDLHZJLVBLNR75JBCQPQAP4P2UDY",
  POOL_FACTORY_V1: "CBWH54OKUK6GQF5HKJT2PBCMHVFLRUNBQKVNCRGE4EVXTH5ZBSQEKN6Z",
  BACKSTOP_V1: "CAO3AGAMGLQ4KEMYQLQZJXV4AX2B3OKPV5M4MAEQWQIYGNWDVQMPZQTV",
  // V2 Core Contracts — verified live after testnet reset
  POOL_FACTORY_V2: "CDV6RX4CGPCOKGTBFS52V3LMWQGZN3LCQTXF5RVPOOCG4XVMHXQ4NTF6",
  BACKSTOP_V2: "CBDVWXT433PRVTUNM56C3JREF3HIZHRBA64NB2C3B2UNCKIS65ZYCLZA",
  MAIN_POOL_V2: "CCEBVDYM32YNYCVNRXQKDFFPISJJCV557CDZEIRBEE4NCV4KHPQ44HGF", // TestnetV2
  
  // Emissions and Oracle
  EMITTER: "CC3WJVJINN4E3LPMNTWKK7LQZLYDQMZHZA7EZGXATPHHBPKNZRIO3KZ6",
  ORACLE_MOCK: "CAZOKR2Y5E2OSWSIBRVZMJ47RUTQPIGVWSAQ2UISGAVC46XKPGDG5PKI",
  
  // BLND:USDC Liquidity Pool
  COMET_FACTORY: "CDX2TKELFKHP2MWISDCXWWZ73CL7F57GHYRJAWJWNOTLNJNNM7XLT4JY",
  COMET: "CA5UTUUPHYL5K22UBRUVC37EARZUGYOSGK3IKIXG2JLCC5ZZLI4BDWDM",
};

// Active Blend Pools — both V1 and V2 pools on testnet
export const ACTIVE_POOLS = {
  "Blend V2 Main Pool": BLEND_CONTRACTS.MAIN_POOL_V2,
  "Blend V1 Main Pool": BLEND_CONTRACTS.MAIN_POOL_V1,
};

// Pool metadata and descriptions
export const POOL_METADATA = {
  [BLEND_CONTRACTS.MAIN_POOL_V2]: {
    name: "Blend V2 Main Pool",
    description: "Official Blend V2 multi-asset lending pool supporting XLM, USDC, BLND, wETH, and wBTC",
    assets: ["XLM", "USDC", "BLND", "WETH", "WBTC"],
    version: "v2",
    isActive: true,
    riskLevel: "Moderate",
    totalAssets: 5
  },
  [BLEND_CONTRACTS.MAIN_POOL_V1]: {
    name: "Blend V1 Main Pool",
    description: "Original Blend V1 lending pool supporting XLM and USDC",
    assets: ["XLM", "USDC"],
    version: "v1",
    isActive: true,
    riskLevel: "Low",
    totalAssets: 2
  },
};

// Default transaction amounts (in the smallest unit - e.g., stroops for XLM)
export const DEFAULT_AMOUNTS = {
  XLM: 10000000, // 1 XLM = 10^7 stroops
  USDC: 1000000, // 1 USDC = 10^6 micro-USDC  
  BLND: 1000000000, // 1 BLND = 10^9 smallest units
  wETH: 1000000000000000, // 0.001 ETH in wei-equivalent
  wBTC: 100000 // 0.001 BTC in satoshi-equivalent
};

// Risk-based recommendations based on user's risk score
export const RISK_RECOMMENDATIONS = {
  LOW_RISK: {
    maxCollateralRatio: 0.8,
    recommendedAssets: ["USDC", "XLM"],
    strategy: "Conservative lending with stable assets"
  },
  MEDIUM_RISK: {
    maxCollateralRatio: 0.7,
    recommendedAssets: ["XLM", "USDC", "BLND"],
    strategy: "Balanced approach with diversified assets"
  },
  HIGH_RISK: {
    maxCollateralRatio: 0.5,
    recommendedAssets: ["XLM", "USDC"],
    strategy: "Very conservative with high liquidity assets only"
  }
};

// Riskon Oracle – tier-specific Blend parameters
// Mirrors RISKON_BLEND_PARAMS in riskonBlendOracle.js for use inside contracts/config
export const TIER_BLEND_CONFIG = {
  TIER_1: {
    label: "Low Risk",
    maxLTVBps: 8500,        // 85% LTV
    collateralFactorBps: 9000,
    rateAdjustmentBps: -50, // −0.50 % discount
    maxBorrowUSD: 50000,
    allowedOperations: ["supply", "borrow", "withdraw", "repay"],
  },
  TIER_2: {
    label: "Medium Risk",
    maxLTVBps: 7000,        // 70% LTV
    collateralFactorBps: 7500,
    rateAdjustmentBps: 0,   // Standard rate
    maxBorrowUSD: 20000,
    allowedOperations: ["supply", "borrow", "withdraw", "repay"],
  },
  TIER_3: {
    label: "High Risk",
    maxLTVBps: 5000,        // 50% LTV
    collateralFactorBps: 5500,
    rateAdjustmentBps: 250, // +2.50 % premium
    maxBorrowUSD: 5000,
    allowedOperations: ["supply", "withdraw", "repay"], // borrow gated
  },
};

// Get current configuration based on active pools
export function getCurrentBlendConfig() {
  return {
    NETWORK: BLEND_NETWORK,
    ASSETS: BLEND_ASSETS,
    CONTRACTS: BLEND_CONTRACTS,
    ACTIVE_POOLS,
    POOL_METADATA,
    DEFAULT_AMOUNTS,
    RISK_RECOMMENDATIONS,
    TIER_BLEND_CONFIG,
  };
}

// Format amount to human readable string
export function formatAmount(amount, decimals = 7) {
  const factor = Math.pow(10, decimals);
  return (amount / factor).toFixed(4);
}

// Parse human readable amount to smallest unit
export function parseAmount(amount, decimals = 7) {
  const factor = Math.pow(10, decimals);
  return Math.floor(parseFloat(amount) * factor);
}

// Determine risk level based on score
export function getRiskLevel(riskScore) {
  if (riskScore <= 30) return 'LOW_RISK';
  if (riskScore <= 70) return 'MEDIUM_RISK';
  return 'HIGH_RISK';
}

// Check if pool is active
export function isActivePool(poolId) {
  return Object.values(ACTIVE_POOLS).includes(poolId);
}

export default {
  BLEND_NETWORK,
  BLEND_ASSETS,
  BLEND_CONTRACTS,
  ACTIVE_POOLS,
  POOL_METADATA,
  DEFAULT_AMOUNTS,
  RISK_RECOMMENDATIONS,
  getCurrentBlendConfig,
  formatAmount,
  parseAmount,
  getRiskLevel,
  isActivePool
}; 