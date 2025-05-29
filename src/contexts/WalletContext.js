"use client";

import { createContext, useContext, useState, useEffect } from "react";
import {
  StellarWalletsKit,
  WalletNetwork,
  allowAllModules,
  ALBEDO_ID,
} from "@creit.tech/stellar-wallets-kit";

const WalletContext = createContext();

export function WalletProvider({ children }) {
  const [kit, setKit] = useState(null);
  const [connectedWallet, setConnectedWallet] = useState(null);
  const [walletAddress, setWalletAddress] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Initialize wallet kit
  useEffect(() => {
    const initKit = async () => {
      try {
        const kitInstance = new StellarWalletsKit({
          network: WalletNetwork.TESTNET,
          selectedWalletId: ALBEDO_ID,
          modules: allowAllModules(),
        });
        setKit(kitInstance);
        
        // Try to restore wallet connection from localStorage
        const savedWallet = localStorage.getItem("connectedWallet");
        const savedAddress = localStorage.getItem("walletAddress");
        
        if (savedWallet && savedAddress) {
          setConnectedWallet(savedWallet);
          setWalletAddress(savedAddress);
        }
      } catch (error) {
        console.error("Wallet kit initialization error:", error);
      }
    };

    initKit();
  }, []);

  const connectWallet = async (walletId = null) => {
    if (!kit) {
      throw new Error("Wallet kit not ready yet");
    }

    setIsLoading(true);

    try {
      if (walletId) {
        // Direct wallet connection
        kit.setWallet(walletId);
        const { address } = await kit.getAddress();
        
        const walletName = getWalletName(walletId);
        setWalletAddress(address);
        setConnectedWallet(walletName);
        
        // Save to localStorage
        localStorage.setItem("connectedWallet", walletName);
        localStorage.setItem("walletAddress", address);
        
        return { success: true, walletName, address };
      } else {
        // Modal-based wallet selection
        return new Promise((resolve, reject) => {
          kit.openModal({
            onWalletSelected: async (option) => {
              try {
                kit.setWallet(option.id);
                const { address } = await kit.getAddress();
                
                setWalletAddress(address);
                setConnectedWallet(option.name);
                
                // Save to localStorage
                localStorage.setItem("connectedWallet", option.name);
                localStorage.setItem("walletAddress", address);
                
                resolve({ success: true, walletName: option.name, address });
              } catch (error) {
                reject(error);
              }
            },
            onClosed: (error) => {
              if (error) {
                reject(new Error("Wallet selection cancelled"));
              }
            },
            modalTitle: "Select Stellar Wallet",
            notAvailableText: "This wallet is currently unavailable",
          });
        });
      }
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectWallet = () => {
    setWalletAddress("");
    setConnectedWallet(null);
    
    // Clear localStorage
    localStorage.removeItem("connectedWallet");
    localStorage.removeItem("walletAddress");
  };

  const getWalletName = (walletId) => {
    const walletMap = {
      "albedo": "Albedo",
      "xbull": "xBull", 
      "freighter": "Freighter"
    };
    return walletMap[walletId] || "Unknown";
  };

  const value = {
    kit,
    connectedWallet,
    walletAddress,
    isLoading,
    connectWallet,
    disconnectWallet,
    isConnected: !!walletAddress
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
} 