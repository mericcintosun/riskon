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
    console.log("writeScore starting:", { address, score });
    
    const contractId = process.env.NEXT_PUBLIC_RISKSCORE_CONTRACT_ID;
    
    if (!contractId) {
      throw new Error("Contract ID is not defined. Check your .env.local file.");
    }
    
    if (!address) {
      throw new Error("Wallet address not found. Please connect your wallet.");
    }
    
    if (typeof score !== 'number' || score < 0 || score > 100) {
      throw new Error("Invalid score value. Score must be between 0-100.");
    }

    console.log("Contract ID:", contractId);
    console.log("Network:", Networks.TESTNET);
    
    const contract = new Contract(contractId);
    
    // Prepare address and score parameters in correct format
    const addrVal = Address.fromString(address).toScVal();
    const scoreVal = nativeToScVal(Math.round(score), { type: "u32" });
    
    console.log("Parameters prepared:", { 
      address, 
      score: Math.round(score),
      contractId,
      network: Networks.TESTNET
    });
    
    // Get account information
    console.log("Fetching account information...");
    const account = await server.getAccount(address);
    console.log("Account information retrieved:", {
      accountId: account.accountId(),
      sequence: account.sequenceNumber()
    });
    
    // Create transaction - use TESTNET
    console.log("Creating transaction...");
    const tx = new TransactionBuilder(account, {
      fee: (BASE_FEE * 100).toString(),
      networkPassphrase: Networks.TESTNET, // Explicitly specify TESTNET
    })
      .addOperation(contract.call("set_score", addrVal, scoreVal))
      .setTimeout(30)
      .build();
    
    console.log("Transaction created:", {
      networkPassphrase: tx.networkPassphrase,
      fee: tx.fee,
      operations: tx.operations.length
    });
    
    console.log("Signing transaction...");
    
    // Sign with Freighter - simple format
    const signedXdr = await signTransaction(tx.toXDR(), {
      network: "TESTNET",
      networkPassphrase: Networks.TESTNET,
    });
    
    console.log("Transaction signed, sending...");
    
    // Parse signed transaction - use Transaction constructor
    const signedTx = new Transaction(signedXdr, Networks.TESTNET);
    
    // Send to network
    const result = await server.sendTransaction(signedTx);
    console.log("Transaction sent:", result);
    
    if (result.status === "PENDING") {
      // Wait for transaction confirmation
      let attempts = 0;
      const maxAttempts = 10;
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        try {
          const txResult = await server.getTransaction(result.hash);
          if (txResult.status === "SUCCESS") {
            console.log("Transaction successful:", txResult);
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
      const errorDetails = result.extras?.result_codes || result.extras || 'Unknown error';
      throw new Error(`Transaction error: ${JSON.stringify(errorDetails)}`);
    }
    
    return result.hash;
    
  } catch (error) {
    console.error("writeScore error - Detailed:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
      response: error.response?.data || error.response,
      fullError: error
    });
    
    // More specific error messages
    if (error.message?.includes("User declined") || error.message?.includes("user rejected")) {
      throw new Error("Transaction was cancelled by user.");
    } else if (error.message?.includes("account not found")) {
      throw new Error("Account not found. Make sure your wallet is active on Testnet.");
    } else if (error.message?.includes("insufficient balance") || error.message?.includes("underfunded")) {
      throw new Error("Insufficient balance. You need Testnet XLM.");
    } else if (error.message?.includes("timeout") || error.message?.includes("network")) {
      throw new Error("Network connection error. Please try again.");
    } else if (error.message?.includes("invalid") && error.message?.includes("parameter")) {
      throw new Error(`Invalid parameters: ${error.message}`);
    } else if (error.message?.includes("switch is not a function")) {
      throw new Error("Stellar SDK compatibility error. Please refresh the page.");
    } else if (error.message?.includes("Public Global Stellar Network")) {
      throw new Error("Network mismatch: Freighter is set to Testnet but transaction was created for Mainnet. Please refresh the page.");
    } else if (error.response?.status === 400) {
      throw new Error(`Server error (400): ${JSON.stringify(error.response.data || error.response)}`);
    } else if (error.response?.status === 404) {
      throw new Error("Contract not found. Check your Contract ID.");
    } else if (error.response?.status >= 500) {
      throw new Error("Server error. Please try again later.");
    }
    
    // If no specific error is caught, throw the original error
    throw new Error(`Unexpected error: ${error.message || JSON.stringify(error)}`);
  }
}
