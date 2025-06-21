"use client";

import {
  Contract,
  Address,
  nativeToScVal,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  Transaction,
} from "@stellar/stellar-sdk";
import { Server } from "@stellar/stellar-sdk/rpc";
import { signTransaction } from "@stellar/freighter-api";

/* --- 1. Common RPC object ------------------------------------------ */
const server = new Server("https://soroban-testnet.stellar.org");

/* --- 2. Function to write score to contract --------------------------- */
export async function writeScore({ address, score }) {
  try {
    const contractId = process.env.NEXT_PUBLIC_RISKSCORE_CONTRACT_ID;

    if (!contractId) {
      throw new Error(
        "Contract ID is not defined. Check your .env.local file."
      );
    }

    if (!address) {
      throw new Error("Wallet address not found. Please connect your wallet.");
    }

    if (typeof score !== "number" || score < 0 || score > 100) {
      throw new Error("Invalid score value. Score must be between 0-100.");
    }

    const contract = new Contract(contractId);

    // Prepare address and score parameters in correct format
    const addrVal = Address.fromString(address).toScVal();
    const scoreVal = nativeToScVal(Math.round(score), { type: "u32" });

    // Get account information with auto-creation
    let account;
    try {
      account = await server.getAccount(address);
    } catch (accountError) {
      if (
        accountError.message?.includes("not found") ||
        accountError.response?.status === 404
      ) {
        console.log(
          `⚠️ Account not found, attempting to create testnet account: ${address}`
        );

        // Try to create the account using friendbot
        try {
          const friendbotResponse = await fetch(
            `https://friendbot.stellar.org?addr=${encodeURIComponent(address)}`
          );

          if (friendbotResponse.ok) {
            console.log(`✅ Account created successfully via friendbot`);

            // Wait a moment for account to be available
            await new Promise((resolve) => setTimeout(resolve, 3000));

            // Try to get account again
            account = await server.getAccount(address);
          } else {
            throw new Error(
              `Friendbot request failed: ${friendbotResponse.status}`
            );
          }
        } catch (friendbotError) {
          console.error(`❌ Failed to create testnet account:`, friendbotError);
          throw new Error(
            `Account not found and creation failed. Please manually fund your wallet at https://laboratory.stellar.org/#account-creator`
          );
        }
      } else {
        throw accountError;
      }
    }

    // Create transaction - use TESTNET

    const tx = new TransactionBuilder(account, {
      fee: (BASE_FEE * 100).toString(),
      networkPassphrase: Networks.TESTNET, // Explicitly specify TESTNET
    })
      .addOperation(contract.call("set_score", addrVal, scoreVal))
      .setTimeout(30)
      .build();

    // Sign with Freighter - simple format
    const signedXdr = await signTransaction(tx.toXDR(), {
      network: "TESTNET",
      networkPassphrase: Networks.TESTNET,
    });

    // Parse signed transaction - use Transaction constructor
    const signedTx = new Transaction(signedXdr, Networks.TESTNET);

    // Send to network
    const result = await server.sendTransaction(signedTx);

    if (result.status === "PENDING") {
      // Wait for transaction confirmation
      let attempts = 0;
      const maxAttempts = 10;

      while (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 1000));

        try {
          const txResult = await server.getTransaction(result.hash);
          if (txResult.status === "SUCCESS") {
            return result.hash;
          } else if (txResult.status === "FAILED") {
            throw new Error(`Transaction failed: ${txResult.resultXdr}`);
          }
        } catch (err) {
          if (err.response?.status !== 404) {
            throw err;
          }
        }

        attempts++;
      }

      throw new Error("Transaction confirmation timed out");
    } else if (result.status === "ERROR") {
      const errorDetails =
        result.extras?.result_codes || result.extras || "Unknown error";
      throw new Error(`Transaction error: ${JSON.stringify(errorDetails)}`);
    }

    return result.hash;
  } catch (error) {
    // More specific error messages
    if (
      error.message?.includes("User declined") ||
      error.message?.includes("user rejected")
    ) {
      throw new Error("Transaction was cancelled by user.");
    } else if (error.message?.includes("account not found")) {
      throw new Error(
        "Account not found. Make sure your wallet is active on Testnet."
      );
    } else if (
      error.message?.includes("insufficient balance") ||
      error.message?.includes("underfunded")
    ) {
      throw new Error("Insufficient balance. You need Testnet XLM.");
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
    } else if (error.message?.includes("switch is not a function")) {
      throw new Error(
        "Stellar SDK compatibility error. Please refresh the page."
      );
    } else if (error.message?.includes("Public Global Stellar Network")) {
      throw new Error(
        "Network mismatch: Freighter is set to Testnet but transaction was created for Mainnet. Please refresh the page."
      );
    } else if (error.response?.status === 400) {
      throw new Error(
        `Server error (400): ${JSON.stringify(
          error.response.data || error.response
        )}`
      );
    } else if (error.response?.status === 404) {
      throw new Error("Contract not found. Check your Contract ID.");
    } else if (error.response?.status >= 500) {
      throw new Error("Server error. Please try again later.");
    }

    // If no specific error is caught, throw the original error
    throw new Error(
      `Unexpected error: ${error.message || JSON.stringify(error)}`
    );
  }
}
