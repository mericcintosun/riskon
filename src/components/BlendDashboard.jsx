"use client";

import { useState, useEffect, useCallback } from "react";
import { AlertTriangle, Info, RefreshCw, ExternalLink } from "lucide-react";

import {
  loadPool,
  loadUserPosition,
  executeBlendOperation,
} from "../lib/blendClient";
import { ACTIVE_POOLS, POOL_METADATA } from "../lib/blendConfig";

/**
 * Blend lending dashboard — real contract reads and real transactions.
 *
 * WHAT THIS REPLACES
 * ------------------
 * The previous version was a demo wearing production labels:
 *   * Supply/Borrow called stellarUtils.executeRealOperation, which did a health
 *     check and then invented `STELLAR_ENHANCED_${Date.now()}_${Math.random()}`
 *     as a "hash". The wallet was never prompted, nothing was built, signed or
 *     submitted — and the user was told "✅ Transaction successful!".
 *   * "🚀 LIVE" / "Fully operational" / "✓ Contract Accessible" came from
 *     `address.length === 56 && startsWith("C")`, a string check. The pools it
 *     said that about were verified NOT to exist on testnet.
 *   * Supply/Borrow APRs were literals: "Est: 4.5%", "Demo: 4.0%".
 *   * "My Position" came from createMockPositions() — always an empty Map — so a
 *     user with a real position was shown "No collateral deposited yet" and a
 *     borrow limit of 0.
 *
 * Everything below is read from the pool contract or surfaced as an error.
 * Nothing here invents a value or a success.
 */

const POOL_ID = Object.values(ACTIVE_POOLS)[0];
const EXPLORER = "https://stellar.expert/explorer/testnet/tx";

function pct(x) {
  return `${(x * 100).toFixed(1)}%`;
}

function OperationForm({ pool, walletAddress, kit, onDone }) {
  const [operation, setOperation] = useState("supply");
  const [assetId, setAssetId] = useState(pool.reserves[0]?.assetId ?? "");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await executeBlendOperation({
        poolId: pool.poolId,
        operation,
        assetId,
        amount,
        userAddress: walletAddress,
        // wallets-kit: signTransaction(xdr, opts) -> { signedTxXdr }
        signTransaction: (xdr, opts) => kit.signTransaction(xdr, opts),
      });
      setResult(res);
      setAmount("");
      onDone?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {["supply", "withdraw", "borrow", "repay"].map((op) => (
          <button
            key={op}
            type="button"
            onClick={() => setOperation(op)}
            className={`rounded-lg border px-3 py-2 text-sm capitalize transition-colors ${
              operation === op
                ? "border-blue-500/50 bg-blue-500/15 text-blue-300"
                : "border-slate-700/50 bg-slate-800/50 text-slate-400 hover:text-slate-200"
            }`}
          >
            {op}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <select
          value={assetId}
          onChange={(e) => setAssetId(e.target.value)}
          aria-label="Asset"
          className="rounded-lg border border-slate-700/50 bg-slate-800/50 px-3 py-2 text-sm text-white"
        >
          {pool.reserves.map((r) => (
            <option key={r.assetId} value={r.assetId}>
              {r.code}
            </option>
          ))}
        </select>
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          type="number"
          step="any"
          min="0"
          placeholder="Amount"
          aria-label="Amount"
          className="min-w-0 flex-1 rounded-lg border border-slate-700/50 bg-slate-800/50 px-3 py-2 text-sm text-white placeholder-slate-500"
        />
        <button
          type="submit"
          disabled={busy || !walletAddress || !amount}
          className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium capitalize text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {busy ? "Confirm in wallet…" : `${operation} on Blend`}
        </button>
      </div>

      {!walletAddress && (
        <p className="text-xs text-slate-500">Connect a wallet to transact.</p>
      )}

      {/* Shown only for a transaction that actually reached SUCCESS on chain.
          The old code printed this without ever submitting anything. */}
      {result && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-xs text-green-300">
          <span>Confirmed in ledger {result.ledger}.</span>
          <a
            href={`${EXPLORER}/${result.hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 underline"
          >
            View transaction <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}

      {error && (
        <div className="flex gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </form>
  );
}

function Position({ position, pool }) {
  if (!position) return null;

  if (!position.hasPosition) {
    return (
      <p className="text-sm text-slate-500">
        No position in this pool yet — read from the pool contract, not assumed.
      </p>
    );
  }

  const groups = [
    ["Collateral", position.collateral],
    ["Borrowed", position.liabilities],
    ["Supplied", position.supply],
  ].filter(([, entries]) => entries.length > 0);

  return (
    <div className="space-y-3">
      {groups.map(([label, entries]) => (
        <div key={label}>
          <div className="mb-1 text-xs uppercase tracking-wide text-slate-500">
            {label}
          </div>
          {entries.map((e) => (
            <div
              key={`${label}-${e.reserveIndex}`}
              className="flex justify-between border-t border-slate-700/40 py-1.5 text-sm"
            >
              <span className="text-slate-300">
                {pool.reserves[e.reserveIndex]?.code ?? `reserve #${e.reserveIndex}`}
              </span>
              <span className="font-mono text-slate-400">
                {e.amount.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      ))}
      <p className="text-xs text-slate-600">
        Amounts are the pool&apos;s bTokens/dTokens exactly as the contract stores
        them. Converting to an asset amount needs the pool oracle, which this path
        does not read — so it is not converted rather than guessed.
      </p>
    </div>
  );
}

export default function BlendDashboard({ kit, walletAddress }) {
  const [state, setState] = useState({ loading: true, pool: null, error: null });
  const [position, setPosition] = useState(null);

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const pool = await loadPool(POOL_ID);
      setState({ loading: false, pool, error: null });
    } catch (err) {
      // A pool that cannot be read now says so. The old code badged it
      // "Fully operational" without ever contacting the chain.
      setState({ loading: false, pool: null, error: err.message });
    }
  }, []);

  const loadPosition = useCallback(async () => {
    if (!walletAddress) {
      setPosition(null);
      return;
    }
    try {
      setPosition(await loadUserPosition(POOL_ID, walletAddress));
    } catch {
      setPosition(null);
    }
  }, [walletAddress]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    loadPosition();
  }, [loadPosition]);

  const meta = POOL_METADATA[POOL_ID];
  const { pool } = state;

  return (
    <section className="rounded-2xl border border-slate-700/50 bg-slate-800/40 p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white">
            {meta?.name ?? "Blend Pool"}
          </h3>
          <p className="mt-1 max-w-2xl text-xs text-slate-400">{meta?.description}</p>
        </div>
        <button
          onClick={() => {
            load();
            loadPosition();
          }}
          disabled={state.loading}
          className="flex shrink-0 items-center gap-2 rounded-lg border border-slate-700/50 bg-slate-800/50 px-3 py-2 text-xs text-slate-300 hover:bg-slate-700/50 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${state.loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {state.loading && (
        <p className="text-sm text-slate-400">Reading the pool from chain…</p>
      )}

      {state.error && (
        <div className="flex gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">This pool could not be read from chain.</p>
            <p className="mt-1 text-xs opacity-80">{state.error}</p>
            <p className="mt-2 text-xs opacity-80">
              A testnet reset wipes contracts. If that is what happened, the
              addresses in blendConfig.js need refreshing from
              blend-capital/blend-utils.
            </p>
          </div>
        </div>
      )}

      {pool && (
        <>
          <div className="mb-6 overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-slate-700/50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="pb-2">Reserve</th>
                  <th className="pb-2 text-right">Supplied</th>
                  <th className="pb-2 text-right">Borrowed</th>
                  <th className="pb-2 text-right">Utilization</th>
                  <th className="pb-2 text-right">Collateral factor</th>
                </tr>
              </thead>
              <tbody>
                {pool.reserves.map((r) => (
                  <tr key={r.assetId} className="border-b border-slate-700/30">
                    <td className="py-2 text-slate-300">{r.code}</td>
                    <td className="py-2 text-right font-mono text-slate-400">
                      {r.supply.toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="py-2 text-right font-mono text-slate-400">
                      {r.borrow.toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="py-2 text-right font-mono text-slate-400">
                      {pct(r.utilization)}
                    </td>
                    <td className="py-2 text-right font-mono text-slate-400">
                      {r.collateralFactor.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mb-6 flex gap-3 rounded-xl border border-blue-500/20 bg-blue-500/5 p-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
            <p className="text-xs leading-relaxed text-slate-400">
              Figures are native asset units read from the pool contract, not USD
              — there is no price oracle on this path. Interest rates are set by
              Blend&apos;s per-reserve model and are omitted rather than
              estimated.
            </p>
          </div>

          <div className="mb-6">
            <div className="mb-2 text-xs uppercase tracking-wide text-slate-500">
              Your position
            </div>
            <Position position={position} pool={pool} />
          </div>

          <OperationForm
            pool={pool}
            walletAddress={walletAddress}
            kit={kit}
            onDone={loadPosition}
          />
        </>
      )}
    </section>
  );
}
