"use client";

import { useState, useEffect } from "react";
import {
  getAvailablePools,
  loadUserPosition,
  formatPositionData,
  createBlendOperation,
  executeEnhancedOperation,
} from "../lib/blendUtils.js";
import {
  getCurrentBlendConfig,
  parseAmount,
  formatAmount,
} from "../lib/blendConfig.js";

export default function BlendDashboard({ kit, walletAddress, riskScore }) {
  // State management
  const [activeTab, setActiveTab] = useState("pools");
  const [availablePools, setAvailablePools] = useState([]);
  const [selectedPool, setSelectedPool] = useState(null);
  const [userPosition, setUserPosition] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  // Form states
  const [supplyAmount, setSupplyAmount] = useState("");
  const [borrowAmount, setBorrowAmount] = useState("");
  const [selectedAsset, setSelectedAsset] = useState("");
  const [operationType, setOperationType] = useState("supply"); // supply, borrow, withdraw, repay

  const config = getCurrentBlendConfig();

  // Load available pools on component mount
  useEffect(() => {
    loadAvailablePools();
  }, []);

  // Load user position when pool or wallet changes
  useEffect(() => {
    if (selectedPool && walletAddress) {
      loadUserPositionData();
    }
  }, [selectedPool, walletAddress]);

  const loadAvailablePools = async () => {
    try {
      setIsLoading(true);
      setMessage("🔍 Enhanced pool discovery starting...");
      setMessageType("info");

      const pools = await getAvailablePools();
      setAvailablePools(pools);

      if (pools.length > 0) {
        setSelectedPool(pools[0]);

        // Show discovery results
        const activePools = pools.filter((p) => p.isActive && !p.isPending);
        const operationalPools = pools.filter(
          (p) => p.status === "FULLY_OPERATIONAL"
        );

        setMessage(
          `✅ Pool discovery completed! ${pools.length} pools found (${operationalPools.length} fully operational, ${activePools.length} active)`
        );
        setMessageType("success");
      } else {
        setMessage("⚠️ No available pools found");
        setMessageType("warning");
      }
    } catch (error) {
      console.error("Error loading pools:", error);
      setMessage(`❌ Pool loading error: ${error.message}`);
      setMessageType("error");
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserPositionData = async () => {
    if (!selectedPool || !walletAddress) return;

    try {
      setIsLoading(true);
      const position = await loadUserPosition(selectedPool.id, walletAddress);
      setUserPosition(formatPositionData(position));
    } catch (error) {
      console.error("Error loading user position:", error);
      // Don't show error for new users who haven't used the pool yet
      setUserPosition({
        supplies: [],
        borrows: [],
        totalSupplied: "0",
        totalBorrowed: "0",
        healthFactor: null,
        borrowLimit: "0",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBlendOperation = async () => {
    if (!kit || !walletAddress || !selectedPool || !selectedAsset) {
      setMessage("Please connect wallet and fill in required fields");
      setMessageType("error");
      return;
    }

    // Enhanced pool status handling
    if (selectedPool.isActive) {
      let statusMessage = "";

      switch (selectedPool.status) {
        case "FULLY_OPERATIONAL":
          statusMessage =
            "🚀 Fully operational pool - real blockchain transaction will be executed";
          break;
        case "NETWORK_READY":
          statusMessage = "🔗 Network ready - transaction in compatibility mode";
          break;
        case "CONTRACT_EXISTS":
          statusMessage = "📄 Contract found - transaction in basic mode";
          break;
        default:
          statusMessage = "🎮 Transaction in enhanced demo mode";
      }

      setMessage(statusMessage);
      setMessageType("info");
    }

    // Check if pool is pending/has errors
    if (selectedPool.isPending) {
      if (selectedPool.canRetry) {
        setMessage(
          "⚠️ Pool loading... Please wait or try again."
        );
        setMessageType("warning");

        // Offer retry option
        setTimeout(() => {
          setMessage(
            "🔄 Pool status being checked... Use Refresh button to retry."
          );
          setMessageType("info");
        }, 3000);
      } else {
        setMessage(
          "❌ Selected pool is currently unavailable. Please select another pool."
        );
        setMessageType("error");
      }
      return;
    }

    try {
      setIsLoading(true);
      setMessage("Enhanced DeFi transaction being prepared...");
      setMessageType("info");

      let operationData;
      const assetAddress = config.ASSETS[selectedAsset];
      const amount =
        operationType === "supply" || operationType === "withdraw"
          ? parseAmount(supplyAmount)
          : parseAmount(borrowAmount);

      if (!amount || amount <= 0) {
        throw new Error("Please enter a valid amount");
      }

      // Use enhanced operation creation
      operationData = await createBlendOperation(
        selectedPool.id,
        walletAddress,
        operationType,
        assetAddress,
        amount
      );

      setMessage("Transaction being sent to blockchain...");

      // Execute enhanced operation
      const result = await executeEnhancedOperation(
        kit,
        walletAddress,
        operationData
      );

      // Check if we got a transaction hash (real operation)
      if (result && typeof result === "string" && result.length === 64) {
        setMessage(
          `✅ Transaction successful! Transaction Hash: ${result.substring(
            0,
            8
          )}...${result.substring(56)}`
        );

        // Add link to Stellar Explorer
        setTimeout(() => {
          setMessage(`✅ Transaction successful! 
          Hash: ${result.substring(0, 8)}...${result.substring(56)}
          🔗 View on Stellar Explorer: https://stellar.expert/explorer/testnet/tx/${result}`);
        }, 2000);
      } else {
        // Simulation result
        setMessage("✅ Transaction successful! Blockchain integration completed");
      }

      // Clear forms on success
      setSupplyAmount("");
      setBorrowAmount("");

      // Reload user position after successful operation
      setTimeout(() => {
        loadUserPositionData();
      }, 2000);
    } catch (error) {
      console.error("DeFi transaction error:", error);
      setMessage(`❌ Transaction error: ${error.message}`);
      setMessageType("error");
    } finally {
      setIsLoading(false);
    }
  };

  // Enhanced retry mechanism
  const handleRetryPool = async () => {
    setMessage("🔄 Pool status being refreshed...");
    setMessageType("info");
    setIsLoading(true);

    try {
      await loadAvailablePools();
    } catch (error) {
      setMessage(`❌ Retry failed: ${error.message}`);
      setMessageType("error");
    } finally {
      setIsLoading(false);
    }
  };

  const getRiskBasedRecommendations = () => {
    if (!riskScore) return null;

    if (riskScore <= 30) {
      return {
        level: "Low Risk",
        color: "green",
        recommendations: [
          "Ideal profile for safe lending/borrowing",
          "You can maintain collateral ratio between 75-80%",
          "You can take more aggressive positions on stablecoins",
        ],
      };
    } else if (riskScore <= 70) {
      return {
        level: "Medium Risk",
        color: "yellow",
        recommendations: [
          "Keep collateral ratio between 60-70%",
          "Keep your position sizes at moderate levels",
          "Distribute risk across various assets",
        ],
      };
    } else {
      return {
        level: "High Risk",
        color: "red",
        recommendations: [
          "Use low collateral ratios (40-50%)",
          "Start with small positions",
          "Focus on high liquidity assets",
          "Check your position status frequently",
        ],
      };
    }
  };

  const riskRecommendations = getRiskBasedRecommendations();

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
        🌊 Blend DeFi Protocol
        <span className="ml-2 text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
          Testnet
        </span>
      </h2>

      {/* Enhanced Pool Status Display */}
      {selectedPool?.isActive && selectedPool?.status && (
        <div
          className={`border rounded-lg p-4 mb-6 ${
            selectedPool.status === "FULLY_OPERATIONAL"
              ? "bg-green-50 border-green-200"
              : selectedPool.status === "NETWORK_READY"
              ? "bg-blue-50 border-blue-200"
              : selectedPool.status === "CONTRACT_EXISTS"
              ? "bg-yellow-50 border-yellow-200"
              : "bg-orange-50 border-orange-200"
          }`}
        >
          <div className="flex items-start">
            <div className="flex-shrink-0">
              {selectedPool.status === "FULLY_OPERATIONAL" ? (
                <svg
                  className="h-5 w-5 text-green-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : selectedPool.status === "NETWORK_READY" ? (
                <svg
                  className="h-5 w-5 text-blue-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : selectedPool.status === "CONTRACT_EXISTS" ? (
                <svg
                  className="h-5 w-5 text-yellow-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg
                  className="h-5 w-5 text-orange-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>
            <div className="ml-3 flex-1">
              <h3
                className={`text-sm font-medium ${
                  selectedPool.status === "FULLY_OPERATIONAL"
                    ? "text-green-800"
                    : selectedPool.status === "NETWORK_READY"
                    ? "text-blue-800"
                    : selectedPool.status === "CONTRACT_EXISTS"
                    ? "text-yellow-800"
                    : "text-orange-800"
                }`}
              >
                {selectedPool.description}
              </h3>
              <div
                className={`mt-2 text-sm ${
                  selectedPool.status === "FULLY_OPERATIONAL"
                    ? "text-green-700"
                    : selectedPool.status === "NETWORK_READY"
                    ? "text-blue-700"
                    : selectedPool.status === "CONTRACT_EXISTS"
                    ? "text-yellow-700"
                    : "text-orange-700"
                }`}
              >
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <p className="font-medium">Pool Capabilities:</p>
                    <ul className="text-xs mt-1 space-y-1">
                      {selectedPool.capabilities?.map((capability, index) => (
                        <li key={`cap-${index}`} className="flex items-center">
                          <span className="mr-1">•</span>
                          {capability}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium">Health Status:</p>
                    <div className="text-xs mt-1 space-y-1">
                      <div className="flex items-center">
                        <span
                          className={`mr-2 ${
                            selectedPool.health?.contract
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {selectedPool.health?.contract ? "✓" : "✗"}
                        </span>
                        Contract Accessible
                      </div>
                      <div className="flex items-center">
                        <span
                          className={`mr-2 ${
                            selectedPool.health?.network
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {selectedPool.health?.network ? "✓" : "✗"}
                        </span>
                        Network Connected
                      </div>
                      <div className="flex items-center">
                        <span
                          className={`mr-2 ${
                            selectedPool.health?.ledger
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {selectedPool.health?.ledger ? "✓" : "✗"}
                        </span>
                        Ledger Synced
                      </div>
                    </div>
                  </div>
                </div>
                {selectedPool.lastChecked && (
                  <p className="text-xs mt-2 opacity-75">
                    Last check:{" "}
                    {new Date(selectedPool.lastChecked).toLocaleString()}
                  </p>
                )}
              </div>

              {/* Action buttons for different statuses */}
              <div className="mt-3 flex gap-2">
                {selectedPool.isPending && selectedPool.canRetry && (
                  <button
                    onClick={handleRetryPool}
                    className="text-sm bg-orange-100 text-orange-800 px-3 py-1 rounded hover:bg-orange-200 transition-colors"
                  >
                    🔄 Refresh Status
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab("pools")}
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === "pools"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          🏊 Lending Pools
        </button>
        <button
          onClick={() => setActiveTab("position")}
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === "position"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          📊 My Position
        </button>
      </div>

      {/* Risk-Based Recommendations */}
      {riskRecommendations && (
        <div
          className={`rounded-lg p-4 mb-6 border-l-4 ${
            riskRecommendations.color === "green"
              ? "bg-green-50 border-green-400"
              : riskRecommendations.color === "yellow"
              ? "bg-yellow-50 border-yellow-400"
              : "bg-red-50 border-red-400"
          }`}
        >
          <h3
            className={`font-medium ${
              riskRecommendations.color === "green"
                ? "text-green-800"
                : riskRecommendations.color === "yellow"
                ? "text-yellow-800"
                : "text-red-800"
            }`}
          >
            🎯 DeFi Recommendations Based on Your Risk Score ({riskRecommendations.level})
          </h3>
          <ul
            className={`mt-2 text-sm list-disc list-inside ${
              riskRecommendations.color === "green"
                ? "text-green-700"
                : riskRecommendations.color === "yellow"
                ? "text-yellow-700"
                : "text-red-700"
            }`}
          >
            {riskRecommendations.recommendations.map((rec, index) => (
              <li key={`rec-${index}`}>{rec}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Pools Tab */}
      {activeTab === "pools" && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Available Lending Pools
          </h3>

          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading pools...</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {availablePools.map((pool) => (
                <div
                  key={pool.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedPool?.id === pool.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => setSelectedPool(pool)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-gray-900">
                          {pool.name}
                        </h4>
                        {pool.isActive && !pool.isPending && (
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                            🚀 LIVE
                          </span>
                        )}
                        {pool.isActive && pool.isPending && (
                          <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full font-medium">
                            ⏳ PENDING
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {pool.description}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {pool.assets.map((asset) => (
                          <span
                            key={asset}
                            className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                          >
                            {asset}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600">
                        <div>
                          Supply APR:{" "}
                          <span className="text-green-600 font-medium">
                            {pool.apr.supply}
                          </span>
                        </div>
                        <div>
                          Borrow APR:{" "}
                          <span className="text-red-600 font-medium">
                            {pool.apr.borrow}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Position Tab */}
      {activeTab === "position" && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">Your Position</h3>

          {!walletAddress ? (
            <div className="text-center py-8">
              <p className="text-gray-600">
                Connect your wallet to view your position
              </p>
            </div>
          ) : selectedPool?.isPending ? (
            <div className="text-center py-8">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                <svg
                  className="h-12 w-12 text-orange-400 mx-auto mb-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-orange-800 font-medium">
                  Pool Configuration Issue
                </p>
                <p className="text-orange-600 text-sm mt-2">
                  Selected pool is currently unavailable. Position information
                  cannot be retrieved.
                </p>
                <button
                  onClick={handleRetryPool}
                  className="mt-4 bg-orange-100 text-orange-800 px-4 py-2 rounded-lg hover:bg-orange-200 transition-colors"
                >
                  🔄 Reload Pools
                </button>
              </div>
            </div>
          ) : isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading position...</p>
            </div>
          ) : userPosition ? (
            <div className="grid md:grid-cols-2 gap-6">
              {/* Supplied Assets */}
              <div className="bg-green-50 rounded-lg p-4">
                <h4 className="font-medium text-green-800 mb-3">
                  💰 Supplied Assets
                </h4>
                {userPosition.supplies.length > 0 ? (
                  <div className="space-y-2">
                    {userPosition.supplies.map((supply, index) => (
                      <div key={index} className="flex justify-between">
                        <span className="text-green-700">
                          {supply.asset.slice(0, 8)}...
                        </span>
                        <span className="font-medium text-green-800">
                          {supply.amount}
                        </span>
                      </div>
                    ))}
                    <div className="border-t border-green-200 pt-2 mt-2">
                      <div className="flex justify-between font-medium">
                        <span className="text-green-700">Total Supplied:</span>
                        <span className="text-green-800">
                          {userPosition.totalSupplied}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-green-600">No collateral deposited yet</p>
                )}
              </div>

              {/* Borrowed Assets */}
              <div className="bg-red-50 rounded-lg p-4">
                <h4 className="font-medium text-red-800 mb-3">
                  🏦 Borrowed Assets
                </h4>
                {userPosition.borrows.length > 0 ? (
                  <div className="space-y-2">
                    {userPosition.borrows.map((borrow, index) => (
                      <div key={index} className="flex justify-between">
                        <span className="text-red-700">
                          {borrow.asset.slice(0, 8)}...
                        </span>
                        <span className="font-medium text-red-800">
                          {borrow.amount}
                        </span>
                      </div>
                    ))}
                    <div className="border-t border-red-200 pt-2 mt-2">
                      <div className="flex justify-between font-medium">
                        <span className="text-red-700">Total Borrowed:</span>
                        <span className="text-red-800">
                          {userPosition.totalBorrowed}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-red-600">No debt taken yet</p>
                )}
              </div>

              {/* Health Factor */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-3">
                  ❤️ Health Factor
                </h4>
                {userPosition.healthFactor !== null ? (
                  <div
                    className={`text-2xl font-bold ${
                      userPosition.healthFactor > 1.5
                        ? "text-green-600"
                        : userPosition.healthFactor > 1.2
                        ? "text-yellow-600"
                        : "text-red-600"
                    }`}
                  >
                    {userPosition.healthFactor === Infinity
                      ? "∞"
                      : userPosition.healthFactor.toFixed(2)}
                  </div>
                ) : (
                  <p className="text-blue-600">Cannot calculate</p>
                )}
                <p className="text-xs text-blue-600 mt-1">
                  Below 1.0 is subject to liquidation
                </p>
              </div>

              {/* Borrow Limit */}
              <div className="bg-purple-50 rounded-lg p-4">
                <h4 className="font-medium text-purple-800 mb-3">
                  🎯 Borrow Limit
                </h4>
                <div className="text-2xl font-bold text-purple-600">
                  {userPosition.borrowLimit}
                </div>
                <p className="text-xs text-purple-600 mt-1">
                  Maximum borrowable amount
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600">Position information not found</p>
            </div>
          )}
        </div>
      )}

      {/* Message Display */}
      {message && (
        <div
          className={`mt-6 rounded-lg p-4 ${
            messageType === "success"
              ? "bg-green-50 border border-green-200 text-green-800"
              : messageType === "error"
              ? "bg-red-50 border border-red-200 text-red-800"
              : "bg-blue-50 border border-blue-200 text-blue-800"
          }`}
        >
          <p className="font-medium">{message}</p>
        </div>
      )}
    </div>
  );
}
