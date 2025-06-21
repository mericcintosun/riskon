# Riskon - Stellar Risk Scoring & Blend DeFi Platform

Stellar Hackathon için geliştirilmiş risk tabanlı DeFi önerileri sunan platform. Kullanıcıların işlem geçmişine dayalı risk skorlarını hesaplayan ve bu skorlara göre kişiselleştirilmiş Blend DeFi önerileri sunan bir uygulama.

## 🚀 Özellikler

### ⚡ Risk Skorlama Sistemi

- **Otomatik Wallet Analizi**: Stellar Horizon API'den işlem geçmişi otomatik çekilir
- **6 faktörlü makine öğrenmesi modeli**
- İşlem sayısı, saat aralığı, varlık çeşidi analizi (otomatik)
- Opsiyonel: ortalama/max tutar, gece/gündüz oranı
- Manuel mod da desteklenir (fallback)
- Stellar blockchain'e kayıt (Soroban smart contract)

### 🌊 Blend DeFi Entegrasyonu

- **Demo Pool Sistemi** (Stable çalışır)
- Supply, Borrow, Withdraw, Repay işlemleri
- Risk tabanlı öneriler
- Multi-asset desteği (XLM, USDC, BLND, wETH, wBTC)

### 💰 Wallet Desteği

- Albedo, xBull, Freighter
- Stellar Testnet entegrasyonu
- Güvenli key yönetimi

## 🛠️ Teknoloji Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS
- **Blockchain**: Stellar Testnet, Soroban Smart Contracts
- **DeFi**: Blend Protocol v2 SDK
- **Risk Scoring**: JavaScript + Rust (Soroban)

## 📁 Proje Yapısı

```
stellar-hackathon/
├── src/
│   ├── app/
│   │   ├── page.js               # Ana uygulama
│   │   └── layout.js             # Layout
│   ├── components/
│   │   ├── BlendDashboard.jsx    # DeFi işlem paneli
│   │   └── Header.jsx            # Navigasyon
│   ├── lib/
│   │   ├── blendConfig.js        # Blend konfigürasyonu
│   │   ├── blendUtils.js         # DeFi işlem fonksiyonları
│   │   ├── writeScore.js         # Blockchain yazma
│   │   └── useRiskScore.js       # Risk skoru hook
│   └── providers/
│       └── WalletProvider.jsx    # Wallet context
├── risk_score/                  # Rust smart contract
│   └── src/lib.rs               # Risk skoru kaydetme
└── docs/                       # Dokümantasyon
```

## 🚀 Kurulum ve Çalıştırma

### Gereksinimler

- Node.js 18+
- npm veya yarn

### Adımlar

1. **Projeyi klonlayın**

```bash
git clone <repository-url>
cd stellar-hackathon
```

2. **Bağımlılıkları yükleyin**

```bash
npm install
```

3. **Uygulamayı çalıştırın**

```bash
npm run dev
```

4. **Tarayıcıda açın**

```
http://localhost:3000
```

## 📱 Kullanım Kılavuzu

### 1. Risk Skoru Hesaplama

1. Wallet bağlayın (Albedo/xBull/Freighter)
2. İşlem verilerinizi girin:
   - İşlem sayısı (0-100)
   - Ortalama saat aralığı (0-24)
   - Varlık çeşidi (0-10)
   - Opsiyonel: Ortalama/Max tutar, Gece oranı
3. "Risk Skorunu Hesapla ve Kaydet" butonuna tıklayın
4. Blockchain'e kaydetme işlemini onaylayın

### 2. Blend DeFi Dashboard

Risk skoru kaydedildikten sonra:

- ✅ Blend Dashboard otomatik görünür
- 🎯 Risk tabanlı öneriler gösterilir
- 🌊 Demo pool'larla DeFi işlemleri test edebilirsiniz

### 3. Demo Pool İşlemleri

- **Supply**: Teminat yatırma simülasyonu
- **Borrow**: Borç alma simülasyonu
- **Withdraw**: Çekme simülasyonu
- **Repay**: Ödeme simülasyonu

## ⚠️ Önemli Notlar

### Mevcut Durum

- ✅ Risk skorlama sistemi çalışıyor
- ✅ Demo pool'lar stabil çalışıyor
- ⚠️ Gerçek Blend pool'lar geçici olarak devre dışı
- 🔧 Blend SDK v2 konfigürasyon sorunları nedeniyle

### Risk Önerileri

- **Düşük Risk (0-30)**: %80 teminat oranı, agresif pozisyonlar
- **Orta Risk (31-70)**: %70 teminat oranı, dengeli yaklaşım
- **Yüksek Risk (71-100)**: %50 teminat oranı, konservatif strateji

## 🔧 Geliştirme Notları

### Bilinen Sorunlar

1. ✅ **ÇÖZÜLDÜ**: React key prop hataları
2. ✅ **ÇÖZÜLDÜ**: Pool loading hatası (demo modda bypass)
3. ⚠️ **DEVAM EDIYOR**: Blend SDK v2 `min_collateral` uyumsuzluğu

### Sonraki Adımlar

- [ ] Blend SDK konfigürasyon sorunlarını çöz
- [ ] Gerçek pool'ları yeniden aktifleştir
- [ ] Mainnet desteği ekle
- [ ] Gelişmiş risk analitikleri

## 📋 Test Senaryosu

1. **Risk Skoru Testi**

   - İşlem sayısı: 25, Saat aralığı: 8, Varlık çeşidi: 3
   - Beklenen: ~40-50 risk skoru (Orta Risk)

2. **Demo Pool Testi**

   - Demo Main Pool seçin
   - 10 XLM supply simülasyonu yapın
   - Success mesajını onaylayın

3. **Wallet Testi**
   - Farklı wallet'ları test edin
   - Bağlantı kesme/yeniden bağlama

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/AmazingFeature`)
3. Commit yapın (`git commit -m 'Add some AmazingFeature'`)
4. Push yapın (`git push origin feature/AmazingFeature`)
5. Pull Request oluşturun

## 📄 Lisans

Bu proje Stellar Hackathon için geliştirilmiştir.

## 📞 İletişim

- GitHub Issues: Teknik problemler için
- Stellar Discord: Topluluk desteği için

---

**Not**: Bu uygulama Stellar Testnet üzerinde çalışır. Mainnet kullanımı için ek güvenlik önlemleri gereklidir.
