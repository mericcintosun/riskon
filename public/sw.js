// Enhanced Service Worker for Riskon PWA
// Features: caching, background sync, push notifications, offline support

const CACHE_NAME = 'riskon-cache-v2';
const STATIC_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours for static assets
const API_CACHE_TTL = 5 * 60 * 1000; // 5 minutes for Horizon API calls
const BACKGROUND_SYNC_TAG = 'riskon-background-sync';
const PUSH_NOTIFICATION_TAG = 'riskon-push';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  // Add other static assets as needed
];

// Horizon API patterns to cache
const HORIZON_API_PATTERNS = [
  /^https:\/\/horizon(-testnet)?\.stellar\.org\/accounts\/[^\/]+$/,
  /^https:\/\/horizon(-testnet)?\.stellar\.org\/accounts\/[^\/]+\/payments/,
  /^https:\/\/horizon(-testnet)?\.stellar\.org\/accounts\/[^\/]+\/transactions/,
];

self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Service Worker: Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    }).catch((error) => {
      console.error('Service Worker: Cache installation failed:', error);
    })
  );
  
  // Skip waiting to activate immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Delete old caches
          if (cacheName !== CACHE_NAME && cacheName.startsWith('riskon-cache-')) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Claim all clients immediately
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const { url, method } = request;

  // Only handle GET requests
  if (method !== 'GET') {
    return;
  }

  // Handle Horizon API calls
  if (isHorizonAPICall(url)) {
    event.respondWith(handleHorizonAPIRequest(request));
    return;
  }

  // Handle static assets
  if (isStaticAsset(url)) {
    event.respondWith(handleStaticAssetRequest(request));
    return;
  }
});

/**
 * Check if URL is a Horizon API call that should be cached
 */
function isHorizonAPICall(url) {
  return HORIZON_API_PATTERNS.some(pattern => pattern.test(url));
}

/**
 * Check if URL is a static asset that should be cached
 */
function isStaticAsset(url) {
  // Cache same-origin static assets and specific external resources
  const urlObj = new URL(url);
  
  // Cache same-origin requests for static files
  if (urlObj.origin === self.location.origin) {
    return url.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/);
  }
  
  // Cache specific external resources (CDNs, etc.)
  return false;
}

/**
 * Handle Horizon API requests with cache-first strategy (with TTL)
 */
async function handleHorizonAPIRequest(request) {
  const url = request.url;
  
  try {
    // Check cache first
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      const cachedDate = cachedResponse.headers.get('sw-cached-date');
      if (cachedDate) {
        const cacheAge = Date.now() - parseInt(cachedDate);
        
        // Return cached response if within TTL
        if (cacheAge < API_CACHE_TTL) {
          console.log('Service Worker: Serving cached Horizon API response');
          
          // Fetch fresh data in background for next request
          fetchAndCache(request, cache).catch(error => {
            console.warn('Service Worker: Background fetch failed:', error);
          });
          
          return cachedResponse;
        }
      }
    }

    // Fetch fresh data
    console.log('Service Worker: Fetching fresh Horizon API data');
    const response = await fetchAndCache(request, cache);
    return response;
    
  } catch (error) {
    console.error('Service Worker: Horizon API request failed:', error);
    
    // Return cached response as fallback if available
    const cache = await caches.open(CACHE_NAME);
    const fallbackResponse = await cache.match(request);
    
    if (fallbackResponse) {
      console.log('Service Worker: Returning stale cache as fallback');
      return fallbackResponse;
    }
    
    // Return network error
    return new Response('Network error', { 
      status: 503, 
      statusText: 'Service Unavailable' 
    });
  }
}

/**
 * Handle static asset requests with cache-first strategy
 */
async function handleStaticAssetRequest(request) {
  try {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      console.log('Service Worker: Serving cached static asset');
      return cachedResponse;
    }

    // Fetch and cache
    console.log('Service Worker: Fetching and caching static asset');
    const response = await fetch(request);
    
    if (response.ok) {
      // Clone response for caching
      const responseCache = response.clone();
      
      // Add cache headers
      const headers = new Headers(responseCache.headers);
      headers.set('sw-cached-date', Date.now().toString());
      
      const cachedResponse = new Response(responseCache.body, {
        status: responseCache.status,
        statusText: responseCache.statusText,
        headers: headers
      });
      
      cache.put(request, cachedResponse);
    }
    
    return response;
    
  } catch (error) {
    console.error('Service Worker: Static asset request failed:', error);
    return new Response('Asset not found', { 
      status: 404, 
      statusText: 'Not Found' 
    });
  }
}

/**
 * Fetch data and cache it
 */
async function fetchAndCache(request, cache) {
  const response = await fetch(request);
  
  if (response.ok) {
    // Clone response for caching
    const responseCache = response.clone();
    
    // Add cache timestamp
    const headers = new Headers(responseCache.headers);
    headers.set('sw-cached-date', Date.now().toString());
    
    const cachedResponse = new Response(responseCache.body, {
      status: responseCache.status,
      statusText: responseCache.statusText,
      headers: headers
    });
    
    // Cache the response
    await cache.put(request, cachedResponse);
  }
  
  return response;
}

// Background sync for offline data synchronization
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered:', event.tag);
  
  if (event.tag === BACKGROUND_SYNC_TAG) {
    event.waitUntil(handleBackgroundSync());
  }
});

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push message received');
  
  const options = {
    body: event.data ? event.data.text() : 'New Riskon update available',
    icon: '/icon-192.png',
    badge: '/icon-32.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Explore Riskon',
        icon: '/icon-16.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icon-16.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Riskon', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification click received');
  
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Message handling for cache management and PWA features
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'CLEAR_API_CACHE':
      clearHorizonAPICache();
      break;
      
    case 'CLEAR_ALL_CACHE':
      clearAllCaches();
      break;
      
    case 'GET_CACHE_STATUS':
      getCacheStatus().then(status => {
        event.ports[0].postMessage(status);
      });
      break;
      
    case 'REGISTER_BACKGROUND_SYNC':
      registerBackgroundSync();
      break;
      
    case 'SUBSCRIBE_PUSH_NOTIFICATIONS':
      subscribeToPushNotifications(payload);
      break;
      
    default:
      console.log('Service Worker: Unknown message type:', type);
  }
});

/**
 * Clear Horizon API cache entries
 */
async function clearHorizonAPICache() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const requests = await cache.keys();
    
    const horizonRequests = requests.filter(request => 
      isHorizonAPICall(request.url)
    );
    
    await Promise.all(
      horizonRequests.map(request => cache.delete(request))
    );
    
    console.log(`Service Worker: Cleared ${horizonRequests.length} Horizon API cache entries`);
  } catch (error) {
    console.error('Service Worker: Failed to clear API cache:', error);
  }
}

/**
 * Clear all caches
 */
async function clearAllCaches() {
  try {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map(cacheName => caches.delete(cacheName))
    );
    console.log('Service Worker: All caches cleared');
  } catch (error) {
    console.error('Service Worker: Failed to clear all caches:', error);
  }
}

/**
 * Handle background sync for offline data
 */
async function handleBackgroundSync() {
  console.log('Service Worker: Processing background sync');
  
  try {
    // Sync any pending risk analysis data
    await syncPendingRiskData();
    
    // Update cached market data
    await updateMarketDataCache();
    
    // Clear expired cache entries
    await clearExpiredCacheEntries();
    
    console.log('Service Worker: Background sync completed successfully');
    return true;
  } catch (error) {
    console.error('Service Worker: Background sync failed:', error);
    return false;
  }
}

/**
 * Register background sync
 */
async function registerBackgroundSync() {
  try {
    const registration = await self.registration.sync.register(BACKGROUND_SYNC_TAG);
    console.log('Service Worker: Background sync registered');
    return registration;
  } catch (error) {
    console.error('Service Worker: Failed to register background sync:', error);
    return null;
  }
}

/**
 * Subscribe to push notifications
 */
async function subscribeToPushNotifications(options = {}) {
  try {
    const subscription = await self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: options.vapidPublicKey,
    });
    
    console.log('Service Worker: Push notification subscription successful');
    return subscription;
  } catch (error) {
    console.error('Service Worker: Push notification subscription failed:', error);
    return null;
  }
}

/**
 * Sync pending risk data from IndexedDB
 */
async function syncPendingRiskData() {
  // This would integrate with IndexedDB to sync pending data
  // For now, we'll just log the action
  console.log('Service Worker: Syncing pending risk data');
}

/**
 * Update market data cache
 */
async function updateMarketDataCache() {
  // This would fetch fresh market data and update cache
  console.log('Service Worker: Updating market data cache');
}

/**
 * Clear expired cache entries
 */
async function clearExpiredCacheEntries() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const requests = await cache.keys();
    
    const expiredRequests = requests.filter(request => {
      const cachedResponse = cache.match(request);
      // Implementation would check TTL and remove expired entries
      return false; // Placeholder
    });
    
    await Promise.all(
      expiredRequests.map(request => cache.delete(request))
    );
    
    console.log(`Service Worker: Cleared ${expiredRequests.length} expired cache entries`);
  } catch (error) {
    console.error('Service Worker: Failed to clear expired cache entries:', error);
  }
}