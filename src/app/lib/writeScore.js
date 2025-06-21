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

// Helper function to create account on testnet using friendbot
async function createTestnetAccount(accountId) {
  try {
    console.log(`🔧 Creating testnet account for: ${accountId}`);

    // Use Stellar testnet friendbot to fund the account
    const friendbotResponse = await fetch(
      `https://friendbot.stellar.org?addr=${encodeURIComponent(accountId)}`
    );

    if (!friendbotResponse.ok) {
      throw new Error(`Friendbot request failed: ${friendbotResponse.status}`);
    }

    const friendbotResult = await friendbotResponse.json();
    console.log(`✅ Account created successfully:`, friendbotResult);

    // Wait a moment for account to be available
    await new Promise((resolve) => setTimeout(resolve, 2000));

    return true;
  } catch (error) {
    console.error(`❌ Failed to create testnet account:`, error);
    throw new Error(`Failed to create testnet account: ${error.message}`);
  }
}

// Fetch account information with auto-creation for testnet
async function loadAccount(accountId) {
  try {
    const response = await fetch(`${HORIZON_URL}/accounts/${accountId}`);

    if (!response.ok) {
      if (response.status === 404) {
        console.log(
          `⚠️ Account not found, attempting to create testnet account: ${accountId}`
        );

        // Try to create the account using friendbot
        await createTestnetAccount(accountId);

        // Try to fetch the account again after creation
        const retryResponse = await fetch(
          `${HORIZON_URL}/accounts/${accountId}`
        );

        if (!retryResponse.ok) {
          throw new Error(
            `Account still not found after creation attempt: ${retryResponse.status}`
          );
        }

        const accountData = await retryResponse.json();
        return {
          accountId: () => accountData.account_id,
          sequenceNumber: () => accountData.sequence,
          sequence: accountData.sequence,
          account_id: accountData.account_id,
          balances: accountData.balances,
        };
      } else {
        throw new Error(`Account lookup failed: ${response.status}`);
      }
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
  } catch (error) {
    console.error(`❌ loadAccount error for ${accountId}:`, error);
    throw error;
  }
}

// Submit transaction
async function submitTransaction(transaction) {
  try {
    console.log("🔗 Submitting transaction to Stellar network...");
    console.log("📋 Transaction XDR:", transaction.toXDR());

    const response = await fetch(`${HORIZON_URL}/transactions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `tx=${encodeURIComponent(transaction.toXDR())}`,
    });

    const result = await response.json();
    console.log("📡 Transaction response:", result);

    if (response.ok) {
      console.log("✅ Transaction submitted successfully:", result.hash);
      return {
        successful: true,
        hash: result.hash,
        result: result,
      };
    } else {
      console.error("❌ Transaction submission failed:", result);

      // Decode error details
      let errorMessage = "Transaction failed";
      let errorDetails = "";

      if (result.extras?.result_codes) {
        const codes = result.extras.result_codes;
        errorMessage = `Transaction failed: ${codes.transaction || "UNKNOWN"}`;

        if (codes.operations && codes.operations.length > 0) {
          errorDetails = ` - Operation errors: ${codes.operations.join(", ")}`;
        }

        // Common Stellar transaction errors with user-friendly explanations
        if (codes.transaction === "tx_insufficient_balance") {
          errorMessage = "Insufficient balance to pay transaction fee";
        } else if (codes.transaction === "tx_bad_seq") {
          errorMessage = "Transaction sequence number is incorrect";
        } else if (
          codes.transaction === "tx_too_early" ||
          codes.transaction === "tx_too_late"
        ) {
          errorMessage = "Transaction timestamp is invalid";
        } else if (codes.operations?.includes("op_underfunded")) {
          errorMessage = "Insufficient funds for this operation";
        } else if (codes.operations?.includes("op_no_destination")) {
          errorMessage = "Destination account does not exist";
        } else if (codes.operations?.includes("op_not_authorized")) {
          errorMessage = "Operation not authorized";
        } else if (codes.operations?.includes("op_line_full")) {
          errorMessage =
            "Destination account cannot receive more of this asset";
        }
      }

      // Try to decode result XDR if available
      if (result.extras?.result_xdr) {
        try {
          const xdrResult = StellarSdk.xdr.TransactionResult.fromXDR(
            result.extras.result_xdr,
            "base64"
          );
          console.log("🔍 Decoded XDR result:", xdrResult);

          // Additional XDR decoding could be added here for more specific errors
        } catch (xdrError) {
          console.warn("⚠️ Could not decode XDR result:", xdrError);
        }
      }

      return {
        successful: false,
        result_xdr: result.extras?.result_xdr || "Unknown error",
        result: result,
        error_message: errorMessage + errorDetails,
        status_code: response.status,
      };
    }
  } catch (networkError) {
    console.error(
      "❌ Network error during transaction submission:",
      networkError
    );
    return {
      successful: false,
      result_xdr: "Network error",
      result: { error: networkError.message },
      error_message: `Network error: ${networkError.message}`,
      status_code: 0,
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
    console.log("🚀 Writing risk score to blockchain (with Memo):", {
      address,
      score,
    });

    if (!kit) {
      throw new Error("Wallet kit not found");
    }

    if (!address) {
      throw new Error("Wallet address not found");
    }

    // Debug wallet address
    console.log("🔍 Debug info:", {
      addressType: typeof address,
      addressLength: address?.length,
      addressValue: address,
      isValidStellarAddress: address?.length === 56 && address?.startsWith("G"),
      destinationAccount: DESTINATION_ACCOUNT,
    });

    // Check if destination account exists
    try {
      console.log("🔍 Checking destination account:", DESTINATION_ACCOUNT);
      const destResponse = await fetch(
        `${HORIZON_URL}/accounts/${DESTINATION_ACCOUNT}`
      );
      if (!destResponse.ok) {
        console.warn("⚠️ Destination account not found, creating it...");
        await createTestnetAccount(DESTINATION_ACCOUNT);
      } else {
        console.log("✅ Destination account exists");
      }
    } catch (destError) {
      console.warn("⚠️ Could not verify destination account:", destError);
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
    console.log("📊 Account data loaded:", {
      accountId: accountData.account_id,
      sequence: accountData.sequence,
      balances: accountData.balances?.map((b) => ({
        asset: b.asset_type === "native" ? "XLM" : b.asset_code,
        balance: b.balance,
      })),
    });

    // Create Stellar SDK Account object
    const account = new StellarSdk.Account(
      accountData.account_id,
      accountData.sequence
    );
    console.log(
      "💳 Account object created with sequence:",
      account.sequenceNumber()
    );

    // Save risk score as memo
    const safeMemo = createSafeMemo(scoreValue, address);
    console.log("📝 Memo created:", safeMemo);
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

    console.log("⚙️ Transaction built successfully");
    console.log("📋 Transaction details:", {
      source: transaction.source,
      fee: transaction.fee,
      memo: transaction.memo,
      operations: transaction.operations.length,
      networkPassphrase: Networks.TESTNET,
    });

    // Sign transaction with Stellar Wallets Kit
    console.log("✍️ Signing transaction with wallet kit...");
    const { signedTxXdr } = await kit.signTransaction(transaction.toXDR(), {
      address,
      networkPassphrase: Networks.TESTNET,
    });
    console.log("✅ Transaction signed successfully");

    // Parse signed transaction
    const signedTransaction = new Transaction(signedTxXdr, Networks.TESTNET);
    console.log("📄 Signed transaction created, ready for submission");

    // Send to blockchain
    const result = await submitTransaction(signedTransaction);

    if (result.successful) {
      console.log("🎉 Transaction successful! Hash:", result.hash);
      return result.hash;
    } else {
      console.error("❌ Transaction failed:", result);

      // Use the enhanced error message if available
      const errorMsg =
        result.error_message ||
        `Transaction failed: ${result.result_xdr || "Unknown error"}`;
      console.error("💥 Enhanced error details:", {
        message: errorMsg,
        statusCode: result.status_code,
        resultXdr: result.result_xdr,
        fullResult: result.result,
      });

      throw new Error(errorMsg);
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
      error.message?.includes("Account not found") ||
      error.message?.includes("Account still not found")
    ) {
      throw new Error(
        "Account creation failed. Please manually fund your wallet at https://laboratory.stellar.org/#account-creator or check your testnet connection."
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
