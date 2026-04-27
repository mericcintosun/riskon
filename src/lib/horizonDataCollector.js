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
export async function collectTransactionData(walletAddress) {
  try {
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
 * Fetch payment operations from Horizon API
 * @param {string} walletAddress - The Stellar wallet address to fetch payments for
 * @param {Date} startDate - Start date for the payment history range
 * @param {Date} endDate - End date for the payment history range
 * @returns {Promise<Array<Object>>} Array of payment operations with amount, asset info, and timestamps
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
 * Fetch transaction operations from Horizon API
 * @param {string} walletAddress - The Stellar wallet address to fetch transactions for
 * @param {Date} startDate - Start date for the transaction history range
 * @param {Date} endDate - End date for the transaction history range
 * @returns {Promise<Array<Object>>} Array of transaction operations with fee, operation count, and success status
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
 * Calculate the 4 key risk metrics from payment and transaction data
 * @param {Array<Object>} payments - Array of payment operations
 * @param {Array<Object>} transactions - Array of transaction operations
 * @param {string} walletAddress - The wallet address being analyzed
 * @returns {Object} Risk metrics including totalVolume, uniqueCounterparties, assetDiversity, and nightDayRatio
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

  // 4. Night/Day Transaction Ratio
  let nightTransactions = 0;
  let dayTransactions = 0;

  payments.forEach((payment) => {
    const hour = new Date(payment.created_at).getHours();
    if (hour >= 22 || hour <= 6) {
      nightTransactions++;
    } else {
      dayTransactions++;
    }
  });

  const nightDayRatio =
    dayTransactions > 0 ? nightTransactions / dayTransactions : 0;

  return {
    totalVolume: Math.round(totalVolume * 100) / 100,
    uniqueCounterparties,
    assetDiversity,
    nightDayRatio: Math.round(nightDayRatio * 100) / 100,
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
 * Check if cached data is recent enough (within 1 hour)
 * @param {number} timestamp - Unix timestamp of when the data was collected
 * @returns {boolean} True if data is fresh (less than 1 hour old), false otherwise
 */
export function isDataFresh(timestamp) {
  const hourAgo = Date.now() - 60 * 60 * 1000;
  return timestamp && timestamp > hourAgo;
}

/**
 * Get cached analysis data if available and fresh
 * @param {string} walletAddress - The wallet address to retrieve cached analysis for
 * @returns {Object|null} Cached analysis data or null if not available/expired
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
 * Cache analysis data in localStorage
 * @param {string} walletAddress - The wallet address to cache analysis for
 * @param {Object} analysisData - The analysis data to cache
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
