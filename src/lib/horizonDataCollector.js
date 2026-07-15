"use client";

import { getCache, setCache } from './cacheManager';
import { CACHE_KEYS } from '../types/cache';

/**
 * Horizon Data Collector
 * Collects last 30 days transaction data for automated risk analysis
 * Now with intelligent caching (5min TTL)
 */

const HORIZON_URL = "https://horizon-testnet.stellar.org";
const DAYS_TO_ANALYZE = 30;
const HORIZON_CACHE_TTL = 5 * 60 * 1000; // 5 minutes for Horizon data

/**
 * Collect comprehensive transaction data for risk analysis
 * @param {string} walletAddress - User's Stellar address
 * @returns {Promise<Object>} Analysis data with 4 key metrics
 */
/**
 * Horizon's /accounts endpoints are ed25519-only: every one of them answers 400
 * for a contract address. A passkey smart wallet is a C... contract, so asking
 * Horizon about it produced a pair of guaranteed-400 requests and a red console
 * on every analysis. Detect it before the network call instead of after.
 */
export function isSmartWalletAddress(address) {
  return typeof address === "string" && /^C[A-Z2-7]{55}$/.test(address.trim());
}

export async function collectTransactionData(walletAddress) {
  try {
    if (isSmartWalletAddress(walletAddress)) {
      // Not an error and not a zero score — unknown. See the note in
      // riskOracle.assertValidStellarAddress for why this is structural.
      return {
        success: false,
        unscorable: true,
        reason:
          "Smart wallets (C...) have no classic payment history. Horizon indexes payments for account addresses (G...) only.",
        timestamp: Date.now(),
      };
    }

    // Check cache first
    const cacheKey = `${CACHE_KEYS.HORIZON_DATA}_${walletAddress}`;
    const cachedData = await getCache(cacheKey);
    
    if (cachedData) {
      console.log("🚀 Using cached Horizon data");
      return cachedData;
    }

    console.log("📡 Fetching fresh Horizon data...");

    // Calculate date range (last 30 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - DAYS_TO_ANALYZE);

    // Collect both payments and transactions
    const [payments, transactions] = await Promise.all([
      fetchPayments(walletAddress, startDate, endDate),
      fetchTransactions(walletAddress, startDate, endDate),
    ]);

    

    // Calculate the 4 key metrics
    const metrics = calculateRiskMetrics(payments, transactions, walletAddress);

    const result = {
      success: true,
      metrics,
      dataPoints: {
        payments: payments.length,
        transactions: transactions.length,
        period: DAYS_TO_ANALYZE,
      },
      timestamp: Date.now(),
    };

    // Cache the result
    await setCache(cacheKey, result, { 
      ttl: HORIZON_CACHE_TTL,
      useIndexedDB: true // Horizon data can be large
    });

    return result;
  } catch (error) {
    console.error("❌ Data collection failed:", error);
    return {
      success: false,
      error: error.message,
      metrics: null,
    };
  }
}

/**
 * Fetch payment operations from Horizon
 */
async function fetchPayments(walletAddress, startDate, endDate) {
  let payments = [];
  let cursor = null;
  let hasMore = true;

  while (hasMore && payments.length < 1000) {
    // Safety limit
    try {
      let url = `${HORIZON_URL}/accounts/${walletAddress}/payments?order=desc&limit=200`;
      if (cursor) {
        url += `&cursor=${cursor}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (!data._embedded || !data._embedded.records) {
        break;
      }

      const records = data._embedded.records;

      for (const payment of records) {
        const paymentDate = new Date(payment.created_at);

        // Stop if we've gone beyond our date range
        if (paymentDate < startDate) {
          hasMore = false;
          break;
        }

        // Only include payments within our range
        if (paymentDate >= startDate && paymentDate <= endDate) {
          payments.push({
            id: payment.id,
            amount: parseFloat(payment.amount || 0),
            asset_type: payment.asset_type || "native",
            asset_code: payment.asset_code || "XLM",
            from: payment.from,
            to: payment.to,
            created_at: payment.created_at,
            type: payment.type,
          });
        }
      }

      // Check for next page
      cursor = data._links?.next?.href
        ? new URL(data._links.next.href).searchParams.get("cursor")
        : null;

      if (!cursor || records.length < 200) {
        hasMore = false;
      }
    } catch (error) {
      console.warn(`⚠️ Error fetching payments page:`, error);
      break;
    }
  }

  return payments;
}

/**
 * Fetch transaction operations from Horizon
 */
async function fetchTransactions(walletAddress, startDate, endDate) {
  let transactions = [];
  let cursor = null;
  let hasMore = true;

  while (hasMore && transactions.length < 1000) {
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

      for (const tx of records) {
        const txDate = new Date(tx.created_at);

        // Stop if we've gone beyond our date range
        if (txDate < startDate) {
          hasMore = false;
          break;
        }

        // Only include transactions within our range
        if (txDate >= startDate && txDate <= endDate) {
          transactions.push({
            id: tx.id,
            fee_charged: parseInt(tx.fee_charged || 0),
            operation_count: tx.operation_count,
            created_at: tx.created_at,
            successful: tx.successful,
          });
        }
      }

      // Check for next page
      cursor = data._links?.next?.href
        ? new URL(data._links.next.href).searchParams.get("cursor")
        : null;

      if (!cursor || records.length < 200) {
        hasMore = false;
      }
    } catch (error) {
      console.warn(`⚠️ Error fetching transactions page:`, error);
      break;
    }
  }

  return transactions;
}

/**
 * Calculate the 4 key risk metrics
 */
function calculateRiskMetrics(payments, transactions, walletAddress) {
  // 1. Total Volume (in XLM)
  const totalVolume = payments.reduce((sum, payment) => {
    // Convert all assets to XLM equivalent (simplified)
    const xlmAmount =
      payment.asset_code === "XLM" || payment.asset_type === "native"
        ? payment.amount
        : payment.amount * 0.1; // Simplified conversion rate
    return sum + xlmAmount;
  }, 0);

  // 2. Unique Counterparties
  const counterparties = new Set();
  payments.forEach((payment) => {
    if (payment.from !== walletAddress) counterparties.add(payment.from);
    if (payment.to !== walletAddress) counterparties.add(payment.to);
  });
  const uniqueCounterparties = counterparties.size;

  // 3. Asset Diversity
  const assets = new Set();
  payments.forEach((payment) => {
    const assetId = payment.asset_code || "XLM";
    assets.add(assetId);
  });
  const assetDiversity = assets.size;

  // nightDayRatio was removed in model v3.0.0 — see the note in
  // lightweightRiskModel.js. Beyond the reasons given there, this copy used
  // getHours() (the visitor's local timezone) while the server used
  // getUTCHours(), so the score shown in the browser and the score written on
  // chain disagreed for the same wallet depending on where the visitor was.

  return {
    totalVolume: Math.round(totalVolume * 100) / 100,
    uniqueCounterparties,
    assetDiversity,
    // Additional context
    totalPayments: payments.length,
    totalTransactions: transactions.length,
    averageTransactionSize:
      payments.length > 0
        ? Math.round((totalVolume / payments.length) * 100) / 100
        : 0,
  };
}

/**
 * Check if data collection is recent enough (within 1 hour)
 */
export function isDataFresh(timestamp) {
  const hourAgo = Date.now() - 60 * 60 * 1000;
  return timestamp && timestamp > hourAgo;
}

/**
 * Get cached analysis data if available and fresh
 */
export function getCachedAnalysis(walletAddress) {
  try {
    const cached = localStorage.getItem(`horizon_analysis_${walletAddress}`);
    if (cached) {
      const data = JSON.parse(cached);
      if (isDataFresh(data.timestamp)) {
        return data;
      }
    }
  } catch (error) {
    console.warn(`⚠️ Error reading cached analysis:`, error);
  }
  return null;
}

/**
 * Cache analysis data
 */
export function cacheAnalysis(walletAddress, analysisData) {
  try {
    localStorage.setItem(
      `horizon_analysis_${walletAddress}`,
      JSON.stringify(analysisData)
    );
  } catch (error) {
    console.warn(`⚠️ Error caching analysis:`, error);
  }
}
