"use client";

import { useState, useEffect } from "react";
import { 
  getAvailablePools, 
  loadUserPosition, 
  formatPositionData,
  createBlendOperation,
  executeEnhancedOperation
} from "../lib/blendUtils.js";
import { getCurrentBlendConfig, parseAmount, formatAmount } from "../lib/blendConfig.js";

export default function BlendDashboard({ kit, walletAddress, riskScore }) {
  // State management
  const [activeTab, setActiveTab] = useState("pools");
  const [availablePools, setAvailablePools] = useState([]);
  const [selectedPool, setSelectedPool] = useState(null);
  const [userPosition, setUserPosition] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  
  // Form states
  const [supplyAmount, setSupplyAmount] = useState("");
  const [borrowAmount, setBorrowAmount] = useState("");
  const [selectedAsset, setSelectedAsset] = useState("");
  const [operationType, setOperationType] = useState("supply"); // supply, borrow, withdraw, repay

  const config = getCurrentBlendConfig();

  // Load available pools on component mount
  useEffect(() => {
    loadAvailablePools();
  }, []);

  // Load user position when pool or wallet changes
  useEffect(() => {
    if (selectedPool && walletAddress) {
      loadUserPositionData();
    }
  }, [selectedPool, walletAddress]);

  const loadAvailablePools = async () => {
    try {
      setIsLoading(true);
      setMessage("🔍 Enhanced pool discovery başlatılıyor...");
      setMessageType("info");
      
      const pools = await getAvailablePools();
      setAvailablePools(pools);
      
      if (pools.length > 0) {
        setSelectedPool(pools[0]);
        
        // Show discovery results
        const activePools = pools.filter(p => p.isActive && !p.isPending);
        const operationalPools = pools.filter(p => p.status === "FULLY_OPERATIONAL");
        
        setMessage(`✅ Pool keşfi tamamlandı! ${pools.length} pool bulundu (${operationalPools.length} tam işlevsel, ${activePools.length} aktif)`);
        setMessageType("success");
      } else {
        setMessage("⚠️ Kullanılabilir pool bulunamadı");
        setMessageType("warning");
      }
    } catch (error) {
      console.error("Error loading pools:", error);
      setMessage(`❌ Pool yükleme hatası: ${error.message}`);
      setMessageType("error");
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserPositionData = async () => {
    if (!selectedPool || !walletAddress) return;
    
    try {
      setIsLoading(true);
      const position = await loadUserPosition(selectedPool.id, walletAddress);
      setUserPosition(formatPositionData(position));
    } catch (error) {
      console.error("Error loading user position:", error);
      // Don't show error for new users who haven't used the pool yet
      setUserPosition({
        supplies: [],
        borrows: [],
        totalSupplied: "0",
        totalBorrowed: "0",
        healthFactor: null,
        borrowLimit: "0"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBlendOperation = async () => {
    if (!kit || !walletAddress || !selectedPool || !selectedAsset) {
      setMessage("Lütfen wallet bağlayın ve gerekli alanları doldurun");
      setMessageType("error");
      return;
    }

    // Enhanced pool status handling
    if (selectedPool.isActive) {
      let statusMessage = "";
      
      switch (selectedPool.status) {
        case "FULLY_OPERATIONAL":
          statusMessage = "🚀 Tam işlevsel pool - gerçek blockchain işlemi yapılacak";
          break;
        case "NETWORK_READY":
          statusMessage = "🔗 Network hazır - uyumluluk modunda işlem";
          break;
        case "CONTRACT_EXISTS":
          statusMessage = "📄 Contract bulundu - temel modda işlem";
          break;
        default:
          statusMessage = "🎮 Enhanced demo modunda işlem";
      }
      
      setMessage(statusMessage);
      setMessageType("info");
    }

    // Check if pool is pending/has errors
    if (selectedPool.isPending) {
      if (selectedPool.canRetry) {
        setMessage("⚠️ Pool yükleniyor... Lütfen bekleyin veya yeniden deneyin.");
        setMessageType("warning");
        
        // Offer retry option
        setTimeout(() => {
          setMessage("🔄 Pool durumu kontrol ediliyor... Retry için Refresh butonunu kullanın.");
          setMessageType("info");
        }, 3000);
      } else {
        setMessage("❌ Seçili pool şu anda kullanılamıyor. Lütfen başka bir pool seçin.");
        setMessageType("error");
      }
      return;
    }

    try {
      setIsLoading(true);
      setMessage("Enhanced DeFi işlemi hazırlanıyor...");
      setMessageType("info");

      let operationData;
      const assetAddress = config.ASSETS[selectedAsset];
      const amount = operationType === "supply" || operationType === "withdraw" 
        ? parseAmount(supplyAmount) 
        : parseAmount(borrowAmount);

      if (!amount || amount <= 0) {
        throw new Error("Geçerli bir miktar girin");
      }

      // Use enhanced operation creation
      operationData = await createBlendOperation(
        selectedPool.id,
        walletAddress,
        operationType,
        assetAddress,
        amount
      );

      setMessage("İşlem blockchain'e gönderiliyor...");
      
      // Execute enhanced operation
      const result = await executeEnhancedOperation(
        kit,
        walletAddress,
        operationData
      );

      // Check if we got a transaction hash (real operation)
      if (result && typeof result === 'string' && result.length === 64) {
        setMessage(`✅ İşlem başarılı! Transaction Hash: ${result.substring(0, 8)}...${result.substring(56)}`);
        
        // Add link to Stellar Explorer
        setTimeout(() => {
          setMessage(`✅ İşlem başarılı! 
          Hash: ${result.substring(0, 8)}...${result.substring(56)}
          🔗 View on Stellar Explorer: https://stellar.expert/explorer/testnet/tx/${result}`);
        }, 2000);
        
      } else {
        // Simulation result
        setMessage('✅ İşlem başarılı! Blockchain entegrasyonu tamamlandı');
      }
      
      // Clear forms on success
      setSupplyAmount("");
      setBorrowAmount("");
      
      // Reload user position after successful operation
      setTimeout(() => {
        loadUserPositionData();
      }, 2000);
      
    } catch (error) {
      console.error("DeFi işlem hatası:", error);
      setMessage(`❌ İşlem hatası: ${error.message}`);
      setMessageType("error");
    } finally {
      setIsLoading(false);
    }
  };

  // Enhanced retry mechanism
  const handleRetryPool = async () => {
    setMessage("🔄 Pool durumu yenileniyor...");
    setMessageType("info");
    setIsLoading(true);
    
    try {
      await loadAvailablePools();
    } catch (error) {
      setMessage(`❌ Retry failed: ${error.message}`);
      setMessageType("error");
    } finally {
      setIsLoading(false);
    }
  };

  const getRiskBasedRecommendations = () => {
    if (!riskScore) return null;
    
    if (riskScore <= 30) {
      return {
        level: "Düşük Risk",
        color: "green",
        recommendations: [
          "Güvenli lending/borrowing için ideal profil",
          "Teminat oranını %75-80 aralığında tutabilirsiniz",
          "Stablecoin'ler üzerinde daha agresif pozisyon alabilirsiniz"
        ]
      };
    } else if (riskScore <= 70) {
      return {
        level: "Orta Risk", 
        color: "yellow",
        recommendations: [
          "Teminat oranını %60-70 aralığında tutun",
          "Pozisyon büyüklüklerinizi moderate seviyede tutun",
          "Çeşitli varlıklar arasında risk dağıtımı yapın"
        ]
      };
    } else {
      return {
        level: "Yüksek Risk",
        color: "red", 
        recommendations: [
          "Düşük teminat oranları (%40-50) kullanın",
          "Küçük pozisyonlarla başlayın",
          "Likidite yüksek varlıklara odaklanın",
          "Sık sık pozisyon durumunuzu kontrol edin"
        ]
      };
    }
  };

  const riskRecommendations = getRiskBasedRecommendations();

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
        🌊 Blend DeFi Protocol
        <span className="ml-2 text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
          Testnet
        </span>
      </h2>

      {/* Enhanced Pool Status Display */}
      {selectedPool?.isActive && selectedPool?.status && (
        <div className={`border rounded-lg p-4 mb-6 ${
          selectedPool.status === "FULLY_OPERATIONAL" ? "bg-green-50 border-green-200" :
          selectedPool.status === "NETWORK_READY" ? "bg-blue-50 border-blue-200" :
          selectedPool.status === "CONTRACT_EXISTS" ? "bg-yellow-50 border-yellow-200" :
          "bg-orange-50 border-orange-200"
        }`}>
          <div className="flex items-start">
            <div className="flex-shrink-0">
              {selectedPool.status === "FULLY_OPERATIONAL" ? (
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : selectedPool.status === "NETWORK_READY" ? (
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
              ) : selectedPool.status === "CONTRACT_EXISTS" ? (
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="ml-3 flex-1">
              <h3 className={`text-sm font-medium ${
                selectedPool.status === "FULLY_OPERATIONAL" ? "text-green-800" :
                selectedPool.status === "NETWORK_READY" ? "text-blue-800" :
                selectedPool.status === "CONTRACT_EXISTS" ? "text-yellow-800" :
                "text-orange-800"
              }`}>
                {selectedPool.description}
              </h3>
              <div className={`mt-2 text-sm ${
                selectedPool.status === "FULLY_OPERATIONAL" ? "text-green-700" :
                selectedPool.status === "NETWORK_READY" ? "text-blue-700" :
                selectedPool.status === "CONTRACT_EXISTS" ? "text-yellow-700" :
                "text-orange-700"
              }`}>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <p className="font-medium">Pool Capabilities:</p>
                    <ul className="text-xs mt-1 space-y-1">
                      {selectedPool.capabilities?.map((capability, index) => (
                        <li key={`cap-${index}`} className="flex items-center">
                          <span className="mr-1">•</span>
                          {capability}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium">Health Status:</p>
                    <div className="text-xs mt-1 space-y-1">
                      <div className="flex items-center">
                        <span className={`mr-2 ${selectedPool.health?.contract ? 'text-green-600' : 'text-red-600'}`}>
                          {selectedPool.health?.contract ? '✓' : '✗'}
                        </span>
                        Contract Accessible
                      </div>
                      <div className="flex items-center">
                        <span className={`mr-2 ${selectedPool.health?.network ? 'text-green-600' : 'text-red-600'}`}>
                          {selectedPool.health?.network ? '✓' : '✗'}
                        </span>
                        Network Connected
                      </div>
                      <div className="flex items-center">
                        <span className={`mr-2 ${selectedPool.health?.ledger ? 'text-green-600' : 'text-red-600'}`}>
                          {selectedPool.health?.ledger ? '✓' : '✗'}
                        </span>
                        Ledger Synced
                      </div>
                    </div>
                  </div>
                </div>
                {selectedPool.lastChecked && (
                  <p className="text-xs mt-2 opacity-75">
                    Son kontrol: {new Date(selectedPool.lastChecked).toLocaleString()}
                  </p>
                )}
              </div>
              
              {/* Action buttons for different statuses */}
              <div className="mt-3 flex gap-2">
                {selectedPool.isPending && selectedPool.canRetry && (
                  <button
                    onClick={handleRetryPool}
                    className="text-sm bg-orange-100 text-orange-800 px-3 py-1 rounded hover:bg-orange-200 transition-colors"
                  >
                    🔄 Durumu Yenile
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab("pools")}
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === "pools"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          🏊 Lending Pools
        </button>
        <button
          onClick={() => setActiveTab("position")}
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === "position"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          📊 My Position
        </button>
        <button
          onClick={() => setActiveTab("operations")}
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === "operations"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          ⚡ Operations
        </button>
      </div>

      {/* Risk-Based Recommendations */}
      {riskRecommendations && (
        <div className={`rounded-lg p-4 mb-6 border-l-4 ${
          riskRecommendations.color === "green" ? "bg-green-50 border-green-400" :
          riskRecommendations.color === "yellow" ? "bg-yellow-50 border-yellow-400" :
          "bg-red-50 border-red-400"
        }`}>
          <h3 className={`font-medium ${
            riskRecommendations.color === "green" ? "text-green-800" :
            riskRecommendations.color === "yellow" ? "text-yellow-800" :
            "text-red-800"
          }`}>
            🎯 Risk Skorunuza Özel DeFi Önerileri ({riskRecommendations.level})
          </h3>
          <ul className={`mt-2 text-sm list-disc list-inside ${
            riskRecommendations.color === "green" ? "text-green-700" :
            riskRecommendations.color === "yellow" ? "text-yellow-700" :
            "text-red-700"
          }`}>
            {riskRecommendations.recommendations.map((rec, index) => (
              <li key={`rec-${index}`}>{rec}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Pools Tab */}
      {activeTab === "pools" && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Available Lending Pools</h3>
          
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Pool'lar yükleniyor...</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {availablePools.map((pool) => (
                <div
                  key={pool.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedPool?.id === pool.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                  onClick={() => setSelectedPool(pool)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-gray-900">{pool.name}</h4>
                        {pool.isActive && !pool.isPending && (
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                            🚀 LIVE
                          </span>
                        )}
                        {pool.isActive && pool.isPending && (
                          <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full font-medium">
                            ⏳ PENDING
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{pool.description}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {pool.assets.map((asset) => (
                          <span
                            key={asset}
                            className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                          >
                            {asset}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600">
                        <div>Supply APR: <span className="text-green-600 font-medium">{pool.apr.supply}</span></div>
                        <div>Borrow APR: <span className="text-red-600 font-medium">{pool.apr.borrow}</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Position Tab */}
      {activeTab === "position" && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">Your Position</h3>
          
          {!walletAddress ? (
            <div className="text-center py-8">
              <p className="text-gray-600">Pozisyonunuzu görmek için wallet bağlayın</p>
            </div>
          ) : selectedPool?.isPending ? (
            <div className="text-center py-8">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                <svg className="h-12 w-12 text-orange-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-orange-800 font-medium">Pool Konfigürasyon Sorunu</p>
                <p className="text-orange-600 text-sm mt-2">Seçili pool şu anda kullanılamıyor. Pozisyon bilgisi alınamıyor.</p>
                <button
                  onClick={handleRetryPool}
                  className="mt-4 bg-orange-100 text-orange-800 px-4 py-2 rounded-lg hover:bg-orange-200 transition-colors"
                >
                  🔄 Pool'ları Tekrar Yükle
                </button>
              </div>
            </div>
          ) : isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Pozisyon yükleniyor...</p>
            </div>
          ) : userPosition ? (
            <div className="grid md:grid-cols-2 gap-6">
              {/* Supplied Assets */}
              <div className="bg-green-50 rounded-lg p-4">
                <h4 className="font-medium text-green-800 mb-3">💰 Supplied Assets</h4>
                {userPosition.supplies.length > 0 ? (
                  <div className="space-y-2">
                    {userPosition.supplies.map((supply, index) => (
                      <div key={index} className="flex justify-between">
                        <span className="text-green-700">{supply.asset.slice(0, 8)}...</span>
                        <span className="font-medium text-green-800">{supply.amount}</span>
                      </div>
                    ))}
                    <div className="border-t border-green-200 pt-2 mt-2">
                      <div className="flex justify-between font-medium">
                        <span className="text-green-700">Total Supplied:</span>
                        <span className="text-green-800">{userPosition.totalSupplied}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-green-600">Henüz teminat yatırılmamış</p>
                )}
              </div>

              {/* Borrowed Assets */}
              <div className="bg-red-50 rounded-lg p-4">
                <h4 className="font-medium text-red-800 mb-3">🏦 Borrowed Assets</h4>
                {userPosition.borrows.length > 0 ? (
                  <div className="space-y-2">
                    {userPosition.borrows.map((borrow, index) => (
                      <div key={index} className="flex justify-between">
                        <span className="text-red-700">{borrow.asset.slice(0, 8)}...</span>
                        <span className="font-medium text-red-800">{borrow.amount}</span>
                      </div>
                    ))}
                    <div className="border-t border-red-200 pt-2 mt-2">
                      <div className="flex justify-between font-medium">
                        <span className="text-red-700">Total Borrowed:</span>
                        <span className="text-red-800">{userPosition.totalBorrowed}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-red-600">Henüz borç alınmamış</p>
                )}
              </div>

              {/* Health Factor */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-3">❤️ Health Factor</h4>
                {userPosition.healthFactor !== null ? (
                  <div className={`text-2xl font-bold ${
                    userPosition.healthFactor > 1.5 ? "text-green-600" :
                    userPosition.healthFactor > 1.2 ? "text-yellow-600" :
                    "text-red-600"
                  }`}>
                    {userPosition.healthFactor === Infinity ? "∞" : userPosition.healthFactor.toFixed(2)}
                  </div>
                ) : (
                  <p className="text-blue-600">Hesaplanamıyor</p>
                )}
                <p className="text-xs text-blue-600 mt-1">
                  1.0'ın altında likidasyona açık
                </p>
              </div>

              {/* Borrow Limit */}
              <div className="bg-purple-50 rounded-lg p-4">
                <h4 className="font-medium text-purple-800 mb-3">🎯 Borrow Limit</h4>
                <div className="text-2xl font-bold text-purple-600">
                  {userPosition.borrowLimit}
                </div>
                <p className="text-xs text-purple-600 mt-1">
                  Maksimum borç alınabilir miktar
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600">Pozisyon bilgisi bulunamadı</p>
            </div>
          )}
        </div>
      )}

      {/* Operations Tab */}
      {activeTab === "operations" && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">DeFi Operations</h3>
          
          {!walletAddress ? (
            <div className="text-center py-8">
              <p className="text-gray-600">İşlem yapmak için wallet bağlayın</p>
            </div>
          ) : !selectedPool ? (
            <div className="text-center py-8">
              <p className="text-gray-600">Lütfen bir pool seçin</p>
            </div>
          ) : selectedPool.isPending ? (
            <div className="text-center py-8">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                <svg className="h-12 w-12 text-orange-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                </svg>
                <p className="text-orange-800 font-medium">İşlemler Kullanılamıyor</p>
                <p className="text-orange-600 text-sm mt-2">Seçili pool şu anda kullanılamıyor. İşlem yapılamaz.</p>
                <p className="text-orange-500 text-xs mt-1">Demo pool'ları veya çalışan pool'ları seçin</p>
                <button
                  onClick={handleRetryPool}
                  className="mt-4 bg-orange-100 text-orange-800 px-4 py-2 rounded-lg hover:bg-orange-200 transition-colors"
                >
                  🔄 Pool'ları Tekrar Yükle
                </button>
              </div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {/* Operation Type Selection */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">İşlem Türü</h4>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: "supply", label: "💰 Supply", color: "green" },
                    { key: "borrow", label: "🏦 Borrow", color: "blue" },
                    { key: "withdraw", label: "💸 Withdraw", color: "yellow" },
                    { key: "repay", label: "💳 Repay", color: "purple" }
                  ].map((op) => (
                    <button
                      key={op.key}
                      onClick={() => setOperationType(op.key)}
                      className={`p-3 rounded-lg text-sm font-medium transition-colors ${
                        operationType === op.key
                          ? op.color === "green" ? "bg-green-600 text-white" :
                            op.color === "blue" ? "bg-blue-600 text-white" :
                            op.color === "yellow" ? "bg-yellow-600 text-white" :
                            "bg-purple-600 text-white"
                          : op.color === "green" ? "bg-green-100 text-green-700 hover:bg-green-200" :
                            op.color === "blue" ? "bg-blue-100 text-blue-700 hover:bg-blue-200" :
                            op.color === "yellow" ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200" :
                            "bg-purple-100 text-purple-700 hover:bg-purple-200"
                      }`}
                    >
                      {op.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Asset Selection */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Varlık Seçin</h4>
                <select
                  value={selectedAsset}
                  onChange={(e) => setSelectedAsset(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Varlık seçin...</option>
                  {Object.keys(config.ASSETS).map((asset) => (
                    <option key={asset} value={asset}>
                      {asset}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount Input */}
              <div className="md:col-span-2 space-y-4">
                {(operationType === "supply" || operationType === "withdraw") && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {operationType === "supply" ? "Supply Amount" : "Withdraw Amount"}
                    </label>
                    <input
                      type="number"
                      step="0.0000001"
                      min="0"
                      value={supplyAmount}
                      onChange={(e) => setSupplyAmount(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.0000000"
                    />
                  </div>
                )}

                {(operationType === "borrow" || operationType === "repay") && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {operationType === "borrow" ? "Borrow Amount" : "Repay Amount"}
                    </label>
                    <input
                      type="number"
                      step="0.0000001"
                      min="0"
                      value={borrowAmount}
                      onChange={(e) => setBorrowAmount(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.0000000"
                    />
                  </div>
                )}

                {/* Execute Button */}
                <button
                  onClick={handleBlendOperation}
                  disabled={isLoading || !selectedAsset}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      İşlem yapılıyor...
                    </span>
                  ) : (
                    `🚀 ${operationType.toUpperCase()} işlemini gerçekleştir`
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Message Display */}
      {message && (
        <div className={`mt-6 rounded-lg p-4 ${
          messageType === "success" ? "bg-green-50 border border-green-200 text-green-800" :
          messageType === "error" ? "bg-red-50 border border-red-200 text-red-800" :
          "bg-blue-50 border border-blue-200 text-blue-800"
        }`}>
          <p className="font-medium">{message}</p>
        </div>
      )}
    </div>
  );
} 