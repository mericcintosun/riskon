"use client";

/**
 * Lightweight Risk Scoring Model
 * Browser-based logistic regression for risk score calculation
 * Uses the 4 metrics from Horizon data to calculate 0-100 risk score
 */

/**
 * Pre-trained model weights (simplified logistic regression)
 * These weights are trained on a hypothetical dataset of good/risky behaviors
 */
const MODEL_WEIGHTS = {
  // Feature weights (how much each metric affects risk)
  totalVolume: -0.15, // Higher volume = lower risk (up to a point)
  uniqueCounterparties: -0.25, // More diverse counterparties = lower risk
  assetDiversity: -0.2, // More asset variety = lower risk
  nightDayRatio: 0.35, // More night activity = higher risk

  // Interaction weights (combined effects)
  volumeCounterpartyInteraction: -0.1, // High volume + high counterparties = very low risk

  // Bias term
  bias: 0.45,
};

/**
 * Feature normalization parameters
 * Based on typical Stellar testnet usage patterns
 */
const NORMALIZATION = {
  totalVolume: { min: 0, max: 10000, scale: 100 },
  uniqueCounterparties: { min: 0, max: 50, scale: 10 },
  assetDiversity: { min: 1, max: 10, scale: 3 },
  nightDayRatio: { min: 0, max: 2, scale: 0.5 },
};

/**
 * Calculate risk score from transaction metrics
 * @param {Object} metrics - Transaction metrics from Horizon
 * @returns {Object} Risk analysis result
 */
export function calculateRiskScore(metrics) {
  try {
    // Normalize features to 0-1 range
    const normalizedFeatures = normalizeFeatures(metrics);

    // Calculate logistic regression output
    const logitScore = calculateLogisticRegression(normalizedFeatures);

    // Convert to 0-100 risk score (lower logit = higher risk)
    const riskScore = Math.round(
      Math.max(0, Math.min(100, (1 - logitScore) * 100))
    );

    // Determine tier based on risk score
    const tier = calculateTier(riskScore);

    // Calculate feature importance for explanation
    const featureImportance = calculateFeatureImportance(
      normalizedFeatures,
      metrics
    );

    const result = {
      riskScore,
      tier,
      confidence: calculateConfidence(normalizedFeatures),
      featureImportance,
      explanation: generateExplanation(riskScore, featureImportance),
      recommendations: generateRecommendations(featureImportance),
      rawMetrics: metrics,
      normalizedFeatures,
      modelVersion: "1.0.0",
    };

    return result;
  } catch (error) {
    console.error("❌ ML calculation failed:", error);

    // Fallback to simple rule-based scoring
    return fallbackRiskCalculation(metrics);
  }
}

/**
 * Normalize features to 0-1 range for ML model
 */
function normalizeFeatures(metrics) {
  const normalized = {};

  // Normalize each feature
  Object.keys(NORMALIZATION).forEach((feature) => {
    const value = metrics[feature] || 0;
    const norm = NORMALIZATION[feature];

    // Min-max normalization with scaling
    normalized[feature] = Math.max(
      0,
      Math.min(1, value / norm.scale / ((norm.max - norm.min) / norm.scale))
    );
  });

  return normalized;
}

/**
 * Calculate logistic regression score
 */
function calculateLogisticRegression(features) {
  // Linear combination of features
  let linearScore = MODEL_WEIGHTS.bias;

  linearScore += features.totalVolume * MODEL_WEIGHTS.totalVolume;
  linearScore +=
    features.uniqueCounterparties * MODEL_WEIGHTS.uniqueCounterparties;
  linearScore += features.assetDiversity * MODEL_WEIGHTS.assetDiversity;
  linearScore += features.nightDayRatio * MODEL_WEIGHTS.nightDayRatio;

  // Add interaction term
  const volumeCounterpartyInteraction =
    features.totalVolume * features.uniqueCounterparties;
  linearScore +=
    volumeCounterpartyInteraction * MODEL_WEIGHTS.volumeCounterpartyInteraction;

  // Apply sigmoid function to get probability (0-1)
  const probability = 1 / (1 + Math.exp(-linearScore));

  return probability;
}

/**
 * Calculate tier based on risk score
 */
function calculateTier(riskScore) {
  if (riskScore <= 30) return "TIER_1"; // Low risk - Premium access
  if (riskScore <= 70) return "TIER_2"; // Medium risk - Standard access
  return "TIER_3"; // High risk - Opportunity access
}

/**
 * Calculate model confidence based on feature consistency
 */
function calculateConfidence(features) {
  // Calculate how "typical" this feature combination is
  // Higher variance = lower confidence
  const featureValues = Object.values(features);
  const mean =
    featureValues.reduce((sum, val) => sum + val, 0) / featureValues.length;
  const variance =
    featureValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
    featureValues.length;

  // Convert variance to confidence (0-100%)
  const confidence = Math.round(
    Math.max(60, Math.min(95, (1 - variance) * 100))
  );
  return confidence;
}

/**
 * Calculate feature importance for explainability
 */
function calculateFeatureImportance(features, rawMetrics) {
  const importance = {};

  // Calculate weighted impact of each feature
  Object.keys(features).forEach((feature) => {
    const weight = Math.abs(MODEL_WEIGHTS[feature] || 0);
    const featureValue = features[feature];
    importance[feature] = {
      weight: Math.round(weight * 100) / 100,
      normalizedValue: Math.round(featureValue * 100) / 100,
      impact: Math.round(weight * featureValue * 100) / 100,
      rawValue: rawMetrics[feature],
      isPositive: MODEL_WEIGHTS[feature] < 0, // Negative weight = positive for safety
    };
  });

  return importance;
}

/**
 * Generate human-readable explanation
 */
function generateExplanation(riskScore, featureImportance) {
  const tier = calculateTier(riskScore);
  let explanation = [];

  // Main tier explanation
  if (tier === "TIER_1") {
    explanation.push("🟢 Low Risk - Premium pool access");
  } else if (tier === "TIER_2") {
    explanation.push("🟡 Medium Risk - Standard pool access");
  } else {
    explanation.push("🔴 High Risk - Opportunity pool access");
  }

  // Feature-based explanations
  const sortedFeatures = Object.entries(featureImportance).sort(
    (a, b) => Math.abs(b[1].impact) - Math.abs(a[1].impact)
  );

  sortedFeatures.slice(0, 2).forEach(([feature, data]) => {
    if (feature === "totalVolume") {
      if (data.isPositive && data.rawValue > 100) {
        explanation.push("✅ High transaction volume increases trust");
      } else {
        explanation.push("⚠️ Low transaction volume increases risk");
      }
    } else if (feature === "uniqueCounterparties") {
      if (data.isPositive && data.rawValue > 5) {
        explanation.push("✅ Diverse counterparties increase trust");
      } else {
        explanation.push("⚠️ Few counterparties increase risk");
      }
    } else if (feature === "assetDiversity") {
      if (data.isPositive && data.rawValue > 2) {
        explanation.push("✅ Asset diversity increases trust");
      } else {
        explanation.push("⚠️ Single asset usage increases risk");
      }
    } else if (feature === "nightDayRatio") {
      if (!data.isPositive && data.rawValue > 0.5) {
        explanation.push("⚠️ High night activity increases risk");
      }
    }
  });

  return explanation;
}

/**
 * Generate improvement recommendations
 */
function generateRecommendations(featureImportance) {
  const recommendations = [];

  Object.entries(featureImportance).forEach(([feature, data]) => {
    if (feature === "totalVolume" && data.rawValue < 50) {
      recommendations.push("📈 Increase transaction volume organically");
    }
    if (feature === "uniqueCounterparties" && data.rawValue < 3) {
      recommendations.push("🤝 Transact with different counterparties");
    }
    if (feature === "assetDiversity" && data.rawValue < 2) {
      recommendations.push("🎯 Diversify transactions with different assets");
    }
    if (feature === "nightDayRatio" && data.rawValue > 0.3) {
      recommendations.push("🌞 Make more transactions during daytime hours");
    }
  });

  if (recommendations.length === 0) {
    recommendations.push(
      "🎉 Excellent! Your risk profile is in great condition"
    );
  }

  return recommendations;
}

/**
 * Fallback rule-based calculation if ML fails
 */
function fallbackRiskCalculation(metrics) {
  let score = 50; // Start with medium risk

  // Simple rule-based adjustments
  if (metrics.totalVolume > 100) score -= 15;
  if (metrics.uniqueCounterparties > 5) score -= 10;
  if (metrics.assetDiversity > 2) score -= 10;
  if (metrics.nightDayRatio > 0.5) score += 20;

  score = Math.max(0, Math.min(100, score));

  return {
    riskScore: score,
    tier: calculateTier(score),
    confidence: 75,
    featureImportance: {},
    explanation: ["📊 Simple rule-based calculation was used"],
    recommendations: ["🔄 Try again for more detailed analysis"],
    rawMetrics: metrics,
    modelVersion: "fallback-1.0",
  };
}

/**
 * Check if we can improve score prediction with more data
 */
export function getDataQualityScore(metrics) {
  let qualityScore = 0;

  if (metrics.totalPayments > 10) qualityScore += 25;
  if (metrics.uniqueCounterparties > 3) qualityScore += 25;
  if (metrics.assetDiversity > 1) qualityScore += 25;
  if (metrics.totalPayments > 0) qualityScore += 25;

  return {
    score: qualityScore,
    isGood: qualityScore >= 75,
    needsMoreData: qualityScore < 50,
  };
}
