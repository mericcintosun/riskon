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

/**
 * Automated Risk Analyzer Component
 * Complete automated system for risk analysis with ML scoring
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
      toast.error("⚠️ Lütfen cüzdanınızı bağlayın");
      return;
    }

    setIsAnalyzing(true);

    try {

      const loadingToast = toast.loading(
        "📊 Son 30 günlük işlem verileri analiz ediliyor..."
      );

      // Step 1: Collect transaction data from Horizon
      const horizonData = await collectTransactionData(walletAddress);

      if (!horizonData.success) {
        throw new Error(horizonData.error || "Veri toplama başarısız");
      }


      // Step 2: Calculate risk score with ML model
      toast.dismiss(loadingToast);
      const calculatingToast = toast.loading(
        "🧠 AI modeli ile risk skoru hesaplanıyor..."
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
          `🏦 Blend geçmişi: ${blendScoreImpact.totalChange > 0 ? "+" : ""}${
            blendScoreImpact.totalChange
          } puan`
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


      toast.success("✅ Risk analizi tamamlandı!", { duration: 4000 });

      // Show data quality warning if needed
      if (!dataQuality.isGood) {
        setTimeout(() => {
          toast.warning(
            "⚠️ Daha iyi analiz için daha fazla işlem geçmişi gerekli",
            {
              duration: 6000,
            }
          );
        }, 1000);
      }
    } catch (error) {
      console.error("❌ Automated analysis failed:", error);
      toast.error(`❌ Analiz hatası: ${error.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  /**
   * Update risk score on blockchain
   */
  const updateRiskScoreOnChain = async () => {
    if (!riskAnalysis || !walletAddress || !kit) {
      toast.error("⚠️ Risk analizi veya cüzdan bağlantısı eksik");
      return;
    }

    // Check rate limit
    const rateLimitCheck = checkRateLimit(walletAddress);
    if (!rateLimitCheck.canUpdate) {
      toast.warning(
        `⏰ ${formatRemainingTime(
          rateLimitCheck.remainingTime
        )} güncelleyebilirsiniz`
      );
      return;
    }

    setIsUpdatingScore(true);

    try {

      const updatingToast = toast.loading(
        "🔗 Risk skoru blockchain'e kaydediliyor..."
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
          toast.warning(
            "⚠️ Blockchain kaydetme başarısız - yerel olarak kaydedildi"
          );
        } else {
          toast.success("✅ Risk skoru blockchain'e başarıyla kaydedildi!");

          if (result.hash) {
            setTimeout(() => {
              toast.info(`🔗 İşlem: ${result.hash.substring(0, 8)}...`, {
                duration: 5000,
              });
            }, 1000);
          }
        }
      } else {
        throw new Error(result.error || "Blockchain güncellemesi başarısız");
      }
    } catch (error) {
      console.error("❌ Blockchain update failed:", error);

      if (
        error.message?.includes("cancelled") ||
        error.message?.includes("rejected")
      ) {
        toast.info("ℹ️ İşlem kullanıcı tarafından iptal edildi");
      } else {
        toast.error(`❌ Blockchain güncellemesi başarısız: ${error.message}`);
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
        text: "Tier-1: Güvenli",
        class: "bg-green-100 text-green-800 border-green-200",
      },
      TIER_2: {
        text: "Tier-2: Standart",
        class: "bg-yellow-100 text-yellow-800 border-yellow-200",
      },
      TIER_3: {
        text: "Tier-3: Fırsat / Yüksek Risk",
        class: "bg-red-100 text-red-800 border-red-200",
      },
    };
    return badges[tier] || badges["TIER_3"];
  };

  if (!walletAddress) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
          <svg
            className="w-8 h-8 text-blue-600 dark:text-blue-400"
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
        </div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Otomatik Risk Analizi
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          AI destekli risk analizi için cüzdanınızı bağlayın
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500">
          Son 30 günlük işlem verileriniz analiz edilecek
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Risk Score Display */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
        <div className="text-center">
          {/* Risk Score Gauge */}
          <div className="relative w-48 h-48 mx-auto mb-6">
            {/* Gauge Background */}
            <svg className="w-full h-full" viewBox="0 0 100 100">
              {/* Background Arc */}
              <path
                d="M 20 80 A 30 30 0 0 1 80 80"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-gray-200 dark:text-gray-700"
              />
              {/* Score Arc */}
              {riskAnalysis && (
                <path
                  d="M 20 80 A 30 30 0 0 1 80 80"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeDasharray={`${
                    (100 - riskAnalysis.riskScore) * 0.94
                  } 100`}
                  className={getRiskScoreColor(riskAnalysis.riskScore)}
                />
              )}
            </svg>

            {/* Score Number */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div
                  className={`text-4xl font-bold ${
                    riskAnalysis
                      ? getRiskScoreColor(riskAnalysis.riskScore)
                      : "text-gray-400"
                  }`}
                >
                  {riskAnalysis ? riskAnalysis.riskScore : "--"}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Risk Skoru
                </div>
              </div>
            </div>
          </div>

          {/* Tier Badge */}
          {riskAnalysis && (
            <div className="mb-6 space-y-3">
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
                      {riskAnalysis.blendImpact.totalChange} puan
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
                    Analiz Ediliyor...
                  </>
                ) : (
                  "🧠 Risk Analizi Başlat"
                )}
              </button>
            ) : (
              <button
                onClick={updateRiskScoreOnChain}
                disabled={
                  isUpdatingScore ||
                  (rateLimitStatus && !rateLimitStatus.canUpdate)
                }
                className={`w-full py-3 text-lg font-medium rounded-lg transition-colors duration-200 ${
                  rateLimitStatus && !rateLimitStatus.canUpdate
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "btn-primary"
                }`}
              >
                {isUpdatingScore ? (
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
                    Blockchain'e Kaydediliyor...
                  </>
                ) : rateLimitStatus && !rateLimitStatus.canUpdate ? (
                  `⏰ ${formatRemainingTime(countdown)}`
                ) : (
                  "🔗 Skorumu Güncelle"
                )}
              </button>
            )}

            {/* Re-analyze button */}
            {riskAnalysis && (
              <button
                onClick={runAutomatedAnalysis}
                disabled={isAnalyzing}
                className="btn-secondary w-full py-2"
              >
                {isAnalyzing
                  ? "Yeniden Analiz Ediliyor..."
                  : "🔄 Yeniden Analiz Et"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Feature Breakdown */}
      {riskAnalysis && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              📊 Özellik Analizi
            </h3>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              {showDetails ? "Gizle" : "Detayları Göster"}
            </button>
          </div>

          {/* Feature Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-2xl mb-1">💰</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Toplam Hacim
              </div>
              <div className="font-medium">
                {riskAnalysis.rawMetrics.totalVolume} XLM
              </div>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-2xl mb-1">🤝</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Karşı Taraf
              </div>
              <div className="font-medium">
                {riskAnalysis.rawMetrics.uniqueCounterparties}
              </div>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-2xl mb-1">🎯</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Varlık Çeşidi
              </div>
              <div className="font-medium">
                {riskAnalysis.rawMetrics.assetDiversity}
              </div>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-2xl mb-1">🌙</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Gece/Gündüz
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
              💡 İyileştirme Önerileri
            </h3>
            <button
              onClick={() => setShowRecommendations(!showRecommendations)}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              {showRecommendations ? "Gizle" : "Göster"}
            </button>
          </div>

          {showRecommendations && (
            <div className="space-y-2">
              {riskAnalysis.recommendations.map((recommendation, index) => (
                <div
                  key={index}
                  className="text-sm text-blue-800 dark:text-blue-200"
                >
                  {recommendation}
                </div>
              ))}
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
            <strong>Bilgi:</strong> Skor son 30 güne göre hesaplandı. Daha iyi
            skor için hacmi organik artırın, varlık çeşitlendirin, tek cüzdana
            spam'den kaçının. Günde bir kez güncelleyebilirsiniz.
          </div>
        </div>
      </div>

      {/* Data Quality Warning */}
      {analysisData &&
        analysisData.dataQuality &&
        !analysisData.dataQuality.isGood && (
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800 p-4">
            <div className="flex items-start space-x-3">
              <div className="text-orange-600 dark:text-orange-400">
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="text-sm text-orange-800 dark:text-orange-200">
                <strong>Veri Kalite Uyarısı:</strong> Daha doğru analiz için
                daha fazla işlem geçmişi gerekli. En az 10 işlem ve 3 farklı
                karşı taraf ile işlem yapmanız önerilir.
              </div>
            </div>
          </div>
        )}

      {/* Blend Historical Performance */}
      {walletAddress && (
        <BlendHistoryPerformance onScoreImpactChange={setBlendScoreImpact} />
      )}
    </div>
  );
}
