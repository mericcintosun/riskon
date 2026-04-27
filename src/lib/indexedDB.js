/**
 * IndexedDB utility for Riskon PWA offline functionality
 * Handles storage of risk analysis data, user profiles, and offline cache
 */

const DB_NAME = 'riskon-db';
const DB_VERSION = 1;

// Object stores
const STORES = {
  RISK_ANALYSES: 'riskAnalyses',
  USER_PROFILES: 'userProfiles', 
  MARKET_DATA: 'marketData',
  OFFLINE_ACTIONS: 'offlineActions',
  CACHE_METADATA: 'cacheMetadata'
};

class RiskonIndexedDB {
  constructor() {
    this.db = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the IndexedDB database
   */
  async init() {
    if (this.isInitialized) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('IndexedDB: Failed to open database:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;
        console.log('IndexedDB: Database opened successfully');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create risk analyses store
        if (!db.objectStoreNames.contains(STORES.RISK_ANALYSES)) {
          const riskStore = db.createObjectStore(STORES.RISK_ANALYSES, { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          riskStore.createIndex('walletAddress', 'walletAddress', { unique: false });
          riskStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Create user profiles store
        if (!db.objectStoreNames.contains(STORES.USER_PROFILES)) {
          const profileStore = db.createObjectStore(STORES.USER_PROFILES, { 
            keyPath: 'walletAddress' 
          });
          profileStore.createIndex('lastUpdated', 'lastUpdated', { unique: false });
        }

        // Create market data store
        if (!db.objectStoreNames.contains(STORES.MARKET_DATA)) {
          const marketStore = db.createObjectStore(STORES.MARKET_DATA, { 
            keyPath: 'id' 
          });
          marketStore.createIndex('type', 'type', { unique: false });
          marketStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Create offline actions store for sync
        if (!db.objectStoreNames.contains(STORES.OFFLINE_ACTIONS)) {
          const actionStore = db.createObjectStore(STORES.OFFLINE_ACTIONS, { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          actionStore.createIndex('type', 'type', { unique: false });
          actionStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Create cache metadata store
        if (!db.objectStoreNames.contains(STORES.CACHE_METADATA)) {
          const metaStore = db.createObjectStore(STORES.CACHE_METADATA, { 
            keyPath: 'key' 
          });
        }

        console.log('IndexedDB: Database schema created');
      };
    });
  }

  /**
   * Store risk analysis data
   */
  async storeRiskAnalysis(riskData) {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.RISK_ANALYSES], 'readwrite');
      const store = transaction.objectStore(STORES.RISK_ANALYSES);
      
      const data = {
        ...riskData,
        timestamp: Date.now(),
        synced: false
      };

      const request = store.add(data);

      request.onsuccess = () => {
        console.log('IndexedDB: Risk analysis stored successfully');
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('IndexedDB: Failed to store risk analysis:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get risk analyses for a wallet
   */
  async getRiskAnalyses(walletAddress) {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.RISK_ANALYSES], 'readonly');
      const store = transaction.objectStore(STORES.RISK_ANALYSES);
      const index = store.index('walletAddress');
      
      const request = index.getAll(walletAddress);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('IndexedDB: Failed to get risk analyses:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Store user profile data
   */
  async storeUserProfile(profile) {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.USER_PROFILES], 'readwrite');
      const store = transaction.objectStore(STORES.USER_PROFILES);
      
      const data = {
        ...profile,
        lastUpdated: Date.now()
      };

      const request = store.put(data);

      request.onsuccess = () => {
        console.log('IndexedDB: User profile stored successfully');
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('IndexedDB: Failed to store user profile:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get user profile
   */
  async getUserProfile(walletAddress) {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.USER_PROFILES], 'readonly');
      const store = transaction.objectStore(STORES.USER_PROFILES);
      
      const request = store.get(walletAddress);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('IndexedDB: Failed to get user profile:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Store market data
   */
  async storeMarketData(marketData) {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.MARKET_DATA], 'readwrite');
      const store = transaction.objectStore(STORES.MARKET_DATA);
      
      const data = {
        ...marketData,
        timestamp: Date.now()
      };

      const request = store.put(data);

      request.onsuccess = () => {
        console.log('IndexedDB: Market data stored successfully');
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('IndexedDB: Failed to store market data:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get recent market data
   */
  async getMarketData(type, limit = 10) {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.MARKET_DATA], 'readonly');
      const store = transaction.objectStore(STORES.MARKET_DATA);
      const index = store.index('type');
      
      const request = index.getAll(type);

      request.onsuccess = () => {
        const results = request.result
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, limit);
        resolve(results);
      };

      request.onerror = () => {
        console.error('IndexedDB: Failed to get market data:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Queue offline action for sync
   */
  async queueOfflineAction(action) {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.OFFLINE_ACTIONS], 'readwrite');
      const store = transaction.objectStore(STORES.OFFLINE_ACTIONS);
      
      const data = {
        ...action,
        timestamp: Date.now(),
        synced: false
      };

      const request = store.add(data);

      request.onsuccess = () => {
        console.log('IndexedDB: Offline action queued successfully');
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('IndexedDB: Failed to queue offline action:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get pending offline actions
   */
  async getPendingActions() {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.OFFLINE_ACTIONS], 'readonly');
      const store = transaction.objectStore(STORES.OFFLINE_ACTIONS);
      
      const request = store.getAll();

      request.onsuccess = () => {
        const pendingActions = request.result.filter(action => !action.synced);
        resolve(pendingActions);
      };

      request.onerror = () => {
        console.error('IndexedDB: Failed to get pending actions:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Mark action as synced
   */
  async markActionSynced(actionId) {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.OFFLINE_ACTIONS], 'readwrite');
      const store = transaction.objectStore(STORES.OFFLINE_ACTIONS);
      
      // First get the action
      const getRequest = store.get(actionId);
      
      getRequest.onsuccess = () => {
        const action = getRequest.result;
        if (action) {
          action.synced = true;
          action.syncedAt = Date.now();
          
          const putRequest = store.put(action);
          
          putRequest.onsuccess = () => {
            console.log('IndexedDB: Action marked as synced');
            resolve(putRequest.result);
          };
          
          putRequest.onerror = () => {
            console.error('IndexedDB: Failed to mark action as synced:', putRequest.error);
            reject(putRequest.error);
          };
        } else {
          reject(new Error('Action not found'));
        }
      };
      
      getRequest.onerror = () => {
        console.error('IndexedDB: Failed to get action for sync marking:', getRequest.error);
        reject(getRequest.error);
      };
    });
  }

  /**
   * Store cache metadata
   */
  async setCacheMetadata(key, metadata) {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.CACHE_METADATA], 'readwrite');
      const store = transaction.objectStore(STORES.CACHE_METADATA);
      
      const data = {
        key,
        ...metadata,
        lastUpdated: Date.now()
      };

      const request = store.put(data);

      request.onsuccess = () => {
        console.log(`IndexedDB: Cache metadata set for ${key}`);
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('IndexedDB: Failed to set cache metadata:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get cache metadata
   */
  async getCacheMetadata(key) {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([STORES.CACHE_METADATA], 'readonly');
      const store = transaction.objectStore(STORES.CACHE_METADATA);
      
      const request = store.get(key);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('IndexedDB: Failed to get cache metadata:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Clear old data to manage storage
   */
  async clearOldData(daysOld = 30) {
    await this.init();
    
    const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([
        STORES.RISK_ANALYSES,
        STORES.MARKET_DATA,
        STORES.OFFLINE_ACTIONS
      ], 'readwrite');
      
      const promises = [];
      
      // Clear old risk analyses
      const riskStore = transaction.objectStore(STORES.RISK_ANALYSES);
      const riskRequest = riskStore.openCursor();
      
      riskRequest.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          if (cursor.value.timestamp < cutoffTime) {
            cursor.delete();
          }
          cursor.continue();
        }
      };
      
      // Clear old market data
      const marketStore = transaction.objectStore(STORES.MARKET_DATA);
      const marketRequest = marketStore.openCursor();
      
      marketRequest.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          if (cursor.value.timestamp < cutoffTime) {
            cursor.delete();
          }
          cursor.continue();
        }
      };
      
      // Clear old synced actions
      const actionStore = transaction.objectStore(STORES.OFFLINE_ACTIONS);
      const actionRequest = actionStore.openCursor();
      
      actionRequest.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          if (cursor.value.synced && cursor.value.timestamp < cutoffTime) {
            cursor.delete();
          }
          cursor.continue();
        }
      };

      transaction.oncomplete = () => {
        console.log('IndexedDB: Old data cleared successfully');
        resolve();
      };

      transaction.onerror = () => {
        console.error('IndexedDB: Failed to clear old data:', transaction.error);
        reject(transaction.error);
      };
    });
  }

  /**
   * Get storage usage statistics
   */
  async getStorageStats() {
    await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(Object.values(STORES), 'readonly');
      const stats = {};
      
      const promises = Object.values(STORES).map(storeName => {
        return new Promise((storeResolve, storeReject) => {
          const store = transaction.objectStore(storeName);
          const request = store.count();
          
          request.onsuccess = () => {
            stats[storeName] = request.result;
            storeResolve();
          };
          
          request.onerror = () => {
            storeReject(request.error);
          };
        });
      });
      
      Promise.all(promises)
        .then(() => {
          resolve(stats);
        })
        .catch(reject);
    });
  }
}

// Export singleton instance
export const riskonDB = new RiskonIndexedDB();

// Export utility functions for common operations
export const dbUtils = {
  async storeRiskScore(walletAddress, riskScore, analysisData) {
    return await riskonDB.storeRiskAnalysis({
      walletAddress,
      riskScore,
      analysisData,
      type: 'risk_score'
    });
  },

  async getLatestRiskScore(walletAddress) {
    const analyses = await riskonDB.getRiskAnalyses(walletAddress);
    return analyses
      .filter(a => a.type === 'risk_score')
      .sort((a, b) => b.timestamp - a.timestamp)[0];
  },

  async cacheMarketData(type, data) {
    return await riskonDB.storeMarketData({
      type,
      data
    });
  },

  async getCachedMarketData(type) {
    const marketData = await riskonDB.getMarketData(type, 1);
    return marketData[0]?.data;
  }
};
