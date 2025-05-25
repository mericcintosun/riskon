"use client";
import { SorobanReactProvider } from "@soroban-react/core";
import { freighter } from "@soroban-react/freighter";
import { useState, useEffect } from "react";

export default function WalletProvider({ children }) {
  const [isFreighterReady, setIsFreighterReady] = useState(false);
  const [shouldRenderProvider, setShouldRenderProvider] = useState(false);

  useEffect(() => {
    // Freighter API'sinin hazır olup olmadığını kontrol et
    const checkFreighterAPI = () => {
      const hasAPI = !!(window.freighterApi || window.freighter);
      console.log("WalletProvider: Freighter API kontrolü:", hasAPI);
      
      if (hasAPI) {
        setIsFreighterReady(true);
      }
      
      // API olsun olmasın provider'ı render et
      setShouldRenderProvider(true);
    };

    // İlk kontrol
    checkFreighterAPI();

    // Periyodik kontrol (API geç yüklenebilir)
    const interval = setInterval(checkFreighterAPI, 2000);

    // Cleanup
    return () => clearInterval(interval);
  }, []);

  // Provider hazır değilse loading göster
  if (!shouldRenderProvider) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Wallet provider yükleniyor...</p>
        </div>
      </div>
    );
  }

  // Error boundary wrapper
  const ProviderWrapper = ({ children }) => {
    try {
      return (
        <SorobanReactProvider
          appName="DeRiskX"
          chains={[
            {
              id: "testnet",
              name: "Testnet",
              networkPassphrase: "Test SDF Network ; September 2015",
              rpcUrl: "https://soroban-testnet.stellar.org",
              networkUrl: "https://horizon-testnet.stellar.org",
            },
            {
              id: "mainnet",
              name: "Mainnet", 
              networkPassphrase: "Public Global Stellar Network ; September 2015",
              rpcUrl: "https://soroban-rpc.stellar.org",
              networkUrl: "https://horizon.stellar.org",
            },
          ]}
          connectors={[freighter()]}
          autoconnect={false}
          defaultChain="testnet"
        >
          {children}
        </SorobanReactProvider>
      );
    } catch (error) {
      console.error("SorobanReactProvider hatası:", error);
      // Hata durumunda fallback UI
      return (
        <div className="min-h-screen bg-gray-50">
          <div className="container mx-auto px-4 py-8">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <h2 className="text-lg font-semibold text-yellow-800 mb-2">⚠️ Wallet Provider Hatası</h2>
              <p className="text-yellow-700 text-sm mb-3">
                SorobanReactProvider başlatılamadı. Bu genellikle Freighter extension sorunlarından kaynaklanır.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="bg-yellow-600 text-white px-4 py-2 rounded text-sm hover:bg-yellow-700"
              >
                Sayfayı Yenile
              </button>
            </div>
            {children}
          </div>
        </div>
      );
    }
  };

  return <ProviderWrapper>{children}</ProviderWrapper>;
}
