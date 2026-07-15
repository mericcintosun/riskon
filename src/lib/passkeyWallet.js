"use client";

/**
 * Passkey-Kit Smart Wallet Integration
 * WebAuthn-based wallet creation and management with Launchtube sponsorship
 * Following official Passkey-Kit documentation patterns
 */

import { PasskeyKit } from "passkey-kit";
import { csrfFetch } from "./csrfFetch";
import {
  getSafeLocalStorageItem,
  removeSafeLocalStorageItem,
  setSafeLocalStorageItem,
} from "./secureStorage";
import {
  sanitizeString,
  validateContractId,
  validateStellarAddress,
} from "./validation";

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
      keyId: sanitizeString(walletResult.keyIdBase64 || ""),
      contractId: sanitizeString(walletResult.contractId || ""),
      walletAddress: sanitizeString(walletResult.contractId || ""),
      createdAt: Date.now(),
      type: "passkey",
      appName: sanitizeString(appName || ""),
      userName: sanitizeString(userName || ""),
    };

    setSafeLocalStorageItem(
      `passkey_wallet_${walletResult.keyIdBase64}`,
      JSON.stringify(walletInfo)
    );
    setSafeLocalStorageItem("last_passkey_wallet", walletResult.keyIdBase64);

    // createWallet only BUILDS the deploy transaction — it does not submit it.
    // Without this step the contract is never deployed and `contractId` is just
    // a derived address pointing at nothing. Submit it server-side (the tx is
    // already signed by passkey-kit's canonical fee-paying deployer).
    const deployRes = await csrfFetch("/api/passkey/deploy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        signedTx: walletResult.signedTx,
        contractId: walletResult.contractId,
      }),
    });

    const deployPayload = await deployRes.json();
    if (!deployRes.ok || !deployPayload.success) {
      throw new Error(
        deployPayload?.error || "Smart wallet deployment failed on-chain"
      );
    }

    return {
      success: true,
      walletAddress: sanitizeString(walletResult.contractId || ""),
      keyId: sanitizeString(walletResult.keyIdBase64 || ""),
      contractId: sanitizeString(walletResult.contractId || ""),
      walletInfo: walletInfo,
      signedTx: walletResult.signedTx,
      deployHash: deployPayload.data?.hash,
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

    const sanitizedKeyId = sanitizeString(keyId || "");
    if (!sanitizedKeyId) {
      throw new Error("Invalid key ID");
    }

    const walletInfo = getStoredWalletInfo(sanitizedKeyId);
    if (!walletInfo) {
      throw new Error("Wallet not found in local storage");
    }

    const contractValidation = validateContractId(walletInfo.contractId || "");
    if (!contractValidation.isValid) {
      throw new Error(contractValidation.error || "Invalid contract ID");
    }

    const kit = await initializePasskeyKit();

    // Use PasskeyKit's connectWallet method with correct parameters
    const connection = await kit.connectWallet({
      keyId: sanitizedKeyId,
      getContractId: async (keyId) => {
        // Return the stored contract ID for this keyId
        const info = getStoredWalletInfo(keyId);
        return info?.contractId;
      },
    });


    return {
      success: true,
      walletAddress: sanitizeString(
        connection.contractId || walletInfo.walletAddress || ""
      ),
      keyId: sanitizedKeyId,
      contractId: sanitizeString(connection.contractId || walletInfo.contractId || ""),
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

    const sanitizedKeyId = sanitizeString(keyId || "");
    if (!sanitizedKeyId) {
      throw new Error("Invalid key ID");
    }

    const walletInfo = getStoredWalletInfo(sanitizedKeyId);
    if (!walletInfo) {
      throw new Error("Wallet not found");
    }

    const kit = await initializePasskeyKit();

    // sign() operates on the *connected* wallet, so make sure this keyId is the
    // connected one before signing.
    if (kit.keyId !== sanitizedKeyId) {
      await kit.connectWallet({
        keyId: sanitizedKeyId,
        getContractId: async (id) => getStoredWalletInfo(id)?.contractId,
      });
    }

    // passkey-kit v0.14: sign(txn, signer?, options?) — the signer defaults to a
    // PasskeySigner for the connected passkey. The old
    // `sign({ keyId, transaction })` object form was removed.
    const signedTransaction = await kit.sign(transaction);

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
        const rawWalletInfo = getSafeLocalStorageItem(key);
        if (!rawWalletInfo) {
          continue;
        }

        const walletInfo = JSON.parse(rawWalletInfo);
        const validatedAddress = validateStellarAddress(
          walletInfo.walletAddress || ""
        );

        if (validatedAddress.isValid) {
          wallets.push({
            ...walletInfo,
            walletAddress: validatedAddress.sanitized,
            contractId: sanitizeString(walletInfo.contractId || ""),
            keyId: sanitizeString(walletInfo.keyId || ""),
          });
        }
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
    const sanitizedKeyId = sanitizeString(keyId || "");
    const stored = getSafeLocalStorageItem(`passkey_wallet_${sanitizedKeyId}`);
    if (!stored) {
      return null;
    }

    const walletInfo = JSON.parse(stored);
    const validatedAddress = validateStellarAddress(walletInfo.walletAddress || "");
    const validatedContract = validateContractId(walletInfo.contractId || "");

    if (!validatedAddress.isValid || !validatedContract.isValid) {
      return null;
    }

    return {
      ...walletInfo,
      walletAddress: validatedAddress.sanitized,
      contractId: validatedContract.sanitized,
      keyId: sanitizeString(walletInfo.keyId || ""),
    };
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
    const lastKeyId = getSafeLocalStorageItem("last_passkey_wallet");
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
    const sanitizedKeyId = sanitizeString(keyId || "");
    removeSafeLocalStorageItem(`passkey_wallet_${sanitizedKeyId}`);

    // Clear last wallet if it was this one
    const lastKeyId = getSafeLocalStorageItem("last_passkey_wallet");
    if (lastKeyId === sanitizedKeyId) {
      removeSafeLocalStorageItem("last_passkey_wallet");
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
