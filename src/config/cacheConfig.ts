/**
 * Centralized Cache Configuration
 * Adjust cache settings and TTL values here
 */

// Cache Version - Increment to invalidate all existing cache
export const CACHE_VERSION = '1.0.0';

// Default TTL values (in milliseconds)
export const CACHE_TTL = {
  // Horizon API data caching
  HORIZON_DATA: 5 * 60 * 1000,        // 5 minutes
  
  // Risk calculation caching  
  RISK_SCORE: 10 * 60 * 1000,         // 10 minutes
  
  // Smart contract data caching
  RISK_TIER: 15 * 60 * 1000,          // 15 minutes
  
  // Rate limiting data
  RATE_LIMIT: 24 * 60 * 60 * 1000 + (60 * 60 * 1000), // 25 hours (24h + 1h buffer)
  
  // Service worker cache
  SERVICE_WORKER: {
    STATIC_ASSETS: 24 * 60 * 60 * 1000,  // 24 hours for static assets
    API_CALLS: 5 * 60 * 1000,            // 5 minutes for Horizon API
  },
} as const;

// IndexedDB Configuration
export const INDEXED_DB_CONFIG = {
  DB_NAME: 'riskonCache',
  DB_VERSION: 1,
  STORE_NAME: 'cacheStore',
  MAX_LOCALSTORAGE_SIZE: 1024 * 1024, // 1MB threshold before switching to IndexedDB
} as const;

// Cache behavior configuration
export const CACHE_BEHAVIOR = {
  // Enable automatic cache cleanup on startup
  AUTO_CLEANUP: true,
  
  // Log cache hits/misses for debugging
  DEBUG_LOGGING: process.env.NODE_ENV === 'development',
  
  // Enable IndexedDB fallback for large datasets
  ENABLE_INDEXEDDB_FALLBACK: true,
  
  // Enable service worker caching
  ENABLE_SERVICE_WORKER: true, // Enabled by default for PWA support
  
  // Cache invalidation settings
  INVALIDATION: {
    // Automatically invalidate risk cache after score calculation
    AUTO_INVALIDATE_ON_SCORE_UPDATE: true,
    
    // Automatically invalidate user cache after tier update  
    AUTO_INVALIDATE_ON_TIER_UPDATE: true,
    
    // Clear cache on version mismatch
    CLEAR_ON_VERSION_MISMATCH: true,
  },
} as const;

// Service Worker Configuration
export const SERVICE_WORKER_CONFIG = {
  CACHE_NAME: 'riskon-cache-v1',
  
  // Patterns for caching Horizon API calls
  HORIZON_API_PATTERNS: [
    /^https:\/\/horizon(-testnet)?\.stellar\.org\/accounts\/[^\/]+$/,
    /^https:\/\/horizon(-testnet)?\.stellar\.org\/accounts\/[^\/]+\/payments/,
    /^https:\/\/horizon(-testnet)?\.stellar\.org\/accounts\/[^\/]+\/transactions/,
  ],
  
  // Static assets to precache
  STATIC_ASSETS: [
    '/',
    '/manifest.json',
    // Add more static assets as needed
  ],
} as const;

// Cache key prefixes for organization
export const CACHE_KEY_PREFIXES = {
  HORIZON_DATA: 'horizon_data',
  RISK_SCORE: 'risk_score',
  USER_RISK_TIER: 'user_risk_tier', 
  RATE_LIMIT: 'rate_limit',
} as const;

// Performance monitoring thresholds
export const PERFORMANCE_THRESHOLDS = {
  // Warn if cache operation takes longer than this
  CACHE_OPERATION_WARNING_MS: 100,
  
  // Maximum cache entries before cleanup
  MAX_CACHE_ENTRIES: 1000,
  
  // Cache hit ratio threshold for warnings
  MIN_CACHE_HIT_RATIO: 0.7, // 70%
} as const;

/**
 * Get cache TTL for specific data type
 */
export function getCacheTTL(dataType: keyof typeof CACHE_TTL): number {
  return CACHE_TTL[dataType];
}

/**
 * Check if debugging is enabled for cache operations
 */
export function isCacheDebuggingEnabled(): boolean {
  return CACHE_BEHAVIOR.DEBUG_LOGGING;
}

/**
 * Get cache key with proper prefix
 */
export function getCacheKey(prefix: keyof typeof CACHE_KEY_PREFIXES, identifier: string): string {
  return `${CACHE_KEY_PREFIXES[prefix]}_${identifier}`;
}

/**
 * Environment-specific configuration overrides
 */
export function getEnvironmentConfig() {
  const env = process.env.NODE_ENV || 'development';
  
  const config = {
    development: {
      // Shorter TTL for faster iteration in development
      HORIZON_DATA_TTL: 2 * 60 * 1000, // 2 minutes
      RISK_SCORE_TTL: 5 * 60 * 1000,   // 5 minutes
      DEBUG_LOGGING: true,
      AUTO_CLEANUP: true,
    },
    production: {
      // Standard TTL for production
      HORIZON_DATA_TTL: CACHE_TTL.HORIZON_DATA,
      RISK_SCORE_TTL: CACHE_TTL.RISK_SCORE,
      DEBUG_LOGGING: false,
      AUTO_CLEANUP: true,
    },
    test: {
      // Very short TTL for testing
      HORIZON_DATA_TTL: 10 * 1000, // 10 seconds
      RISK_SCORE_TTL: 10 * 1000,   // 10 seconds
      DEBUG_LOGGING: false,
      AUTO_CLEANUP: false,
    },
  };
  
  return config[env as keyof typeof config] || config.development;
}