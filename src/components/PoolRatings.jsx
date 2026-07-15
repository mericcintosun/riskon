"use client";

import { useEffect, useState } from "react";
import { Shield, AlertTriangle, Info, RefreshCw } from "lucide-react";

/**
 * Blend pool risk ratings.
 *
 * Rates POOLS rather than wallets on purpose: a wallet can escape a bad score by
 * opening a new one, but a pool is a contract with persistent public state, and
 * "which Blend pool do I put money in?" is a decision users actually make. Every
 * rating shows its inputs and weights so it can be argued with.
 */

const GRADE_STYLES = {
  A: "bg-green-500/15 text-green-400 border-green-500/30",
  B: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  C: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  D: "bg-red-500/15 text-red-400 border-red-500/30",
};

function RiskBar({ risk }) {
  const pct = Math.round(risk * 100);
  const color =
    risk <= 0.33 ? "bg-green-500" : risk <= 0.66 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="h-1.5 w-full rounded-full bg-slate-700/60">
      <div
        className={`h-1.5 rounded-full ${color} transition-all duration-500`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function PoolCard({ pool }) {
  const [open, setOpen] = useState(false);
  const o = pool.observed;

  return (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6 backdrop-blur-sm">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white">{pool.name}</h3>
          <p className="mt-1 font-mono text-xs text-slate-500">
            {pool.poolId.slice(0, 8)}…{pool.poolId.slice(-6)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-2xl font-bold text-white">{pool.score}</div>
            <div className="text-xs text-slate-400">risk / 100</div>
          </div>
          <span
            className={`rounded-lg border px-3 py-1.5 text-lg font-bold ${
              GRADE_STYLES[pool.grade] || GRADE_STYLES.C
            }`}
          >
            {pool.grade}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {Object.entries(pool.factors).map(([key, f]) => (
          <div key={key}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-slate-300">{f.label}</span>
              <span className="text-slate-500">
                {Math.round(f.risk * 100)} · weight {f.weight}
              </span>
            </div>
            <RiskBar risk={f.risk} />
          </div>
        ))}
      </div>

      <button
        onClick={() => setOpen((v) => !v)}
        className="mt-4 text-sm font-medium text-blue-400 hover:text-blue-300"
      >
        {open ? "Hide details" : "Why this grade? Show the inputs"}
      </button>

      {open && (
        <div className="mt-4 space-y-4 border-t border-slate-700/50 pt-4">
          <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
            <Stat label="Reserves" value={o.reserveCount} />
            <Stat
              label="Weighted util."
              value={`${(o.weightedUtilization * 100).toFixed(1)}%`}
            />
            <Stat
              label="Peak util."
              value={`${(o.maxUtilization * 100).toFixed(1)}%`}
            />
            <Stat label="Max c_factor" value={o.maxCollateralFactor} />
            <Stat label="Concentration (HHI)" value={o.concentrationHHI} />
          </div>

          <div className="space-y-2">
            {Object.entries(pool.factors).map(([key, f]) => (
              <p key={key} className="text-xs leading-relaxed text-slate-400">
                <span className="font-medium text-slate-300">{f.label}:</span>{" "}
                {f.rationale}
              </p>
            ))}
          </div>

          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-300">Reserves</p>
            {pool.reserves.map((r) => (
              <div
                key={r.asset}
                className="flex items-center justify-between font-mono text-xs text-slate-500"
              >
                <span>{r.asset.slice(0, 10)}…</span>
                <span>
                  util {(r.utilization * 100).toFixed(1)}% · c_f{" "}
                  {r.collateralFactor}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-lg bg-slate-900/50 p-2">
      <div className="text-slate-500">{label}</div>
      <div className="font-mono text-sm text-white">{value}</div>
    </div>
  );
}

export default function PoolRatings() {
  const [state, setState] = useState({ loading: true, data: null, error: null });

  const load = async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await fetch("/api/pools/ratings");
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error || "Ratings unavailable");
      }
      setState({ loading: false, data: json.data, error: null });
    } catch (e) {
      setState({ loading: false, data: null, error: e.message });
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <section className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold text-white">
            <Shield className="h-6 w-6 text-blue-400" />
            Blend Pool Risk Ratings
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Blend&apos;s permissionless mainnet lending pools, rated from{" "}
            <strong>live chain data</strong>. Which pool to put money in is a
            decision users actually make, and a pool — unlike a wallet — cannot
            escape a bad rating by opening a new address.
          </p>
        </div>
        <button
          onClick={load}
          disabled={state.loading}
          className="flex shrink-0 items-center gap-2 rounded-lg border border-slate-700/50 bg-slate-800/50 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700/50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${state.loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Honest framing — this is a rubric, not a prediction. */}
      <div className="mb-6 flex gap-3 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
        <p className="text-xs leading-relaxed text-slate-400">
          This is a <strong>transparent rubric</strong>, not a loss prediction. The
          weights are declared and every rating shows the raw inputs behind it, so
          you can audit the arithmetic or redo it with your own weights. There is no
          default or liquidation <em>label</em> data on chain, so nobody — us
          included — can claim a validated probability of loss.
        </p>
      </div>

      {state.loading && (
        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 p-8 text-center text-slate-400">
          Reading pools from chain…
        </div>
      )}

      {state.error && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {state.error}
        </div>
      )}

      {state.data && (
        <>
          <div className="grid gap-4">
            {state.data.pools.map((p) => (
              <PoolCard key={p.poolId} pool={p} />
            ))}
          </div>

          {state.data.failed?.length > 0 && (
            <p className="mt-4 text-xs text-slate-500">
              Could not read:{" "}
              {state.data.failed.map((f) => f.name).join(", ")}
            </p>
          )}

          <p className="mt-6 text-xs leading-relaxed text-slate-500">
            Source: {state.data.meta.source} · {state.data.meta.network} ·{" "}
            {state.data.meta.caveat}
          </p>
        </>
      )}
    </section>
  );
}
