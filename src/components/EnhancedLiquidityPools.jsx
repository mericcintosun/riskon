"use client";

import React, { useState, useEffect } from "react";
import { usePasskeyWallet } from "../lib/passkeyIntegration";
import { useRiskTierContract } from "../lib/riskTierClient";
import { motion } from "framer-motion";
import { Info, ExternalLink, Link } from "lucide-react";

/**
 * Enhanced Liquidity Pools Component
 * Following Goldfinch/Maple risk-liquidity mapping methodology
 * Implements tier-based pool access with risk protection
 */
function EnhancedLiquidityPools() {
  // Wallet and contract hooks
  const { smartWalletAddress, isConnected } = usePasskeyWallet();
  const {
    getRiskTier,
    canAccessTier,
    loading: contractLoading,
  } = useRiskTierContract();

  // Component state
  const [pools, setPools] = useState([]);
  const [filteredPools, setFilteredPools] = useState([]);
  const [userRiskData, setUserRiskData] = useState(null);
  const [selectedTier, setSelectedTier] = useState("ALL");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [liquidityStats, setLiquidityStats] = useState(null);
  const [selectedPool, setSelectedPool] = useState(null);
  const [showPoolDetails, setShowPoolDetails] = useState(false);
  const [showRiskWarning, setShowRiskWarning] = useState(false);

  // Load user risk data and pools on mount
  useEffect(() => {
    if (isConnected && smartWalletAddress) {
      loadUserRiskData();
      loadLiquidityPools();
      loadLiquidityStats();
    }
  }, [isConnected, smartWalletAddress]);

  // Filter pools when user data or tier selection changes
  useEffect(() => {
    if (pools.length > 0 && userRiskData) {
      filterPoolsByRiskAndTier();
    }
  }, [pools, userRiskData, selectedTier]);

  /**
   * Load user's risk and tier data
   */
  const loadUserRiskData = async () => {
    try {
      const riskData = await getRiskTier(smartWalletAddress);
      setUserRiskData(riskData);
    } catch (error) {
      console.error("❌ Failed to load user risk data:", error);
      setError("Failed to load risk data");
    }
  };

  /**
   * Load liquidity pools with TVL tier classification
   */
  const loadLiquidityPools = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch pools from backend liquidity monitor
      const response = await fetch("/api/liquidity-pools/all");

      if (!response.ok) {
        throw new Error(`Failed to fetch pools: ${response.status}`);
      }

      const poolData = await response.json();
      setPools(poolData);
    } catch (error) {
      console.error("❌ Failed to load liquidity pools:", error);
      setError("Failed to load liquidity pools");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load liquidity statistics from Redis
   */
  const loadLiquidityStats = async () => {
    try {
      const response = await fetch("/api/liquidity-stats");

      if (response.ok) {
        const stats = await response.json();
        setLiquidityStats(stats);
      }
    } catch (error) {
      console.error("❌ Failed to load liquidity stats:", error);
    }
  };

  /**
   * Filter pools based on risk score and tier access
   * Implements Goldfinch/Maple risk-liquidity mapping
   */
  const filterPoolsByRiskAndTier = async () => {
    try {
      let filtered = [...pools];

      // Apply tier filter
      if (selectedTier !== "ALL") {
        filtered = filtered.filter((pool) => pool.tier === selectedTier);
      }

      // Risk-based access control following Goldfinch methodology
      if (userRiskData) {
        const accessiblePools = [];

        for (const pool of filtered) {
          const canAccess = await canAccessTier(smartWalletAddress, pool.tier);

          if (canAccess) {
            // Add risk-appropriate badges and warnings
            const enhancedPool = {
              ...pool,
              riskStatus: getRiskStatus(userRiskData.score, pool.tier),
              accessLevel: getAccessLevel(userRiskData.score, pool.tier),
              recommendation: getPoolRecommendation(
                userRiskData.score,
                pool.tier
              ),
            };

            accessiblePools.push(enhancedPool);
          }
        }

        filtered = accessiblePools;
      }

      // Sort by TVL descending within each tier
      filtered.sort((a, b) => {
        // First sort by tier priority (TIER_1 > TIER_2 > TIER_3)
        const tierPriority = { TIER_1: 3, TIER_2: 2, TIER_3: 1 };
        const tierDiff = tierPriority[b.tier] - tierPriority[a.tier];

        if (tierDiff !== 0) return tierDiff;

        // Then by TVL within same tier
        return b.tvl - a.tvl;
      });

      setFilteredPools(filtered);
    } catch (error) {
      console.error("❌ Failed to filter pools:", error);
    }
  };

  /**
   * Get risk status for pool access (Goldfinch methodology)
   */
  const getRiskStatus = (userScore, poolTier) => {
    if (poolTier === "TIER_1") {
      return "SAFE"; // Always safe for everyone
    } else if (poolTier === "TIER_2" && userScore < 30) {
      return "RESTRICTED"; // Low risk users restricted from TIER_2
    } else if (poolTier === "TIER_3" && userScore < 70) {
      return "RESTRICTED"; // Only high risk users access TIER_3
    } else if (poolTier === "TIER_3" && userScore >= 70) {
      return "OPPORTUNITY"; // High risk users get "opportunity" badge for TIER_3
    }
    return "ACCESSIBLE";
  };

  /**
   * Get access level based on risk score and pool tier
   */
  const getAccessLevel = (userScore, poolTier) => {
    const tierLimits = {
      TIER_1: { maxRisk: 30, borrowLimit: 0.8 },
      TIER_2: { maxRisk: 70, borrowLimit: 0.6 },
      TIER_3: { maxRisk: 100, borrowLimit: 0.4 },
    };

    const limit = tierLimits[poolTier];
    if (userScore <= limit.maxRisk) {
      return {
        level: "FULL",
        borrowLimit: limit.borrowLimit,
        message: `Full access with ${
          limit.borrowLimit * 100
        }% max borrow ratio`,
      };
    }

    return {
      level: "LIMITED",
      borrowLimit: 0.3,
      message: "Limited access due to risk profile",
    };
  };

  /**
   * Handle pool selection with risk warnings
   */
  const handlePoolSelect = (pool) => {
    setSelectedPool(pool);

    // Show risk warning for TIER_3 pools
    if (pool.tier === "TIER_3" && pool.riskStatus === "OPPORTUNITY") {
      setShowRiskWarning(true);
    } else {
      setShowPoolDetails(true);
    }
  };

  /**
   * Confirm high-risk pool investment
   */
  const confirmRiskAndProceed = () => {
    setShowRiskWarning(false);
    setShowPoolDetails(true);
  };

  /**
   * Start investment process (placeholder for future implementation)
   */
  const startInvestment = () => {
    // TODO: Implement Blend protocol integration
    alert(
      `Investment process will be initiated: ${selectedPool.poolId}\n(Blend integration is not yet active)`
    );
  };

  /**
   * Get pool recommendation based on Maple/Goldfinch risk assessment
   */
  const getPoolRecommendation = (userScore, poolTier) => {
    if (userScore <= 30) {
      // Low risk users
      if (poolTier === "TIER_1")
        return "RECOMMENDED - Optimal for your risk profile";
      if (poolTier === "TIER_2")
        return "SUITABLE - Good diversification option";
      return "CONSERVATIVE - Ultra-safe option";
    } else if (userScore <= 70) {
      // Medium risk users
      if (poolTier === "TIER_1")
        return "ASPIRATIONAL - Consider building better risk profile";
      if (poolTier === "TIER_2")
        return "RECOMMENDED - Perfect match for your profile";
      return "CONSERVATIVE - Safe fallback option";
    } else {
      // High risk users
      if (poolTier === "TIER_3")
        return "OPPORTUNITY - High risk, potential high reward";
      return "NOT ACCESSIBLE - Improve risk score for access";
    }
  };

  /**
   * Get tier badge styling with enhanced visual indicators
   */
  const getTierBadgeStyle = (tier, riskStatus) => {
    const baseStyle = "px-3 py-1 rounded-full text-sm font-medium ";

    if (riskStatus === "OPPORTUNITY") {
      return (
        baseStyle +
        "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md border-2 border-purple-300"
      );
    } else if (riskStatus === "RESTRICTED") {
      return (
        baseStyle +
        "bg-gray-200 text-gray-500 border-2 border-gray-300 cursor-not-allowed"
      );
    } else if (riskStatus === "SAFE") {
      return (
        baseStyle + "bg-green-100 text-green-800 border-2 border-green-300"
      );
    }

    switch (tier) {
      case "TIER_1":
        return (
          baseStyle + "bg-green-100 text-green-800 border-2 border-green-300"
        );
      case "TIER_2":
        return (
          baseStyle + "bg-yellow-100 text-yellow-800 border-2 border-yellow-300"
        );
      case "TIER_3":
        return baseStyle + "bg-red-100 text-red-800 border-2 border-red-300";
      default:
        return baseStyle + "bg-gray-100 text-gray-800";
    }
  };

  /**
   * Get risk icon based on tier and status
   */
  const getRiskIcon = (tier, riskStatus) => {
    if (riskStatus === "OPPORTUNITY") return "💎";
    if (riskStatus === "RESTRICTED") return "🔒";
    if (riskStatus === "SAFE") return "🛡️";

    switch (tier) {
      case "TIER_1":
        return "✅";
      case "TIER_2":
        return "⚠️";
      case "TIER_3":
        return "🚀";
      default:
        return "📊";
    }
  };

  /**
   * Format TVL for display
   */
  const formatTVL = (tvl) => {
    if (tvl >= 1000000) {
      return `$${(tvl / 1000000).toFixed(1)}M`;
    } else if (tvl >= 1000) {
      return `$${(tvl / 1000).toFixed(0)}K`;
    }
    return `$${tvl.toFixed(0)}`;
  };

  if (!isConnected) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Connect Passkey Wallet
        </h3>
        <p className="text-gray-600">
          Connect your passwordless wallet to access risk-based liquidity pools
        </p>
      </div>
    );
  }

  if (loading || contractLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading liquidity pools...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">❌ {error}</div>
        <button
          onClick={() => {
            setError(null);
            loadLiquidityPools();
          }}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header with Risk Profile */}
      <div className="mb-8">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Risk-Based Liquidity Pools
            </h2>
            <p className="text-gray-600">
              Goldfinch/Maple methodology for responsible DeFi access
            </p>
          </div>

          {userRiskData && (
            <div className="bg-white border rounded-lg p-4 min-w-[200px]">
              <div className="text-sm text-gray-600 mb-1">
                Your Risk Profile
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-2">
                Score: {userRiskData.score}
              </div>
              <div className="flex gap-2">
                <span
                  className={getTierBadgeStyle(userRiskData.tier, "ACCESSIBLE")}
                >
                  {userRiskData.tier}
                </span>
                <span className="text-xs text-gray-500">
                  Chosen: {userRiskData.chosen_tier}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Liquidity Statistics */}
        {liquidityStats && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-sm text-green-600 mb-1">Tier 1 Pools</div>
              <div className="text-2xl font-bold text-green-800">
                {liquidityStats.TIER_1 || 0}
              </div>
              <div className="text-xs text-green-600">≥$1M TVL</div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-sm text-blue-600 mb-1">Tier 2 Pools</div>
              <div className="text-2xl font-bold text-blue-800">
                {liquidityStats.TIER_2 || 0}
              </div>
              <div className="text-xs text-blue-600">$250K-1M TVL</div>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="text-sm text-yellow-600 mb-1">Tier 3 Pools</div>
              <div className="text-2xl font-bold text-yellow-800">
                {liquidityStats.TIER_3 || 0}
              </div>
              <div className="text-xs text-yellow-600">&lt;$250K TVL</div>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Total Pools</div>
              <div className="text-2xl font-bold text-gray-800">
                {liquidityStats.total || 0}
              </div>
              <div className="text-xs text-gray-600">All tiers</div>
            </div>
          </div>
        )}

        {/* Tier Filter */}
        <div className="flex gap-2 mb-6">
          {["ALL", "TIER_1", "TIER_2", "TIER_3"].map((tier) => (
            <button
              key={tier}
              onClick={() => setSelectedTier(tier)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedTier === tier
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {tier === "ALL" ? "All Pools" : `Tier ${tier.split("_")[1]}`}
            </button>
          ))}
        </div>
      </div>

      {/* Pools Grid */}
      {filteredPools.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">🏊</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Accessible Pools
          </h3>
          <p className="text-gray-600 mb-4">
            {selectedTier === "ALL"
              ? "No pools match your current risk profile"
              : `No ${selectedTier} pools accessible with your risk score`}
          </p>
          {userRiskData && userRiskData.score > 70 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
              <div className="text-blue-800 font-medium mb-2">
                💡 Improve Your Access
              </div>
              <div className="text-blue-700 text-sm">
                Reduce your risk score through diversified, regular transactions
                to access higher-tier pools.
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPools.map((pool, index) => (
            <div
              key={pool.poolId || index}
              className="bg-white border rounded-lg p-6 hover:shadow-lg transition-shadow"
            >
              {/* Pool Header */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">
                    Pool #{pool.poolId?.slice(-8) || "Unknown"}
                  </h3>
                  <div className="text-sm text-gray-600">
                    {pool.totalAccounts || 0} participants
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <span
                    className={getTierBadgeStyle(pool.tier, pool.riskStatus)}
                  >
                    {pool.tier}
                    {pool.riskStatus === "OPPORTUNITY" && " 🎯"}
                  </span>
                </div>
              </div>

              {/* TVL and Statistics */}
              <div className="mb-4">
                <div className="text-2xl font-bold text-gray-900 mb-2">
                  {formatTVL(pool.tvl)}
                </div>
                <div className="text-sm text-gray-600">Total Value Locked</div>
              </div>

              {/* Risk Assessment */}
              {pool.recommendation && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-800 mb-1">
                    Risk Assessment
                  </div>
                  <div className="text-sm text-gray-600">
                    {pool.recommendation}
                  </div>
                </div>
              )}

              {/* Access Level */}
              {pool.accessLevel && (
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Max Borrow Ratio</span>
                    <span className="font-medium">
                      {pool.accessLevel.borrowLimit * 100}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{
                        width: `${pool.accessLevel.borrowLimit * 100}%`,
                      }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Action Button */}
              <button
                onClick={() => handlePoolSelect(pool)}
                className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                  pool.riskStatus === "RESTRICTED"
                    ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                    : pool.riskStatus === "OPPORTUNITY"
                    ? "bg-purple-500 text-white hover:bg-purple-600 shadow-lg"
                    : "bg-blue-500 text-white hover:bg-blue-600"
                }`}
                disabled={pool.riskStatus === "RESTRICTED"}
              >
                {pool.riskStatus === "RESTRICTED"
                  ? "🔒 Access Restricted"
                  : pool.riskStatus === "OPPORTUNITY"
                  ? "💎 Explore Opportunity"
                  : "🌊 Enter Pool"}
              </button>

              {/* Pool Metadata */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="text-xs text-gray-500 space-y-1">
                  <div>
                    Updated: {new Date(pool.timestamp).toLocaleString()}
                  </div>
                  {pool.reserves && pool.reserves.length > 0 && (
                    <div>Assets: {pool.reserves.length} types</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Methodology Footer */}
      <div className="mt-12 pt-8 border-t border-gray-200">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-bold text-blue-900 mb-3">
            🧠 Risk-Liquidity Mapping Methodology
          </h3>
          <div className="text-sm text-blue-800 space-y-2">
            <p>
              <strong>Based on Goldfinch & Maple Finance:</strong> Proven
              unsecured lending protocols that pioneered risk-based pool access.
            </p>
            <p>
              <strong>Tier System:</strong> TVL-based classification ensures
              liquidity depth matches risk appetite and position sizes.
            </p>
            <p>
              <strong>Dynamic Access:</strong> Risk scores determine borrowing
              limits and pool access, protecting both users and protocol.
            </p>
          </div>
        </div>
      </div>

      {/* Risk Warning Modal */}
      {showRiskWarning && selectedPool && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md mx-4 p-6">
            <div className="text-center">
              <div className="text-6xl mb-4">⚠️</div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Yüksek Risk Uyarısı
              </h3>
              <div className="text-gray-600 mb-6 space-y-3">
                <p>
                  Bu havuz düşük likiditeye sahip ve yüksek risk taşımaktadır.
                </p>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="font-semibold text-red-700 mb-2">
                    Potansiyel Riskler:
                  </p>
                  <ul className="text-sm text-red-600 text-left space-y-1">
                    <li>• Yüksek volatilite ve değer kaybı riski</li>
                    <li>• Düşük likidite nedeniyle çıkış zorluğu</li>
                    <li>• Potansiyel kayıplar yüksek olabilir</li>
                  </ul>
                </div>
                <p className="font-medium">
                  Devam etmek istediğinizden emin misiniz?
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowRiskWarning(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                >
                  İptal
                </button>
                <button
                  onClick={confirmRiskAndProceed}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Riski Kabul Et
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pool Details Modal */}
      {showPoolDetails && selectedPool && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Pool Details</h3>
              <button
                onClick={() => setShowPoolDetails(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              {/* Pool Header */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-lg font-semibold">
                    Pool #{selectedPool.poolId?.slice(-8) || "Unknown"}
                  </h4>
                  <span
                    className={getTierBadgeStyle(
                      selectedPool.tier,
                      selectedPool.riskStatus
                    )}
                  >
                    {selectedPool.tier}
                    {selectedPool.riskStatus === "OPPORTUNITY" && " 💎"}
                  </span>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  {formatTVL(selectedPool.tvl)}
                </div>
                <div className="text-gray-600">Total Value Locked</div>
              </div>

              {/* Risk Analysis */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h5 className="font-semibold text-yellow-800 mb-2">
                  {getRiskIcon(selectedPool.tier, selectedPool.riskStatus)} Risk
                  Analysis
                </h5>
                <p className="text-yellow-700 mb-3">
                  {selectedPool.recommendation}
                </p>
                {selectedPool.accessLevel && (
                  <div>
                    <div className="text-sm text-yellow-600 mb-1">
                      Maximum Borrow Ratio:{" "}
                      {selectedPool.accessLevel.borrowLimit * 100}%
                    </div>
                    <div className="w-full bg-yellow-200 rounded-full h-2">
                      <div
                        className="bg-yellow-600 h-2 rounded-full"
                        style={{
                          width: `${
                            selectedPool.accessLevel.borrowLimit * 100
                          }%`,
                        }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Pool Statistics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="text-sm text-blue-600 mb-1">Participants</div>
                  <div className="text-xl font-bold text-blue-800">
                    {selectedPool.totalAccounts || 0}
                  </div>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-sm text-green-600 mb-1">
                    Total Shares
                  </div>
                  <div className="text-xl font-bold text-green-800">
                    {selectedPool.totalShares || "0"}
                  </div>
                </div>
              </div>

              {/* Reserves Information */}
              {selectedPool.reserves && selectedPool.reserves.length > 0 && (
                <div>
                  <h5 className="font-semibold text-gray-800 mb-3">
                    Pool Assets
                  </h5>
                  <div className="space-y-2">
                    {selectedPool.reserves.map((reserve, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-3">
                        <div className="text-sm font-medium text-gray-700">
                          Asset {index + 1}: {reserve.asset || "Unknown"}
                        </div>
                        <div className="text-xs text-gray-500">
                          Amount: {reserve.amount || "N/A"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowPoolDetails(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                >
                  Close
                </button>
                <button
                  onClick={startInvestment}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium ${
                    selectedPool.riskStatus === "OPPORTUNITY"
                      ? "bg-purple-600 text-white hover:bg-purple-700"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  {selectedPool.riskStatus === "OPPORTUNITY"
                    ? "💎 Start Opportunity Investment"
                    : "🌊 Start Pool Investment"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EnhancedLiquidityPools;
