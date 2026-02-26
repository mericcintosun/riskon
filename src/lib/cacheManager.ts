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