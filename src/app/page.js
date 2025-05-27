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
  
  // App state
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState(""); // success, error, info
  const [transactionHash, setTransactionHash] = useState("");
  const [contractStatus, setContractStatus] = useState("unknown"); // unknown, exists, missing

  // Basit risk skoru hesaplama - AI olmadan
  const calculateRiskScore = () => {
    const txCountNum = parseFloat(txCount);
    const avgHoursNum = parseFloat(avgHours);
    const assetTypesNum = parseFloat(assetTypes);
    
    // Değerlerin geçerli olup olmadığını kontrol et
    if (isNaN(txCountNum) || isNaN(avgHoursNum) || isNaN(assetTypesNum) ||
        txCountNum < 0 || txCountNum > 100 ||
        avgHoursNum < 0 || avgHoursNum > 24 ||
        assetTypesNum < 0 || assetTypesNum > 10) {
      return null;
    }

    // Basit risk hesaplama algoritması
    // Yüksek işlem sayısı = düşük risk
    // Düşük saat aralığı = yüksek risk (çok sık işlem)
    // Çok varlık çeşidi = yüksek risk (komplekslik)
    
    const txRisk = Math.max(0, (100 - txCountNum) * 0.4); // %40 ağırlık
    const timeRisk = Math.max(0, (24 - avgHoursNum) * 2); // %40 ağırlık (24-avgHours)*2 = 0-48, normalize to 0-100
    const assetRisk = Math.min(100, assetTypesNum * 10); // %20 ağırlık
    
    const totalRisk = (txRisk * 0.4) + (timeRisk * 0.4) + (assetRisk * 0.2);
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
          
          <div className="space-y-4">
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
            </div>
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

        {/* Info Card */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold mb-3">ℹ️ Bilgi</h3>
          <div className="text-sm text-gray-600 space-y-2">
            <p>• Bu uygulama Stellar Testnet kullanır</p>
            <p>• Risk skoru basit algoritma ile hesaplanır</p>
            <p>• Verileriniz blockchain'de güvenli şekilde saklanır</p>
            <p>• Desteklenen wallet'lar: Albedo, xBull, Freighter, WalletConnect</p>
            <p>• Testnet XLM gereklidir (ücretsiz)</p>
            <p>• Risk Algoritması: İşlem sıklığı, zaman aralığı ve varlık çeşitliliği</p>
          </div>
        </div>
      </div>
    </div>
  );
}
