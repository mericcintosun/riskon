"use client";

import { CacheEntry, CacheOptions, CacheConfig } from '../types/cache';
import { 
  CACHE_VERSION, 
  CACHE_TTL, 
  INDEXED_DB_CONFIG, 
  CACHE_BEHAVIOR,
  isCacheDebuggingEnabled 
} from '../config/cacheConfig';

// Cache configuration using centralized config
const CACHE_CONFIG: CacheConfig = {
  version: CACHE_VERSION,
  defaultTTL: CACHE_TTL.HORIZON_DATA, // Default to Horizon data TTL
  maxLocalStorageSize: INDEXED_DB_CONFIG.MAX_LOCALSTORAGE_SIZE,
};

class CacheManager {
  private dbName = INDEXED_DB_CONFIG.DB_NAME;
  private dbVersion = INDEXED_DB_CONFIG.DB_VERSION;
  private storeName = INDEXED_DB_CONFIG.STORE_NAME;

  constructor() {
    this.initializeIndexedDB();
    if (CACHE_BEHAVIOR.AUTO_CLEANUP) {
      this.cleanupExpiredCache();
    }
  }

  /**
   * Set data in cache with TTL and version
   */
  async setCache<T>(key: string, data: T, options: CacheOptions = {}): Promise<void> {
    const ttl = options.ttl || CACHE_CONFIG.defaultTTL;
    const cacheEntry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      version: CACHE_CONFIG.version,
      ttl,
    };

    const serializedData = JSON.stringify(cacheEntry);
    const useIndexedDB = 
      options.useIndexedDB || 
      serializedData.length > CACHE_CONFIG.maxLocalStorageSize;

    try {
      if (useIndexedDB) {
        await this.setIndexedDBCache(key, cacheEntry);
      } else {
        localStorage.setItem(`cache_${key}`, serializedData);
      }
    } catch (error) {
      console.warn(`Failed to cache data for key ${key}:`, error);
      // Fallback to IndexedDB if localStorage fails
      if (!useIndexedDB) {
        try {
          await this.setIndexedDBCache(key, cacheEntry);
        } catch (idbError) {
          console.error(`IndexedDB fallback failed for key ${key}:`, idbError);
        }
      }
    }
  }

  /**
   * Get data from cache with expiration check
   */
  async getCache<T>(key: string): Promise<T | null> {
    try {
      // Try localStorage first
      const localData = localStorage.getItem(`cache_${key}`);
      if (localData) {
        const cacheEntry: CacheEntry<T> = JSON.parse(localData);
        if (this.isValidCacheEntry(cacheEntry)) {
          if (isCacheDebuggingEnabled()) {
            console.log(`🎯 Cache HIT for key: ${key}`);
          }
          return cacheEntry.data;
        } else {
          // Remove invalid/expired entry
          localStorage.removeItem(`cache_${key}`);
          if (isCacheDebuggingEnabled()) {
            console.log(`⏰ Cache EXPIRED for key: ${key}`);
          }
        }
      }

      // Try IndexedDB fallback
      const indexedDBEntry = await this.getIndexedDBCache<T>(key);
      if (indexedDBEntry && this.isValidCacheEntry(indexedDBEntry)) {
        if (isCacheDebuggingEnabled()) {
          console.log(`🎯 IndexedDB Cache HIT for key: ${key}`);
        }
        return indexedDBEntry.data;
      }

      if (isCacheDebuggingEnabled()) {
        console.log(`❌ Cache MISS for key: ${key}`);
      }
      return null;
    } catch (error) {
      console.warn(`Failed to retrieve cache for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Invalidate specific cache entry
   */
  async invalidateCache(key: string): Promise<void> {
    try {
      localStorage.removeItem(`cache_${key}`);
      await this.removeIndexedDBCache(key);
    } catch (error) {
      console.warn(`Failed to invalidate cache for key ${key}:`, error);
    }
  }

  /**
   * Clear all cache (used when version changes)
   */
  async clearAllCache(): Promise<void> {
    try {
      // Clear localStorage cache entries
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('cache_')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));

      // Clear IndexedDB
      await this.clearIndexedDBCache();

      console.log('All cache cleared due to version mismatch or manual clear');
    } catch (error) {
      console.error('Failed to clear all cache:', error);
    }
  }

  /**
   * Check if cache entry is valid (not expired, correct version)
   */
  private isValidCacheEntry<T>(entry: CacheEntry<T>): boolean {
    if (!entry || entry.version !== CACHE_CONFIG.version) {
      return false;
    }

    const now = Date.now();
    const expirationTime = entry.timestamp + (entry.ttl || CACHE_CONFIG.defaultTTL);
    
    return now < expirationTime;
  }

  /**
   * Initialize IndexedDB for large data fallback
   */
  private async initializeIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        resolve(); // Skip if not in browser or no IndexedDB support
        return;
      }

      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.warn('IndexedDB initialization failed:', request.error);
        resolve(); // Don't fail completely, just skip IndexedDB
      };

      request.onsuccess = () => {
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
    });
  }

  /**
   * Set data in IndexedDB
   */
  private async setIndexedDBCache<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB not available'));
        return;
      }

      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        
        const putRequest = store.put(entry, `cache_${key}`);
        
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };
    });
  }

  /**
   * Get data from IndexedDB
   */
  private async getIndexedDBCache<T>(key: string): Promise<CacheEntry<T> | null> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        resolve(null);
        return;
      }

      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.warn('IndexedDB access failed:', request.error);
        resolve(null);
      };

      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        
        const getRequest = store.get(`cache_${key}`);
        
        getRequest.onsuccess = () => resolve(getRequest.result || null);
        getRequest.onerror = () => {
          console.warn('IndexedDB get failed:', getRequest.error);
          resolve(null);
        };
      };
    });
  }

  /**
   * Remove data from IndexedDB
   */
  private async removeIndexedDBCache(key: string): Promise<void> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        resolve();
        return;
      }

      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => resolve(); // Fail silently

      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        
        const deleteRequest = store.delete(`cache_${key}`);
        
        deleteRequest.onsuccess = () => resolve();
        deleteRequest.onerror = () => resolve(); // Fail silently
      };
    });
  }

  /**
   * Clear all IndexedDB cache
   */
  private async clearIndexedDBCache(): Promise<void> {
    return new Promise((resolve) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        resolve();
        return;
      }

      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => resolve();

      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        
        const clearRequest = store.clear();
        
        clearRequest.onsuccess = () => resolve();
        clearRequest.onerror = () => resolve();
      };
    });
  }

  /**
   * Clean up expired cache entries on startup
   */
  private async cleanupExpiredCache(): Promise<void> {
    try {
      // Cleanup localStorage
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('cache_')) {
          const data = localStorage.getItem(key);
          if (data) {
            try {
              const entry: CacheEntry = JSON.parse(data);
              if (!this.isValidCacheEntry(entry)) {
                keysToRemove.push(key);
              }
            } catch {
              keysToRemove.push(key); // Remove malformed entries
            }
          }
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));

      console.log(`Cleaned up ${keysToRemove.length} expired cache entries`);
    } catch (error) {
      console.warn('Cache cleanup failed:', error);
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { localStorageEntries: number; version: string } {
    let localStorageEntries = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('cache_')) {
        localStorageEntries++;
      }
    }

    return {
      localStorageEntries,
      version: CACHE_CONFIG.version,
    };
  }
}

// Export singleton instance
export const cacheManager = new CacheManager();

// Export helper functions for easier usage
export const setCache = <T>(key: string, data: T, options?: CacheOptions) => 
  cacheManager.setCache(key, data, options);

export const getCache = <T>(key: string) => 
  cacheManager.getCache<T>(key);

export const invalidateCache = (key: string) => 
  cacheManager.invalidateCache(key);

export const clearAllCache = () => 
  cacheManager.clearAllCache();
/**
 * Cache Management with Expiration and Invalidation
 *
 * Implements intelligent caching strategy with TTL, versioning, and invalidation
 * Related Issue: #17 - Caching Strategy Improvements
 */

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  version?: string; // Cache version for invalidation
  storage?: 'memory' | 'localStorage' | 'sessionStorage';
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  version: string;
}

class CacheManager {
  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private defaultTTL: number = 5 * 60 * 1000; // 5 minutes
  private currentVersion: string = '1.0.0';

  /**
   * Set a cache entry
   */
  set<T>(key: string, data: T, options: CacheOptions = {}): void {
    const {
      ttl = this.defaultTTL,
      version = this.currentVersion,
      storage = 'memory',
    } = options;

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      version,
    };

    if (storage === 'memory') {
      this.memoryCache.set(key, entry);
    } else if (typeof window !== 'undefined') {
      const storageObj = storage === 'localStorage' ? localStorage : sessionStorage;
      try {
        storageObj.setItem(key, JSON.stringify(entry));
      } catch (error) {
        console.warn('Cache storage failed:', error);
      }
    }
  }

  /**
   * Get a cache entry
   */
  get<T>(key: string, storage: 'memory' | 'localStorage' | 'sessionStorage' = 'memory'): T | null {
    let entry: CacheEntry<T> | null = null;

    if (storage === 'memory') {
      entry = this.memoryCache.get(key) || null;
    } else if (typeof window !== 'undefined') {
      const storageObj = storage === 'localStorage' ? localStorage : sessionStorage;
      try {
        const stored = storageObj.getItem(key);
        if (stored) {
          entry = JSON.parse(stored);
        }
      } catch (error) {
        console.warn('Cache retrieval failed:', error);
        return null;
      }
    }

    if (!entry) return null;

    // Check version
    if (entry.version !== this.currentVersion) {
      this.delete(key, storage);
      return null;
    }

    // Check expiration
    const age = Date.now() - entry.timestamp;
    if (age > entry.ttl) {
      this.delete(key, storage);
      return null;
    }

    return entry.data;
  }

  /**
   * Delete a cache entry
   */
  delete(key: string, storage: 'memory' | 'localStorage' | 'sessionStorage' = 'memory'): void {
    if (storage === 'memory') {
      this.memoryCache.delete(key);
    } else if (typeof window !== 'undefined') {
      const storageObj = storage === 'localStorage' ? localStorage : sessionStorage;
      storageObj.removeItem(key);
    }
  }

  /**
   * Clear all cache entries
   */
  clear(storage: 'memory' | 'localStorage' | 'sessionStorage' = 'memory'): void {
    if (storage === 'memory') {
      this.memoryCache.clear();
    } else if (typeof window !== 'undefined') {
      const storageObj = storage === 'localStorage' ? localStorage : sessionStorage;
      storageObj.clear();
    }
  }

  /**
   * Invalidate cache by pattern
   */
  invalidatePattern(pattern: RegExp, storage: 'memory' | 'localStorage' | 'sessionStorage' = 'memory'): void {
    if (storage === 'memory') {
      for (const key of this.memoryCache.keys()) {
        if (pattern.test(key)) {
          this.memoryCache.delete(key);
        }
      }
    } else if (typeof window !== 'undefined') {
      const storageObj = storage === 'localStorage' ? localStorage : sessionStorage;
      const keysToDelete: string[] = [];

      for (let i = 0; i < storageObj.length; i++) {
        const key = storageObj.key(i);
        if (key && pattern.test(key)) {
          keysToDelete.push(key);
        }
      }

      keysToDelete.forEach(key => storageObj.removeItem(key));
    }
  }

  /**
   * Update cache version (invalidates all old entries)
   */
  updateVersion(newVersion: string): void {
    this.currentVersion = newVersion;
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.memoryCache.size,
      keys: Array.from(this.memoryCache.keys()),
    };
  }

  /**
   * Wrapper for async operations with caching
   */
  async wrap<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const { storage = 'memory' } = options;

    // Try to get from cache
    const cached = this.get<T>(key, storage);
    if (cached !== null) {
      return cached;
    }

    // Fetch and cache
    const data = await fetcher();
    this.set(key, data, options);
    return data;
  }
}

// Export singleton instance
export const cache = new CacheManager();

// Convenience functions
export const cacheHelpers = {
  /**
   * Cache account data
   */
  cacheAccount: (address: string, data: any, ttl = 5 * 60 * 1000) => {
    cache.set(`account:${address}`, data, { ttl, storage: 'localStorage' });
  },

  /**
   * Get cached account data
   */
  getCachedAccount: (address: string) => {
    return cache.get(`account:${address}`, 'localStorage');
  },

  /**
   * Cache transaction history
   */
  cacheTransactions: (address: string, data: any, ttl = 10 * 60 * 1000) => {
    cache.set(`transactions:${address}`, data, { ttl, storage: 'localStorage' });
  },

  /**
   * Get cached transactions
   */
  getCachedTransactions: (address: string) => {
    return cache.get(`transactions:${address}`, 'localStorage');
  },

  /**
   * Cache risk score
   */
  cacheRiskScore: (address: string, score: number, ttl = 30 * 60 * 1000) => {
    cache.set(`risk:${address}`, score, { ttl, storage: 'localStorage' });
  },

  /**
   * Get cached risk score
   */
  getCachedRiskScore: (address: string) => {
    return cache.get<number>(`risk:${address}`, 'localStorage');
  },

  /**
   * Invalidate all account-related cache
   */
  invalidateAccount: (address: string) => {
    cache.invalidatePattern(new RegExp(`^(account|transactions|risk):${address}`), 'localStorage');
  },
};

export default cache;
