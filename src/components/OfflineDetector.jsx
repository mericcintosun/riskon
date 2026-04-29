/**
 * Offline Detection Component
 * Provides offline detection and UI indicators for network status
 */

import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, AlertCircle, CheckCircle } from 'lucide-react';
import { pwaHelpers } from '../lib/pwaUtils';

const OfflineDetector = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [networkInfo, setNetworkInfo] = useState(null);
  const [showOfflineBanner, setShowOfflineBanner] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);

  useEffect(() => {
    // Update network status
    const updateNetworkStatus = () => {
      const isCurrentlyOnline = navigator.onLine;
      setIsOnline(isCurrentlyOnline);
      setNetworkInfo(pwaHelpers.getNetworkStatus());
      
      if (!isCurrentlyOnline) {
        setShowOfflineBanner(true);
      } else {
        // Hide banner after a delay when coming back online
        setTimeout(() => {
          setShowOfflineBanner(false);
        }, 3000);
        setLastSyncTime(Date.now());
      }
    };

    // Initial update
    updateNetworkStatus();

    // Listen for online/offline events
    const handleOnline = () => {
      updateNetworkStatus();
    };

    const handleOffline = () => {
      updateNetworkStatus();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for PWA events
    const handlePWAOnline = () => {
      updateNetworkStatus();
    };

    const handlePWAOffline = () => {
      updateNetworkStatus();
    };

    window.addEventListener('pwa-online', handlePWAOnline);
    window.addEventListener('pwa-offline', handlePWAOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('pwa-online', handlePWAOnline);
      window.removeEventListener('pwa-offline', handlePWAOffline);
    };
  }, []);

  const formatLastSync = (timestamp) => {
    if (!timestamp) return 'Never';
    
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} hour ago`;
    return `${Math.floor(diff / 86400000)} day ago`;
  };

  const getConnectionColor = () => {
    if (!isOnline) return 'text-red-500';
    if (!networkInfo) return 'text-gray-400';
    
    switch (networkInfo.effectiveType) {
      case '4g': return 'text-green-500';
      case '3g': return 'text-yellow-500';
      case '2g': return 'text-orange-500';
      case 'slow-2g': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getConnectionText = () => {
    if (!isOnline) return 'Offline';
    if (!networkInfo) return 'Unknown';
    
    if (networkInfo.saveData) return 'Data Saver';
    return networkInfo.effectiveType?.toUpperCase() || 'Unknown';
  };

  return (
    <>
      {/* Offline Banner */}
      {showOfflineBanner && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-black px-4 py-3 border-b border-yellow-600">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <WifiOff className="w-5 h-5" />
              <div>
                <p className="font-medium text-sm">You're offline</p>
                <p className="text-xs opacity-75">Some features may be limited. Data will sync when connection is restored.</p>
              </div>
            </div>
            <button
              onClick={() => setShowOfflineBanner(false)}
              className="text-black/60 hover:text-black p-1"
            >
              <span className="sr-only">Dismiss</span>
              ×
            </button>
          </div>
        </div>
      )}

      {/* Network Status Indicator */}
      <div className="fixed top-4 right-4 z-40">
        <div className="bg-black/80 backdrop-blur-sm text-white rounded-lg shadow-lg p-3 border border-gray-700">
          <div className="flex items-center space-x-2">
            {isOnline ? (
              <Wifi className={`w-4 h-4 ${getConnectionColor()}`} />
            ) : (
              <WifiOff className="w-4 h-4 text-red-500" />
            )}
            <div className="text-xs">
              <div className={`font-medium ${getConnectionColor()}`}>
                {getConnectionText()}
              </div>
              {lastSyncTime && (
                <div className="text-gray-400">
                  Sync: {formatLastSync(lastSyncTime)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Offline Mode Indicator in Content */}
      {!isOnline && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-yellow-400 mr-2" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800">Offline Mode</h3>
              <p className="text-xs text-yellow-700 mt-1">
                You're currently offline. Risk analysis features will use cached data. 
                Your actions will be synced when you're back online.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Online Sync Confirmation */}
      {isOnline && lastSyncTime && (Date.now() - lastSyncTime < 5000) && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-4">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-green-400 mr-2" />
            <div>
              <h3 className="text-sm font-medium text-green-800">Back Online</h3>
              <p className="text-xs text-green-700 mt-1">
                Your data has been synced successfully.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content with Offline Context */}
      <div className={`transition-opacity duration-300 ${!isOnline ? 'opacity-90' : 'opacity-100'}`}>
        {React.Children.map(children, child => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child, {
              isOnline,
              networkInfo,
              lastSyncTime
            });
          }
          return child;
        })}
      </div>
    </>
  );
};

export default OfflineDetector;
