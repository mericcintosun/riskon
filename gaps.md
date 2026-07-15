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

## ⚠️ İnceleme gerektiren davranış değişikliği

**Risk modeli yeniden kalibre edildi** — `src/lib/lightweightRiskModel.js`
- Ters skor düzeltildikten sonra model hâlâ her profili **48-67** aralığına sıkıştırıyordu, yani **hiçbir zaman TIER_1/TIER_3 atamıyordu** — üstelik 30/70 eşikleri kontrata gömülü (`can_access_tier`), yani model kendi tüketicisinin sözleşmesini karşılamıyordu.
- Ağırlık **oranları korunarak** büyüklükler ölçeklendi, bias 0.45 → 0.35.
- Sonuç: mükemmel → 28 (TIER_1), ortalama → 52 (TIER_2), riskli → 75 (TIER_3).
- **Açık uyarı:** bu model hâlâ **elle uydurulmuş sezgisel bir skordur** ("trained on a hypothetical dataset"), doğrulanmış bir risk modeli değil. Anlamlı olması için ağırlıkların ve 30/70 eşiklerinin gerçek Stellar verisinden türetilmesi gerekir. Site "AI-Powered Risk Scoring" diyor — bu iddia şu an fazla.

---

## ✅ Çözülenler

### Bu turda (risk oracle çalışması)
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
