"use client";

import { useState, useEffect } from "react";
import {
  StellarWalletsKit,
  WalletNetwork,
  allowAllModules,
  ALBEDO_ID,
  XBULL_ID,
  FREIGHTER_ID,
} from "@creit.tech/stellar-wallets-kit";
import { writeScoreToBlockchain } from "./lib/writeScore";
import { testContractExists, getContractInfo } from "./lib/testContract";
import BlendDashboard from "../components/BlendDashboard.jsx";
import Header from "../components/Header.jsx";
import LandingPage from "../components/LandingPage.jsx";

export default function RiskScoringApp() {
  // App view state
  const [currentView, setCurrentView] = useState("landing"); // landing, dashboard
  
  // Wallet state
  const [kit, setKit] = useState(null);
  const [connectedWallet, setConnectedWallet] = useState(null);
  const [walletAddress, setWalletAddress] = useState("");

  // Form state - simplified
  const [txCount, setTxCount] = useState("");
  const [avgHours, setAvgHours] = useState("");
  const [assetTypes, setAssetTypes] = useState("");

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

  // Initialize wallet kit on component mount
  useEffect(() => {
    const initKit = async () => {
      try {
        const kitInstance = new StellarWalletsKit({
          network: WalletNetwork.TESTNET,
          selectedWalletId: ALBEDO_ID,
          modules: allowAllModules(),
        });
        setKit(kitInstance);
        
        // Test contract on initialization
        testContract();
      } catch (error) {
        console.error("Wallet kit initialization error:", error);
        setMessage("Failed to initialize wallet system");
        setMessageType("error");
      }
    };

    initKit();
  }, []);

  // Handle view changes
  const handleGetStarted = () => {
    setCurrentView("dashboard");
  };

  const handleBackToLanding = () => {
    setCurrentView("landing");
  };

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

  // Connect wallet
  const connectWallet = async () => {
    if (!kit) {
      setMessage("Wallet kit not ready yet");
      setMessageType("error");
      return;
    }

    try {
      setIsLoading(true);
      setMessage("Opening wallet selection modal...");
      setMessageType("info");

      await kit.openModal({
        onWalletSelected: async (option) => {
          try {
            console.log("🔗 Wallet selected:", option.name);
            kit.setWallet(option.id);

            const { address } = await kit.getAddress();
            setWalletAddress(address);
            setConnectedWallet(option.name);
            setMessage(`✅ ${option.name} wallet connected!`);
            setMessageType("success");

            console.log("✅ Wallet connected:", { name: option.name, address });
          } catch (error) {
            console.error("❌ Wallet connection error:", error);
            setMessage(`Wallet connection error: ${error.message}`);
            setMessageType("error");
          }
        },
        onClosed: (error) => {
          if (error) {
            console.error("❌ Modal closed with error:", error);
            setMessage("Wallet selection cancelled");
            setMessageType("error");
          }
        },
        modalTitle: "Select Stellar Wallet",
        notAvailableText: "This wallet is currently unavailable",
      });
    } catch (error) {
      console.error("❌ Modal open error:", error);
      setMessage(`Modal open error: ${error.message}`);
      setMessageType("error");
    } finally {
      setIsLoading(false);
    }
  };

  // Disconnect wallet
  const disconnectWallet = () => {
    setWalletAddress("");
    setConnectedWallet(null);
    setMessage("Wallet disconnected");
    setMessageType("info");
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
        isLoading={isLoading}
        onConnectWallet={connectWallet}
        onDisconnectWallet={disconnectWallet}
      />

      {/* Main Content */}
      <main className="min-h-screen">
        {currentView === "landing" ? (
          // Landing Page
          <LandingPage onGetStarted={handleGetStarted} />
        ) : (
          // Modern Dashboard View
          <div className="container-modern section-compact">
            {/* Back to Landing Button */}
            <div className="mb-8">
              <button
                onClick={handleBackToLanding}
                className="btn-ghost"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Home
              </button>
            </div>

            {/* Page Header */}
            <div className="text-center mb-12">
              <h1 className="text-heading mb-6">
                Calculate Your Risk Score
              </h1>
              <p className="text-body max-w-2xl mx-auto">
                Enter your blockchain transaction data to get an AI-powered risk assessment
              </p>
            </div>

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

            {/* Modern Form */}
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
          </div>
        )}
      </main>
    </>
  );
}
