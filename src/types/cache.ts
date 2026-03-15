// Cache system types
export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  version: string;
  ttl?: number;
}

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  useIndexedDB?: boolean; // Fallback to IndexedDB for large datasets
}

export interface CacheConfig {
  version: string;
  defaultTTL: number;
  maxLocalStorageSize: number; // Size in characters before switching to IndexedDB
}

export interface HorizonDataCache {
  payments: any[];
  transactions: any[];
  timestamp: number;
  walletAddress: string;
}

export interface RiskScoreCache {
  score: number;
  features: number[];
  timestamp: number;
  walletAddress: string;
}

// Cache keys constants
export const CACHE_KEYS = {
  HORIZON_DATA: 'horizon_data',
  RISK_SCORE: 'risk_score',
  USER_RISK_TIER: 'user_risk_tier',
  RATE_LIMIT: 'rate_limit',
} as const;

export type CacheKey = keyof typeof CACHE_KEYS;