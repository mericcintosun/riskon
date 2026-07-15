/**
 * Server-side Risk Oracle.
 *
 * Closes two gaps that the client-side write path could not:
 *
 *  - Score integrity: the score written on-chain is computed here from data the
 *    SERVER fetched from Horizon, then signed with the contract admin key via
 *    `admin_set_risk_tier`. A user can no longer self-report an arbitrary score.
 *  - Working Soroban writes: the transaction is run through
 *    `prepareTransaction()` (simulation), which attaches the footprint, resource
 *    fees and the authorization entries that `admin.require_auth()` needs.
 *
 * The oracle admin secret MUST stay server-side (never NEXT_PUBLIC_*).
 */

import {
  Address,
  BASE_FEE,
  Contract,
  Keypair,
  Networks,
  StrKey,
  TransactionBuilder,
  nativeToScVal,
  scValToNative,
} from "@stellar/stellar-sdk";
import { Server } from "@stellar/stellar-sdk/rpc";

import { calculateRiskScore } from "../lightweightRiskModel.js";
import { collectMetricsServerSide } from "./horizonMetrics.js";

const RPC_URL =
  process.env.STELLAR_RPC_URL || "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE =
  process.env.STELLAR_NETWORK_PASSPHRASE || Networks.TESTNET;

/** One attestation per wallet per 24h, enforced against on-chain state. */
const ATTESTATION_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export class OracleError extends Error {
  constructor(code, message, status = 400, details = undefined) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function getContractId() {
  const id =
    process.env.RISK_TIER_CONTRACT_ID ||
    process.env.NEXT_PUBLIC_RISK_TIER_CONTRACT_ID;
  if (!id) {
    throw new OracleError(
      "NOT_CONFIGURED",
      "Risk tier contract id is not configured.",
      500
    );
  }
  return id;
}

function getOracleKeypair() {
  const secret = process.env.RISK_ORACLE_SECRET_KEY;
  if (!secret) {
    throw new OracleError(
      "NOT_CONFIGURED",
      "RISK_ORACLE_SECRET_KEY is not configured on the server.",
      500
    );
  }
  try {
    return Keypair.fromSecret(secret.trim());
  } catch {
    throw new OracleError(
      "NOT_CONFIGURED",
      "RISK_ORACLE_SECRET_KEY is not a valid Stellar secret key.",
      500
    );
  }
}

/** Tier mapping — must match the contract's can_access_tier thresholds. */
export function tierForScore(score) {
  if (score <= 30) return "TIER_1";
  if (score <= 70) return "TIER_2";
  return "TIER_3";
}

export function assertValidStellarAddress(address) {
  if (typeof address !== "string" || !StrKey.isValidEd25519PublicKey(address.trim())) {
    throw new OracleError(
      "INVALID_INPUT",
      "A valid Stellar account address (G...) is required.",
      400
    );
  }
  return address.trim();
}

function buildServer() {
  return new Server(RPC_URL);
}

/**
 * Read the user's current on-chain risk record (or null).
 */
async function readRiskTier(server, sourceAccount, contract, userAddress) {
  const tx = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call("get_risk_tier", Address.fromString(userAddress).toScVal())
    )
    .setTimeout(30)
    .build();

  const sim = await server.simulateTransaction(tx);
  if ("error" in sim && sim.error) return null;

  const retval = sim.result?.retval;
  if (!retval) return null;

  const native = scValToNative(retval);
  if (native === null || native === undefined) return null;

  return {
    score: Number(native.score),
    tier: String(native.tier),
    timestamp: Number(native.timestamp),
    chosen_tier: String(native.chosen_tier),
  };
}

/**
 * Enforce the attestation cooldown using the contract's own timestamp.
 * Stateless: no extra store to keep in sync, and it cannot be cleared by the
 * client the way the old localStorage rate limiter could.
 */
function assertCooldownElapsed(existing) {
  if (!existing || !existing.timestamp) return;

  const lastMs = existing.timestamp * 1000;
  const elapsed = Date.now() - lastMs;
  if (elapsed < ATTESTATION_COOLDOWN_MS) {
    const retryAfterMs = ATTESTATION_COOLDOWN_MS - elapsed;
    throw new OracleError(
      "RATE_LIMITED",
      "This wallet was already scored in the last 24 hours.",
      429,
      {
        last_attested_at: new Date(lastMs).toISOString(),
        retry_after_seconds: Math.ceil(retryAfterMs / 1000),
      }
    );
  }
}

async function submitAndConfirm(server, tx) {
  const sent = await server.sendTransaction(tx);

  if (sent.status === "ERROR") {
    throw new OracleError(
      "SUBMIT_FAILED",
      "Soroban RPC rejected the transaction.",
      502,
      { errorResult: sent.errorResult?.result?.().switch?.().name }
    );
  }

  // Poll until the ledger closes.
  const deadline = Date.now() + 45_000;
  let last;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 1500));
    last = await server.getTransaction(sent.hash);
    if (last.status === "SUCCESS") return sent.hash;
    if (last.status === "FAILED") {
      throw new OracleError(
        "TX_FAILED",
        "The attestation transaction failed on-chain.",
        502,
        { hash: sent.hash }
      );
    }
    // NOT_FOUND => still pending
  }

  throw new OracleError(
    "TX_TIMEOUT",
    "Timed out waiting for the attestation transaction to confirm.",
    504,
    { hash: sent.hash }
  );
}

/**
 * Compute a wallet's risk score from server-fetched Horizon data and write it
 * on-chain with the oracle admin key.
 *
 * @param {string} rawAddress user's G... address
 * @param {{ chosenTier?: string, force?: boolean }} [options]
 */
export async function attestRiskScore(rawAddress, options = {}) {
  const userAddress = assertValidStellarAddress(rawAddress);
  const contractId = getContractId();
  const oracle = getOracleKeypair();

  const server = buildServer();
  const contract = new Contract(contractId);

  let oracleAccount;
  try {
    oracleAccount = await server.getAccount(oracle.publicKey());
  } catch {
    throw new OracleError(
      "NOT_CONFIGURED",
      "The oracle account does not exist or is unfunded on this network.",
      500
    );
  }

  // 1. Cooldown, enforced from on-chain state.
  const existing = await readRiskTier(server, oracleAccount, contract, userAddress);
  if (!options.force) assertCooldownElapsed(existing);

  // 2. Trusted, server-side metrics + score.
  const metrics = await collectMetricsServerSide(userAddress);
  if (!metrics) {
    throw new OracleError(
      "ACCOUNT_NOT_FOUND",
      "This account does not exist on the Stellar network yet.",
      404
    );
  }

  const analysis = calculateRiskScore(metrics);

  // Refuse to write a score for a wallet we know nothing about.
  //
  // Every feature of a brand-new wallet sits at the bottom of the population, so
  // the composite reads it as a risky profile (a freshly created wallet scored
  // 87 -> TIER_3). That is absence of evidence, not evidence of risk, and
  // stamping TIER_3 on-chain for it is materially wrong — the tier is what the
  // contract gates access on.
  if (analysis.insufficientData) {
    throw new OracleError(
      "INSUFFICIENT_HISTORY",
      "This wallet has too little transaction history to be scored. " +
        "Use it on Stellar for a while and try again.",
      422,
      {
        data_quality: analysis.dataQuality?.score ?? 0,
        total_payments: metrics.totalPayments ?? 0,
      }
    );
  }

  const score = analysis.riskScore;
  const tier = tierForScore(score);

  // A user may only *choose* a tier they qualify for; default to their own tier.
  const requestedTier = options.chosenTier;
  const chosenTier =
    requestedTier && ["TIER_1", "TIER_2", "TIER_3"].includes(requestedTier)
      ? requestedTier
      : tier;

  // 3. Build -> prepare (simulate: footprint + resource fee + auth) -> sign -> submit.
  const operation = contract.call(
    "admin_set_risk_tier",
    Address.fromString(userAddress).toScVal(),
    nativeToScVal(score, { type: "u32" }),
    nativeToScVal(tier, { type: "symbol" }),
    nativeToScVal(chosenTier, { type: "symbol" })
  );

  // Re-read the account: TransactionBuilder bumps the sequence of whatever
  // Account object it is handed, and the read simulation above already used
  // one. Building the write from a stale object yields txBadSeq.
  const writeAccount = await server.getAccount(oracle.publicKey());

  const built = new TransactionBuilder(writeAccount, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(operation)
    .setTimeout(60)
    .build();

  let prepared;
  try {
    // This is what the old client-side path was missing entirely.
    prepared = await server.prepareTransaction(built);
  } catch (err) {
    throw new OracleError(
      "SIMULATION_FAILED",
      `Contract simulation failed: ${err?.message ?? "unknown error"}`,
      502
    );
  }

  prepared.sign(oracle);
  const hash = await submitAndConfirm(server, prepared);

  return {
    address: userAddress,
    score,
    tier,
    chosenTier,
    hash,
    metrics,
    explanation: analysis.explanation,
    recommendations: analysis.recommendations,
    confidence: analysis.confidence,
    attestedBy: oracle.publicKey(),
    contractId,
  };
}
