"use client";

import { useState, useEffect } from "react";
import {
  analyzeBlendHistory,
  getCachedBlendHistory,
  cacheBlendHistory,
} from "../lib/blendHistoryAnalyzer";
import { useWallet } from "../contexts/WalletContext";
import { useToast } from "../contexts/ToastContext";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Circle,
  Clock,
  Check,
  X,
  LineChart,
} from "lucide-react";

/**
 * Blend Protocol On-Chain History Component
 * Analyzes a user's past lending and borrowing activity on the Blend protocol.
 */
export default function BlendHistoryPerformance() {
  const { walletAddress } = useWallet();
  const { toast } = useToast();

  // Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [historyData, setHistoryData] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showTransactionHistory, setShowTransactionHistory] = useState(false);

  // Auto-load cached data when component mounts
  useEffect(() => {
    if (walletAddress) {
      const cached = getCachedBlendHistory(walletAddress);
      if (cached && cached.success) {
        setHistoryData(cached);
      }
    }
  }, [walletAddress]);

  /**
   * Run Blend Protocol history analysis
   */
  const runHistoryAnalysis = async () => {
    if (!walletAddress) {
      toast.error("⚠️ Wallet connection required");
      return;
    }

    setIsAnalyzing(true);

    try {
      const loadingToast = toast.loading(
        "🏦 Analyzing Blend Protocol history..."
      );

      const analysisResult = await analyzeBlendHistory(walletAddress);

      toast.dismiss(loadingToast);

      if (analysisResult.success) {
        // Cache the results
        cacheBlendHistory(walletAddress, analysisResult);

        // Update state
        setHistoryData(analysisResult);

        if (analysisResult.transactionCount > 0) {
          toast.success(
            `✅ ${analysisResult.transactionCount} Blend transactions analyzed!`,
            { duration: 4000 }
          );
        } else {
          toast.info("ℹ️ No Blend Protocol history found", {
            duration: 4000,
          });
        }
      } else {
        throw new Error(analysisResult.error || "Analysis failed");
      }
    } catch (error) {
      console.error("❌ Blend history analysis failed:", error);
      toast.error(`❌ Analysis error: ${error.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  /**
   * Get status color for repayment rate
   */
  const getRepaymentRateColor = (rate) => {
    if (rate >= 90) return "text-green-500";
    if (rate >= 70) return "text-yellow-500";
    return "text-red-500";
  };

  /**
   * Get status icon for transaction
   */
  const getTransactionIcon = (type) => {
    const icons = {
      lend: "💰",
      borrow: "📤",
      repay: "✅",
    };
    return icons[type] || "📋";
  };

  /**
   * Get status badge for transaction
   */
  const getStatusBadge = (status) => {
    const badges = {
      completed: { text: "Completed", class: "bg-green-100 text-green-800" },
      on_time: { text: "On time", class: "bg-green-100 text-green-800" },
      late: { text: "Late", class: "bg-red-100 text-red-800" },
    };
    return badges[status] || badges.completed;
  };

  if (!walletAddress) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 text-center">
        <div className="w-12 h-12 mx-auto mb-3 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
          <svg
            className="w-6 h-6 text-purple-600 dark:text-purple-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          On-Chain Performance
        </h3>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          Connect your wallet to analyze your Blend Protocol history
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          🏦 Blend On-Chain History
        </h3>
        <button
          onClick={runHistoryAnalysis}
          disabled={isAnalyzing}
          className="btn-secondary text-sm px-4 py-2"
        >
          {isAnalyzing ? (
            <>
              <svg
                className="animate-spin w-4 h-4 mr-2"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="m12 6v6l4 2"
                ></path>
              </svg>
              Analyzing...
            </>
          ) : (
            "🔄 Analyze History"
          )}
        </button>
      </div>

      {/* Analysis Results */}
      {!historyData && !isAnalyzing && (
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl border border-purple-200 dark:border-purple-800 p-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-purple-600 dark:text-purple-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <h4 className="text-lg font-semibold text-purple-900 dark:text-purple-100 mb-2">
            Analyze Blend Protocol History
          </h4>
          <p className="text-purple-700 dark:text-purple-300 mb-4">
            Analyze your on-chain lending and borrowing history to potentially
            influence your credit score.
          </p>
          <button
            onClick={runHistoryAnalysis}
            disabled={isAnalyzing}
            className="btn-primary px-6 py-3"
          >
            🏦 Analyze History
          </button>
        </div>
      )}

      {/* Loading State */}
      {isAnalyzing && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
          <div className="loading-modern mb-4">
            <div className="loading-dot"></div>
            <div className="loading-dot"></div>
            <div className="loading-dot"></div>
          </div>
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Analyzing Blend History
          </h4>
          <p className="text-gray-600 dark:text-gray-400">
            Scanning all transaction history...
          </p>
        </div>
      )}

      {/* Results Display */}
      {historyData && historyData.success && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          {historyData.transactionCount > 0 ? (
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl mb-2">💰</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Lend Volume
                  </div>
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {historyData.metrics.totalLendVolume.toLocaleString(
                      "en-US",
                      {
                        style: "currency",
                        currency: "USD",
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-2xl mb-2">📤</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Borrow Volume
                  </div>
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {historyData.metrics.totalBorrowVolume.toLocaleString(
                      "en-US",
                      {
                        style: "currency",
                        currency: "USD",
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-2xl mb-2">✅</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Repayment Rate
                  </div>
                  <div
                    className={`font-semibold ${getRepaymentRateColor(
                      historyData.metrics.repaymentRate
                    )}`}
                  >
                    {historyData.metrics.repaymentRate.toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="text-2xl mb-2">⏰</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Late Payments
                  </div>
                  <div
                    className={`font-semibold ${
                      historyData.metrics.latePayments > 0
                        ? "text-red-500"
                        : "text-green-500"
                    }`}
                  >
                    {historyData.metrics.latePayments}
                  </div>
                </div>
              </div>

              {/* Collapsible Details */}
              <div className="space-y-4">
                {/* Transaction History */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                      📋 Transaction History
                    </h4>
                    <button
                      onClick={() =>
                        setShowTransactionHistory(!showTransactionHistory)
                      }
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      {showTransactionHistory
                        ? "Hide"
                        : `${historyData.metrics.transactionHistory.length} Transactions`}
                    </button>
                  </div>
                  {showTransactionHistory && (
                    <ul className="space-y-3">
                      {historyData.metrics.transactionHistory.map((tx) => (
                        <li
                          key={tx.id}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="text-xl">
                              {getTransactionIcon(tx.type)}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white capitalize">
                                {tx.type === "lend"
                                  ? "Lend"
                                  : tx.type === "borrow"
                                  ? "Borrow"
                                  : "Repay"}
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                {tx.date.toLocaleDateString("en-US")}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium text-gray-900 dark:text-white">
                              {tx.amount.toLocaleString("en-US", {
                                style: "currency",
                                currency: "USD",
                              })}
                            </div>
                            <div
                              className={`text-xs px-2 py-0.5 rounded-full inline-block ${
                                getStatusBadge(tx.status).class
                              }`}
                            >
                              {getStatusBadge(tx.status).text}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center p-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-gray-500 dark:text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No Blend Protocol History Found
              </h4>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                You haven't lent or borrowed from Blend Protocol with this
                address yet.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Your on-chain history will appear here after your first
                transaction.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
