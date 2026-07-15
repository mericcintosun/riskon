/**
 * @jest-environment jsdom
 */

import { calculateRiskScore } from '../lightweightRiskModel';

describe('nightDayRatio removal (v3.0.0)', () => {
  // The feature was inverted: the formula was `day > 0 ? night / day : 0`, so a
  // wallet active ONLY at night scored 0 — the safest value on the model's
  // highest-weighted RISK term. 31.3% of 300 real mainnet wallets are entirely
  // nocturnal by that definition, and every one of them was handed a perfect
  // score on it. Guard against anyone reintroducing an hour-of-day term.
  test('a fully nocturnal wallet is not scored as the safest possible', () => {
    const base = { totalVolume: 5000, uniqueCounterparties: 10, assetDiversity: 3, totalPayments: 50 };

    const nocturnal = calculateRiskScore({ ...base, nightDayRatio: 0 });
    const diurnal = calculateRiskScore({ ...base, nightDayRatio: 5 });

    // Passing the old field must change nothing at all — it is no longer read.
    expect(nocturnal.riskScore).toBe(diurnal.riskScore);
  });

  test('hour-of-day cannot influence the score', () => {
    const base = { totalVolume: 5000, uniqueCounterparties: 10, assetDiversity: 3, totalPayments: 50 };

    const scores = [0, 0.6, 1, 12.33, 999].map(
      (nightDayRatio) => calculateRiskScore({ ...base, nightDayRatio }).riskScore
    );

    expect(new Set(scores).size).toBe(1);
  });

  test('reports the model version that dropped it', () => {
    const result = calculateRiskScore({
      totalVolume: 5000,
      uniqueCounterparties: 10,
      assetDiversity: 3,
      totalPayments: 50,
    });

    expect(result.modelVersion).toBe('3.0.0-activity-index');
  });

  test('no longer tells anyone which hours to transact in', () => {
    // The old advice ("Make more transactions during daytime hours") told a
    // Tokyo user to transact between midnight and 07:00 local, because "night"
    // was UTC 22-06.
    const result = calculateRiskScore({
      totalVolume: 10,
      uniqueCounterparties: 1,
      assetDiversity: 1,
      totalPayments: 2,
      nightDayRatio: 9,
    });

    for (const r of result.recommendations) {
      expect(r).not.toMatch(/daytime|night|hours/i);
    }
  });
});

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
      };

      const result = calculateRiskScore(metrics);

      expect(result.featureImportance).toBeDefined();
      expect(result.featureImportance).toHaveProperty('totalVolume');
      expect(result.featureImportance).toHaveProperty('uniqueCounterparties');
      expect(result.featureImportance).toHaveProperty('assetDiversity');
      // nightDayRatio was removed in v3.0.0: it was inverted for the 31% of real
      // wallets that are entirely nocturnal, and "night" in UTC is business
      // hours across Asia. See lightweightRiskModel.js.
      expect(result.featureImportance).not.toHaveProperty('nightDayRatio');
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
