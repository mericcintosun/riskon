/**
 * Asset issuer risk — read from Stellar mainnet, on-chain.
 *
 * WHY THIS AND NOT A WALLET SCORE
 * -------------------------------
 * A wallet score cannot punish default: a user with a bad score opens a new
 * wallet. An asset issuer cannot do that. The issuer address IS the asset —
 * change it and you are no longer holding the thing anyone wants. So unlike a
 * wallet score, what we measure here is not Sybil-able by the party being rated.
 *
 * It also answers questions a Stellar holder actually has, which no tool
 * currently surfaces:
 *
 *   1. "Is this the real USDC?"  387 different issuers on mainnet call
 *      themselves USDC. Only one is Circle.
 *   2. "What can the issuer do to me?"  Stellar issuers can freeze a balance
 *      (AUTH_REVOCABLE) or seize it outright (AUTH_CLAWBACK_ENABLED, CAP-35).
 *      These are real, declared, on-chain powers, and they differ per asset:
 *      Ondo can claw back USDY; Circle cannot claw back USDC but *can* freeze it.
 *
 * RANK BY HOLDERS, NOT BY BALANCE
 * -------------------------------
 * This is the load-bearing decision, and it is measured, not assumed.
 *
 * Issued balance is free to fabricate: an issuer mints whatever number it likes.
 * Ranking mainnet issuers by balance returns an impersonator every single time —
 * xlmgbptreasury.com for USDC (1.1 quadrillion issued), finance-ondo.com for
 * USDY, bridgerew.org for EURC. Each fabricates a balance 4-6 orders of
 * magnitude above the real issuer.
 *
 * Holder count is expensive to fabricate: every holder is a funded account
 * paying a base reserve plus a trustline reserve, and that cost is paid in real
 * XLM per fake holder. Ranking by holders returns the genuine issuer every time:
 * circle.com for USDC (2.27M holders, 97% of all holders using that code),
 * ondo.finance for USDY, circle.com for EURC.
 *
 * Expensive is not impossible. Holder count is a cost signal, not proof, and it
 * is weakest exactly where it matters most — a new legitimate asset and a
 * well-funded impersonator can look alike. So this module reports the evidence
 * and its own caveats rather than returning a verdict.
 */

const HORIZON = process.env.STELLAR_HORIZON_URL || "https://horizon.stellar.org";

/** Horizon caps page size at 200; asset codes routinely exceed that. */
const PAGE_LIMIT = 200;
/** Backstop against a pathological code with a runaway number of issuers. */
const MAX_PAGES = 25;
/** How many issuers to return in full. The total count is always reported. */
const DETAIL_LIMIT = 25;

/**
 * Stellar issuer flags, and what each one means for someone holding the asset.
 * Wording is deliberately in terms of what can be done TO the holder.
 */
export const ISSUER_POWERS = {
  auth_clawback_enabled: {
    key: "canSeize",
    label: "Clawback",
    meaning:
      "The issuer can take this asset back out of your wallet without your involvement (CAP-35). Your balance is revocable property.",
  },
  auth_revocable: {
    key: "canFreeze",
    label: "Freeze",
    meaning:
      "The issuer can freeze your trustline, leaving the balance visible but unusable — you cannot send, trade or redeem it.",
  },
  auth_required: {
    key: "canBlock",
    label: "Authorization required",
    meaning:
      "The issuer decides who is allowed to hold this asset at all. New holders must be approved.",
  },
  auth_immutable: {
    key: "flagsLocked",
    label: "Flags locked",
    meaning:
      "The issuer's flags can never be changed and the account can never be merged. Protective when the powers above are off — permanent when they are on.",
  },
};

async function fetchJson(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new Error(`Horizon ${res.status} for ${url}`);
  }
  return res.json();
}

/** Pull the home domain out of Horizon's toml link; absent means no home_domain. */
function domainOf(record) {
  const href = record?._links?.toml?.href;
  if (!href) return null;
  try {
    return new URL(href).hostname;
  } catch {
    return null;
  }
}

/**
 * Every issuer using this asset code. Pages to exhaustion: a single page reports
 * 200 for USDC when the real count is 387, which would silently halve the answer
 * and could miss the genuine issuer entirely.
 */
async function loadIssuers(code) {
  let url = `${HORIZON}/assets?asset_code=${encodeURIComponent(code)}&limit=${PAGE_LIMIT}`;
  const records = [];
  let pages = 0;

  while (url && pages < MAX_PAGES) {
    const page = await fetchJson(url);
    const batch = page?._embedded?.records ?? [];
    records.push(...batch);
    pages += 1;
    const next = page?._links?.next?.href;
    url = batch.length === PAGE_LIMIT && next ? next : null;
  }

  return { records, truncated: Boolean(url) };
}

function describe(record) {
  const flags = record.flags ?? {};
  const powers = {};
  for (const [flag, meta] of Object.entries(ISSUER_POWERS)) {
    powers[meta.key] = Boolean(flags[flag]);
  }

  return {
    issuer: record.asset_issuer,
    domain: domainOf(record),
    holders: record.accounts?.authorized ?? 0,
    issued: Number(record.balances?.authorized ?? 0),
    powers,
    // The flags exactly as chain reports them, so the mapping above is auditable.
    flags: {
      auth_required: Boolean(flags.auth_required),
      auth_revocable: Boolean(flags.auth_revocable),
      auth_immutable: Boolean(flags.auth_immutable),
      auth_clawback_enabled: Boolean(flags.auth_clawback_enabled),
    },
  };
}

/**
 * Rate every issuer using `code`, ranked by holder count.
 *
 * Returns the evidence, not a verdict: the dominant issuer by holders, how
 * concentrated holders are on it, and what powers each issuer holds.
 */
export async function rateAssetIssuers(code) {
  const normalized = String(code || "").trim().toUpperCase();
  if (!/^[A-Z0-9]{1,12}$/.test(normalized)) {
    throw new Error(
      "Asset code must be 1-12 alphanumeric characters (Stellar alphanum4/alphanum12)."
    );
  }

  const { records, truncated } = await loadIssuers(normalized);

  if (records.length === 0) {
    return {
      code: normalized,
      issuerCount: 0,
      issuers: [],
      dominant: null,
      meta: meta({ truncated, returned: 0, total: 0 }),
    };
  }

  const described = records.map(describe).sort((a, b) => b.holders - a.holders);
  const totalHolders = described.reduce((sum, i) => sum + i.holders, 0);

  const withShare = described.map((issuer) => ({
    ...issuer,
    holderShare:
      totalHolders > 0 ? Number((issuer.holders / totalHolders).toFixed(4)) : 0,
  }));

  const [dominant] = withShare;
  // Ranking by issued balance instead would surface this issuer. It is reported
  // so the difference between the two rankings is visible rather than asserted.
  const byIssued = [...withShare].sort((a, b) => b.issued - a.issued)[0];

  return {
    code: normalized,
    issuerCount: withShare.length,
    totalHolders,
    dominant: {
      issuer: dominant.issuer,
      domain: dominant.domain,
      holders: dominant.holders,
      holderShare: dominant.holderShare,
      powers: dominant.powers,
    },
    // Only meaningful when the two rankings disagree, which is the normal case.
    balanceRankingWouldPick:
      byIssued.issuer === dominant.issuer
        ? null
        : {
            issuer: byIssued.issuer,
            domain: byIssued.domain,
            holders: byIssued.holders,
            issued: byIssued.issued,
            note: "Ranking by issued balance picks this issuer instead. Balance is free for an issuer to fabricate; holder count is not.",
          },
    issuers: withShare.slice(0, DETAIL_LIMIT),
    meta: meta({
      truncated,
      returned: Math.min(DETAIL_LIMIT, withShare.length),
      total: withShare.length,
    }),
  };
}

function meta({ truncated, returned, total }) {
  return {
    network: "mainnet",
    horizon: HORIZON,
    source: "on-chain via Horizon /assets",
    ranking:
      "Issuers are ranked by holder count, not issued balance. An issuer mints any balance it likes for free, so balance ranks impersonators first; every holder costs real XLM in account and trustline reserves.",
    returned,
    total,
    // Never let a cap read as "this is everything".
    omitted: total > returned ? total - returned : 0,
    truncated,
    caveat:
      "Holder count is a cost signal, not proof of legitimacy. A well-funded impersonator can buy holders, and a genuine new asset has few — the signal is weakest exactly where the stakes are highest. Confirm the issuer address against the issuer's own published stellar.toml before trusting it.",
    generatedAt: new Date().toISOString(),
  };
}
