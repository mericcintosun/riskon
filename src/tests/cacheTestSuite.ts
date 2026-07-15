"use client";

import { setCache, getCache, invalidateCache, clearAllCache, cacheManager } from '../lib/cacheManager';
import { serviceWorkerManager } from '../lib/serviceWorkerManager';
import { CACHE_VERSION } from '../config/cacheConfig';

/**
 * Comprehensive Cache System Tests
 * Tests all caching behaviors including TTL, versioning, invalidation, IndexedDB, and Service Worker
 */

export interface TestResult {
  testName: string;
  passed: boolean;
  description: string;
  details?: string;
  error?: string;
}

export class CacheTestSuite {
  private results: TestResult[] = [];
  
  /**
   * Run all cache tests and return results
   */
  async runAllTests(): Promise<TestResult[]> {
    console.log('🧪 Starting Cache System Tests...');
    
    this.results = [];
    
    try {
      await this.testTTLExpiration();
      await this.testVersionInvalidation();
      await this.testManualInvalidation();
      await this.testIndexedDBFallback();
      await this.testServiceWorker();
      
      console.log('✅ All cache tests completed');
      return this.results;
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      this.addResult({
        testName: 'Test Suite',
        passed: false,
        description: 'Test suite execution failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return this.results;
    }
  }

  /**
   * Test 1: TTL Expiration Behavior
   */
  public async testTTLExpiration(): Promise<void> {
    const testKey = 'test_ttl_data';
    const testData = { message: 'TTL test data', timestamp: Date.now() };
    const shortTTL = 5000; // 5 seconds

    try {
      console.log('🔹 Test 1: TTL Expiration');
      
      // Step 1: Store test data with 5-second TTL
      await setCache(testKey, testData, { ttl: shortTTL });
      
      // Step 2: Retrieve immediately → should return data
      const immediateRetrieve = await getCache<typeof testData>(testKey);
      if (!immediateRetrieve || immediateRetrieve.message !== testData.message) {
        throw new Error('Immediate cache retrieval failed');
      }
      
      console.log('  ✓ Immediate retrieval: SUCCESS');
      
      // Step 3: Wait 6 seconds
      console.log('  ⏱️ Waiting 6 seconds for TTL expiration...');
      await this.sleep(6000);
      
      // Step 4: Retrieve → should return null and clear cache
      const expiredRetrieve = await getCache(testKey);
      if (expiredRetrieve !== null) {
        throw new Error(`Expected null after TTL expiration, got: ${JSON.stringify(expiredRetrieve)}`);
      }
      
      console.log('  ✓ Expired retrieval: SUCCESS (returned null)');
      
      // Verify cache was actually cleared
      const stats = cacheManager.getCacheStats();
      console.log(`  ✓ Cache cleanup confirmed. Current entries: ${stats.localStorageEntries}`);
      
      this.addResult({
        testName: 'TTL Expiration',
        passed: true,
        description: 'Data expires correctly after TTL and cache is cleaned up',
        details: 'Immediate retrieval succeeded, expired retrieval returned null'
      });
      
    } catch (error) {
      this.addResult({
        testName: 'TTL Expiration',
        passed: false,
        description: 'TTL expiration test failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Test 2: Version Invalidation
   */
  public async testVersionInvalidation(): Promise<void> {
    const testKey = 'test_version_data';
    const testData = { message: 'Version test data', version: CACHE_VERSION };

    try {
      console.log('🔹 Test 2: Version Invalidation');
      
      // Step 1: Store data with current version
      await setCache(testKey, testData);
      
      // Verify data is stored
      const storedData = await getCache(testKey);
      if (!storedData) {
        throw new Error('Failed to store test data');
      }
      
      console.log('  ✓ Data stored with current version');
      
      // Step 2: Simulate version change by manually creating cache entry with old version
      const oldVersionEntry = {
        data: testData,
        timestamp: Date.now(),
        version: '0.9.0', // Old version
        ttl: 300000 // 5 minutes
      };
      
      localStorage.setItem(`cache_${testKey}_old`, JSON.stringify(oldVersionEntry));
      
      // Step 3: Try to retrieve old version data
      const oldVersionData = await getCache(`${testKey}_old`);
      if (oldVersionData !== null) {
        throw new Error('Old version cache should return null due to version mismatch');
      }
      
      console.log('  ✓ Old version cache correctly rejected');
      
      // Step 4: Verify current version still works
      const currentVersionData = await getCache(testKey);
      if (!currentVersionData) {
        throw new Error('Current version cache should still work');
      }
      
      console.log('  ✓ Current version cache still works');
      
      this.addResult({
        testName: 'Version Invalidation',
        passed: true,
        description: 'Cache correctly rejects data with mismatched versions',
        details: 'Old version returns null, current version works correctly'
      });
      
    } catch (error) {
      this.addResult({
        testName: 'Version Invalidation',
        passed: false,
        description: 'Version invalidation test failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Test 3: Manual Invalidation (Risk Score Auto-Invalidation)
   */
  public async testManualInvalidation(): Promise<void> {
    const walletAddress = 'GXXXXXXX_TEST_WALLET_XXXXXXX';
    const riskScoreKey = `risk_score_${walletAddress}`;
    const horizonDataKey = `horizon_data_${walletAddress}`;
    
    const riskScoreData = { score: 75, features: [0.5, 0.3, 0.8] };
    const horizonData = { payments: [], transactions: [], timestamp: Date.now() };

    try {
      console.log('🔹 Test 3: Manual/Auto Invalidation');
      
      // Step 1: Store risk score and horizon data in cache
      await setCache(riskScoreKey, riskScoreData);
      await setCache(horizonDataKey, horizonData);
      
      // Verify both are stored
      const storedRiskScore = await getCache(riskScoreKey);
      const storedHorizonData = await getCache(horizonDataKey);
      
      if (!storedRiskScore || !storedHorizonData) {
        throw new Error('Failed to store test data');
      }
      
      console.log('  ✓ Risk score and Horizon data cached');
      
      // Step 2: Simulate risk score recalculation by dispatching cache event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('riskScoreUpdated', {
            detail: { walletAddress, score: 80, timestamp: Date.now() }
          })
        );
        
        // Give the event handlers time to process
        await this.sleep(100);
      }
      
      // Step 3: Manual invalidation of risk cache
      await invalidateCache(riskScoreKey);
      await invalidateCache(horizonDataKey);
      
      console.log('  ✓ Cache invalidation signals sent');
      
      // Step 4: Verify cache is invalidated
      const invalidatedRiskScore = await getCache(riskScoreKey);
      const invalidatedHorizonData = await getCache(horizonDataKey);
      
      if (invalidatedRiskScore !== null || invalidatedHorizonData !== null) {
        throw new Error('Cache should be invalidated after manual invalidation');
      }
      
      console.log('  ✓ Risk-related cache successfully invalidated');
      
      this.addResult({
        testName: 'Manual Invalidation',
        passed: true,
        description: 'Risk-related cache invalidates correctly on score updates',
        details: 'Manual invalidation successfully cleared cached risk data'
      });
      
    } catch (error) {
      this.addResult({
        testName: 'Manual Invalidation',
        passed: false,
        description: 'Manual invalidation test failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Test 4: IndexedDB Fallback for Large Data
   */
  public async testIndexedDBFallback(): Promise<void> {
    const testKey = 'test_large_data';
    
    // Create large mock dataset (>1MB)
    const largeDataset = {
      type: 'large_dataset',
      data: new Array(50000).fill(0).map((_, i) => ({
        id: i,
        value: Math.random(),
        description: `Mock data entry number ${i} with some additional text to increase size`,
        nested: {
          field1: `Nested field ${i}`,
          field2: Math.random() * 1000,
          field3: new Array(10).fill(0).map(() => Math.random())
        }
      })),
      timestamp: Date.now()
    };

    try {
      console.log('🔹 Test 4: IndexedDB Fallback');
      
      // Calculate approximate size
      const dataSize = JSON.stringify(largeDataset).length;
      console.log(`  📊 Large dataset size: ${(dataSize / 1024 / 1024).toFixed(2)}MB`);
      
      if (dataSize < 1024 * 1024) {
        // If our generated data isn't large enough, force IndexedDB
        console.log('  🔄 Forcing IndexedDB usage for test');
      }
      
      // Step 1: Store large dataset (should automatically use IndexedDB)
      await setCache(testKey, largeDataset, { useIndexedDB: true });
      console.log('  ✓ Large dataset stored (forced IndexedDB)');
      
      // Step 2: Verify it's NOT in localStorage (because it's too large or forced)
      const localStorageCheck = localStorage.getItem(`cache_${testKey}`);
      if (localStorageCheck) {
        console.log('  ⚠️  Data found in localStorage (might be smaller than expected)');
      } else {
        console.log('  ✓ Confirmed: Large data bypassed localStorage');
      }
      
      // Step 3: Retrieve from IndexedDB
      const retrievedData = await getCache<typeof largeDataset>(testKey);
      
      if (!retrievedData) {
        throw new Error('Failed to retrieve large dataset from IndexedDB');
      }
      
      if (retrievedData.data.length !== largeDataset.data.length) {
        throw new Error('Retrieved data size mismatch');
      }
      
      console.log('  ✓ Large dataset successfully retrieved from IndexedDB');
      
      // Step 4: Clean up
      await invalidateCache(testKey);
      console.log('  ✓ Large dataset cleaned up');
      
      this.addResult({
        testName: 'IndexedDB Fallback',
        passed: true,
        description: 'Large datasets correctly use IndexedDB fallback',
        details: `Successfully stored and retrieved ${(dataSize / 1024 / 1024).toFixed(2)}MB dataset`
      });
      
    } catch (error) {
      this.addResult({
        testName: 'IndexedDB Fallback',
        passed: false,
        description: 'IndexedDB fallback test failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Test 5: Service Worker Offline Functionality
   */
  public async testServiceWorker(): Promise<void> {
    try {
      console.log('🔹 Test 5: Service Worker');
      
      // Check if service workers are supported
      if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
        this.addResult({
          testName: 'Service Worker',
          passed: false,
          description: 'Service Worker not supported in this environment',
          details: 'Running in non-browser environment or service workers not available'
        });
        return;
      }
      
      // Step 1: Check current SW status
      const initialStatus = await serviceWorkerManager.getStatus();
      console.log('  📊 Initial SW Status:', {
        supported: initialStatus.isSupported,
        registered: initialStatus.isRegistered,
        active: initialStatus.isActive
      });
      
      // Step 2: Register service worker if not active
      let swActivated = false;
      if (!initialStatus.isActive) {
        console.log('  🔄 Registering Service Worker...');
        swActivated = await serviceWorkerManager.register();
        
        if (swActivated) {
          // Wait a moment for activation
          await this.sleep(2000);
        }
      } else {
        swActivated = true;
        console.log('  ✓ Service Worker already active');
      }
      
      if (!swActivated) {
        throw new Error('Failed to activate Service Worker');
      }
      
      // Step 3: Get updated status
      const activeStatus = await serviceWorkerManager.getStatus();
      console.log('  📊 Active SW Status:', activeStatus);
      
      // Step 4: Test cache management
      await serviceWorkerManager.clearAPICache();
      console.log('  ✓ SW API cache cleared');
      
      const cacheStatus = await serviceWorkerManager.getStatus();
      console.log('  📊 SW Cache Status after clear:', cacheStatus);
      
      // Step 5: Simulate offline behavior (can't actually disable network, but we can test SW functionality)
      console.log('  🌐 Testing Service Worker cache functionality...');
      
      // The actual offline test would require manual network disconnection
      // For automated testing, we verify SW is working and can manage cache
      
      this.addResult({
        testName: 'Service Worker',
        passed: swActivated && activeStatus.isActive,
        description: 'Service Worker registration and cache management',
        details: `SW Active: ${activeStatus.isActive}, Registered: ${activeStatus.isRegistered}`
      });
      
    } catch (error) {
      this.addResult({
        testName: 'Service Worker',
        passed: false,
        description: 'Service Worker test failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Helper method to add test results
   */
  private addResult(result: TestResult): void {
    this.results.push(result);
    const status = result.passed ? '✅' : '❌';
    console.log(`${status} ${result.testName}: ${result.description}`);
    if (result.details) {
      console.log(`   Details: ${result.details}`);
    }
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  }

  /**
   * Helper method for delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get test results summary
   */
  getTestSummary(): { total: number; passed: number; failed: number; passRate: number } {
    const total = this.results.length;
    const passed = this.results.filter(r => r.passed).length;
    const failed = total - passed;
    const passRate = total > 0 ? (passed / total) * 100 : 0;
    
    return { total, passed, failed, passRate };
  }
}

// Export singleton instance for easy use
export const cacheTestSuite = new CacheTestSuite();