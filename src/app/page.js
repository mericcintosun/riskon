"use client";

import { useState, useEffect } from "react";
import { 
  StellarWalletsKit, 
  WalletNetwork, 
  allowAllModules,
  ALBEDO_ID,
  XBULL_ID,
  FREIGHTER_ID
} from '@creit.tech/stellar-wallets-kit';
import { writeScoreToBlockchain } from "./lib/writeScore";
import { testContractExists, getContractInfo } from "./lib/testContract";

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

  // Feature normalization helper functions
  const normalizeFeature = (value, min, max) => {
    if (max === min) return 0;
    return Math.max(0, Math.min(1, (value - min) / (max - min)));
  };

  // Geliştirilmiş risk skoru hesaplama - 6 alan model
  const calculateRiskScore = (
    txCountInput = txCount, 
    medianHoursInput = avgHours, 
    assetKindsInput = assetTypes,
    avgAmtInput = avgAmount || 0,
    maxAmtInput = maxAmount || 0, 
    nightRatioInput = nightDayRatio || 0
  ) => {
    // Feature extraction with fallback values
    const features = [
      parseFloat(txCountInput) || 0,      // txCount
      parseFloat(medianHoursInput) || 0,  // medianHours  
      parseFloat(assetKindsInput) || 0,   // assetKinds
      parseFloat(avgAmtInput) || 0,       // avgAmt
      parseFloat(maxAmtInput) || 0,       // maxAmt
      parseFloat(nightRatioInput) || 0    // nightRatio
    ];
    
    // Temel alanların validation (geriye dönük uyum için)
    if (isNaN(parseFloat(txCountInput)) || isNaN(parseFloat(medianHoursInput)) || isNaN(parseFloat(assetKindsInput)) ||
        features[0] < 0 || features[0] > 100 ||
        features[1] < 0 || features[1] > 24 ||
        features[2] < 0 || features[2] > 10) {
      return null;
    }

    // Feature scaling - Min-Max normalization to 0-1 range
    const normalizedFeatures = [
      normalizeFeature(features[0], 0, 100),    // txCount: 0-100 -> 0-1
      normalizeFeature(features[1], 0, 24),     // medianHours: 0-24 -> 0-1  
      normalizeFeature(features[2], 0, 10),     // assetKinds: 0-10 -> 0-1
      normalizeFeature(features[3], 0, 10000),  // avgAmt: 0-10000 XLM -> 0-1
      normalizeFeature(features[4], 0, 50000),  // maxAmt: 0-50000 XLM -> 0-1
      normalizeFeature(features[5], 0, 100)     // nightRatio: 0-100% -> 0-1
    ];

    // Model weights - geriye dönük uyumlu ağırlıklar
    const weights = [
      0.30,  // txCount (ana faktör - artırıldı)
      0.30,  // medianHours (ana faktör - artırıldı) 
      0.25,  // assetKinds (önemli faktör)
      0.10,  // avgAmt (yeni - küçük başlangıç)
      0.10,  // maxAmt (yeni - küçük başlangıç)
      0.10   // nightRatio (yeni - küçük başlangıç)
    ];

    // Risk calculation using normalized features
    // Inverse logic for some features (high values = low risk)
    const riskFactors = [
      (1 - normalizedFeatures[0]) * weights[0] * 100,  // Düşük işlem sayısı = yüksek risk
      normalizedFeatures[1] * weights[1] * 100,        // Yüksek saat aralığı = düşük aktivite risk
      normalizedFeatures[2] * weights[2] * 100,        // Çok varlık çeşidi = komplekslik riski
      normalizedFeatures[3] * weights[3] * 100,        // Yüksek ortalama tutar = risk
      normalizedFeatures[4] * weights[4] * 100,        // Yüksek max tutar = volatilite riski  
      Math.abs(0.5 - normalizedFeatures[5]) * 2 * weights[5] * 100  // 50%'den sapma = anormal davranış
    ];
    
    const totalRisk = riskFactors.reduce((sum, risk) => sum + risk, 0);
    
    return Math.round(Math.min(100, Math.max(0, totalRisk)));
  };

  const riskScore = calculateRiskScore();
  const isValidInput = riskScore !== null;

  // Initialize Stellar Wallets Kit
  useEffect(() => {
    try {
      const walletKit = new StellarWalletsKit({
        network: WalletNetwork.TESTNET,
        selectedWalletId: ALBEDO_ID,
        modules: allowAllModules()
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
        setMessage(`⚠️ Contract bulunamadı: ${contractInfo.error}. Lütfen contract'ın deploy edildiğinden emin olun.`);
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
        notAvailableText: "Bu wallet şu anda kullanılamıyor"
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
      setMessage("Contract bulunamadı. Lütfen contract'ın deploy edildiğinden emin olun.");
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
        score: riskScore
      });

      setTransactionHash(hash);
      setMessage(`✅ Risk skoru başarıyla blockchain'e kaydedildi!`);
      setMessageType("success");
      
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
            🌟 Stellar Risk Scoring
          </h1>
          <p className="text-gray-600">
            Basit algoritma ile DeFi risk değerlendirmesi - Blockchain'de güvenli kayıt
          </p>
        </div>

        {/* Contract Status Card */}
        {contractStatus !== "unknown" && (
          <div className={`rounded-lg p-4 mb-6 ${
            contractStatus === "exists" ? "bg-green-50 border border-green-200" :
            "bg-red-50 border border-red-200"
          }`}>
            <div className="flex items-center space-x-2">
              <span className="text-lg">
                {contractStatus === "exists" ? "✅" : "❌"}
              </span>
              <div>
                <p className={`font-medium ${
                  contractStatus === "exists" ? "text-green-800" : "text-red-800"
                }`}>
                  {contractStatus === "exists" ? "Smart Contract Hazır" : "Smart Contract Bulunamadı"}
                </p>
                <p className={`text-sm ${
                  contractStatus === "exists" ? "text-green-600" : "text-red-600"
                }`}>
                  {contractStatus === "exists" 
                    ? "Risk skorları blockchain'e kaydedilebilir" 
                    : "Contract deploy edilmemiş veya erişilemiyor"
                  }
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
                <p className="font-medium text-green-700">✅ {connectedWallet} Bağlı</p>
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
              <p className="text-xs text-gray-500 mt-1">Son 30 günde yaptığınız işlem sayısı</p>
              <button 
                onClick={() => setHelpModal({ 
                  isOpen: true, 
                  content: "txCount" 
                })}
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
              <p className="text-xs text-gray-500 mt-1">İşlemler arası geçen ortalama süre</p>
              <button 
                onClick={() => setHelpModal({ 
                  isOpen: true, 
                  content: "avgHours" 
                })}
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
              <p className="text-xs text-gray-500 mt-1">Portföyünüzdeki farklı varlık sayısı</p>
              <button 
                onClick={() => setHelpModal({ 
                  isOpen: true, 
                  content: "assetTypes" 
                })}
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
                className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
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
                  <p className="text-xs text-gray-500 mt-1">Ortalama işlem büyüklüğü</p>
                  <button 
                    onClick={() => setHelpModal({ 
                      isOpen: true, 
                      content: "avgAmount" 
                    })}
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
                  <p className="text-xs text-gray-500 mt-1">En büyük tek işlem tutarı</p>
                  <button 
                    onClick={() => setHelpModal({ 
                      isOpen: true, 
                      content: "maxAmount" 
                    })}
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
                  <p className="text-xs text-gray-500 mt-1">Gece saatleri (22:00-06:00) işlem yüzdesi</p>
                  <button 
                    onClick={() => setHelpModal({ 
                      isOpen: true, 
                      content: "nightDayRatio" 
                    })}
                    className="text-xs text-gray-500 underline hover:text-blue-600 mt-1"
                  >
                    Nasıl bulurum?
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Risk Score Display */}
          {riskScore !== null && isValidInput && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="text-center">
                <p className="text-lg font-semibold text-blue-900 mb-2">
                  Hesaplanan Risk Skoru: {riskScore}/100
                </p>
                <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                  <div 
                    className={`h-3 rounded-full transition-all duration-300 ${
                      riskScore <= 30 ? 'bg-green-500' : 
                      riskScore <= 70 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${riskScore}%` }}
                  ></div>
                </div>
                <p className="text-sm text-blue-700">
                  {riskScore <= 30 ? "🟢 Düşük Risk" : 
                   riskScore <= 70 ? "🟡 Orta Risk" : "🔴 Yüksek Risk"}
                </p>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={submitRiskScore}
            disabled={!walletAddress || riskScore === null || !isValidInput || isLoading || contractStatus !== "exists"}
            className="w-full mt-6 bg-green-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
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
          <div className={`rounded-lg p-4 mb-6 ${
            messageType === "success" ? "bg-green-50 border border-green-200 text-green-800" :
            messageType === "error" ? "bg-red-50 border border-red-200 text-red-800" :
            "bg-blue-50 border border-blue-200 text-blue-800"
          }`}>
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
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
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
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Stellar Expert Adımları */}
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">📊 Stellar Expert Üzerinden:</h4>
                    <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                      <li><strong>stellar.expert/explorer/testnet/account/[ADRES]</strong> adresine git</li>
                      <li><strong>"Payments"</strong> sekmesine tıkla</li>
                      <li>Sağ üstten <strong>"Export CSV"</strong> düğmesine bas</li>
                      <li>CSV dosyasını Excel veya Google Sheets ile aç</li>
                    </ol>
                  </div>

                  {/* Alan-Spesifik Yardım */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">📋 Excel/Sheets Formülleri:</h4>
                    
                    {helpModal.content === "txCount" && (
                      <div className="space-y-2">
                        <p className="text-sm"><strong>İşlem Sayısı:</strong> Son 30 günde yaptığınız toplam işlem sayısı</p>
                        <p className="text-xs text-gray-600 font-mono bg-white p-2 rounded border">
                          =ROWS(A:A)-1  (toplam satır sayısı - başlık)
                        </p>
                      </div>
                    )}

                    {helpModal.content === "avgHours" && (
                      <div className="space-y-2">
                        <p className="text-sm"><strong>Ortalama Saat Aralığı:</strong> İşlemler arası geçen ortalama süre</p>
                        <p className="text-xs text-gray-600 font-mono bg-white p-2 rounded border">
                          Tarih sütunundaki zaman farkları hesaplanır
                        </p>
                      </div>
                    )}

                    {helpModal.content === "assetTypes" && (
                      <div className="space-y-2">
                        <p className="text-sm"><strong>Varlık Çeşidi:</strong> Farklı token/varlık sayısı</p>
                        <p className="text-xs text-gray-600 font-mono bg-white p-2 rounded border">
                          Asset sütununda benzersiz değer sayısı
                        </p>
                      </div>
                    )}

                    {helpModal.content === "avgAmount" && (
                      <div className="space-y-2">
                        <p className="text-sm"><strong>Ortalama İşlem Tutarı:</strong> Ortalama işlem büyüklüğü</p>
                        <p className="text-xs text-gray-600 font-mono bg-white p-2 rounded border">
                          =AVERAGE(C:C)  (Amount sütunu ortalaması)
                        </p>
                      </div>
                    )}

                    {helpModal.content === "maxAmount" && (
                      <div className="space-y-2">
                        <p className="text-sm"><strong>Maksimum İşlem:</strong> En büyük tek işlem tutarı</p>
                        <p className="text-xs text-gray-600 font-mono bg-white p-2 rounded border">
                          =MAX(C:C)  (Amount sütunu maksimumu)
                        </p>
                      </div>
                    )}

                    {helpModal.content === "nightDayRatio" && (
                      <div className="space-y-2">
                        <p className="text-sm"><strong>Gece/Gündüz Oranı:</strong> Gece saatleri (22:00-06:00) işlem yüzdesi</p>
                        <p className="text-xs text-gray-600 font-mono bg-white p-2 rounded border">
                          =COUNTIFS(D:D,"&gt;=22:00")+COUNTIFS(D:D,"&lt;=06:00")/ROWS(A:A)*100
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Örnekler */}
                  <div className="bg-green-50 rounded-lg p-4">
                    <h4 className="font-medium text-green-900 mb-2">✅ Örnek Değerler:</h4>
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
            <p>• Desteklenen wallet'lar: Albedo, xBull, Freighter, WalletConnect</p>
            <p>• Testnet XLM gereklidir (ücretsiz)</p>
            <p>• Gelişmiş alanlar isteğe bağlıdır (boş bırakılabilir)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
