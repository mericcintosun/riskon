"use client";

import { useState, useEffect } from "react";
import { testContractExists, getContractInfo } from "./lib/testContract";
import BlendDashboard from "../components/BlendDashboard.jsx";
import UserRiskProfile from "../components/UserRiskProfile.jsx";
import AutomatedRiskAnalyzer from "../components/AutomatedRiskAnalyzer.jsx";
import Header from "../components/Header.jsx";
import Link from "next/link";
import { csrfFetch } from "../lib/csrfFetch";
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
    runQuickHealthCheck,
  } = useIssueDetector();

  // Collateral calculator state
  const [collateralAmount, setCollateralAmount] = useState("");

  // App state
  const [isLoading, setIsLoading] = useState(false);
  const [transactionHash, setTransactionHash] = useState("");
  const [contractStatus, setContractStatus] = useState("unknown");
  const [showBlendDashboard, setShowBlendDashboard] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [riskScore, setRiskScore] = useState(0);

  const isValidInput = riskScore !== null && riskScore > 0;

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
        setRiskScore(0);
        toast.success("👛 Wallet disconnected successfully");
      } else {
        toast.warning("Wallet disconnected (with minor issues)");
      }
    } catch (error) {
      showCategorizedError(error, "Error during wallet disconnection");
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

    try {
      setIsLoading(true);

      const loadingToast = toast.loading(
        "💾 Requesting a signed risk attestation..."
      );

      // The browser never submits a score. The oracle re-derives it from data
      // the server fetches from Horizon and signs the write with the contract
      // admin key, so the locally entered inputs cannot influence what lands
      // on-chain.
      const response = await csrfFetch("/api/risk/attest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: walletAddress }),
      });

      const payload = await response.json();
      toast.dismiss(loadingToast);

      if (!response.ok || !payload.success) {
        const err = new Error(payload?.error || "Attestation failed");
        err.code = payload?.code;
        throw err;
      }

      const hash = payload.data.hash;
      setTransactionHash(hash);

      toast.success("✅ Risk score attested on-chain by the oracle!", {
        duration: 6000,
      });
      toast.info(
        `🔎 Oracle-verified score: ${payload.data.score} (${payload.data.tier})`,
        { duration: 6000 }
      );
      if (hash) {
        toast.info(`🔗 Transaction hash: ${hash.substring(0, 8)}...`, {
          duration: 5000,
        });
      }

      // Show additional success info
      setTimeout(() => {
        toast.info("🚀 You can now access DeFi features!", {
          duration: 5000,
        });
      }, 1000);

      setShowBlendDashboard(true);
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
              387 issuers call themselves{" "}
              <span className="bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
                USDC
              </span>
              . One is Circle.
            </h1>
            <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-8">
              Riskon reads Stellar risk straight from chain: which issuer is the
              real one, what that issuer can do to your balance, and how Blend&apos;s
              lending pools actually rate. No black box — every rating ships with
              its raw inputs.
            </p>

            {/* Measured facts, not marketing. Each is checkable from the links
                below, which is the point: nothing here is a number we made up. */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto mb-12">
              <div className="text-center">
                <div className="text-2xl font-bold text-white mb-1">387</div>
                <div className="text-sm text-slate-400">
                  Issuers using the code USDC
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white mb-1">97.4%</div>
                <div className="text-sm text-slate-400">
                  Of USDC holders on the real one
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white mb-1">Freeze</div>
                <div className="text-sm text-slate-400">
                  Circle can freeze your USDC
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white mb-1">Seize</div>
                <div className="text-sm text-slate-400">
                  Ondo can claw back your USDY
                </div>
              </div>
            </div>

            {/* Lead with the thing that cannot be gamed by its subject. */}
            <div className="mb-10 flex flex-wrap justify-center gap-4">
              <Link href="/assets">
                <button className="rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-3 font-medium text-white transition-all duration-300 hover:scale-105 hover:shadow-2xl">
                  Check an asset issuer →
                </button>
              </Link>
              <Link href="/pools">
                <button className="rounded-xl border border-slate-700/50 bg-slate-800/50 px-8 py-3 font-medium text-white transition-all duration-300 hover:bg-slate-700/50">
                  Rate a lending pool
                </button>
              </Link>
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

              <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-8">
                {/* The one scoring path: the calibrated model, which is also
                    what the oracle re-derives and writes on chain. */}
                <AutomatedRiskAnalyzer />



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
                      The oracle re-derives this score from chain data it fetches
                      itself, so what lands on chain is what you see here.
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
                      <Link
                        href="/pools"
                        className="btn-accent px-8 py-3 flex items-center justify-center"
                      >
                        <span className="mr-2">🎯</span>
                        Explore Investment Pools
                      </Link>
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
              <UserRiskProfile walletAddress={walletAddress} riskScore={riskScore} />
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
