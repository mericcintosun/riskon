"use client";

import { useState, useEffect } from "react";
import {
  analyzeBlendHistory,
  getCachedBlendHistory,
  cacheBlendHistory,
} from "../lib/blendHistoryAnalyzer";
import { useWallet } from "../contexts/WalletContext";
import { useToast } from "../contexts/ToastContext";

/**
 * Blend Protocol Historical Performance Component
 * Shows user's past lending, borrowing, and repayment behavior
 */
export default function BlendHistoryPerformance({ onScoreImpactChange }) {
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
        // Notify parent component about score impact
        if (onScoreImpactChange) {
          onScoreImpactChange(cached.scoreImpact);
        }
      }
    }
  }, [walletAddress, onScoreImpactChange]);

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

        // Notify parent component about score impact
        if (onScoreImpactChange) {
          onScoreImpactChange(analysisResult.scoreImpact);
        }

        if (analysisResult.transactionCount > 0) {
          toast.success(
            `✅ ${analysisResult.transactionCount} Blend transactions analyzed!`,
            { duration: 4000 }
          );
        } else {
          toast.info("ℹ️ Blend Protocol history not found", {
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
          Historical Performance
        </h3>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          Connect your wallet to see your Blend Protocol history
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          🏦 Historical Performance
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
            "🔄 Analyze"
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
            Blend History Analysis
          </h4>
          <p className="text-purple-700 dark:text-purple-300 mb-4">
            Analyze your lending and borrowing history to add extra points to
            your risk score
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
        <div className="space-y-4">
          {/* Score Impact Badge */}
          {historyData.scoreImpact &&
            historyData.scoreImpact.totalChange !== 0 && (
              <div className="text-center">
                <span
                  className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
                    historyData.scoreImpact.totalChange > 0
                      ? "bg-green-100 text-green-800 border border-green-200"
                      : "bg-red-100 text-red-800 border border-red-200"
                  }`}
                >
                  {historyData.scoreImpact.totalChange > 0 ? "+" : ""}
                  {historyData.scoreImpact.totalChange} points
                  {historyData.scoreImpact.totalChange > 0
                    ? "added"
                    : "subtracted"}
                </span>
              </div>
            )}

          {/* Mini Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Lend Volume */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 text-center">
              <div className="text-2xl mb-2">💰</div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Lend Volume
              </div>
              <div className="font-semibold text-gray-900 dark:text-white">
                {historyData.metrics.totalLendVolume} XLM
              </div>
              <div
                className={`w-3 h-3 rounded-full mx-auto mt-2 ${
                  historyData.metrics.totalLendVolume > 0
                    ? "bg-green-500"
                    : "bg-gray-300"
                }`}
              ></div>
            </div>

            {/* Borrow Volume */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 text-center">
              <div className="text-2xl mb-2">📤</div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Borrow Volume
              </div>
              <div className="font-semibold text-gray-900 dark:text-white">
                {historyData.metrics.totalBorrowVolume} XLM
              </div>
              <div
                className={`w-3 h-3 rounded-full mx-auto mt-2 ${
                  historyData.metrics.totalBorrowVolume > 0
                    ? "bg-orange-500"
                    : "bg-gray-300"
                }`}
              ></div>
            </div>

            {/* Repayment Rate */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 text-center">
              <div className="text-2xl mb-2">✅</div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Repayment Rate
              </div>
              <div
                className={`font-semibold ${getRepaymentRateColor(
                  historyData.metrics.repaymentRate
                )}`}
              >
                {historyData.metrics.repaymentRate}%
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                <div
                  className={`h-2 rounded-full ${
                    historyData.metrics.repaymentRate >= 90
                      ? "bg-green-500"
                      : historyData.metrics.repaymentRate >= 70
                      ? "bg-yellow-500"
                      : "bg-red-500"
                  }`}
                  style={{ width: `${historyData.metrics.repaymentRate}%` }}
                ></div>
              </div>
            </div>

            {/* Late Payments */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 text-center">
              <div className="text-2xl mb-2">⏰</div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Late Payments
              </div>
              <div
                className={`font-semibold ${
                  historyData.metrics.latePayments === 0
                    ? "text-green-500"
                    : "text-red-500"
                }`}
              >
                {historyData.metrics.latePayments}
              </div>
              <div
                className={`w-3 h-3 rounded-full mx-auto mt-2 ${
                  historyData.metrics.latePayments === 0
                    ? "bg-green-500"
                    : "bg-red-500"
                }`}
              ></div>
            </div>
          </div>

          {/* Score Impact Details */}
          {historyData.scoreImpact &&
            historyData.scoreImpact.impacts.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                    📊 Score Impact Details
                  </h4>
                  <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    {showDetails ? "Hide" : "Show Details"}
                  </button>
                </div>

                {showDetails && (
                  <div className="space-y-3">
                    {historyData.scoreImpact.impacts.map((impact, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                      >
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {impact.factor}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {impact.description}
                          </div>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            impact.impact > 0
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {impact.impact > 0 ? "+" : ""}
                          {impact.impact}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          {/* Transaction History */}
          {historyData.metrics.transactionHistory &&
            historyData.metrics.transactionHistory.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
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
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {historyData.metrics.transactionHistory.map((tx, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <span className="text-xl">
                            {getTransactionIcon(tx.type)}
                          </span>
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
                            {tx.amount} XLM
                          </div>
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              getStatusBadge(tx.status).class
                            }`}
                          >
                            {getStatusBadge(tx.status).text}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          {/* Insights */}
          {historyData.insights && historyData.insights.length > 0 && (
            <div className="space-y-3">
              {historyData.insights.map((insight, index) => (
                <div
                  key={index}
                  className={`rounded-xl border p-4 ${
                    insight.type === "positive"
                      ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
                      : insight.type === "warning"
                      ? "bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800"
                      : insight.type === "negative"
                      ? "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"
                      : "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800"
                  }`}
                >
                  <div
                    className={`font-medium mb-1 ${
                      insight.type === "positive"
                        ? "text-green-800 dark:text-green-200"
                        : insight.type === "warning"
                        ? "text-yellow-800 dark:text-yellow-200"
                        : insight.type === "negative"
                        ? "text-red-800 dark:text-red-200"
                        : "text-blue-800 dark:text-blue-200"
                    }`}
                  >
                    {insight.message}
                  </div>
                  <div
                    className={`text-sm ${
                      insight.type === "positive"
                        ? "text-green-700 dark:text-green-300"
                        : insight.type === "warning"
                        ? "text-yellow-700 dark:text-yellow-300"
                        : insight.type === "negative"
                        ? "text-red-700 dark:text-red-300"
                        : "text-blue-700 dark:text-blue-300"
                    }`}
                  >
                    {insight.recommendation}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* No History Message */}
          {historyData.transactionCount === 0 && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 p-6 text-center">
              <div className="w-12 h-12 mx-auto mb-3 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-gray-500"
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
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Blend History Not Found
              </h4>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                You haven't lent or borrowed from Blend Protocol yet
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Your Blend Protocol history will appear here after your first
                transaction
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
