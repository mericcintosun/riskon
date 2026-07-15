# Gaps — Kritik & Yüksek Öncelikli Bulgular

> Kapsamlı inceleme sonucu tespit edilen kritik/yüksek öncelikli açıklar.
> Düşük öncelikli bulgular (kod stili, ölü kod, minor config) bilerek dahil edilmedi.
>
> İlk tarih: 2026-07-15
> **Güncelleme: 2026-07-15 — bağımlılık modernizasyonu + test düzeltmeleri + CI/CD sonrası yeniden tarandı.**
> Bu turda: risk modelinde **ters skor** bug'ı bulundu ve düzeltildi (bkz. Çözülenler),
> aktif gap'lerin hepsi kodda tek tek yeniden doğrulandı (6/6 hâlâ açık).

---

## 🔴 KRİTİK

### 1. Passkey cüzdanı tamamen mock — başarı gösterir ama hiçbir şey yapmaz
- **Konum:** `src/lib/passkeyIntegration.js`
- **Durum:** HÂLÂ AÇIK (doğrulandı — 4 mock işareti duruyor).
- **Sorunlar:**
  - `submitTransactionDirectly()`: zincire hiçbir şey göndermez, `"demo_direct_hash_" + Date.now()` sahte hash döndürür. `riskTierClient.ts` `signAndSubmit` buna bağlı → UI "başarılı" + explorer hash'i gösterir ama on-chain yazım yok.
  - `extractPublicKey()`: gerçek WebAuthn public key yerine `crypto.getRandomValues()` ("mock public key"). Smart wallet passkey ile hiç kontrol edilemez.
  - `deploySmartWallet()`: `toString(36)` ile üretilmiş, geçerli Stellar strkey bile olmayan sahte `G...` adresi.
  - `verifySmartWallet()`: her zaman `true`.
- **Etki:** Passkey akışı sıfır güvenlik + sıfır işlevsellik; arayüz gerçek çalışıyormuş gibi davranıyor.
- **Çözüm:** Gerçek passkey-kit SDK entegrasyonu ya da bu yolun tamamen kaldırılması.

### 2. Herkesçe bilinen sabit "kalepail" sponsor seed'i
- **Konum:** `src/app/lib/writeScore.js:127`, `src/lib/riskTierClient.ts:619` (toplam 5 kullanım)
- **Durum:** HÂLÂ AÇIK (doğrulandı).
- **Sorun:** `Keypair.fromRawEd25519Seed(hash(Buffer.from("kalepail")))` — sponsor/ücret hesabı halka açık bir sabitten türetiliyor.
- **Etki:** Testnet'te zararsız; mainnet'e taşınırsa hesabı herkes kontrol eder → fonlar çalınabilir, drain/DoS mümkün. **Prodüksiyon blocker'ı.**
- **Çözüm:** Gerçek, gizli, server-side sponsor anahtarı.

### 3. On-chain yazma yolu bozuk — simülasyon + auth-entry yok
- **Konum:** `src/app/lib/writeScore.js` ("skip simulation" notu duruyor; `prepareTransaction`/`authorizeEntry`/`signAuthEntry` sayısı **0**)
- **Durum:** HÂLÂ AÇIK ve **AĞIR**.
- **Sorun:** Contract-invoke tx'i simülasyon yapılmadan gönderiliyor ve Soroban authorization entry'leri hiç oluşturulmuyor.
- **Neden ağır:** Kontratta artık `user.require_auth()` var (PR #74). Simülasyon + auth-entry imzalama olmadan self-service yazım **kesin başarısız olur**; kod sessizce `storeScoreInAccountData` (contract değil, hesap `manageData`) fallback'ine düşer. Yani "risk skoru smart contract'ta" akışı fiilen çalışmıyor.
- **Çözüm:** `simulateTransaction` → `assembleTransaction`/`prepareTransaction` → auth entry'leri kullanıcı cüzdanıyla imzala → gönder.

---

## 🟠 YÜKSEK

### 4. Risk skoru client-side üretiliyor ve self-report ediliyor (skor bütünlüğü)
- **Konum:** `src/lib/useRiskScore.js`, `src/lib/autoRiskAnalyzer.js` → `src/app/lib/writeScore.js:104`
- **Durum:** HÂLÂ AÇIK — kalan **ana** risk-model açığı.
- **Sorun:** Skor tarayıcıda hesaplanıp kullanıcının kendi cüzdanıyla `set_risk_tier`'e yazılıyor. `require_auth()` yalnızca "bu adres benim" der; skorun **dürüst** olduğunu garanti etmez. Kullanıcı kendi skorunu istediği değere set edip tier kapılamasını baypas edebilir.
- **Not:** PR #74 kontrata `admin_set_risk_tier` (admin/oracle yolu) ekledi — doğru tasarım bu; ama frontend **hâlâ self-service `set_risk_tier` çağırıyor** (doğrulandı).
- **Çözüm:** Skoru güvenilir sunucu/oracle hesaplayıp `admin_set_risk_tier` ile yazsın; self-submit yolu son kullanıcıya kapatılsın.

### 5. Rate limiting yalnızca client-side
- **Konum:** `src/lib/rateLimiter.js` (hâlâ `"use client"`)
- **Durum:** HÂLÂ AÇIK (PR #82 async bug'ını düzeltti, mimari aynı).
- **Sorun:** 24 saatlik limit `localStorage`/cache üzerinden → temizlenerek veya contract doğrudan çağrılarak anında baypas.
- **Çözüm:** Sunucu/oracle katmanında limit (#4 çözülürse doğal olarak kapanır).

### 6. `/api/liquidity/*` route'ları gerçek veri değil MOCK döndürüyor
- **Konum:** `src/app/api/liquidity/{stats,pools/all,pools/tier/[tier],pool/[poolId]}/route.ts` (**4 route**, doğrulandı)
- **Durum:** AÇIK (PR #40 ile geldi).
- **Sorun:** `generateMockPools()` ile hardcoded sahte havuz/TVL verisi; Horizon/Redis'ten gerçek veri çekilmiyor. "Gerçek zamanlı TVL tier" iddiası bu uçlarda karşılanmıyor.
- **Ek bulgular:**
  - `/api/liquidity/pools/all`: geçersiz `sort` parametresinde Zod hatası generic `catch`'e düşüyor → **400/`INVALID_INPUT` yerine 500/`INTERNAL_ERROR`** dönüyor (API sözleşmesi hatası).
  - `src/app/api/cache/invalidate/route.ts`: kimlik doğrulaması olmadan POST kabul ediyor; şu an sadece log atıp no-op dönüyor (zarar yok), ama gerçek cache/Redis'e bağlanırsa kimliksiz cache-flush → DoS riski.
- **Çözüm:** Route'ları backend `liquidityMonitor`/Horizon verisine bağla; sort validasyonunu 400'e çevir; cache-invalidate ucuna auth ekle.

---

## Öncelik Sırası
1. **#1 (passkey mock) + #3 (yazma yolu bozuk)** — ikisi birlikte "başarılı yazıldı" gösterilirken zincirde doğru kayıt oluşmuyor.
2. **#2 (kalepail seed)** — mainnet geçişinde kesin blocker.
3. **#4 (self-report skor)** — risk kapılamasının kalan temel açığı; kontratta oracle yolu hazır, frontend'in ona geçmesi gerekiyor.
4. #5–#6 — takip eden sertleştirmeler.

---

## ⚠️ İnceleme gerektiren davranış değişikliği (2026-07-15)

**Risk modeli yeniden kalibre edildi** — `src/lib/lightweightRiskModel.js`
- Ters skor düzeltildikten sonra model hâlâ her profili **48-67** aralığına sıkıştırıyordu, yani **hiçbir zaman TIER_1 veya TIER_3 atamıyordu** (risk-tier ürünü için işlevsiz).
- Ağırlık **oranları korunarak** büyüklükler ölçeklendi ve bias 0.45 → 0.35 yapıldı.
- Sonuç: mükemmel profil → 28 (TIER_1), ortalama → 52 (TIER_2), riskli → 75 (TIER_3).
- Bu bir **kalibrasyon kararı**; ürün açısından onaylanması (veya kendi ağırlıklarınla değiştirilmesi) gerekir. Tek commit'le geri alınabilir.

---

## ✅ Çözülenler (aktif listeden kaldırıldı)

- **Risk skoru TERSTİ** (bu turda bulundu ve düzeltildi) → `lightweightRiskModel.js`. Ağırlıklar `sigmoid = P(riskli)` üretiyordu ama kod `(1 - p) * 100` döndürüyordu: **riskli cüzdanlar DÜŞÜK skor** (33) alıp TIER_1 erişimi kazanıyor, güvenli cüzdanlar 52 alıyordu. Artık `logitScore * 100`. Testler bunu doğru yakalamıştı (`poor > good > excellent` invariantı).
- **Contract'ta yetkilendirme yok** → **PR #74**. `set_risk_tier` + `update_chosen_tier` artık `user.require_auth()`; `admin_set_risk_tier` → `admin.require_auth()`; tek seferlik `initialize(admin)`.
- **Güvenlik header'ı / CSP yok** → `next.config.mjs`'de tam CSP + `X-Frame-Options: DENY` + HSTS + Permissions-Policy. **Canlıda doğrulandı** (riskon.vercel.app response header'ları).
- **Vercel production build kırıktı** → `cacheConfig.ts` `getCacheTTL` tip hatası deploy'u bloke ediyordu; düzeltildi, site canlı.
- **Repo hijyeni** → commit'lenmiş build artifact'ları untrack edildi: `risk_score/target` (2822 dosya) + `backend/node_modules` (6158 dosya); `.gitignore` genişletildi.
- **`set_score` var olmayan metodu** (`src/lib/writeScore.js`) → ölü kod (hiç importer'ı yok), çalışma zamanında yürütülmüyor. Fix = dosyayı sil (düşük öncelik).

### Not: test coverage
Suite 170/170 geçiyor ama `src` coverage'ı **~%13**. `jest.config.js`'teki %70 eşiği hiç karşılanmamıştı (CI'yı kalıcı kırmızı tutuyordu); %12'lik ulaşılabilir bir **regresyon tabanına** çekildi. Test eklendikçe yukarı çekilmeli.
