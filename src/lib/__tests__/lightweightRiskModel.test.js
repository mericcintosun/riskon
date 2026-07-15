/**
 * @jest-environment jsdom
 */

import { calculateRiskScore } from '../lightweightRiskModel';

describe('Lightweight Risk Model', () => {
  describe('Score Calculation', () => {
    test('should calculate low risk score for excellent profile', () => {
      // Anchored to the real Stellar distribution (riskCalibration.js):
      // ~p90 volume/counterparties/assets, ~p10 night activity.
      const metrics = {
        totalVolume: 704952329,
        uniqueCounterparties: 24,
        assetDiversity: 56,
        nightDayRatio: 0,
        totalPayments: 200,
      };

      const result = calculateRiskScore(metrics);

      expect(result.riskScore).toBeLessThanOrEqual(30);
      expect(result.tier).toBe('TIER_1');
      // confidence is reported on a 0-100 scale (clamped to 60-95).
      expect(result.confidence).toBeGreaterThan(60);
    });

    test('should calculate medium risk score for average profile', () => {
      // ~p50 on every feature: the median real Stellar wallet.
      const metrics = {
        totalVolume: 35093963,
        uniqueCounterparties: 18,
        assetDiversity: 30,
        nightDayRatio: 2.28,
        totalPayments: 200,
      };

      const result = calculateRiskScore(metrics);

      expect(result.riskScore).toBeGreaterThan(30);
      expect(result.riskScore).toBeLessThanOrEqual(70);
      expect(result.tier).toBe('TIER_2');
    });

    test('should calculate high risk score for risky profile', () => {
      // ~p10 volume/counterparties/assets, ~p90 night activity.
      const metrics = {
        totalVolume: 61666,
        uniqueCounterparties: 5,
        assetDiversity: 4,
        nightDayRatio: 13.29,
        totalPayments: 200,
      };

      const result = calculateRiskScore(metrics);

      expect(result.riskScore).toBeGreaterThan(70);
      expect(result.tier).toBe('TIER_3');
    });

    test('should handle zero transaction history', () => {
      const metrics = {
        totalVolume: 0,
        uniqueCounterparties: 0,
        assetDiversity: 0,
        nightDayRatio: 0,
      };

      const result = calculateRiskScore(metrics);

      expect(result.riskScore).toBeGreaterThanOrEqual(0);
      expect(result.riskScore).toBeLessThanOrEqual(100);
      expect(result.tier).toBeDefined();
    });

    test('should cap score at 100', () => {
      const metrics = {
        totalVolume: 0,
        uniqueCounterparties: 0,
        assetDiversity: 0,
        nightDayRatio: 5.0, // Extremely high night activity
      };

      const result = calculateRiskScore(metrics);

      expect(result.riskScore).toBeLessThanOrEqual(100);
    });

    test('should floor score at 0', () => {
      const metrics = {
        totalVolume: 50000, // Extremely high volume
        uniqueCounterparties: 100,
        assetDiversity: 20,
        nightDayRatio: 0,
      };

      const result = calculateRiskScore(metrics);

      expect(result.riskScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Feature Importance', () => {
    test('should provide feature importance breakdown', () => {
      const metrics = {
        totalVolume: 5000,
        uniqueCounterparties: 25,
        assetDiversity: 5,
        nightDayRatio: 0.3,
      };

      const result = calculateRiskScore(metrics);

      expect(result.featureImportance).toBeDefined();
      expect(result.featureImportance).toHaveProperty('totalVolume');
      expect(result.featureImportance).toHaveProperty('uniqueCounterparties');
      expect(result.featureImportance).toHaveProperty('assetDiversity');
      expect(result.featureImportance).toHaveProperty('nightDayRatio');
    });

    test('should identify most important feature', () => {
      const metrics = {
        totalVolume: 10000,
        uniqueCounterparties: 50,
        assetDiversity: 10,
        nightDayRatio: 0.1,
      };

      const result = calculateRiskScore(metrics);

      // featureImportance maps each feature to an object
      // ({ weight, normalizedValue, impact, rawValue, isPositive }),
      // so compare the numeric `impact` field.
      const importanceValues = Object.values(result.featureImportance);
      const maxImportance = Math.max(...importanceValues.map((v) => v.impact));

      expect(maxImportance).toBeGreaterThan(0);
    });
  });

  describe('Tier Mapping', () => {
    test('should map score 0-30 to TIER_1', () => {
      const metrics = {
        totalVolume: 9000,
        uniqueCounterparties: 45,
        assetDiversity: 9,
        nightDayRatio: 0.1,
      };

      const result = calculateRiskScore(metrics);

      if (result.riskScore <= 30) {
        expect(result.tier).toBe('TIER_1');
      }
    });

    test('should map score 31-70 to TIER_2', () => {
      const metrics = {
        totalVolume: 3000,
        uniqueCounterparties: 15,
        assetDiversity: 4,
        nightDayRatio: 0.6,
      };

      const result = calculateRiskScore(metrics);

      if (result.riskScore > 30 && result.riskScore <= 70) {
        expect(result.tier).toBe('TIER_2');
      }
    });

    test('should map score 71-100 to TIER_3', () => {
      const metrics = {
        totalVolume: 200,
        uniqueCounterparties: 2,
        assetDiversity: 1,
        nightDayRatio: 2.0,
      };

      const result = calculateRiskScore(metrics);

      if (result.riskScore > 70) {
        expect(result.tier).toBe('TIER_3');
      }
    });
  });

  describe('Confidence Score', () => {
    // NOTE: `confidence` is derived from the variance of the normalized feature
    // vector (calculateConfidence => clamp(60, 95, (1 - variance) * 100)).
    // It therefore measures how homogeneous the feature vector is, NOT how much
    // data was available.
    test('should report higher confidence for a homogeneous feature vector', () => {
      // Every feature at ~p50 -> all percentiles ~0.5 -> low variance.
      const homogeneousMetrics = {
        totalVolume: 35093963,
        uniqueCounterparties: 18,
        assetDiversity: 30,
        nightDayRatio: 2.28,
        totalPayments: 200,
      };

      // Extremes on opposite ends -> percentiles near 0 and 1 -> high variance.
      const dispersedMetrics = {
        totalVolume: 5e9,
        uniqueCounterparties: 0,
        assetDiversity: 200,
        nightDayRatio: 0,
      };

      const homogeneousResult = calculateRiskScore(homogeneousMetrics);
      const dispersedResult = calculateRiskScore(dispersedMetrics);

      expect(homogeneousResult.confidence).toBeGreaterThan(
        dispersedResult.confidence
      );
    });

    test('should return confidence within the documented 5-95 band', () => {
      const metrics = {
        totalVolume: 5000,
        uniqueCounterparties: 25,
        assetDiversity: 5,
        nightDayRatio: 0.4,
        totalPayments: 200,
      };

      const result = calculateRiskScore(metrics);

      expect(result.confidence).toBeGreaterThanOrEqual(5);
      expect(result.confidence).toBeLessThanOrEqual(95);
    });

    // A wallet with no history must NOT come back confident. The old
    // variance-only formula gave an all-zero wallet the MAXIMUM confidence (95)
    // precisely because zeros have no variance.
    test('should report low confidence and flag insufficient data for an empty wallet', () => {
      const result = calculateRiskScore({
        totalVolume: 0,
        uniqueCounterparties: 0,
        assetDiversity: 0,
        nightDayRatio: 0,
        totalPayments: 0,
      });

      expect(result.insufficientData).toBe(true);
      expect(result.confidence).toBeLessThan(50);
    });
  });

  describe('Explanation and Recommendations', () => {
    test('should provide human-readable explanation', () => {
      const metrics = {
        totalVolume: 5000,
        uniqueCounterparties: 25,
        assetDiversity: 5,
        nightDayRatio: 0.3,
      };

      const result = calculateRiskScore(metrics);

      // generateExplanation returns an array of human-readable lines; the UI
      // (AutomatedRiskAnalyzer) consumes it with .unshift()/.map().
      expect(result.explanation).toBeDefined();
      expect(Array.isArray(result.explanation)).toBe(true);
      expect(result.explanation.length).toBeGreaterThan(0);
      result.explanation.forEach((line) => expect(typeof line).toBe('string'));
    });

    test('should provide actionable recommendations', () => {
      const metrics = {
        totalVolume: 1000,
        uniqueCounterparties: 5,
        assetDiversity: 2,
        nightDayRatio: 1.2,
      };

      const result = calculateRiskScore(metrics);

      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Model Metadata', () => {
    test('should include model version', () => {
      const metrics = {
        totalVolume: 5000,
        uniqueCounterparties: 25,
        assetDiversity: 5,
        nightDayRatio: 0.3,
      };

      const result = calculateRiskScore(metrics);

      expect(result.modelVersion).toBeDefined();
      expect(typeof result.modelVersion).toBe('string');
    });

    test('should include raw metrics', () => {
      const metrics = {
        totalVolume: 5000,
        uniqueCounterparties: 25,
        assetDiversity: 5,
        nightDayRatio: 0.3,
      };

      const result = calculateRiskScore(metrics);

      expect(result.rawMetrics).toEqual(metrics);
    });

    test('should include normalized features', () => {
      const metrics = {
        totalVolume: 5000,
        uniqueCounterparties: 25,
        assetDiversity: 5,
        nightDayRatio: 0.3,
      };

      const result = calculateRiskScore(metrics);

      expect(result.normalizedFeatures).toBeDefined();
      expect(result.normalizedFeatures).toHaveProperty('totalVolume');
      expect(result.normalizedFeatures).toHaveProperty('uniqueCounterparties');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle missing metrics gracefully', () => {
      const incompleteMetrics = {
        totalVolume: 5000,
        // Missing other fields
      };

      const result = calculateRiskScore(incompleteMetrics);

      expect(result).toBeDefined();
      expect(result.riskScore).toBeGreaterThanOrEqual(0);
      expect(result.riskScore).toBeLessThanOrEqual(100);
    });

    test('should handle negative values', () => {
      const invalidMetrics = {
        totalVolume: -1000,
        uniqueCounterparties: -5,
        assetDiversity: -2,
        nightDayRatio: -0.5,
      };

      const result = calculateRiskScore(invalidMetrics);

      expect(result).toBeDefined();
      expect(result.riskScore).toBeGreaterThanOrEqual(0);
    });

    test('should handle extremely large values', () => {
      const extremeMetrics = {
        totalVolume: 1000000000,
        uniqueCounterparties: 10000,
        assetDiversity: 1000,
        nightDayRatio: 100,
      };

      const result = calculateRiskScore(extremeMetrics);

      expect(result).toBeDefined();
      expect(result.riskScore).toBeLessThanOrEqual(100);
    });

    test('should handle null/undefined gracefully', () => {
      const nullMetrics = {
        totalVolume: null,
        uniqueCounterparties: undefined,
        assetDiversity: 5,
        nightDayRatio: 0.3,
      };

      const result = calculateRiskScore(nullMetrics);

      expect(result).toBeDefined();
      expect(result.riskScore).toBeGreaterThanOrEqual(0);
      expect(result.riskScore).toBeLessThanOrEqual(100);
    });
  });

  describe('Consistency and Determinism', () => {
    test('should return same score for same input', () => {
      const metrics = {
        totalVolume: 5000,
        uniqueCounterparties: 25,
        assetDiversity: 5,
        nightDayRatio: 0.3,
      };

      const result1 = calculateRiskScore(metrics);
      const result2 = calculateRiskScore(metrics);

      expect(result1.riskScore).toBe(result2.riskScore);
      expect(result1.tier).toBe(result2.tier);
    });

    test('should show score progression with improving metrics', () => {
      // Percentile-anchored: p10 activity -> p50 -> p90 activity.
      const poorMetrics = {
        totalVolume: 61666,
        uniqueCounterparties: 5,
        assetDiversity: 4,
        nightDayRatio: 13.29,
        totalPayments: 200,
      };

      const goodMetrics = {
        totalVolume: 35093963,
        uniqueCounterparties: 18,
        assetDiversity: 30,
        nightDayRatio: 2.28,
        totalPayments: 200,
      };

      const excellentMetrics = {
        totalVolume: 704952329,
        uniqueCounterparties: 24,
        assetDiversity: 56,
        nightDayRatio: 0,
        totalPayments: 200,
      };

      const poorResult = calculateRiskScore(poorMetrics);
      const goodResult = calculateRiskScore(goodMetrics);
      const excellentResult = calculateRiskScore(excellentMetrics);

      expect(poorResult.riskScore).toBeGreaterThan(goodResult.riskScore);
      expect(goodResult.riskScore).toBeGreaterThan(excellentResult.riskScore);
    });
  });
});
