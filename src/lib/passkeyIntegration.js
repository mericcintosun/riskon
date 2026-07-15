"use client";

/**
 * Passkey smart-wallet adapter.
 *
 * This module used to be a demo stub that FAKED everything:
 *   - submitTransactionDirectly() returned `demo_direct_hash_<timestamp>` and
 *     never touched the network, while the UI reported success;
 *   - extractPublicKey() returned crypto.getRandomValues() instead of the real
 *     WebAuthn public key, so the "wallet" could never be controlled by the
 *     passkey;
 *   - deploySmartWallet() fabricated a G... string that was not even valid
 *     strkey;
 *   - verifySmartWallet() always returned true.
 *
 * The real implementation already lived in ./passkeyWallet.js (it drives
 * PasskeyKit correctly) — it was just unconfigured, and the deploy transaction
 * it produced was never submitted. This file is now a thin adapter over that
 * module, so the consumers here run on the real thing.
 */

import { useState } from "react";

import {
  checkPasskeySupport,
  connectPasskeyWallet,
  createPasskeyWallet,
  getLastPasskeyWallet,
  signWithPasskey,
} from "./passkeyWallet";

class PasskeyWalletManager {
  constructor() {
    this.isConnected = false;
    this.smartWalletAddress = null;
    this.keyId = null;
  }

  async initialize() {
    const support = await checkPasskeySupport();
    if (support && support.supported === false) {
      throw new Error(
        support.reason || "Passkeys are not supported on this device"
      );
    }
    return true;
  }

  /** Register a passkey, deploy the smart wallet on-chain, and connect to it. */
  async createPasskeyWallet(appName = "Riskon", userName) {
    const result = await createPasskeyWallet(
      appName,
      userName || `riskon-${Date.now()}`
    );

    this.keyId = result.keyId;
    this.smartWalletAddress = result.contractId;
    this.isConnected = true;

    return {
      smartWalletAddress: result.contractId,
      keyId: result.keyId,
      deployHash: result.deployHash,
    };
  }

  /**
   * Reconnect a wallet already created on this device.
   * connectWallet verifies on-chain that the passkey really is a signer.
   */
  async connectPasskeyWallet(keyId) {
    const targetKeyId = keyId || getLastPasskeyWallet();
    if (!targetKeyId) {
      throw new Error("No stored passkey wallet found on this device");
    }

    const result = await connectPasskeyWallet(targetKeyId);

    this.keyId = result.keyId;
    this.smartWalletAddress = result.contractId;
    this.isConnected = true;

    return {
      smartWalletAddress: result.contractId,
      keyId: result.keyId,
    };
  }

  /**
   * Sign an assembled Soroban transaction's wallet auth entries with the
   * passkey. Returns the signed transaction — not a fabricated signature blob.
   */
  async signTransaction(transaction) {
    if (!this.isConnected || !this.keyId) {
      throw new Error("Passkey wallet not connected");
    }
    const result = await signWithPasskey(this.keyId, transaction);
    return result.signedTransaction;
  }

  disconnect() {
    this.isConnected = false;
    this.smartWalletAddress = null;
    this.keyId = null;
  }

  getWalletInfo() {
    return {
      isConnected: this.isConnected,
      smartWalletAddress: this.smartWalletAddress,
      keyId: this.keyId,
      type: "passkey",
    };
  }
}

export const passkeyWallet = new PasskeyWalletManager();

/**
 * React hook for the passkey smart wallet.
 */
export function usePasskeyWallet() {
  const [walletState, setWalletState] = useState({
    isConnected: false,
    smartWalletAddress: null,
    isLoading: false,
    error: null,
  });

  const connect = async () => {
    try {
      setWalletState((prev) => ({ ...prev, isLoading: true, error: null }));
      await passkeyWallet.initialize();

      // Prefer reconnecting an existing wallet; only register a new passkey when
      // this device has none.
      let result;
      try {
        result = await passkeyWallet.connectPasskeyWallet();
      } catch {
        result = await passkeyWallet.createPasskeyWallet();
      }

      setWalletState({
        isConnected: true,
        smartWalletAddress: result.smartWalletAddress,
        isLoading: false,
        error: null,
      });

      return result;
    } catch (error) {
      setWalletState((prev) => ({
        ...prev,
        isLoading: false,
        error: error.message,
      }));
      throw error;
    }
  };

  const disconnect = () => {
    passkeyWallet.disconnect();
    setWalletState({
      isConnected: false,
      smartWalletAddress: null,
      isLoading: false,
      error: null,
    });
  };

  return { ...walletState, connect, disconnect };
}

export default passkeyWallet;
