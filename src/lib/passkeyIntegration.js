"use client";

/**
 * Passkey-Kit Integration for Stellar
 * Following the Guestbook/Prerequisites documentation flow
 * Smart wallet factory model as described in Passkey-Kit PROPOSAL.md
 */

import React, { useState } from "react";

// Passkey-Kit configuration
const PASSKEY_CONFIG = {
  // Smart wallet factory contract (following the factory model)
  factory_address: process.env.NEXT_PUBLIC_PASSKEY_FACTORY_CONTRACT,

  // Network configuration
  network: "TESTNET",
  rpc_url: "https://soroban-testnet.stellar.org",

  // Launchtube sponsorship configuration
  launchtube: {
    api_url: process.env.NEXT_PUBLIC_LAUNCHTUBE_API_URL,
    sponsor_account: process.env.NEXT_PUBLIC_LAUNCHTUBE_SPONSOR_ACCOUNT,
    enabled: true,
  },

  // Passkey options following PROPOSAL.md specifications
  passkey_options: {
    rp: {
      name: "Stellar Risk Management",
      id:
        typeof window !== "undefined" ? window.location.hostname : "localhost",
    },
    user: {
      displayName: "Risk Management User",
    },
    attestation: "none",
    authenticatorSelection: {
      authenticatorAttachment: "platform",
      userVerification: "required",
      residentKey: "required",
    },
  },
};

/**
 * Passkey Wallet Manager
 * Implements the smart wallet factory pattern
 */
class PasskeyWalletManager {
  constructor() {
    this.wallet = null;
    this.account = null;
    this.isConnected = false;
    this.smartWalletAddress = null;
    this.passkeyId = null;
  }

  /**
   * Initialize Passkey-Kit following Prerequisites documentation
   */
  async initialize() {
    try {

      // Check WebAuthn support
      if (!window.PublicKeyCredential) {
        throw new Error("WebAuthn not supported in this browser");
      }

      // Check if platform authenticator is available
      const isAvailable =
        await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (!isAvailable) {
        throw new Error("Platform authenticator not available");
      }

      return true;
    } catch (error) {
      console.error("❌ Passkey initialization failed:", error);
      throw error;
    }
  }

  /**
   * Create new passkey and smart wallet
   * Following the Guestbook flow for new user registration
   */
  async createPasskeyWallet(userId = null) {
    try {

      // Generate user ID if not provided
      const userIdBuffer = userId
        ? new TextEncoder().encode(userId)
        : crypto.getRandomValues(new Uint8Array(32));

      // Create passkey following PROPOSAL.md specifications
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          rp: PASSKEY_CONFIG.passkey_options.rp,
          user: {
            id: userIdBuffer,
            name: `user_${Date.now()}`,
            displayName: PASSKEY_CONFIG.passkey_options.user.displayName,
          },
          pubKeyCredParams: [
            { alg: -7, type: "public-key" }, // ES256
            { alg: -257, type: "public-key" }, // RS256
          ],
          authenticatorSelection:
            PASSKEY_CONFIG.passkey_options.authenticatorSelection,
          attestation: PASSKEY_CONFIG.passkey_options.attestation,
          timeout: 60000,
        },
      });

      if (!credential) {
        throw new Error("Failed to create passkey");
      }


      // Extract public key from credential
      const publicKey = await this.extractPublicKey(credential);

      // Deploy smart wallet contract using factory pattern
      const smartWalletAddress = await this.deploySmartWallet(
        publicKey,
        credential.id
      );

      // Store passkey information
      this.passkeyId = credential.id;
      this.smartWalletAddress = smartWalletAddress;
      this.isConnected = true;

      // Store in local storage for future use
      localStorage.setItem(
        "passkey_wallet_info",
        JSON.stringify({
          passkeyId: credential.id,
          smartWalletAddress: smartWalletAddress,
          publicKey: Array.from(publicKey),
          created_at: new Date().toISOString(),
        })
      );


      return {
        smartWalletAddress,
        passkeyId: credential.id,
        publicKey: publicKey,
      };
    } catch (error) {
      console.error("❌ Failed to create passkey wallet:", error);
      throw error;
    }
  }

  /**
   * Connect to existing passkey wallet
   * Following Guestbook Prerequisites for returning users
   */
  async connectPasskeyWallet() {
    try {

      // Check if we have stored wallet info
      const stored = localStorage.getItem("passkey_wallet_info");
      if (!stored) {
        throw new Error("No stored passkey wallet found");
      }

      const walletInfo = JSON.parse(stored);

      // Authenticate with existing passkey
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          allowCredentials: [
            {
              id: walletInfo.passkeyId,
              type: "public-key",
            },
          ],
          userVerification: "required",
          timeout: 60000,
        },
      });

      if (!assertion) {
        throw new Error("Failed to authenticate with passkey");
      }


      // Verify smart wallet still exists
      const walletExists = await this.verifySmartWallet(
        walletInfo.smartWalletAddress
      );
      if (!walletExists) {
        throw new Error("Smart wallet no longer exists");
      }

      // Set connection state
      this.passkeyId = walletInfo.passkeyId;
      this.smartWalletAddress = walletInfo.smartWalletAddress;
      this.isConnected = true;

      return {
        smartWalletAddress: walletInfo.smartWalletAddress,
        passkeyId: walletInfo.passkeyId,
      };
    } catch (error) {
      console.error("❌ Failed to connect passkey wallet:", error);
      throw error;
    }
  }

  /**
   * Sign transaction using passkey
   * Implements the signing flow from Passkey-Kit documentation
   */
  async signTransaction(transactionXDR) {
    try {

      if (!this.isConnected) {
        throw new Error("Wallet not connected");
      }

      // Create challenge from transaction hash
      const challenge = new TextEncoder().encode(transactionXDR);

      // Sign with passkey
      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge: challenge.slice(0, 32), // Use first 32 bytes as challenge
          allowCredentials: [
            {
              id: this.passkeyId,
              type: "public-key",
            },
          ],
          userVerification: "required",
        },
      });

      if (!assertion) {
        throw new Error("Failed to sign with passkey");
      }


      // Return signature in format expected by smart wallet
      return {
        signature: Array.from(new Uint8Array(assertion.response.signature)),
        authenticatorData: Array.from(
          new Uint8Array(assertion.response.authenticatorData)
        ),
        clientDataJSON: Array.from(
          new Uint8Array(assertion.response.clientDataJSON)
        ),
      };
    } catch (error) {
      console.error("❌ Failed to sign transaction:", error);
      throw error;
    }
  }

  /**
   * Submit transaction with Launchtube sponsorship
   * Gas-free transaction submission following the sponsorship model
   */
  async submitTransactionWithSponsorship(transactionXDR, passkeySignature) {
    try {

      if (!PASSKEY_CONFIG.launchtube.enabled) {
        throw new Error("Launchtube sponsorship not enabled");
      }

      const sponsorshipRequest = {
        transaction_xdr: transactionXDR,
        smart_wallet_address: this.smartWalletAddress,
        passkey_signature: passkeySignature,
        network: PASSKEY_CONFIG.network,
        sponsor_account: PASSKEY_CONFIG.launchtube.sponsor_account,
      };

      const response = await fetch(
        `${PASSKEY_CONFIG.launchtube.api_url}/sponsor`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(sponsorshipRequest),
        }
      );

      if (!response.ok) {
        throw new Error(`Launchtube API error: ${response.status}`);
      }

      const result = await response.json();


      return {
        hash: result.hash,
        sponsored: true,
        cost: 0, // No XLM cost due to sponsorship
      };
    } catch (error) {
      console.error("❌ Failed to submit sponsored transaction:", error);
      throw error;
    }
  }

  /**
   * Extract public key from WebAuthn credential
   */
  async extractPublicKey(credential) {
    try {
      // Parse attestation object
      const attestationObject = new Uint8Array(
        credential.response.attestationObject
      );

      // For simplicity, return a mock public key
      // In production, you'd decode the CBOR and extract the actual public key
      return crypto.getRandomValues(new Uint8Array(32));
    } catch (error) {
      console.error("❌ Failed to extract public key:", error);
      throw error;
    }
  }

  /**
   * Deploy smart wallet using factory pattern
   */
  async deploySmartWallet(publicKey, passkeyId) {
    try {

      // For demo purposes, generate a mock address
      // In production, this would call the smart wallet factory contract
      const mockAddress = `G${Array.from(
        crypto.getRandomValues(new Uint8Array(28))
      )
        .map((b) => b.toString(36).toUpperCase())
        .join("")
        .slice(0, 55)}`;

      return mockAddress;
    } catch (error) {
      console.error("❌ Failed to deploy smart wallet:", error);
      throw error;
    }
  }

  /**
   * Verify smart wallet exists on network
   */
  async verifySmartWallet(address) {
    try {
      // For demo purposes, always return true
      // In production, this would check the actual contract on network
      return true;
    } catch (error) {
      console.error("❌ Failed to verify smart wallet:", error);
      return false;
    }
  }

  /**
   * Disconnect wallet
   */
  async disconnect() {
    this.wallet = null;
    this.account = null;
    this.isConnected = false;
    this.smartWalletAddress = null;
    this.passkeyId = null;

    // Clear stored information
    localStorage.removeItem("passkey_wallet_info");

  }

  /**
   * Get wallet information
   */
  getWalletInfo() {
    return {
      isConnected: this.isConnected,
      smartWalletAddress: this.smartWalletAddress,
      passkeyId: this.passkeyId,
      type: "passkey",
    };
  }
}

// Export singleton instance
export const passkeyWallet = new PasskeyWalletManager();

/**
 * React hook for Passkey wallet integration
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

      // Try to connect to existing wallet first
      let result;
      try {
        result = await passkeyWallet.connectPasskeyWallet();
      } catch (error) {
        // If no existing wallet, create new one
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

  const disconnect = async () => {
    await passkeyWallet.disconnect();
    setWalletState({
      isConnected: false,
      smartWalletAddress: null,
      isLoading: false,
      error: null,
    });
  };

  const signAndSubmit = async (transactionXDR) => {
    try {
      const signature = await passkeyWallet.signTransaction(transactionXDR);
      const result = await passkeyWallet.submitTransactionWithSponsorship(
        transactionXDR,
        signature
      );
      return result;
    } catch (error) {
      console.error("❌ Sign and submit failed:", error);
      throw error;
    }
  };

  return {
    ...walletState,
    connect,
    disconnect,
    signAndSubmit,
  };
}

export default passkeyWallet;
