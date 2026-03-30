/**
 * Type-Safe Risk Tier Contract Client
 *
 * Real Soroban RPC integration replacing previous mock/placeholder methods.
 *
 * Closes #16 — Smart Contract Type Bindings (real RPC instead of hardcoded mocks)
 * Closes #18 — Input Validation and Sanitization (comprehensive validation)
 * Closes #15 — Environment Variables Validation (startup config checks)
 */

import { useState } from "react";
import {
  Address,
  Contract,
  nativeToScVal,
  scValToNative,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  StrKey,
  Horizon,
} from "@stellar/stellar-sdk";
import { Server } from "@stellar/stellar-sdk/rpc";
import { passkeyWallet } from "./passkeyIntegration";
import { getCache, setCache, invalidateCache } from "./cacheManager";
import { dispatchCacheEvent } from "../hooks/useCacheInvalidation";
import { CACHE_KEYS } from "../types/cache";

const horizonServer = new Server("https://horizon-testnet.stellar.org");

// ─── Type Definitions ──────────────────────────────────────────────

/** Risk and tier data returned from the smart contract */
export interface RiskTierData {
  score: number; // u32: 0-100 risk score
  tier: string; // Symbol: TIER_1, TIER_2, or TIER_3
  timestamp: bigint; // u64: Unix timestamp
  chosen_tier: string; // Symbol: User's chosen tier
}

/** Valid tier levels matching the Rust contract's Symbol values */
export type TierLevel = "TIER_1" | "TIER_2" | "TIER_3";

/** Tier statistics mapping */
export type TierStats = Record<TierLevel, number>;

// ─── Constants ─────────────────────────────────────────────────────

const VALID_TIERS: readonly TierLevel[] = [
  "TIER_1",
  "TIER_2",
  "TIER_3",
] as const;

const DEFAULT_RPC_URL = "https://soroban-testnet.stellar.org";
const DEFAULT_NETWORK = Networks.TESTNET;
const SUBMISSION_FEE = (Number(BASE_FEE) * 100).toString();

// ─── Validation Utilities (Fixes #18) ──────────────────────────────

/** Check if a string is a valid TierLevel */
function isValidTier(value: string): value is TierLevel {
  return VALID_TIERS.includes(value as TierLevel);
}

/**
 * Validate and sanitize a Stellar address.
 * Accepts both G... (ed25519 public key) and C... (contract) addresses.
 * @throws {Error} if the address is invalid
 */
function validateAddress(address: unknown, label = "Address"): string {
  if (!address || typeof address !== "string") {
    throw new Error(`${label} is required and must be a non-empty string.`);
  }
  const trimmed = address.trim();
  const isValidG = StrKey.isValidEd25519PublicKey(trimmed);
  const isValidC =
    trimmed.startsWith("C") &&
    trimmed.length === 56 &&
    /^[A-Z0-9]+$/.test(trimmed);

  if (!isValidG && !isValidC) {
    throw new Error(
      `${label} "${trimmed}" is not a valid Stellar address. ` +
        `Expected a 56-character G... (account) or C... (contract) address.`
    );
  }
  return trimmed;
}

/**
 * Validate a risk score value.
 * @throws {Error} if the score is out of range or not a number
 */
function validateScore(score: unknown): number {
  if (typeof score !== "number" || !Number.isFinite(score)) {
    throw new Error("Score must be a finite number.");
  }
  const rounded = Math.round(score);
  if (rounded < 0 || rounded > 100) {
    throw new Error(
      `Score must be between 0 and 100 (inclusive), received ${rounded}.`
    );
  }
  return rounded;
}

/**
 * Validate and normalize a tier value.
 * @throws {Error} if the tier is not a valid TierLevel
 */
function validateTierInput(tier: unknown, label = "Tier"): TierLevel {
  if (!tier || typeof tier !== "string") {
    throw new Error(`${label} is required and must be a string.`);
  }
  const normalized = tier.trim().toUpperCase();
  if (!isValidTier(normalized)) {
    throw new Error(
      `${label} "${tier}" is invalid. Must be one of: ${VALID_TIERS.join(", ")}.`
    );
  }
  return normalized;
}

// ─── Configuration (Fixes #15) ─────────────────────────────────────

/**
 * Resolve contract configuration from environment variables.
 * Checks both NEXT_PUBLIC_RISK_TIER_CONTRACT_ID and NEXT_PUBLIC_RISKSCORE_CONTRACT_ID.
 */
function resolveContractId(): string {
  const id =
    process.env.NEXT_PUBLIC_RISK_TIER_CONTRACT_ID ||
    process.env.NEXT_PUBLIC_RISKSCORE_CONTRACT_ID ||
    "";
  return id;
}

// Exported for backward compatibility
export const RISK_TIER_CONTRACT_CONFIG = {
  contractId: resolveContractId(),
  network: "TESTNET",
  rpcUrl: DEFAULT_RPC_URL,
};

// Cache configuration
const RISK_TIER_CACHE_TTL = 15 * 60 * 1000; // 15 minutes for risk tier data

/**
 * Type-Safe Risk Tier Contract Client
 * Following Soroban CLI TypeScript bindings pattern
 * Enhanced with intelligent caching
// ─── Contract Client (Fixes #16) ──────────────────────────────────

/**
 * Type-Safe Risk Tier Contract Client
 *
 * All read operations use real Soroban RPC simulation via `server.simulateTransaction()`.
 * All write operations build a real transaction XDR signed via Passkey + Launchtube.
 */
export class RiskTierContractClient {
  private contractId: string;
  private rpcUrl: string;
  private networkPassphrase: string;

  // Lazy-initialized to avoid SSR/build failures
  private _server?: Server;
  private _contract?: Contract;

  constructor(contractId?: string) {
    this.contractId = contractId || resolveContractId();
    this.rpcUrl =
      process.env.NEXT_PUBLIC_SOROBAN_RPC_URL || DEFAULT_RPC_URL;
    this.networkPassphrase =
      process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE || DEFAULT_NETWORK;
  }

  /** Lazily create the Soroban RPC server instance */
  private get server(): Server {
    if (!this._server) {
      this._server = new Server(this.rpcUrl);
    }
    return this._server;
  }

  /** Lazily create the Contract instance, validating the contract ID */
  private get contract(): Contract {
    if (!this._contract) {
      if (!this.contractId) {
        throw new Error(
          "Contract ID not configured. " +
            "Set NEXT_PUBLIC_RISK_TIER_CONTRACT_ID or " +
            "NEXT_PUBLIC_RISKSCORE_CONTRACT_ID in your .env.local file."
        );
      }
      this._contract = new Contract(this.contractId);
    }
    return this._contract;
  }

  // ── Write Operations ──────────────────────────────────────────

  /**
   * Set risk score with tier classification.
   * Maps to Rust: `set_risk_tier(caller, user, score, tier, chosen_tier)`
   *
   * @param callerAddress - Stellar address of the caller (admin or user)
   * @param userAddress   - Stellar G... or C... address of the target user
   * @param score         - Risk score 0-100
   * @param tier          - Calculated tier (TIER_1 | TIER_2 | TIER_3)
   * @param chosenTier    - User's chosen tier
   * @returns Transaction hash
   */
  async setRiskTier(
    callerAddress: string,
    userAddress: string,
    score: number,
    tier: TierLevel,
    chosenTier: TierLevel
  ): Promise<string> {
    const callerAddr = validateAddress(callerAddress, "Caller address");
    const addr = validateAddress(userAddress, "User address");
    const safeScore = validateScore(score);
    const safeTier = validateTierInput(tier, "Tier");
    const safeChosen = validateTierInput(chosenTier, "Chosen tier");

    const xdr = await this.buildWriteTransaction(callerAddr, "set_risk_tier", [
      Address.fromString(callerAddr).toScVal(),
      Address.fromString(addr).toScVal(),
      nativeToScVal(safeScore, { type: "u32" }),
      nativeToScVal(safeTier, { type: "symbol" }),
      nativeToScVal(safeChosen, { type: "symbol" }),
    ]);

    try {
      const hash = await this.signAndSubmit(xdr);

      // Invalidate related cache entries after successful update
      await this.invalidateUserCache(userAddress);

      // Dispatch cache invalidation event
      dispatchCacheEvent.riskTierUpdated(userAddress, tier);

      console.log("✅ Risk tier updated and cache invalidated");

      return hash;
    } catch (error) {
      console.error("❌ Failed to set risk tier:", error);
      throw error;
    }
  }
  /**
   * Update user's chosen tier with risk-based validation.
   * Maps to Rust: `update_chosen_tier(user, new_chosen_tier)`
   *
   * @param userAddress   - Stellar address
   * @param newChosenTier - New tier to set
   * @returns Transaction hash
   */
  async updateChosenTier(
    userAddress: string,
    newChosenTier: TierLevel
  ): Promise<string> {
    const addr = validateAddress(userAddress, "User address");
    const safeTier = validateTierInput(newChosenTier, "New chosen tier");

    const xdr = await this.buildWriteTransaction(
      addr,
      "update_chosen_tier",
      [
        Address.fromString(addr).toScVal(),
        nativeToScVal(safeTier, { type: "symbol" }),
      ]
    );

    return this.signAndSubmit(xdr);
  }

  // ── Read Operations ───────────────────────────────────────────

  /**
   * Get complete risk and tier data for a user.
   * Maps to Rust: `get_risk_tier(user) -> Option<RiskTierData>`
   */
  async getRiskTier(userAddress: string): Promise<RiskTierData | null> {
    try {
      // Check cache first
      const cacheKey = `${CACHE_KEYS.USER_RISK_TIER}_${userAddress}`;
      const cachedData = await getCache<RiskTierData>(cacheKey);
      
      if (cachedData) {
        console.log("🚀 Using cached risk tier data");
        return cachedData;
      }

      console.log("📡 Fetching fresh risk tier data from contract...");

      const addr = validateAddress(userAddress, "User address");
      const retval = await this.simulateReadCall("get_risk_tier", [
        Address.fromString(addr).toScVal(),
      ]);

      if (!retval) return null;

      const native = scValToNative(retval);
      const riskTierData = {
        score: Number(native.score),
        tier: String(native.tier),
        timestamp: BigInt(native.timestamp),
        chosen_tier: String(native.chosen_tier),
      };

      // Cache the result
      await setCache(cacheKey, riskTierData, { 
        ttl: RISK_TIER_CACHE_TTL 
      });

      return riskTierData;
    } catch (error) {
      console.error("❌ Failed to get risk tier:", error);
      return null;
    }
  }

  /**
   * Get only risk score (backward compatibility).
   * Maps to Rust: `get_score(user) -> u32`
   */
  async getScore(userAddress: string): Promise<number> {
    try {
      // Try to get from cached tier data first
      const tierData = await this.getRiskTier(userAddress);
      if (tierData) {
        return tierData.score;
      }

      // Fallback to direct score call
      console.log("📡 Fetching score directly from contract...");
      const addr = validateAddress(userAddress, "User address");

      const retval = await this.simulateReadCall("get_score", [
        Address.fromString(addr).toScVal(),
      ]);

      return retval ? Number(scValToNative(retval)) : 0;
    } catch (error) {
      console.error("❌ Failed to get score:", error);
      return 0;
    }
  }

  /**
   * Get user's chosen tier for operations.
   * Maps to Rust: `get_chosen_tier(user) -> Symbol`
   */
  async getChosenTier(userAddress: string): Promise<TierLevel> {
    try {
      // Try to get from cached tier data first
      const tierData = await this.getRiskTier(userAddress);
      if (tierData) {
        return tierData.chosen_tier as TierLevel;
      }

      // Fallback to direct chosen tier call
      console.log("📡 Fetching chosen tier directly from contract...");
      const addr = validateAddress(userAddress, "User address");

      const retval = await this.simulateReadCall("get_chosen_tier", [
        Address.fromString(addr).toScVal(),
      ]);

      if (!retval) return "TIER_3";
      const raw = String(scValToNative(retval));
      return isValidTier(raw) ? raw : "TIER_3";
    } catch (error) {
      console.error("❌ Failed to get chosen tier:", error);
      return "TIER_3";
    }
  }

  /**
   * Check if user can access a specific tier based on risk score.
   * Maps to Rust: `can_access_tier(user, target_tier) -> bool`
   */
  async canAccessTier(
    userAddress: string,
    targetTier: TierLevel
  ): Promise<boolean> {
    const addr = validateAddress(userAddress, "User address");
    const safeTier = validateTierInput(targetTier, "Target tier");

    const retval = await this.simulateReadCall("can_access_tier", [
      Address.fromString(addr).toScVal(),
      nativeToScVal(safeTier, { type: "symbol" }),
    ]);

    return retval ? Boolean(scValToNative(retval)) : false;
  }

  /**
   * Get tier statistics.
   * Maps to Rust: `get_tier_stats() -> Map<Symbol, u32>`
   */
  async getTierStats(): Promise<TierStats> {
    const defaults: TierStats = { TIER_1: 0, TIER_2: 0, TIER_3: 0 };

    const retval = await this.simulateReadCall("get_tier_stats", []);
    if (!retval) return defaults;

    try {
      const native = scValToNative(retval);
      return {
        TIER_1: Number(native.TIER_1 ?? 0),
        TIER_2: Number(native.TIER_2 ?? 0),
        TIER_3: Number(native.TIER_3 ?? 0),
      };
    } catch {
      return defaults;
    }
  }

  /**
   * Get all users in a specific tier.
   * Maps to Rust: `get_tier_users(tier) -> Vec<Address>`
   */
  async getTierUsers(tier: TierLevel): Promise<string[]> {
    const safeTier = validateTierInput(tier, "Tier");

    const retval = await this.simulateReadCall("get_tier_users", [
      nativeToScVal(safeTier, { type: "symbol" }),
    ]);

    if (!retval) return [];
    try {
      const native = scValToNative(retval);
      return Array.isArray(native) ? native.map(String) : [];
    } catch {
      return [];
    }
  }

  // ── Internal: Transaction Building ────────────────────────────

  /**
   * Build a real transaction XDR for a write (state-changing) contract call.
   *
   * The resulting XDR is signed via Passkey and submitted through
   * Launchtube sponsorship, which handles simulation/preparation
   * on the server side.
   */
  private async buildWriteTransaction(
    sourceAddress: string,
    functionName: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    args: any[]
  ): Promise<string> {
    const account = await this.resolveSourceAccount(sourceAddress);

    const operation = this.contract.call(functionName, ...args);

    const transaction = new TransactionBuilder(account, {
      fee: SUBMISSION_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(operation)
      .setTimeout(300)
      .build();

    return transaction.toXDR();
  }

  /**
   * Simulate a read-only contract call via Soroban RPC and return
   * the function's return value as a raw ScVal.
   *
   * No wallet signing is required — this is a pure simulation.
   */
  private async simulateReadCall(
    functionName: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    args: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any | null> {
    try {
      const account = await this.getSimulationSourceAccount();

      const operation = this.contract.call(functionName, ...args);

      const transaction = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(operation)
        .setTimeout(30)
        .build();

      const simulation = await this.server.simulateTransaction(transaction);

      // Check for simulation errors
      if ("error" in simulation && simulation.error) {
        console.warn(
          `[RiskTierClient] Simulation error in ${functionName}:`,
          simulation.error
        );
        return null;
      }

      // Extract the return value from a successful simulation
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (simulation as any).result;
      return result?.retval ?? null;
    } catch (err) {
      console.error(`[RiskTierClient] simulateReadCall(${functionName}) failed:`, err);
      return null;
    }
  }

  /**
   * Invalidate all cache entries for a specific user
   * Called after risk tier updates
   */
  private async invalidateUserCache(userAddress: string): Promise<void> {
    try {
      await Promise.all([
        invalidateCache(`${CACHE_KEYS.USER_RISK_TIER}_${userAddress}`),
        invalidateCache(`${CACHE_KEYS.RISK_SCORE}_${userAddress}`),
        invalidateCache(`${CACHE_KEYS.HORIZON_DATA}_${userAddress}`),
      ]);
      
      console.log(`✅ Cache invalidated for user: ${userAddress}`);
    } catch (error) {
      console.warn('Failed to invalidate user cache:', error);
    }
  }
  // ── Internal: Signing & Submission ────────────────────────────

  /**
   * Sign a transaction XDR with the Passkey wallet and submit it
   * via the Launchtube sponsorship API.
   *
   * @returns Transaction hash on success
   */
  private async signAndSubmit(transactionXDR: string): Promise<string> {
    const signature = await passkeyWallet.signTransaction(transactionXDR);
    const result = await passkeyWallet.submitTransactionDirectly(
      transactionXDR,
      signature
    );
    return result.hash;
  }

  // ── Internal: Account Resolution ──────────────────────────────

  /**
   * Resolve the source account for transaction building.
   *
   * - G... addresses: load directly from Horizon
   * - C... addresses: use the Launchtube sponsor account
   *   (derived from the "kalepail" seed per PasskeyKit conventions)
   */
  private async resolveSourceAccount(address: string) {
    // Lazy horizon server connection
    const horizon = new Horizon.Server("https://horizon-testnet.stellar.org");
    
    if (StrKey.isValidEd25519PublicKey(address)) {
      try {
        return await horizon.loadAccount(address);
      } catch {
        // On testnet, attempt to fund via friendbot
        if (this.networkPassphrase === Networks.TESTNET) {
          await this.fundViaFriendbot(address);
          return await horizon.loadAccount(address);
        }
        throw new Error(
          `Account ${address} not found on the network. ` +
            `Ensure it is funded before submitting transactions.`
        );
      }
    }

    // C... (smart contract / passkey) — use sponsor
    return this.loadSponsorAccount();
  }

  /**
   * Get a source account suitable for read-only simulation.
   * Prefers the connected passkey wallet; falls back to the sponsor account.
   */
  private async getSimulationSourceAccount() {
    // If the passkey wallet is connected, try its address first
    if (passkeyWallet?.smartWalletAddress) {
      try {
        return await this.resolveSourceAccount(
          passkeyWallet.smartWalletAddress
        );
      } catch {
        // fall through to sponsor
      }
    }
    return this.loadSponsorAccount();
  }

  /**
   * Load the Launchtube sponsor account (the "kalepail" seed).
   * Funds it via friendbot on testnet if it doesn't exist yet.
   */
  private async loadSponsorAccount() {
    const { Keypair, hash } = await import("@stellar/stellar-sdk");
    const seed = hash(Buffer.from("kalepail"));
    const sponsorAddress = Keypair.fromRawEd25519Seed(seed).publicKey();

    const horizon = new Horizon.Server("https://horizon-testnet.stellar.org");

    try {
      return await horizon.loadAccount(sponsorAddress);
    } catch {
      if (this.networkPassphrase === Networks.TESTNET) {
        await this.fundViaFriendbot(sponsorAddress);
        return await horizon.loadAccount(sponsorAddress);
      }
      throw new Error(
        "Sponsor account not found and network is not testnet. " +
          "Please ensure the sponsor account is funded."
      );
    }
  }

  /**
   * Fund a testnet account using Stellar Friendbot.
   * Waits 3 seconds after funding for the account to become available.
   */
  private async fundViaFriendbot(address: string): Promise<void> {
    const url = `https://friendbot.stellar.org?addr=${encodeURIComponent(address)}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(
        `Friendbot funding failed for ${address} (HTTP ${res.status}). ` +
          `Visit https://laboratory.stellar.org/#account-creator to fund manually.`
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
}

// ─── Singleton Instance ────────────────────────────────────────────

/**
 * Singleton contract client.
 *
 * Uses lazy initialization internally so the import itself never throws,
 * even during SSR / Next.js build where env vars may be absent.
 * Errors surface on the first actual RPC call.
 */
export const riskTierClient = new RiskTierContractClient();

// ─── React Hook ────────────────────────────────────────────────────

/**
 * React hook for risk tier contract interactions.
 * Wraps the singleton client with React loading/error state.
 */
export function useRiskTierContract() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setRiskTier = async (
    callerAddress: string,
    userAddress: string,
    score: number,
    tier: TierLevel,
    chosenTier: TierLevel
  ) => {
    try {
      setLoading(true);
      setError(null);
      return await riskTierClient.setRiskTier(
        callerAddress,
        userAddress,
        score,
        tier,
        chosenTier
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(msg);
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
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const canAccessTier = async (
    userAddress: string,
    targetTier: TierLevel
  ) => {
    try {
      return await riskTierClient.canAccessTier(userAddress, targetTier);
    } catch {
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
      return await riskTierClient.updateChosenTier(
        userAddress,
        newChosenTier
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(msg);
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
