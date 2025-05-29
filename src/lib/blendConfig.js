"use client";

// Blend Protocol Configuration for Stellar Network

// Network configuration for Blend SDK
export const BLEND_NETWORK = {
  rpc: "https://soroban-testnet.stellar.org",
  passphrase: "Test SDF Network ; September 2015",
  // Allow HTTP for testnet (since we're using HTTPS, this is optional but good for flexibility)
  opts: { allowHttp: false }
};

// Asset configurations with updated testnet addresses (from official Blend repository)
export const BLEND_ASSETS = {
  // Native Stellar Lumens (XLM)
  XLM: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
  
  // Stablecoins
  USDC: "CAQCFVLOBK5GIULPNZRGATTTJMIZL5BSP7X5YJVMGCPTUEPFM4AVSRCJU",
  
  // Blend Native Token
  BLND: "CB22KRA3YZVCNCQI64JQ5WE7UY2VAV7WFLK6A2JN3HEX56T2EDAFO7QF",
  
  // Wrapped Assets
  wETH: "CAZAQB3D7KSLSNOSQKYD2V4JP5V2Y3B4RDJZRLBFCCIXDCTE3WHSY3UE",
  wBTC: "CAP5AMC2OHNVREO66DFIN6DHJMPOBAJ2KCDDIMFBR7WWJH5RZBFM3UEI"
};

// Official Blend V2 Protocol Contract Addresses (Latest from blend-capital/blend-utils)
export const BLEND_CONTRACTS = {
  // V2 Core Contracts (Latest and Active) - From testnet.contracts.json
  POOL_FACTORY_V2: "CBWXKLXMFGQPL4HJ7ZU352SWEPOCC7XKHSACXW5P4766BX6C5EUUEOI6",
  BACKSTOP_V2: "CDAHGLVE6AZMXEGC22MV4GHU33REUJ5I5EJDIDHORQAVXVF64EIIK7QM",
  MAIN_POOL_V2: "CAMKTT6LIXNOKZJVFI64EBEQE25UYAQZBTHDIQ4LEDJLTCM6YVME6IIY", // TestnetV2
  
  // Emissions and Oracle
  EMITTER: "CBKGB24EGKHUS3755GU6IC5YFNDAGCRCGYAONM3HKES2223TIHKQ4QBZ",
  ORACLE_MOCK: "CBJSXNC2PL5LRMGWBOJVCWZFRNFPQXX4JWCUPSGEVZELZDNSEOM7Q6IQ",
  
  // BLND:USDC Liquidity Pool
  COMET_FACTORY: "CCJP2SLZ5U6CAYBKP3K64WAVALZGNEKHGMDQHX5TZYC6P26LNXQJIVMM",
  COMET: "CAUNY2U7AC7M2UQKN7JSCYQ7JV7A3BHEJWPV6PLURVF7YGNUA6GCGSAQ",
  
  // V1 Contracts (Legacy, but still available)
  POOL_FACTORY_V1: "CDEVVU3G2CFH6LJQG6LLSCSIU2BNRWDSJMDA44OA64XFV4YNWG7T22IU",
  BACKSTOP_V1: "CC73RQZ5ATLIGFA3F37SD3G2D2KOM3GSN5S547LKDTSHNURKV2YBMCFT",
  MAIN_POOL_V1: "CCHZKMVGSP3N4YEHD4EFHA6UKND5NDVP4COTAFENAFMPRNTEC2U2ST5F"
};

// Active Blend Pools - Live pools only
export const ACTIVE_POOLS = {
  "Blend V2 Main Pool": BLEND_CONTRACTS.MAIN_POOL_V2,
  // Add more active pools as they become available
  "Blend V1 Main Pool": BLEND_CONTRACTS.MAIN_POOL_V1, // Keep V1 as backup
};

// Demo pools removed - production ready

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
    description: "Blend V1 multi-asset lending pool - backup option",
    assets: ["XLM", "USDC", "BLND", "wETH", "wBTC"],
    version: "v1",
    isActive: true,
    riskLevel: "Moderate",
    totalAssets: 5
  }
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

// Get current configuration based on active pools
export function getCurrentBlendConfig() {
  return {
    NETWORK: BLEND_NETWORK,
    ASSETS: BLEND_ASSETS,
    CONTRACTS: BLEND_CONTRACTS,
    ACTIVE_POOLS,
    POOL_METADATA,
    DEFAULT_AMOUNTS,
    RISK_RECOMMENDATIONS
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