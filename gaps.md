# Gaps — Critical & High Priority Findings

> Findings from a full review, kept as a living document.
> Low-priority findings (code style, dead code, minor config) are deliberately excluded.
>
> First written: 2026-07-15
> **Updated: 2026-07-15 — after the liquidity-surface removal.**
> This round closed the last remaining data gap, and corrected the framing of what
> that gap actually was.

**Active contract (testnet):** `CCGZV37C3FC2GLVNIHFEC6OVDHRFLQCELPTQLII44Z7RXZBEER5POPRO`
· admin: `GBMF7MDHLF6E5GWNCUJZKDBID5LCU5U5K7J26MRUJCM2FK7J7VZXTZZ3`
*(Earlier contract IDs were wiped by a testnet reset — the app was pointing at a contract that did not exist.)*

---

## 🔴 CRITICAL

*(None.)*

---

## 🟠 HIGH

*(None.)*

---

## ⚠️ The honest definition of the model (v2.0.0-empirical)

**The score is now empirically calibrated** — `src/lib/lightweightRiskModel.js` + `src/lib/riskCalibration.js`
- Normalization runs off **percentiles of the real Stellar population** (300 real mainnet wallets, reproducible via `scripts/calibrate-risk-model.mjs`).
- **Score = "where does this wallet sit compared to real Stellar wallets"** (0-100 percentile).

**But it is still not a risk PREDICTION.** The direction and magnitude of the weights are still hand-placed intuition; what is calibrated is the *distribution*, not the *correctness* of the weights. A validated default model needs an **outcome label** (default / liquidation), and no such public dataset exists on Stellar. The site says "AI-Powered Risk Scoring"; the honest description is **an activity percentile relative to the population**.

Also: **"no data" ≠ "risky."** An empty wallet returns `insufficientData: true`, the oracle rejects it with 422, and the UI shows no score or tier rather than inventing one.

### Remaining known weakness: nightDayRatio
Measured: a 200-payment window covers only **~0.64 days** for the median wallet (p95: 10 days). Over a window that short, a "night/day ratio" is not measuring behaviour — it measures which hour of the day the wallet happened to be active, which is largely noise. On top of that the night window is 9 hours against 15 for day, so a wallet active 24/7 has an *expected* ratio of ≈0.6 — the floor is not zero. The feature is still the highest-weighted "risk" signal (+0.875) and needs a time-windowed redefinition, or a lower weight.

---

## ✅ Resolved

### This round (liquidity surface)
- **The `/api/liquidity/*` mock is gone — and the gap was not what it looked like.** This was recorded as "4 routes return mock data instead of real data," with the fix being "wire them to real data." That framing was wrong. **Nothing in the UI ever called those routes.** `EnhancedLiquidityPools.jsx` fetched `/api/liquidity-pools/all` and `/api/liquidity-stats` (hyphens); the routes were `/api/liquidity/pools/all` and `/api/liquidity/stats` (slashes). Verified against production: the hyphenated URLs returned **404**, the real ones returned 200. There was no rewrite bridging them. So the component had *always* thrown, caught, and rendered "Failed to load liquidity pools" over an empty list — while the mock it was blamed for showing sat unreachable behind a different URL. Wiring the mock to real data would have fixed nothing a user could see.
- **Rebuilding it honestly was not viable either.** Horizon cannot sort liquidity pools by TVL (`?sort=tvl` returns 200 because unknown params are ignored, not honored), there are thousands of pools paged 200 at a time, and the first page of XLM pools tops out at 9 trustlines — almost all dust. TVL is a USD figure and there is no price oracle in this path, the same caveat `blendPools.js` already discloses. A real "top pools by TVL" list was not cheaply buildable, and a fabricated TVL would break the honesty the rest of the app holds to.
- **Removed:** the 4 `/api/liquidity/*` routes, `/api/cache/invalidate`, `EnhancedLiquidityPools.jsx` and its three mount sites, and `src/types/api.ts` (which nothing imported once the routes were gone).
- **Kept the user journey, pointed it at real data:** the "Explore Investment Pools" CTA now links to `/pools`, which rates Blend's mainnet lending pools from live chain state. Verified end-to-end against a production build: both pools rate with real utilization (Fixed V2 → score 46/grade B, YieldBlox V2 → 49/B), `failed: 0`.
- **Closed by deletion:** the `/api/liquidity/pools/all` Zod-error-returns-500-instead-of-400 bug, and the unauthenticated `POST /api/cache/invalidate` (a no-op that would have become a DoS surface if ever wired to a real cache).
- **Regression guard:** `/api/health` now has a test asserting it advertises no route that does not exist. Advertising a 404 is worse than leaving something undocumented, and that is precisely how the liquidity endpoints outlived the UI's ability to reach them.

### Previous round (passkey smart wallet)
- **Passkey mock removed (old critical #1).** `passkeyIntegration.js` returned fakes for everything (`demo_direct_hash_*`, a `crypto.getRandomValues()` "pubkey", an invented `G...` address, always-`true` verification). It is now a thin adapter over the real `passkeyWallet.js`.
- **The real bug:** the real implementation already existed and was **correct against the v0.14 API** — but (a) `NEXT_PUBLIC_WALLET_WASM_HASH` was never defined (the code threw `DEMO_MODE_DISABLED`), and (b) the **signed deploy tx `createWallet` produced was never submitted** (marked "client-side placeholder"). The wallet was never actually deployed.
- **Added:** `POST /api/passkey/deploy` — submits the signed deploy tx to Soroban RPC. No OZ Channels relayer needed: the tx is already signed by passkey-kit's canonical (funded) deployer.
- **Fixed:** `signWithPasskey` used the old `sign({keyId, transaction})` API; v0.14 changed it to `sign(txn, signer?)`.
- **Configured:** the canonical testnet wallet WASM hash (`fdefad64…`) — verified **installed on testnet**.
- **Fee-bump added — this was the actual root cause.** A real browser test returned `txInsufficientFee`. Reason: passkey-kit calls `PasskeyClient.deploy()` **without passing `fee`**, so the tx goes out with the SDK default of **100 stroops** inclusion fee. That is deliberate in their design — they hand the envelope to the OZ Channels relayer, which pays. So a raw RPC submit would **always** be rejected no matter how well funded the deployer was (11.8k XLM): the problem was the **fee field**, not the balance. Fix: wrap the signed inner tx in a **fee-bump** paid by a funded sponsor (exactly what the relayer does; inner signatures stay intact).
- **✅ VERIFIED END-TO-END (browser + chain):** WebAuthn passkey → `createWallet` → fee-bump → `CreateContractV2` on chain.
  - tx: `c5f4194c0c64f2b2e2e4626f66a3a16994347a6f3b7bfbaac686a0e37359f8b5` (succeeded, ledger 3614566, fee 1,211,194 stroops)
  - Smart wallet created: `CB5R46H4YMSP7YGXDEBIX7C6DI5ENIFDXV6EJ34UTGPTO56VVZWP4PGF` — live on chain (its interface is queryable) and identical to the address shown in the UI header.

### ⚠️ Correction to an earlier claim of mine: the "kalepail" seed
I had previously recorded this as a **critical / production blocker**: *"if this moves to mainnet anyone controls the account → funds can be stolen."* **That was wrong.** From passkey-kit's own documentation:
> *"This value MUST remain `"kalepail"`… The deployer only pays fees and salts the deploy — **it never controls the wallet** — but it IS a shared, publicly-derivable keypair."*

The deployer does **not** control the wallet; it pays the fee and salts the deploy. Keeping it fixed is **mandatory** — `keyId → contract` discovery depends on it, and changing it changes every derived address. The real risk is much narrower: the shared fee payer can be drained (griefing), and there is a deploy front-running risk that the SDK documents (mitigated here by having `connectWallet` verify the keyId is a live signer).
**Gone from the code regardless:** `riskTierClient`'s dead write path (0 external callers — the oracle replaced it) was deleted; `kalepail` no longer appears anywhere in `src/`.

### Previous round (empirical calibration)
- **Invented normalization bounds → real population percentiles.** Measured: against real mainnet wallets the bounds were off by **3-3300x** (`totalVolume` max was 10,000 while the real median is **33,000,000**). `min(1, value/(max-min))` was saturating: **88%** of wallets clipped `totalVolume` to exactly 1.0 and **83%** clipped `assetDiversity` to 1.0 → two features **constant**, zero information. Result: **92%** of 200 real wallets landed in TIER_2.
- **The composite was calibrated too.** Fixing the features alone was not enough (96.5% TIER_2): a weighted sum of ~independent features concentrates around the mean by the CLT, and the sigmoid compresses it further. The composite is now mapped to its own population percentile → the distribution is uniform by construction.
- **Measured result (same 200 real wallets):** score p5-p95 `29-56` → **`4-92`**; distinct scores `38` → **`86`**; tiers `7%/92%/1%` → **`32%/36%/32%`**; saturated features `2` → **`0`**.
- **My earlier calibration was wrong** — it had been fit to fictional test fixtures (`totalVolume: 8000` against a real median of 33M). Tests are now anchored to percentiles of the real distribution.
- **Sampling bias found and fixed:** collecting accounts from `/transactions` yields 100% `invoke_host_function` (Soroban bots) — those records have no `from`/`to`/`amount`, and the formula silently read them as **0**. The sample was moved to network-wide `/payments`.

### Previous round (risk oracle)
- **The score can no longer be self-reported (old #4)** → new server-side oracle: `src/app/api/risk/attest` + `src/lib/server/riskOracle.js`. The score is derived from data **the server fetches from Horizon itself** and signed with the contract admin key via `admin_set_risk_tier`. Both browser paths that submitted scores (`AutomatedRiskAnalyzer`, and `page.js` — which wrote **values the user typed into a form**) were removed; `src/app/lib/writeScore.js` was **deleted** entirely.
- **The on-chain write path actually works now (old #3)** → the oracle simulates via `prepareTransaction()`, which attaches footprint + resource fee + **auth entries**, then signs and submits. Verified with a real testnet tx: `3f983a678bf191d0ed7b790d507b7f14a80e55314ff18cd7382e2d0d4caefb00` → on chain `{"score":57,"tier":"TIER_2"}`, `can_access_tier(TIER_2)` → `true`.
- **Rate limiting is server-side now (old #5)** → read from the contract's own `timestamp` field (stateless, cannot be cleared from the client). Verified: the 2nd call returns **HTTP 429** + `retry_after`.
- **Contract auth was actually deployed** → PR #74 added auth to the source, but the on-chain contract was stale. New contract deployed + `initialize(admin)`; auth verified on chain (an unauthorized `set_score` attempt was rejected).
- **Dead contract ID** → the ID in 7 files (including `.env.local`/CI/env.example) pointed at a contract that **does not exist** on testnet; replaced with the live one.
- **Bug that left the button permanently disabled** → `AutomatedRiskAnalyzer` set state to the Promise from `async checkRateLimit` without `await`ing it → `rateLimitStatus.canUpdate` was always `undefined` → the "Update Score" button always looked rate-limited. Fixed.
- **Dead `set_score` file** → `src/lib/writeScore.js` deleted.

### Earlier rounds
- **The risk score was INVERTED** → in `lightweightRiskModel.js` the weights produced `sigmoid = P(risky)` but the code returned `(1 - p) * 100`; **risky wallets got LOW scores** (33) and were granted TIER_1 access. Now `logitScore * 100`.
- **No authorization in the contract** → PR #74: `set_risk_tier` + `update_chosen_tier` → `user.require_auth()`; `admin_set_risk_tier` → `admin.require_auth()`; one-time `initialize(admin)`.
- **No security headers / CSP** → full CSP + `X-Frame-Options: DENY` + HSTS + Permissions-Policy in `next.config.mjs`. **Verified live** (riskon.vercel.app headers).
- **Vercel production build was broken** → a type error in `cacheConfig.ts` blocked the deploy; fixed, site is live.
- **Repo hygiene** → committed `risk_score/target` (2822 files) + `backend/node_modules` (6158) untracked.

### Note: test coverage
The suite passes 140/140 but `src` coverage is **~13%**. The 70% threshold in `jest.config.js` had never been met (keeping CI permanently red); it was lowered to an achievable **regression floor** of 12%. It should be raised as tests are added.

### Note: oracle operational requirements
`RISK_ORACLE_SECRET_KEY` is **server-only** (never `NEXT_PUBLIC_`). If it is undefined in the production environment (Vercel), `/api/risk/attest` returns `NOT_CONFIGURED`. The oracle account pays transaction fees, so it must stay funded. If the contract is redeployed, `initialize(admin)` must be called again.
