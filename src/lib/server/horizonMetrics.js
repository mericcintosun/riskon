/**
 * Server-side Horizon metrics collection (risk oracle).
 *
 * This is the trusted counterpart of `src/lib/horizonDataCollector.js`:
 * the browser version exists for display, but the SCORE THAT GETS WRITTEN
 * ON-CHAIN must be derived from data the server fetched itself, otherwise the
 * user could simply report any metrics/score they like.
 *
 * The formulas here intentionally mirror `calculateRiskMetrics()` in the client
 * collector so both sides show the same number.
 */

const HORIZON_URL =
  process.env.HORIZON_URL || "https://horizon-testnet.stellar.org";

const PAGE_LIMIT = 200;

async function fetchJson(url, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (res.status === 404) return null; // account not found / no history
    if (!res.ok) {
      throw new Error(`Horizon ${res.status}: ${url}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetch the wallet's recent payments and transactions from Horizon.
 * Returns null when the account does not exist.
 */
async function fetchAccountActivity(address) {
  const [paymentsRes, txRes] = await Promise.all([
    fetchJson(
      `${HORIZON_URL}/accounts/${address}/payments?order=desc&limit=${PAGE_LIMIT}`
    ),
    fetchJson(
      `${HORIZON_URL}/accounts/${address}/transactions?order=desc&limit=${PAGE_LIMIT}`
    ),
  ]);

  if (paymentsRes === null && txRes === null) return null;

  return {
    payments: paymentsRes?._embedded?.records ?? [],
    transactions: txRes?._embedded?.records ?? [],
  };
}

/**
 * Compute the 4 risk features. Mirrors calculateRiskMetrics() in
 * src/lib/horizonDataCollector.js.
 */
function calculateRiskMetrics(payments, transactions, walletAddress) {
  // 1. Total volume (XLM equivalent; non-native uses the same simplified rate
  //    as the client collector).
  const totalVolume = payments.reduce((sum, payment) => {
    const amount = parseFloat(payment.amount) || 0;
    const xlmAmount =
      payment.asset_code === "XLM" || payment.asset_type === "native"
        ? amount
        : amount * 0.1;
    return sum + xlmAmount;
  }, 0);

  // 2. Unique counterparties
  const counterparties = new Set();
  payments.forEach((payment) => {
    if (payment.from && payment.from !== walletAddress)
      counterparties.add(payment.from);
    if (payment.to && payment.to !== walletAddress)
      counterparties.add(payment.to);
  });

  // 3. Asset diversity
  const assets = new Set();
  payments.forEach((payment) => {
    assets.add(payment.asset_code || "XLM");
  });

  // 4. Night/day ratio (UTC on the server, so the result is deterministic and
  //    not dependent on a client's timezone)
  let nightTransactions = 0;
  let dayTransactions = 0;
  payments.forEach((payment) => {
    const hour = new Date(payment.created_at).getUTCHours();
    if (hour >= 22 || hour <= 6) nightTransactions++;
    else dayTransactions++;
  });
  const nightDayRatio =
    dayTransactions > 0 ? nightTransactions / dayTransactions : 0;

  return {
    totalVolume: Math.round(totalVolume * 100) / 100,
    uniqueCounterparties: counterparties.size,
    assetDiversity: assets.size,
    nightDayRatio: Math.round(nightDayRatio * 100) / 100,
    totalPayments: payments.length,
    totalTransactions: transactions.length,
    averageTransactionSize:
      payments.length > 0
        ? Math.round((totalVolume / payments.length) * 100) / 100
        : 0,
  };
}

/**
 * Collect trusted, server-fetched risk metrics for a wallet.
 * @returns {Promise<object|null>} metrics, or null if the account doesn't exist
 */
export async function collectMetricsServerSide(address) {
  const activity = await fetchAccountActivity(address);
  if (!activity) return null;

  return calculateRiskMetrics(
    activity.payments,
    activity.transactions,
    address
  );
}

export { calculateRiskMetrics };
