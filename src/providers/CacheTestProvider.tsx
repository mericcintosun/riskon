"use client";

import { useEffect } from 'react';

/**
 * Cache Test Utilities Hook
 * Loads cache testing utilities into window global scope for console access
 */
export const useCacheTestUtils = () => {
  useEffect(() => {
    // Load cache test utilities into global scope
    const loadTestUtils = async () => {
      if (typeof window !== 'undefined') {
        try {
          const testUtils = await import('../utils/manualCacheTests');
          console.log('🧪 Cache test utilities loaded! Use cacheTestUtils in console.');
        } catch (error) {
          console.warn('Failed to load cache test utilities:', error);
        }
      }
    };

    loadTestUtils();
  }, []);
};

/**
 * Cache Test Provider Component
 * Add this to your app to enable console-based cache testing
 */
export const CacheTestProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useCacheTestUtils();
  return <>{children}</>;
};