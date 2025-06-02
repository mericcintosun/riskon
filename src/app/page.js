"use client";

import { useState, useEffect } from "react";
import { writeScoreToBlockchain } from "./lib/writeScore";
import { testContractExists, getContractInfo } from "./lib/testContract";
import BlendDashboard from "../components/BlendDashboard.jsx";
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
    disconnectWallet 
  } = useWallet();

  // Toast notifications
  const { toast, showCategorizedError } = useToast();

  // Issue detection
  const { 
    issues, 
    isAnalyzing, 
    analyzeApplication, 
    validateFormInputs,
    runQuickHealthCheck 
  } = useIssueDetector();

  // Form state - simplified
  const [txCount, setTxCount] = useState("");
  const [avgHours, setAvgHours] = useState("");
  const [assetTypes, setAssetTypes] = useState("");

  // Collateral calculator state
  const [collateralAmount, setCollateralAmount] = useState("");

  // App state
  const [isLoading, setIsLoading] = useState(false);
  const [transactionHash, setTransactionHash] = useState("");
  const [contractStatus, setContractStatus] = useState("unknown");
  const [showBlendDashboard, setShowBlendDashboard] = useState(false);
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

  // Calculate risk score when form values change with validation
  useEffect(() => {
    const calculatedScore = calculateRiskScore();
    setRiskScore(calculatedScore);
    
    // Validate form inputs and show issues if any
    const validationErrors = validateFormInputs(txCount, avgHours, assetTypes);
    if (validationErrors.length > 0) {
      validationErrors.forEach(error => {
        toast.warning(error, { duration: 3000 });
      });
    }
  }, [txCount, avgHours, assetTypes]);

  const isValidInput = riskScore !== null && (txCount || avgHours || assetTypes);

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
      console.log("🔍 Testing contract...");
      const loadingToast = toast.loading("Testing smart contract connection...");
      
      const contractInfo = await getContractInfo();

      toast.dismiss(loadingToast);

      if (contractInfo.exists) {
        setContractStatus("exists");
        console.log("✅ Contract exists and accessible");
        toast.success("✅ Smart contract connection verified");
      } else {
        setContractStatus("missing");
        console.log("❌ Contract not found:", contractInfo.error);
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
      showCategorizedError(error, "Failed to connect wallet");
    }
  };

  // Handle wallet disconnection
  const handleDisconnectWallet = () => {
    try {
      const result = disconnectWallet();
      if (result.success) {
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
      toast.error("⛓️ Smart contract not available. Please check your connection.");
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
      const loadingToast = toast.loading("💾 Saving risk score to blockchain...");

      const hash = await writeScoreToBlockchain({
        kit,
        address: walletAddress,
        score: riskScore,
      });

      toast.dismiss(loadingToast);
      setTransactionHash(hash);
      
      toast.success("✅ Risk score successfully saved to blockchain!", {
        duration: 6000,
      });

      // Show additional success info
      setTimeout(() => {
        toast.info("🚀 You can now access DeFi features!", {
          duration: 5000,
        });
      }, 1000);

      // Show Blend Dashboard after successful risk score submission
      setShowBlendDashboard(true);

      console.log("✅ Transaction successful:", hash);
    } catch (error) {
      console.error("❌ Blockchain write error:", error);
      showCategorizedError(error, "Failed to save risk score to blockchain");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle form input changes with real-time validation
  const handleTxCountChange = (e) => {
    const value = e.target.value;
    setTxCount(value);
    
    if (value && (isNaN(value) || value < 0 || value > 100)) {
      toast.warning("Transaction count must be between 0-100", { duration: 2000 });
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
      toast.warning("Please enter a valid collateral amount", { duration: 2000 });
    }
  };

  return (
    <>
      {/* Header Navigation */}
      <Header 
        walletAddress={walletAddress}
        connectedWallet={connectedWallet}
        isLoading={walletLoading}
        onConnectWallet={handleConnectWallet}
        onDisconnectWallet={handleDisconnectWallet}
      />

      {/* Main Content - Risk Scoring Dashboard */}
      <main className="min-h-screen">
        <div className="container-modern section-compact">
          {/* Page Header */}
          <div className="text-center mb-12">
            <h1 className="text-hero mb-8">
              Risk <span className="text-gradient-accent">Assessment</span>
            </h1>
            <p className="text-body max-w-2xl mx-auto mb-8">
              Calculate your personalized blockchain risk score using AI-powered analysis. 
              Get tailored DeFi recommendations based on your transaction patterns.
            </p>
            
            {/* Quick Navigation */}
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              <Link href="/how-it-works">
                <button className="btn-secondary px-6 py-3">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  How It Works
                </button>
              </Link>
              <Link href="/features">
                <button className="btn-secondary px-6 py-3">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Features
                </button>
              </Link>
              {!walletAddress && (
                <Link href="/wallet">
                  <button className="btn-primary px-6 py-3">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Connect Wallet
                  </button>
                </Link>
              )}
              
              {/* Issue Analysis Button */}
              <button
                onClick={analyzeApplication}
                disabled={isAnalyzing}
                className="btn-secondary px-6 py-3 disabled:opacity-50"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {isAnalyzing ? "Analyzing..." : "Check Issues"}
              </button>
            </div>
          </div>

          {/* Wallet Connection Prompt */}
          {!walletAddress && (
            <div className="card-glass max-w-2xl mx-auto mb-12 text-center animate-fade-in">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-purple-600/10 rounded-3xl"></div>
                <div className="relative">
                  <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-violet-500/20 to-purple-600/20 rounded-2xl flex items-center justify-center">
                    <svg className="w-8 h-8 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h2 className="text-subheading mb-4">Connect Your Wallet</h2>
                  <p className="text-body mb-6">
                    To calculate your risk score and access DeFi features, please connect your Stellar wallet first.
                  </p>
                  {!isReady && (
                    <div className="mb-4 p-3 bg-amber-500/20 rounded-lg">
                      <p className="text-amber-400 text-sm">
                        ⚠️ Wallet system is initializing... Please wait
                      </p>
                    </div>
                  )}
                  <Link href="/wallet">
                    <button 
                      className="btn-primary text-lg px-10 py-4 disabled:opacity-50"
                      disabled={!isReady}
                    >
                      <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      Connect Wallet
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Contract Status - Only show if there's an issue */}
          {contractStatus === "missing" && (
            <div className="card-modern border-red-500/30 mb-8 animate-fade-in">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-red-500/20 rounded-2xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-subheading text-red-400 mb-1">
                    Smart Contract Not Found
                  </h3>
                  <p className="text-caption">
                    Contract not deployed or inaccessible
                  </p>
                </div>
                <button onClick={testContract} className="btn-secondary">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Retry
                </button>
              </div>
            </div>
          )}

          {/* Risk Scoring Form */}
          {walletAddress && (
            <div className="card-modern max-w-2xl mx-auto mb-8 animate-slide-up">
              <div className="mb-8">
                <h2 className="text-subheading mb-6">
                  Transaction Information
                </h2>
              </div>

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

              {/* Risk Score Display */}
              <div className="mt-8 animate-scale-in">
                <div className="risk-score-container">
                  <div className="text-center mb-6">
                    <h3 className="text-subheading mb-4">
                      Your Risk Score
                    </h3>
                    <div className="risk-score-value mb-3">
                      {Math.round(riskScore)}
                    </div>
                    <div className="text-caption mb-6">
                      {riskScore <= 30 ? "Low Risk" : 
                       riskScore <= 70 ? "Medium Risk" : 
                       "High Risk"}
                    </div>
                    <div className="risk-bar">
                      <div 
                        className="risk-bar-fill"
                        style={{width: `${Math.min(100, riskScore)}%`}}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="mt-8 text-center">
                <button
                  onClick={submitRiskScore}
                  disabled={!kit || !walletAddress || !isValidInput || isLoading || contractStatus !== "exists"}
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
                      <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Save Risk Score
                    </>
                  )}
                </button>
                <p className="text-caption mt-3">
                  Your risk score will be saved to the blockchain
                </p>
              </div>
            </div>
          )}

          {/* Blend DeFi Dashboard */}
          {showBlendDashboard && walletAddress && (
            <div className="mt-12 animate-fade-in">
              <div className="card-glass max-w-4xl mx-auto mb-8">
                <div className="text-center">
                  <h2 className="text-heading mb-4">
                    DeFi Dashboard
                  </h2>
                  <p className="text-body">
                    Your risk score has been saved. You can now access DeFi features.
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
                <h2 className="text-subheading mb-4">
                  Collateral Calculator
                </h2>
                <p className="text-caption">
                  Calculate your maximum borrowing limit based on your risk score
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
                      collateralAmount && (isNaN(parseFloat(collateralAmount)) || parseFloat(collateralAmount) < 0)
                        ? 'border-red-500/50 focus:border-red-500'
                        : ''
                    }`}
                    placeholder="0.00"
                  />
                </div>

                {collateralAmount && !isNaN(parseFloat(collateralAmount)) && parseFloat(collateralAmount) >= 0 && (
                  <div className="bg-gradient-to-br from-violet-500/10 to-purple-600/10 rounded-2xl p-6 animate-scale-in">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white/90 mb-2 font-montserrat">
                        {maxBorrow(parseFloat(collateralAmount), riskScore).toFixed(2)} USDC
                      </div>
                      <div className="text-caption mb-4">
                        Maximum borrowing
                      </div>
                      <div className="flex items-center justify-center space-x-4 text-sm">
                        <span className={`px-3 py-1 rounded-full font-medium ${
                          getTier(riskScore).name === 'low' ? 'bg-emerald-500/20 text-emerald-400' :
                          getTier(riskScore).name === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          tier = {getTier(riskScore).name}
                        </span>
                        <span className="text-white/60">
                          factor = {(getTier(riskScore).collateralFactor * 100).toFixed(0)}%
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
                    <div className="text-caption">
                      Maximum borrowing
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
