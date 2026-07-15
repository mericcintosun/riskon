"use client";

import { useState, useEffect, useCallback } from "react";
import { LineChart, AlertTriangle, ExternalLink } from "lucide-react";

import { analyzeBlendHistory } from "../lib/blendHistoryAnalyzer";
import { useWallet } from "../contexts/WalletContext";

/**
 * A wallet's real Blend activity.
 *
 * WHAT THIS REPLACES
 * ------------------
 * The old version always showed "No Blend Protocol History Found" — its filter
 * could not match anything (see blendHistoryAnalyzer.js). It also:
 *   * promised "Analyze your on-chain lending and borrowing history to
 *     potentially influence your credit score", while the callback that would
 *     have done that was never wired: the component declared no props, so
 *     AutomatedRiskAnalyzer's onScoreImpactChange was silently dropped and the
 *     score-impact branch was unreachable;
 *   * rendered native XLM amounts through
 *     toLocaleString("en-US", { style: "currency", currency: "USD" }) — XLM
 *     printed with a dollar sign, with no price oracle anywhere on the path.
 *
 * The score-impact promise is gone rather than made real: the risk model is a
 * calibrated population percentile, and an ad-hoc bonus would uncalibrate it.
 */

const EXPLORER = "https://stellar.expert/explorer/testnet/tx";

export default function BlendHistoryPerformance() {
  const { walletAddress } = useWallet();
  const [state, setState] = useState({ loading: false, data: null, error: null });

  const load = useCallback(async () => {
    if (!walletAddress) return;
    setState({ loading: true, data: null, error: null });
    try {
      const data = await analyzeBlendHistory(walletAddress);
      setState({ loading: false, data, error: null });
    } catch (err) {
      setState({ loading: false, data: null, error: err.message });
    }
  }, [walletAddress]);

  useEffect(() => {
    load();
  }, [load]);

  if (!walletAddress) return null;

  const { data } = state;

  return (
    <section className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-6">
      <h3 className="mb-1 flex items-center gap-2 text-lg font-bold text-white">
        <LineChart className="h-5 w-5 text-blue-400" />
        Your Blend Activity
      </h3>
      <p className="mb-4 text-xs text-slate-400">
        Read from Horizon by decoding which contract each Soroban call invoked.
      </p>

      {state.loading && (
        <p className="text-sm text-slate-400">Reading your history from chain…</p>
      )}

      {state.error && (
        <div className="flex gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {state.error}
        </div>
      )}

      {data && !data.supported && (
        <p className="text-sm text-slate-500">{data.reason}</p>
      )}

      {data?.supported && data.summary.count === 0 && (
        <p className="text-sm text-slate-500">
          No Blend activity found for this wallet in the last{" "}
          {data.meta.scanned} operations.
        </p>
      )}

      {data?.supported && data.summary.count > 0 && (
        <>
          <div className="mb-4 grid grid-cols-3 gap-3">
            <Stat label="Interactions" value={data.summary.count} />
            <Stat label="Sent (native)" value={data.summary.sentNative} />
            <Stat label="Received (native)" value={data.summary.receivedNative} />
          </div>

          <div className="space-y-1">
            {data.interactions.slice(0, 10).map((i) => (
              <div
                key={i.hash}
                className="flex items-center justify-between gap-3 border-t border-slate-700/40 py-2 text-xs"
              >
                <div className="min-w-0">
                  <div className="capitalize text-slate-300">{i.action}</div>
                  <div className="text-slate-600">
                    {new Date(i.at).toLocaleString()}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  {i.transfers.map((t, n) => (
                    <div key={n} className="font-mono text-slate-400">
                      {t.direction === "out" ? "−" : "+"}
                      {t.amount} {t.assetCode}
                    </div>
                  ))}
                  <a
                    href={`${EXPLORER}/${i.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-400 underline"
                  >
                    tx <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-4 text-xs leading-relaxed text-slate-500">
            Amounts are native asset units, not USD — there is no price oracle on
            this path. This history is shown for its own sake: it does not adjust
            your risk score, which is a calibrated percentile against the real
            Stellar population.
            {data.meta.truncated &&
              " Only the most recent operations were scanned; older activity may exist."}
          </p>
        </>
      )}
    </section>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-lg bg-slate-900/50 p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="font-mono text-sm text-white">{value}</div>
    </div>
  );
}
