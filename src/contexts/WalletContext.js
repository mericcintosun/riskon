"use client";

import { createContext, useContext, useState, useEffect } from "react";
import {
  StellarWalletsKit,
  WalletNetwork,
  allowAllModules,
  ALBEDO_ID,
} from "@creit.tech/stellar-wallets-kit";
import {
  createPasskeyWallet,
  connectPasskeyWallet,
  signWithPasskey,
  getStoredPasskeyWallets,
  checkPasskeySupport,
} from "../lib/passkeyWallet";

const WalletContext = createContext();

export function WalletProvider({ children }) {
  const [kit, setKit] = useState(null);
  const [connectedWallet, setConnectedWallet] = useState(null);
  const [walletAddress, setWalletAddress] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [initError, setInitError] = useState(null);
  const [passkeySupport, setPasskeySupport] = useState(null);

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

        // Check passkey support
        const passkeyStatus = await checkPasskeySupport();
        setPasskeySupport(passkeyStatus);

        // Try to restore wallet connection from localStorage
        const savedWallet = localStorage.getItem("connectedWallet");
        const savedAddress = localStorage.getItem("walletAddress");

        if (savedWallet && savedAddress) {
          setConnectedWallet(savedWallet);
          setWalletAddress(savedAddress);
        }

        setInitError(null);
      } catch (error) {
        console.error("Wallet kit initialization error:", error);
        setInitError(error);

        // Clear any corrupted localStorage data
        localStorage.removeItem("connectedWallet");
        localStorage.removeItem("walletAddress");
      }
    };

    initKit();
  }, []);

  const connectWallet = async (walletId = null) => {
    if (!kit) {
      const error = new Error(
        "Wallet kit not ready yet. Please try again in a moment."
      );
      throw error;
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
          try {
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
                  // Categorize wallet connection errors
                  if (error.message?.includes("User rejected")) {
                    reject(
                      new Error("Wallet connection was cancelled by user")
                    );
                  } else if (error.message?.includes("network")) {
                    reject(
                      new Error(
                        "Network error during wallet connection. Please check your internet connection."
                      )
                    );
                  } else if (
                    error.message?.includes("not found") ||
                    error.message?.includes("undefined")
                  ) {
                    reject(
                      new Error(
                        "Wallet extension not found. Please install the wallet extension and refresh the page."
                      )
                    );
                  } else {
                    reject(
                      new Error(
                        `Wallet connection failed: ${
                          error.message || "Unknown error"
                        }`
                      )
                    );
                  }
                }
              },
              onClosed: (error) => {
                if (error) {
                  reject(new Error("Wallet selection was cancelled"));
                } else {
                  reject(new Error("Wallet selection was cancelled"));
                }
              },
              modalTitle: "Select Stellar Wallet",
              notAvailableText: "This wallet is currently unavailable",
            });
          } catch (error) {
            reject(
              new Error(`Failed to open wallet selection: ${error.message}`)
            );
          }
        });
      }
    } catch (error) {
      // Enhanced error handling with categorization
      let enhancedError;

      if (error.message?.includes("timeout")) {
        enhancedError = new Error(
          "Wallet connection timed out. Please try again."
        );
      } else if (
        error.message?.includes("network") ||
        error.message?.includes("fetch")
      ) {
        enhancedError = new Error(
          "Network error occurred. Please check your internet connection and try again."
        );
      } else if (
        error.message?.includes("permission") ||
        error.message?.includes("denied")
      ) {
        enhancedError = new Error(
          "Wallet permission denied. Please allow access and try again."
        );
      } else if (
        error.message?.includes("not installed") ||
        error.message?.includes("not found")
      ) {
        enhancedError = new Error(
          "Wallet extension not installed. Please install a Stellar wallet extension."
        );
      } else {
        enhancedError = new Error(
          `Wallet connection error: ${
            error.message || "Unknown error occurred"
          }`
        );
      }

      throw enhancedError;
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectWallet = () => {
    try {
      setWalletAddress("");
      setConnectedWallet(null);

      // Clear localStorage
      localStorage.removeItem("connectedWallet");
      localStorage.removeItem("walletAddress");

      return { success: true };
    } catch (error) {
      console.error("Error during wallet disconnection:", error);
      // Force clear state even if localStorage fails
      setWalletAddress("");
      setConnectedWallet(null);
      return { success: false, error: error.message };
    }
  };

  const connectPasskey = async (keyId = null) => {
    setIsLoading(true);

    try {
      let result;

      if (keyId) {
        // Connect to existing passkey wallet
        result = await connectPasskeyWallet(keyId);
      } else {
        // Create new passkey wallet
        result = await createPasskeyWallet();
      }

      if (result.success) {
        setWalletAddress(result.walletAddress);
        setConnectedWallet("Passkey");

        // Save to localStorage
        localStorage.setItem("connectedWallet", "Passkey");
        localStorage.setItem("walletAddress", result.walletAddress);
        localStorage.setItem("passkeyKeyId", result.keyId);
      }

      return result;
    } catch (error) {
      throw new Error(`Passkey connection failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getStoredPasskeys = () => {
    return getStoredPasskeyWallets();
  };

  const validateWalletConnection = () => {
    const storedWallet = localStorage.getItem("connectedWallet");
    const storedAddress = localStorage.getItem("walletAddress");

    // Check for inconsistent state
    if ((storedWallet && !storedAddress) || (!storedWallet && storedAddress)) {
      // Clear corrupted data
      localStorage.removeItem("connectedWallet");
      localStorage.removeItem("walletAddress");
      setConnectedWallet(null);
      setWalletAddress("");
      return false;
    }

    return !!(storedWallet && storedAddress);
  };

  const getWalletName = (walletId) => {
    const walletMap = {
      albedo: "Albedo",
      xbull: "xBull",
      freighter: "Freighter",
    };
    return walletMap[walletId] || "Unknown";
  };

  // Validate connection state on mount and periodically
  useEffect(() => {
    const validateConnection = () => {
      if (connectedWallet || walletAddress) {
        const isValid = validateWalletConnection();
        if (!isValid) {
          console.warn("Invalid wallet connection state detected and cleared");
        }
      }
    };

    validateConnection();

    // Check every 30 seconds
    const interval = setInterval(validateConnection, 30000);

    return () => clearInterval(interval);
  }, [connectedWallet, walletAddress]);

  const value = {
    kit,
    connectedWallet,
    walletAddress,
    isLoading,
    initError,
    passkeySupport,
    connectWallet,
    disconnectWallet,
    connectPasskey,
    getStoredPasskeys,
    validateWalletConnection,
    isConnected: !!walletAddress,
    isReady: !!kit && !initError,
  };

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}
