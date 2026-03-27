"use client";

/**
 * Blend Protocol History Analyzer
 * Analyzes user's supply, borrow, repay, and withdraw history on Blend V2
 * using Soroban contract events from the pool contract.
 */

import { BLEND_CONTRACTS, BLEND_ASSETS, BLEND_NETWORK } from "./blendConfig.js";
import { poolEventV2FromEventResponse } from "@blend-capital/blend-sdk";
import { Address } from "@stellar/stellar-sdk";

const SOROBAN_RPC_URL = BLEND_NETWORK.rpc;

// Pool contracts to query events from
const POOL_CONTRACT_ADDRESSES = [BLEND_CONTRACTS.MAIN_POOL_V2];

// Reverse map: asset address → ticker symbol
const ADDRESS_TO_TICKER = Object.fromEntries(
  Object.entries(BLEND_ASSETS).map(([ticker, addr]) => [addr, ticker])
);

// User-facing event types emitted by the Blend pool
const USER_EVENT_TYPES = new Set([
  "supply",
  "supply_collateral",
  "withdraw",
  "withdraw_collateral",
  "borrow",
  "repay",
]);

// Max pages to fetch per pool to guard against infinite loops (200 events/page)
const MAX_PAGES = 15;

/**
 * Probe the RPC with an impossible startLedger to extract the oldest available
 * ledger from the error message.  Falls back to (latestLedger - 100_000) on
 * any unexpected response.
 */
async function getOldestAvailableLedger(latestLedger) {
  const resp = await fetch(SOROBAN_RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 99,
      method: "getEvents",
      params: {
        startLedger: 1,
        filters: [{ type: "contract", contractIds: [POOL_CONTRACT_ADDRESSES[0]] }],
        pagination: { limit: 1 },
      },
    }),
  });
  const data = await resp.json();
  if (data.error?.message) {
    // "startLedger must be within the ledger range: 1570997 - 1691926"
    const match = data.error.message.match(/(\d+)\s*-\s*\d+/);
    if (match) return parseInt(match[1], 10);
  }
  return Math.max(1, latestLedger - 100000);
}

/**
 * Fetch ALL raw Soroban events emitted by poolAddress from oldestLedger to
 * current, following pagination cursors.  Stops after MAX_PAGES pages.
 *
 * topicFilter (optional) is an array like ["*", "*", base64XdrAddress] for
 * server-side filtering — far more efficient than client-side when the pool
 * has thousands of events.
 *
 * IMPORTANT: cursor requests must NOT include startLedger or filters — only
 * pagination.cursor + pagination.limit.  Also, a page with fewer than `limit`
 * events still carries a valid cursor; we must not stop early just because
 * events.length < limit.
 */
async function fetchAllPoolEvents(poolAddress, oldestLedger, topicFilter = null) {
  const allEvents = [];
  let cursor = null;
  let page = 0;

  // Build the filter once and reuse for every page (including cursor-based ones).
  // Dropping the filter on cursor requests would return events from ALL contracts.
  const filter = { type: "contract", contractIds: [poolAddress] };
  if (topicFilter) filter.topics = [topicFilter];

  while (page < MAX_PAGES) {
    let params;
    if (cursor) {
      // Keep the same filter — cursor replaces startLedger, not the filter.
      params = { filters: [filter], pagination: { limit: 200, cursor } };
    } else {
      params = {
        startLedger: oldestLedger + 1,
        filters: [filter],
        pagination: { limit: 200 },
      };
    }

    const resp = await fetch(SOROBAN_RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: page + 1,
        method: "getEvents",
        params,
      }),
    });
    const data = await resp.json();

    if (data.error) {
      console.warn("⚠️ getEvents error:", data.error.message);
      break;
    }

    const events = data.result?.events ?? [];
    allEvents.push(...events);
    page++;

    cursor = data.result?.cursor ?? null;
    // Stop only when the API signals no more events (no cursor, or empty page)
    if (!cursor || events.length === 0) break;
  }

  return allEvents;
}

/**
 * Analyze user's Blend Protocol history
 * @param {string} walletAddress - User's Stellar address
 * @returns {Promise<Object>} Historical performance analysis
 */
export async function analyzeBlendHistory(walletAddress) {
  try {
    // 1. Get current ledger and oldest available ledger in one round-trip
    const latestResp = await fetch(SOROBAN_RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getLatestLedger",
        params: {},
      }),
    });
    const latestData = await latestResp.json();
    const latestLedger = latestData.result?.sequence ?? 0;

    const oldestLedger = await getOldestAvailableLedger(latestLedger);

    // 2. Build a server-side topic filter for the user address.
    // SDK source confirms: for supply/borrow/repay/withdraw events, topic layout is:
    //   topic[0] = event name (symbol)
    //   topic[1] = asset address
    //   topic[2] = "from" user address  ← filter here
    // Address.fromString().toScVal() produces the correct XDR encoding.
    let topicFilter = null;
    try {
      const addrXdr = Address.fromString(walletAddress.trim()).toScVal().toXDR("base64");
      topicFilter = ["*", "*", addrXdr];
    } catch (e) {
      console.warn("⚠️ Could not encode address for topic filter, fetching all events:", e.message);
    }

    // 3. Fetch matching pool events (filter applied to every page).
    const allRawEvents = [];
    for (const poolAddress of POOL_CONTRACT_ADDRESSES) {
      const events = await fetchAllPoolEvents(poolAddress, oldestLedger, topicFilter);
      allRawEvents.push(...events);
    }
    console.log(`📡 Fetched ${allRawEvents.length} pool events for ${walletAddress}`);

    // 4. Parse with Blend SDK and keep only this user's supply/borrow/repay/withdraw events.
    // The topic filter already narrows results server-side; the .from check is a safety net.
    // Normalise addresses with .trim() to guard against hidden whitespace.
    const normalizedWallet = walletAddress.trim();
    const userEvents = [];
    for (const rawEvent of allRawEvents) {
      let parsed;
      try {
        parsed = poolEventV2FromEventResponse(rawEvent);
      } catch {
        continue;
      }
      if (!parsed) continue;
      if (!USER_EVENT_TYPES.has(parsed.eventType)) continue;
      if (!parsed.from || parsed.from.trim() !== normalizedWallet) continue;
      userEvents.push(parsed);
    }
    console.log(`👤 Found ${userEvents.length} events for wallet ${normalizedWallet}`);

    // Sort oldest-first for metric calculation
    userEvents.sort((a, b) => a.ledger - b.ledger);

    const behaviorMetrics = buildMetrics(userEvents);
    const scoreImpact = calculateScoreImpact(behaviorMetrics);
    const insights = generatePerformanceInsights(behaviorMetrics);

    return {
      success: true,
      metrics: behaviorMetrics,
      scoreImpact,
      insights,
      transactionCount: userEvents.length,
      timestamp: Date.now(),
    };
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
 * Build behavior metrics from a user's parsed Blend pool events.
 * All event amounts are bigint in raw 7-decimal form (1 XLM = 10_000_000).
 */
function buildMetrics(userEvents) {
  let totalLendVolume = 0;
  let totalBorrowVolume = 0;
  let totalRepaid = 0;
  let totalWithdrawn = 0;
  const transactionHistory = [];

  for (const event of userEvents) {
    // Convert from raw stroop-like units (7 decimals) to token float
    const amount = Number(event.amount) / 1e7;
    const assetTicker = ADDRESS_TO_TICKER[event.assetId] ?? "TOKEN";
    const eventDate = new Date(event.ledgerClosedAt);

    let operationType;
    switch (event.eventType) {
      case "supply":
      case "supply_collateral":
        operationType = "supply";
        totalLendVolume += amount;
        break;
      case "borrow":
        operationType = "borrow";
        totalBorrowVolume += amount;
        break;
      case "repay":
        operationType = "repay";
        totalRepaid += amount;
        break;
      case "withdraw":
      case "withdraw_collateral":
        operationType = "withdraw";
        totalWithdrawn += amount;
        break;
      default:
        continue;
    }

    transactionHistory.push({
      date: eventDate,
      type: operationType,
      amount: Math.round(amount * 1000) / 1000,
      asset: assetTicker,
      status: "completed",
      txId: event.txHash,
    });
  }

  // Sort most-recent first for display
  transactionHistory.sort((a, b) => b.date - a.date);

  const repaymentRate =
    totalBorrowVolume > 0
      ? Math.min(100, (totalRepaid / totalBorrowVolume) * 100)
      : 100;

  const avgLiquidityContribution =
    totalLendVolume > 0 ? Math.min(5, (totalLendVolume / 10000) * 100) : 0;

  return {
    totalLendVolume: Math.round(totalLendVolume * 100) / 100,
    totalBorrowVolume: Math.round(totalBorrowVolume * 100) / 100,
    totalRepaid: Math.round(totalRepaid * 100) / 100,
    totalWithdrawn: Math.round(totalWithdrawn * 100) / 100,
    repaymentRate: Math.round(repaymentRate * 100) / 100,
    latePayments: 0, // Cannot reliably detect from on-chain events alone
    onTimePayments: totalRepaid > 0 ? 1 : 0,
    liquidityContribution: Math.round(avgLiquidityContribution * 100) / 100,
    transactionHistory: transactionHistory.slice(0, 20),
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
      description: `${metrics.repaymentRate}% repayment rate`,
    });
  } else if (metrics.repaymentRate >= 70) {
    scoreChange += 5;
    impacts.push({
      factor: "Good Repayment Rate",
      impact: +5,
      description: `${metrics.repaymentRate}% repayment rate`,
    });
  } else if (metrics.repaymentRate < 50) {
    scoreChange -= 10;
    impacts.push({
      factor: "Poor Repayment Rate",
      impact: -10,
      description: `${metrics.repaymentRate}% repayment rate`,
    });
  }

  // Late payment penalty
  if (metrics.latePayments > 0) {
    const penalty = Math.min(15, metrics.latePayments * 3);
    scoreChange -= penalty;
    impacts.push({
      factor: "Late Payments",
      impact: -penalty,
      description: `${metrics.latePayments} late payments`,
    });
  }

  // Liquidity contribution bonus
  if (metrics.liquidityContribution >= 1) {
    scoreChange += 5;
    impacts.push({
      factor: "Significant Liquidity Contribution",
      impact: +5,
      description: `${metrics.liquidityContribution}% liquidity contribution`,
    });
  }

  // Volume bonus (for active users)
  if (metrics.totalLendVolume > 1000) {
    scoreChange += 3;
    impacts.push({
      factor: "High Lending Volume",
      impact: +3,
      description: `${metrics.totalLendVolume} XLM total lending`,
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
      message: "No Blend Protocol history found",
      recommendation: "Start by making your first lending transaction",
    });
    return insights;
  }

  if (metrics.repaymentRate >= 90) {
    insights.push({
      type: "positive",
      message: "Excellent repayment history",
      recommendation: "Your risk score has been improved",
    });
  } else if (metrics.repaymentRate < 70) {
    insights.push({
      type: "warning",
      message: "Low repayment rate",
      recommendation: "Pay debts on time",
    });
  }

  if (metrics.latePayments > 0) {
    insights.push({
      type: "negative",
      message: `${metrics.latePayments} late payments detected`,
      recommendation: "Make future payments on time",
    });
  }

  if (metrics.totalLendVolume > metrics.totalBorrowVolume * 2) {
    insights.push({
      type: "positive",
      message: "Active liquidity provider",
      recommendation: "Bonus points for your contribution to the protocol",
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
