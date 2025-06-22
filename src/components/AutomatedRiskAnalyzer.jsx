"use client";

import { useState, useEffect } from "react";
import {
  collectTransactionData,
  getCachedAnalysis,
  cacheAnalysis,
} from "../lib/horizonDataCollector";
import {
  calculateRiskScore,
  getDataQualityScore,
} from "../lib/lightweightRiskModel";
import {
  checkRateLimit,
  recordUpdate,
  formatRemainingTime,
} from "../lib/rateLimiter";
import { writeScoreToBlockchainEnhanced } from "../app/lib/writeScore";
import { useWallet } from "../contexts/WalletContext";
import { useToast } from "../contexts/ToastContext";
import BlendHistoryPerformance from "./BlendHistoryPerformance.jsx";
import BlendDashboard from "./BlendDashboard.jsx";
import EnhancedLiquidityPools from "./EnhancedLiquidityPools.jsx";

/**
 * Automated Credit Score Component
 * Provides a comprehensive system for on-chain credit analysis.
 */
export default function AutomatedRiskAnalyzer() {
  const { walletAddress, kit } = useWallet();
  const { toast } = useToast();

  // Analysis state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);
  const [riskAnalysis, setRiskAnalysis] = useState(null);
  const [isUpdatingScore, setIsUpdatingScore] = useState(false);
  const [blendScoreImpact, setBlendScoreImpact] = useState(null);

  // Rate limiting state
  const [rateLimitStatus, setRateLimitStatus] = useState(null);
  const [countdown, setCountdown] = useState(0);

  // UI state
  const [showDetails, setShowDetails] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(false);

  // Check rate limit when wallet connects
  useEffect(() => {
    if (walletAddress) {
      const status = checkRateLimit(walletAddress);
      setRateLimitStatus(status);

      // Start countdown timer if rate limited
      if (!status.canUpdate && status.remainingTime > 0) {
        setCountdown(status.remainingTime);
      }
    }
  }, [walletAddress]);

  // Countdown timer effect
  useEffect(() => {
    if (countdown > 0) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          const newTime = prev - 1000;
          if (newTime <= 0) {
            // Refresh rate limit status when countdown ends
            if (walletAddress) {
              const status = checkRateLimit(walletAddress);
              setRateLimitStatus(status);
            }
            return 0;
          }
          return newTime;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [countdown, walletAddress]);

  // Auto-load cached data when component mounts
  useEffect(() => {
    if (walletAddress) {
      const cached = getCachedAnalysis(walletAddress);
      if (cached && cached.success) {
        setAnalysisData(cached);
        if (cached.metrics) {
          const analysis = calculateRiskScore(cached.metrics);
          setRiskAnalysis(analysis);
        }
      }
    }
  }, [walletAddress]);

  /**
   * Run complete automated analysis
   */
  const runAutomatedAnalysis = async () => {
    if (!walletAddress) {
      toast.error("⚠️ Please connect your wallet");
      return;
    }

    setIsAnalyzing(true);

    try {
      const loadingToast = toast.loading("📊 Analyzing on-chain data...");

      // Step 1: Collect transaction data from Horizon
      const horizonData = await collectTransactionData(walletAddress);

      if (!horizonData.success) {
        throw new Error(horizonData.error || "Data collection failed");
      }

      // Step 2: Calculate credit score with the model
      toast.dismiss(loadingToast);
      const calculatingToast = toast.loading(
        "🧠 Calculating credit score with AI model..."
      );

      const riskAnalysisResult = calculateRiskScore(horizonData.metrics);

      // Step 3: Apply Blend history impact if available
      if (blendScoreImpact && blendScoreImpact.totalChange) {
        const adjustedScore = Math.max(
          0,
          Math.min(
            100,
            riskAnalysisResult.riskScore + blendScoreImpact.totalChange
          )
        );
        riskAnalysisResult.riskScore = adjustedScore;
        riskAnalysisResult.blendImpact = blendScoreImpact;
        riskAnalysisResult.explanation.unshift(
          `🏦 Blend history: ${blendScoreImpact.totalChange > 0 ? "+" : ""}${
            blendScoreImpact.totalChange
          } points`
        );
      }

      // Step 4: Check data quality
      const dataQuality = getDataQualityScore(horizonData.metrics);

      toast.dismiss(calculatingToast);

      const finalResult = {
        ...horizonData,
        riskAnalysis: riskAnalysisResult,
        dataQuality,
        timestamp: Date.now(),
      };

      // Cache the results
      cacheAnalysis(walletAddress, finalResult);

      // Update state
      setAnalysisData(finalResult);
      setRiskAnalysis(riskAnalysisResult);

      toast.success("✅ Credit analysis completed!", { duration: 4000 });

      // Show data quality warning if needed
      if (!dataQuality.isGood) {
        setTimeout(() => {
          toast.warning(
            "⚠️ More on-chain history would improve score accuracy",
            {
              duration: 6000,
            }
          );
        }, 1000);
      }
    } catch (error) {
      console.error("❌ Automated analysis failed:", error);
      toast.error(`❌ Analysis error: ${error.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  /**
   * Update credit score on blockchain
   */
  const updateRiskScoreOnChain = async () => {
    if (!riskAnalysis || !walletAddress || !kit) {
      toast.error("⚠️ Credit analysis or wallet connection missing");
      return;
    }

    // Check rate limit
    const rateLimitCheck = checkRateLimit(walletAddress);
    if (!rateLimitCheck.canUpdate) {
      toast.warning(
        `⏰ You can update in ${formatRemainingTime(
          rateLimitCheck.remainingTime
        )}`
      );
      return;
    }

    setIsUpdatingScore(true);

    try {
      const updatingToast = toast.loading(
        "🔗 Saving credit score to the blockchain..."
      );

      // Write to blockchain using existing system
      const result = await writeScoreToBlockchainEnhanced({
        kit,
        address: walletAddress,
        score: riskAnalysis.riskScore,
        chosenTier: riskAnalysis.tier,
      });

      toast.dismiss(updatingToast);

      if (result.successful) {
        // Record the update for rate limiting
        recordUpdate(walletAddress);

        // Update rate limit status
        const newStatus = checkRateLimit(walletAddress);
        setRateLimitStatus(newStatus);
        setCountdown(newStatus.remainingTime);

        if (
          result.method === "local_storage" ||
          result.method === "memory_only"
        ) {
          toast.warning("⚠️ Blockchain save failed - score saved locally");
        } else {
          toast.success(
            "✅ Credit score successfully saved to the blockchain!"
          );

          if (result.hash) {
            setTimeout(() => {
              toast.info(`🔗 Transaction: ${result.hash.substring(0, 8)}...`, {
                duration: 5000,
              });
            }, 1000);
          }
        }
      } else {
        throw new Error(result.error || "Blockchain update failed");
      }
    } catch (error) {
      console.error("❌ Blockchain update failed:", error);

      if (
        error.message?.includes("cancelled") ||
        error.message?.includes("rejected")
      ) {
        toast.info("ℹ️ Transaction cancelled by user");
      } else {
        toast.error(`❌ Blockchain update failed: ${error.message}`);
      }
    } finally {
      setIsUpdatingScore(false);
    }
  };

  /**
   * Get risk score color for gauge
   */
  const getRiskScoreColor = (score) => {
    if (score <= 30) return "text-green-500";
    if (score <= 70) return "text-yellow-500";
    return "text-red-500";
  };

  /**
   * Get tier badge styling
   */
  const getTierBadge = (tier) => {
    const badges = {
      TIER_1: {
        text: "Tier-1: Low Risk",
        class: "bg-green-100 text-green-800 border-green-200",
      },
      TIER_2: {
        text: "Tier-2: Medium Risk",
        class: "bg-yellow-100 text-yellow-800 border-yellow-200",
      },
      TIER_3: {
        text: "Tier-3: High Risk",
        class: "bg-red-100 text-red-800 border-red-200",
      },
    };
    return badges[tier] || badges["TIER_3"];
  };

  if (!walletAddress) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
          {/* Icon can go here */}
        </div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Automated Credit Score Analysis
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Connect your wallet to generate an on-chain credit score.
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500">
          We'll analyze your transaction data from the last 30 days.
        </p>
      </div>
    );
  }

  // Show loading state while analysis is in progress for the first time
  if (isAnalyzing && !analysisData) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
        <div className="loading-modern mb-4">
          <div className="loading-dot"></div>
          <div className="loading-dot"></div>
          <div className="loading-dot"></div>
        </div>
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Analyzing On-Chain Data
        </h4>
        <p className="text-gray-600 dark:text-gray-400">
          This may take a moment...
        </p>
      </div>
    );
  }

  if (!riskAnalysis) {
    // This state occurs if there's cached data but no analysis yet,
    // or if the user needs to initiate the first analysis.
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
          {/* Icon can go here */}
        </div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Ready to Generate Score
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Click the button below to start the on-chain credit analysis.
        </p>
        <button
          onClick={runAutomatedAnalysis}
          disabled={isAnalyzing}
          className="btn-primary px-6 py-3"
        >
          {isAnalyzing ? "Analyzing..." : "🧠 Generate Credit Score"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Risk Score Display */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
        <div className="text-center">
          {/* Risk Score Gauge */}
          <div className="relative w-48 h-24">
            <svg className="w-full h-full" viewBox="0 0 100 50">
              <path
                d="M 10 50 A 40 40 0 0 1 90 50"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="10"
              />
              <path
                d="M 10 50 A 40 40 0 0 1 90 50"
                fill="none"
                stroke={getRiskScoreColor(riskAnalysis.riskScore)}
                strokeWidth="10"
                strokeDasharray="125.6"
                strokeDashoffset={
                  125.6 - (125.6 * riskAnalysis.riskScore) / 100
                }
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                {riskAnalysis ? riskAnalysis.riskScore : "--"}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-[-10px]">
                Credit Score
              </div>
            </div>
          </div>

          {/* Tier Badge */}
          {riskAnalysis && (
            <div className="mt-6 space-y-3">
              <span
                className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium border ${
                  getTierBadge(riskAnalysis.tier).class
                }`}
              >
                {getTierBadge(riskAnalysis.tier).text}
              </span>

              {/* Blend Impact Badge */}
              {riskAnalysis.blendImpact &&
                riskAnalysis.blendImpact.totalChange !== 0 && (
                  <div>
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        riskAnalysis.blendImpact.totalChange > 0
                          ? "bg-purple-100 text-purple-800 border border-purple-200"
                          : "bg-orange-100 text-orange-800 border border-orange-200"
                      }`}
                    >
                      🏦 Blend:{" "}
                      {riskAnalysis.blendImpact.totalChange > 0 ? "+" : ""}
                      {riskAnalysis.blendImpact.totalChange} points
                    </span>
                  </div>
                )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-4">
            {!riskAnalysis ? (
              <button
                onClick={runAutomatedAnalysis}
                disabled={isAnalyzing}
                className="btn-primary w-full py-3 text-lg"
              >
                {isAnalyzing ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
                  "🧠 Generate Credit Score"
                )}
              </button>
            ) : (
              <div className="mt-4 flex flex-col items-center">
                <button
                  onClick={updateRiskScoreOnChain}
                  disabled={isUpdatingScore || !rateLimitStatus.canUpdate}
                  className="btn-secondary px-6 py-2"
                >
                  {isUpdatingScore
                    ? "Updating..."
                    : !rateLimitStatus.canUpdate
                    ? `⏰ ${formatRemainingTime(countdown)}`
                    : "🔗 Update Score on-chain"}
                </button>
                {analysisData && (
                  <button
                    onClick={runAutomatedAnalysis}
                    disabled={isAnalyzing}
                    className="mt-2 text-sm text-blue-600 hover:underline"
                  >
                    {isAnalyzing ? "Re-analyzing..." : "🔄 Re-analyze"}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Feature Breakdown */}
      {riskAnalysis && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              📊 Analysis Breakdown
            </h3>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              {showDetails ? "Hide" : "Show Details"}
            </button>
          </div>

          {/* Feature Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-2xl mb-1">💰</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Total Volume
              </div>
              <div className="font-medium">
                {riskAnalysis.rawMetrics.totalVolume} XLM
              </div>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-2xl mb-1">🤝</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Counterparty
              </div>
              <div className="font-medium">
                {riskAnalysis.rawMetrics.uniqueCounterparties}
              </div>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-2xl mb-1">🎯</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Asset Type
              </div>
              <div className="font-medium">
                {riskAnalysis.rawMetrics.assetDiversity}
              </div>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-2xl mb-1">🌙</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Night/Day
              </div>
              <div className="font-medium">
                {riskAnalysis.rawMetrics.nightDayRatio}
              </div>
            </div>
          </div>

          {/* Detailed Analysis */}
          {showDetails && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
              <div className="space-y-3">
                {riskAnalysis.explanation.map((explanation, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {explanation}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recommendations */}
      {riskAnalysis && riskAnalysis.recommendations.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
              💡 Score Calculation Factors
            </h3>
            <button
              onClick={() => setShowRecommendations(!showRecommendations)}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              {showRecommendations ? "Hide" : "Show"}
            </button>
          </div>

          {showRecommendations && (
            <div className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
              <p>
                The credit score is an AI-generated prediction based on
                historical on-chain data. The following factors can influence
                the score:
              </p>
              <ul className="list-disc list-inside pl-2">
                <li>
                  <strong>Transaction Volume & Frequency:</strong> Consistent
                  and reasonable activity levels.
                </li>
                <li>
                  <strong>Asset Diversity:</strong> Interaction with multiple
                  types of assets.
                </li>
                <li>
                  <strong>On-chain History:</strong> Age of the wallet and
                  duration of activity.
                </li>
                <li>
                  <strong>Protocol Interaction:</strong> Engagement with various
                  DeFi protocols like Blend.
                </li>
              </ul>
              <p className="pt-2">
                <strong>Disclaimer:</strong> This information is for educational
                purposes only and is not financial advice. Your score is a
                reflection of past activity.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Info Banner */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800 p-4">
        <div className="flex items-start space-x-3">
          <div className="text-yellow-600 dark:text-yellow-400">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="text-sm text-yellow-800 dark:text-yellow-200">
            <strong>Info:</strong> Score is calculated based on the last 30 days
            of activity. Higher volume, asset diversity, and consistent activity
            can positively influence the score. You can update once a day.
          </div>
        </div>
      </div>

      {/* Data Quality Warning */}
      {analysisData &&
        analysisData.dataQuality &&
        !analysisData.dataQuality.isGood && (
          <div className="mt-4 bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-700/50 rounded-lg p-4">
            <div className="flex items-start">
              <div className="text-orange-500 text-xl mr-3">⚠️</div>
              <div className="text-sm text-orange-800 dark:text-orange-200">
                <strong>Data Quality Note:</strong> More transaction history is
                needed for a more accurate analysis. At least 10 transactions
                with 3 different counterparties are suggested for a robust
                score.
              </div>
            </div>
          </div>
        )}

      {/* Blend Historical Performance */}
      {walletAddress && (
        <BlendHistoryPerformance onScoreImpactChange={setBlendScoreImpact} />
      )}

      {/* Blend DeFi Dashboard */}
      {riskAnalysis && walletAddress && (
        <div className="mt-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                🌊 Blend DeFi Dashboard
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Traditional DeFi operations with demo pools. Your risk score:{" "}
                {riskAnalysis.riskScore}
              </p>
            </div>
          </div>
          <BlendDashboard
            kit={kit}
            walletAddress={walletAddress}
            riskScore={riskAnalysis.riskScore}
          />
        </div>
      )}

      {/* Enhanced Liquidity Pools */}
      {riskAnalysis && walletAddress && (
        <div className="mt-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
            <div className="text-center">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                🎯 Risk-Based Liquidity Pools
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Access tier-classified liquidity pools based on your risk score
                ({riskAnalysis.tier}).
              </p>
            </div>
          </div>
          <EnhancedLiquidityPools />
        </div>
      )}
    </div>
  );
}
