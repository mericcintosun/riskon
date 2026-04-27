/**
 * PWA utilities for Riskon application
 * Handles service worker registration, offline detection, and PWA features
 */

import { riskonDB } from './indexedDB.js';

class PWAUtils {
  constructor() {
    this.registration = null;
    this.isOnline = navigator.onLine;
    this.installPrompt = null;
    this.isInstalled = false;
    
    // Initialize event listeners
    this.initEventListeners();
  }

  /**
   * Initialize event listeners for online/offline status
   */
  initEventListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.handleOnlineStatus();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.handleOfflineStatus();
    });

    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      this.installPrompt = event;
    });

    window.addEventListener('appinstalled', () => {
      this.isInstalled = true;
      console.log('PWA: App installed successfully');
    });
  }

  /**
   * Register service worker
   */
  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        this.registration = await navigator.serviceWorker.register('/sw.js');
        console.log('PWA: Service Worker registered successfully');
        
        // Check for updates periodically
        setInterval(() => {
          this.checkForUpdates();
        }, 60 * 60 * 1000); // Check every hour
        
        return this.registration;
      } catch (error) {
        console.error('PWA: Service Worker registration failed:', error);
        return null;
      }
    }
    return null;
  }

  /**
   * Check for service worker updates
   */
  async checkForUpdates() {
    if (this.registration) {
      try {
        await this.registration.update();
        console.log('PWA: Checked for service worker updates');
      } catch (error) {
        console.error('PWA: Failed to check for updates:', error);
      }
    }
  }

  /**
   * Handle online status
   */
  async handleOnlineStatus() {
    console.log('PWA: Connection restored');
    
    // Trigger background sync if available
    if (this.registration && 'sync' in this.registration) {
      try {
        await this.registration.sync.register('riskon-background-sync');
        console.log('PWA: Background sync registered');
      } catch (error) {
        console.error('PWA: Failed to register background sync:', error);
      }
    }

    // Process any queued offline actions
    await this.processOfflineActions();
    
    // Dispatch online event
    window.dispatchEvent(new CustomEvent('pwa-online', {
      detail: { timestamp: Date.now() }
    }));
  }

  /**
   * Handle offline status
   */
  handleOfflineStatus() {
    console.log('PWA: Connection lost');
    
    // Dispatch offline event
    window.dispatchEvent(new CustomEvent('pwa-offline', {
      detail: { timestamp: Date.now() }
    }));
  }

  /**
   * Process offline actions when back online
   */
  async processOfflineActions() {
    try {
      const pendingActions = await riskonDB.getPendingActions();
      
      for (const action of pendingActions) {
        try {
          await this.executeOfflineAction(action);
          await riskonDB.markActionSynced(action.id);
          console.log(`PWA: Synced action ${action.id}`);
        } catch (error) {
          console.error(`PWA: Failed to sync action ${action.id}:`, error);
        }
      }
    } catch (error) {
      console.error('PWA: Failed to process offline actions:', error);
    }
  }

  /**
   * Execute queued offline action
   */
  async executeOfflineAction(action) {
    switch (action.type) {
      case 'risk_analysis':
        // Sync risk analysis to backend
        return await this.syncRiskAnalysis(action.data);
      
      case 'user_profile_update':
        // Sync user profile update
        return await this.syncUserProfile(action.data);
      
      case 'transaction':
        // Sync transaction data
        return await this.syncTransaction(action.data);
      
      default:
        console.warn(`PWA: Unknown action type: ${action.type}`);
        return null;
    }
  }

  /**
   * Sync risk analysis to backend
   */
  async syncRiskAnalysis(data) {
    // Implementation would call your backend API
    console.log('PWA: Syncing risk analysis:', data);
    return Promise.resolve();
  }

  /**
   * Sync user profile to backend
   */
  async syncUserProfile(data) {
    // Implementation would call your backend API
    console.log('PWA: Syncing user profile:', data);
    return Promise.resolve();
  }

  /**
   * Sync transaction to backend
   */
  async syncTransaction(data) {
    // Implementation would call your backend API
    console.log('PWA: Syncing transaction:', data);
    return Promise.resolve();
  }

  /**
   * Show install prompt
   */
  async showInstallPrompt() {
    if (!this.installPrompt) {
      console.log('PWA: Install prompt not available');
      return false;
    }

    try {
      const result = await this.installPrompt.prompt();
      this.installPrompt = null;
      
      if (result.outcome === 'accepted') {
        console.log('PWA: User accepted install prompt');
        return true;
      } else {
        console.log('PWA: User dismissed install prompt');
        return false;
      }
    } catch (error) {
      console.error('PWA: Failed to show install prompt:', error);
      return false;
    }
  }

  /**
   * Check if app can be installed
   */
  canInstall() {
    return !!this.installPrompt && !this.isInstalled;
  }

  /**
   * Subscribe to push notifications
   */
  async subscribeToPushNotifications(vapidPublicKey) {
    if (!this.registration) {
      throw new Error('Service Worker not registered');
    }

    try {
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey)
      });

      console.log('PWA: Push notification subscription successful');
      return subscription;
    } catch (error) {
      console.error('PWA: Push notification subscription failed:', error);
      throw error;
    }
  }

  /**
   * Convert VAPID key to Uint8Array
   */
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  /**
   * Send message to service worker
   */
  async sendMessageToSW(type, payload = {}) {
    if (!this.registration) {
      throw new Error('Service Worker not registered');
    }

    return new Promise((resolve, reject) => {
      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        if (event.data.error) {
          reject(new Error(event.data.error));
        } else {
          resolve(event.data);
        }
      };

      this.registration.active.postMessage({
        type,
        payload
      }, [messageChannel.port2]);

      // Timeout after 5 seconds
      setTimeout(() => {
        reject(new Error('Service Worker message timeout'));
      }, 5000);
    });
  }

  /**
   * Clear API cache
   */
  async clearApiCache() {
    return await this.sendMessageToSW('CLEAR_API_CACHE');
  }

  /**
   * Clear all caches
   */
  async clearAllCaches() {
    return await this.sendMessageToSW('CLEAR_ALL_CACHE');
  }

  /**
   * Get cache status
   */
  async getCacheStatus() {
    return await this.sendMessageToSW('GET_CACHE_STATUS');
  }

  /**
   * Register background sync
   */
  async registerBackgroundSync() {
    if (this.registration && 'sync' in this.registration) {
      try {
        await this.sendMessageToSW('REGISTER_BACKGROUND_SYNC');
        console.log('PWA: Background sync registered');
      } catch (error) {
        console.error('PWA: Failed to register background sync:', error);
      }
    }
  }

  /**
   * Get network information
   */
  getNetworkInfo() {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    
    return {
      online: this.isOnline,
      effectiveType: connection?.effectiveType || 'unknown',
      downlink: connection?.downlink || null,
      rtt: connection?.rtt || null,
      saveData: connection?.saveData || false
    };
  }

  /**
   * Queue action for offline sync
   */
  async queueOfflineAction(type, data) {
    try {
      const actionId = await riskonDB.queueOfflineAction({
        type,
        data
      });
      
      console.log(`PWA: Queued offline action ${actionId}`);
      return actionId;
    } catch (error) {
      console.error('PWA: Failed to queue offline action:', error);
      throw error;
    }
  }

  /**
   * Get PWA installation status
   */
  getInstallStatus() {
    return {
      canInstall: this.canInstall(),
      isInstalled: this.isInstalled,
      isStandalone: window.matchMedia('(display-mode: standalone)').matches,
      isInWebAppChrome: window.matchMedia('(display-mode: webapp)').matches
    };
  }

  /**
   * Check if running as PWA
   */
  isPWA() {
    return window.matchMedia('(display-mode: standalone)').matches || 
           window.navigator.standalone === true;
  }
}

// Export singleton instance
export const pwaUtils = new PWAUtils();

// Export utility functions for common operations
export const pwaHelpers = {
  async cacheRiskScore(walletAddress, riskScore, analysisData) {
    if (!pwaUtils.isOnline) {
      // Queue for sync if offline
      return await pwaUtils.queueOfflineAction('risk_analysis', {
        walletAddress,
        riskScore,
        analysisData
      });
    }
    
    // Store in IndexedDB and sync immediately
    await riskonDB.storeRiskAnalysis({
      walletAddress,
      riskScore,
      analysisData,
      type: 'risk_score'
    });
    
    return Promise.resolve();
  },

  async cacheUserProfile(profile) {
    if (!pwaUtils.isOnline) {
      // Queue for sync if offline
      return await pwaUtils.queueOfflineAction('user_profile_update', profile);
    }
    
    // Store in IndexedDB and sync immediately
    await riskonDB.storeUserProfile(profile);
    
    return Promise.resolve();
  },

  async showInstallPromptIfAvailable() {
    if (pwaUtils.canInstall()) {
      return await pwaUtils.showInstallPrompt();
    }
    return false;
  },

  getNetworkStatus() {
    return pwaUtils.getNetworkInfo();
  },

  isOffline() {
    return !pwaUtils.isOnline;
  }
};
