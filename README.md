# 🌟 Stellar Risk Scoring - DeFi Risk Assessment

**2025 Extension Güvenlik Politikalarına Uyumlu Stellar Blockchain Risk Değerlendirme Uygulaması**

Bu proje, Chrome ve Firefox'un 2025 yılında sıkılaştırdığı extension güvenlik politikalarına karşı geliştirilmiş, **Stellar Wallets Kit** kullanarak çoklu wallet desteği sunan bir DeFi risk değerlendirme sistemidir.

## 🚀 Özellikler

### ✅ Çoklu Wallet Desteği (Extension Sorunları Çözüldü!)
- **Albedo Wallet** - Pop-up tabanlı, extension gerektirmez
- **xBull Wallet** - PWA ve extension versiyonları
- **Freighter Wallet** - Stellar'ın resmi wallet'ı
- **WalletConnect** - Mobil wallet bağlantısı
- **Ledger & Trezor** - Hardware wallet desteği

### 🤖 AI Destekli Risk Hesaplama
- **TensorFlow.js** ile tarayıcıda makine öğrenmesi
- Real-time risk skoru hesaplama
- 3 parametre ile analiz:
  - İşlem sayısı (0-100)
  - Ortalama saat aralığı (0-24)
  - Varlık çeşidi (0-10)

### 🔗 Blockchain Entegrasyonu
- **Soroban Smart Contract** ile güvenli veri saklama
- **Stellar Testnet** üzerinde çalışır
- Transaction hash ile doğrulama
- Stellar Explorer entegrasyonu

## 🛠 Teknoloji Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS
- **Blockchain**: Stellar SDK, Soroban Smart Contracts
- **Wallet**: Stellar Wallets Kit (Extension sorunları çözüldü!)
- **AI**: TensorFlow.js
- **Smart Contract**: Rust + Soroban SDK

## 📦 Kurulum

```bash
# Bağımlılıkları yükle
npm install

# Geliştirme sunucusunu başlat
npm run dev

# Tarayıcıda aç
open http://localhost:3000
```

## 🔧 Environment Variables

`.env.local` dosyası oluşturun:

```env
# Stellar Risk Scoring Contract ID (Testnet)
NEXT_PUBLIC_RISKSCORE_CONTRACT_ID=CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQAHHAGK6ZX3

# Network Configuration
NEXT_PUBLIC_STELLAR_NETWORK=TESTNET
NEXT_PUBLIC_HORIZON_URL=https://horizon-testnet.stellar.org
NEXT_PUBLIC_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
```

## 🎯 Kullanım

### 1. Wallet Bağlantısı
- "🔗 Wallet Bağla" butonuna tıklayın
- Açılan modal'dan tercih ettiğiniz wallet'ı seçin
- Wallet'ınızı onaylayın

### 2. Risk Skoru Hesaplama
- **İşlem Sayısı**: Son 30 günde yaptığınız işlem sayısı (0-100)
- **Ortalama Saat Aralığı**: İşlemler arası geçen ortalama süre (0-24)
- **Varlık Çeşidi**: Portföyünüzdeki farklı varlık sayısı (0-10)

### 3. Blockchain'e Kaydetme
- Risk skoru otomatik hesaplanır
- "🚀 Risk Skorunu Blockchain'e Kaydet" butonuna tıklayın
- Wallet'ınızda transaction'ı onaylayın
- Stellar Explorer'da sonucu görüntüleyin

## 🔍 Desteklenen Wallet'lar

| Wallet | Tip | Extension Gerekli | Mobil Destek |
|--------|-----|------------------|--------------|
| **Albedo** | Pop-up | ❌ Hayır | ✅ Evet |
| **xBull** | PWA/Extension | ❌ Opsiyonel | ✅ Evet |
| **Freighter** | Extension | ✅ Evet | ❌ Hayır |
| **WalletConnect** | Protocol | ❌ Hayır | ✅ Evet |
| **Ledger** | Hardware | ❌ Hayır | ❌ Hayır |

## 🚨 2025 Extension Güvenlik Politikaları Çözümü

### Problem
- Chrome ve Firefox 2025'te extension güvenlik politikalarını sıkılaştırdı
- Freighter gibi extension wallet'lara erişim zorlaştı
- Manifest V3 gereksinimleri

### Çözüm: Stellar Wallets Kit
- **Çoklu wallet desteği** - Tek API ile tüm wallet'lar
- **Extension-free alternatifler** - Albedo, xBull PWA
- **WalletConnect entegrasyonu** - Mobil wallet bağlantısı
- **Fallback mekanizmaları** - Bir wallet çalışmazsa diğeri

## 📊 Risk Skoru Algoritması

```javascript
// Normalizasyon (0-1 arası)
const features = [
  txCount / 100,      // İşlem sayısı
  avgHours / 24,      // Ortalama saat
  assetTypes / 10     // Varlık çeşidi
];

// TensorFlow.js ile tahmin
const riskScore = model.predict(features) * 100; // 0-100 arası
```

### Risk Seviyeleri
- 🟢 **0-30**: Düşük Risk
- 🟡 **31-70**: Orta Risk  
- 🔴 **71-100**: Yüksek Risk

## 🔗 Smart Contract

### Rust Kodu (Soroban)
```rust
#[contract]
pub struct RiskContract;

#[contractimpl]
impl RiskContract {
    pub fn set_score(env: Env, user: Address, score: u32) {
        assert!(score <= 100);
        env.storage().persistent().set(&user, &score);
    }

    pub fn get_score(env: Env, user: Address) -> u32 {
        env.storage().persistent().get(&user).unwrap_or(0)
    }
}
```

### Contract ID (Testnet)
```
CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQAHHAGK6ZX3
```

## 🌐 Testnet Kaynakları

- **Testnet XLM**: https://laboratory.stellar.org/#account-creator
- **Stellar Explorer**: https://stellar.expert/explorer/testnet
- **Horizon API**: https://horizon-testnet.stellar.org
- **Soroban RPC**: https://soroban-testnet.stellar.org

## 🎨 UI/UX Özellikleri

- **Modern Tasarım**: Tailwind CSS ile responsive
- **Gradient Arka Plan**: Profesyonel görünüm
- **Real-time Feedback**: Anında risk skoru hesaplama
- **Progress Bar**: Görsel risk seviyesi gösterimi
- **Toast Mesajları**: Kullanıcı dostu bildirimler
- **Loading States**: Smooth kullanıcı deneyimi

## 🔧 Geliştirme

### Proje Yapısı
```
src/
├── app/
│   ├── page.js              # Ana uygulama
│   ├── layout.js            # Layout wrapper
│   ├── globals.css          # Global stiller
│   └── lib/
│       ├── useRiskScore.js  # Risk hesaplama hook
│       ├── writeScore.js    # Blockchain yazma
│       └── loadModel.js     # TensorFlow model
├── public/
│   └── model/
│       ├── risk-model.json  # AI model
│       └── risk-model.weights.bin
└── risk_score/              # Rust smart contract
    ├── src/lib.rs
    └── Cargo.toml
```

### Komutlar
```bash
# Geliştirme
npm run dev

# Production build
npm run build

# Linting
npm run lint

# Smart contract build (Rust)
cd risk_score && cargo build --target wasm32-unknown-unknown --release
```

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit yapın (`git commit -m 'Add amazing feature'`)
4. Push yapın (`git push origin feature/amazing-feature`)
5. Pull Request açın

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

## 🙏 Teşekkürler

- **Stellar Development Foundation** - Blockchain altyapısı
- **Creit Technologies** - Stellar Wallets Kit
- **TensorFlow.js** - AI/ML desteği
- **Next.js Team** - React framework

---

**🌟 2025'te Extension Sorunları Çözüldü! Artık Tüm Wallet'lar Çalışıyor! 🌟**
