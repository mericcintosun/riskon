/**
 * Unit Tests for Lightweight Risk Model
 * Tests the ML-based risk scoring algorithm
 */

import {
  calculateRiskScore,
  getDataQualityScore,
} from '../lightweightRiskModel';

// Mock console methods to avoid noise in tests
const originalConsoleError = console.error;
const originalConsoleLog = console.log;

beforeEach(() => {
  console.error = jest.fn();
  console.log = jest.fn();
});

afterEach(() => {
  console.error = originalConsoleError;
  console.log = originalConsoleLog;
});

describe('Lightweight Risk Model', () => {
  describe('calculateRiskScore', () => {
    it('should calculate risk score for low risk user', () => {
      const metrics = {
        totalVolume: 5000,
        uniqueCounterparties: 15,
        assetDiversity: 4,
        nightDayRatio: 0.3,
        totalPayments: 50,
        totalTransactions: 60,
        averageTransactionSize: 83.33,
      };

      const result = calculateRiskScore(metrics);

      expect(result).toHaveProperty('riskScore');
      expect(result).toHaveProperty('tier');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('featureImportance');
      expect(result).toHaveProperty('explanation');
      expect(result).toHaveProperty('recommendations');
      expect(result).toHaveProperty('rawMetrics');
      expect(result).toHaveProperty('normalizedFeatures');
      expect(result).toHaveProperty('modelVersion');

      expect(result.riskScore).toBeGreaterThanOrEqual(0);
      expect(result.riskScore).toBeLessThanOrEqual(100);
      expect(result.tier).toBe('TIER_1'); // Low risk
      expect(result.confidence).toBeGreaterThanOrEqual(60);
      expect(result.confidence).toBeLessThanOrEqual(95);
      expect(result.modelVersion).toBe('1.0.0');
    });

    it('should calculate risk score for high risk user', () => {
      const metrics = {
        totalVolume: 10,
        uniqueCounterparties: 1,
        assetDiversity: 1,
        nightDayRatio: 1.5,
        totalPayments: 5,
        totalTransactions: 6,
        averageTransactionSize: 2,
      };

      const result = calculateRiskScore(metrics);

      expect(result.riskScore).toBeGreaterThanOrEqual(0);
      expect(result.riskScore).toBeLessThanOrEqual(100);
      expect(result.tier).toBe('TIER_3'); // High risk
      expect(result.confidence).toBeGreaterThanOrEqual(60);
      expect(result.confidence).toBeLessThanOrEqual(95);
    });

    it('should calculate risk score for medium risk user', () => {
      const metrics = {
        totalVolume: 500,
        uniqueCounterparties: 5,
        assetDiversity: 2,
        nightDayRatio: 0.7,
        totalPayments: 20,
        totalTransactions: 25,
        averageTransactionSize: 25,
      };

      const result = calculateRiskScore(metrics);

      expect(result.riskScore).toBeGreaterThanOrEqual(0);
      expect(result.riskScore).toBeLessThanOrEqual(100);
      expect(result.tier).toBe('TIER_2'); // Medium risk
    });

    it('should handle edge case with zero metrics', () => {
      const metrics = {
        totalVolume: 0,
        uniqueCounterparties: 0,
        assetDiversity: 0,
        nightDayRatio: 0,
        totalPayments: 0,
        totalTransactions: 0,
        averageTransactionSize: 0,
      };

      const result = calculateRiskScore(metrics);

      expect(result.riskScore).toBeGreaterThanOrEqual(0);
      expect(result.riskScore).toBeLessThanOrEqual(100);
      expect(result.tier).toBeOneOf(['TIER_1', 'TIER_2', 'TIER_3']);
    });

    it('should handle very high values gracefully', () => {
      const metrics = {
        totalVolume: 50000,
        uniqueCounterparties: 100,
        assetDiversity: 20,
        nightDayRatio: 3,
        totalPayments: 1000,
        totalTransactions: 1200,
        averageTransactionSize: 50,
      };

      const result = calculateRiskScore(metrics);

      expect(result.riskScore).toBeGreaterThanOrEqual(0);
      expect(result.riskScore).toBeLessThanOrEqual(100);
      expect(result.normalizedFeatures.totalVolume).toBeLessThanOrEqual(1);
      expect(result.normalizedFeatures.uniqueCounterparties).toBeLessThanOrEqual(1);
      expect(result.normalizedFeatures.assetDiversity).toBeLessThanOrEqual(1);
      expect(result.normalizedFeatures.nightDayRatio).toBeLessThanOrEqual(1);
    });

    it('should provide meaningful explanations', () => {
      const metrics = {
        totalVolume: 100,
        uniqueCounterparties: 2,
        assetDiversity: 1,
        nightDayRatio: 0.8,
        totalPayments: 10,
        totalTransactions: 12,
        averageTransactionSize: 10,
      };

      const result = calculateRiskScore(metrics);

      expect(result.explanation).toBeInstanceOf(Array);
      expect(result.explanation.length).toBeGreaterThan(0);
      expect(result.explanation[0]).toMatch(/🟢|🟡|🔴/); // Tier indicator
    });

    it('should provide recommendations when needed', () => {
      const metrics = {
        totalVolume: 20, // Low volume
        uniqueCounterparties: 2, // Few counterparties
        assetDiversity: 1, // Single asset
        nightDayRatio: 0.8, // High night activity
        totalPayments: 8,
        totalTransactions: 10,
        averageTransactionSize: 2.5,
      };

      const result = calculateRiskScore(metrics);

      expect(result.recommendations).toBeInstanceOf(Array);
      expect(result.recommendations.length).toBeGreaterThan(0);
      // Should have recommendations for improvement
      expect(result.recommendations.some(rec => 
        rec.includes('📈') || rec.includes('🤝') || 
        rec.includes('🎯') || rec.includes('🌞')
      )).toBe(true);
    });

    it('should return excellent recommendation for good profiles', () => {
      const metrics = {
        totalVolume: 2000,
        uniqueCounterparties: 20,
        assetDiversity: 5,
        nightDayRatio: 0.3,
        totalPayments: 80,
        totalTransactions: 95,
        averageTransactionSize: 25,
      };

      const result = calculateRiskScore(metrics);

      expect(result.recommendations).toContain('🎉 Excellent! Your risk profile is in great condition');
    });

    it('should calculate feature importance correctly', () => {
      const metrics = {
        totalVolume: 1000,
        uniqueCounterparties: 10,
        assetDiversity: 3,
        nightDayRatio: 0.5,
        totalPayments: 30,
        totalTransactions: 35,
        averageTransactionSize: 33.33,
      };

      const result = calculateRiskScore(metrics);

      expect(result.featureImportance).toHaveProperty('totalVolume');
      expect(result.featureImportance).toHaveProperty('uniqueCounterparties');
      expect(result.featureImportance).toHaveProperty('assetDiversity');
      expect(result.featureImportance).toHaveProperty('nightDayRatio');

      // Check feature importance structure
      Object.values(result.featureImportance).forEach(importance => {
        expect(importance).toHaveProperty('weight');
        expect(importance).toHaveProperty('normalizedValue');
        expect(importance).toHaveProperty('impact');
        expect(importance).toHaveProperty('rawValue');
        expect(importance).toHaveProperty('isPositive');
        
        expect(typeof importance.weight).toBe('number');
        expect(typeof importance.normalizedValue).toBe('number');
        expect(typeof importance.impact).toBe('number');
        expect(typeof importance.rawValue).toBe('number');
        expect(typeof importance.isPositive).toBe('boolean');
      });
    });

    it('should handle errors gracefully with fallback calculation', () => {
      // Mock a scenario that might cause errors
      const invalidMetrics = {
        totalVolume: NaN,
        uniqueCounterparties: null,
        assetDiversity: undefined,
        nightDayRatio: -1,
      };

      const result = calculateRiskScore(invalidMetrics);

      expect(result).toHaveProperty('riskScore');
      expect(result).toHaveProperty('tier');
      expect(result.modelVersion).toBe('fallback-1.0');
      expect(result.explanation).toContain('📊 Simple rule-based calculation was used');
    });
  });

  describe('getDataQualityScore', () => {
    it('should return high quality score for good data', () => {
      const metrics = {
        totalPayments: 20,
        uniqueCounterparties: 8,
        assetDiversity: 4,
        totalVolume: 1000,
      };

      const result = getDataQualityScore(metrics);

      expect(result.score).toBe(100);
      expect(result.isGood).toBe(true);
      expect(result.needsMoreData).toBe(false);
    });

    it('should return low quality score for insufficient data', () => {
      const metrics = {
        totalPayments: 2,
        uniqueCounterparties: 1,
        assetDiversity: 1,
        totalVolume: 10,
      };

      const result = getDataQualityScore(metrics);

      expect(result.score).toBe(25);
      expect(result.isGood).toBe(false);
      expect(result.needsMoreData).toBe(true);
    });

    it('should handle missing metrics gracefully', () => {
      const metrics = {};

      const result = getDataQualityScore(metrics);

      expect(result.score).toBe(0);
      expect(result.isGood).toBe(false);
      expect(result.needsMoreData).toBe(true);
    });

    it('should calculate partial quality scores correctly', () => {
      const metrics = {
        totalPayments: 15, // +25
        uniqueCounterparties: 4, // +25
        assetDiversity: 2, // +25
        totalVolume: 500, // +25
      };

      const result = getDataQualityScore(metrics);

      expect(result.score).toBe(100);
      expect(result.isGood).toBe(true);
      expect(result.needsMoreData).toBe(false);
    });

    it('should evaluate threshold correctly', () => {
      const metrics = {
        totalPayments: 8,
        uniqueCounterparties: 2,
        assetDiversity: 1,
        totalVolume: 100,
      };

      const result = getDataQualityScore(metrics);

      expect(result.score).toBe(50);
      expect(result.isGood).toBe(false);
      expect(result.needsMoreData).toBe(true);
    });
  });

  describe('Risk Model Edge Cases', () => {
    it('should handle boundary risk scores', () => {
      // Test exact boundary conditions
      const lowRiskMetrics = {
        totalVolume: 10000,
        uniqueCounterparties: 50,
        assetDiversity: 10,
        nightDayRatio: 0,
        totalPayments: 100,
        totalTransactions: 120,
        averageTransactionSize: 100,
      };

      const result = calculateRiskScore(lowRiskMetrics);
      expect(result.riskScore).toBeLessThanOrEqual(30); // Should be TIER_1

      const highRiskMetrics = {
        totalVolume: 0,
        uniqueCounterparties: 0,
        assetDiversity: 1,
        nightDayRatio: 2,
        totalPayments: 1,
        totalTransactions: 1,
        averageTransactionSize: 0,
      };

      const highRiskResult = calculateRiskScore(highRiskMetrics);
      expect(highRiskResult.riskScore).toBeGreaterThan(70); // Should be TIER_3
    });

    it('should maintain consistent results for same input', () => {
      const metrics = {
        totalVolume: 500,
        uniqueCounterparties: 5,
        assetDiversity: 2,
        nightDayRatio: 0.5,
        totalPayments: 15,
        totalTransactions: 18,
        averageTransactionSize: 33.33,
      };

      const result1 = calculateRiskScore(metrics);
      const result2 = calculateRiskScore(metrics);

      expect(result1.riskScore).toBe(result2.riskScore);
      expect(result1.tier).toBe(result2.tier);
      expect(result1.confidence).toBe(result2.confidence);
    });

    it('should normalize features correctly', () => {
      const metrics = {
        totalVolume: 100,
        uniqueCounterparties: 5,
        assetDiversity: 2,
        nightDayRatio: 0.5,
        totalPayments: 10,
        totalTransactions: 12,
        averageTransactionSize: 10,
      };

      const result = calculateRiskScore(metrics);

      expect(result.normalizedFeatures.totalVolume).toBeGreaterThanOrEqual(0);
      expect(result.normalizedFeatures.totalVolume).toBeLessThanOrEqual(1);
      expect(result.normalizedFeatures.uniqueCounterparties).toBeGreaterThanOrEqual(0);
      expect(result.normalizedFeatures.uniqueCounterparties).toBeLessThanOrEqual(1);
      expect(result.normalizedFeatures.assetDiversity).toBeGreaterThanOrEqual(0);
      expect(result.normalizedFeatures.assetDiversity).toBeLessThanOrEqual(1);
      expect(result.normalizedFeatures.nightDayRatio).toBeGreaterThanOrEqual(0);
      expect(result.normalizedFeatures.nightDayRatio).toBeLessThanOrEqual(1);
    });
  });
});
