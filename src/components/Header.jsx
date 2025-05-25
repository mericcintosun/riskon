'use client';
import { useSorobanReact } from '@soroban-react/core';
import { useState, useEffect } from "react";
import { getAlbedoStatusSync, getAlbedoStatus, connectAlbedo } from "../lib/albedo";
import Link from 'next/link';

export default function Header() {
  // SorobanReact hook'larını güvenli şekilde kullan
  let sorobanContext;
  try {
    sorobanContext = useSorobanReact();
  } catch (error) {
    console.error("Header SorobanReact hook hatası:", error);
    sorobanContext = {
      address: null,
      server: null,
      activeChain: null,
      connect: null
    };
  }
  
  const { address, server, activeChain, connect } = sorobanContext;
  
  // Albedo state
  const [albedoStatus, setAlbedoStatus] = useState("loading");
  const [albedoAddress, setAlbedoAddress] = useState(null);
  const [walletMode, setWalletMode] = useState("auto");
  const [isConnecting, setIsConnecting] = useState(false);

  // Albedo durumu kontrol et - Async
  useEffect(() => {
    const checkAlbedoStatus = async () => {
      try {
        // İlk hızlı kontrol
        const syncStatus = getAlbedoStatusSync();
        if (syncStatus.available) {
          setAlbedoStatus("available");
          return;
        }
        
        // Async kontrol - SDK yüklenene kadar bekle
        const asyncStatus = await getAlbedoStatus();
        if (asyncStatus.available) {
          setAlbedoStatus("available");
        } else {
          setAlbedoStatus("not-available");
        }
      } catch (error) {
        console.error("Albedo status kontrol hatası:", error);
        setAlbedoStatus("not-available");
      }
    };

    checkAlbedoStatus();
    
    // Periyodik kontrol - SDK yüklenene kadar
    const interval = setInterval(async () => {
      if (albedoStatus === "loading" || albedoStatus === "not-available") {
        await checkAlbedoStatus();
      }
    }, 2000);
    
    return () => clearInterval(interval);
  }, [albedoStatus]);

  // Albedo ile bağlantı kurma
  const connectWithAlbedo = async () => {
    try {
      setIsConnecting(true);
      console.log("🌟 Header: Albedo bağlantısı başlatılıyor...");
      
      const result = await connectAlbedo();
      setAlbedoAddress(result.address);
      setWalletMode("albedo");
      setAlbedoStatus("connected");
      
      console.log("✅ Header: Albedo bağlantısı başarılı:", result.address);
    } catch (error) {
      console.error("Header Albedo bağlantı hatası:", error);
      alert(`Albedo bağlantı hatası: ${error.message}`);
    } finally {
      setIsConnecting(false);
    }
  };

  // Freighter ile bağlantı kurma
  const connectWithFreighter = async () => {
    try {
      setIsConnecting(true);
      if (connect) {
        await connect();
        setWalletMode("freighter");
      } else {
        throw new Error("SorobanReact connect fonksiyonu bulunamadı");
      }
    } catch (error) {
      console.error("Header Freighter bağlantı hatası:", error);
      alert(`Freighter bağlantı hatası: ${error.message}`);
    } finally {
      setIsConnecting(false);
    }
  };

  // Aktif wallet bilgisi
  const currentAddress = walletMode === "albedo" ? albedoAddress : address;
  const isConnected = walletMode === "albedo" 
    ? (albedoStatus === "connected" && albedoAddress)
    : Boolean(address);

  // Network durumu
  const getNetworkStatus = () => {
    if (walletMode === "albedo") {
      return "Testnet (Albedo)";
    }
    
    if (activeChain?.id === "testnet") {
      return "Testnet (Freighter)";
    } else if (activeChain?.id === "mainnet") {
      return "Mainnet (Desteklenmiyor)";
    } else if (activeChain) {
      return `${activeChain.name} (Bilinmeyen)`;
    }
    
    return "Network Bilinmiyor";
  };

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Title */}
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-gray-900">
              🌟 Stellar Risk Scoring
            </h1>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex space-x-8">
            <a href="/predict" className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium">
              Risk Hesapla
            </a>
            <a href="/train" className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium">
              Model Eğit
            </a>
            <a href="/debug" className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium">
              Debug
            </a>
          </nav>

          {/* Wallet Status */}
          <div className="flex items-center space-x-4">
            {/* Network Indicator */}
            {(isConnected || activeChain) && (
              <div className="hidden sm:flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  activeChain?.id === "testnet" || walletMode === "albedo" ? "bg-green-500" : 
                  activeChain?.id === "mainnet" ? "bg-red-500" : "bg-yellow-500"
                }`}></div>
                <span className="text-xs text-gray-600">
                  {getNetworkStatus()}
                </span>
              </div>
            )}

            {/* Wallet Connection */}
            {isConnected ? (
              <div className="flex items-center space-x-2">
                <div className="text-sm">
                  <div className="font-medium text-gray-900">
                    {walletMode === "albedo" ? "🌟 Albedo" : "🚀 Freighter"}
                  </div>
                  <div className="text-gray-500 text-xs">
                    {currentAddress?.slice(0, 6)}...{currentAddress?.slice(-4)}
                  </div>
                </div>
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                {/* Albedo Connect Button */}
                {albedoStatus === "available" && (
                  <button
                    onClick={connectWithAlbedo}
                    disabled={isConnecting}
                    className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-700 disabled:bg-gray-400 flex items-center space-x-1"
                  >
                    <span>🌟</span>
                    <span>{isConnecting ? "Connecting..." : "Connect Albedo"}</span>
                  </button>
                )}
                
                {/* Albedo Loading */}
                {albedoStatus === "loading" && (
                  <div className="text-xs text-gray-500 px-3 py-1.5">
                    ⏳ Albedo SDK Loading...
                  </div>
                )}
                
                {/* Freighter Connect Button */}
                {connect && (
                  <button
                    onClick={connectWithFreighter}
                    disabled={isConnecting}
                    className="bg-purple-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-purple-700 disabled:bg-gray-400 flex items-center space-x-1"
                  >
                    <span>🚀</span>
                    <span>{isConnecting ? "Connecting..." : "Connect Freighter"}</span>
                  </button>
                )}
                
                {/* No Wallet Available */}
                {albedoStatus === "not-available" && !connect && (
                  <div className="text-sm text-gray-500">
                    <div className="flex items-center space-x-2">
                      <span>Wallet Gerekli</span>
                      <a
                        href="https://albedo.link"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        Albedo
                      </a>
                      <span>|</span>
                      <a
                        href="https://freighter.app"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-600 hover:underline"
                      >
                        Freighter
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden border-t border-gray-200">
        <div className="px-2 pt-2 pb-3 space-y-1">
          <a href="/predict" className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-blue-600">
            Risk Hesapla
          </a>
          <a href="/train" className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-blue-600">
            Model Eğit
          </a>
          <a href="/debug" className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-blue-600">
            Debug
          </a>
        </div>
      </div>
    </header>
  );
}