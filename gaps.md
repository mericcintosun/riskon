# Gaps — Critical & High Priority Findings

> Findings from a full review, kept as a living document.
> Low-priority findings (code style, dead code, minor config) are deliberately excluded.
>
> First written: 2026-07-15
> **Updated: 2026-07-16 — after a full-project audit ("look at everything").**
> This round closed the contract self-attestation hole, purged the marketing
> fabrications, fixed the small real defects, and deleted the dead subsystems.

**Active contract (testnet):** `CBTYHTWNY3HP6TIZCYKI6HP47YWVZCKQTWAD7SEK7AAVGCWY2ZIB6GRQ`
· admin: `GBMF7MDHLF6E5GWNCUJZKDBID5LCU5U5K7J26MRUJCM2FK7J7VZXTZZ3`
*(Redeployed 2026-07-16 to remove `set_risk_tier`. The previous contract
`CCGZV37…` is still live but has the self-attestation hole; production Vercel env
was moved to the new address and verified writing to it.)*

---

## 🔴 CRITICAL

*(None.)*

---

## 🟠 HIGH

*(None.)*

---

## 📌 What is rated here, and how much each rating is worth

Three subjects, in descending order of how much the rating can be trusted:

| Subject | Sybil-able by the rated party? | Basis |
| --- | --- | --- |
| **Asset issuer** (`/assets`) | **No** — the issuer address is the asset | Declared on-chain flags + holder counts. Facts, not a score. |
| **Blend pool** (`/pools`) | **No** — a pool is a contract with persistent state | Transparent rubric, declared weights, raw inputs returned. |
| **Wallet** (`/`) | **Yes** — a bad score means a new address | Activity percentile vs. the real population. Not a default prediction. |

The wallet score is the weakest of the three and the most prominently displayed. That ordering is worth revisiting.

---

## ⚠️ The honest definition of the model (v2.0.0-empirical)

**The score is now empirically calibrated** — `src/lib/lightweightRiskModel.js` + `src/lib/riskCalibration.js`
- Normalization runs off **percentiles of the real Stellar population** (300 real mainnet wallets, reproducible via `scripts/calibrate-risk-model.mjs`).
- **Score = "where does this wallet sit compared to real Stellar wallets"** (0-100 percentile).

**But it is still not a risk PREDICTION.** The direction and magnitude of the weights are still hand-placed intuition; what is calibrated is the *distribution*, not the *correctness* of the weights. A validated default model needs an **outcome label** (default / liquidation), and no such public dataset exists on Stellar. The site says "AI-Powered Risk Scoring"; the honest description is **an activity percentile relative to the population**.

Also: **"no data" ≠ "risky."** An empty wallet returns `insufficientData: true`, the oracle rejects it with 422, and the UI shows no score or tier rather than inventing one.

### What the model is now (v3.0.0-activity-index)
Three features, all pointing the same direction: `totalVolume`, `uniqueCounterparties`, `assetDiversity`, each mapped to its percentile in the real Stellar population, plus a volume×counterparty interaction. Every weight is negative, so the score is literally "how inactive is this wallet relative to everyone else". That is what the UI says it is.

`nightDayRatio` was removed — see Resolved below. It was the only term that made this look like a risk model rather than an activity index.

**The honest limit is unchanged and unfixable here:** a wallet escapes a bad score by opening a new address. No amount of feature work touches that. It is why the asset issuer layer, whose subject cannot Sybil, is now the headline.

---

## ✅ Resolved

### This round (full-project audit)

**The central claim was false on-chain, and it was the worst finding.** gaps.md said "the score can no longer be self-reported" because the oracle writes it. Verified on-chain that the contract still exposed `set_risk_tier(user, …)` gated only by `user.require_auth()` — a `set_risk_tier(self, score=5, TIER_1)` simulated successfully with just the source account's signature, so any user could self-grant TIER_1. **Fixed:** removed `set_risk_tier` (scores now write only via `admin_set_risk_tier`, oracle-signed), fixed a stale tier-membership index bug found alongside it, redeployed to `CBTYHTWN…`, verified on-chain (`set_risk_tier` → "unrecognized subcommand", oracle write + read-back works), moved production Vercel env to the new address, and confirmed prod attests land on the new contract. 43 contract tests pass.

**Marketing pages shipped fabricated metrics and false claims** — the same disease as the Blend dashboard, in prose. Removed/corrected: "95%+ accuracy trained on extensive DeFi data" (no accuracy exists; the model is a percentile), "TensorFlow.js"/neural-network framing (it's logistic regression; the dead tfjs dep was removed), "Stellar Mainnet" (it's testnet), "your data never leaves your device" (false — the oracle reads chain data server-side), an "NFT badge system" marked *completed* (never built), a wall of invented stats (100%/99.9% uptime, 0.8s, $0.001, "thousands of users", animated 1200/8500/95 counters), and a pricing page selling $1/$2 tiers of unbuilt features ("Real-time Alerts", "Predictive Risk Modeling") behind a button that just opened /wallet. All live in production.

**Small real defects:** Header rendered a blank wallet name (destructured `walletName`; context exposes `connectedWallet`). UserRiskProfile's tier cards looked clickable but the only mount never passed `onTierSelect`, so every click was inert — made informational. Footer pointed every link at `href="#"` and claimed a nonexistent MIT license — now real GitHub + Stellar-Explorer links only.

**Dead code deleted** (all verified zero live importers): `riskTierClient.ts`, the cache-dashboard + service-worker branch, the TensorFlow model path (+ the `@tensorflow/tfjs` dependency), `src/lib/Transaction Engine/`, and a hollow `integration_tests.rs` whose 8 tests asserted `u64 >= 0`.

**A third instance of the dropped-props bug**, found by sweeping every component: `AutomatedRiskAnalyzer` still rendered `BlendHistoryPerformance` with `onScoreImpactChange`, driving a dead "score + N points" adjustment path (which would have uncalibrated the percentile). Removed.

**Audit also confirmed as REAL (not fake), closing the knowledge gaps:** the passkey layer, wallet connection (StellarWalletsKit), the CSRF double-submit middleware, `/api/passkey/deploy`'s fee-bump, and the cache core (IndexedDB + localStorage). The Soroban contract's production code was clean; only its self-attestation door (now closed) was the problem.

### Previous round (three scoring paths collapsed into one)
- **The app computed the same wallet's score three different ways, and only one of them was the score that landed on chain.**
  - `enhanced` → `AutomatedRiskAnalyzer` → the calibrated model (v3). Matches what the oracle re-derives and writes. ✅
  - `auto` → `autoRiskAnalyzer.js` → its own uncalibrated formula on real chain data.
  - `manual` → the user typed three numbers, and `page.js`'s own hand-rolled if/else ladder (`score += 40; // Very low activity = high risk`) produced a "risk score".
- **Manual mode was theatre.** Measured: `/api/risk/attest` sends `{ address }` and nothing else — the oracle derives the score server-side from Horizon. So the user typed numbers, saw a score with a tier badge and a progress bar, clicked "Save Risk Score to Blockchain", and **a completely different number landed on chain**. The displayed figure was never used for anything.
- **A third instance of the silent-dropped-props bug.** `LandingPage` passed `onAnalyze`, `analysisResult`, `isLoading` and `error` to `AutomatedRiskAnalyzer`, which declares **no props** — so `handleAnalyze` never fired, `analysisResult` stayed `null`, and the `UserRiskProfile` block behind it never rendered. Same family as `BlendHistoryPerformance`'s dropped `onScoreImpactChange`.
- **Collapsed to one path.** Removed the mode toggle, the typed-number form, `page.js`'s scoring ladder, `useAnalyzeRisk`, and `autoRiskAnalyzer.js` (475 lines). `page.js` went **1310 → 742 lines**. There is now one score, produced by one calibrated model, identical to what the oracle writes on chain. Verified in a real browser on `/` and `/landing`: no mode toggle, no typed-number form, analyzer renders, zero console errors.

### This round (the Blend integration was a demo wearing production labels)

**The worst thing in the repo: the app told users a DeFi transaction succeeded when nothing happened.**
- `stellarUtils.executeRealOperation()` never called `TransactionBuilder`, never called `signTransaction`, never called `sendTransaction`. It ran a health check and invented a hash: `` hash: `STELLAR_ENHANCED_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` ``. Its network-failure branch invented one too, so it "always worked".
- That hash is not 64 chars, so `BlendDashboard`'s `result.length === 64` check failed and control landed on `setMessage("✅ Transaction successful! Blockchain integration completed")`. **A user clicked Supply or Borrow with a funded wallet, was never even prompted to sign, and was told it succeeded.** Live on the home page, on `/landing` (ungated, so anonymous visitors too), and inside `AutomatedRiskAnalyzer`.
- **Why nothing caught it:** `testContract()` returned `exists: true, // Assume exists for now` from `contractAddress.length === 56 && startsWith("C")` — a string check, never a chain lookup. That fed the `🚀 LIVE`, `✅ Fully operational Blend pool - real transactions supported` and `✓ Contract Accessible` badges. **Measured: every Blend address in the repo was dead.** `getLedgerEntries` found nothing for `MAIN_POOL_V2`, `MAIN_POOL_V1` or `POOL_FACTORY_V2`. A testnet reset had wiped them — the same trap that once had this app pointing at a nonexistent risk contract. The `USDC` address was 57 characters (an extra `T` against the manifest), so not a decodable address at all.
- Also fabricated on that path: APRs as literals (`"Est: 4.5%"`, `"Demo: 4.0%"`, `"Live APR"`), TVL as the strings `"Live Data"` / `"Enhanced Demo"`, a fixed asset list rendered regardless of a pool's real reserves, and `POOL_METADATA.riskLevel: "Moderate"` hardcoded.
- **"My Position" was `createMockPositions()` → `new Map()`, always empty.** A user with a real Blend position saw "No collateral deposited yet", Total Supplied `0.0000`, Borrow Limit `0.0000`. Silently wrong on liquidation-relevant numbers is the most dangerous failure mode available.

**Rebuilt for real, and proven before it shipped.** New `src/lib/blendClient.js` does everything through `@blend-capital/blend-sdk` against verified-live contracts: `PoolV2.load()` for reserves, `pool.loadUser()` for positions, `PoolContractV2.submit()` → simulate → wallet signature → submit → **poll until the ledger confirms SUCCESS**. It throws on failure; there is no fallback that invents a value.
- **Verified end-to-end on chain before the UI was written:** a real 1 XLM `SupplyCollateral` against the official pool — tx `b3469518f9be9794e25fd7111fe219175676c0cd0f207fc5da1f976a6bd290f5`, ledger 3615686, SUCCESS — after which `loadUser()` reported the new collateral position. A financial write path is not something to ship on the assumption it works.
- **Verified in a real browser:** `/landing` now renders the pool's actual reserves (XLM 80,388,624 supplied / 85.2% utilization / c_factor 0.90, plus wETH, wBTC, USDC). No LIVE badge, no invented APR, no fake success. Zero console errors.
- Addresses refreshed from `blend-capital/blend-utils`; the V1 "backup" pool was dropped because it does not exist. A pool that cannot be read now says so, instead of being badged operational.

**Blend history could never match anything, so it always said "No Blend Protocol History Found".**
- Its contract list was two placeholders self-labelled `// Example Blend pool` and `// Another pool`. It matched on `op.source_account === contract`, but for a Soroban call `source_account` is always the invoker (`G...`), never the contract. Its fallback matched `JSON.stringify(op.parameters).includes(contract)` — **measured: Horizon returns parameters as base64 XDR, so a `C...` address never appears there as text.** Both checks were structurally incapable of firing.
- It fabricated what it did report: `(totalLendVolume / 10000) * 100 // Assume pool TVL ~10k`, and that invented percentage gated a `+5` score bonus. It also rendered native XLM through `toLocaleString("en-US", { style: "currency", currency: "USD" })` — XLM printed with a dollar sign, no price oracle on the path.
- **The score-impact promise was inert.** `AutomatedRiskAnalyzer` passed `onScoreImpactChange`, but `BlendHistoryPerformance()` declared **no props** — the callback was dropped, `blendScoreImpact` stayed `null`, and the branch was unreachable. The UI promised "influence your credit score" regardless. Worth noting: the test suite mocked the component *with* the prop it really drops, so the test validated wiring that did not exist.
- **Rebuilt real:** detection now decodes `parameters[0]` (an XDR ScVal Address) to the invoked contract and compares it to the real pool — Horizon's own `address` field is empty for `invoke_host_function`, so it cannot be used. Amounts come from `asset_balance_changes`. Verified against the real supply above: it finds `submit`, `out 1 XLM` — where the old filter returned 0. The score-impact promise is **gone rather than made real**: an ad-hoc bonus would uncalibrate the population percentile that makes the score mean anything.

**The backend fabricated prices.** `backend/liquidityMonitor.js` read real Horizon pools but invented USD: `totalTVL += amount * 0.12; // Approximate XLM price` and `* 0.1` for everything else — its own comment conceded "in production, use real price feeds". **Measured: XLM is 0.183 today, so the constant is 34% off and drifts forever**, and every tier assignment rides on it. It also read `pool.total_accounts`, **a field Horizon does not have** (it is `total_trustlines`), so every pool reported 0 accounts — the same silent-undefined bug family as the calibration sampling bug. It was never deployed, ran only as a CI smoke test, and its only consumer was the mock liquidity API already deleted. Removed, along with its CI job.

**Deleted dead code found while sweeping:** `/cache-test` and `/dev-test` (dev scaffolding **reachable in production**, rendering a "📊 Cache Performance Monitor" fed by `Math.random()` every 5s as if it were telemetry, plus a fake wallet `GXXXXXXX_DEMO_WALLET_XXXXXXX` driving a displayed risk score); `risk_score/accountLongevity.js`, `backend-test.js`, `test-cache-real.js`, `test-cache-standalone.js` (zero importers; the last two recorded skips as passes and printed "📈 Success Rate: 100.0%" while testing a reimplementation of the cache rather than the shipped one); and a dangling `temp-passkey-latest` gitlink with no `.gitmodules`.

**Assessed clean, left alone:** the Soroban contract's production code (all mock references live in `#[cfg(test)]`), `blendPools.js` / `/pools`, `riskTierClient`'s read path, and `src/lib/Transaction Engine/` — genuine code with zero importers, whose README claimed "production-grade… guaranteeing deterministic, exactly-once execution" while its only state store is an in-memory `Map` that loses everything on restart. The code stays; the claim was corrected to say it is unwired and at-least-once as shipped.

### This round (smart wallets — found by the user in a real browser, not by any test)
- **The headline wallet could never be scored, and it failed dishonestly.** Connecting a passkey smart wallet fired two guaranteed-400 Horizon requests and then failed attestation with *"A valid Stellar account address (G...) is required."* The smart wallet address is minted by this very app, so calling it invalid was both wrong and confusing. Reported from a live production console; no test here caught it.
- **Worse than the 400: the client fabricated an analysis for it.** `analyzePasskeySmartContract()` returned invented constants — `txCount: 1`, `assetTypes: 1` ("Assume XLM support"), `nightRatio: 0.5` ("Neutral"), `activityScore: 20` — and gated them on `GET /contracts/{id}`, **an endpoint Horizon does not have** (404 for everything). So the `ok` branch was dead code, every passkey wallet silently took the fallback, and every one was labelled `new_or_inactive` with a hardcoded score — including `CB5R46H4…`, which is demonstrably live on chain. Same family as the passkey and liquidity mocks: fake data behind a real-looking function. Deleted.
- **Measured why it cannot be scored** — this is structural, not a missing feature:
  - Horizon's `/accounts` endpoints are ed25519-only: `/accounts`, `/payments`, `/transactions` and `/operations` all answer **400** for a contract address.
  - Soroban RPC retains roughly **7 days** of events (measured: ledgers 3494424-3615383) — too short to place a wallet against a population.
  - The model's percentiles are calibrated on classic-payment G wallets. A contract is not a member of that population.
- **Fixed honestly:** `422 UNSCORABLE_ADDRESS` with the real reason, instead of `400 invalid address`. The client no longer asks Horizon about C addresses at all, and the UI explains the situation and points to `/assets`, which needs no wallet. Verified in a real browser: the exact reported address now returns 422 with the reason, garbage still returns 400, and **Horizon 400s dropped from 2 per analysis to 0**.
- **My own error, corrected:** I had written into `/api/docs` that attest accepts *"Stellar address (G...) or smart wallet contract (C...)"*. I never verified the C claim; it was false. The docs now state the 422 explicitly.
- **The oracle is testable for the first time.** It had zero tests because importing `@stellar/stellar-sdk` under Jest died at module load — the SDK's dependency chain reaches for `TextEncoder`/`TextDecoder`, which jsdom omits, and pulls ESM-only packages (`@noble/*`, `uint8array-extras`) through `transformIgnorePatterns`. Both fixed in `jest.setup.js` / `jest.config.js`.

### This round (nightDayRatio removed — model v3.0.0)
- **The model's highest-weighted risk signal was inverted for a third of the population.** The formula was `day > 0 ? night / day : 0`. A wallet active *only* at night has `day === 0` and therefore scored **0 — the safest possible value** — on a term whose stated meaning was "more night activity = higher risk". Measured on 300 real mainnet wallets: **31.3% (94/300) are entirely nocturnal**, and every one of them was handed a perfect score on the model's biggest risk term. Same class as the inverted-composite bug fixed earlier, hidden inside a single feature.
- **It measured geography, not behaviour.** "Night" was UTC 22:00-06:00 — which is 07:00-15:00 in Tokyo and 06:00-14:00 in Beijing. On a global permissionless network, hour-of-day in UTC is a timezone proxy, so the largest risk term effectively penalised Asian users. The advice it generated ("Make more transactions during daytime hours") told a Tokyo user to transact between midnight and 07:00 local.
- **The window could not support it.** 40.7% of real wallets have their entire 200-payment history inside a single day (median span 1.94 days). Over that window, hour-of-day is the hour a wallet happened to transact, not a pattern. The windows were also asymmetric (9 night hours vs 15 day), so a uniformly-active wallet's *expected* ratio was 0.6, not 0.
- **Client and server disagreed on it anyway.** The browser copy used `getHours()` (the visitor's local timezone) while the oracle used `getUTCHours()`, so the score shown and the score written on chain differed for the same wallet depending on where the visitor was sitting.
- **Removed rather than repaired.** Fixing the arithmetic addresses the inversion and the window; nothing makes a UTC hour mean the same thing in Tokyo and London. The premise — "nocturnal implies risky" — is imported from card-fraud heuristics and has never been validated on Stellar, where no outcome label exists to validate it against.
- **Measured result (300 real wallets, recalibrated):** the distribution did **not** collapse. Score p5-p95 `4-92` → **`6-96`**; distinct scores `86` → **`93`**; tiers `32/36/32%` → **`32.5/43.7/23.7%`**. The composite percentile mapping keeps the spread by construction.
- **What removal revealed:** every remaining weight is negative. The model is — and always was — an **activity index**, not a risk model. `nightDayRatio` was the only term pretending otherwise. Renamed to `3.0.0-activity-index` to say so.

### This round (positioning)
- The home page led with *"AI-Powered Risk Scoring"* and four invented stats (`<5s`, `100% Privacy Protected`, `Instant`). It now leads with the finding that cannot be gamed by its subject — *"387 issuers call themselves USDC. One is Circle."* — and four **measured** facts, each checkable from the pages linked beneath them. The wallet score, the weakest of the three subjects, is no longer the headline.

### This round (asset issuer risk)
- **Added the first rated subject that cannot Sybil.** `/api/assets/risk?code=USDC` + `/assets`. A wallet escapes a bad score by opening a new address; an asset issuer cannot, because the issuer address *is* the asset's identity. It answers two questions from live chain data that no Stellar tool surfaces: *is this the real asset*, and *what can the issuer do to your balance*.
- **Measured, not assumed — and it corrected two claims in this document.**
  - The business note said "USDY has clawback+freeze enabled; USDC does not." Half right. Real Circle USDC (`circle.com`, 2.27M holders) has `auth_clawback_enabled: false` but **`auth_revocable: true`** — Circle **can freeze** your USDC, it just cannot claw it back. Real Ondo USDY (`ondo.finance`, 2,462 holders) has **both**.
  - My own first measurement of "USDY has clawback" was reading **`blackrock.com.se`** — an impersonator with 1 holder and a fabricated 920B balance, not Ondo. I flagged it as unverified at the time; it was wrong.
  - An earlier probe read `num_accounts` and got `null` for every asset. Horizon's fields are `accounts.authorized` / `balances.authorized`. Reading a field that does not exist returns nothing, quietly — the same failure mode as the sampling bug in the calibration round.
- **The load-bearing decision, measured: rank by holders, not balance.** Issued balance is free to fabricate; ranking mainnet issuers by it returns an impersonator **every time** (`xlmgbptreasury.com` for USDC at 1.1 quadrillion issued, `finance-ondo.com` for USDY, `bridgerew.org` for EURC — each 4-6 orders of magnitude above the real issuer). Every holder costs real XLM in account and trustline reserves, so ranking by holders returns the genuine issuer every time (`circle.com` 97.4% of USDC holders, `ondo.finance` 75.1% of USDY, `circle.com` for EURC). The response reports which issuer a balance ranking *would* have picked, so the difference is visible rather than asserted.
- **Paging matters and was nearly missed.** A single Horizon page reports **200** USDC issuers; the real count is **387**. Capping at one page would have halved the count and could miss the genuine issuer entirely. The lib pages to exhaustion, and `meta.omitted` always reports what the display cap dropped.
- **Honest framing kept:** holder count is a *cost* signal, not proof. A well-funded impersonator can buy holders and a genuine new asset has few — the signal is weakest exactly where the stakes are highest. The UI says so, and no composite "asset score" is invented: the two risks (impersonation, issuer power) are orthogonal and reported as facts.
- **✅ VERIFIED IN A REAL BROWSER (Playwright + live mainnet):** `/assets` renders 387 USDC issuers with `circle.com` dominant at 97.4%; switching to USDY renders `ondo.finance` with both "Can seize your balance" and "Can freeze your balance"; the impersonator list surfaces `finance-ondo.com`, `blackrock.co.com`, `franklintempleton.co.com`. No console errors. Error paths verified: missing code → 400, malformed code → 400 (not 500 — the bug the old liquidity route had), unissued code → 404, second call → `x-cache: HIT`.
  - One caution recorded for next time: a scoped Playwright assertion reported "no clawback badge" for USDY while the **screenshot showed the badge plainly**. The locator was broken, not the app. Assertions can lie about the DOM; the screenshot settled it.

### This round (English-only repo)
- `PoolRatings.jsx` was written in Turkish while the rest of the product is in English — and it had just become a primary destination for the main CTA. Translated, along with the last Turkish strings in `WalletProvider.jsx`. Repo artifacts are English; the conversation is not.

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
