/**
 * Push Notifications Utility for Riskon PWA
 * Handles push notification subscriptions and risk alerts
 */

class PushNotificationManager {
  constructor() {
    this.subscription = null;
    this.isSupported = 'PushManager' in window && 'Notification' in window;
    this.vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
  }

  /**
   * Initialize push notifications
   */
  async init() {
    if (!this.isSupported) {
      console.warn('Push notifications not supported');
      return false;
    }

    try {
      // Check current permission
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        console.log('Push notification permission not granted');
        return false;
      }

      // Get existing subscription or create new one
      await this.getSubscription();
      return true;
    } catch (error) {
      console.error('Failed to initialize push notifications:', error);
      return false;
    }
  }

  /**
   * Get or create push subscription
   */
  async getSubscription() {
    if (!this.isSupported) return null;

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Get existing subscription
      this.subscription = await registration.pushManager.getSubscription();
      
      // Create new subscription if none exists
      if (!this.subscription) {
        if (!this.vapidPublicKey) {
          console.warn('VAPID public key not configured');
          return null;
        }
        
        this.subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
        });
        
        // Send subscription to server
        await this.sendSubscriptionToServer(this.subscription);
      }
      
      return this.subscription;
    } catch (error) {
      console.error('Failed to get push subscription:', error);
      return null;
    }
  }

  /**
   * Send subscription to server
   */
  async sendSubscriptionToServer(subscription) {
    try {
      // This would send to your backend server
      console.log('Sending subscription to server:', subscription);
      
      // Example implementation:
      // const response = await fetch('/api/notifications/subscribe', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify(subscription)
      // });
      
      return true;
    } catch (error) {
      console.error('Failed to send subscription to server:', error);
      return false;
    }
  }

  /**
   * Unsubscribe from push notifications
   */
  async unsubscribe() {
    if (!this.subscription) return true;

    try {
      const unsubscribed = await this.subscription.unsubscribe();
      
      if (unsubscribed) {
        // Remove from server
        await this.removeSubscriptionFromServer(this.subscription);
        this.subscription = null;
      }
      
      return unsubscribed;
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
      return false;
    }
  }

  /**
   * Remove subscription from server
   */
  async removeSubscriptionFromServer(subscription) {
    try {
      // This would remove from your backend server
      console.log('Removing subscription from server:', subscription);
      
      // Example implementation:
      // const response = await fetch('/api/notifications/unsubscribe', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify(subscription)
      // });
      
      return true;
    } catch (error) {
      console.error('Failed to remove subscription from server:', error);
      return false;
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
   * Get subscription status
   */
  getSubscriptionStatus() {
    return {
      isSupported: this.isSupported,
      isSubscribed: !!this.subscription,
      permission: Notification.permission,
      subscription: this.subscription
    };
  }

  /**
   * Show local notification (fallback)
   */
  async showLocalNotification(title, options = {}) {
    if (Notification.permission !== 'granted') {
      return false;
    }

    try {
      const notification = new Notification(title, {
        icon: '/icon-192.png',
        badge: '/icon-32.png',
        vibrate: [100, 50, 100],
        ...options
      });

      // Auto-close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);

      return notification;
    } catch (error) {
      console.error('Failed to show local notification:', error);
      return null;
    }
  }
}

// Notification types for Riskon
export const NotificationTypes = {
  RISK_ALERT: 'risk_alert',
  TRANSACTION_UPDATE: 'transaction_update',
  MARKET_UPDATE: 'market_update',
  LIQUIDITY_WARNING: 'liquidity_warning',
  SCORE_IMPROVED: 'score_improved',
  SCORE_DECLINED: 'score_declined',
  SYNC_COMPLETE: 'sync_complete',
  OFFLINE_MODE: 'offline_mode'
};

// Notification templates
export const NotificationTemplates = {
  [NotificationTypes.RISK_ALERT]: {
    title: 'Risk Alert',
    body: 'Your risk score has changed significantly',
    icon: '/icon-192.png',
    actions: [
      { action: 'view', title: 'View Details' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  },
  
  [NotificationTypes.TRANSACTION_UPDATE]: {
    title: 'Transaction Update',
    body: 'Your transaction has been processed',
    icon: '/icon-192.png',
    actions: [
      { action: 'view', title: 'View Transaction' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  },
  
  [NotificationTypes.MARKET_UPDATE]: {
    title: 'Market Update',
    body: 'Significant market movement detected',
    icon: '/icon-192.png',
    actions: [
      { action: 'view', title: 'View Markets' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  },
  
  [NotificationTypes.LIQUIDITY_WARNING]: {
    title: 'Liquidity Warning',
    body: 'Your position may be at risk',
    icon: '/icon-192.png',
    vibrate: [200, 100, 200],
    actions: [
      { action: 'view', title: 'View Position' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  },
  
  [NotificationTypes.SCORE_IMPROVED]: {
    title: 'Score Improved!',
    body: 'Your risk score has improved',
    icon: '/icon-192.png',
    actions: [
      { action: 'view', title: 'View Score' },
      { action: 'share', title: 'Share' }
    ]
  },
  
  [NotificationTypes.SCORE_DECLINED]: {
    title: 'Score Declined',
    body: 'Your risk score has decreased',
    icon: '/icon-192.png',
    actions: [
      { action: 'view', title: 'View Analysis' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  },
  
  [NotificationTypes.SYNC_COMPLETE]: {
    title: 'Sync Complete',
    body: 'Your data has been synced',
    icon: '/icon-192.png',
    actions: [
      { action: 'view', title: 'View Dashboard' }
    ]
  },
  
  [NotificationTypes.OFFLINE_MODE]: {
    title: 'Offline Mode',
    body: 'You are currently offline. Data will sync when connection is restored.',
    icon: '/icon-192.png',
    actions: [
      { action: 'dismiss', title: 'Got it' }
    ]
  }
};

// Export singleton instance
export const pushNotificationManager = new PushNotificationManager();

// Utility functions for common notification tasks
export const notificationUtils = {
  async sendRiskAlert(walletAddress, oldScore, newScore, changePercent) {
    const isImprovement = newScore > oldScore;
    const type = isImprovement ? NotificationTypes.SCORE_IMPROVED : NotificationTypes.SCORE_DECLINED;
    const template = NotificationTemplates[type];
    
    // Customize notification
    const notification = {
      ...template,
      body: `Your risk score has ${isImprovement ? 'improved' : 'declined'} from ${oldScore} to ${newScore} (${changePercent}%)`,
      data: {
        type,
        walletAddress,
        oldScore,
        newScore,
        changePercent
      }
    };

    return await pushNotificationManager.showLocalNotification(notification.title, notification);
  },

  async sendTransactionUpdate(transactionHash, status, amount) {
    const template = NotificationTemplates[NotificationTypes.TRANSACTION_UPDATE];
    
    const notification = {
      ...template,
      body: `Transaction ${transactionHash.slice(0, 8)}... is ${status} (${amount} XLM)`,
      data: {
        type: NotificationTypes.TRANSACTION_UPDATE,
        transactionHash,
        status,
        amount
      }
    };

    return await pushNotificationManager.showLocalNotification(notification.title, notification);
  },

  async sendLiquidityWarning(poolName, riskLevel, collateralRatio) {
    const template = NotificationTemplates[NotificationTypes.LIQUIDITY_WARNING];
    
    const notification = {
      ...template,
      body: `${poolName}: Risk level ${riskLevel}, collateral ratio ${collateralRatio}%`,
      data: {
        type: NotificationTypes.LIQUIDITY_WARNING,
        poolName,
        riskLevel,
        collateralRatio
      }
    };

    return await pushNotificationManager.showLocalNotification(notification.title, notification);
  },

  async sendMarketUpdate(marketType, changePercent, currentValue) {
    const template = NotificationTemplates[NotificationTypes.MARKET_UPDATE];
    
    const notification = {
      ...template,
      body: `${marketType}: ${changePercent}% change (Current: ${currentValue})`,
      data: {
        type: NotificationTypes.MARKET_UPDATE,
        marketType,
        changePercent,
        currentValue
      }
    };

    return await pushNotificationManager.showLocalNotification(notification.title, notification);
  },

  async sendSyncComplete(syncedItemsCount) {
    const template = NotificationTemplates[NotificationTypes.SYNC_COMPLETE];
    
    const notification = {
      ...template,
      body: `${syncedItemsCount} items have been synced successfully`,
      data: {
        type: NotificationTypes.SYNC_COMPLETE,
        syncedItemsCount
      }
    };

    return await pushNotificationManager.showLocalNotification(notification.title, notification);
  },

  async sendOfflineModeWarning() {
    const template = NotificationTemplates[NotificationTypes.OFFLINE_MODE];
    
    return await pushNotificationManager.showLocalNotification(template.title, template);
  }
};
