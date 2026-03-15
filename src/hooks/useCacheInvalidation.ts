"use client";

import { useEffect, useCallback } from 'react';
import { invalidateCache } from '../lib/cacheManager';
import { CACHE_KEYS } from '../types/cache';

/**
 * Hook to handle cache invalidation for risk-related updates
 */
export const useCacheInvalidation = () => {
  
  /**
   * Invalidate risk-related cache when score is recalculated
   */
  const invalidateRiskCache = useCallback(async (walletAddress: string) => {
    try {
      await Promise.all([
        invalidateCache(`${CACHE_KEYS.RISK_SCORE}_${walletAddress}`),
        invalidateCache(`${CACHE_KEYS.USER_RISK_TIER}_${walletAddress}`),
        invalidateCache(`${CACHE_KEYS.HORIZON_DATA}_${walletAddress}`),
      ]);
      
      console.log(`Risk cache invalidated for wallet: ${walletAddress}`);
    } catch (error) {
      console.error('Failed to invalidate risk cache:', error);
    }
  }, []);

  /**
   * Invalidate user-specific cache after risk tier update
   */
  const invalidateUserCache = useCallback(async (walletAddress: string) => {
    try {
      await Promise.all([
        invalidateCache(`${CACHE_KEYS.USER_RISK_TIER}_${walletAddress}`),
        invalidateCache(`${CACHE_KEYS.RISK_SCORE}_${walletAddress}`),
      ]);
      
      console.log(`User cache invalidated for wallet: ${walletAddress}`);
    } catch (error) {
      console.error('Failed to invalidate user cache:', error);
    }
  }, []);

  /**
   * Clear all cache for a specific wallet
   */
  const clearWalletCache = useCallback(async (walletAddress: string) => {
    try {
      const cacheKeys = Object.values(CACHE_KEYS);
      await Promise.all(
        cacheKeys.map(key => invalidateCache(`${key}_${walletAddress}`))
      );
      
      console.log(`All cache cleared for wallet: ${walletAddress}`);
    } catch (error) {
      console.error('Failed to clear wallet cache:', error);
    }
  }, []);

  return {
    invalidateRiskCache,
    invalidateUserCache,
    clearWalletCache,
  };
};

/**
 * Auto-invalidation hook that listens for specific events
 */
export const useAutoInvalidation = (walletAddress?: string) => {
  const { invalidateRiskCache, invalidateUserCache } = useCacheInvalidation();

  useEffect(() => {
    if (!walletAddress) return;

    // Listen for custom events that trigger cache invalidation
    const handleRiskScoreUpdate = (event: CustomEvent) => {
      if (event.detail?.walletAddress === walletAddress) {
        invalidateRiskCache(walletAddress);
      }
    };

    const handleRiskTierUpdate = (event: CustomEvent) => {
      if (event.detail?.walletAddress === walletAddress) {
        invalidateUserCache(walletAddress);
      }
    };

    window.addEventListener('riskScoreUpdated', handleRiskScoreUpdate as EventListener);
    window.addEventListener('riskTierUpdated', handleRiskTierUpdate as EventListener);

    return () => {
      window.removeEventListener('riskScoreUpdated', handleRiskScoreUpdate as EventListener);
      window.removeEventListener('riskTierUpdated', handleRiskTierUpdate as EventListener);
    };
  }, [walletAddress, invalidateRiskCache, invalidateUserCache]);
};

/**
 * Dispatch cache invalidation events
 */
export const dispatchCacheEvent = {
  riskScoreUpdated: (walletAddress: string, score?: number) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('riskScoreUpdated', {
          detail: { walletAddress, score, timestamp: Date.now() }
        })
      );
    }
  },

  riskTierUpdated: (walletAddress: string, tier?: string) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('riskTierUpdated', {
          detail: { walletAddress, tier, timestamp: Date.now() }
        })
      );
    }
  },
};