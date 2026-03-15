"use client";

import React, { useState } from 'react';
import { cacheTestSuite, TestResult } from '../tests/cacheTestSuite';
import { cacheManager } from '../lib/cacheManager';

/**
 * Cache Test Dashboard Component
 * Provides UI for running and viewing cache system tests
 */
export const CacheTestDashboard: React.FC = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<string>('');
  const [showDetails, setShowDetails] = useState<string>('');

  const runAllTests = async () => {
    setIsRunning(true);
    setCurrentTest('Initializing tests...');
    setTestResults([]);

    try {
      const results = await cacheTestSuite.runAllTests();
      setTestResults(results);
      setCurrentTest('');
    } catch (error) {
      console.error('Test execution failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const runIndividualTest = async (testName: string) => {
    setIsRunning(true);
    setCurrentTest(`Running ${testName}...`);

    try {
      // Clear previous results for cleaner display
      setTestResults([]);

      switch (testName) {
        case 'TTL Expiration':
          await cacheTestSuite.testTTLExpiration();
          break;
        case 'Version Invalidation':
          await cacheTestSuite.testVersionInvalidation();
          break;
        case 'Manual Invalidation':
          await cacheTestSuite.testManualInvalidation();
          break;
        case 'IndexedDB Fallback':
          await cacheTestSuite.testIndexedDBFallback();
          break;
        case 'Service Worker':
          await cacheTestSuite.testServiceWorker();
          break;
      }

      // For individual tests, we need to get the results differently
      // Since the test suite tracks results internally, run all tests to get updated results
      const results = await cacheTestSuite.runAllTests();
      // Filter to show only the test we ran (or show all for context)
      setTestResults(results);
      setCurrentTest('');
    } catch (error) {
      console.error(`${testName} test failed:`, error);
      setTestResults([{
        testName,
        passed: false,
        description: 'Test execution failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      }]);
    } finally {
      setIsRunning(false);
    }
  };

  const clearAllCaches = async () => {
    setIsRunning(true);
    setCurrentTest('Clearing all caches...');
    
    try {
      await cacheManager.clearAllCache();
      localStorage.clear(); // Clear any remaining data
      console.log('All caches cleared');
      setCurrentTest('');
    } catch (error) {
      console.error('Failed to clear caches:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (result: TestResult) => {
    return result.passed ? '✅' : '❌';
  };

  const getStatusColor = (result: TestResult) => {
    return result.passed ? 'text-green-600' : 'text-red-600';
  };

  const summary = testResults.length > 0 ? cacheTestSuite.getTestSummary() : null;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        🧪 Cache System Test Dashboard
      </h2>

      {/* Test Controls */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold text-gray-800 mb-3">Test Controls</h3>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={runAllTests}
            disabled={isRunning}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRunning ? 'Running Tests...' : 'Run All Tests'}
          </button>
          
          <button
            onClick={clearAllCaches}
            disabled={isRunning}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
          >
            Clear All Caches
          </button>
        </div>

        {currentTest && (
          <div className="mt-3 text-sm text-blue-600 flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            {currentTest}
          </div>
        )}
      </div>

      {/* Test Summary */}
      {summary && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-2">Test Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Total Tests:</span>
              <span className="ml-2 font-bold">{summary.total}</span>
            </div>
            <div>
              <span className="text-green-600">Passed:</span>
              <span className="ml-2 font-bold text-green-700">{summary.passed}</span>
            </div>
            <div>
              <span className="text-red-600">Failed:</span>
              <span className="ml-2 font-bold text-red-700">{summary.failed}</span>
            </div>
            <div>
              <span className="text-gray-600">Pass Rate:</span>
              <span className={`ml-2 font-bold ${summary.passRate >= 80 ? 'text-green-700' : 'text-red-700'}`}>
                {summary.passRate.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Individual Test Controls */}
      <div className="mb-6">
        <h3 className="font-semibold text-gray-800 mb-3">Individual Tests</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            'TTL Expiration',
            'Version Invalidation', 
            'Manual Invalidation',
            'IndexedDB Fallback',
            'Service Worker'
          ].map(testName => (
            <button
              key={testName}
              onClick={() => runIndividualTest(testName)}
              disabled={isRunning}
              className="p-3 text-left border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="font-medium text-sm text-gray-800">{testName}</div>
              <div className="text-xs text-gray-500 mt-1">
                {testName === 'TTL Expiration' && 'Tests 5-second TTL expiration'}
                {testName === 'Version Invalidation' && 'Tests cache version mismatch handling'}
                {testName === 'Manual Invalidation' && 'Tests auto-invalidation on updates'}
                {testName === 'IndexedDB Fallback' && 'Tests large data storage'}
                {testName === 'Service Worker' && 'Tests offline functionality'}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Test Results */}
      {testResults.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-800">Test Results</h3>
          
          {testResults.map((result, index) => (
            <div
              key={index}
              className={`p-4 border rounded-lg ${result.passed ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getStatusIcon(result)}</span>
                  <div>
                    <h4 className="font-semibold text-gray-800">{result.testName}</h4>
                    <p className={`text-sm ${getStatusColor(result)}`}>{result.description}</p>
                  </div>
                </div>
                
                {(result.details || result.error) && (
                  <button
                    onClick={() => setShowDetails(showDetails === result.testName ? '' : result.testName)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {showDetails === result.testName ? 'Hide Details' : 'Show Details'}
                  </button>
                )}
              </div>
              
              {showDetails === result.testName && (result.details || result.error) && (
                <div className="mt-3 p-3 bg-white border border-gray-200 rounded text-sm">
                  {result.details && (
                    <div className="text-gray-700">
                      <strong>Details:</strong> {result.details}
                    </div>
                  )}
                  {result.error && (
                    <div className="text-red-700 mt-2">
                      <strong>Error:</strong> {result.error}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Test Scenarios Documentation */}
      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="font-semibold text-yellow-800 mb-3">🔹 Test Scenarios</h3>
        <div className="text-sm text-gray-700 space-y-2">
          <div><strong>Test 1 – TTL Expiration:</strong> Stores data with 5-second TTL, retrieves immediately (should work), waits 6 seconds, retrieves again (should return null)</div>
          <div><strong>Test 2 – Version Invalidation:</strong> Tests cache rejection when version mismatches</div>
          <div><strong>Test 3 – Manual Invalidation:</strong> Tests automatic cache clearing after risk score updates</div>
          <div><strong>Test 4 – IndexedDB Fallback:</strong> Tests large dataset storage (&gt;1MB) in IndexedDB</div>
          <div><strong>Test 5 – Service Worker:</strong> Tests service worker registration and cache management</div>
        </div>
        
        <div className="mt-3 text-xs text-yellow-700">
          <strong>Note:</strong> For Test 5 (offline functionality), manually disable your internet connection after running the test to verify static assets still load.
        </div>
      </div>

      {/* Cache Statistics */}
      <div className="mt-6 p-4 bg-gray-50 border rounded-lg">
        <h3 className="font-semibold text-gray-800 mb-2">Current Cache Status</h3>
        <div className="text-sm text-gray-600">
          {(() => {
            const stats = cacheManager.getCacheStats();
            return (
              <div className="grid grid-cols-2 gap-4">
                <div>Cache Entries: {stats.localStorageEntries}</div>
                <div>Cache Version: {stats.version}</div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

/**
 * Quick Test Runner Component (smaller, embeddable)
 */
export const QuickCacheTest: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [lastResult, setLastResult] = useState<string>('');

  const runQuickTest = async () => {
    setIsRunning(true);
    
    try {
      // Quick TTL test
      const testKey = 'quick_test';
      const testData = { message: 'Quick test', timestamp: Date.now() };
      
      // Store with 2-second TTL
      await cacheManager.setCache(testKey, testData, { ttl: 2000 });
      
      // Immediate retrieval
      const immediate = await cacheManager.getCache(testKey);
      if (!immediate) {
        setLastResult('❌ Quick test failed: Immediate retrieval failed');
        return;
      }
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Check if expired
      const expired = await cacheManager.getCache(testKey);
      if (expired === null) {
        setLastResult('✅ Quick test passed: TTL expiration works');
      } else {
        setLastResult('❌ Quick test failed: TTL expiration not working');
      }
      
    } catch (error) {
      setLastResult(`❌ Quick test error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-center gap-3 mb-3">
        <h3 className="font-semibold text-blue-800">⚡ Quick Cache Test</h3>
        <button
          onClick={runQuickTest}
          disabled={isRunning}
          className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isRunning ? 'Testing...' : 'Run Test'}
        </button>
      </div>
      
      {lastResult && (
        <div className="text-sm">
          {lastResult}
        </div>
      )}
      
      <div className="text-xs text-blue-600 mt-2">
        Tests basic TTL functionality (2-second expiration)
      </div>
    </div>
  );
};