"use client";

import React, { useState, useEffect } from 'react';
import { cacheManager } from '../lib/cacheManager';
import { useServiceWorker } from '../lib/serviceWorkerManager';
import { useCacheInvalidation } from '../hooks/useCacheInvalidation';

interface CacheStatsDisplay {
  localStorageEntries: number;
  version: string;
  serviceWorkerStatus?: {
    isSupported: boolean;
    isRegistered: boolean;
    isActive: boolean;
    totalEntries?: number;
    apiCacheEntries?: number;
    staticCacheEntries?: number;
  };
}

/**
 * Cache Management Dashboard Component
 * Provides visibility and control over the application's caching system
 */
export const CacheManagementDashboard: React.FC<{ walletAddress?: string }> = ({ 
  walletAddress 
}) => {
  const [stats, setStats] = useState<CacheStatsDisplay>({
    localStorageEntries: 0,
    version: '',
  });
  const [loading, setLoading] = useState(false);
  
  const { 
    status: swStatus, 
    loading: swLoading, 
    enable: enableSW, 
    disable: disableSW, 
    clearAPICache, 
    clearAllCache: clearAllSWCache 
  } = useServiceWorker();

  const { 
    invalidateRiskCache, 
    invalidateUserCache, 
    clearWalletCache 
  } = useCacheInvalidation();

  const updateStats = async () => {
    const cacheStats = cacheManager.getCacheStats();
    setStats({
      ...cacheStats,
      serviceWorkerStatus: swStatus,
    });
  };

  useEffect(() => {
    updateStats();
  }, [swStatus]);

  const handleClearAllCache = async () => {
    setLoading(true);
    try {
      // Clear application cache
      await cacheManager.clearAllCache();
      
      // Clear service worker cache if available
      if (swStatus.isActive) {
        await clearAllSWCache();
      }
      
      await updateStats();
    } finally {
      setLoading(false);
    }
  };

  const handleInvalidateUserCache = async () => {
    if (!walletAddress) return;
    
    setLoading(true);
    try {
      await clearWalletCache(walletAddress);
      await updateStats();
    } finally {
      setLoading(false);
    }
  };

  const handleInvalidateRiskCache = async () => {
    if (!walletAddress) return;
    
    setLoading(true);
    try {
      await invalidateRiskCache(walletAddress);
      await updateStats();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
      <h3 className="text-xl font-bold mb-4 text-gray-800">
        🚀 Cache Management Dashboard
      </h3>
      
      {/* Cache Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-semibold text-blue-800 mb-2">Application Cache</h4>
          <p className="text-sm text-gray-600">Version: <span className="font-mono">{stats.version}</span></p>
          <p className="text-sm text-gray-600">Entries: {stats.localStorageEntries}</p>
        </div>
        
        <div className="bg-green-50 p-4 rounded-lg">
          <h4 className="font-semibold text-green-800 mb-2">Service Worker Cache</h4>
          <p className="text-sm text-gray-600">
            Status: {swStatus.isActive ? '✅ Active' : swStatus.isRegistered ? '⏳ Registered' : '❌ Inactive'}
          </p>
          {swStatus.totalEntries !== undefined && (
            <>
              <p className="text-sm text-gray-600">Total: {swStatus.totalEntries}</p>
              <p className="text-sm text-gray-600">API: {swStatus.apiCacheEntries}</p>
              <p className="text-sm text-gray-600">Static: {swStatus.staticCacheEntries}</p>
            </>
          )}
        </div>
      </div>

      {/* Service Worker Controls */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <h4 className="font-semibold text-gray-800 mb-2">Service Worker Controls</h4>
        <div className="flex gap-2 flex-wrap">
          {!swStatus.isRegistered ? (
            <button
              onClick={enableSW}
              disabled={swLoading}
              className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {swLoading ? 'Enabling...' : 'Enable Service Worker'}
            </button>
          ) : (
            <button
              onClick={disableSW}
              disabled={swLoading}
              className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 disabled:opacity-50"
            >
              {swLoading ? 'Disabling...' : 'Disable Service Worker'}
            </button>
          )}
          
          {swStatus.isActive && (
            <button
              onClick={clearAPICache}
              disabled={swLoading}
              className="px-3 py-1 bg-yellow-500 text-white text-sm rounded hover:bg-yellow-600 disabled:opacity-50"
            >
              Clear API Cache
            </button>
          )}
        </div>
        
        <p className="text-xs text-gray-500 mt-2">
          Service Worker caches Horizon API calls and static assets for improved performance
        </p>
      </div>

      {/* Cache Management Controls */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <h4 className="font-semibold text-gray-800 mb-2">Cache Controls</h4>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleClearAllCache}
            disabled={loading}
            className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 disabled:opacity-50"
          >
            {loading ? 'Clearing...' : 'Clear All Cache'}
          </button>
          
          {walletAddress && (
            <>
              <button
                onClick={handleInvalidateUserCache}
                disabled={loading}
                className="px-3 py-1 bg-orange-500 text-white text-sm rounded hover:bg-orange-600 disabled:opacity-50"
              >
                Clear User Cache
              </button>
              
              <button
                onClick={handleInvalidateRiskCache}
                disabled={loading}
                className="px-3 py-1 bg-yellow-500 text-white text-sm rounded hover:bg-yellow-600 disabled:opacity-50"
              >
                Clear Risk Cache
              </button>
            </>
          )}
        </div>
        
        <p className="text-xs text-gray-500 mt-2">
          Cache is automatically invalidated after risk score updates and tier changes
        </p>
      </div>

      {/* Cache Features Info */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-semibold text-blue-800 mb-2">🎯 Cache Features</h4>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>• <strong>Version Control:</strong> Auto-clears cache on version mismatches</li>
          <li>• <strong>TTL Expiration:</strong> 5min for Horizon data, 10min for risk scores</li>
          <li>• <strong>IndexedDB Fallback:</strong> Large datasets stored in IndexedDB</li>
          <li>• <strong>Auto-Invalidation:</strong> Smart cache clearing on updates</li>
          <li>• <strong>Service Worker:</strong> Background caching for API calls</li>
          <li>• <strong>Rate Limiting:</strong> Cached rate limit status with migration</li>
        </ul>
      </div>
      
      {walletAddress && (
        <p className="text-xs text-gray-500 mt-4">
          Managing cache for wallet: <span className="font-mono">{walletAddress.slice(0, 8)}...{walletAddress.slice(-8)}</span>
        </p>
      )}
    </div>
  );
};

/**
 * Simplified cache status indicator component
 */
export const CacheStatusIndicator: React.FC = () => {
  const [stats, setStats] = useState({ localStorageEntries: 0, version: '' });
  const { status } = useServiceWorker();

  useEffect(() => {
    const updateStats = () => {
      setStats(cacheManager.getCacheStats());
    };
    
    updateStats();
    const interval = setInterval(updateStats, 30000); // Update every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-2 text-xs text-gray-500">
      <div className="flex items-center gap-1">
        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
        <span>Cache: {stats.localStorageEntries}</span>
      </div>
      
      {status.isActive && (
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span>SW: Active</span>
        </div>
      )}
      
      <span className="text-gray-400">v{stats.version}</span>
    </div>
  );
};