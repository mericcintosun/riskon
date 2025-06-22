/**
 * Type-Safe Risk Tier Contract Client
 * Generated using: stellar contract bindings typescript
 *
 * Usage:
 * stellar contract bindings typescript \
 *   --network testnet \
 *   --source-account GXXXXXXX... \
 *   --contract-id CXXXXXXX... \
 *   --output-dir ./src/lib/generated
 */

import { useState } from "react";
import { Address, nativeToScVal, scValToNative } from "@stellar/stellar-sdk";
import { passkeyWallet } from "./passkeyIntegration";

// Type definitions matching the Rust smart contract
export interface RiskTierData {
  score: number; // u32: 0-100 risk score
  tier: string; // Symbol: TIER_1, TIER_2, or TIER_3
  timestamp: bigint; // u64: Unix timestamp
  chosen_tier: string; // Symbol: User's chosen tier
}

export type TierLevel = "TIER_1" | "TIER_2" | "TIER_3";

// Contract configuration
export const RISK_TIER_CONTRACT_CONFIG = {
  contractId: process.env.NEXT_PUBLIC_RISK_TIER_CONTRACT_ID || "",
  network: "TESTNET",
  rpcUrl: "https://soroban-testnet.stellar.org",
};

/**
 * Type-Safe Risk Tier Contract Client
 * Following Soroban CLI TypeScript bindings pattern
 */
export class RiskTierContractClient {
  private contractId: string;
  private network: string;

  constructor(contractId?: string) {
    this.contractId = contractId || RISK_TIER_CONTRACT_CONFIG.contractId;
    this.network = RISK_TIER_CONTRACT_CONFIG.network;

    if (!this.contractId) {
      throw new Error("Risk tier contract ID not configured");
    }
  }

  /**
   * Set risk score with tier classification
   * Maps to: set_risk_tier(user, score, tier, chosen_tier)
   */
  async setRiskTier(
    userAddress: string,
    score: number,
    tier: TierLevel,
    chosenTier: TierLevel
  ): Promise<string> {
    try {
      // Validate inputs
      if (score < 0 || score > 100) {
        throw new Error("Score must be between 0 and 100");
      }

      if (!["TIER_1", "TIER_2", "TIER_3"].includes(tier)) {
        throw new Error("Invalid tier");
      }

      if (!["TIER_1", "TIER_2", "TIER_3"].includes(chosenTier)) {
        throw new Error("Invalid chosen tier");
      }

      // Create contract call transaction XDR
      // In production, this would use the generated contract bindings
      const transactionXDR = await this.buildContractCall("set_risk_tier", [
        nativeToScVal(Address.fromString(userAddress)),
        nativeToScVal(score, { type: "u32" }),
        nativeToScVal(tier, { type: "symbol" }),
        nativeToScVal(chosenTier, { type: "symbol" }),
      ]);

      // Sign and submit with Passkey + Launchtube
      const signature = await passkeyWallet.signTransaction(transactionXDR);
      const result = await passkeyWallet.submitTransactionWithSponsorship(
        transactionXDR,
        signature
      );

      return result.hash;
    } catch (error) {
      console.error("❌ Failed to set risk tier:", error);
      throw error;
    }
  }

  /**
   * Get complete risk and tier data for user
   * Maps to: get_risk_tier(user) -> Option<RiskTierData>
   */
  async getRiskTier(userAddress: string): Promise<RiskTierData | null> {
    try {
      // In production, use generated contract bindings
      const result = await this.simulateContractCall("get_risk_tier", [
        nativeToScVal(Address.fromString(userAddress)),
      ]);

      if (!result || result === null) {
        return null;
      }

      // Convert ScVal to native types
      const riskTierData: RiskTierData = {
        score: scValToNative(result.score),
        tier: scValToNative(result.tier),
        timestamp: BigInt(scValToNative(result.timestamp)),
        chosen_tier: scValToNative(result.chosen_tier),
      };

      return riskTierData;
    } catch (error) {
      console.error("❌ Failed to get risk tier:", error);
      return null;
    }
  }

  /**
   * Get only risk score (backward compatibility)
   * Maps to: get_score(user) -> u32
   */
  async getScore(userAddress: string): Promise<number> {
    try {
      const result = await this.simulateContractCall("get_score", [
        nativeToScVal(Address.fromString(userAddress)),
      ]);

      return result ? scValToNative(result) : 0;
    } catch (error) {
      console.error("❌ Failed to get score:", error);
      return 0;
    }
  }

  /**
   * Get user's chosen tier for operations
   * Maps to: get_chosen_tier(user) -> Symbol
   */
  async getChosenTier(userAddress: string): Promise<TierLevel> {
    try {
      const result = await this.simulateContractCall("get_chosen_tier", [
        nativeToScVal(Address.fromString(userAddress)),
      ]);

      return result ? scValToNative(result) : "TIER_3";
    } catch (error) {
      console.error("❌ Failed to get chosen tier:", error);
      return "TIER_3";
    }
  }

  /**
   * Update user's chosen tier with risk-based validation
   * Maps to: update_chosen_tier(user, new_chosen_tier)
   */
  async updateChosenTier(
    userAddress: string,
    newChosenTier: TierLevel
  ): Promise<string> {
    try {
      const transactionXDR = await this.buildContractCall(
        "update_chosen_tier",
        [
          nativeToScVal(Address.fromString(userAddress)),
          nativeToScVal(newChosenTier, { type: "symbol" }),
        ]
      );

      const signature = await passkeyWallet.signTransaction(transactionXDR);
      const result = await passkeyWallet.submitTransactionWithSponsorship(
        transactionXDR,
        signature
      );

      return result.hash;
    } catch (error) {
      console.error("❌ Failed to update chosen tier:", error);
      throw error;
    }
  }

  /**
   * Check if user can access specific tier
   * Maps to: can_access_tier(user, target_tier) -> bool
   */
  async canAccessTier(
    userAddress: string,
    targetTier: TierLevel
  ): Promise<boolean> {
    try {
      const result = await this.simulateContractCall("can_access_tier", [
        nativeToScVal(Address.fromString(userAddress)),
        nativeToScVal(targetTier, { type: "symbol" }),
      ]);

      return result ? scValToNative(result) : false;
    } catch (error) {
      console.error("❌ Failed to check tier access:", error);
      return false;
    }
  }

  /**
   * Get tier statistics
   * Maps to: get_tier_stats() -> Map<Symbol, u32>
   */
  async getTierStats(): Promise<Record<TierLevel, number>> {
    try {
      const result = await this.simulateContractCall("get_tier_stats", []);

      if (!result) {
        return { TIER_1: 0, TIER_2: 0, TIER_3: 0 };
      }

      const stats = scValToNative(result);
      return {
        TIER_1: stats.TIER_1 || 0,
        TIER_2: stats.TIER_2 || 0,
        TIER_3: stats.TIER_3 || 0,
      };
    } catch (error) {
      console.error("❌ Failed to get tier stats:", error);
      return { TIER_1: 0, TIER_2: 0, TIER_3: 0 };
    }
  }

  /**
   * Build contract call transaction XDR
   * This would be generated by Soroban CLI in production
   */
  private async buildContractCall(
    functionName: string,
    args: any[]
  ): Promise<string> {
    try {
      // Mock implementation - in production, use generated bindings

      // Return mock XDR for demo purposes
      const mockXDR = `mock_transaction_xdr_${functionName}_${Date.now()}`;

      return mockXDR;
    } catch (error) {
      console.error("❌ Failed to build contract call:", error);
      throw error;
    }
  }

  /**
   * Simulate contract call for read operations
   * This would use StellarSDK's Server.simulateTransaction in production
   */
  private async simulateContractCall(
    functionName: string,
    args: any[]
  ): Promise<any> {
    try {
      // Mock implementation - in production, use actual RPC simulation
      // Return mock data based on function name
      switch (functionName) {
        case "get_risk_tier":
          return {
            score: nativeToScVal(45, { type: "u32" }),
            tier: nativeToScVal("TIER_2", { type: "symbol" }),
            timestamp: nativeToScVal(BigInt(Date.now()), { type: "u64" }),
            chosen_tier: nativeToScVal("TIER_2", { type: "symbol" }),
          };
        case "get_score":
          return nativeToScVal(45, { type: "u32" });
        case "get_chosen_tier":
          return nativeToScVal("TIER_2", { type: "symbol" });
        case "can_access_tier":
          return nativeToScVal(true, { type: "bool" });
        case "get_tier_stats":
          return nativeToScVal({
            TIER_1: 10,
            TIER_2: 25,
            TIER_3: 5,
          });
        default:
          return null;
      }
    } catch (error) {
      console.error("❌ Failed to simulate contract call:", error);
      throw error;
    }
  }
}

// Export singleton instance
export const riskTierClient = new RiskTierContractClient();

/**
 * React hook for risk tier contract interactions
 */
export function useRiskTierContract() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setRiskTier = async (
    userAddress: string,
    score: number,
    tier: TierLevel,
    chosenTier: TierLevel
  ) => {
    try {
      setLoading(true);
      setError(null);

      const hash = await riskTierClient.setRiskTier(
        userAddress,
        score,
        tier,
        chosenTier
      );

      return hash;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getRiskTier = async (userAddress: string) => {
    try {
      setLoading(true);
      setError(null);

      return await riskTierClient.getRiskTier(userAddress);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const canAccessTier = async (userAddress: string, targetTier: TierLevel) => {
    try {
      return await riskTierClient.canAccessTier(userAddress, targetTier);
    } catch (err) {
      console.error("Failed to check tier access:", err);
      return false;
    }
  };

  const updateChosenTier = async (
    userAddress: string,
    newChosenTier: TierLevel
  ) => {
    try {
      setLoading(true);
      setError(null);

      const hash = await riskTierClient.updateChosenTier(
        userAddress,
        newChosenTier
      );

      return hash;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    setRiskTier,
    getRiskTier,
    canAccessTier,
    updateChosenTier,
    getTierStats: () => riskTierClient.getTierStats(),
  };
}

export default riskTierClient;
