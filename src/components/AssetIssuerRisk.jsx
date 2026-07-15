"use client";

import { useEffect, useState } from "react";
import { Search, AlertTriangle, Info, ShieldAlert, Snowflake, Lock, UserCheck } from "lucide-react";

/**
 * Asset issuer risk.
 *
 * Two on-chain facts, neither of which any Stellar tool currently surfaces:
 * whether this is the asset you think it is, and what the issuer can do to your
 * balance once you hold it. Unlike a wallet score, the subject cannot escape a
 * bad result by opening a new address — the issuer address is the asset.
 */

const PRESETS = ["USDC", "USDY", "EURC", "yXLM"];

const POWER_META = {
  canSeize: {
    label: "Can seize your balance",
    icon: ShieldAlert,
    severity: "high",
    detail:
      "Clawback is enabled. The issuer can take this asset back out of your wallet without your involvement.",
  },
  canFreeze: {
    label: "Can freeze your balance",
    icon: Snowflake,
    severity: "medium",
    detail:
      "The issuer can freeze your trustline. The balance stays visible but you cannot send, trade or redeem it.",
  },
  canBlock: {
    label: "Chooses who may hold it",
    icon: UserCheck,
    severity: "low",
    detail: "New holders must be authorized by the issuer before they can hold the asset.",
  },
  flagsLocked: {
    label: "Powers are locked forever",
    icon: Lock,
    severity: "info",
    detail:
      "The issuer's flags can never change. Protective when the powers above are off, permanent when they are on.",
  },
};

const SEVERITY_STYLES = {
  high: "border-red-500/30 bg-red-500/10 text-red-300",
  medium: "border-orange-500/30 bg-orange-500/10 text-orange-300",
  low: "border-blue-500/30 bg-blue-500/10 text-blue-300",
  info: "border-slate-600/40 bg-slate-700/20 text-slate-300",
};

function PowerBadges({ powers }) {
  const active = Object.entries(powers).filter(([, on]) => on);

  if (active.length === 0) {
    return (
      <p className="text-sm text-green-400">
        The issuer has no special powers over your balance — it cannot freeze or
        seize it.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {active.map(([key]) => {
        const meta = POWER_META[key];
        if (!meta) return null;
        const Icon = meta.icon;
        return (
          <div
            key={key}
            className={`flex gap-3 rounded-lg border p-3 ${SEVERITY_STYLES[meta.severity]}`}
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <div className="text-sm font-medium">{meta.label}</div>
              <p className="mt-0.5 text-xs leading-relaxed opacity-80">{meta.detail}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function IssuerRow({ issuer }) {
  const powers = Object.entries(issuer.powers)
    .filter(([, on]) => on)
    .map(([key]) => POWER_META[key]?.label)
    .filter(Boolean);

  return (
    <div className="flex items-center justify-between gap-4 border-t border-slate-700/40 py-2.5 text-xs">
      <div className="min-w-0">
        <div className="truncate text-slate-300">{issuer.domain || "no home domain"}</div>
        <div className="truncate font-mono text-[11px] text-slate-600">
          {issuer.issuer.slice(0, 10)}…{issuer.issuer.slice(-6)}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className="text-slate-400">{issuer.holders.toLocaleString()} holders</div>
        <div className="text-[11px] text-slate-600">
          {powers.length ? powers.join(" · ") : "no issuer powers"}
        </div>
      </div>
    </div>
  );
}

export default function AssetIssuerRisk() {
  const [code, setCode] = useState("USDC");
  const [query, setQuery] = useState("USDC");
  const [state, setState] = useState({ loading: true, data: null, error: null });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const res = await fetch(`/api/assets/risk?code=${encodeURIComponent(query)}`);
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json?.error || "Lookup failed");
        }
        if (!cancelled) setState({ loading: false, data: json.data, error: null });
      } catch (e) {
        if (!cancelled) setState({ loading: false, data: null, error: e.message });
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [query]);

  const submit = (e) => {
    e.preventDefault();
    const next = code.trim().toUpperCase();
    if (next) setQuery(next);
  };

  const data = state.data;
  const impostor = data?.balanceRankingWouldPick;
  const others = data?.issuers?.filter((i) => i.issuer !== data.dominant.issuer) ?? [];

  return (
    <section className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h2 className="flex items-center gap-2 text-2xl font-bold text-white">
          <Search className="h-6 w-6 text-blue-400" />
          Asset Issuer Risk
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Anyone can issue an asset called USDC on Stellar, and hundreds have. This
          answers two questions from live chain data: <strong>is this the real
          one</strong>, and <strong>what can the issuer do to your balance</strong>{" "}
          once you hold it.
        </p>
      </div>

      <form onSubmit={submit} className="mb-4 flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          aria-label="Asset code"
          placeholder="Asset code (e.g. USDC)"
          className="min-w-0 flex-1 rounded-lg border border-slate-700/50 bg-slate-800/50 px-4 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500/50 focus:outline-none"
        />
        <button
          type="submit"
          disabled={state.loading}
          className="shrink-0 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {state.loading ? "Reading…" : "Look up"}
        </button>
      </form>

      <div className="mb-6 flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => {
              setCode(p);
              setQuery(p);
            }}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${
              query === p
                ? "border-blue-500/50 bg-blue-500/15 text-blue-300"
                : "border-slate-700/50 bg-slate-800/50 text-slate-400 hover:text-slate-200"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {state.loading && (
        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 p-8 text-center text-slate-400">
          Reading issuers from chain…
        </div>
      )}

      {state.error && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {state.error}
        </div>
      )}

      {data && !state.loading && (
        <>
          <div className="mb-4 rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-lg font-bold text-white">
                {data.issuerCount.toLocaleString()} issuers use the code{" "}
                <span className="font-mono">{data.code}</span>
              </h3>
              <span className="text-xs text-slate-500">
                {data.totalHolders.toLocaleString()} holders in total
              </span>
            </div>

            <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4">
              <div className="mb-1 text-xs uppercase tracking-wide text-green-400/70">
                Most held — likely the real one
              </div>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-lg font-bold text-white">
                  {data.dominant.domain || "no home domain"}
                </span>
                <span className="text-sm text-slate-400">
                  {data.dominant.holders.toLocaleString()} holders ·{" "}
                  {(data.dominant.holderShare * 100).toFixed(1)}% of all holders
                </span>
              </div>
              <div className="mt-1 font-mono text-[11px] text-slate-600">
                {data.dominant.issuer}
              </div>
            </div>

            <div className="mt-4">
              <div className="mb-2 text-xs uppercase tracking-wide text-slate-500">
                What this issuer can do to your balance
              </div>
              <PowerBadges powers={data.dominant.powers} />
            </div>
          </div>

          {impostor && (
            <div className="mb-4 flex gap-3 rounded-xl border border-orange-500/20 bg-orange-500/5 p-4">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-400" />
              <div className="text-xs leading-relaxed text-slate-400">
                <p className="mb-1 font-medium text-orange-300">
                  Why holders and not balance
                </p>
                Ranked by issued balance instead, the top{" "}
                <span className="font-mono">{data.code}</span> issuer would be{" "}
                <span className="font-mono text-slate-300">
                  {impostor.domain || "an issuer with no home domain"}
                </span>{" "}
                — which has issued {Math.round(impostor.issued).toLocaleString()} of
                them to just {impostor.holders.toLocaleString()} holders. Minting a
                balance is free; every holder costs real XLM in account and trustline
                reserves. That is why this page ranks by holders.
              </div>
            </div>
          )}

          {others.length > 0 && (
            <div className="rounded-2xl border border-slate-700/50 bg-slate-800/30 p-5">
              <div className="mb-1 text-sm font-medium text-slate-300">
                Other issuers using this code
              </div>
              <p className="mb-2 text-xs text-slate-500">
                Showing {others.length} of {data.meta.total - 1}. These are look-alikes
                unless you have a reason to believe otherwise.
              </p>
              {others.map((i) => (
                <IssuerRow key={i.issuer} issuer={i} />
              ))}
              {data.meta.omitted > 0 && (
                <p className="mt-3 text-xs text-slate-600">
                  {data.meta.omitted.toLocaleString()} further issuers not shown.
                </p>
              )}
            </div>
          )}

          <div className="mt-6 flex gap-3 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
            <p className="text-xs leading-relaxed text-slate-400">{data.meta.caveat}</p>
          </div>

          <p className="mt-4 text-xs text-slate-500">
            Source: {data.meta.source} · {data.meta.network}
          </p>
        </>
      )}
    </section>
  );
}
