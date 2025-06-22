"use client";

/**
 * Passkey-Kit Smart Wallet Integration
 * WebAuthn-based wallet creation and management with Launchtube sponsorship
 * Following official Passkey-Kit documentation patterns
 */

import { PasskeyKit } from "passkey-kit";

// Passkey-Kit configuration - client-side only
const PASSKEY_CONFIG = {
  rpcUrl:
    process.env.NEXT_PUBLIC_RPC_URL || "https://soroban-testnet.stellar.org",
  networkPassphrase:
    process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE ||
    "Test SDF Network ; September 2015",
  walletWasmHash:
    process.env.NEXT_PUBLIC_WALLET_WASM_HASH || "DEMO_MODE_DISABLED",
};

let passkeyKit = null;

/**
 * Initialize Passkey-Kit instance (client-side)
 */
export async function initializePasskeyKit() {
  try {
    if (passkeyKit) {
      return passkeyKit;
    }


    // Check if WebAuthn is supported
    if (!window.PublicKeyCredential) {
      throw new Error("WebAuthn not supported in this browser");
    }

    if (PASSKEY_CONFIG.walletWasmHash === "DEMO_MODE_DISABLED") {
      throw new Error(
        "Passkey wallet WASM hash not configured. Please set NEXT_PUBLIC_WALLET_WASM_HASH environment variable."
      );
    }

    // Initialize PasskeyKit with client configuration
    passkeyKit = new PasskeyKit({
      rpcUrl: PASSKEY_CONFIG.rpcUrl,
      networkPassphrase: PASSKEY_CONFIG.networkPassphrase,
      walletWasmHash: PASSKEY_CONFIG.walletWasmHash,
    });

    return passkeyKit;
  } catch (error) {
    console.error("❌ Failed to initialize Passkey-Kit:", error);
    throw error;
  }
}

/**
 * Create a new Passkey wallet using PasskeyKit
 * @param {string} keyId - Unique identifier for the key
 * @returns {Promise<Object>} Wallet creation result
 */
export async function createPasskeyWallet(
  appName = "Stellar Risk Analyzer",
  userName = `user-${Date.now()}`
) {
  try {
 

    const kit = await initializePasskeyKit();

    // Use PasskeyKit's correct API: createWallet(app, user)
    const walletResult = await kit.createWallet(appName, userName);


    // Store wallet info locally for future reference
    const walletInfo = {
      keyId: walletResult.keyIdBase64,
      contractId: walletResult.contractId,
      walletAddress: walletResult.contractId,
      createdAt: Date.now(),
      type: "passkey",
      appName: appName,
      userName: userName,
    };

    localStorage.setItem(
      `passkey_wallet_${walletResult.keyIdBase64}`,
      JSON.stringify(walletInfo)
    );
    localStorage.setItem("last_passkey_wallet", walletResult.keyIdBase64);


    return {
      success: true,
      walletAddress: walletResult.contractId,
      keyId: walletResult.keyIdBase64,
      contractId: walletResult.contractId,
      walletInfo: walletInfo,
      signedTx: walletResult.signedTx,
    };
  } catch (error) {
    console.error("❌ Passkey wallet creation failed:", error);
    console.error("Error details:", {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });

    // Handle specific WebAuthn errors
    if (error.name === "NotSupportedError") {
      throw new Error("Passkey not supported on this device");
    } else if (error.name === "NotAllowedError") {
      throw new Error("Biometric authentication was cancelled");
    } else if (error.name === "InvalidStateError") {
      throw new Error("A passkey already exists for this device");
    } else {
      throw new Error(`Wallet creation failed: ${error.message}`);
    }
  }
}

/**
 * Connect to an existing Passkey wallet
 * @param {string} keyId - Wallet key identifier
 * @returns {Promise<Object>} Connection result
 */
export async function connectPasskeyWallet(keyId) {
  try {

    const walletInfo = getStoredWalletInfo(keyId);
    if (!walletInfo) {
      throw new Error("Wallet not found in local storage");
    }

    const kit = await initializePasskeyKit();

    // Use PasskeyKit's connectWallet method with correct parameters
    const connection = await kit.connectWallet({
      keyId: keyId,
      getContractId: async (keyId) => {
        // Return the stored contract ID for this keyId
        const info = getStoredWalletInfo(keyId);
        return info?.contractId;
      },
    });


    return {
      success: true,
      walletAddress: connection.contractId || walletInfo.walletAddress,
      keyId: keyId,
      contractId: connection.contractId || walletInfo.contractId,
      walletInfo: walletInfo,
    };
  } catch (error) {
    console.error("❌ Passkey wallet connection failed:", error);
    throw new Error(`Connection failed: ${error.message}`);
  }
}

/**
 * Sign a transaction using PasskeyKit
 * @param {string} keyId - Wallet key identifier
 * @param {Object} transaction - Stellar transaction to sign
 * @returns {Promise<Object>} Signed transaction
 */
export async function signWithPasskey(keyId, transaction) {
  try {

    const walletInfo = getStoredWalletInfo(keyId);
    if (!walletInfo) {
      throw new Error("Wallet not found");
    }

    const kit = await initializePasskeyKit();

    // Use PasskeyKit's sign method
    const signedTransaction = await kit.sign({
      keyId: keyId,
      transaction: transaction,
    });


    return {
      success: true,
      signedTransaction: signedTransaction,
      walletAddress: walletInfo.walletAddress,
    };
  } catch (error) {
    console.error("❌ Passkey signing failed:", error);

    if (error.name === "NotAllowedError") {
      throw new Error("Biometric authentication was cancelled");
    } else {
      throw new Error(`Signing failed: ${error.message}`);
    }
  }
}

/**
 * Get wallet balance using PasskeyKit
 * @param {string} keyId - Wallet key identifier
 * @returns {Promise<Object>} Balance information
 */
export async function getPasskeyWalletBalance(keyId) {
  try {
    const walletInfo = getStoredWalletInfo(keyId);
    if (!walletInfo) {
      throw new Error("Wallet not found");
    }

    const kit = await initializePasskeyKit();

    // Get balance using PasskeyKit
    const balance = await kit.getBalance({
      keyId: keyId,
    });

    return {
      success: true,
      balance: balance,
      walletAddress: walletInfo.walletAddress,
    };
  } catch (error) {
    console.error("❌ Failed to get wallet balance:", error);
    throw new Error(`Balance check failed: ${error.message}`);
  }
}

/**
 * Get all stored Passkey wallets
 * @returns {Array} Array of wallet info objects
 */
export function getStoredPasskeyWallets() {
  try {
    const wallets = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("passkey_wallet_")) {
        const walletInfo = JSON.parse(localStorage.getItem(key));
        wallets.push(walletInfo);
      }
    }
    return wallets.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.error("❌ Failed to get stored wallets:", error);
    return [];
  }
}

/**
 * Get stored wallet info by keyId
 * @param {string} keyId - Wallet key identifier
 * @returns {Object|null} Wallet info or null if not found
 */
export function getStoredWalletInfo(keyId) {
  try {
    const stored = localStorage.getItem(`passkey_wallet_${keyId}`);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error("❌ Failed to get wallet info:", error);
    return null;
  }
}

/**
 * Get the last used Passkey wallet
 * @returns {Object|null} Last wallet info or null
 */
export function getLastPasskeyWallet() {
  try {
    const lastKeyId = localStorage.getItem("last_passkey_wallet");
    if (!lastKeyId) return null;

    return getStoredWalletInfo(lastKeyId);
  } catch (error) {
    console.error("❌ Failed to get last wallet:", error);
    return null;
  }
}

/**
 * Delete a Passkey wallet from local storage
 * @param {string} keyId - Wallet key identifier
 * @returns {boolean} Success status
 */
export function deletePasskeyWallet(keyId) {
  try {
    localStorage.removeItem(`passkey_wallet_${keyId}`);

    // Clear last wallet if it was this one
    const lastKeyId = localStorage.getItem("last_passkey_wallet");
    if (lastKeyId === keyId) {
      localStorage.removeItem("last_passkey_wallet");
    }

    return true;
  } catch (error) {
    console.error("❌ Failed to delete wallet:", error);
    return false;
  }
}

/**
 * Check if Passkey is supported on this device
 * @returns {Promise<Object>} Support status and details
 */
export async function checkPasskeySupport() {
  try {
    const isSupported = !!window.PublicKeyCredential;
    const isConditionalMediationSupported =
      isSupported &&
      (await PublicKeyCredential.isConditionalMediationAvailable?.());

    const deviceInfo = getDeviceInfo();

    return {
      isSupported,
      isConditionalMediationSupported,
      deviceInfo,
      message: isSupported
        ? "✅ Passkey is supported on this device"
        : "❌ Passkey is not supported on this device",
    };
  } catch (error) {
    console.error("❌ Error checking Passkey support:", error);
    return {
      isSupported: false,
      error: error.message,
      message: "❌ Could not determine Passkey support",
    };
  }
}

/**
 * Check Launchtube sponsorship availability
 * This would typically be done on the server side with PasskeyServer
 * @returns {Promise<Object>} Sponsorship status
 */
export async function checkLaunchtubeSponsorship() {
  try {
    // Note: In a real implementation, this would be done server-side
    // using PasskeyServer with proper JWT credentials

    return {
      available: true,
      message:
        "✅ Launchtube sponsorship available (server-side check required)",
      note: "This is a client-side placeholder. Real implementation requires server-side PasskeyServer.",
    };
  } catch (error) {
    console.error("❌ Launchtube sponsorship check failed:", error);
    return {
      available: false,
      error: error.message,
      message: "❌ Could not check Launchtube sponsorship",
    };
  }
}

/**
 * Format wallet address for display
 * @param {string} address - Full wallet address
 * @returns {string} Formatted address
 */
export function formatWalletAddress(address) {
  if (!address) return "Unknown";
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

/**
 * Get device information for Passkey support
 * @returns {Object} Device information
 */
export function getDeviceInfo() {
  const userAgent = navigator.userAgent;
  const platform = navigator.platform;

  return {
    userAgent,
    platform,
    isIOS: /iPad|iPhone|iPod/.test(userAgent),
    isAndroid: /Android/.test(userAgent),
    isMac: /Mac/.test(platform),
    isWindows: /Win/.test(platform),
    isLinux: /Linux/.test(platform),
    hasTouch: "ontouchstart" in window,
  };
}
