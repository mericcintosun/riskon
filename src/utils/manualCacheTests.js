/**
 * Manual Cache Testing Scripts
 * Run these commands in browser console for quick cache testing
 */

// Available in browser console after importing cache manager
window.cacheTestUtils = {
  
  /**
   * Quick TTL Test (5 seconds)
   */
  async testTTL() {
    console.log('🔹 Starting TTL Test...');
    
    const { setCache, getCache } = await import('../lib/cacheManager');
    
    const testKey = 'manual_ttl_test';
    const testData = { message: 'TTL test', timestamp: Date.now() };
    
    // Store with 5-second TTL
    await setCache(testKey, testData, { ttl: 5000 });
    console.log('  ✓ Data stored with 5-second TTL');
    
    // Immediate retrieval
    const immediate = await getCache(testKey);
    console.log('  ✓ Immediate retrieval:', immediate ? 'SUCCESS' : 'FAILED');
    
    console.log('  ⏱️ Waiting 6 seconds for expiration...');
    
    setTimeout(async () => {
      const expired = await getCache(testKey);
      console.log('  ✓ After expiration:', expired === null ? 'SUCCESS (null)' : 'FAILED (still cached)');
    }, 6000);
  },

  /**
   * Version Invalidation Test
   */
  async testVersion() {
    console.log('🔹 Starting Version Test...');
    
    const { setCache, getCache } = await import('../lib/cacheManager');
    
    // Create entry with fake old version
    const testKey = 'version_test';
    const oldEntry = {
      data: { message: 'Old version data' },
      timestamp: Date.now(),
      version: '0.5.0', // Old version
      ttl: 300000
    };
    
    // Manually store in localStorage with old version
    localStorage.setItem(`cache_${testKey}`, JSON.stringify(oldEntry));
    console.log('  ✓ Stored data with old version (0.5.0)');
    
    // Try to retrieve - should return null
    const result = await getCache(testKey);
    console.log('  ✓ Retrieval result:', result === null ? 'SUCCESS (rejected old version)' : 'FAILED (accepted old version)');
  },

  /**
   * Large Data Test (IndexedDB Fallback)
   */
  async testLargeData() {
    console.log('🔹 Starting Large Data Test...');
    
    const { setCache, getCache } = await import('../lib/cacheManager');
    
    // Generate large dataset
    const largeData = {
      type: 'large_test',
      data: new Array(10000).fill(0).map((_, i) => ({
        id: i,
        value: Math.random(),
        text: `Large data entry ${i} with additional content to increase size`
      }))
    };
    
    const dataSize = JSON.stringify(largeData).length;
    console.log(`  📊 Generated ${(dataSize / 1024).toFixed(1)}KB of test data`);
    
    // Force IndexedDB storage
    await setCache('large_data_test', largeData, { useIndexedDB: true });
    console.log('  ✓ Stored in IndexedDB');
    
    // Retrieve
    const retrieved = await getCache('large_data_test');
    console.log('  ✓ Retrieval:', retrieved && retrieved.data.length === largeData.data.length ? 'SUCCESS' : 'FAILED');
    
    // Cleanup
    const { invalidateCache } = await import('../lib/cacheManager');
    await invalidateCache('large_data_test');
    console.log('  ✓ Cleaned up test data');
  },

  /**
   * Service Worker Test
   */
  async testServiceWorker() {
    console.log('🔹 Starting Service Worker Test...');
    
    if (!('serviceWorker' in navigator)) {
      console.log('  ❌ Service Worker not supported');
      return;
    }
    
    const { serviceWorkerManager } = await import('../lib/serviceWorkerManager');
    
    // Get current status
    const status = await serviceWorkerManager.getStatus();
    console.log('  📊 SW Status:', status);
    
    // Register if not active
    if (!status.isActive) {
      console.log('  🔄 Registering Service Worker...');
      const registered = await serviceWorkerManager.register();
      console.log('  ✓ Registration:', registered ? 'SUCCESS' : 'FAILED');
    }
    
    console.log('  ℹ️ To test offline: Open DevTools → Network → Check "Offline" → Reload page');
  },

  /**
   * Cache Invalidation Test
   */
  async testInvalidation() {
    console.log('🔹 Starting Cache Invalidation Test...');
    
    const { setCache, getCache, invalidateCache } = await import('../lib/cacheManager');
    const { dispatchCacheEvent } = await import('../hooks/useCacheInvalidation');
    
    const walletAddress = 'GTEST123WALLET456';
    const riskScoreKey = `risk_score_${walletAddress}`;
    
    // Store risk score
    await setCache(riskScoreKey, { score: 75, timestamp: Date.now() });
    console.log('  ✓ Risk score cached');
    
    // Verify it's there
    const cached = await getCache(riskScoreKey);
    console.log('  ✓ Cache retrieval:', cached ? 'SUCCESS' : 'FAILED');
    
    // Dispatch invalidation event
    dispatchCacheEvent.riskScoreUpdated(walletAddress, 80);
    console.log('  ✓ Invalidation event dispatched');
    
    // Manual invalidation
    await invalidateCache(riskScoreKey);
    console.log('  ✓ Manual invalidation executed');
    
    // Check if cleared
    const afterInvalidation = await getCache(riskScoreKey);
    console.log('  ✓ After invalidation:', afterInvalidation === null ? 'SUCCESS (cleared)' : 'FAILED (still cached)');
  },

  /**
   * Performance Test
   */
  async testPerformance() {
    console.log('🔹 Starting Performance Test...');
    
    const { setCache, getCache } = await import('../lib/cacheManager');
    
    const testData = { 
      message: 'Performance test data',
      data: new Array(1000).fill(0).map((_, i) => ({ id: i, value: Math.random() }))
    };
    
    // Test cache write performance
    const writeStart = performance.now();
    await setCache('perf_test', testData);
    const writeTime = performance.now() - writeStart;
    console.log(`  ⚡ Cache write: ${writeTime.toFixed(2)}ms`);
    
    // Test cache read performance (should be very fast)
    const readStart = performance.now();
    const readData = await getCache('perf_test');
    const readTime = performance.now() - readStart;
    console.log(`  ⚡ Cache read: ${readTime.toFixed(2)}ms`);
    
    // Compare with localStorage direct access
    const directStart = performance.now();
    const directData = JSON.parse(localStorage.getItem('cache_perf_test') || '{}');
    const directTime = performance.now() - directStart;
    console.log(`  ⚡ Direct localStorage: ${directTime.toFixed(2)}ms`);
    
    console.log('  ✓ Performance test completed');
  },

  /**
   * Run all manual tests
   */
  async runAll() {
    console.log('🚀 Running All Manual Cache Tests...\n');
    
    await this.testTTL();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await this.testVersion();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await this.testInvalidation();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await this.testLargeData();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await this.testServiceWorker();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await this.testPerformance();
    
    console.log('\n✅ All manual tests completed!');
  },

  /**
   * Clear all test data
   */
  async cleanup() {
    console.log('🧹 Cleaning up test data...');
    
    const { clearAllCache } = await import('../lib/cacheManager');
    await clearAllCache();
    
    // Clear any manual test entries
    ['manual_ttl_test', 'version_test', 'large_data_test', 'perf_test'].forEach(key => {
      localStorage.removeItem(`cache_${key}`);
    });
    
    console.log('✅ Cleanup completed');
  },

  /**
   * Get cache statistics
   */
  async getStats() {
    const { cacheManager } = await import('../lib/cacheManager');
    const stats = cacheManager.getCacheStats();
    console.log('📊 Cache Statistics:', stats);
    return stats;
  }
};

// Instructions for console usage
console.log(`
🧪 Riskon Cache Test Utils Loaded!

Available commands:
  cacheTestUtils.testTTL()           // Test TTL expiration (5 seconds)
  cacheTestUtils.testVersion()       // Test version invalidation  
  cacheTestUtils.testInvalidation()  // Test manual invalidation
  cacheTestUtils.testLargeData()     // Test IndexedDB fallback
  cacheTestUtils.testServiceWorker() // Test service worker
  cacheTestUtils.testPerformance()   // Test cache performance
  
  cacheTestUtils.runAll()            // Run all tests
  cacheTestUtils.cleanup()           // Clear test data
  cacheTestUtils.getStats()          // Get cache statistics

Example usage:
  await cacheTestUtils.testTTL()
  await cacheTestUtils.runAll()
`);

export default window.cacheTestUtils;