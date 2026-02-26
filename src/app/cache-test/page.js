"use client";

import React, { useEffect } from 'react';
import { CacheTestDashboard, QuickCacheTest } from '../../components/CacheTestDashboard';
import { CacheManagementDashboard } from '../../components/CacheManagementDashboard';
import { CacheTestingRiskAnalyzer, CachePerformanceMonitor } from '../../components/CacheTestingRiskAnalyzer';

/**
 * Cache Testing Page
 * Comprehensive testing interface for the cache system
 */
export default function CacheTestPage() {
  
  // Load test utilities for console access
  useEffect(() => {
    const loadTestUtils = async () => {
      try {
        await import('../../utils/manualCacheTests.js');
        console.log('🧪 Manual cache test utilities loaded! Use cacheTestUtils.* in console.');
      } catch (error) {
        console.warn('Failed to load manual test utilities:', error);
      }
    };
    
    loadTestUtils();
  }, []);
  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto px-4 space-y-8">
        
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            🚀 Riskon Cache System Tests
          </h1>
          <p className="text-gray-600">
            Comprehensive testing suite for validating cache behavior
          </p>
          <div className="text-sm text-gray-500 mt-2">
            Access this page at: <code className="bg-gray-200 px-1 rounded">/cache-test</code>
          </div>
        </div>

        {/* Quick Test */}
        <QuickCacheTest />

        {/* Real-world Cache Testing */}
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">🎯 Real-world Cache Testing</h2>
          <CacheTestingRiskAnalyzer />
        </div>

        {/* Performance Monitor */}
        <CachePerformanceMonitor />

        {/* Full Test Dashboard */}
        <CacheTestDashboard />

        {/* Cache Management */}
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Cache Management</h2>
          <CacheManagementDashboard />
        </div>

        {/* Test Instructions */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            📋 Manual Testing Instructions
          </h2>
          
          <div className="space-y-4 text-sm">
            <div className="p-4 border-l-4 border-blue-500 bg-blue-50">
              <h3 className="font-semibold text-blue-800">🔹 Test 1: TTL Expiration</h3>
              <ol className="list-decimal list-inside mt-2 space-y-1 text-blue-700">
                <li>Click "Run All Tests" or individual "TTL Expiration" test</li>
                <li>Watch console logs for real-time progress</li>
                <li>Test stores data with 5-second TTL and waits for expiration</li>
                <li>Should see: Immediate retrieval ✓ → Wait 6 seconds → Expired retrieval ✓</li>
              </ol>
            </div>

            <div className="p-4 border-l-4 border-green-500 bg-green-50">
              <h3 className="font-semibold text-green-800">🔹 Test 2: Version Invalidation</h3>
              <ol className="list-decimal list-inside mt-2 space-y-1 text-green-700">
                <li>Test creates cache entry with old version "0.9.0"</li>
                <li>Current cache system uses version "1.0.0"</li>
                <li>Old version data should return null (rejected)</li>
                <li>Current version data should work normally</li>
              </ol>
              <div className="mt-2 text-xs text-green-600">
                <strong>Manual Test:</strong> You can also manually change <code>CACHE_VERSION</code> in <code>cacheConfig.ts</code> and reload the app
              </div>
            </div>

            <div className="p-4 border-l-4 border-yellow-500 bg-yellow-50">
              <h3 className="font-semibold text-yellow-800">🔹 Test 3: Manual Invalidation</h3>
              <ol className="list-decimal list-inside mt-2 space-y-1 text-yellow-700">
                <li>Test stores risk score and horizon data</li>
                <li>Dispatches cache invalidation event</li>
                <li>Manually invalidates caches</li>
                <li>Verifies cache returns null after invalidation</li>
              </ol>
              <div className="mt-2 text-xs text-yellow-600">
                <strong>Manual Test:</strong> Use any risk calculation feature in the app, then check if cache is automatically invalidated
              </div>
            </div>

            <div className="p-4 border-l-4 border-purple-500 bg-purple-50">
              <h3 className="font-semibold text-purple-800">🔹 Test 4: IndexedDB Fallback</h3>
              <ol className="list-decimal list-inside mt-2 space-y-1 text-purple-700">
                <li>Test generates large dataset (~5MB) with 50,000 entries</li>
                <li>Forces storage in IndexedDB (bypassing localStorage)</li>
                <li>Retrieves and validates data integrity</li>
                <li>Should see data size in MB and successful retrieval</li>
              </ol>
              <div className="mt-2 text-xs text-purple-600">
                <strong>Check:</strong> Open DevTools → Application → IndexedDB → riskonCache
              </div>
            </div>

            <div className="p-4 border-l-4 border-red-500 bg-red-50">
              <h3 className="font-semibold text-red-800">🔹 Test 5: Service Worker (Manual Steps)</h3>
              <ol className="list-decimal list-inside mt-2 space-y-1 text-red-700">
                <li>Run the Service Worker test (registers SW)</li>
                <li>Open DevTools → Network tab</li>
                <li>Disable network connection (or check "Offline" in DevTools)</li>
                <li>Reload the page</li>
                <li>Static assets should still load from SW cache</li>
              </ol>
              <div className="mt-2 text-xs text-red-600">
                <strong>Check:</strong> DevTools → Application → Service Workers → riskon-cache-v1
              </div>
            </div>
          </div>
        </div>

        {/* Additional Debug Info */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-800 mb-2">🔧 Debug Information</h3>
          <div className="text-sm text-gray-600 space-y-1">
            <div><strong>Cache Config:</strong> Check <code>src/config/cacheConfig.ts</code> for TTL and version settings</div>
            <div><strong>Cache Manager:</strong> Core logic in <code>src/lib/cacheManager.ts</code></div>
            <div><strong>Service Worker:</strong> Located at <code>public/sw.js</code></div>
            <div><strong>Test Suite:</strong> Full test implementation in <code>src/tests/cacheTestSuite.ts</code></div>
          </div>
          
          <div className="mt-3 p-2 bg-blue-100 rounded text-sm">
            <div className="font-semibold text-blue-800 mb-1">🧪 Console Testing Available:</div>
            <div className="font-mono text-blue-700 space-y-1">
              <div>await cacheTestUtils.testTTL()</div>
              <div>await cacheTestUtils.testLargeData()</div> 
              <div>await cacheTestUtils.runAll()</div>
              <div>cacheTestUtils.getStats()</div>
            </div>
          </div>
        </div>

        {/* Performance Expectations */}
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <h3 className="font-semibold text-blue-800 mb-2">⚡ Expected Performance Improvements</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
            <div>
              <h4 className="font-semibold">Before Caching:</h4>
              <ul className="list-disc list-inside space-y-1 mt-1">
                <li>Horizon API call: 2-3 seconds</li>
                <li>Risk calculation: 2-3 seconds (fresh data)</li>
                <li>App reload: 3-5 seconds</li>
                <li>User switching: 2-4 seconds</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold">After Caching:</h4>
              <ul className="list-disc list-inside space-y-1 mt-1">
                <li>Cached Horizon data: ~50ms</li>
                <li>Cached risk score: ~10ms</li>
                <li>App reload: ~500ms</li>
                <li>User switching: ~100ms</li>
              </ul>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}