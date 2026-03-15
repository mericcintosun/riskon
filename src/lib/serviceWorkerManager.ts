"use client";

/**
 * Service Worker registration and management
 * Optional caching for static assets and Horizon API calls
 */

export interface ServiceWorkerStatus {
  isSupported: boolean;
  isRegistered: boolean;
  isActive: boolean;
  cacheName?: string;
  totalEntries?: number;
  apiCacheEntries?: number;
  staticCacheEntries?: number;
}

class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null;
  private isEnabled: boolean = false;

  constructor() {
    this.isEnabled = this.loadPreference();
  }

  /**
   * Register service worker if enabled and supported
   */
  async register(): Promise<boolean> {
    if (!this.isEnabled || typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return false;
    }

    try {
      console.log('Registering service worker...');
      
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('Service Worker registered:', this.registration.scope);

      // Listen for updates
      this.registration.addEventListener('updatefound', () => {
        console.log('Service Worker update found');
      });

      return true;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return false;
    }
  }

  /**
   * Unregister service worker
   */
  async unregister(): Promise<boolean> {
    if (!this.registration) {
      // Try to find existing registration
      if ('serviceWorker' in navigator) {
        this.registration = await navigator.serviceWorker.getRegistration();
      }
    }

    if (this.registration) {
      try {
        const success = await this.registration.unregister();
        if (success) {
          console.log('Service Worker unregistered');
          this.registration = null;
          return true;
        }
      } catch (error) {
        console.error('Service Worker unregistration failed:', error);
      }
    }

    return false;
  }

  /**
   * Enable service worker and register
   */
  async enable(): Promise<boolean> {
    this.isEnabled = true;
    this.savePreference(true);
    return await this.register();
  }

  /**
   * Disable service worker and unregister
   */
  async disable(): Promise<boolean> {
    this.isEnabled = false;
    this.savePreference(false);
    return await this.unregister();
  }

  /**
   * Get current service worker status
   */
  async getStatus(): Promise<ServiceWorkerStatus> {
    const isSupported = typeof window !== 'undefined' && 'serviceWorker' in navigator;
    
    if (!isSupported) {
      return {
        isSupported: false,
        isRegistered: false,
        isActive: false,
      };
    }

    let isRegistered = false;
    let isActive = false;
    let cacheStatus = {};

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      isRegistered = !!registration;
      isActive = !!(registration?.active);

      if (isActive && registration?.active) {
        // Get cache status from service worker
        cacheStatus = await this.getCacheStatus(registration.active);
      }
    } catch (error) {
      console.warn('Failed to get service worker status:', error);
    }

    return {
      isSupported,
      isRegistered,
      isActive,
      ...cacheStatus,
    };
  }

  /**
   * Clear API cache through service worker
   */
  async clearAPICache(): Promise<void> {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration?.active) {
      registration.active.postMessage({ type: 'CLEAR_API_CACHE' });
    }
  }

  /**
   * Clear all cache through service worker
   */
  async clearAllCache(): Promise<void> {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration?.active) {
      registration.active.postMessage({ type: 'CLEAR_ALL_CACHE' });
    }
  }

  /**
   * Get cache status from service worker
   */
  private async getCacheStatus(serviceWorker: ServiceWorker): Promise<object> {
    return new Promise((resolve) => {
      const channel = new MessageChannel();
      
      channel.port1.onmessage = (event) => {
        resolve(event.data);
      };

      serviceWorker.postMessage(
        { type: 'GET_CACHE_STATUS' }, 
        [channel.port2]
      );

      // Timeout after 5 seconds
      setTimeout(() => {
        resolve({});
      }, 5000);
    });
  }

  /**
   * Load user preference for service worker
   */
  private loadPreference(): boolean {
    if (typeof window === 'undefined') return false;
    
    try {
      const preference = localStorage.getItem('sw_enabled');
      return preference === 'true';
    } catch {
      return false; // Default to disabled
    }
  }

  /**
   * Save user preference for service worker
   */
  private savePreference(enabled: boolean): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem('sw_enabled', enabled.toString());
    } catch (error) {
      console.warn('Failed to save service worker preference:', error);
    }
  }

  /**
   * Check if service worker is enabled
   */
  get enabled(): boolean {
    return this.isEnabled;
  }
}

// Export singleton instance
export const serviceWorkerManager = new ServiceWorkerManager();

/**
 * Hook for service worker management in React components
 */
import { useState, useEffect } from 'react';

export const useServiceWorker = () => {
  const [status, setStatus] = useState<ServiceWorkerStatus>({
    isSupported: false,
    isRegistered: false,
    isActive: false,
  });

  const [loading, setLoading] = useState(false);

  const updateStatus = async () => {
    const newStatus = await serviceWorkerManager.getStatus();
    setStatus(newStatus);
  };

  useEffect(() => {
    updateStatus();
    
    // Auto-register if enabled
    if (serviceWorkerManager.enabled) {
      serviceWorkerManager.register().then(() => {
        updateStatus();
      });
    }
  }, []);

  const enable = async () => {
    setLoading(true);
    try {
      await serviceWorkerManager.enable();
      await updateStatus();
    } finally {
      setLoading(false);
    }
  };

  const disable = async () => {
    setLoading(true);
    try {
      await serviceWorkerManager.disable();
      await updateStatus();
    } finally {
      setLoading(false);
    }
  };

  const clearAPICache = async () => {
    await serviceWorkerManager.clearAPICache();
    await updateStatus();
  };

  const clearAllCache = async () => {
    await serviceWorkerManager.clearAllCache();
    await updateStatus();
  };

  return {
    status,
    loading,
    enable,
    disable,
    clearAPICache,
    clearAllCache,
    refreshStatus: updateStatus,
  };
};