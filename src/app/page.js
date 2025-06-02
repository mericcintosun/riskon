"use client";

import { useState, useEffect } from "react";
import { writeScoreToBlockchain } from "./lib/writeScore";
import { testContractExists, getContractInfo } from "./lib/testContract";
import BlendDashboard from "../components/BlendDashboard.jsx";
import Header from "../components/Header.jsx";
import Link from "next/link";
import { useWallet } from "../contexts/WalletContext";
import { getTier, maxBorrow } from "../lib/borrowCalc";

export default function RiskScoringApp() {
  // Use global wallet context
  const { 
    kit, 
    connectedWallet, 
    walletAddress, 
    isLoading: walletLoading,
    connectWallet,
    disconnectWallet 
  } = useWallet();

  // Form state - simplified
  const [txCount, setTxCount] = useState("");
  const [avgHours, setAvgHours] = useState("");
  const [assetTypes, setAssetTypes] = useState("");

  // Collateral calculator state
  const [collateralAmount, setCollateralAmount] = useState("");

  // App state
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState(""); // success, error, info
  const [transactionHash, setTransactionHash] = useState("");
  const [contractStatus, setContractStatus] = useState("unknown"); // unknown, exists, missing
  const [showBlendDashboard, setShowBlendDashboard] = useState(false);
  const [riskScore, setRiskScore] = useState(null);

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
      return null;
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

  // Calculate risk score when form values change
  useEffect(() => {
    const calculatedScore = calculateRiskScore();
    setRiskScore(calculatedScore);
  }, [txCount, avgHours, assetTypes]);

  const isValidInput = riskScore !== null;

  // Test contract when kit is available
  useEffect(() => {
    if (kit) {
      testContract();
    }
  }, [kit]);

  // Test contract existence
  const testContract = async () => {
    try {
      console.log("🔍 Testing contract...");
      const contractInfo = await getContractInfo();

      if (contractInfo.exists) {
        setContractStatus("exists");
        console.log("✅ Contract exists and accessible");
      } else {
        setContractStatus("missing");
        console.log("❌ Contract not found:", contractInfo.error);
        setMessage(
          `⚠️ Contract not found: ${contractInfo.error}. Please ensure the contract is deployed.`
        );
        setMessageType("error");
      }
    } catch (error) {
      console.error("❌ Contract test error:", error);
      setContractStatus("missing");
      setMessage(`Contract test error: ${error.message}`);
      setMessageType("error");
    }
  };

  // Handle wallet connection for header
  const handleConnectWallet = async () => {
    try {
      await connectWallet();
    } catch (error) {
      setMessage(`Wallet connection error: ${error.message}`);
      setMessageType("error");
    }
  };

  // Submit risk score to blockchain
  const submitRiskScore = async () => {
    if (!kit || !walletAddress || riskScore === null) {
      setMessage("Please connect wallet and enter valid data");
      setMessageType("error");
      return;
    }

    if (contractStatus !== "exists") {
      setMessage(
        "Contract not found. Please ensure the contract is deployed."
      );
      setMessageType("error");
      return;
    }

    try {
      setIsLoading(true);
      setMessage("Saving risk score to blockchain...");
      setMessageType("info");

      const hash = await writeScoreToBlockchain({
        kit,
        address: walletAddress,
        score: riskScore,
      });

      setTransactionHash(hash);
      setMessage(
        `✅ Risk score successfully saved to blockchain! You can now use DeFi features.`
      );
      setMessageType("success");

      // Show Blend Dashboard after successful risk score submission
      setShowBlendDashboard(true);

      console.log("✅ Transaction successful:", hash);
    } catch (error) {
      console.error("❌ Blockchain write error:", error);
      setMessage(`Blockchain save error: ${error.message}`);
      setMessageType("error");
    } finally {
      setIsLoading(false);
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
        onDisconnectWallet={disconnectWallet}
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
                  <Link href="/wallet">
                    <button className="btn-primary text-lg px-10 py-4">
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
                    onChange={(e) => setTxCount(e.target.value)}
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
                    onChange={(e) => setAvgHours(e.target.value)}
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
                    onChange={(e) => setAssetTypes(e.target.value)}
                    className="input-modern"
                    placeholder="e.g. 3"
                  />
                  <p className="text-caption mt-2">
                    Number of different asset/token types used
                  </p>
                </div>
              </div>

              {/* Risk Score Display */}
              {riskScore !== null && (
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
              )}

              {/* Submit Button */}
              <div className="mt-8 text-center">
                <button
                  onClick={submitRiskScore}
                  disabled={!kit || !walletAddress || riskScore === null || !isValidInput || isLoading || contractStatus !== "exists"}
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

          {/* Message Display */}
          {message && (
            <div className={`card-modern max-w-2xl mx-auto mb-8 ${
              messageType === "success" ? "border-emerald-500/30" : 
              messageType === "error" ? "border-red-500/30" : 
              "border-amber-500/30"
            } animate-fade-in`}>
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    messageType === "success" ? "bg-emerald-500/20" : 
                    messageType === "error" ? "bg-red-500/20" : 
                    "bg-amber-500/20"
                  }`}>
                    {messageType === "success" ? (
                      <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : messageType === "error" ? (
                      <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    ) : (
                      <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <p className="font-medium font-montserrat text-white/90">{message}</p>
                  {transactionHash && (
                    <p className="text-caption mt-2 font-mono">
                      Hash: {transactionHash.substring(0, 8)}...{transactionHash.substring(56)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Blend DeFi Dashboard */}
          {showBlendDashboard && walletAddress && riskScore !== null && (
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

          {/* Teminat Hesaplayıcı */}
          {riskScore !== null && (
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
                    onChange={(e) => setCollateralAmount(e.target.value)}
                    className={`input-modern ${
                      collateralAmount && (isNaN(parseFloat(collateralAmount)) || parseFloat(collateralAmount) < 0)
                        ? 'border-red-500/50 focus:border-red-500'
                        : ''
                    }`}
                    placeholder="0.00"
                  />
                  {collateralAmount && (isNaN(parseFloat(collateralAmount)) || parseFloat(collateralAmount) < 0) && (
                    <p className="text-red-400 text-sm mt-2 font-montserrat">
                      Please enter a valid amount
                    </p>
                  )}
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
