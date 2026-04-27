/**
 * Offline Cache Hook
 * Manages offline data caching for risk analysis and user profiles
 */

import { useState, useEffect, useCallback } from 'react';
import { riskonDB, dbUtils } from '../lib/indexedDB';
import { pwaHelpers } from '../lib/pwaUtils';

export const useOfflineCache = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [cacheStatus, setCacheStatus] = useState({
    riskAnalyses: 0,
    userProfiles: 0,
    marketData: 0,
    offlineActions: 0
  });
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Update online status
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // Load initial cache status
    updateCacheStatus();

    // Listen for PWA events
    const handlePWAOnline = () => {
      setIsOnline(true);
      syncPendingData();
    };

    const handlePWAOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('pwa-online', handlePWAOnline);
    window.addEventListener('pwa-offline', handlePWAOffline);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      window.removeEventListener('pwa-online', handlePWAOnline);
      window.removeEventListener('pwa-offline', handlePWAOffline);
    };
  }, []);

  const updateCacheStatus = useCallback(async () => {
    try {
      const stats = await riskonDB.getStorageStats();
      setCacheStatus(stats);
    } catch (error) {
      console.error('Failed to update cache status:', error);
    }
  }, []);

  const syncPendingData = useCallback(async () => {
    if (isSyncing) return;
    
    setIsSyncing(true);
    try {
      await pwaHelpers.processOfflineActions();
      await updateCacheStatus();
    } catch (error) {
      console.error('Failed to sync pending data:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, updateCacheStatus]);

  /**
   * Cache risk analysis data
   */
  const cacheRiskAnalysis = useCallback(async (walletAddress, riskScore, analysisData) => {
    try {
      if (!isOnline) {
        // Queue for sync if offline
        await pwaHelpers.queueOfflineAction('risk_analysis', {
          walletAddress,
          riskScore,
          analysisData
        });
      } else {
        // Store immediately if online
        await dbUtils.storeRiskScore(walletAddress, riskScore, analysisData);
      }
      
      await updateCacheStatus();
    } catch (error) {
      console.error('Failed to cache risk analysis:', error);
      throw error;
    }
  }, [isOnline, updateCacheStatus]);

  /**
   * Get cached risk analyses
   */
  const getCachedRiskAnalyses = useCallback(async (walletAddress) => {
    try {
      const analyses = await riskonDB.getRiskAnalyses(walletAddress);
      return analyses.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('Failed to get cached risk analyses:', error);
      return [];
    }
  }, []);

  /**
   * Get latest cached risk score
   */
  const getLatestRiskScore = useCallback(async (walletAddress) => {
    try {
      const latestScore = await dbUtils.getLatestRiskScore(walletAddress);
      return latestScore;
    } catch (error) {
      console.error('Failed to get latest risk score:', error);
      return null;
    }
  }, []);

  /**
   * Cache user profile
   */
  const cacheUserProfile = useCallback(async (profile) => {
    try {
      if (!isOnline) {
        // Queue for sync if offline
        await pwaHelpers.queueOfflineAction('user_profile_update', profile);
      } else {
        // Store immediately if online
        await riskonDB.storeUserProfile(profile);
      }
      
      await updateCacheStatus();
    } catch (error) {
      console.error('Failed to cache user profile:', error);
      throw error;
    }
  }, [isOnline, updateCacheStatus]);

  /**
   * Get cached user profile
   */
  const getCachedUserProfile = useCallback(async (walletAddress) => {
    try {
      const profile = await riskonDB.getUserProfile(walletAddress);
      return profile;
    } catch (error) {
      console.error('Failed to get cached user profile:', error);
      return null;
    }
  }, []);

  /**
   * Cache market data
   */
  const cacheMarketData = useCallback(async (type, data) => {
    try {
      await dbUtils.cacheMarketData(type, data);
      await updateCacheStatus();
    } catch (error) {
      console.error('Failed to cache market data:', error);
      throw error;
    }
  }, [updateCacheStatus]);

  /**
   * Get cached market data
   */
  const getCachedMarketData = useCallback(async (type) => {
    try {
      const data = await dbUtils.getCachedMarketData(type);
      return data;
    } catch (error) {
      console.error('Failed to get cached market data:', error);
      return null;
    }
  }, []);

  /**
   * Clear old cache data
   */
  const clearOldCache = useCallback(async (daysOld = 30) => {
    try {
      await riskonDB.clearOldData(daysOld);
      await updateCacheStatus();
    } catch (error) {
      console.error('Failed to clear old cache:', error);
      throw error;
    }
  }, [updateCacheStatus]);

  /**
   * Get cache statistics
   */
  const getCacheStats = useCallback(() => {
    return cacheStatus;
  }, [cacheStatus]);

  /**
   * Check if data is fresh (less than specified minutes old)
   */
  const isDataFresh = useCallback((timestamp, maxAgeMinutes = 5) => {
    const now = Date.now();
    const ageMinutes = (now - timestamp) / (1000 * 60);
    return ageMinutes < maxAgeMinutes;
  }, []);

  /**
   * Get storage usage estimate
   */
  const getStorageUsage = useCallback(async () => {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        return {
          quota: estimate.quota,
          usage: estimate.usage,
          usagePercentage: estimate.usage ? ((estimate.usage / estimate.quota) * 100).toFixed(2) : '0'
        };
      }
      return null;
    } catch (error) {
      console.error('Failed to get storage usage:', error);
      return null;
    }
  }, []);

  return {
    // State
    isOnline,
    cacheStatus,
    isSyncing,
    
    // Risk Analysis
    cacheRiskAnalysis,
    getCachedRiskAnalyses,
    getLatestRiskScore,
    
    // User Profile
    cacheUserProfile,
    getCachedUserProfile,
    
    // Market Data
    cacheMarketData,
    getCachedMarketData,
    
    // Cache Management
    clearOldCache,
    getCacheStats,
    updateCacheStatus,
    syncPendingData,
    
    // Utilities
    isDataFresh,
    getStorageUsage
  };
};
