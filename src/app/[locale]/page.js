"use client";

import { useState, useEffect } from "react";
import { useTranslations } from 'next-intl';
import { writeScoreToBlockchainEnhanced } from "../lib/writeScore";
import { testContractExists, getContractInfo } from "../lib/testContract";
import { performAutoRiskAnalysis } from "../../lib/autoRiskAnalyzer";
import BlendDashboard from "../../components/BlendDashboard.jsx";
import EnhancedLiquidityPools from "../../components/EnhancedLiquidityPools.jsx";
import UserRiskProfile from "../../components/UserRiskProfile.tsx";
import AutomatedRiskAnalyzer from "../../components/AutomatedRiskAnalyzer.tsx";
import Header from "../../components/Header.tsx";
import { useWallet } from "../../contexts/WalletContext";
import { useToast } from "../../contexts/ToastContext";
import { useIssueDetector } from "../../hooks/useIssueDetector";
import { getTier, maxBorrow } from "../../lib/borrowCalc";

export default function RiskScoringApp() {
  const t = useTranslations();

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

  // Risk score state
  const [riskScore, setRiskScore] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Contract state
  const [contractInfo, setContractInfo] = useState(null);
  const [contractLoading, setContractLoading] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState("risk-analyzer");

  // Check contract on mount
  useEffect(() => {
    const checkContract = async () => {
      if (typeof window !== 'undefined') {
        setContractLoading(true);
        try {
          const exists = await testContractExists();
          if (exists) {
            const info = await getContractInfo();
            setContractInfo(info);
          }
        } catch (error) {
          console.error("Contract check failed:", error);
        } finally {
          setContractLoading(false);
        }
      }
    };
    checkContract();
  }, []);

  // Auto-analyze wallet when connected
  useEffect(() => {
    if (walletAddress && isReady) {
      performAutoAnalysis();
    }
  }, [walletAddress, isReady]);

  const performAutoAnalysis = async () => {
    if (!walletAddress) return;
    
    setIsAnalyzingWallet(true);
    try {
      const result = await performAutoRiskAnalysis(walletAddress);
      setAutoAnalysisResult(result);
      
      // Set form values from auto-analysis
      if (result) {
        setTxCount(result.transactionCount?.toString() || "");
        setAvgHours(result.avgHoursBetweenTxs?.toString() || "");
        setAssetTypes(result.uniqueAssetTypes?.toString() || "");
      }
    } catch (error) {
      console.error("Auto analysis failed:", error);
      showCategorizedError(error, "autoAnalysis");
    } finally {
      setIsAnalyzingWallet(false);
    }
  };

  const handleCalculateRisk = async () => {
    if (!walletAddress) {
      toast.error(t('wallet.connectWallet'));
      return;
    }

    setIsCalculating(true);
    try {
      // Validate inputs
      const validation = validateFormInputs({
        txCount,
        avgHours,
        assetTypes
      });
      
      if (!validation.isValid) {
        toast.error(t('errors.invalidInput'));
        return;
      }

      // Calculate risk score
      const score = {
        walletAddress,
        txCount: parseInt(txCount) || 0,
        avgHours: parseFloat(avgHours) || 0,
        assetTypes: parseInt(assetTypes) || 0,
        timestamp: new Date().toISOString(),
        autoAnalysis: autoAnalysisResult
      };

      setRiskScore(score);
      setShowResults(true);

      // Write to blockchain if contract is available
      if (contractInfo) {
        try {
          await writeScoreToBlockchainEnhanced(score, kit);
          toast.success(t('common.success'));
        } catch (blockchainError) {
          console.error("Blockchain write failed:", blockchainError);
          showCategorizedError(blockchainError, "blockchain");
        }
      }

    } catch (error) {
      console.error("Risk calculation failed:", error);
      showCategorizedError(error, "riskCalculation");
    } finally {
      setIsCalculating(false);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "risk-analyzer":
        return (
          <AutomatedRiskAnalyzer
            walletAddress={walletAddress}
            isAnalyzing={isAnalyzingWallet}
            onAnalyze={performAutoAnalysis}
            autoAnalysisResult={autoAnalysisResult}
          />
        );
      case "blend-dashboard":
        return <BlendDashboard />;
      case "liquidity-pools":
        return <EnhancedLiquidityPools />;
      case "user-profile":
        return (
          <UserRiskProfile
            walletAddress={walletAddress}
            riskScore={riskScore}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <Header 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />
      
      <main className="container mx-auto px-4 py-8">
        {renderTabContent()}
      </main>
    </div>
  );
}
