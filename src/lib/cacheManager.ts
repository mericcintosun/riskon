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
