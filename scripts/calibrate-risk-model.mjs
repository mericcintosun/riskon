#!/usr/bin/env node
/**
 * Risk model calibration against the real Stellar population.
 *
 * WHY THIS EXISTS
 * ---------------
 * The model's normalization bounds were invented (totalVolume max 10_000,
 * assetDiversity max 10, ...). Measured against real mainnet wallets they are
 * wrong by 3-3300x, so `Math.min(1, value/(max-min))` saturates: ~88% of real
 * wallets clamp totalVolume to exactly 1.0 and ~83% clamp assetDiversity, which
 * makes those features CONSTANTS that carry no information. The result was that
 * ~92% of real wallets landed in TIER_2.
 *
 * WHAT THIS DOES
 * --------------
 * Samples real wallets that actually move value on mainnet, computes the same
 * four features the app uses, and writes an empirical quantile table. The model
 * then maps each raw feature to its percentile in that distribution instead of
 * to an invented min-max range.
 *
 * Percentile mapping is invariant under monotone transforms, so it handles the
 * heavy tails (volume spans ~10 orders of magnitude) without any log-scaling
 * hacks, and it cannot saturate.
 *
 * HONESTY NOTE
 * ------------
 * This calibrates the score to the *population*, i.e. "how does this wallet
 * compare to real Stellar wallets". It is NOT a validated default-risk model:
 * that would require outcome labels (defaults/liquidations) which do not exist
 * as an open dataset on Stellar. See gaps.md.
 *
 * Usage: node scripts/calibrate-risk-model.mjs [--samples 300] [--out <path>]
 */

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const HORIZON = process.env.CALIBRATION_HORIZON_URL || "https://horizon.stellar.org";
const PAGE_LIMIT = 200;
const CONCURRENCY = 12;

const args = process.argv.slice(2);
const getArg = (flag, def) => {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] ? args[i + 1] : def;
};
const TARGET_SAMPLES = Number(getArg("--samples", "300"));
const OUT_PATH = getArg(
  "--out",
  path.join(process.cwd(), "src/lib/riskCalibration.js")
);

// The quantile grid stored in the table. Finer in the middle where most
// wallets live; the model interpolates between these points.
const QUANTILE_GRID = [
  0, 0.01, 0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.95, 0.99, 1,
];

const FEATURES = [
  "totalVolume",
  "uniqueCounterparties",
  "assetDiversity",
  "nightDayRatio",
];

async function getJson(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (res.status === 404 || res.status === 429) return null;
  if (!res.ok) return null;
  return res.json();
}

/**
 * Find wallets that actually transfer value.
 *
 * Sampling from /transactions would bias hard toward high-frequency Soroban
 * bots (a scan of recent traffic came back 100% invoke_host_function, which the
 * feature formula silently reads as zeros). Sampling from network-wide
 * /payments instead yields accounts that genuinely send/receive value.
 */
async function sampleWalletAddresses(target) {
  const addresses = new Set();
  let url = `${HORIZON}/payments?order=desc&limit=${PAGE_LIMIT}`;

  for (let page = 0; page < 12 && addresses.size < target * 1.5; page++) {
    const data = await getJson(url);
    if (!data?._embedded?.records?.length) break;

    for (const record of data._embedded.records) {
      if (record.from) addresses.add(record.from);
      if (record.to) addresses.add(record.to);
    }
    url = data._links?.next?.href;
    if (!url) break;
  }

  return [...addresses].slice(0, target);
}

/** Mirrors calculateRiskMetrics() in src/lib/server/horizonMetrics.js */
function calculateRiskMetrics(payments, walletAddress) {
  const totalVolume = payments.reduce((sum, p) => {
    const amount = parseFloat(p.amount) || 0;
    const xlm =
      p.asset_code === "XLM" || p.asset_type === "native" ? amount : amount * 0.1;
    return sum + xlm;
  }, 0);

  const counterparties = new Set();
  payments.forEach((p) => {
    if (p.from && p.from !== walletAddress) counterparties.add(p.from);
    if (p.to && p.to !== walletAddress) counterparties.add(p.to);
  });

  const assets = new Set();
  payments.forEach((p) => assets.add(p.asset_code || "XLM"));

  let night = 0;
  let day = 0;
  payments.forEach((p) => {
    const hour = new Date(p.created_at).getUTCHours();
    if (hour >= 22 || hour <= 6) night++;
    else day++;
  });

  return {
    totalVolume: Math.round(totalVolume * 100) / 100,
    uniqueCounterparties: counterparties.size,
    assetDiversity: assets.size,
    nightDayRatio: day > 0 ? Math.round((night / day) * 100) / 100 : 0,
  };
}

async function collectFeatures(addresses) {
  const results = [];
  let cursor = 0;

  async function worker() {
    while (cursor < addresses.length) {
      const address = addresses[cursor++];
      const data = await getJson(
        `${HORIZON}/accounts/${address}/payments?order=desc&limit=${PAGE_LIMIT}`
      );
      const records = data?._embedded?.records;
      if (!records?.length) continue;
      results.push(calculateRiskMetrics(records, address));
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return results;
}

function quantile(sortedValues, q) {
  if (sortedValues.length === 0) return 0;
  const pos = q * (sortedValues.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sortedValues[lo];
  return sortedValues[lo] + (sortedValues[hi] - sortedValues[lo]) * (pos - lo);
}

function buildQuantileTable(samples, key) {
  const sorted = samples.map((s) => s[key]).sort((a, b) => a - b);
  return QUANTILE_GRID.map((q) => Number(quantile(sorted, q).toFixed(6)));
}

async function main() {
  console.log(`Sampling real wallets from ${HORIZON} ...`);
  const addresses = await sampleWalletAddresses(TARGET_SAMPLES);
  console.log(`  candidate wallets: ${addresses.length}`);

  console.log("Collecting features ...");
  const samples = await collectFeatures(addresses);
  console.log(`  wallets with payment history: ${samples.length}`);

  if (samples.length < 50) {
    console.error("Not enough samples to calibrate (need >= 50). Aborting.");
    process.exit(1);
  }

  const table = {
    // Metadata so a future reader knows exactly what this was fit on.
    _comment:
      "Empirical feature quantiles from real Stellar mainnet wallets. " +
      "Regenerate with: node scripts/calibrate-risk-model.mjs",
    generatedAt: new Date().toISOString(),
    horizon: HORIZON,
    sampleSize: samples.length,
    quantileGrid: QUANTILE_GRID,
    features: {},
  };

  for (const feature of FEATURES) {
    table.features[feature] = buildQuantileTable(samples, feature);
  }

  // Emit an ES module rather than raw JSON: importable from Next, Jest and
  // plain Node alike, with no `with { type: "json" }` import attribute needed.
  const write = (data) => {
    const banner =
      "// AUTO-GENERATED by scripts/calibrate-risk-model.mjs — do not edit by hand.\n" +
      "// Empirical feature quantiles from real Stellar mainnet wallets.\n\n";
    fs.writeFileSync(
      OUT_PATH,
      banner + "export default " + JSON.stringify(data, null, 2) + ";\n"
    );
  };

  // Pass 1: write the per-feature quantiles so the model can be imported.
  write(table);

  // Pass 2: with those in place, score every sample and record the composite's
  // own distribution. Without this the score is a weighted sum of ~independent
  // features, which concentrates around its mean (CLT) and then gets squashed by
  // the sigmoid — ~96% of real wallets landed in TIER_2. Mapping the composite to
  // its percentile makes the score uniform over the population by construction.
  const modelUrl = pathToFileURL(
    path.join(process.cwd(), "src/lib/lightweightRiskModel.js")
  ).href;
  const { riskComposite } = await import(`${modelUrl}?v=${Date.now()}`);

  const composites = samples.map((s) => riskComposite(s)).sort((a, b) => a - b);
  table.composite = QUANTILE_GRID.map((q) =>
    Number(quantile(composites, q).toFixed(6))
  );

  write(table);
  console.log(`\nWrote ${OUT_PATH}`);

  for (const feature of FEATURES) {
    const q = table.features[feature];
    console.log(
      `  ${feature.padEnd(22)} p5=${q[2]}  p50=${q[7]}  p95=${q[12]}`
    );
  }
}

main().catch((err) => {
  console.error("Calibration failed:", err);
  process.exit(1);
});
