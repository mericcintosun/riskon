"use client";

// Automatic Risk Analysis from Stellar Horizon API
// Analyzes wallet transaction history to calculate risk factors

const HORIZON_URL = "https://horizon-testnet.stellar.org";

/**
 * Fetch transaction history from Stellar Horizon API
 */
export async function fetchTransactionHistory(walletAddress, limit = 100) {
  try {
    console.log(`🔍 Fetching transaction history for: ${walletAddress}`);

    // Fetch transactions
    const transactionResponse = await fetch(
      `${HORIZON_URL}/accounts/${walletAddress}/transactions?order=desc&limit=${limit}`
    );

    if (!transactionResponse.ok) {
      throw new Error(
        `Failed to fetch transactions: ${transactionResponse.status}`
      );
    }

    const transactionData = await transactionResponse.json();

    // Fetch operations for more detailed analysis
    const operationResponse = await fetch(
      `${HORIZON_URL}/accounts/${walletAddress}/operations?order=desc&limit=${
        limit * 2
      }`
    );

    let operationData = { _embedded: { records: [] } };
    if (operationResponse.ok) {
      operationData = await operationResponse.json();
    }

    console.log(
      `✅ Fetched ${transactionData._embedded.records.length} transactions and ${operationData._embedded.records.length} operations`
    );

    return {
      transactions: transactionData._embedded.records,
      operations: operationData._embedded.records,
    };
  } catch (error) {
    console.error("❌ Error fetching transaction history:", error);
    throw new Error(`Failed to fetch transaction history: ${error.message}`);
  }
}

/**
 * Fetch account balances and asset information
 */
export async function fetchAccountAssets(walletAddress) {
  try {
    const response = await fetch(`${HORIZON_URL}/accounts/${walletAddress}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch account: ${response.status}`);
    }

    const accountData = await response.json();
    return accountData.balances || [];
  } catch (error) {
    console.error("❌ Error fetching account assets:", error);
    return [];
  }
}

/**
 * Analyze transaction patterns to extract risk factors
 */
export function analyzeTransactionPatterns(transactions, operations) {
  try {
    console.log("📊 Analyzing transaction patterns...");

    if (!transactions || transactions.length === 0) {
      console.warn(
        "⚠️ No transactions found, using default low-activity values"
      );
      return {
        txCount: 1, // Low activity
        avgHours: 12, // Default interval
        assetTypes: 1, // Only XLM
        avgAmount: 0,
        maxAmount: 0,
        nightRatio: 0.5,
        activityScore: 10, // Low activity = higher risk
      };
    }

    // 1. Transaction count (normalized to 0-100 scale)
    const txCount = Math.min(100, transactions.length);

    // 2. Calculate time intervals between transactions
    const timeIntervals = [];
    for (let i = 0; i < transactions.length - 1; i++) {
      const current = new Date(transactions[i].created_at);
      const next = new Date(transactions[i + 1].created_at);
      const hoursDiff = Math.abs(current - next) / (1000 * 60 * 60); // Convert to hours
      timeIntervals.push(hoursDiff);
    }

    const avgHours =
      timeIntervals.length > 0
        ? Math.min(
            24,
            timeIntervals.reduce((a, b) => a + b, 0) / timeIntervals.length
          )
        : 12; // Default 12 hours if no intervals

    // 3. Analyze asset diversity from operations
    const uniqueAssets = new Set();
    const paymentAmounts = [];

    operations.forEach((op) => {
      if (
        op.type === "payment" ||
        op.type === "create_account" ||
        op.type === "path_payment_strict_receive"
      ) {
        // Add asset to diversity count
        if (op.asset_type === "native") {
          uniqueAssets.add("XLM");
        } else if (op.asset_code) {
          uniqueAssets.add(op.asset_code);
        }

        // Collect payment amounts for analysis
        if (op.amount) {
          paymentAmounts.push(parseFloat(op.amount));
        }
      }
    });

    const assetTypes = Math.min(10, uniqueAssets.size || 1); // Max 10 for normalization

    // 4. Calculate amount statistics
    const avgAmount =
      paymentAmounts.length > 0
        ? paymentAmounts.reduce((a, b) => a + b, 0) / paymentAmounts.length
        : 0;
    const maxAmount =
      paymentAmounts.length > 0 ? Math.max(...paymentAmounts) : 0;

    // 5. Analyze day/night transaction pattern
    const nightTransactions = transactions.filter((tx) => {
      const hour = new Date(tx.created_at).getUTCHours();
      return hour >= 22 || hour <= 6; // 22:00 - 06:00 UTC as "night"
    });
    const nightRatio =
      transactions.length > 0
        ? nightTransactions.length / transactions.length
        : 0.5;

    // 6. Calculate activity score (more recent = lower risk)
    const recentTransactions = transactions.filter((tx) => {
      const txDate = new Date(tx.created_at);
      const daysSince = (Date.now() - txDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysSince <= 30; // Last 30 days
    });
    const activityScore = Math.min(
      100,
      (recentTransactions.length / Math.max(1, transactions.length)) * 100
    );

    const analysis = {
      txCount: Math.round(txCount),
      avgHours: Math.round(avgHours * 10) / 10, // Round to 1 decimal
      assetTypes: Math.round(assetTypes),
      avgAmount: Math.round(avgAmount * 100) / 100, // Round to 2 decimals
      maxAmount: Math.round(maxAmount * 100) / 100,
      nightRatio: Math.round(nightRatio * 100) / 100,
      activityScore: Math.round(activityScore),
      uniqueAssetsFound: Array.from(uniqueAssets),
      totalOperations: operations.length,
      analysisTimestamp: new Date().toISOString(),
    };

    console.log("📈 Transaction pattern analysis completed:", analysis);
    return analysis;
  } catch (error) {
    console.error("❌ Error analyzing transaction patterns:", error);
    // Return safe defaults on error
    return {
      txCount: 5,
      avgHours: 12,
      assetTypes: 1,
      avgAmount: 0,
      maxAmount: 0,
      nightRatio: 0.5,
      activityScore: 20,
    };
  }
}

/**
 * Enhanced risk score calculation based on automatic analysis
 */
export function calculateAutoRiskScore(analysis) {
  try {
    console.log("🧮 Calculating automated risk score...");

    let riskScore = 0;
    const factors = [];

    // Factor 1: Transaction count (25 points max)
    let txCountRisk = 0;
    if (analysis.txCount < 3) {
      txCountRisk = 25; // Very low activity = high risk
      factors.push("Very low transaction history (+25)");
    } else if (analysis.txCount < 10) {
      txCountRisk = 15; // Low activity = medium-high risk
      factors.push("Low transaction activity (+15)");
    } else if (analysis.txCount > 80) {
      txCountRisk = 10; // Very high activity = moderate risk
      factors.push("Very high activity (+10)");
    } else {
      txCountRisk = 5; // Normal activity = low risk
      factors.push("Normal transaction activity (+5)");
    }
    riskScore += txCountRisk;

    // Factor 2: Time interval analysis (20 points max)
    let timeRisk = 0;
    if (analysis.avgHours < 0.5) {
      timeRisk = 20; // Very rapid transactions = high risk
      factors.push("Rapid-fire transactions (+20)");
    } else if (analysis.avgHours < 2) {
      timeRisk = 12; // Fast transactions = medium risk
      factors.push("Fast transaction pace (+12)");
    } else if (analysis.avgHours > 168) {
      // > 1 week
      timeRisk = 15; // Very slow transactions = medium risk
      factors.push("Infrequent transactions (+15)");
    } else {
      timeRisk = 3; // Normal timing = low risk
      factors.push("Normal transaction timing (+3)");
    }
    riskScore += timeRisk;

    // Factor 3: Asset diversity (20 points max)
    let assetRisk = 0;
    if (analysis.assetTypes <= 1) {
      assetRisk = 20; // Single asset = high risk
      factors.push("Limited asset diversity (+20)");
    } else if (analysis.assetTypes <= 2) {
      assetRisk = 10; // Low diversity = medium risk
      factors.push("Low asset diversity (+10)");
    } else if (analysis.assetTypes >= 7) {
      assetRisk = 8; // Very high diversity = complexity risk
      factors.push("High asset complexity (+8)");
    } else {
      assetRisk = 2; // Good diversity = low risk
      factors.push("Good asset diversity (+2)");
    }
    riskScore += assetRisk;

    // Factor 4: Activity recency (15 points max)
    let activityRisk = 0;
    if (analysis.activityScore < 20) {
      activityRisk = 15; // Low recent activity = risk
      factors.push("Low recent activity (+15)");
    } else if (analysis.activityScore < 50) {
      activityRisk = 8; // Medium recent activity
      factors.push("Moderate recent activity (+8)");
    } else {
      activityRisk = 2; // High recent activity = good
      factors.push("High recent activity (+2)");
    }
    riskScore += activityRisk;

    // Factor 5: Night trading pattern (10 points max)
    let nightRisk = 0;
    if (analysis.nightRatio > 0.7) {
      nightRisk = 10; // Mostly night trading = higher risk
      factors.push("Mostly night-time trading (+10)");
    } else if (analysis.nightRatio > 0.4) {
      nightRisk = 5; // Balanced day/night
      factors.push("Mixed trading hours (+5)");
    } else {
      nightRisk = 2; // Mostly day trading = lower risk
      factors.push("Mostly day-time trading (+2)");
    }
    riskScore += nightRisk;

    // Factor 6: Amount volatility (10 points max)
    let amountRisk = 0;
    if (analysis.maxAmount > 0 && analysis.avgAmount > 0) {
      const volatilityRatio = analysis.maxAmount / analysis.avgAmount;
      if (volatilityRatio > 50) {
        amountRisk = 10; // High volatility = risk
        factors.push("High amount volatility (+10)");
      } else if (volatilityRatio > 10) {
        amountRisk = 5; // Medium volatility
        factors.push("Medium amount volatility (+5)");
      } else {
        amountRisk = 1; // Low volatility = stable
        factors.push("Stable transaction amounts (+1)");
      }
    } else {
      amountRisk = 5; // No amount data = medium risk
      factors.push("Limited amount history (+5)");
    }
    riskScore += amountRisk;

    // Ensure score is within 0-100 range
    riskScore = Math.max(0, Math.min(100, Math.round(riskScore)));

    const result = {
      riskScore,
      factors,
      analysis,
      confidence:
        analysis.txCount > 5 ? "High" : analysis.txCount > 2 ? "Medium" : "Low",
      recommendation: getRiskRecommendation(riskScore),
      calculatedAt: new Date().toISOString(),
    };

    console.log("✅ Automated risk score calculated:", result);
    return result;
  } catch (error) {
    console.error("❌ Error calculating auto risk score:", error);
    return {
      riskScore: 50, // Default medium risk
      factors: ["Error in analysis - using default score"],
      analysis,
      confidence: "Low",
      recommendation: "Exercise caution due to analysis error",
      calculatedAt: new Date().toISOString(),
    };
  }
}

/**
 * Get risk-based recommendations
 */
function getRiskRecommendation(riskScore) {
  if (riskScore <= 30) {
    return "Low Risk: Suitable for higher leverage and active trading strategies";
  } else if (riskScore <= 60) {
    return "Medium Risk: Balanced approach recommended with moderate leverage";
  } else {
    return "High Risk: Conservative approach recommended with low leverage";
  }
}

/**
 * Main function to perform complete automatic risk analysis
 */
export async function performAutoRiskAnalysis(walletAddress) {
  try {
    console.log("🚀 Starting automatic risk analysis for:", walletAddress);

    if (
      !walletAddress ||
      walletAddress.length !== 56 ||
      !walletAddress.startsWith("G")
    ) {
      throw new Error("Invalid Stellar wallet address format");
    }

    // Step 1: Fetch transaction history
    const historyData = await fetchTransactionHistory(walletAddress);

    // Step 2: Fetch account assets for additional context
    const assets = await fetchAccountAssets(walletAddress);

    // Step 3: Analyze patterns
    const analysis = analyzeTransactionPatterns(
      historyData.transactions,
      historyData.operations
    );

    // Add asset balance information to analysis
    analysis.currentAssets = assets.map((balance) => ({
      asset:
        balance.asset_type === "native"
          ? "XLM"
          : balance.asset_code || "Unknown",
      balance: parseFloat(balance.balance || 0),
      asset_type: balance.asset_type,
    }));

    // Step 4: Calculate risk score
    const riskResult = calculateAutoRiskScore(analysis);

    console.log("🎯 Automatic risk analysis completed successfully");
    return riskResult;
  } catch (error) {
    console.error("❌ Automatic risk analysis failed:", error);
    throw new Error(`Auto risk analysis failed: ${error.message}`);
  }
}
