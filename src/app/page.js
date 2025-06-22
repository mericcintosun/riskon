"use client";

import { useState, useEffect } from "react";
import { writeScoreToBlockchainEnhanced } from "./lib/writeScore";
import { testContractExists, getContractInfo } from "./lib/testContract";
import { performAutoRiskAnalysis } from "../lib/autoRiskAnalyzer";
import BlendDashboard from "../components/BlendDashboard.jsx";
import EnhancedLiquidityPools from "../components/EnhancedLiquidityPools.jsx";
import UserRiskProfile from "../components/UserRiskProfile.jsx";
import AutomatedRiskAnalyzer from "../components/AutomatedRiskAnalyzer.jsx";
import Header from "../components/Header.jsx";
import Link from "next/link";
import { useWallet } from "../contexts/WalletContext";
import { useToast } from "../contexts/ToastContext";
import { useIssueDetector } from "../hooks/useIssueDetector";
import { getTier, maxBorrow } from "../lib/borrowCalc";

export default function RiskScoringApp() {
  // Use global wallet context
  const {
    kit,
    connectedWallet,
    walletAddress,
    isLoading: walletLoading,
    initError,
    isReady,
    connectWallet,
    disconnectWallet,
  } = useWallet();

  // Toast notifications
  const { toast, showCategorizedError } = useToast();

  // Issue detection
  const {
    issues,
    isAnalyzing,
    analyzeApplication,
    validateFormInputs,
    runQuickHealthCheck,
  } = useIssueDetector();

  // Form state - simplified (keeping for fallback)
  const [txCount, setTxCount] = useState("");
  const [avgHours, setAvgHours] = useState("");
  const [assetTypes, setAssetTypes] = useState("");

  // Auto risk analysis state
  const [autoAnalysisResult, setAutoAnalysisResult] = useState(null);
  const [isAnalyzingWallet, setIsAnalyzingWallet] = useState(false);
  const [analysisMode, setAnalysisMode] = useState("enhanced"); // "enhanced", "auto" or "manual"

  // Collateral calculator state
  const [collateralAmount, setCollateralAmount] = useState("");

  // App state
  const [isLoading, setIsLoading] = useState(false);
  const [transactionHash, setTransactionHash] = useState("");
  const [contractStatus, setContractStatus] = useState("unknown");
  const [showBlendDashboard, setShowBlendDashboard] = useState(false);
  const [showEnhancedPools, setShowEnhancedPools] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [selectedTier, setSelectedTier] = useState(null);
  const [riskScore, setRiskScore] = useState(0);

  // Simplified risk score calculation
  const calculateRiskScore = (
    txCountInput = txCount,
    medianHoursInput = avgHours,
    assetKindsInput = assetTypes
  ) => {
    // Input validation
    const inputs = [
      parseFloat(txCountInput) || 0,
      parseFloat(medianHoursInput) || 0,
      parseFloat(assetKindsInput) || 0,
    ];

    // Basic field validation
    if (
      isNaN(inputs[0]) ||
      isNaN(inputs[1]) ||
      isNaN(inputs[2]) ||
      inputs[0] < 0 ||
      inputs[0] > 100 ||
      inputs[1] < 0 ||
      inputs[1] > 24 ||
      inputs[2] < 0 ||
      inputs[2] > 10
    ) {
      return 0; // Return 0 instead of null for invalid inputs
    }

    const [txCount, medianHours, assetKinds] = inputs;

    // Simple risk score calculation
    let score = 0;

    // Transaction count factor (0-100)
    if (txCount < 5) {
      score += 40; // Very low activity = high risk
    } else if (txCount < 20) {
      score += 20; // Low activity = medium risk
    } else if (txCount > 80) {
      score += 30; // Very high activity = high risk
    } else {
      score += 10; // Normal activity = low risk
    }

    // Time interval factor (0-24 hours)
    if (medianHours < 1) {
      score += 25; // Very fast transactions = high risk
    } else if (medianHours > 20) {
      score += 20; // Very slow transactions = medium risk
    } else {
      score += 5; // Normal time interval = low risk
    }

    // Asset diversity factor (0-10)
    if (assetKinds <= 1) {
      score += 30; // Single asset = high risk
    } else if (assetKinds <= 2) {
      score += 15; // Low diversity = medium risk
    } else if (assetKinds >= 8) {
      score += 10; // Too much diversity = low risk but complex
    } else {
      score += 5; // Good diversity = low risk
    }

    return Math.min(100, Math.max(0, score));
  };

  // Auto risk analysis when wallet connects
  useEffect(() => {
    if (walletAddress && analysisMode === "auto" && !autoAnalysisResult) {
      performWalletAnalysis();
    }
  }, [walletAddress, analysisMode]);

  // Calculate risk score when form values change with validation (manual mode)
  useEffect(() => {
    if (analysisMode === "manual") {
      const calculatedScore = calculateRiskScore();
      setRiskScore(calculatedScore);

      // Validate form inputs and show issues if any
      const validationErrors = validateFormInputs(
        txCount,
        avgHours,
        assetTypes
      );
      if (validationErrors.length > 0) {
        validationErrors.forEach((error) => {
          toast.warning(error, { duration: 3000 });
        });
      }
    } else if (autoAnalysisResult) {
      setRiskScore(autoAnalysisResult.riskScore);
    }
  }, [txCount, avgHours, assetTypes, analysisMode, autoAnalysisResult]);

  const isValidInput =
    analysisMode === "auto"
      ? autoAnalysisResult && autoAnalysisResult.riskScore !== null
      : riskScore !== null && (txCount || avgHours || assetTypes);

  // Test contract when kit is available
  useEffect(() => {
    if (kit) {
      testContract();
    }
  }, [kit]);

  // Show initialization errors
  useEffect(() => {
    if (initError) {
      showCategorizedError(initError, "Wallet system initialization failed");
    }
  }, [initError]);

  // Test contract existence
  const testContract = async () => {
    try {
      const loadingToast = toast.loading(
        "Testing smart contract connection..."
      );

      const contractInfo = await getContractInfo();

      toast.dismiss(loadingToast);

      if (contractInfo.exists) {
        setContractStatus("exists");

        toast.success("✅ Smart contract connection verified");
      } else {
        setContractStatus("missing");

        toast.error(`⛓️ Contract issue: ${contractInfo.error}`);
      }
    } catch (error) {
      console.error("❌ Contract test error:", error);
      setContractStatus("missing");
      showCategorizedError(error, "Smart contract connectivity test failed");
    }
  };

  // Handle wallet connection for header
  const handleConnectWallet = async () => {
    try {
      const loadingToast = toast.loading("Connecting to wallet...");
      const result = await connectWallet();
      toast.dismiss(loadingToast);

      if (result.success) {
        toast.success(`👛 Successfully connected to ${result.walletName}!`);
      }
    } catch (error) {
      toast.dismiss();

      // Handle cancellation gracefully
      if (error.message === "WALLET_SELECTION_CANCELLED") {
        toast.info("👋 Wallet selection was cancelled");
      } else if (error.message.includes("cancelled")) {
        toast.info("👋 Connection was cancelled");
      } else {
        showCategorizedError(error, "Failed to connect wallet");
      }
    }
  };

  // Handle wallet disconnection
  const handleDisconnectWallet = () => {
    try {
      const result = disconnectWallet();
      if (result.success) {
        // Reset analysis when wallet disconnects
        setAutoAnalysisResult(null);
        setRiskScore(0);
        toast.success("👛 Wallet disconnected successfully");
      } else {
        toast.warning("Wallet disconnected (with minor issues)");
      }
    } catch (error) {
      showCategorizedError(error, "Error during wallet disconnection");
    }
  };

  // Perform automatic wallet analysis
  const performWalletAnalysis = async () => {
    if (!walletAddress) return;

    try {
      setIsAnalyzingWallet(true);

      // Detect wallet type and customize loading message
      const isPasskeyWallet = walletAddress.startsWith("C");
      const loadingMessage = isPasskeyWallet
        ? "🔐 Analyzing Passkey smart contract..."
        : "🔍 Analyzing wallet transaction history...";

      const loadingToast = toast.loading(loadingMessage);

      const analysisResult = await performAutoRiskAnalysis(walletAddress);

      toast.dismiss(loadingToast);
      setAutoAnalysisResult(analysisResult);

      // Customize success message based on wallet type
      if (analysisResult.addressType === "contract") {
        toast.success(
          `✅ Passkey analysis completed! Risk Score: ${analysisResult.riskScore} (${analysisResult.confidence} confidence)`,
          { duration: 6000 }
        );

        // Show Passkey-specific information
        setTimeout(() => {
          toast.info(
            `🔐 Passkey smart contract analyzed - Contract status: ${analysisResult.analysis.contractStatus}`,
            {
              duration: 8000,
            }
          );
        }, 2000);

        // Show additional info about Passkey wallets
        setTimeout(() => {
          toast.info(
            "💡 Passkey wallets are new-generation smart contracts with enhanced security",
            {
              duration: 6000,
            }
          );
        }, 4000);
      } else {
        // Traditional wallet analysis
        toast.success(
          `✅ Account analysis completed! Risk Score: ${analysisResult.riskScore} (${analysisResult.confidence} confidence)`,
          { duration: 6000 }
        );

        // Show detailed factors
        setTimeout(() => {
          toast.info(
            `📊 Analysis: ${analysisResult.analysis.txCount} transactions, ${analysisResult.analysis.assetTypes} assets, ${analysisResult.analysis.avgHours}h avg interval`,
            {
              duration: 8000,
            }
          );
        }, 2000);
      }
    } catch (error) {
      console.error("❌ Auto analysis error:", error);
      toast.dismiss();

      if (
        error.message.includes("404") ||
        error.message.includes("not found")
      ) {
        toast.warning(
          "⚠️ No transaction history found. Switch to manual mode or fund your wallet first.",
          {
            duration: 6000,
          }
        );
        setAnalysisMode("manual");
      } else if (
        error.message.includes("Invalid Stellar address format") ||
        error.message.includes("Invalid length")
      ) {
        toast.error(
          "❌ Invalid wallet address format. Please reconnect your wallet.",
          {
            duration: 6000,
          }
        );
      } else {
        showCategorizedError(error, "Automatic wallet analysis failed");
        // Fallback to manual mode on error
        setAnalysisMode("manual");
      }
    } finally {
      setIsAnalyzingWallet(false);
    }
  };

  // Submit risk score to blockchain
  const submitRiskScore = async () => {
    if (!kit || !walletAddress) {
      toast.error("⚠️ Please connect wallet and enter valid data");
      return;
    }

    if (contractStatus !== "exists") {
      toast.error(
        "⛓️ Smart contract not available. Please check your connection."
      );
      return;
    }

    // Final validation
    const validationErrors = validateFormInputs(txCount, avgHours, assetTypes);
    if (validationErrors.length > 0) {
      toast.error(`⚠️ Validation errors: ${validationErrors.join(", ")}`);
      return;
    }

    try {
      setIsLoading(true);

      const loadingToast = toast.loading(
        "💾 Saving risk score to blockchain..."
      );

      const result = await writeScoreToBlockchainEnhanced({
        kit,
        address: walletAddress,
        score: riskScore,
      });

      const hash = result.hash;

      toast.dismiss(loadingToast);
      setTransactionHash(hash);

      // Show success message based on storage method
      if (
        result.method === "local_storage" ||
        result.method === "memory_only"
      ) {
        toast.warning("⚠️ Blockchain storage failed - using local storage", {
          duration: 6000,
        });
        toast.info(result.note || "Risk score stored locally as backup", {
          duration: 8000,
        });
      } else {
        toast.success("✅ Risk score successfully saved to blockchain!", {
          duration: 6000,
        });
        if (
          hash &&
          hash !== `local_${Date.now()}` &&
          hash !== `fallback_${Date.now()}`
        ) {
          toast.info(`🔗 Transaction hash: ${hash.substring(0, 8)}...`, {
            duration: 5000,
          });
        }
      }

      // Show additional success info
      setTimeout(() => {
        toast.info("🚀 You can now access DeFi features!", {
          duration: 5000,
        });
      }, 1000);

      // Show Enhanced Liquidity Pools after successful risk score submission
      // This should ALWAYS happen regardless of storage method
      setShowBlendDashboard(true);
      setShowEnhancedPools(true);
    } catch (error) {
      console.error("❌ Blockchain write error:", error);
      toast.dismiss(loadingToast);

      // Check if user cancelled transaction
      if (
        error.message?.includes("cancelled") ||
        error.message?.includes("User rejected") ||
        error.message?.includes("denied")
      ) {
        toast.info("ℹ️ Transaction was cancelled by user", {
          duration: 4000,
        });
      } else {
        showCategorizedError(error, "Failed to save risk score to blockchain");
      }

      // Even if there's an error, if we have a valid risk score, show the pools
      if (riskScore > 0) {
        setShowBlendDashboard(true);
        setShowEnhancedPools(true);

        toast.info(
          "💡 Risk score calculated - you can still explore features!",
          {
            duration: 5000,
          }
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle form input changes with real-time validation
  const handleTxCountChange = (e) => {
    const value = e.target.value;
    setTxCount(value);

    if (value && (isNaN(value) || value < 0 || value > 100)) {
      toast.warning("Transaction count must be between 0-100", {
        duration: 2000,
      });
    }
  };

  const handleAvgHoursChange = (e) => {
    const value = e.target.value;
    setAvgHours(value);

    if (value && (isNaN(value) || value < 0 || value > 24)) {
      toast.warning("Average hours must be between 0-24", { duration: 2000 });
    }
  };

  const handleAssetTypesChange = (e) => {
    const value = e.target.value;
    setAssetTypes(value);

    if (value && (isNaN(value) || value < 0 || value > 10)) {
      toast.warning("Asset types must be between 0-10", { duration: 2000 });
    }
  };

  const handleCollateralChange = (e) => {
    const value = e.target.value;
    setCollateralAmount(value);

    if (value && (isNaN(parseFloat(value)) || parseFloat(value) < 0)) {
      toast.warning("Please enter a valid collateral amount", {
        duration: 2000,
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Header />

      <main className="pt-8 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Hero Section */}
          <div className="text-center mb-20">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
              AI-Powered{" "}
              <span className="bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
                Risk Scoring
              </span>
            </h1>
            <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-8">
              Calculate your personalized blockchain risk score using advanced
              AI analysis. Get tailored DeFi recommendations and unlock better
              rates based on your transaction patterns.
            </p>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto mb-12">
              <div className="text-center">
                <div className="text-2xl font-bold text-white mb-1">
                  AI-Powered
                </div>
                <div className="text-sm text-slate-400">Risk Analysis</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white mb-1">&lt;5s</div>
                <div className="text-sm text-slate-400">Analysis Time</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white mb-1">100%</div>
                <div className="text-sm text-slate-400">Privacy Protected</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white mb-1">
                  Instant
                </div>
                <div className="text-sm text-slate-400">DeFi Access</div>
              </div>
            </div>

            {/* Quick Navigation */}
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              <Link href="/how-it-works">
                <button className="bg-slate-800/50 hover:bg-slate-700/50 text-white px-6 py-3 rounded-xl border border-slate-700/50 transition-all duration-300 flex items-center">
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    />
                  </svg>
                  How It Works
                </button>
              </Link>
              <Link href="/features">
                <button className="bg-slate-800/50 hover:bg-slate-700/50 text-white px-6 py-3 rounded-xl border border-slate-700/50 transition-all duration-300 flex items-center">
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Features
                </button>
              </Link>
              <Link href="/about">
                <button className="bg-slate-800/50 hover:bg-slate-700/50 text-white px-6 py-3 rounded-xl border border-slate-700/50 transition-all duration-300 flex items-center">
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  About
                </button>
              </Link>
            </div>
          </div>

          {/* Wallet Connection Prompt */}
          {!walletAddress && (
            <div className="max-w-4xl mx-auto mb-16">
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-8 text-center">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-violet-500/20 to-purple-600/20 rounded-2xl flex items-center justify-center">
                  <svg
                    className="w-10 h-10 text-violet-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white mb-4">
                  Connect Your Wallet
                </h2>
                <p className="text-slate-400 mb-6 max-w-2xl mx-auto">
                  To calculate your risk score and access DeFi features, please
                  connect your Stellar wallet first.
                </p>
                {!isReady && (
                  <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                    <p className="text-amber-400 text-sm">
                      ⚠️ Wallet system is initializing... Please wait
                    </p>
                  </div>
                )}
                <div className="flex flex-wrap justify-center gap-4">
                  <Link href="/wallet">
                    <button
                      className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8 py-4 rounded-xl font-semibold transition-all duration-300 flex items-center disabled:opacity-50"
                      disabled={!isReady}
                    >
                      <svg
                        className="w-6 h-6 mr-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                        />
                      </svg>
                      Connect Wallet
                    </button>
                  </Link>
                  <button
                    onClick={analyzeApplication}
                    disabled={isAnalyzing}
                    className="bg-slate-700/50 hover:bg-slate-600/50 text-white px-8 py-4 rounded-xl font-semibold transition-all duration-300 flex items-center disabled:opacity-50"
                  >
                    <svg
                      className="w-6 h-6 mr-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    {isAnalyzing ? "Analyzing..." : "Check Issues"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Contract Status - Only show if there's an issue */}
          {contractStatus === "missing" && (
            <div className="max-w-4xl mx-auto mb-8">
              <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-red-500/20 rounded-2xl flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-red-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-red-400 mb-1">
                      Smart Contract Not Found
                    </h3>
                    <p className="text-slate-400">
                      Contract not deployed or inaccessible
                    </p>
                  </div>
                  <button
                    onClick={testContract}
                    className="bg-slate-700/50 hover:bg-slate-600/50 text-white px-4 py-2 rounded-xl transition-all duration-300 flex items-center"
                  >
                    <svg
                      className="w-4 h-4 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    Retry
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Risk Scoring Section */}
          {walletAddress && (
            <div className="max-w-6xl mx-auto mb-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-white mb-4">
                  Risk Score Analysis
                </h2>
                <p className="text-slate-400 text-lg">
                  Choose your preferred analysis method
                </p>
              </div>

              {/* Analysis Mode Toggle */}
              <div className="flex items-center justify-center space-x-4 mb-12 flex-wrap">
                <button
                  onClick={() => setAnalysisMode("enhanced")}
                  className={`px-6 py-4 rounded-xl transition-all duration-300 text-sm font-semibold flex items-center ${
                    analysisMode === "enhanced"
                      ? "bg-gradient-to-r from-emerald-500/20 to-blue-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:bg-slate-700/50 hover:text-white"
                  }`}
                >
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    />
                  </svg>
                  🧠 AI Enhanced
                </button>
                <button
                  onClick={() => setAnalysisMode("auto")}
                  className={`px-6 py-4 rounded-xl transition-all duration-300 text-sm font-semibold flex items-center ${
                    analysisMode === "auto"
                      ? "bg-gradient-to-r from-violet-500/20 to-purple-500/20 text-violet-400 border border-violet-500/30"
                      : "bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:bg-slate-700/50 hover:text-white"
                  }`}
                >
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                  ⚡ Quick Auto
                </button>
                <button
                  onClick={() => setAnalysisMode("manual")}
                  className={`px-6 py-4 rounded-xl transition-all duration-300 text-sm font-semibold flex items-center ${
                    analysisMode === "manual"
                      ? "bg-gradient-to-r from-violet-500/20 to-purple-500/20 text-violet-400 border border-violet-500/30"
                      : "bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:bg-slate-700/50 hover:text-white"
                  }`}
                >
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                    />
                  </svg>
                  ✍️ Manual
                </button>
              </div>

              <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-8">
                {/* Enhanced AI Analysis */}
                {analysisMode === "enhanced" && <AutomatedRiskAnalyzer />}

                {/* Auto Analysis Display */}
                {analysisMode === "auto" && (
                  <div className="space-y-6">
                    {!autoAnalysisResult && !isAnalyzingWallet && (
                      <div className="text-center p-8 bg-gradient-to-br from-violet-500/10 to-purple-600/10 rounded-2xl">
                        <div className="w-16 h-16 mx-auto mb-4 bg-violet-500/20 rounded-2xl flex items-center justify-center">
                          <svg
                            className="w-8 h-8 text-violet-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13 10V3L4 14h7v7l9-11h-7z"
                            />
                          </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-white/90 mb-2">
                          Ready for Auto Analysis
                        </h3>
                        <p className="text-white/70 mb-4">
                          Click the button below to analyze your wallet's
                          transaction history automatically
                        </p>
                        <button
                          onClick={performWalletAnalysis}
                          disabled={isAnalyzing}
                          className="btn-primary px-6 py-3"
                        >
                          <svg
                            className="w-5 h-5 mr-2"
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
                          Analyze Wallet
                        </button>
                      </div>
                    )}

                    {isAnalyzing && (
                      <div className="text-center p-8 bg-gradient-to-br from-blue-500/10 to-indigo-600/10 rounded-2xl">
                        <div className="loading-modern mb-4">
                          <div className="loading-dot"></div>
                          <div className="loading-dot"></div>
                          <div className="loading-dot"></div>
                        </div>
                        <h3 className="text-lg font-semibold text-white/90 mb-2">
                          Analyzing Transaction History
                        </h3>
                        <p className="text-white/70">
                          Fetching data from Stellar Horizon API...
                        </p>
                      </div>
                    )}

                    {autoAnalysisResult && (
                      <div className="space-y-4">
                        <div className="bg-gradient-to-br from-emerald-500/10 to-green-600/10 rounded-2xl p-6">
                          <h3 className="text-lg font-semibold text-emerald-400 mb-4">
                            Analysis Results
                          </h3>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-white/70">
                                Transactions:
                              </span>
                              <span className="text-white/90 ml-2 font-mono">
                                {autoAnalysisResult.analysis.txCount}
                              </span>
                            </div>
                            <div>
                              <span className="text-white/70">Avg Hours:</span>
                              <span className="text-white/90 ml-2 font-mono">
                                {autoAnalysisResult.analysis.avgHours}h
                              </span>
                            </div>
                            <div>
                              <span className="text-white/70">
                                Asset Types:
                              </span>
                              <span className="text-white/90 ml-2 font-mono">
                                {autoAnalysisResult.analysis.assetTypes}
                              </span>
                            </div>
                            <div>
                              <span className="text-white/70">Confidence:</span>
                              <span
                                className={`ml-2 font-semibold ${
                                  autoAnalysisResult.confidence === "High"
                                    ? "text-emerald-400"
                                    : autoAnalysisResult.confidence === "Medium"
                                    ? "text-amber-400"
                                    : "text-red-400"
                                }`}
                              >
                                {autoAnalysisResult.confidence}
                              </span>
                            </div>
                          </div>
                          <div className="mt-4 pt-4 border-t border-white/10">
                            {/* Passkey-specific information */}
                            {autoAnalysisResult.addressType === "contract" &&
                              autoAnalysisResult.passkeyInfo && (
                                <div className="mb-4 p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                                  <div className="flex items-center mb-2">
                                    <svg
                                      className="w-4 h-4 text-purple-400 mr-2"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                      />
                                    </svg>
                                    <span className="text-sm font-medium text-purple-300">
                                      Passkey Smart Contract
                                    </span>
                                  </div>
                                  <p className="text-xs text-purple-200/80">
                                    {autoAnalysisResult.passkeyInfo.message}
                                  </p>
                                  <p className="text-xs text-purple-200/60 mt-1">
                                    {autoAnalysisResult.passkeyInfo.note}
                                  </p>
                                  {autoAnalysisResult.analysis
                                    .contractStatus && (
                                    <div className="mt-2 text-xs">
                                      <span className="text-purple-300">
                                        Status:{" "}
                                      </span>
                                      <span
                                        className={`capitalize ${
                                          autoAnalysisResult.analysis
                                            .contractStatus === "active"
                                            ? "text-emerald-400"
                                            : autoAnalysisResult.analysis
                                                .contractStatus ===
                                              "new_or_inactive"
                                            ? "text-amber-400"
                                            : "text-gray-400"
                                        }`}
                                      >
                                        {autoAnalysisResult.analysis.contractStatus.replace(
                                          "_",
                                          " "
                                        )}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}

                            <p className="text-sm text-white/70 mb-2">
                              Risk Factors:
                            </p>
                            <ul className="text-xs text-white/60 space-y-1">
                              {autoAnalysisResult.factors
                                .slice(0, 3)
                                .map((factor, index) => (
                                  <li key={index}>• {factor}</li>
                                ))}
                            </ul>
                          </div>
                          <button
                            onClick={performWalletAnalysis}
                            className="btn-secondary text-sm px-4 py-2 mt-4"
                          >
                            Refresh Analysis
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Manual Entry Form */}
                {analysisMode === "manual" && (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-white/90 mb-3 font-montserrat">
                        Transaction Count (0-100)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={txCount}
                        onChange={handleTxCountChange}
                        className="input-modern"
                        placeholder="e.g. 25"
                      />
                      <p className="text-caption mt-2">
                        Number of transactions in the last 30 days
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/90 mb-3 font-montserrat">
                        Average Time Interval (0-24 hours)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="24"
                        step="0.1"
                        value={avgHours}
                        onChange={handleAvgHoursChange}
                        className="input-modern"
                        placeholder="e.g. 8.5"
                      />
                      <p className="text-caption mt-2">
                        Average time between transactions
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white/90 mb-3 font-montserrat">
                        Asset Types (0-10)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        value={assetTypes}
                        onChange={handleAssetTypesChange}
                        className="input-modern"
                        placeholder="e.g. 3"
                      />
                      <p className="text-caption mt-2">
                        Number of different asset/token types used
                      </p>
                    </div>
                  </div>
                )}

                {/* Risk Score Display */}
                <div className="mt-8 animate-scale-in">
                  <div className="risk-score-container">
                    <div className="text-center mb-6">
                      <h3 className="text-subheading mb-4">Your Risk Score</h3>
                      <div className="risk-score-value mb-3">
                        {Math.round(riskScore)}
                      </div>
                      <div className="text-caption mb-6">
                        {riskScore <= 30
                          ? "Low Risk"
                          : riskScore <= 70
                          ? "Medium Risk"
                          : "High Risk"}
                      </div>
                      <div className="risk-bar">
                        <div
                          className="risk-bar-fill"
                          style={{ width: `${Math.min(100, riskScore)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="mt-8 space-y-4">
                  {/* Submit Risk Score Button */}
                  <div className="text-center">
                    <button
                      onClick={submitRiskScore}
                      disabled={
                        !kit ||
                        !walletAddress ||
                        !isValidInput ||
                        isLoading ||
                        contractStatus !== "exists"
                      }
                      className="btn-primary text-lg px-10 py-4 disabled:opacity-50 disabled:cursor-not-allowed shadow-accent hover:shadow-2xl"
                    >
                      {isLoading ? (
                        <div className="loading-modern">
                          <div className="loading-dot"></div>
                          <div className="loading-dot"></div>
                          <div className="loading-dot"></div>
                        </div>
                      ) : (
                        <>
                          <svg
                            className="w-6 h-6 mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          Save Risk Score to Blockchain
                        </>
                      )}
                    </button>
                    <p className="text-caption mt-3">
                      {analysisMode === "auto" && autoAnalysisResult
                        ? `Automatically calculated score: ${riskScore} (${autoAnalysisResult.confidence} confidence)`
                        : analysisMode === "manual"
                        ? "Manual entry - your risk score will be saved to the blockchain"
                        : "Complete analysis to save your risk score"}
                    </p>
                  </div>

                  {/* Next Steps Buttons */}
                  {transactionHash && (
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                      <button
                        onClick={() => setShowUserProfile(true)}
                        className="btn-secondary px-8 py-3 flex items-center justify-center"
                      >
                        <span className="mr-2">👤</span>
                        View Risk Profile & Pool Access
                      </button>
                      <button
                        onClick={() => setShowEnhancedPools(true)}
                        className="btn-accent px-8 py-3 flex items-center justify-center"
                      >
                        <span className="mr-2">🎯</span>
                        Explore Investment Pools
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* User Risk Profile */}
          {showUserProfile && walletAddress && (
            <div className="mt-12 animate-fade-in">
              <div className="card-glass max-w-4xl mx-auto mb-8">
                <div className="text-center">
                  <h2 className="text-heading mb-4">
                    👤 Your Risk Profile & Investment Guide
                  </h2>
                  <p className="text-body">
                    Understand your risk profile and get personalized investment
                    recommendations
                  </p>
                </div>
              </div>
              <UserRiskProfile
                walletAddress={walletAddress}
                riskScore={riskScore}
                onTierSelect={(tier) => {
                  setSelectedTier(tier);
                  setShowEnhancedPools(true);
                  setShowUserProfile(false);
                }}
              />
            </div>
          )}

          {/* Enhanced Liquidity Pools */}
          {showEnhancedPools && walletAddress && (
            <div className="mt-12 animate-fade-in">
              <div className="card-glass max-w-4xl mx-auto mb-8">
                <div className="text-center">
                  <h2 className="text-heading mb-4">
                    🎯 Risk-Based Liquidity Pools
                  </h2>
                  <p className="text-body">
                    Access tier-classified liquidity pools based on your risk
                    score. Following Goldfinch/Maple methodology for responsible
                    DeFi.
                    {selectedTier && (
                      <span className="block mt-2 text-accent">
                        Showing {selectedTier} pools based on your selection
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <EnhancedLiquidityPools selectedTier={selectedTier} />
            </div>
          )}

          {/* Blend DeFi Dashboard */}
          {showBlendDashboard && walletAddress && (
            <div className="mt-12 animate-fade-in">
              <div className="card-glass max-w-4xl mx-auto mb-8">
                <div className="text-center">
                  <h2 className="text-heading mb-4">🌊 Blend DeFi Dashboard</h2>
                  <p className="text-body">
                    Traditional DeFi operations with demo pools. Your risk
                    score: {riskScore}
                  </p>
                </div>
              </div>
              <BlendDashboard
                kit={kit}
                walletAddress={walletAddress}
                riskScore={riskScore}
              />
            </div>
          )}

          {/* Collateral Calculator */}
          {walletAddress && (
            <div className="card-modern max-w-2xl mx-auto mt-8 mb-8 animate-fade-in">
              <div className="mb-6">
                <h2 className="text-subheading mb-4">Collateral Calculator</h2>
                <p className="text-caption">
                  Calculate your maximum borrowing limit based on your risk
                  score
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-3 font-montserrat">
                    Collateral (USDC)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={collateralAmount}
                    onChange={handleCollateralChange}
                    className={`input-modern ${
                      collateralAmount &&
                      (isNaN(parseFloat(collateralAmount)) ||
                        parseFloat(collateralAmount) < 0)
                        ? "border-red-500/50 focus:border-red-500"
                        : ""
                    }`}
                    placeholder="0.00"
                  />
                </div>

                {collateralAmount &&
                  !isNaN(parseFloat(collateralAmount)) &&
                  parseFloat(collateralAmount) >= 0 && (
                    <div className="bg-gradient-to-br from-violet-500/10 to-purple-600/10 rounded-2xl p-6 animate-scale-in">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-white/90 mb-2 font-montserrat">
                          {maxBorrow(
                            parseFloat(collateralAmount),
                            riskScore
                          ).toFixed(2)}{" "}
                          USDC
                        </div>
                        <div className="text-caption mb-4">
                          Maximum borrowing
                        </div>
                        <div className="flex items-center justify-center space-x-4 text-sm">
                          <span
                            className={`px-3 py-1 rounded-full font-medium ${
                              getTier(riskScore).name === "low"
                                ? "bg-emerald-500/20 text-emerald-400"
                                : getTier(riskScore).name === "medium"
                                ? "bg-amber-500/20 text-amber-400"
                                : "bg-red-500/20 text-red-400"
                            }`}
                          >
                            tier = {getTier(riskScore).name}
                          </span>
                          <span className="text-white/60">
                            factor ={" "}
                            {(
                              getTier(riskScore).collateralFactor * 100
                            ).toFixed(0)}
                            %
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                {!collateralAmount && (
                  <div className="bg-gradient-to-br from-violet-500/5 to-purple-600/5 rounded-2xl p-6 text-center">
                    <div className="text-lg text-white/60 mb-2 font-montserrat">
                      0 USDC
                    </div>
                    <div className="text-caption">Maximum borrowing</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
