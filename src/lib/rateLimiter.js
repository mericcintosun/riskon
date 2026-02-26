"use client";

/**
 * Rate Limiter for Risk Score Updates
 * Prevents spam by limiting one risk score update per wallet per 24 hours
 */

const RATE_LIMIT_HOURS = 24;
const RATE_LIMIT_MS = RATE_LIMIT_HOURS * 60 * 60 * 1000;

"use client";

import { getCache, setCache, invalidateCache } from './cacheManager';
import { dispatchCacheEvent } from '../hooks/useCacheInvalidation';
import { CACHE_KEYS } from '../types/cache';

/**
 * Rate Limiter for Risk Score Updates
 * Prevents spam by limiting one risk score update per wallet per 24 hours
 * Now integrated with structured caching system
 */

const RATE_LIMIT_HOURS = 24;
const RATE_LIMIT_MS = RATE_LIMIT_HOURS * 60 * 60 * 1000;
const RATE_LIMIT_CACHE_TTL = RATE_LIMIT_MS + (60 * 60 * 1000); // +1 hour buffer

/**
 * Check if user can update their risk score
 * @param {string} walletAddress - User's Stellar address
 * @returns {Object} Rate limit status
 */
export async function checkRateLimit(walletAddress) {
  try {
    const cacheKey = `${CACHE_KEYS.RATE_LIMIT}_${walletAddress}`;
    
    // Check new cache system first
    const cachedRateLimit = await getCache(cacheKey);
    if (cachedRateLimit) {
      const currentTime = Date.now();
      const timeSinceLastUpdate = currentTime - cachedRateLimit.lastUpdate;

      if (timeSinceLastUpdate >= RATE_LIMIT_MS) {
        return {
          canUpdate: true,
          remainingTime: 0,
          lastUpdate: new Date(cachedRateLimit.lastUpdate),
          nextUpdateTime: null,
        };
      }

      const remainingTime = RATE_LIMIT_MS - timeSinceLastUpdate;
      const nextUpdateTime = new Date(cachedRateLimit.lastUpdate + RATE_LIMIT_MS);

      return {
        canUpdate: false,
        remainingTime,
        lastUpdate: new Date(cachedRateLimit.lastUpdate),
        nextUpdateTime,
      };
    }

    // Fallback to legacy localStorage check for migration
    const lastUpdateKey = `risk_score_last_update_${walletAddress}`;
    const lastUpdate = localStorage.getItem(lastUpdateKey);

    if (!lastUpdate) {
      return {
        canUpdate: true,
        remainingTime: 0,
        lastUpdate: null,
        nextUpdateTime: null,
      };
    }

    // Migrate legacy data to new cache system
    const lastUpdateTime = parseInt(lastUpdate);
    const currentTime = Date.now();
    const timeSinceLastUpdate = currentTime - lastUpdateTime;

    // Migrate to new cache system
    const rateLimitData = {
      lastUpdate: lastUpdateTime,
      walletAddress,
    };
    await setCache(cacheKey, rateLimitData, { ttl: RATE_LIMIT_CACHE_TTL });
    
    // Clean up legacy storage
    localStorage.removeItem(lastUpdateKey);

    if (timeSinceLastUpdate >= RATE_LIMIT_MS) {
      return {
        canUpdate: true,
        remainingTime: 0,
        lastUpdate: new Date(lastUpdateTime),
        nextUpdateTime: null,
      };
    }

    const remainingTime = RATE_LIMIT_MS - timeSinceLastUpdate;
    const nextUpdateTime = new Date(lastUpdateTime + RATE_LIMIT_MS);

    return {
      canUpdate: false,
      remainingTime,
      lastUpdate: new Date(lastUpdateTime),
      nextUpdateTime,
      remainingHours: Math.ceil(remainingTime / (60 * 60 * 1000)),
      remainingMinutes: Math.ceil(
        (remainingTime % (60 * 60 * 1000)) / (60 * 1000)
      ),
    };
  } catch (error) {
    console.warn("⚠️ Error checking rate limit:", error);
    // If there's an error, allow the update
    return {
      canUpdate: true,
      remainingTime: 0,
      error: error.message,
    };
  }
}

/**
 * Record a risk score update
 * @param {string} walletAddress - User's Stellar address
 */
export async function recordUpdate(walletAddress) {
  try {
    const currentTime = Date.now();
    const cacheKey = `${CACHE_KEYS.RATE_LIMIT}_${walletAddress}`;
    
    // Store in new cache system
    const rateLimitData = {
      lastUpdate: currentTime,
      walletAddress,
    };
    
    await setCache(cacheKey, rateLimitData, { ttl: RATE_LIMIT_CACHE_TTL });
    
    // Legacy support - clean up old localStorage entry if exists
    const legacyKey = `risk_score_last_update_${walletAddress}`;
    localStorage.removeItem(legacyKey);

    // Dispatch cache invalidation event
    dispatchCacheEvent.riskTierUpdated(walletAddress);

    return {
      success: true,
      timestamp: currentTime,
      nextUpdateTime: new Date(currentTime + RATE_LIMIT_MS),
    };
  } catch (error) {
    console.error("❌ Error recording update:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get formatted remaining time string
 * @param {number} remainingTime - Remaining time in milliseconds
 * @returns {string} Formatted time string
 */
export function formatRemainingTime(remainingTime) {
  if (remainingTime <= 0) return "Update now";

  const hours = Math.floor(remainingTime / (60 * 60 * 1000));
  const minutes = Math.floor((remainingTime % (60 * 60 * 1000)) / (60 * 1000));

  if (hours > 0) {
    return `${hours} hours ${minutes} minutes`;
  } else {
    return `${minutes} minutes`;
  }
}

/**
 * Clear rate limit for a wallet (admin/debug function)
 * @param {string} walletAddress - User's Stellar address
 */
export async function clearRateLimit(walletAddress) {
  try {
    const cacheKey = `${CACHE_KEYS.RATE_LIMIT}_${walletAddress}`;
    const legacyKey = `risk_score_last_update_${walletAddress}`;
    
    // Clear from both new cache system and legacy localStorage
    await invalidateCache(cacheKey);
    localStorage.removeItem(legacyKey);

    return { success: true };
  } catch (error) {
    console.error("❌ Error clearing rate limit:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all rate limited wallets (for debugging)
 */
export function getAllRateLimits() {
  try {
    const rateLimits = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("risk_score_last_update_")) {
        const walletAddress = key.replace("risk_score_last_update_", "");
        const lastUpdate = parseInt(localStorage.getItem(key));
        const status = checkRateLimit(walletAddress);

        rateLimits.push({
          walletAddress,
          lastUpdate: new Date(lastUpdate),
          status,
        });
      }
    }

    return rateLimits;
  } catch (error) {
    console.error("❌ Error getting rate limits:", error);
    return [];
  }
}

/**
 * Check if user has made any risk score updates before
 * @param {string} walletAddress - User's Stellar address
 * @returns {boolean} Whether user has updated before
 */
export async function hasUpdatedBefore(walletAddress) {
  try {
    const cacheKey = `${CACHE_KEYS.RATE_LIMIT}_${walletAddress}`;
    const cachedData = await getCache(cacheKey);
    
    if (cachedData) {
      return true;
    }
    
    // Check legacy localStorage for migration
    const legacyKey = `risk_score_last_update_${walletAddress}`;
    return localStorage.getItem(legacyKey) !== null;
  } catch (error) {
    console.warn("⚠️ Error checking update history:", error);
    return false;
  }
}

/**
 * Get user's update history summary
 * @param {string} walletAddress - User's Stellar address
 * @returns {Object} Update history summary
 */
export async function getUpdateHistory(walletAddress) {
  try {
    const cacheKey = `${CACHE_KEYS.RATE_LIMIT}_${walletAddress}`;
    let lastUpdateTime = null;
    
    // Check new cache system first
    const cachedData = await getCache(cacheKey);
    if (cachedData) {
      lastUpdateTime = cachedData.lastUpdate;
    } else {
      // Check legacy localStorage for migration
      const legacyKey = `risk_score_last_update_${walletAddress}`;
      const legacyUpdate = localStorage.getItem(legacyKey);
      if (legacyUpdate) {
        lastUpdateTime = parseInt(legacyUpdate);
      }
    }

    if (!lastUpdateTime) {
      return {
        hasUpdated: false,
        totalUpdates: 0,
        lastUpdate: null,
        daysSinceLastUpdate: 0,
      };
    }

    const daysSinceLastUpdate = Math.floor(
      (Date.now() - lastUpdateTime) / (24 * 60 * 60 * 1000)
    );

    return {
      hasUpdated: true,
      totalUpdates: 1, // For now, we only track the last update
      lastUpdate: new Date(lastUpdateTime),
      daysSinceLastUpdate,
      canUpdateAgain: daysSinceLastUpdate >= 1,
    };
  } catch (error) {
    console.error("❌ Error getting update history:", error);
    return {
      hasUpdated: false,
      error: error.message,
    };
  }
}
