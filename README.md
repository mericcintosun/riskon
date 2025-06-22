# Riskon - Stellar Risk Scoring & Blend DeFi Platform

A platform developed for Stellar Hackathon that provides risk-based DeFi recommendations. An application that calculates users' risk scores based on transaction history and offers personalized Blend DeFi recommendations according to these scores.

## 🚀 Features

### ⚡ Risk Scoring System

- **Automatic Wallet Analysis**: Transaction history is automatically pulled from Stellar Horizon API
- **6-factor machine learning model**
- Transaction count, time interval, asset diversity analysis (automatic)
- Optional: average/max amount, night/day ratio
- Manual mode also supported (fallback)
- Record to Stellar blockchain (Soroban smart contract)

### 🌊 Blend DeFi Integration

- **Demo Pool System** (Stable working)
- Supply, Borrow, Withdraw, Repay operations
- Risk-based recommendations
- Multi-asset support (XLM, USDC, BLND, wETH, wBTC)

### 💰 Wallet Support

- Albedo, xBull, Freighter
- Stellar Testnet integration
- Secure key management

## 🛠️ Technology Stack

- **Frontend**: Next.js 15, React 19, Tailwind CSS
- **Blockchain**: Stellar Testnet, Soroban Smart Contracts
- **DeFi**: Blend Protocol v2 SDK
- **Risk Scoring**: JavaScript + Rust (Soroban)

## 📁 Project Structure

```
stellar-hackathon/
├── src/
│   ├── app/
│   │   ├── page.js               # Main application
│   │   └── layout.js             # Layout
│   ├── components/
│   │   ├── BlendDashboard.jsx    # DeFi transaction panel
│   │   └── Header.jsx            # Navigation
│   ├── lib/
│   │   ├── blendConfig.js        # Blend configuration
│   │   ├── blendUtils.js         # DeFi transaction functions
│   │   ├── writeScore.js         # Blockchain writing
│   │   └── useRiskScore.js       # Risk score hook
│   └── providers/
│       └── WalletProvider.jsx    # Wallet context
├── risk_score/                  # Rust smart contract
│   └── src/lib.rs               # Risk score recording
└── docs/                       # Documentation
```

## 🚀 Installation and Running

### Requirements

- Node.js 18+
- npm or yarn

### Steps

1. **Clone the project**

```bash
git clone <repository-url>
cd stellar-hackathon
```

2. **Install dependencies**

```bash
npm install
```

3. **Run the application**

```bash
npm run dev
```

4. **Open in browser**

```
http://localhost:3000
```

## 📱 Usage Guide

### 1. Risk Score Calculation

1. Connect wallet (Albedo/xBull/Freighter)
2. Enter your transaction data:
   - Transaction count (0-100)
   - Average time interval (0-24)
   - Asset diversity (0-10)
   - Optional: Average/Max amount, Night ratio
3. Click "Calculate and Save Risk Score" button
4. Confirm blockchain recording transaction

### 2. Blend DeFi Dashboard

After risk score is recorded:

- ✅ Blend Dashboard appears automatically
- 🎯 Risk-based recommendations are shown
- 🌊 Test DeFi operations with demo pools

### 3. Demo Pool Operations

- **Supply**: Collateral deposit simulation
- **Borrow**: Borrowing simulation
- **Withdraw**: Withdrawal simulation
- **Repay**: Payment simulation

## ⚠️ Important Notes

### Current Status

- ✅ Risk scoring system working
- ✅ Demo pools working stably
- ⚠️ Real Blend pools temporarily disabled
- 🔧 Due to Blend SDK v2 configuration issues

### Risk Recommendations

- **Low Risk (0-30)**: 80% collateral ratio, aggressive positions
- **Medium Risk (31-70)**: 70% collateral ratio, balanced approach
- **High Risk (71-100)**: 50% collateral ratio, conservative strategy

## 🔧 Development Notes

### Known Issues

1. ✅ **RESOLVED**: React key prop errors
2. ✅ **RESOLVED**: Pool loading error (bypassed in demo mode)
3. ⚠️ **ONGOING**: Blend SDK v2 `min_collateral` incompatibility

### Next Steps

- [ ] Resolve Blend SDK configuration issues
- [ ] Reactivate real pools
- [ ] Add Mainnet support
- [ ] Advanced risk analytics

## 📋 Test Scenario

1. **Risk Score Test**

   - Transaction count: 25, Time interval: 8, Asset diversity: 3
   - Expected: ~40-50 risk score (Medium Risk)

2. **Demo Pool Test**

   - Select Demo Main Pool
   - Perform 10 XLM supply simulation
   - Confirm success message

3. **Wallet Test**
   - Test different wallets
   - Disconnect/reconnect

## 🤝 Contributing

1. Fork it
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Create a Pull Request

## 📄 License

This project was developed for Stellar Hackathon.

## 📞 Contact

- GitHub Issues: For technical problems
- Stellar Discord: For community support

---

**Note**: This application runs on Stellar Testnet. Additional security measures are required for Mainnet usage.
