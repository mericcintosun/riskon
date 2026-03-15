/**
 * Developer Tools for Testing IndexedDB Risk Data System
 * This component provides a comprehensive interface to test all IndexedDB functionality
 */

"use client";

import React, { useState, useEffect } from 'react';
import { 
  testIndexedDB, 
  exportRiskData, 
  importRiskData, 
  migrateFromLocalStorage,
  checkMigrationNeeded
} from '../lib/storage/db.js';
import {
  getUserRiskData,
  saveUserRiskData,
  deleteUserRiskData,
  updateUserChosenTier,
  initializeRiskDataSystem,
  clearRiskDataCache,
  getCacheSize
} from '../lib/riskDataManager';

const RiskDataDevTools = () => {
  const [testResults, setTestResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [testAddress, setTestAddress] = useState('GB7TAYRUZGE6TVT7NHP5SMIZRNQA6PLM423EYISAOAP3MKYIQMVYP2JO');
  const [testScore, setTestScore] = useState(75);
  const [testTier, setTestTier] = useState('TIER_2');
  const [retrievedData, setRetrievedData] = useState(null);
  const [cacheInfo, setCacheInfo] = useState({ size: 0 });

  // Add test result
  const addResult = (test, success, message, data = null) => {
    const result = {
      timestamp: new Date().toLocaleTimeString(),
      test,
      success,
      message,
      data
    };
    
    setTestResults(prev => [result, ...prev.slice(0, 19)]); // Keep last 20 results
  };

  // Update cache info
  const updateCacheInfo = () => {
    setCacheInfo({ size: getCacheSize() });
  };

  useEffect(() => {
    updateCacheInfo();
    const interval = setInterval(updateCacheInfo, 1000);
    return () => clearInterval(interval);
  }, []);

  // Test 1: Basic IndexedDB functionality
  const testBasicFunctionality = async () => {
    setIsLoading(true);
    try {
      const result = await testIndexedDB();
      addResult('Basic IndexedDB Test', result.success, result.message);
      
      if (result.success) {
        addResult('Browser Support', true, 'IndexedDB is fully supported');
      }
    } catch (error) {
      addResult('Basic IndexedDB Test', false, `Error: ${error.message}`);
    }
    setIsLoading(false);
  };

  // Test 2: Initialize system
  const testSystemInitialization = async () => {
    setIsLoading(true);
    try {
      const result = await initializeRiskDataSystem();
      addResult('System Initialization', result.success, result.message);
    } catch (error) {
      addResult('System Initialization', false, `Error: ${error.message}`);
    }
    setIsLoading(false);
  };

  // Test 3: Save risk data
  const testSaveRiskData = async () => {
    setIsLoading(true);
    try {
      const riskData = {
        address: testAddress,
        score: testScore,
        tier: testTier,
        timestamp: Date.now(),
        chosenTier: testTier
      };

      await saveUserRiskData(riskData);
      addResult('Save Risk Data', true, `Saved data for ${testAddress}`, riskData);
      updateCacheInfo();
    } catch (error) {
      addResult('Save Risk Data', false, `Error: ${error.message}`);
    }
    setIsLoading(false);
  };

  // Test 4: Retrieve risk data
  const testRetrieveRiskData = async () => {
    setIsLoading(true);
    try {
      const data = await getUserRiskData(testAddress);
      setRetrievedData(data);
      
      if (data) {
        addResult('Retrieve Risk Data', true, `Retrieved data for ${testAddress}`, data);
      } else {
        addResult('Retrieve Risk Data', false, `No data found for ${testAddress}`);
      }
    } catch (error) {
      addResult('Retrieve Risk Data', false, `Error: ${error.message}`);
    }
    setIsLoading(false);
  };

  // Test 5: Update chosen tier
  const testUpdateChosenTier = async () => {
    setIsLoading(true);
    try {
      const newTier = testTier === 'TIER_1' ? 'TIER_2' : 'TIER_1';
      const updatedData = await updateUserChosenTier(testAddress, newTier);
      addResult('Update Chosen Tier', true, `Updated tier to ${newTier}`, updatedData);
      setTestTier(newTier);
      updateCacheInfo();
    } catch (error) {
      addResult('Update Chosen Tier', false, `Error: ${error.message}`);
    }
    setIsLoading(false);
  };

  // Test 6: Delete risk data
  const testDeleteRiskData = async () => {
    setIsLoading(true);
    try {
      await deleteUserRiskData(testAddress);
      addResult('Delete Risk Data', true, `Deleted data for ${testAddress}`);
      setRetrievedData(null);
      updateCacheInfo();
    } catch (error) {
      addResult('Delete Risk Data', false, `Error: ${error.message}`);
    }
    setIsLoading(false);
  };

  // Test 7: Export data
  const testExportData = async () => {
    setIsLoading(true);
    try {
      await exportRiskData();
      addResult('Export Data', true, 'Data exported successfully - check downloads');
    } catch (error) {
      addResult('Export Data', false, `Error: ${error.message}`);
    }
    setIsLoading(false);
  };

  // Test 8: Migration test
  const testMigration = async () => {
    setIsLoading(true);
    try {
      // First, add some test data to localStorage
      const testData = {
        address: 'test-migration-address',
        score: 88,
        tier: 'TIER_3',
        timestamp: Date.now()
      };
      
      localStorage.setItem('risk_score_test-migration-address', JSON.stringify(testData));
      
      const migrationNeeded = checkMigrationNeeded();
      if (migrationNeeded) {
        const result = await migrateFromLocalStorage();
        addResult('Migration Test', true, `Migrated ${result.migrated} records, ${result.errors} errors`, result);
      } else {
        addResult('Migration Test', true, 'No migration needed');
      }
    } catch (error) {
      addResult('Migration Test', false, `Error: ${error.message}`);
    }
    setIsLoading(false);
  };

  // Test 9: Performance test
  const testPerformance = async () => {
    setIsLoading(true);
    try {
      const startTime = performance.now();
      const iterations = 100;
      
      // Test batch save/retrieve operations
      for (let i = 0; i < iterations; i++) {
        const riskData = {
          address: `perf-test-${i}`,
          score: Math.floor(Math.random() * 100),
          tier: `TIER_${Math.floor(Math.random() * 3) + 1}`,
          timestamp: Date.now(),
          chosenTier: `TIER_${Math.floor(Math.random() * 3) + 1}`
        };
        
        await saveUserRiskData(riskData);
        await getUserRiskData(riskData.address);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      addResult('Performance Test', true, `${iterations} operations completed in ${duration.toFixed(2)}ms (${(duration/iterations).toFixed(2)}ms per op)`);
      
      // Cleanup test data
      for (let i = 0; i < iterations; i++) {
        await deleteUserRiskData(`perf-test-${i}`);
      }
      
      updateCacheInfo();
    } catch (error) {
      addResult('Performance Test', false, `Error: ${error.message}`);
    }
    setIsLoading(false);
  };

  // Clear cache test
  const testClearCache = () => {
    clearRiskDataCache();
    updateCacheInfo();
    addResult('Clear Cache', true, 'Cache cleared successfully');
  };

  // Import test (requires file input)
  const handleFileImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const result = await importRiskData(file);
      addResult('Import Data', true, `Imported ${result.imported} records, ${result.skipped} skipped, ${result.errors} errors`, result);
      updateCacheInfo();
    } catch (error) {
      addResult('Import Data', false, `Error: ${error.message}`);
    }
    setIsLoading(false);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto bg-gray-50 min-h-screen">
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          🧪 Risk Data System - Developer Tools
        </h1>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">System Status</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-blue-700">IndexedDB:</span>
              <span className={`ml-2 font-semibold ${typeof indexedDB !== 'undefined' ? 'text-green-600' : 'text-red-600'}`}>
                {typeof indexedDB !== 'undefined' ? 'Supported' : 'Not Supported'}
              </span>
            </div>
            <div>
              <span className="text-blue-700">Cache Size:</span>
              <span className="ml-2 font-semibold text-blue-900">{cacheInfo.size} items</span>
            </div>
            <div>
              <span className="text-blue-700">Migration Needed:</span>
              <span className={`ml-2 font-semibold ${checkMigrationNeeded() ? 'text-orange-600' : 'text-green-600'}`}>
                {checkMigrationNeeded() ? 'Yes' : 'No'}
              </span>
            </div>
            <div>
              <span className="text-blue-700">Test Results:</span>
              <span className="ml-2 font-semibold text-blue-900">{testResults.length}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Test Controls */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Test Controls</h2>
          
          {/* Test Data Inputs */}
          <div className="mb-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Test Address:</label>
              <input
                type="text"
                value={testAddress}
                onChange={(e) => setTestAddress(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter Stellar address"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Score:</label>
                <input
                  type="number"
                  value={testScore}
                  onChange={(e) => setTestScore(Number(e.target.value))}
                  min="0"
                  max="100"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tier:</label>
                <select
                  value={testTier}
                  onChange={(e) => setTestTier(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="TIER_1">TIER_1</option>
                  <option value="TIER_2">TIER_2</option>
                  <option value="TIER_3">TIER_3</option>
                </select>
              </div>
            </div>
          </div>

          {/* Test Buttons */}
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={testBasicFunctionality}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
              >
                Test Basic Functions
              </button>
              <button
                onClick={testSystemInitialization}
                disabled={isLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 text-sm"
              >
                Initialize System
              </button>
              <button
                onClick={testSaveRiskData}
                disabled={isLoading}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 text-sm"
              >
                Save Data
              </button>
              <button
                onClick={testRetrieveRiskData}
                disabled={isLoading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 text-sm"
              >
                Retrieve Data
              </button>
              <button
                onClick={testUpdateChosenTier}
                disabled={isLoading}
                className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 text-sm"
              >
                Update Tier
              </button>
              <button
                onClick={testDeleteRiskData}
                disabled={isLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 text-sm"
              >
                Delete Data
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={testExportData}
                disabled={isLoading}
                className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700 disabled:opacity-50 text-sm"
              >
                Export Data
              </button>
              <button
                onClick={testMigration}
                disabled={isLoading}
                className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50 text-sm"
              >
                Test Migration
              </button>
              <button
                onClick={testPerformance}
                disabled={isLoading}
                className="px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 disabled:opacity-50 text-sm"
              >
                Performance Test
              </button>
              <button
                onClick={testClearCache}
                disabled={isLoading}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 text-sm"
              >
                Clear Cache
              </button>
            </div>

            {/* File Import */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Import Data from File:
              </label>
              <input
                type="file"
                accept=".json"
                onChange={handleFileImport}
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
            </div>
          </div>

          {/* Retrieved Data Display */}
          {retrievedData && (
            <div className="mt-4 p-4 bg-gray-50 rounded-md">
              <h4 className="font-medium text-gray-900 mb-2">Retrieved Data:</h4>
              <pre className="text-xs text-gray-700 overflow-x-auto">
                {JSON.stringify(retrievedData, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Test Results */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Test Results {testResults.length > 0 && `(${testResults.length})`}
          </h2>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {testResults.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No tests run yet</p>
            ) : (
              testResults.map((result, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-md border ${
                    result.success 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">
                      {result.success ? '✅' : '❌'} {result.test}
                    </span>
                    <span className="text-xs text-gray-500">{result.timestamp}</span>
                  </div>
                  <p className={`text-sm ${
                    result.success ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {result.message}
                  </p>
                  {result.data && (
                    <details className="mt-2">
                      <summary className="text-xs text-gray-600 cursor-pointer">View Data</summary>
                      <pre className="text-xs text-gray-700 mt-1 bg-white p-2 rounded border overflow-x-auto">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))
            )}
          </div>
          
          {testResults.length > 0 && (
            <button
              onClick={() => setTestResults([])}
              className="mt-4 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 text-sm w-full"
            >
              Clear Results
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RiskDataDevTools;