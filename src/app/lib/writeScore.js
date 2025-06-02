"use client";

import * as StellarSdk from "@stellar/stellar-sdk";

const {
  Keypair,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  Transaction,
  Operation,
  Memo,
} = StellarSdk;

// Simple destination account (we'll save risk scores as memo)
const DESTINATION_ACCOUNT =
  "GDNE57HVQSG3JIGWNPEBZPJAD2F42FS3YL67RIEMJZ77JW5R75L3OE5B";

// Horizon API endpoints
const HORIZON_URL = "https://horizon-testnet.stellar.org";

// Fetch account information
async function loadAccount(accountId) {
  const response = await fetch(`${HORIZON_URL}/accounts/${accountId}`);
  if (!response.ok) {
    throw new Error(`Account not found: ${response.status}`);
  }
  const accountData = await response.json();

  // Convert account object to Stellar SDK format
  return {
    accountId: () => accountData.account_id,
    sequenceNumber: () => accountData.sequence,
    sequence: accountData.sequence,
    account_id: accountData.account_id,
    balances: accountData.balances,
  };
}

// Submit transaction
async function submitTransaction(transaction) {
  const response = await fetch(`${HORIZON_URL}/transactions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `tx=${encodeURIComponent(transaction.toXDR())}`,
  });

  const result = await response.json();

  if (response.ok) {
    return {
      successful: true,
      hash: result.hash,
      result: result,
    };
  } else {
    return {
      successful: false,
      result_xdr: result.extras?.result_xdr || "Unknown error",
      result: result,
    };
  }
}

// Helper function to check memo byte size
function getMemoByteSize(text) {
  return new TextEncoder().encode(text).length;
}

// Function to create safe memo
function createSafeMemo(scoreValue, address) {
  // Shortest format: "RS:85:ABC" (9-11 characters)
  let addressPrefix = address.slice(0, 3);
  let memo = `RS:${scoreValue}:${addressPrefix}`;

  // If still too long, shorten further
  if (getMemoByteSize(memo) > 28) {
    // Only score: "RS:85" (5-6 characters)
    memo = `RS:${scoreValue}`;
  }

  // Final check
  if (getMemoByteSize(memo) > 28) {
    // In this case we must use memo ID
    return null;
  }

  return memo;
}

export async function writeScoreToBlockchain({ kit, address, score }) {
  try {
    "🚀 Writing risk score to blockchain (with Memo):", { address, score };

    if (!kit) {
      throw new Error("Wallet kit not found");
    }

    if (!address) {
      throw new Error("Wallet address not found");
    }

    if (typeof score !== "number" || score < 0 || score > 100) {
      throw new Error("Invalid score value. Score must be between 0-100.");
    }

    const scoreValue = Math.round(score);

    "📋 Risk score parameters prepared:",
      {
        address,
        score: scoreValue,
      };

    // Get account information
    const accountData = await loadAccount(address);

    // Create Stellar SDK Account object
    const account = new StellarSdk.Account(
      accountData.account_id,
      accountData.sequence
    );

    // Save risk score as memo
    const safeMemo = createSafeMemo(scoreValue, address);
    let transaction;

    if (safeMemo === null) {
      console.warn("⚠️ Memo too long, using Memo ID");
      // Alternative: Use Memo ID (64-bit integer)
      // Create unique ID by combining score and timestamp
      const timestamp = Math.floor(Date.now() / 1000); // Unix timestamp (seconds)
      const memoId =
        BigInt(scoreValue) * 1000000n + BigInt(timestamp % 1000000); // Score + timestamp

      // Create simple payment transaction (0.0000001 XLM)
      transaction = new TransactionBuilder(account, {
        fee: BASE_FEE.toString(),
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(
          Operation.payment({
            destination: DESTINATION_ACCOUNT,
            asset: StellarSdk.Asset.native(), // XLM
            amount: "0.0000001", // Minimal amount
          })
        )
        .addMemo(Memo.id(memoId.toString()))
        .setTimeout(30)
        .build();
    } else {
 
      // Create simple payment transaction (0.0000001 XLM)
      transaction = new TransactionBuilder(account, {
        fee: BASE_FEE.toString(),
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(
          Operation.payment({
            destination: DESTINATION_ACCOUNT,
            asset: StellarSdk.Asset.native(), // XLM
            amount: "0.0000001", // Minimal amount
          })
        )
        .addMemo(Memo.text(safeMemo))
        .setTimeout(30)
        .build();
    }

    // Sign transaction with Stellar Wallets Kit
    const { signedTxXdr } = await kit.signTransaction(transaction.toXDR(), {
      address,
      networkPassphrase: Networks.TESTNET,
    });

    // Parse signed transaction
    const signedTransaction = new Transaction(signedTxXdr, Networks.TESTNET);

    // Send to blockchain
    const result = await submitTransaction(signedTransaction);

    if (result.successful) {
      return result.hash;
    } else {
      console.error("❌ Transaction failed:", result);
      throw new Error(
        `Transaction failed: ${result.result_xdr || "Unknown error"}`
      );
    }
  } catch (error) {
    console.error("❌ writeScoreToBlockchain detailed error:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
      response: error.response?.data || error.response,
      fullError: error,
    });

    // User-friendly error messages
    if (
      error.message?.includes("User declined") ||
      error.message?.includes("user rejected")
    ) {
      throw new Error("Transaction was cancelled by user.");
    } else if (
      error.message?.includes("Expects string, array or buffer, max 28 bytes")
    ) {
      throw new Error(
        "Memo too long. Please use a shorter memo or update the application."
      );
    } else if (
      error.message?.includes("account not found") ||
      error.message?.includes("Account not found")
    ) {
      throw new Error(
        "Account not found. Make sure your wallet is active on Testnet."
      );
    } else if (
      error.message?.includes("insufficient balance") ||
      error.message?.includes("underfunded")
    ) {
      throw new Error(
        "Insufficient balance. You need Testnet XLM: https://laboratory.stellar.org/#account-creator"
      );
    } else if (
      error.message?.includes("timeout") ||
      error.message?.includes("network")
    ) {
      throw new Error("Network connection error. Please try again.");
    } else if (
      error.message?.includes("invalid") &&
      error.message?.includes("parameter")
    ) {
      throw new Error(`Invalid parameters: ${error.message}`);
    } else if (error.response?.status === 400) {
      throw new Error(
        `Server error (400): ${JSON.stringify(
          error.response.data || error.response
        )}`
      );
    } else if (error.response?.status === 404) {
      throw new Error(
        "Account not found. Make sure your wallet is active on Testnet."
      );
    } else if (error.response?.status >= 500) {
      throw new Error("Server error. Please try again later.");
    }

    // If no specific error is caught, throw the original error
    throw new Error(
      `Blockchain error: ${error.message || JSON.stringify(error)}`
    );
  }
}
