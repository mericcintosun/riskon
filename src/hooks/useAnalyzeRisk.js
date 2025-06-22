"use client";

import { useState } from "react";
import { performAutoRiskAnalysis } from "../lib/autoRiskAnalyzer";

export default function useAnalyzeRisk() {
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleAnalyze = async (walletAddress) => {
    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);

    try {
      const result = await performAutoRiskAnalysis(walletAddress);
      if (result.success) {
        setAnalysisResult({
          riskScore: result.score,
          keyFactors: result.factors,
          recommendation: result.recommendation,
        });
      } else {
        throw new Error(result.error || "Analysis failed");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return { handleAnalyze, analysisResult, isLoading, error };
}
