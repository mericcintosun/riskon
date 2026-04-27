/**
 * PWA Install Prompt Component
 * Handles installation prompts and user guidance for PWA features
 */

import React, { useState, useEffect } from 'react';
import { Download, Wifi, WifiOff, Bell, BellOff, Smartphone, Monitor } from 'lucide-react';
import { pwaUtils, pwaHelpers } from '../lib/pwaUtils';

const PWAInstallPrompt = () => {
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [showOfflineIndicator, setShowOfflineIndicator] = useState(false);
  const [installStatus, setInstallStatus] = useState(null);
  const [networkStatus, setNetworkStatus] = useState(null);
  const [notificationPermission, setNotificationPermission] = useState('default');

  useEffect(() => {
    // Check initial status
    updateInstallStatus();
    updateNetworkStatus();
    checkNotificationPermission();

    // Listen for PWA events
    const handleOnline = () => {
      setShowOfflineIndicator(false);
      updateNetworkStatus();
    };

    const handleOffline = () => {
      setShowOfflineIndicator(true);
      updateNetworkStatus();
    };

    window.addEventListener('pwa-online', handleOnline);
    window.addEventListener('pwa-offline', handleOffline);

    // Show install prompt after user engagement
    const timer = setTimeout(() => {
      if (pwaUtils.canInstall()) {
        setShowInstallPrompt(true);
      }
    }, 10000); // Show after 10 seconds

    return () => {
      window.removeEventListener('pwa-online', handleOnline);
      window.removeEventListener('pwa-offline', handleOffline);
      clearTimeout(timer);
    };
  }, []);

  const updateInstallStatus = () => {
    setInstallStatus(pwaUtils.getInstallStatus());
  };

  const updateNetworkStatus = () => {
    setNetworkStatus(pwaUtils.getNetworkInfo());
  };

  const checkNotificationPermission = () => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  };

  const handleInstall = async () => {
    try {
      const installed = await pwaHelpers.showInstallPromptIfAvailable();
      if (installed) {
        setShowInstallPrompt(false);
        updateInstallStatus();
      }
    } catch (error) {
      console.error('Install failed:', error);
    }
  };

  const dismissInstallPrompt = () => {
    setShowInstallPrompt(false);
    // Don't show again for this session
    sessionStorage.setItem('pwa-install-dismissed', 'true');
  };

  const enableNotifications = async () => {
    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      
      if (permission === 'granted') {
        // Subscribe to push notifications (would need VAPID key)
        console.log('Notifications enabled');
      }
    } catch (error) {
      console.error('Failed to enable notifications:', error);
    }
  };

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  return (
    <>
      {/* Install Prompt Banner */}
      {showInstallPrompt && !sessionStorage.getItem('pwa-install-dismissed') && (
        <div className="fixed top-4 left-4 right-4 z-50 max-w-md mx-auto">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg shadow-lg p-4 border border-indigo-700">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <Download className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm">Install Riskon PWA</h3>
                <p className="text-xs mt-1 opacity-90">
                  Get offline access and a native app experience. Install Riskon on your {isMobile ? 'device' : 'computer'}.
                </p>
                <div className="flex space-x-2 mt-3">
                  <button
                    onClick={handleInstall}
                    className="bg-white text-indigo-600 px-3 py-1 rounded text-xs font-medium hover:bg-gray-100 transition-colors"
                  >
                    Install
                  </button>
                  <button
                    onClick={dismissInstallPrompt}
                    className="text-white/80 hover:text-white px-3 py-1 rounded text-xs transition-colors"
                  >
                    Not now
                  </button>
                </div>
              </div>
              <button
                onClick={dismissInstallPrompt}
                className="text-white/60 hover:text-white"
              >
                <span className="sr-only">Dismiss</span>
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Offline Indicator */}
      {showOfflineIndicator && (
        <div className="fixed top-4 left-4 z-50">
          <div className="bg-yellow-500 text-black rounded-lg shadow-lg p-3 flex items-center space-x-2 border border-yellow-600">
            <WifiOff className="w-4 h-4" />
            <span className="text-xs font-medium">You're offline</span>
          </div>
        </div>
      )}

      {/* PWA Status Panel */}
      <div className="fixed bottom-4 right-4 z-40">
        <div className="bg-black/80 backdrop-blur-sm text-white rounded-lg shadow-lg p-3 border border-gray-700 max-w-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-300">PWA Status</span>
            <div className="flex items-center space-x-1">
              {networkStatus?.online ? (
                <Wifi className="w-3 h-3 text-green-400" />
              ) : (
                <WifiOff className="w-3 h-3 text-yellow-400" />
              )}
            </div>
          </div>
          
          {/* Installation Status */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Installed:</span>
              <span className={installStatus?.isInstalled ? 'text-green-400' : 'text-gray-500'}>
                {installStatus?.isInstalled ? 'Yes' : 'No'}
              </span>
            </div>
            
            {/* Network Status */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Network:</span>
              <span className={networkStatus?.online ? 'text-green-400' : 'text-yellow-400'}>
                {networkStatus?.online ? 'Online' : 'Offline'}
              </span>
            </div>
            
            {/* Connection Type */}
            {networkStatus?.effectiveType && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Speed:</span>
                <span className="text-gray-300">{networkStatus.effectiveType}</span>
              </div>
            )}
            
            {/* Notification Status */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Notifications:</span>
              <span className={
                notificationPermission === 'granted' ? 'text-green-400' :
                notificationPermission === 'denied' ? 'text-red-400' : 'text-gray-500'
              }>
                {notificationPermission === 'granted' ? 'Enabled' :
                 notificationPermission === 'denied' ? 'Disabled' : 'Not set'}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-3 space-y-2">
            {/* Install Button */}
            {installStatus?.canInstall && (
              <button
                onClick={handleInstall}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3 py-2 rounded transition-colors flex items-center justify-center space-x-1"
              >
                <Download className="w-3 h-3" />
                <span>Install App</span>
              </button>
            )}
            
            {/* Enable Notifications */}
            {notificationPermission !== 'granted' && 'Notification' in window && (
              <button
                onClick={enableNotifications}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs px-3 py-2 rounded transition-colors flex items-center justify-center space-x-1"
              >
                <Bell className="w-3 h-3" />
                <span>Enable Alerts</span>
              </button>
            )}
          </div>

          {/* PWA Features Info */}
          <div className="mt-3 pt-3 border-t border-gray-700">
            <div className="text-xs text-gray-400 space-y-1">
              <div className="flex items-center space-x-2">
                <Smartphone className="w-3 h-3" />
                <span>Offline access</span>
              </div>
              <div className="flex items-center space-x-2">
                <Monitor className="w-3 h-3" />
                <span>Native experience</span>
              </div>
              <div className="flex items-center space-x-2">
                <Bell className="w-3 h-3" />
                <span>Risk alerts</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PWAInstallPrompt;
