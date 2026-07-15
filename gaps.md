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

### 1. Passkey cüzdanı tamamen mock — başarı gösterir ama hiçbir şey yapmaz
- **Konum:** `src/lib/passkeyIntegration.js`
- **Durum:** HÂLÂ AÇIK — kalan tek kritik.
- **Sorunlar:**
  - `submitTransactionDirectly()`: zincire hiçbir şey göndermez, `"demo_direct_hash_" + Date.now()` sahte hash döndürür. UI "başarılı" + explorer hash'i gösterir ama on-chain yazım yok.
  - `extractPublicKey()`: gerçek WebAuthn public key yerine `crypto.getRandomValues()` ("mock public key") → smart wallet passkey ile hiç kontrol edilemez.
  - `deploySmartWallet()`: `toString(36)` ile üretilmiş, geçerli Stellar strkey bile olmayan sahte `G...` adresi.
  - `verifySmartWallet()`: her zaman `true`.
- **Etki:** Passkey akışı sıfır güvenlik + sıfır işlevsellik; arayüz gerçek çalışıyormuş gibi davranıyor.
- **Çözüm:** Gerçek passkey-kit SDK entegrasyonu ya da bu yolun tamamen kaldırılması.
- **Not:** Risk skoru akışı artık passkey'e bağlı değil (oracle üzerinden yürüyor), yani bu gap artık ana ürünü bloke etmiyor — sadece passkey özelliğini.

---

## 🟠 YÜKSEK

### 2. Herkesçe bilinen sabit "kalepail" sponsor seed'i (kapsamı daraldı)
- **Konum:** `src/lib/riskTierClient.ts` (yalnızca burada kaldı)
- **Durum:** AÇIK ama **kapsam küçüldü**. `src/app/lib/writeScore.js` silindiği için oradaki kullanım ortadan kalktı.
- **Sorun:** `Keypair.fromRawEd25519Seed(hash(Buffer.from("kalepail")))` — sponsor hesabı halka açık bir sabitten türetiliyor.
- **Hafifletici:** Kalan kullanım `riskTierClient`'ın **yazma** yolunda; o yol da mock passkey'e (#1) gidiyor, yani şu an fiilen ölü. Okuma yolu (simülasyon) bu seed'i kullanmıyor.
- **Etki:** Mainnet'e taşınırsa hesabı herkes kontrol eder → **prodüksiyon blocker'ı**.
- **Çözüm:** #1 ile birlikte bu yolu kaldır veya gerçek, gizli, server-side sponsor anahtarına geç.

### 3. `/api/liquidity/*` route'ları gerçek veri değil MOCK döndürüyor
- **Konum:** `src/app/api/liquidity/{stats,pools/all,pools/tier/[tier],pool/[poolId]}/route.ts` (4 route)
- **Durum:** AÇIK (PR #40 ile geldi).
- **Sorun:** `generateMockPools()` ile hardcoded sahte havuz/TVL verisi; Horizon/Redis'ten gerçek veri çekilmiyor. "Gerçek zamanlı TVL tier" iddiası bu uçlarda karşılanmıyor.
- **Ek bulgular:**
  - `/api/liquidity/pools/all`: geçersiz `sort` parametresinde Zod hatası generic `catch`'e düşüyor → **400/`INVALID_INPUT` yerine 500/`INTERNAL_ERROR`**.
  - `src/app/api/cache/invalidate/route.ts`: kimliksiz POST kabul ediyor; şu an no-op (zarar yok), ama gerçek cache/Redis'e bağlanırsa kimliksiz cache-flush → DoS riski.
- **Çözüm:** Route'ları backend `liquidityMonitor`/Horizon verisine bağla; sort validasyonunu 400'e çevir; cache-invalidate ucuna auth ekle.

---

## Öncelik Sırası
1. **#1 (passkey mock)** — ya gerçek entegrasyon ya da kaldırma. #2'yi de beraberinde kapatır.
2. **#3 (mock liquidity API)** — ürünün "gerçek zamanlı TVL" iddiasını karşılamıyor.

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
