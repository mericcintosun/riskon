# 🌊 Blend DeFi Integration Guide

## Stellar Risk Scoring + Blend DeFi Protokolü Entegrasyonu

Bu rehber, Stellar Risk Scoring uygulamasına entegre edilen **Blend DeFi protokolü** özelliklerinin nasıl kullanılacağını açıklar.

---

## 📋 Özellikler

### 🎯 Risk Tabanlı DeFi Önerileri
- **Düşük Risk (0-30)**: Agresif pozisyonlar, yüksek teminat oranları
- **Orta Risk (31-70)**: Moderate pozisyonlar, balanced yaklaşım  
- **Yüksek Risk (71-100)**: Konservatif pozisyonlar, düşük teminat oranları

### 🏊 Lending Pool Özellikleri
- **Multi-asset pools**: XLM, USDC, WETH, WBTC desteği
- **Real-time APR**: Güncel supply ve borrow oranları
- **Isolated pools**: Her pool bağımsız risk yönetimi

### ⚡ DeFi İşlemleri
- **Supply**: Teminat yatırma ve faiz kazanma
- **Borrow**: Teminat karşılığında borç alma
- **Withdraw**: Teminat çekme
- **Repay**: Borç ödeme

### 📊 Pozisyon Yönetimi
- **Health Factor**: Likidite riski göstergesi
- **Borrow Limit**: Maksimum borç alma kapasitesi
- **Real-time positions**: Anlık pozisyon takibi

---

## 🚀 Kullanım Adımları

### 1. Risk Skoru Hesaplama
```
1. Wallet bağlayın (Albedo, xBull, Freighter)
2. İşlem verilerinizi girin:
   - İşlem sayısı (0-100)
   - Ortalama saat aralığı (0-24)
   - Varlık çeşidi (0-10)
   - İsteğe bağlı: Ortalama/Max tutar, Gece oranı
3. Risk skorunu blockchain'e kaydedin
```

### 2. Blend DeFi Dashboard Aktifleştirme
Risk skoru başarıyla kaydedildikten sonra:
- ✅ Blend Dashboard otomatik olarak görünür
- 🎯 Risk tabanlı öneriler gösterilir
- 🌊 DeFi işlemlerine başlayabilirsiniz

### 3. Lending Pool Seçimi
**Available Pools** sekmesinde:
- Pool bilgilerini inceleyin
- Supply/Borrow APR oranlarına bakın
- Desteklenen varlıkları kontrol edin
- Bir pool seçin

### 4. DeFi İşlemleri
**Operations** sekmesinde:

#### 💰 Supply (Teminat Yatırma)
```
1. "Supply" işlemini seçin
2. Varlık türünü seçin (XLM, USDC, vb.)
3. Miktarı girin
4. İşlemi onaylayın
→ Faiz kazanmaya başlarsınız
```

#### 🏦 Borrow (Borç Alma)
```
1. "Borrow" işlemini seçin
2. Borç alınacak varlığı seçin
3. Miktarı girin (Borrow Limit'i aşmayın)
4. İşlemi onaylayın
→ Health Factor'ü takip edin
```

#### 💸 Withdraw (Çekme)
```
1. "Withdraw" işlemini seçin
2. Çekilecek varlığı seçin
3. Miktarı girin
4. İşlemi onaylayın
→ Teminatınız azalır
```

#### 💳 Repay (Ödeme)
```
1. "Repay" işlemini seçin
2. Ödenecek varlığı seçin
3. Miktarı girin
4. İşlemi onaylayın
→ Borcunuz azalır
```

### 5. Pozisyon Takibi
**My Position** sekmesinde:
- **Supplied Assets**: Yatırdığınız teminatlar
- **Borrowed Assets**: Aldığınız borçlar
- **Health Factor**: Likidite riski (>1.2 önerilen)
- **Borrow Limit**: Maksimum borç alma kapasitesi

---

## ⚠️ Önemli Uyarılar

### 🔴 Liquidation Riski
- **Health Factor < 1.0**: Likidasyona açık
- **Health Factor < 1.2**: Risk seviyesi yüksek
- **Health Factor > 1.5**: Güvenli seviye

### 💡 Risk Yönetimi İpuçları

#### Düşük Risk Profili (0-30)
- ✅ Teminat oranı %75-80 kullanabilirsiniz
- ✅ Stablecoin'lerde agresif olabilirsiniz
- ✅ Yüksek leverage alabilirsiniz

#### Orta Risk Profili (31-70)
- ⚠️ Teminat oranı %60-70 aralığında tutun
- ⚠️ Çeşitlendirilmiş portföy oluşturun
- ⚠️ Moderate pozisyon büyüklükleri

#### Yüksek Risk Profili (71-100)
- 🔴 Teminat oranı %40-50 ile başlayın
- 🔴 Küçük pozisyonlarla başlayın
- 🔴 Yüksek likidite varlıklarına odaklanın
- 🔴 Sık kontrol yapın

---

## 🛠️ Teknik Detaylar

### Blockchain Altyapısı
- **Network**: Stellar Testnet
- **Protocol**: Blend v2
- **Smart Contracts**: Soroban tabanlı
- **Fee**: Minimal XLM transaction fees

### Desteklenen Wallet'lar
- **Albedo**: Web tabanlı wallet
- **xBull**: Browser extension
- **Freighter**: Browser extension
- **WalletConnect**: Mobile wallet desteği

### Asset Contracts (Testnet)
```javascript
XLM: "CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA"
USDC: "CAQCFVLOBK5GIULPNZRGATTTXQKWLHNOXGQZKCJ7WGKMQR5JXAKVH57L"
```

---

## 🔧 Sorun Giderme

### Yaygın Hatalar

#### "Pool bulunamadı"
- Testnet bağlantınızı kontrol edin
- Blend contracts'ların deploy durumunu kontrol edin

#### "Yetersiz balance"
- Testnet XLM alın: [Stellar Laboratory](https://laboratory.stellar.org/#account-creator)
- Wallet balance'ınızı kontrol edin

#### "Health Factor çok düşük"
- Borç miktarınızı azaltın
- Daha fazla teminat yatırın
- Pozisyonunuzu kısmi olarak kapatın

#### "Simulation failed"
- Gas fee'lerini kontrol edin
- Network congestion bekleyin
- İşlem miktarını kontrol edin

### Destek Kanalları
- **GitHub Issues**: Teknik problemler
- **Stellar Discord**: Topluluk desteği
- **Blend Documentation**: Protokol detayları

---

## 📈 Gelişmiş Özellikler

### Risk Skoruna Göre Özel Limitler
Uygulama, risk skorunuza göre önerilerde bulunur:

```javascript
Düşük Risk: Max Borrow 80% of Collateral
Orta Risk: Max Borrow 60% of Collateral  
Yüksek Risk: Max Borrow 40% of Collateral
```

### Otomatik Risk Hesaplama
- 6 faktörlü risk modeli
- Makine öğrenmesi tabanlı
- Gerçek zamanlı güncelleme

### Blend Protocol Integration
- **Pool Factory**: Yeni pool oluşturma
- **Backstop Module**: Likidite güvencesi
- **Oracle Integration**: Gerçek zamanlı fiyat verileri
- **Emission Rewards**: BLND token ödülleri

---

## 🎯 Sonuç

Bu entegrasyon ile artık:
1. ✅ Risk skorunuzu hesaplayabilir
2. ✅ Blockchain'e güvenli şekilde kaydedebilir  
3. ✅ Risk tabanlı DeFi önerileri alabilir
4. ✅ Blend protokolünde lending/borrowing yapabilir
5. ✅ Pozisyonlarınızı gerçek zamanlı takip edebilir

**Güvenli DeFi deneyimi için risk skorunuza uygun hareket edin!** 🌊🚀 