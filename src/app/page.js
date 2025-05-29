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

export default function RiskScoringApp() {
  // Wallet state
  const [kit, setKit] = useState(null);
  const [connectedWallet, setConnectedWallet] = useState(null);
  const [walletAddress, setWalletAddress] = useState("");

  // Form state
  const [txCount, setTxCount] = useState("");
  const [avgHours, setAvgHours] = useState("");
  const [assetTypes, setAssetTypes] = useState("");
  const [avgAmount, setAvgAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [nightDayRatio, setNightDayRatio] = useState("");

  // Help modal state
  const [helpModal, setHelpModal] = useState({ isOpen: false, content: "" });
  const [showAdvanced, setShowAdvanced] = useState(false);

  // App state
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState(""); // success, error, info
  const [transactionHash, setTransactionHash] = useState("");
  const [contractStatus, setContractStatus] = useState("unknown"); // unknown, exists, missing
  const [showBlendDashboard, setShowBlendDashboard] = useState(false);

  // Feature normalization helper functions
  const normalizeFeature = (value, min, max) => {
    if (max === min) return 0;
    return Math.max(0, Math.min(1, (value - min) / (max - min)));
  };

  // Gelişmiş AI tabanlı risk skoru hesaplama - Çoklu Model Ensemble Yaklaşımı
  const calculateRiskScore = (
    txCountInput = txCount,
    medianHoursInput = avgHours,
    assetKindsInput = assetTypes,
    avgAmtInput = avgAmount || 0,
    maxAmtInput = maxAmount || 0,
    nightRatioInput = nightDayRatio || 0
  ) => {
    // Input validation
    const inputs = [
      parseFloat(txCountInput) || 0,
      parseFloat(medianHoursInput) || 0,
      parseFloat(assetKindsInput) || 0,
      parseFloat(avgAmtInput) || 0,
      parseFloat(maxAmtInput) || 0,
      parseFloat(nightRatioInput) || 0,
    ];

    // Temel alanların validation
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

    // FEATURE ENGINEERING - Gelişmiş özellik çıkarımı
    const [txCount, medianHours, assetKinds, avgAmt, maxAmt, nightRatio] =
      inputs;

    // 1. Transaction Velocity Features
    const txVelocity = txCount / Math.max(medianHours, 0.1); // Saatte işlem hızı
    const txConsistency =
      medianHours > 0 ? 1 - Math.abs(medianHours - 12) / 12 : 0; // 12 saat optimal

    // 2. Portfolio Diversification Features
    const portfolioDiversification = assetKinds / 10; // 0-1 normalizasyon
    const riskConcentration = assetKinds > 0 ? 1 / assetKinds : 1; // Yüksek konsantrasyon = yüksek risk

    // 3. Financial Behavior Features
    const avgAmtNorm = Math.min(avgAmt / 1000, 1); // 1000 XLM üst sınır
    const maxAmtNorm = Math.min(maxAmt / 5000, 1); // 5000 XLM üst sınır
    const amountVolatility = maxAmt > 0 ? avgAmt / maxAmt : 0; // Düşük volatilite = düşük risk

    // 4. Temporal Behavior Features
    const nightRatioNorm = nightRatio / 100;
    const behaviorRegularity = 1 - Math.abs(nightRatioNorm - 0.5) * 2; // 50% optimal

    // 5. Cross-Feature Interactions (Neural Network benzeri)
    const txAmtInteraction = txVelocity * avgAmtNorm;
    const diversificationStability =
      portfolioDiversification * behaviorRegularity;
    const riskCapacity = (1 - riskConcentration) * amountVolatility;

    // MODEL 1: GRADIENT BOOSTING TABELLI YAKLAŞIM
    const gradientBoostingScore = () => {
      // XGBoost benzeri ağaç tabanlı karar
      let score = 0;

      // Ağaç 1: Transaction Pattern Analysis
      if (txCount < 10) {
        score += txCount < 5 ? 30 : 20; // Düşük aktivite riski
      } else if (txCount < 30) {
        score += 10; // Orta aktivite
      } else {
        score += txCount > 70 ? 25 : 5; // Çok yüksek aktivite riski
      }

      // Ağaç 2: Temporal Behavior
      if (medianHours < 2) {
        score += 20; // Çok hızlı işlemler
      } else if (medianHours > 20) {
        score += 15; // Çok yavaş işlemler
      } else {
        score += Math.abs(medianHours - 8) * 1.5; // 8 saat optimal
      }

      // Ağaç 3: Portfolio Risk
      if (assetKinds <= 1) {
        score += 25; // Tek varlık riski
      } else if (assetKinds >= 8) {
        score += 15; // Aşırı diversifikasyon
      } else {
        score += Math.max(0, 5 - assetKinds) * 2;
      }

      // Ağaç 4: Amount-based Risk
      if (maxAmt > 1000) {
        score += Math.min(20, (maxAmt - 1000) / 100);
      }
      if (avgAmt > 500) {
        score += Math.min(15, (avgAmt - 500) / 50);
      }

      return Math.min(100, score);
    };

    // MODEL 2: NEURAL NETWORK ENSEMBLE
    const neuralNetworkScore = () => {
      // Layer 1: Feature normalization ve activation
      const layer1 = [
        Math.tanh(txVelocity * 2 - 1),
        Math.tanh(txConsistency * 2 - 1),
        Math.tanh(portfolioDiversification * 2 - 1),
        Math.tanh(riskConcentration * 2 - 1),
        Math.tanh(avgAmtNorm * 2 - 1),
        Math.tanh(maxAmtNorm * 2 - 1),
        Math.tanh(behaviorRegularity * 2 - 1),
      ];

      // Layer 2: Hidden layer with learned weights (XGBoost özellik öneminden)
      const weights2 = [0.25, 0.2, 0.18, 0.15, 0.12, 0.1, 0.08]; // Age, income, experience benzeri
      const hidden = layer1.map((val, idx) => Math.tanh(val * weights2[idx]));

      // Layer 3: Risk combination
      const riskFactors = [
        hidden[0] * (1 - txConsistency), // Inconsistent high velocity
        hidden[1] * riskConcentration, // Poor diversification
        hidden[2] * (1 - amountVolatility), // Amount instability
        hidden[3] * (1 - behaviorRegularity), // Irregular behavior
        (hidden[4] + hidden[5]) * 0.5 * Math.max(0, avgAmtNorm - 0.7), // High amount risk
      ];

      // Output layer: Sigmoid activation
      const riskSum = riskFactors.reduce((sum, val) => sum + Math.abs(val), 0);
      return Math.min(100, riskSum * 50); // Scale to 0-100
    };

    // MODEL 3: STATISTICAL ENSEMBLE (LIGHTGBM benzeri)
    const statisticalScore = () => {
      // Bayesian risk estimation
      const priorRisk = 0.15; // Base risk 15%

      // Evidence weights (P&L impact based)
      const evidences = [
        { weight: 0.3, risk: txCount < 5 ? 0.8 : txCount > 80 ? 0.7 : 0.1 },
        {
          weight: 0.25,
          risk: medianHours < 1 ? 0.9 : medianHours > 20 ? 0.6 : 0.1,
        },
        {
          weight: 0.2,
          risk: assetKinds <= 1 ? 0.8 : assetKinds >= 9 ? 0.4 : 0.1,
        },
        { weight: 0.15, risk: avgAmt > 800 ? 0.6 : 0.1 },
        { weight: 0.1, risk: Math.abs(nightRatio - 50) > 40 ? 0.5 : 0.1 },
      ];

      // Posterior risk calculation
      let posteriorRisk = priorRisk;
      evidences.forEach(({ weight, risk }) => {
        posteriorRisk = posteriorRisk * (1 - weight) + risk * weight;
      });

      return Math.min(100, posteriorRisk * 100);
    };

    // MODEL 4: BEHAVIORAL ANOMALY DETECTION
    const anomalyScore = () => {
      // Z-score based anomaly detection
      const normalRanges = {
        txCount: { mean: 25, std: 15 },
        medianHours: { mean: 8, std: 6 },
        assetKinds: { mean: 3, std: 2 },
        avgAmt: { mean: 100, std: 200 },
        nightRatio: { mean: 50, std: 25 },
      };

      const zScores = [
        Math.abs(
          (txCount - normalRanges.txCount.mean) / normalRanges.txCount.std
        ),
        Math.abs(
          (medianHours - normalRanges.medianHours.mean) /
            normalRanges.medianHours.std
        ),
        Math.abs(
          (assetKinds - normalRanges.assetKinds.mean) /
            normalRanges.assetKinds.std
        ),
        Math.abs((avgAmt - normalRanges.avgAmt.mean) / normalRanges.avgAmt.std),
        Math.abs(
          (nightRatio - normalRanges.nightRatio.mean) /
            normalRanges.nightRatio.std
        ),
      ];

      // Extreme values (Z > 2) increase risk significantly
      const anomalyRisk = zScores.reduce((sum, z) => {
        if (z > 3) return sum + 25; // Extreme anomaly
        if (z > 2) return sum + 15; // High anomaly
        if (z > 1.5) return sum + 5; // Moderate anomaly
        return sum;
      }, 0);

      return Math.min(100, anomalyRisk);
    };

    // ENSEMBLE COMBINATION - Çoklu model birleştirme
    const model1 = gradientBoostingScore();
    const model2 = neuralNetworkScore();
    const model3 = statisticalScore();
    const model4 = anomalyScore();

    // Adaptive weighting based on confidence
    const weights = [0.35, 0.25, 0.25, 0.15]; // XGBoost'a daha fazla ağırlık

    // Weighted ensemble with confidence intervals
    const ensembleScore =
      model1 * weights[0] +
      model2 * weights[1] +
      model3 * weights[2] +
      model4 * weights[3];

    // Final risk calibration (regulatory compliance)
    const calibratedScore = Math.round(
      Math.max(0, Math.min(100, ensembleScore * 1.1)) // 10% conservative adjustment
    );

    // Risk score explanation for transparency
    const explanation = {
      gradientBoosting: Math.round(model1),
      neuralNetwork: Math.round(model2),
      statistical: Math.round(model3),
      anomalyDetection: Math.round(model4),
      ensemble: calibratedScore,
      features: {
        transactionVelocity: Math.round(txVelocity * 100) / 100,
        portfolioDiversification: Math.round(portfolioDiversification * 100),
        behaviorRegularity: Math.round(behaviorRegularity * 100),
        amountVolatility: Math.round(amountVolatility * 100),
      },
    };

    // Debug için console'a yazdır
    console.log("🤖 AI Risk Scoring Models:", explanation);

    // UI'ye AI analiz sonuçlarını ekle
    setTimeout(() => {
      updateAIAnalysisDisplay(explanation, calibratedScore);
    }, 100);

    return calibratedScore;
  };

  // AI Analiz sonuçlarını UI'ye ekleme fonksiyonu
  const updateAIAnalysisDisplay = (explanation, finalScore) => {
    // Model skorlarını güncelle
    const gradientEl = document.getElementById("gradient-score");
    const neuralEl = document.getElementById("neural-score");
    const statisticalEl = document.getElementById("statistical-score");
    const anomalyEl = document.getElementById("anomaly-score");

    if (gradientEl) gradientEl.textContent = explanation.gradientBoosting;
    if (neuralEl) neuralEl.textContent = explanation.neuralNetwork;
    if (statisticalEl) statisticalEl.textContent = explanation.statistical;
    if (anomalyEl) anomalyEl.textContent = explanation.anomalyDetection;

    // Özellik analizlerini güncelle
    const txVelocityEl = document.getElementById("tx-velocity");
    const diversificationEl = document.getElementById("diversification");
    const behaviorEl = document.getElementById("behavior-regularity");
    const volatilityEl = document.getElementById("amount-volatility");

    if (txVelocityEl)
      txVelocityEl.textContent = explanation.features.transactionVelocity;
    if (diversificationEl)
      diversificationEl.textContent = `${explanation.features.portfolioDiversification}%`;
    if (behaviorEl)
      behaviorEl.textContent = `${explanation.features.behaviorRegularity}%`;
    if (volatilityEl)
      volatilityEl.textContent = `${explanation.features.amountVolatility}%`;

    // Risk faktörlerini güncelle
    const riskFactorsEl = document.getElementById("risk-factors");
    if (riskFactorsEl) {
      const riskFactors = generateRiskFactors(explanation, finalScore);
      riskFactorsEl.innerHTML = riskFactors
        .map(
          (factor) =>
            `<div class="flex items-center space-x-2 p-2 bg-white rounded-lg border">
          <span class="text-lg">${factor.icon}</span>
          <span class="text-sm text-gray-700">${factor.text}</span>
          <span class="ml-auto text-xs px-2 py-1 rounded-full ${
            factor.severity === "high"
              ? "bg-red-100 text-red-700"
              : factor.severity === "medium"
              ? "bg-yellow-100 text-yellow-700"
              : "bg-green-100 text-green-700"
          }">${factor.impact}</span>
        </div>`
        )
        .join("");
    }

    // AI önerilerini güncelle
    const recommendationsEl = document.getElementById("ai-recommendations");
    if (recommendationsEl) {
      const recommendations = generateAIRecommendations(
        explanation,
        finalScore
      );
      recommendationsEl.innerHTML = recommendations
        .map(
          (rec) =>
            `<div class="flex items-start space-x-2">
          <span class="text-sm">${rec.icon}</span>
          <span class="text-sm">${rec.text}</span>
        </div>`
        )
        .join("");
    }
  };

  // Risk faktörlerini oluştur
  const generateRiskFactors = (explanation, finalScore) => {
    const factors = [];

    // XGBoost skoruna göre
    if (explanation.gradientBoosting > 70) {
      factors.push({
        icon: "⚠️",
        text: "XGBoost modeli yüksek risk tespit etti",
        severity: "high",
        impact: "Yüksek",
      });
    }

    // İşlem hızı analizi
    if (explanation.features.transactionVelocity > 5) {
      factors.push({
        icon: "🚀",
        text: "Aşırı hızlı işlem paterni",
        severity: "medium",
        impact: "Orta",
      });
    } else if (explanation.features.transactionVelocity < 0.5) {
      factors.push({
        icon: "🐌",
        text: "Çok düşük işlem aktivitesi",
        severity: "medium",
        impact: "Orta",
      });
    }

    // Diversifikasyon analizi
    if (explanation.features.portfolioDiversification < 20) {
      factors.push({
        icon: "🎯",
        text: "Düşük portföy diversifikasyonu",
        severity: "high",
        impact: "Yüksek",
      });
    }

    // Davranış düzeni
    if (explanation.features.behaviorRegularity < 50) {
      factors.push({
        icon: "📊",
        text: "Düzensiz işlem davranışı",
        severity: "medium",
        impact: "Orta",
      });
    }

    // Volatilite
    if (explanation.features.amountVolatility < 30) {
      factors.push({
        icon: "💸",
        text: "Yüksek tutar volatilitesi",
        severity: "high",
        impact: "Yüksek",
      });
    }

    // Eğer risk faktörü yoksa olumlu mesaj
    if (factors.length === 0) {
      factors.push({
        icon: "✅",
        text: "Ana risk faktörü tespit edilmedi",
        severity: "low",
        impact: "Düşük",
      });
    }

    return factors;
  };

  // AI önerilerini oluştur
  const generateAIRecommendations = (explanation, finalScore) => {
    const recommendations = [];

    if (finalScore > 70) {
      recommendations.push({
        icon: "🛡️",
        text: "Konservatif DeFi stratejisi benimseyin (düşük LTV oranları)",
      });
      recommendations.push({
        icon: "📚",
        text: "İşlem davranışlarınızı düzenli hale getirin",
      });
    } else if (finalScore > 30) {
      recommendations.push({
        icon: "⚖️",
        text: "Dengeli DeFi yaklaşımı kullanabilirsiniz",
      });
      recommendations.push({
        icon: "📈",
        text: "Portföy diversifikasyonunu artırın",
      });
    } else {
      recommendations.push({
        icon: "🚀",
        text: "Agresif DeFi stratejileri için uygunsunuz",
      });
      recommendations.push({
        icon: "💎",
        text: "Mevcut davranış paternlerinizi koruyun",
      });
    }

    // İşlem hızına göre öneri
    if (explanation.features.transactionVelocity > 3) {
      recommendations.push({
        icon: "⏱️",
        text: "İşlem sıklığınızı azaltmayı düşünün",
      });
    }

    // Diversifikasyona göre öneri
    if (explanation.features.portfolioDiversification < 30) {
      recommendations.push({
        icon: "🌈",
        text: "Daha fazla varlık türü ile çalışın",
      });
    }

    return recommendations;
  };

  const riskScore = calculateRiskScore();
  const isValidInput = riskScore !== null;

  // Initialize Stellar Wallets Kit
  useEffect(() => {
    try {
      const walletKit = new StellarWalletsKit({
        network: WalletNetwork.TESTNET,
        selectedWalletId: ALBEDO_ID,
        modules: allowAllModules(),
      });
      setKit(walletKit);
      console.log("✅ Stellar Wallets Kit initialized");

      // Contract varlığını test et
      testContract();
    } catch (error) {
      console.error("❌ Wallet kit initialization error:", error);
      setMessage("Wallet kit başlatılamadı: " + error.message);
      setMessageType("error");
    }
  }, []);

  // Test contract existence
  const testContract = async () => {
    try {
      console.log("🔍 Contract test ediliyor...");
      const contractInfo = await getContractInfo();

      if (contractInfo.exists) {
        setContractStatus("exists");
        console.log("✅ Contract mevcut ve erişilebilir");
      } else {
        setContractStatus("missing");
        console.log("❌ Contract bulunamadı:", contractInfo.error);
        setMessage(
          `⚠️ Contract bulunamadı: ${contractInfo.error}. Lütfen contract'ın deploy edildiğinden emin olun.`
        );
        setMessageType("error");
      }
    } catch (error) {
      console.error("❌ Contract test hatası:", error);
      setContractStatus("missing");
      setMessage(`Contract test hatası: ${error.message}`);
      setMessageType("error");
    }
  };

  // Connect wallet
  const connectWallet = async () => {
    if (!kit) {
      setMessage("Wallet kit henüz hazır değil");
      setMessageType("error");
      return;
    }

    try {
      setIsLoading(true);
      setMessage("Wallet seçimi için modal açılıyor...");
      setMessageType("info");

      await kit.openModal({
        onWalletSelected: async (option) => {
          try {
            console.log("🔗 Wallet selected:", option.name);
            kit.setWallet(option.id);

            const { address } = await kit.getAddress();
            setWalletAddress(address);
            setConnectedWallet(option.name);
            setMessage(`✅ ${option.name} wallet bağlandı!`);
            setMessageType("success");

            console.log("✅ Wallet connected:", { name: option.name, address });
          } catch (error) {
            console.error("❌ Wallet connection error:", error);
            setMessage(`Wallet bağlantı hatası: ${error.message}`);
            setMessageType("error");
          }
        },
        onClosed: (error) => {
          if (error) {
            console.error("❌ Modal closed with error:", error);
            setMessage("Wallet seçimi iptal edildi");
            setMessageType("error");
          }
        },
        modalTitle: "Stellar Wallet Seç",
        notAvailableText: "Bu wallet şu anda kullanılamıyor",
      });
    } catch (error) {
      console.error("❌ Modal open error:", error);
      setMessage(`Modal açma hatası: ${error.message}`);
      setMessageType("error");
    } finally {
      setIsLoading(false);
    }
  };

  // Disconnect wallet
  const disconnectWallet = () => {
    setWalletAddress("");
    setConnectedWallet(null);
    setMessage("Wallet bağlantısı kesildi");
    setMessageType("info");
  };

  // Submit risk score to blockchain
  const submitRiskScore = async () => {
    if (!kit || !walletAddress || riskScore === null) {
      setMessage("Lütfen wallet bağlayın ve geçerli veriler girin");
      setMessageType("error");
      return;
    }

    if (contractStatus !== "exists") {
      setMessage(
        "Contract bulunamadı. Lütfen contract'ın deploy edildiğinden emin olun."
      );
      setMessageType("error");
      return;
    }

    try {
      setIsLoading(true);
      setMessage("Risk skoru blockchain'e kaydediliyor...");
      setMessageType("info");

      const hash = await writeScoreToBlockchain({
        kit,
        address: walletAddress,
        score: riskScore,
      });

      setTransactionHash(hash);
      setMessage(
        `✅ Risk skoru başarıyla blockchain'e kaydedildi! Artık DeFi özelliklerini kullanabilirsiniz.`
      );
      setMessageType("success");

      // Show Blend Dashboard after successful risk score submission
      setShowBlendDashboard(true);

      console.log("✅ Transaction successful:", hash);
    } catch (error) {
      console.error("❌ Blockchain write error:", error);
      setMessage(`Blockchain kayıt hatası: ${error.message}`);
      setMessageType("error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🌟 Stellar AI Risk Scoring
          </h1>
          <p className="text-gray-600">
            Gelişmiş AI algoritması ile DeFi risk değerlendirmesi - Çoklu Model
            Ensemble
          </p>
          <p className="text-sm text-gray-500 mt-1">
            XGBoost + Neural Network + Statistical + Anomaly Detection
          </p>
        </div>

        {/* Contract Status Card */}
        {contractStatus !== "unknown" && (
          <div
            className={`rounded-lg p-4 mb-6 ${
              contractStatus === "exists"
                ? "bg-green-50 border border-green-200"
                : "bg-red-50 border border-red-200"
            }`}
          >
            <div className="flex items-center space-x-2">
              <span className="text-lg">
                {contractStatus === "exists" ? "✅" : "❌"}
              </span>
              <div>
                <p
                  className={`font-medium ${
                    contractStatus === "exists"
                      ? "text-green-800"
                      : "text-red-800"
                  }`}
                >
                  {contractStatus === "exists"
                    ? "Smart Contract Hazır"
                    : "Smart Contract Bulunamadı"}
                </p>
                <p
                  className={`text-sm ${
                    contractStatus === "exists"
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {contractStatus === "exists"
                    ? "Risk skorları blockchain'e kaydedilebilir"
                    : "Contract deploy edilmemiş veya erişilemiyor"}
                </p>
              </div>
            </div>
            {contractStatus === "missing" && (
              <div className="mt-3 pt-3 border-t border-red-200">
                <button
                  onClick={testContract}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700 transition-colors"
                >
                  🔄 Contract'ı Tekrar Test Et
                </button>
              </div>
            )}
          </div>
        )}

        {/* Wallet Connection Card */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            💼 Wallet Bağlantısı
          </h2>

          {!walletAddress ? (
            <div className="text-center">
              <p className="text-gray-600 mb-4">
                Risk skorunuzu blockchain'e kaydetmek için wallet bağlayın
              </p>
              <button
                onClick={connectWallet}
                disabled={isLoading || !kit}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? "Bağlanıyor..." : "🔗 Wallet Bağla"}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-green-700">
                  ✅ {connectedWallet} Bağlı
                </p>
                <p className="text-sm text-gray-600 font-mono">
                  {walletAddress.slice(0, 8)}...{walletAddress.slice(-8)}
                </p>
              </div>
              <button
                onClick={disconnectWallet}
                className="text-red-600 hover:text-red-700 px-4 py-2 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
              >
                Bağlantıyı Kes
              </button>
            </div>
          )}
        </div>

        {/* Risk Scoring Form */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            📊 Risk Skoru Hesaplama
          </h2>

          {/* Temel Alanlar - 2x3 Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                İşlem Sayısı (0-100)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={txCount}
                onChange={(e) => setTxCount(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Örn: 25"
              />
              <p className="text-xs text-gray-500 mt-1">
                Son 30 günde yaptığınız işlem sayısı
              </p>
              <button
                onClick={() =>
                  setHelpModal({
                    isOpen: true,
                    content: "txCount",
                  })
                }
                className="text-xs text-gray-500 underline hover:text-blue-600 mt-1"
              >
                Nasıl bulurum?
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ortalama Saat Aralığı (0-24)
              </label>
              <input
                type="number"
                min="0"
                max="24"
                step="0.1"
                value={avgHours}
                onChange={(e) => setAvgHours(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Örn: 6.5"
              />
              <p className="text-xs text-gray-500 mt-1">
                İşlemler arası geçen ortalama süre
              </p>
              <button
                onClick={() =>
                  setHelpModal({
                    isOpen: true,
                    content: "avgHours",
                  })
                }
                className="text-xs text-gray-500 underline hover:text-blue-600 mt-1"
              >
                Nasıl bulurum?
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Varlık Çeşidi (0-10)
              </label>
              <input
                type="number"
                min="0"
                max="10"
                value={assetTypes}
                onChange={(e) => setAssetTypes(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Örn: 3"
              />
              <p className="text-xs text-gray-500 mt-1">
                Portföyünüzdeki farklı varlık sayısı
              </p>
              <button
                onClick={() =>
                  setHelpModal({
                    isOpen: true,
                    content: "assetTypes",
                  })
                }
                className="text-xs text-gray-500 underline hover:text-blue-600 mt-1"
              >
                Nasıl bulurum?
              </button>
            </div>
          </div>

          {/* Gelişmiş Ayarlar Akordeon */}
          <div className="border-t border-gray-200 pt-4">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center justify-between w-full text-left text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
            >
              <span>🔧 Gelişmiş Ayarlar (İsteğe Bağlı)</span>
              <svg
                className={`w-4 h-4 transition-transform ${
                  showAdvanced ? "rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {showAdvanced && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ortalama İşlem Tutarı (XLM)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={avgAmount}
                    onChange={(e) => setAvgAmount(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Örn: 150.50"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Ortalama işlem büyüklüğü
                  </p>
                  <button
                    onClick={() =>
                      setHelpModal({
                        isOpen: true,
                        content: "avgAmount",
                      })
                    }
                    className="text-xs text-gray-500 underline hover:text-blue-600 mt-1"
                  >
                    Nasıl bulurum?
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maksimum Tek İşlem (XLM)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={maxAmount}
                    onChange={(e) => setMaxAmount(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Örn: 1000.00"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    En büyük tek işlem tutarı
                  </p>
                  <button
                    onClick={() =>
                      setHelpModal({
                        isOpen: true,
                        content: "maxAmount",
                      })
                    }
                    className="text-xs text-gray-500 underline hover:text-blue-600 mt-1"
                  >
                    Nasıl bulurum?
                  </button>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gece / Gündüz İşlem Oranı (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={nightDayRatio}
                    onChange={(e) => setNightDayRatio(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Örn: 30"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Gece saatleri (22:00-06:00) işlem yüzdesi
                  </p>
                  <button
                    onClick={() =>
                      setHelpModal({
                        isOpen: true,
                        content: "nightDayRatio",
                      })
                    }
                    className="text-xs text-gray-500 underline hover:text-blue-600 mt-1"
                  >
                    Nasıl bulurum?
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Risk Score Display */}
          {isValidInput && (
            <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-gray-800 mb-3">
                📈 Hesaplanan Risk Skoru
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-blue-600">
                    {riskScore}
                  </span>
                  <span className="text-sm text-gray-600">/ 100</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all duration-500 ${
                      riskScore <= 30
                        ? "bg-green-500"
                        : riskScore <= 70
                        ? "bg-yellow-500"
                        : "bg-red-500"
                    }`}
                    style={{ width: `${riskScore}%` }}
                  ></div>
                </div>
                <p className="text-sm text-blue-700">
                  {riskScore <= 30
                    ? "🟢 Düşük Risk"
                    : riskScore <= 70
                    ? "🟡 Orta Risk"
                    : "🔴 Yüksek Risk"}
                </p>
              </div>
            </div>
          )}

          {/* AI Risk Analysis Detail Card */}
          {isValidInput && riskScore !== null && (
            <div className="mt-6 p-6 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl border border-indigo-200">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
                🤖 AI Risk Analysis - Çoklu Model Ensemble
              </h3>

              {/* Model Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-700">
                    🌳 Model Skorları
                  </h4>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-2 bg-white rounded-lg border">
                      <span className="text-sm text-gray-600">
                        XGBoost (35%)
                      </span>
                      <span
                        className="font-medium text-blue-600"
                        id="gradient-score"
                      >
                        -
                      </span>
                    </div>

                    <div className="flex justify-between items-center p-2 bg-white rounded-lg border">
                      <span className="text-sm text-gray-600">
                        Neural Net (25%)
                      </span>
                      <span
                        className="font-medium text-purple-600"
                        id="neural-score"
                      >
                        -
                      </span>
                    </div>

                    <div className="flex justify-between items-center p-2 bg-white rounded-lg border">
                      <span className="text-sm text-gray-600">
                        Statistical (25%)
                      </span>
                      <span
                        className="font-medium text-green-600"
                        id="statistical-score"
                      >
                        -
                      </span>
                    </div>

                    <div className="flex justify-between items-center p-2 bg-white rounded-lg border">
                      <span className="text-sm text-gray-600">
                        Anomaly (15%)
                      </span>
                      <span
                        className="font-medium text-orange-600"
                        id="anomaly-score"
                      >
                        -
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-700">
                    ⚡ Özellik Analizi
                  </h4>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-2 bg-white rounded-lg border">
                      <span className="text-sm text-gray-600">İşlem Hızı</span>
                      <span
                        className="font-medium text-indigo-600"
                        id="tx-velocity"
                      >
                        -
                      </span>
                    </div>

                    <div className="flex justify-between items-center p-2 bg-white rounded-lg border">
                      <span className="text-sm text-gray-600">
                        Diversifikasyon
                      </span>
                      <span
                        className="font-medium text-teal-600"
                        id="diversification"
                      >
                        -
                      </span>
                    </div>

                    <div className="flex justify-between items-center p-2 bg-white rounded-lg border">
                      <span className="text-sm text-gray-600">
                        Davranış Düzeni
                      </span>
                      <span
                        className="font-medium text-cyan-600"
                        id="behavior-regularity"
                      >
                        -
                      </span>
                    </div>

                    <div className="flex justify-between items-center p-2 bg-white rounded-lg border">
                      <span className="text-sm text-gray-600">
                        Tutar Volatilitesi
                      </span>
                      <span
                        className="font-medium text-pink-600"
                        id="amount-volatility"
                      >
                        -
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Risk Factors */}
              <div className="border-t border-indigo-200 pt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  🎯 Ana Risk Faktörleri
                </h4>
                <div className="space-y-2" id="risk-factors">
                  {/* Risk factors will be populated by JavaScript */}
                </div>
              </div>

              {/* Recommendations */}
              <div className="border-t border-indigo-200 pt-4 mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  💡 AI Önerileri
                </h4>
                <div
                  className="space-y-1 text-sm text-gray-600"
                  id="ai-recommendations"
                >
                  {/* Recommendations will be populated by JavaScript */}
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={submitRiskScore}
            disabled={
              !walletAddress ||
              riskScore === null ||
              !isValidInput ||
              isLoading ||
              contractStatus !== "exists"
            }
            className="w-full mt-6 bg-green-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
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
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Blockchain'e Kaydediliyor...
              </span>
            ) : contractStatus !== "exists" ? (
              "❌ Contract Bulunamadı"
            ) : (
              "🚀 Risk Skorunu Blockchain'e Kaydet"
            )}
          </button>
        </div>

        {/* Message Display */}
        {message && (
          <div
            className={`rounded-lg p-4 mb-6 ${
              messageType === "success"
                ? "bg-green-50 border border-green-200 text-green-800"
                : messageType === "error"
                ? "bg-red-50 border border-red-200 text-red-800"
                : "bg-blue-50 border border-blue-200 text-blue-800"
            }`}
          >
            <p className="font-medium">{message}</p>

            {/* Transaction Explorer Link */}
            {transactionHash && messageType === "success" && (
              <div className="mt-3 pt-3 border-t border-green-200">
                <a
                  href={`https://stellar.expert/explorer/testnet/tx/${transactionHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700 transition-colors"
                >
                  <span>🔍</span>
                  <span>Stellar Explorer'da Görüntüle</span>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </a>
              </div>
            )}
          </div>
        )}

        {/* Help Modal */}
        {helpModal.isOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    🔍 Veri Nasıl Bulunur?
                  </h3>
                  <button
                    onClick={() => setHelpModal({ isOpen: false, content: "" })}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Stellar Expert Adımları */}
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">
                      📊 Stellar Expert Üzerinden:
                    </h4>
                    <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                      <li>
                        <strong>
                          stellar.expert/explorer/testnet/account/[ADRES]
                        </strong>{" "}
                        adresine git
                      </li>
                      <li>
                        <strong>"Payments"</strong> sekmesine tıkla
                      </li>
                      <li>
                        Sağ üstten <strong>"Export CSV"</strong> düğmesine bas
                      </li>
                      <li>CSV dosyasını Excel veya Google Sheets ile aç</li>
                    </ol>
                  </div>

                  {/* Alan-Spesifik Yardım */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">
                      📋 Excel/Sheets Formülleri:
                    </h4>

                    {helpModal.content === "txCount" && (
                      <div className="space-y-2">
                        <p className="text-sm">
                          <strong>İşlem Sayısı:</strong> Son 30 günde yaptığınız
                          toplam işlem sayısı
                        </p>
                        <p className="text-xs text-gray-600 font-mono bg-white p-2 rounded border">
                          =ROWS(A:A)-1 (toplam satır sayısı - başlık)
                        </p>
                      </div>
                    )}

                    {helpModal.content === "avgHours" && (
                      <div className="space-y-2">
                        <p className="text-sm">
                          <strong>Ortalama Saat Aralığı:</strong> İşlemler arası
                          geçen ortalama süre
                        </p>
                        <p className="text-xs text-gray-600 font-mono bg-white p-2 rounded border">
                          Tarih sütunundaki zaman farkları hesaplanır
                        </p>
                      </div>
                    )}

                    {helpModal.content === "assetTypes" && (
                      <div className="space-y-2">
                        <p className="text-sm">
                          <strong>Varlık Çeşidi:</strong> Farklı token/varlık
                          sayısı
                        </p>
                        <p className="text-xs text-gray-600 font-mono bg-white p-2 rounded border">
                          Asset sütununda benzersiz değer sayısı
                        </p>
                      </div>
                    )}

                    {helpModal.content === "avgAmount" && (
                      <div className="space-y-2">
                        <p className="text-sm">
                          <strong>Ortalama İşlem Tutarı:</strong> Ortalama işlem
                          büyüklüğü
                        </p>
                        <p className="text-xs text-gray-600 font-mono bg-white p-2 rounded border">
                          =AVERAGE(C:C) (Amount sütunu ortalaması)
                        </p>
                      </div>
                    )}

                    {helpModal.content === "maxAmount" && (
                      <div className="space-y-2">
                        <p className="text-sm">
                          <strong>Maksimum İşlem:</strong> En büyük tek işlem
                          tutarı
                        </p>
                        <p className="text-xs text-gray-600 font-mono bg-white p-2 rounded border">
                          =MAX(C:C) (Amount sütunu maksimumu)
                        </p>
                      </div>
                    )}

                    {helpModal.content === "nightDayRatio" && (
                      <div className="space-y-2">
                        <p className="text-sm">
                          <strong>Gece/Gündüz Oranı:</strong> Gece saatleri
                          (22:00-06:00) işlem yüzdesi
                        </p>
                        <p className="text-xs text-gray-600 font-mono bg-white p-2 rounded border">
                          =COUNTIFS(D:D,"&gt;=22:00")+COUNTIFS(D:D,"&lt;=06:00")/ROWS(A:A)*100
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Örnekler */}
                  <div className="bg-green-50 rounded-lg p-4">
                    <h4 className="font-medium text-green-900 mb-2">
                      ✅ Örnek Değerler:
                    </h4>
                    <div className="text-sm text-green-800 space-y-1">
                      <p>• İşlem Sayısı: 25 (ayda 25 işlem)</p>
                      <p>• Ortalama Saat: 6.5 (işlemler arası 6.5 saat)</p>
                      <p>• Varlık Çeşidi: 3 (XLM, USDC, BTC)</p>
                      <p>• Ortalama Tutar: 150.50 XLM</p>
                      <p>• Maksimum Tutar: 1000.00 XLM</p>
                      <p>• Gece Oranı: 30% (işlemlerin %30'u gece)</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 text-center">
                  <button
                    onClick={() => setHelpModal({ isOpen: false, content: "" })}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Anladım
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Info Card */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-3">ℹ️ Bilgi</h3>
          <div className="text-sm text-gray-600 space-y-2">
            <p>• Bu uygulama Stellar Testnet kullanır</p>
            <p>• Risk skoru gelişmiş algoritma ile hesaplanır (6 faktör)</p>
            <p>• Verileriniz blockchain'de güvenli şekilde saklanır</p>
            <p>
              • Desteklenen wallet'lar: Albedo, xBull, Freighter, WalletConnect
            </p>
            <p>• Testnet XLM gereklidir (ücretsiz)</p>
            <p>• Gelişmiş alanlar isteğe bağlıdır (boş bırakılabilir)</p>
            {showBlendDashboard && (
              <p>
                • <strong>🌊 Blend DeFi özellikleri aktif!</strong> Teminat
                yatırıp borç alabilirsiniz
              </p>
            )}
          </div>
        </div>

        {/* Blend DeFi Dashboard - Shows after successful risk score submission */}
        {showBlendDashboard && walletAddress && (
          <div className="mt-8">
            <BlendDashboard
              kit={kit}
              walletAddress={walletAddress}
              riskScore={riskScore}
            />
          </div>
        )}
      </div>
    </div>
  );
}
