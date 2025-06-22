"use client";

/**
 * Blend Protocol History Analyzer
 * Analyzes user's past lending, borrowing, and repayment behavior
 */

const HORIZON_URL = "https://horizon-testnet.stellar.org";

// Known Blend Protocol contract addresses (testnet)
const BLEND_CONTRACTS = [
  "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQAOBKXN7AEO", // Example Blend pool
  "CB64D3G7SM2RTH6JSGG34DDTFTQ5CFDKVDZJZSODMCX4NJ2HV2KN7OHT", // Another pool
  // Add more known Blend contract addresses
];

/**
 * Analyze user's Blend Protocol history
 * @param {string} walletAddress - User's Stellar address
 * @returns {Promise<Object>} Historical performance analysis
 */
export async function analyzeBlendHistory(walletAddress) {
  try {
   

    // Fetch all transactions for the user
    const transactions = await fetchAllUserTransactions(walletAddress);

    // Filter Blend-related transactions
    const blendTransactions = await filterBlendTransactions(transactions);
   

    // Analyze lending and borrowing patterns
    const behaviorMetrics = analyzeBehaviorMetrics(
      blendTransactions,
      walletAddress
    );

    // Calculate score impact
    const scoreImpact = calculateScoreImpact(behaviorMetrics);

    // Generate performance insights
    const insights = generatePerformanceInsights(behaviorMetrics);

    const result = {
      success: true,
      metrics: behaviorMetrics,
      scoreImpact,
      insights,
      transactionCount: blendTransactions.length,
      timestamp: Date.now(),
    };

    return result;
  } catch (error) {
    console.error("❌ Blend history analysis failed:", error);
    return {
      success: false,
      error: error.message,
      metrics: null,
      scoreImpact: 0,
    };
  }
}

/**
 * Fetch all user transactions (not limited to 30 days)
 */
async function fetchAllUserTransactions(walletAddress) {
  let allTransactions = [];
  let cursor = null;
  let hasMore = true;
  let pageCount = 0;

  while (hasMore && pageCount < 50) {
    // Safety limit
    try {
      let url = `${HORIZON_URL}/accounts/${walletAddress}/transactions?order=desc&limit=200`;
      if (cursor) {
        url += `&cursor=${cursor}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (!data._embedded || !data._embedded.records) {
        break;
      }

      const records = data._embedded.records;
      allTransactions.push(...records);

      // Check for next page
      cursor = data._links?.next?.href
        ? new URL(data._links.next.href).searchParams.get("cursor")
        : null;

      if (!cursor || records.length < 200) {
        hasMore = false;
      }

      pageCount++;
    } catch (error) {
      console.warn(`⚠️ Error fetching transaction page ${pageCount}:`, error);
      break;
    }
  }

  return allTransactions;
}

/**
 * Filter transactions that involve Blend Protocol contracts
 */
async function filterBlendTransactions(transactions) {
  const blendTransactions = [];

  for (const tx of transactions) {
    try {
      // Get transaction operations
      const operationsResponse = await fetch(
        `${HORIZON_URL}/transactions/${tx.id}/operations`
      );
      const operationsData = await operationsResponse.json();

      if (operationsData._embedded && operationsData._embedded.records) {
        const operations = operationsData._embedded.records;

        // Check if any operation involves Blend contracts
        const hasBlendOperation = operations.some((op) => {
          // Check for invoke_host_function operations (Soroban contract calls)
          if (op.type === "invoke_host_function") {
            return BLEND_CONTRACTS.some(
              (contract) =>
                op.source_account === contract ||
                (op.parameters &&
                  JSON.stringify(op.parameters).includes(contract))
            );
          }

          // Check for payments to/from Blend contracts
          if (op.type === "payment") {
            return (
              BLEND_CONTRACTS.includes(op.from) ||
              BLEND_CONTRACTS.includes(op.to)
            );
          }

          return false;
        });

        if (hasBlendOperation) {
          blendTransactions.push({
            ...tx,
            operations: operations,
          });
        }
      }
    } catch (error) {
      console.warn(`⚠️ Error analyzing transaction ${tx.id}:`, error);
    }
  }

  return blendTransactions;
}

/**
 * Analyze lending and borrowing behavior metrics
 */
function analyzeBehaviorMetrics(blendTransactions, walletAddress) {
  let totalLendVolume = 0;
  let totalBorrowVolume = 0;
  let totalRepaid = 0;
  let latePayments = 0;
  let onTimePayments = 0;
  let liquidityContributions = [];

  const transactionHistory = [];

  blendTransactions.forEach((tx) => {
    tx.operations?.forEach((op) => {
      const txDate = new Date(tx.created_at);
      const amount = parseFloat(op.amount || 0);

      // Analyze operation type based on function name or operation type
      let operationType = "unknown";
      let status = "completed";

      if (op.type === "invoke_host_function") {
        // Try to determine operation type from function name
        const functionName = op.function_name || "";
        if (functionName.includes("supply") || functionName.includes("lend")) {
          operationType = "lend";
          totalLendVolume += amount;
        } else if (functionName.includes("borrow")) {
          operationType = "borrow";
          totalBorrowVolume += amount;
        } else if (functionName.includes("repay")) {
          operationType = "repay";
          totalRepaid += amount;

          // Simple heuristic for late payment detection
          // In real implementation, this would check against due dates
          const daysSinceTransaction =
            (Date.now() - txDate.getTime()) / (1000 * 60 * 60 * 24);
          if (daysSinceTransaction > 30) {
            latePayments++;
            status = "late";
          } else {
            onTimePayments++;
            status = "on_time";
          }
        }
      } else if (op.type === "payment") {
        // Determine if it's lending or borrowing based on direction
        if (op.from === walletAddress) {
          operationType = "lend";
          totalLendVolume += amount;
        } else if (op.to === walletAddress) {
          operationType = "borrow";
          totalBorrowVolume += amount;
        }
      }

      if (operationType !== "unknown" && amount > 0) {
        transactionHistory.push({
          date: txDate,
          type: operationType,
          amount: amount,
          status: status,
          txId: tx.id,
        });
      }
    });
  });

  // Calculate repayment rate
  const repaymentRate =
    totalBorrowVolume > 0
      ? Math.min(100, (totalRepaid / totalBorrowVolume) * 100)
      : 100;

  // Estimate liquidity contribution (simplified)
  const avgLiquidityContribution =
    totalLendVolume > 0 ? Math.min(5, (totalLendVolume / 10000) * 100) : 0; // Assume pool TVL ~10k for calculation

  return {
    totalLendVolume: Math.round(totalLendVolume * 100) / 100,
    totalBorrowVolume: Math.round(totalBorrowVolume * 100) / 100,
    totalRepaid: Math.round(totalRepaid * 100) / 100,
    repaymentRate: Math.round(repaymentRate * 100) / 100,
    latePayments,
    onTimePayments,
    liquidityContribution: Math.round(avgLiquidityContribution * 100) / 100,
    transactionHistory: transactionHistory.slice(0, 20), // Limit to recent 20 transactions
    totalTransactions: transactionHistory.length,
  };
}

/**
 * Calculate score impact based on behavior metrics
 */
function calculateScoreImpact(metrics) {
  let scoreChange = 0;
  const impacts = [];

  // Repayment rate impact
  if (metrics.repaymentRate >= 90) {
    scoreChange += 10;
    impacts.push({
      factor: "Excellent Repayment Rate",
      impact: +10,
      description: `${metrics.repaymentRate}% geri ödeme oranı`,
    });
  } else if (metrics.repaymentRate >= 70) {
    scoreChange += 5;
    impacts.push({
      factor: "Good Repayment Rate",
      impact: +5,
      description: `${metrics.repaymentRate}% geri ödeme oranı`,
    });
  } else if (metrics.repaymentRate < 50) {
    scoreChange -= 10;
    impacts.push({
      factor: "Poor Repayment Rate",
      impact: -10,
      description: `${metrics.repaymentRate}% geri ödeme oranı`,
    });
  }

  // Late payment penalty
  if (metrics.latePayments > 0) {
    const penalty = Math.min(15, metrics.latePayments * 3);
    scoreChange -= penalty;
    impacts.push({
      factor: "Late Payments",
      impact: -penalty,
      description: `${metrics.latePayments} geç ödeme`,
    });
  }

  // Liquidity contribution bonus
  if (metrics.liquidityContribution >= 1) {
    scoreChange += 5;
    impacts.push({
      factor: "Significant Liquidity Contribution",
      impact: +5,
      description: `%${metrics.liquidityContribution} likidite katkısı`,
    });
  }

  // Volume bonus (for active users)
  if (metrics.totalLendVolume > 1000) {
    scoreChange += 3;
    impacts.push({
      factor: "High Lending Volume",
      impact: +3,
      description: `${metrics.totalLendVolume} XLM toplam borç verme`,
    });
  }

  return {
    totalChange: Math.max(-25, Math.min(25, scoreChange)), // Cap at ±25 points
    impacts,
    breakdown: {
      repaymentBonus:
        impacts.find((i) => i.factor.includes("Repayment"))?.impact || 0,
      latePaymentPenalty:
        impacts.find((i) => i.factor === "Late Payments")?.impact || 0,
      liquidityBonus:
        impacts.find((i) => i.factor.includes("Liquidity"))?.impact || 0,
      volumeBonus:
        impacts.find((i) => i.factor.includes("Volume"))?.impact || 0,
    },
  };
}

/**
 * Generate performance insights and recommendations
 */
function generatePerformanceInsights(metrics) {
  const insights = [];

  if (metrics.totalTransactions === 0) {
    insights.push({
      type: "info",
      message: "Blend Protocol geçmişi bulunamadı",
      recommendation: "İlk borç verme işleminizi yaparak başlayın",
    });
    return insights;
  }

  if (metrics.repaymentRate >= 90) {
    insights.push({
      type: "positive",
      message: "Mükemmel geri ödeme geçmişi",
      recommendation: "Risk skorunuz artırıldı",
    });
  } else if (metrics.repaymentRate < 70) {
    insights.push({
      type: "warning",
      message: "Geri ödeme oranı düşük",
      recommendation: "Borçları zamanında ödeyin",
    });
  }

  if (metrics.latePayments > 0) {
    insights.push({
      type: "negative",
      message: `${metrics.latePayments} geç ödeme tespit edildi`,
      recommendation: "Gelecekteki ödemeleri zamanında yapın",
    });
  }

  if (metrics.totalLendVolume > metrics.totalBorrowVolume * 2) {
    insights.push({
      type: "positive",
      message: "Aktif likidite sağlayıcısı",
      recommendation: "Protokole katkınız için bonus puan",
    });
  }

  return insights;
}

/**
 * Get cached Blend history if available
 */
export function getCachedBlendHistory(walletAddress) {
  try {
    const cached = localStorage.getItem(`blend_history_${walletAddress}`);
    if (cached) {
      const data = JSON.parse(cached);
      // Cache valid for 1 hour
      const hourAgo = Date.now() - 60 * 60 * 1000;
      if (data.timestamp > hourAgo) {
        return data;
      }
    }
  } catch (error) {
    console.warn(`⚠️ Error reading cached Blend history:`, error);
  }
  return null;
}

/**
 * Cache Blend history analysis
 */
export function cacheBlendHistory(walletAddress, analysisData) {
  try {
    localStorage.setItem(
      `blend_history_${walletAddress}`,
      JSON.stringify(analysisData)
    );
  } catch (error) {
    console.warn(`⚠️ Error caching Blend history:`, error);
  }
}
