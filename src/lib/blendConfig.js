"use client";

/**
 * Blend Protocol configuration — Stellar testnet.
 *
 * EVERY ADDRESS HERE WAS STALE AND VERIFIED DEAD ON CHAIN.
 * A testnet reset wipes contracts (the same trap that once had this app pointing
 * at a risk contract that no longer existed). Probing the previous values with
 * getLedgerEntries returned nothing for the pool factory, the backstop, and both
 * "main pools" — including the one the dashboard badged "🚀 LIVE" and
 * "Fully operational Blend pool - real transactions supported". That badge came
 * from a string check (`length === 56 && startsWith("C")`), never from chain.
 *
 * These are the current values from blend-capital/blend-utils
 * (testnet.contracts.json). TestnetV2 was verified live: PoolV2.load() returns
 * 4 real reserves, and a real SupplyCollateral against it succeeded on chain
 * (tx b3469518f9be9794e25fd7111fe219175676c0cd0f207fc5da1f976a6bd290f5,
 * ledger 3615686).
 *
 * IF POOLS STOP LOADING, CHECK HERE FIRST — a testnet reset means these need
 * refreshing from blend-utils. The UI now surfaces a load failure instead of
 * inventing an "operational" badge, so the symptom will be visible rather than
 * silently fabricated.
 */

// Network configuration for the Blend SDK.
export const BLEND_NETWORK = {
  rpc: "https://soroban-testnet.stellar.org",
  passphrase: "Test SDF Network ; September 2015",
  opts: { allowHttp: false },
};

/**
 * Asset contract ids (Stellar Asset Contracts).
 *
 * Note: the previous USDC value was 57 characters — an extra "T" against the
 * manifest's `…ATJJMIZ…` — so it was not a decodable contract address at all.
 */
export const BLEND_ASSETS = {
  XLM: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
  USDC: "CAQCFVLOBK5GIULPNZRGATJJMIZL5BSP7X5YJVMGCPTUEPFM4AVSRCJU",
  BLND: "CB22KRA3YZVCNCQI64JQ5WE7UY2VAV7WFLK6A2JN3HEX56T2EDAFO7QF",
  wETH: "CAZAQB3D7KSLSNOSQKYD2V4JP5V2Y3B4RDJZRLBFCCIXDCTE3WHSY3UE",
  wBTC: "CAP5AMC2OHNVREO66DFIN6DHJMPOBAJ2KCDDIMFBR7WWJH5RZBFM3UEI",
};

/** Blend V2 core contracts (current testnet deployment). */
export const BLEND_CONTRACTS = {
  POOL_FACTORY_V2: "CDV6RX4CGPCOKGTBFS52V3LMWQGZN3LCQTXF5RVPOOCG4XVMHXQ4NTF6",
  BACKSTOP_V2: "CBDVWXT433PRVTUNM56C3JREF3HIZHRBA64NB2C3B2UNCKIS65ZYCLZA",
  MAIN_POOL_V2: "CCEBVDYM32YNYCVNRXQKDFFPISJJCV557CDZEIRBEE4NCV4KHPQ44HGF",
  EMITTER: "CC3WJVJINN4E3LPMNTWKK7LQZLYDQMZHZA7EZGXATPHHBPKNZRIO3KZ6",
  // Blend's own testnet oracle is genuinely named "oraclemock" upstream.
  ORACLE_MOCK: "CAZOKR2Y5E2OSWSIBRVZMJ47RUTQPIGVWSAQ2UISGAVC46XKPGDG5PKI",
  COMET_FACTORY: "CDX2TKELFKHP2MWISDCXWWZ73CL7F57GHYRJAWJWNOTLNJNNM7XLT4JY",
  COMET: "CA5UTUUPHYL5K22UBRUVC37EARZUGYOSGK3IKIXG2JLCC5ZZLI4BDWDM",
};

/**
 * Pools the UI offers. Only the pool verified live on chain is listed. The V1
 * "backup" pool was removed: it does not exist on testnet, and offering it is
 * how a dead address ended up wearing an "operational" badge.
 */
export const ACTIVE_POOLS = {
  "Blend V2 Testnet Pool": BLEND_CONTRACTS.MAIN_POOL_V2,
};

/**
 * Display metadata only. Everything risk-bearing — reserves, utilization,
 * collateral factors, APRs — is read from chain by blendClient.loadPool().
 * The old POOL_METADATA hardcoded `riskLevel: "Moderate"` and a fixed asset list
 * that was rendered regardless of the pool's actual reserves.
 */
export const POOL_METADATA = {
  [BLEND_CONTRACTS.MAIN_POOL_V2]: {
    name: "Blend V2 Testnet Pool",
    description:
      "Blend's V2 lending pool on Stellar testnet. Reserves, utilization and collateral factors are read live from the pool contract.",
    version: "v2",
  },
};

/** Format a fixed-point amount to a human readable string. */
export function formatAmount(amount, decimals = 7) {
  const factor = Math.pow(10, decimals);
  return (amount / factor).toFixed(4);
}
