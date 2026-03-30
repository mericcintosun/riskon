"use client";

import React from 'react';
import { useRiskScore } from '../lib/useRiskScore';
import { collectTransactionData } from '../lib/horizonDataCollector';
import { useCacheInvalidation, useAutoInvalidation } from '../hooks/useCacheInvalidation';
import { QuickCacheTest } from './CacheTestDashboard';
import { useState } from 'react';

/**
 * Enhanced Risk Analyzer with Cache Testing Integration
 * Demonstrates cache behavior in real risk analysis workflow
 */
export const CacheTestingRiskAnalyzer: React.FC<{ walletAddress?: string }> = ({ 
  walletAddress = 'GXXXXXXX_DEMO_WALLET_XXXXXXX' 
}) => {
  const [features, setFeatures] = useState<number[]>([0.5, 0.3, 0.8]);
  const [horizonData, setHorizonData] = useState<any>(null);
  const [cacheHits, setCacheHits] = useState<string[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Use risk score hook with caching
  const { riskScore, loading, error } = useRiskScore(features, walletAddress);

  // Cache invalidation hooks
  const { invalidateRiskCache, invalidateUserCache } = useCacheInvalidation();
  useAutoInvalidation(walletAddress);

  const simulateRiskAnalysis = async () => {
    setIsAnalyzing(true);
    setCacheHits([]);

    try {
      // Step 1: Collect Horizon data (should use cache after first call)
      console.log('📡 Collecting transaction data...');
      const startTime = Date.now();
      
      const data: any = await collectTransactionData(walletAddress);
      const horizonTime = Date.now() - startTime;
      
      setCacheHits(prev => [...prev, 
        `Horizon data: ${horizonTime}ms ${horizonTime < 100 ? '(cache hit 🎯)' : '(fresh fetch 📡)'}`
      ]);

      setHorizonData(data);

      // Step 2: Calculate risk score (should use cached risk score after first calculation)
      if (data.success) {
        const newFeatures = [
          Math.random(), // Simulate transaction frequency
          Math.random(), // Simulate time patterns
          Math.random()  // Simulate asset diversity
        ];
        
        const riskStartTime = Date.now();
        setFeatures(newFeatures);
        
        // The useRiskScore hook will handle caching
        setTimeout(() => {
          const riskTime = Date.now() - riskStartTime;
          setCacheHits(prev => [...prev, 
            `Risk score: ${riskTime}ms ${riskTime < 50 ? '(cache hit 🎯)' : '(fresh calculation 🧠)'}`
          ]);
        }, 100);
      }

    } catch (error) {
      console.error('Risk analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const triggerCacheInvalidation = async () => {
    console.log('🗑️ Triggering cache invalidation...');
    await invalidateRiskCache(walletAddress);
    setCacheHits(prev => [...prev, 'Cache invalidated - next analysis will be fresh']);
  };

  const simulateScoreUpdate = async () => {
    console.log('📝 Simulating score update (triggers auto-invalidation)...');
    
    // Simulate a score update that would trigger cache invalidation
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('riskScoreUpdated', {
          detail: { walletAddress, score: 85, timestamp: Date.now() }
        })
      );
    }
    
    setCacheHits(prev => [...prev, 'Score update event dispatched - cache auto-invalidated']);
  };

  return (
    <div className="space-y-6">
      
      {/* Quick Cache Test */}
      <QuickCacheTest />
      
      {/* Risk Analysis with Cache Demonstration */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          🎯 Cache-Enabled Risk Analysis Demo
        </h3>
        
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">
            Testing wallet: <code className="bg-gray-100 px-1 rounded">{walletAddress.slice(0, 10)}...{walletAddress.slice(-6)}</code>
          </p>
        </div>

        {/* Controls */}
        <div className="flex gap-3 mb-4 flex-wrap">
          <button
            onClick={simulateRiskAnalysis}
            disabled={isAnalyzing}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {isAnalyzing ? 'Analyzing...' : 'Run Risk Analysis'}
          </button>
          
          <button
            onClick={triggerCacheInvalidation}
            className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
          >
            Invalidate Cache
          </button>
          
          <button
            onClick={simulateScoreUpdate}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
          >
            Simulate Score Update
          </button>
        </div>

        {/* Results */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="p-3 bg-blue-50 rounded">
            <h4 className="font-semibold text-blue-800 mb-2">Current Risk Score</h4>
            {loading ? (
              <div className="text-blue-600">Calculating...</div>
            ) : error ? (
              <div className="text-red-600">Error: {error}</div>
            ) : riskScore !== null ? (
              <div className="text-2xl font-bold text-blue-700">{riskScore}/100</div>
            ) : (
              <div className="text-gray-500">No score calculated</div>
            )}
          </div>
          
          <div className="p-3 bg-green-50 rounded">
            <h4 className="font-semibold text-green-800 mb-2">Horizon Data Status</h4>
            {horizonData ? (
              <div className="text-green-700">
                <div>✅ Data collected</div>
                <div className="text-sm">
                  {horizonData.dataPoints?.payments} payments, {horizonData.dataPoints?.transactions} transactions
                </div>
              </div>
            ) : (
              <div className="text-gray-500">No data collected</div>
            )}
          </div>
        </div>

        {/* Cache Performance */}
        {cacheHits.length > 0 && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
            <h4 className="font-semibold text-yellow-800 mb-2">⚡ Cache Performance</h4>
            <div className="space-y-1">
              {cacheHits.map((hit, index) => (
                <div key={index} className="text-sm text-yellow-700 font-mono">
                  {hit}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-4 p-3 bg-gray-50 border rounded text-sm text-gray-600">
          <h5 className="font-semibold mb-1">💡 How to Test Cache Behavior:</h5>
          <ol className="list-decimal list-inside space-y-1">
            <li><strong>First run:</strong> Click "Run Risk Analysis" - should see fresh fetches (higher ms)</li>
            <li><strong>Second run:</strong> Click again immediately - should see cache hits (lower ms)</li>
            <li><strong>Invalidation:</strong> Click "Invalidate Cache" then analyze - should see fresh fetches again</li>
            <li><strong>Auto-invalidation:</strong> Click "Simulate Score Update" - cache auto-clears for next analysis</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

/**
 * Simple cache performance monitor
 */
export const CachePerformanceMonitor: React.FC = () => {
  const [stats, setStats] = useState<{ operations: Array<{ type: string; time: number; hit: boolean }> }>({
    operations: []
  });

  const addOperation = (type: string, time: number, hit: boolean) => {
    setStats(prev => ({
      operations: [...prev.operations.slice(-9), { type, time, hit }] // Keep last 10
    }));
  };

  // Mock some operations for demonstration
  React.useEffect(() => {
    const interval = setInterval(() => {
      const operations = ['getCache', 'setCache', 'invalidate'];
      const op = operations[Math.floor(Math.random() * operations.length)];
      const time = Math.random() * 100 + (op === 'setCache' ? 50 : 10);
      const hit = op === 'getCache' ? Math.random() > 0.3 : false;
      
      addOperation(op, time, hit);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const avgCacheTime = stats.operations.filter(op => op.hit).reduce((sum, op) => sum + op.time, 0) / 
    Math.max(1, stats.operations.filter(op => op.hit).length);

  const hitRate = stats.operations.filter(op => op.type === 'getCache').length > 0 ?
    (stats.operations.filter(op => op.hit).length / stats.operations.filter(op => op.type === 'getCache').length) * 100 : 0;

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="font-semibold text-gray-800 mb-3">📊 Cache Performance Monitor</h3>
      
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{avgCacheTime.toFixed(1)}ms</div>
          <div className="text-xs text-gray-500">Avg Cache Hit Time</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{hitRate.toFixed(1)}%</div>
          <div className="text-xs text-gray-500">Cache Hit Rate</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">{stats.operations.length}</div>
          <div className="text-xs text-gray-500">Recent Operations</div>
        </div>
      </div>

      <div className="space-y-1 max-h-32 overflow-y-auto">
        {stats.operations.slice(-5).reverse().map((op, index) => (
          <div key={index} className="flex justify-between items-center text-xs">
            <span className="font-mono">{op.type}</span>
            <span className={`${op.hit ? 'text-green-600' : 'text-gray-500'}`}>
              {op.time.toFixed(1)}ms {op.hit && '🎯'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};