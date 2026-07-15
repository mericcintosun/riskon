# Gaps — Kritik & Yüksek Öncelikli Bulgular

> Kapsamlı inceleme sonucu tespit edilen kritik/yüksek öncelikli açıklar.
> Düşük öncelikli bulgular (kod stili, ölü kod, minor config) bilerek dahil edilmedi.
> İlk tarih: 2026-07-15 · **Güncelleme: 2026-07-15 (15 PR merge sonrası yeniden tarandı)**
>
> Bu güncellemede: çözülen gap'ler doğrulanıp kaldırıldı (bkz. sonda "Çözülenler"),
> hâlâ açık olanlar yeni koda göre teyit edildi, yeni bulgular eklendi.

---

## 🔴 KRİTİK

### 1. Passkey cüzdanı tamamen mock — başarı gösterir ama hiçbir şey yapmaz
- **Konum:** `src/lib/passkeyIntegration.js`
- **Durum:** HÂLÂ AÇIK (bu oturumdaki hiçbir PR dokunmadı — doğrulandı).
- **Sorunlar:**
  - `submitTransactionDirectly()` (satır ~298): zincire hiçbir şey göndermez, `"demo_direct_hash_" + Date.now()` sahte hash döndürür. `riskTierClient.ts` `signAndSubmit` yolu buraya bağlı → UI "başarılı" + explorer hash'i gösterir ama on-chain yazım yok.
  - `extractPublicKey()` (satır ~317): gerçek WebAuthn public key yerine `crypto.getRandomValues()` döndürür ("mock public key"). Smart wallet passkey ile hiç kontrol edilemez.
  - `deploySmartWallet()` (satır ~332): `toString(36)` ile üretilmiş, geçerli Stellar strkey bile olmayan sahte `G...` adresi döndürür.
  - `verifySmartWallet()` (satır ~353): her zaman `true`.
- **Etki:** Passkey akışı sıfır güvenlik + sıfır işlevsellik; ama arayüz gerçek çalışıyormuş gibi davranıyor.
- **Çözüm:** Gerçek passkey-kit SDK entegrasyonu (imza + Launchtube submit) ya da bu yolun tamamen kaldırılması.

### 2. Herkesçe bilinen sabit "kalepail" sponsor seed'i
- **Konum:** `src/app/lib/writeScore.js:127`, `src/lib/riskTierClient.ts:619`
- **Durum:** HÂLÂ AÇIK (doğrulandı).
- **Sorun:** `Keypair.fromRawEd25519Seed(hash(Buffer.from("kalepail")))` — sponsor/ücret hesabı halka açık bir sabitten türetiliyor.
- **Etki:** Testnet'te zararsız; mainnet'e taşınırsa hesabı herkes kontrol eder → fonlar çalınabilir, drain/DoS mümkün. **Prodüksiyon blocker'ı.**
- **Çözüm:** Gerçek, gizli, server-side sponsor anahtarına geç.

### 3. On-chain yazma yolu bozuk — simülasyon + auth-entry yok (contract artık auth istiyor)
- **Konum:** `src/app/lib/writeScore.js:206` ("skip simulation"), `:232` (doğrudan `sendTransaction`)
- **Durum:** HÂLÂ AÇIK ve **AĞIRLAŞTI.**
- **Sorun:** Contract-invoke tx'i `prepareTransaction()`/simülasyon yapmadan gönderiliyor; ayrıca Soroban authorization entry'leri hiç oluşturulmuyor (`authorizeEntry`/`signAuthEntry` kodda yok).
- **Neden ağırlaştı:** PR #74 ile contract artık `set_risk_tier`'de `user.require_auth()` istiyor. Bu yüzden simülasyon + auth-entry imzalama olmadan self-service yazım **kesin olarak başarısız olur**; kod da sessizce `storeScoreInAccountData` (contract değil, hesap `manageData`) fallback'ine düşer. Yani "risk skoru smart contract'ta" akışı fiilen çalışmıyor.
- **Çözüm:** `simulateTransaction` → `assembleTransaction`/`prepareTransaction` → auth entry'leri kullanıcı cüzdanıyla imzala → gönder.

---

## 🟠 YÜKSEK

### 4. Risk skoru %100 client-side üretiliyor ve self-report ediliyor (skor bütünlüğü)
- **Konum:** `src/lib/useRiskScore.js`, `src/lib/autoRiskAnalyzer.js` → `src/app/lib/writeScore.js`
- **Durum:** HÂLÂ AÇIK — ve artık kalan **ana** risk-model açığı.
- **Sorun:** Skor tarayıcıdaki TF.js modeliyle hesaplanıp kullanıcının kendi cüzdanıyla `set_risk_tier`'e yazılıyor. #74'ün eklediği `require_auth()` yalnızca "bu adres benim" der; skorun **dürüst** olduğunu garanti etmez. Kullanıcı kendi skorunu istediği değere set edip tier kapılamasını baypas edebilir.
- **Not:** #74 zaten `admin_set_risk_tier` (admin/oracle yolu) ekledi — doğru tasarım budur; ama frontend hâlâ self-service `set_risk_tier` kullanıyor.
- **Çözüm:** Skoru güvenilir bir sunucu/oracle hesaplayıp `admin_set_risk_tier` ile yazsın; self-submit yolu son kullanıcıya kapatılsın.

### 5. Rate limiting yalnızca client-side
- **Konum:** `src/lib/rateLimiter.js`
- **Durum:** HÂLÂ AÇIK (PR #82 içindeki async bug düzeltildi ama mimari aynı).
- **Sorun:** 24 saatlik güncelleme limiti `localStorage`/cache üzerinden. localStorage temizlenerek veya contract doğrudan çağrılarak anında baypas.
- **Çözüm:** Sunucu/oracle katmanında limit (self-service yazım kapatılırsa bu da doğal olarak çözülür).

### 6. `/api/liquidity/*` route'ları gerçek veri değil MOCK döndürüyor  *(YENİ — PR #40 ile geldi)*
- **Konum:** `src/app/api/liquidity/stats/route.ts`, `.../pools/all/route.ts`, `.../pools/tier/[tier]/route.ts`, `.../pool/[poolId]/route.ts`
- **Durum:** YENİ.
- **Sorun:** Route'lar `generateMockPools()` ile hardcoded sahte havuz/TVL verisi döndürüyor; Horizon/Redis'ten gerçek veri çekilmiyor. Ürünün "gerçek zamanlı TVL tier" iddiası bu uçlarda karşılanmıyor.
- **Ayrıca:** `src/app/api/cache/invalidate/route.ts` kimlik doğrulaması olmadan POST kabul ediyor; şu an sadece log atıp no-op dönüyor (zarar yok), ama gerçek cache/Redis'e bağlanırsa kimliksiz cache-flush → DoS riski olur.
- **Çözüm:** Route'ları backend `liquidityMonitor`/Horizon verisine bağla; cache-invalidate ucuna auth ekle.

---

## Öncelik Sırası
1. **#1 (passkey mock) ve #3 (yazma yolu bozuk)** — ikisi birlikte "başarılı yazıldı" gösterilirken zincirde doğru kayıt oluşmuyor.
2. **#2 (kalepail seed)** — mainnet geçişinde kesin blocker.
3. **#4 (self-report skor)** — #1 kapandıktan sonra risk kapılamasının kalan temel açığı.
4. #5–#6 — takip eden sertleştirmeler.

---

## ✅ Çözülenler (bu güncellemede aktif listeden kaldırıldı)
- **Contract'ta yetkilendirme yok** → **PR #74** ile çözüldü. `set_risk_tier` + `update_chosen_tier` artık `user.require_auth()`; `admin_set_risk_tier` `admin.require_auth()`; tek seferlik `initialize(admin)`. `risk_score/src/lib.rs`'de 4 adet `require_auth` doğrulandı.
- **Güvenlik header'ı / CSP yok** → çözüldü. `next.config.mjs` artık tam `Content-Security-Policy` + `X-Frame-Options: DENY` + `HSTS` + `Permissions-Policy` + `X-Content-Type-Options` içeriyor. *(Not: CSP `script-src`'de `'unsafe-inline'` var — koruma mevcut ama sıkılaştırılabilir; düşük öncelik.)*
- **`set_score` var olmayan metodu çağrılıyor** (`src/lib/writeScore.js`) → aktif gap'ten düşürüldü: dosyanın hiçbir importer'ı yok = **ölü kod**, çalışma zamanında hiç yürütülmüyor. Fix = dosyayı sil (temizlik, düşük öncelik).
