# Gaps — Kritik & Yüksek Öncelikli Bulgular

> Kapsamlı inceleme sonucu tespit edilen kritik/yüksek öncelikli açıklar.
> Düşük öncelikli bulgular (kod stili, ölü kod, minor config) bilerek dahil edilmedi.
>
> İlk tarih: 2026-07-15
> **Güncelleme: 2026-07-15 — risk oracle çalışması sonrası.**
> Bu turda #3, #4 ve #5 kapandı ve **kontrat auth'u fiilen deploy edildi**
> (daha önce yalnızca kaynak kodda vardı, zincirdeki kontrat eski/auth'suzdu).
> Kalan gap'ler kodda tek tek yeniden doğrulandı.

**Aktif kontrat (testnet):** `CCGZV37C3FC2GLVNIHFEC6OVDHRFLQCELPTQLII44Z7RXZBEER5POPRO`
· admin: `GBMF7MDHLF6E5GWNCUJZKDBID5LCU5U5K7J26MRUJCM2FK7J7VZXTZZ3`
*(Önceki ID'ler testnet reset'inde silinmişti — uygulama var olmayan bir kontrata bakıyordu.)*

---

## 🔴 KRİTİK

*(Kalmadı — passkey mock'u kapatıldı, aşağıya bakınız. Ancak WebAuthn seremonisi
tarayıcı gerektirdiği için uçtan uca **manuel doğrulama bekliyor**.)*

---

## 🟠 YÜKSEK

### 1. `/api/liquidity/*` route'ları gerçek veri değil MOCK döndürüyor
- **Konum:** `src/app/api/liquidity/{stats,pools/all,pools/tier/[tier],pool/[poolId]}/route.ts` (4 route)
- **Durum:** AÇIK (PR #40 ile geldi). **Kalan tek gerçek gap.**
- **Sorun:** `generateMockPools()` ile hardcoded sahte havuz/TVL verisi; Horizon/Redis'ten gerçek veri çekilmiyor.
- **Not:** Yeni `/api/pools/ratings` **gerçek** zincir verisi kullanıyor (`blend-sdk`, mainnet) — bu 4 route hâlâ eski mock'ta.
- **Ek bulgular:**
  - `/api/liquidity/pools/all`: geçersiz `sort`'ta Zod hatası generic `catch`'e düşüyor → **400 yerine 500**.
  - `src/app/api/cache/invalidate/route.ts`: kimliksiz POST (şu an no-op; gerçek cache'e bağlanırsa DoS riski).

### 2. Passkey akışı manuel doğrulama bekliyor
- **Durum:** Kod artık gerçek (aşağı bakınız) ama **WebAuthn tarayıcı gerektirdiği için headless doğrulanamadı**.
- **Doğrulanan:** wallet WASM testnet'te kurulu · deployer fonlu (11.851 XLM) · okuma yolu gerçek kontrata karşı çalışıyor · build/test/lint yeşil.
- **Doğrulanamayan:** passkey kaydı → cüzdan deploy → imzalama zinciri. **Tarayıcıda elle test edilmeli.**

## Öncelik Sırası
1. **Passkey akışını tarayıcıda elle doğrula** — kod hazır, kanıt yok.
2. **Mock liquidity API** — ürünün "gerçek zamanlı TVL" iddiasını karşılamıyor.

---

## ⚠️ Modelin dürüst tanımı (v2.0.0-empirical)

**Skor artık ampirik olarak kalibre** — `src/lib/lightweightRiskModel.js` + `src/lib/riskCalibration.js`
- Normalizasyon artık **gerçek Stellar popülasyonunun persentilleri** üzerinden (300 gerçek mainnet cüzdanından, `scripts/calibrate-risk-model.mjs` ile yeniden üretilebilir).
- **Skor = "bu cüzdan gerçek Stellar cüzdanlarına kıyasla nerede duruyor"** (0-100 persentil).

**Ama hâlâ bir risk TAHMİNİ değil.** Ağırlıkların yönü/oranı hâlâ elle konmuş sezgi; kalibre edilen şey dağılım, ağırlıkların *doğruluğu* değil. Doğrulanmış bir temerrüt modeli için **sonuç etiketi** (temerrüt/likidasyon) gerekir — Stellar'da açık böyle bir veri seti yok (bkz. aşağıdaki not). Site "AI-Powered Risk Scoring" diyor; dürüst tanım: **popülasyona göreli aktivite skoru**.

### Kalan bilinen zayıflık: nightDayRatio
Ölçülen: 200 ödemelik pencere medyan cüzdanda sadece **~0.64 gün**'ü kapsıyor (p95: 10 gün). Bu kadar kısa pencerede "gece/gündüz oranı" davranış değil, cüzdanın günün hangi saatinde aktif olduğunu ölçüyor — büyük ölçüde gürültü. Ayrıca gece penceresi 9 saat / gündüz 15 saat olduğu için 7/24 aktif bir cüzdanın *beklenen* oranı ≈ 0.6, yani taban sıfır değil. Özellik hâlâ en yüksek ağırlıklı "risk" sinyali (+0.875) — zaman-pencereli bir yeniden tanım gerekiyor.

---

## ✅ Çözülenler

### Bu turda (passkey smart wallet)
- **Passkey mock'u kaldırıldı (eski kritik #1).** `passkeyIntegration.js` sahte olan her şeyi (`demo_direct_hash_*`, `crypto.getRandomValues()` "pubkey", uydurma `G...` adresi, hep-`true` doğrulama) döndürüyordu. Artık gerçek `passkeyWallet.js`'in üzerinde ince bir adaptör.
- **Asıl bug bulundu:** gerçek implementasyon zaten vardı ve **v0.14 API'siyle doğruydu** — ama (a) `NEXT_PUBLIC_WALLET_WASM_HASH` hiç tanımlı değildi (kod `DEMO_MODE_DISABLED` ile fırlatıyordu) ve (b) `createWallet`'ın ürettiği **imzalı deploy tx'i hiç gönderilmiyordu** ("client-side placeholder" notuyla). Yani cüzdan hiçbir zaman deploy edilmiyordu.
- **Eklendi:** `POST /api/passkey/deploy` — imzalı deploy tx'ini Soroban RPC'ye gönderir. OZ Channels relayer'ına gerek yok: tx zaten passkey-kit'in kanonik (fonlu) deployer'ı tarafından imzalı.
- **Düzeltildi:** `signWithPasskey` eski `sign({keyId, transaction})` API'sini kullanıyordu; v0.14'te `sign(txn, signer?)` oldu.
- **Yapılandırıldı:** kanonik testnet wallet WASM hash'i (`fdefad64…`) — testnet'te **kurulu olduğu doğrulandı**.
- **Doğrulama sınırı:** WebAuthn tarayıcı gerektirdiği için uçtan uca passkey akışı **elle test edilmeli** (bkz. YÜKSEK #2).

### ⚠️ Önceki bir iddiamın düzeltmesi: "kalepail" seed'i
Daha önce bunu **kritik/prodüksiyon blocker** diye yazmıştım: *"mainnet'e taşınırsa hesabı herkes kontrol eder → fonlar çalınabilir"*. **Bu yanlıştı.** passkey-kit'in kendi dokümantasyonu:
> *"This value MUST remain `"kalepail"`… The deployer only pays fees and salts the deploy — **it never controls the wallet** — but it IS a shared, publicly-derivable keypair."*

Yani deployer cüzdanı **kontrol etmiyor**; sadece ücret ödüyor ve deploy'u salt'lıyor. Üstelik sabit olması **zorunlu** — `keyId → contract` keşfi buna bağlı; değiştirirsen türetilen adresler değişir. Gerçek risk çok daha dar: paylaşımlı ücret ödeyicisi drain edilebilir (griefing) ve SDK'nın belgelediği "deploy front-running" riski var (bunu `connectWallet` keyId'nin canlı signer olduğunu doğrulayarak azaltıyor).
**Yine de kod tarafında kalmadı:** `riskTierClient`'ın ölü yazma yolu (0 dış kullanım — oracle onun yerini aldı) silindi; `src/` içinde artık hiç `kalepail` geçmiyor.

### Bu turda (ampirik kalibrasyon)
- **Uydurma normalizasyon sınırları → gerçek popülasyon persentilleri.** Ölçüm: gerçek mainnet cüzdanlarına karşı sınırlar **3-3300 kat** yanlıştı (`totalVolume` max 10.000 iken gerçek medyan **33.000.000**). `min(1, value/(max-min))` doyuyordu: cüzdanların **%88'i** totalVolume'u tam 1.0'a, **%83'ü** assetDiversity'yi 1.0'a kırpıyordu → iki özellik **sabit**, sıfır bilgi. Sonuç: gerçek 200 cüzdanın **%92'si TIER_2**.
- **Kompozit de kalibre edildi.** Sadece özellikleri düzeltmek yetmedi (%96.5 TIER_2): ~bağımsız özelliklerin ağırlıklı toplamı MLT gereği ortalama etrafında yoğunlaşıyor, sigmoid daha da sıkıştırıyor. Kompozit kendi popülasyon persentiline eşlendi → dağılım inşaen uniform.
- **Ölçülen sonuç (aynı gerçek 200 cüzdan):** skor p5-p95 `29-56` → **`4-92`**; farklı skor `38` → **`86`**; tier `%7/%92/%1` → **`%32/%36/%32`**; doygun özellik `2` → **`0`**.
- **Önceki kalibrasyonum yanlıştı** — kurgusal test fixture'larına fit edilmişti (`totalVolume: 8000`, gerçek medyan 33M). Testler artık gerçek dağılımın persentillerine çapalı.
- **Örneklem yanlılığı bulundu ve düzeltildi:** `/transactions`'tan hesap toplamak %100 `invoke_host_function` (Soroban bot) getiriyor — bu kayıtlarda `from/to/amount` yok, formül onları sessizce **0** okuyor. Örneklem ağ genelindeki `/payments`'a çevrildi.

### Önceki turda (risk oracle çalışması)
- **Skor artık self-report edilemiyor (eski #4)** → Yeni sunucu tarafı oracle: `src/app/api/risk/attest` + `src/lib/server/riskOracle.js`. Skor, **sunucunun Horizon'dan kendi çektiği** veriden türetiliyor ve `admin_set_risk_tier` ile kontrat admin anahtarıyla imzalanıyor. Tarayıcının skor gönderdiği iki yol (`AutomatedRiskAnalyzer`, `page.js` — ki ikincisi kullanıcının **elle girdiği form değerlerini** yazıyordu) kaldırıldı; `src/app/lib/writeScore.js` tamamen **silindi**.
- **On-chain yazma yolu artık çalışıyor (eski #3)** → Oracle `prepareTransaction()` ile simüle edip footprint + resource fee + **auth entry**'leri ekliyor, sonra imzalayıp gönderiyor. Gerçek testnet tx ile doğrulandı: `3f983a678bf191d0ed7b790d507b7f14a80e55314ff18cd7382e2d0d4caefb00` → zincirde `{"score":57,"tier":"TIER_2"}`, `can_access_tier(TIER_2)` → `true`.
- **Rate limit artık sunucuda (eski #5)** → Kontratın kendi `timestamp` alanından okunuyor (stateless, client'tan temizlenemez). 2. çağrı **HTTP 429** + `retry_after` ile doğrulandı.
- **Kontrat auth'u fiilen deploy edildi** → PR #74 kaynağa auth eklemişti ama zincirdeki kontrat eskiydi. Yeni kontrat deploy + `initialize(admin)`; auth zincirde doğrulandı (yetkisiz `set_score` denemesi reddedildi).
- **Ölü kontrat ID'si** → `.env.local`/CI/env.example dahil 7 dosyadaki, testnet'te **var olmayan** ID yenisiyle değiştirildi.
- **Butonu kalıcı disabled bırakan bug** → `AutomatedRiskAnalyzer`, `async checkRateLimit`'i `await` etmeden Promise'i state'e koyuyordu → `rateLimitStatus.canUpdate` daima `undefined` → "Update Score" butonu hep rate-limited görünüyordu. Düzeltildi.
- **Ölü `set_score` dosyası** → `src/lib/writeScore.js` silindi.

### Önceki turlarda
- **Risk skoru TERSTİ** → `lightweightRiskModel.js`: ağırlıklar `sigmoid = P(riskli)` üretiyordu ama kod `(1 - p) * 100` döndürüyordu; **riskli cüzdanlar DÜŞÜK skor** (33) alıp TIER_1 erişimi kazanıyordu. Artık `logitScore * 100`.
- **Contract'ta yetkilendirme yok** → PR #74: `set_risk_tier` + `update_chosen_tier` → `user.require_auth()`; `admin_set_risk_tier` → `admin.require_auth()`; tek seferlik `initialize(admin)`.
- **Güvenlik header'ı / CSP yok** → `next.config.mjs`'de tam CSP + `X-Frame-Options: DENY` + HSTS + Permissions-Policy. **Canlıda doğrulandı** (riskon.vercel.app header'ları).
- **Vercel production build kırıktı** → `cacheConfig.ts` tip hatası deploy'u bloke ediyordu; düzeltildi, site canlı.
- **Repo hijyeni** → commit'lenmiş `risk_score/target` (2822) + `backend/node_modules` (6158) untrack edildi.

### Not: test coverage
Suite 170/170 geçiyor ama `src` coverage'ı **~%13**. `jest.config.js`'teki %70 eşiği hiç karşılanmamıştı (CI'yı kalıcı kırmızı tutuyordu); %12'lik ulaşılabilir bir **regresyon tabanına** çekildi. Test eklendikçe yukarı çekilmeli.

### Not: oracle operasyonel gereksinimleri
`RISK_ORACLE_SECRET_KEY` **sunucu-only** (asla `NEXT_PUBLIC_`). Prod ortamda (Vercel) tanımlı değilse `/api/risk/attest` `NOT_CONFIGURED` döner. Oracle hesabı işlem ücretlerini ödediği için fonlu kalmalı. Kontrat yeniden deploy edilirse `initialize(admin)` tekrar çağrılmalı.
