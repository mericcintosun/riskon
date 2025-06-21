# 🚀 Enhanced Stellar Risk & Liquidity Management System

## Complete Setup & Deployment Guide

### **System Overview**

Bu gelişmiş sistem şu bileşenleri içerir:

1. **🔄 Backend Liquidity Monitor** - Horizon API'den TVL verilerini çeker ve Redis'e tier'lara göre yazar
2. **🔧 Enhanced Smart Contract** - Risk skorları + tier bilgisini tuple-key'le saklar
3. **🔐 Passkey-Kit Integration** - Passwordless wallet + Launchtube gas sponsorship
4. **📊 Type-Safe Contract Client** - Soroban CLI generated TypeScript bindings
5. **🎯 Risk-Based Pool UI** - Goldfinch/Maple metodolojisi ile tier filtreleme

---

## **🛠️ Prerequisites**

### **System Requirements**

- **Node.js** 18+
- **Redis** 6+
- **Rust** 1.70+ (Soroban contract development)
- **Stellar CLI** latest version
- **Git**

### **External Services**

- **Stellar Testnet** account with XLM
- **Redis** instance (local or cloud)
- **Launchtube** sponsor account (optional for gas-free transactions)

---

## **📦 Installation Steps**

### **1. Clone Repository**

```bash
git clone <your-repository-url>
cd stellar-hackathon
```

### **2. Install Dependencies**

**Frontend Dependencies:**

```bash
npm install
```

**Backend Dependencies:**

```bash
cd backend
npm install
cd ..
```

**Rust Contract Dependencies:**

```bash
cd risk_score
cargo build --target wasm32-unknown-unknown --release
cd ..
```

### **3. Environment Setup**

```bash
# Copy environment template
cp env.example .env.local

# Edit with your values
nano .env.local
```

### **4. Redis Setup**

**Option A: Local Redis**

```bash
# Install Redis (Ubuntu/Debian)
sudo apt update
sudo apt install redis-server

# Start Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Test connection
redis-cli ping
# Should return: PONG
```

**Option B: Docker Redis**

```bash
docker run -d \
  --name stellar-redis \
  -p 6379:6379 \
  redis:7-alpine
```

**Option C: Cloud Redis**

- Use Redis Cloud, AWS ElastiCache, or similar
- Update REDIS_HOST and REDIS_PORT in .env.local

---

## **🔧 Smart Contract Deployment**

### **1. Build Contract**

```bash
cd risk_score
cargo build --target wasm32-unknown-unknown --release
```

### **2. Deploy to Testnet**

```bash
# Configure Stellar CLI for testnet
stellar network add testnet \
  --rpc-url https://soroban-testnet.stellar.org \
  --network-passphrase "Test SDF Network ; September 2015"

# Create account (if needed)
stellar keys generate --network testnet --name deployer

# Fund account
stellar keys fund deployer --network testnet

# Deploy contract
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/risk_score.wasm \
  --source-account deployer \
  --network testnet

# Save the returned contract ID to .env.local
```

### **3. Generate TypeScript Bindings**

```bash
# Generate type-safe client
stellar contract bindings typescript \
  --network testnet \
  --source-account deployer \
  --contract-id <YOUR_CONTRACT_ID> \
  --output-dir ./src/lib/generated

# Update src/lib/riskTierClient.ts to use generated bindings
```

---

## **🔄 Backend Services Setup**

### **1. Start Liquidity Monitor**

```bash
# Terminal 1: Start backend service
cd backend
npm start

# Should see:
# ✅ Connected to Redis
# 🔍 Fetching liquidity pools from Horizon...
# ✅ Retrieved X liquidity pools
# 🚀 Liquidity monitoring API running on port 3001
```

### **2. Verify Backend API**

```bash
# Test API endpoints
curl http://localhost:3001/api/liquidity-stats

# Should return tier statistics
{
  "TIER_1": 5,
  "TIER_2": 12,
  "TIER_3": 28,
  "total": 45,
  "lastUpdate": "2024-01-15T10:30:00.000Z"
}
```

---

## **🎯 Frontend Application Setup**

### **1. Start Development Server**

```bash
# Terminal 2: Start Next.js frontend
npm run dev

# Application will be available at:
# http://localhost:3000
```

### **2. Configure Passkey Integration**

**Update `.env.local`:**

```bash
# Passkey Configuration
NEXT_PUBLIC_PASSKEY_ENABLED=true
NEXT_PUBLIC_WEBAUTHN_ORIGIN=http://localhost:3000
NEXT_PUBLIC_LAUNCHTUBE_API_URL=https://api.launchtube.xyz
NEXT_PUBLIC_LAUNCHTUBE_SPONSOR_ACCOUNT=<your_sponsor_account>
```

### **3. Update Contract IDs**

```bash
# Add deployed contract IDs to .env.local
NEXT_PUBLIC_RISK_TIER_CONTRACT_ID=<your_deployed_contract_id>
NEXT_PUBLIC_RISK_SCORE_CONTRACT_ID=<legacy_contract_id_if_any>
```

---

## **🧪 Testing the System**

### **1. Risk Score & Tier Test**

```bash
# Open browser: http://localhost:3000
# 1. Connect wallet (Passkey or traditional)
# 2. Enter risk analysis data:
#    - Transaction count: 25
#    - Average hours: 8
#    - Asset types: 3
# 3. Click "Calculate & Save Risk Score"
# 4. Verify tier assignment (should be TIER_2 for score ~45)
```

### **2. Liquidity Pool Test**

```bash
# Navigate to enhanced pools section
# 1. Verify pools are loaded with tier badges
# 2. Check risk-based filtering works
# 3. Verify access control:
#    - Low risk users: Access to TIER_1 & TIER_2
#    - High risk users: Only TIER_3 with "opportunity" badge
```

### **3. Passkey Wallet Test**

```bash
# Test passwordless authentication
# 1. Click "Connect Passkey Wallet"
# 2. Create new passkey (fingerprint/face/PIN)
# 3. Verify smart wallet deployment
# 4. Test transaction signing
# 5. Verify gas sponsorship (no XLM cost)
```

---

## **📊 API Documentation**

### **Backend Liquidity Monitor APIs**

**Get Pool Tier Information:**

```
GET /api/pool/:poolId/tier
Response: {
  "poolId": "abc123...",
  "tier": "TIER_2",
  "tvl": 500000,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "totalAccounts": 45,
  "reserves": [...]
}
```

**Get Pools by Tier:**

```
GET /api/pools/tier/:tier
Response: [
  {
    "poolId": "abc123...",
    "tier": "TIER_1",
    "tvl": 1500000,
    ...
  }
]
```

**Get Tier Statistics:**

```
GET /api/liquidity-stats
Response: {
  "TIER_1": 5,
  "TIER_2": 12,
  "TIER_3": 28,
  "total": 45,
  "lastUpdate": "2024-01-15T10:30:00.000Z"
}
```

---

## **🔐 Security Considerations**

### **Smart Contract Security**

- ✅ Input validation on risk scores (0-100)
- ✅ Tier access control based on risk levels
- ✅ Tuple-key storage following Soroban best practices
- ✅ High-risk user protection (TIER_3 only access)

### **Passkey Security**

- ✅ WebAuthn platform authenticator required
- ✅ User verification mandatory
- ✅ Resident keys for offline authentication
- ✅ Smart wallet factory pattern

### **Backend Security**

- ✅ Rate limiting on API endpoints
- ✅ Redis auth if configured
- ✅ Input sanitization
- ✅ Error handling without data leakage

---

## **🚀 Production Deployment**

### **1. Environment Configuration**

```bash
# Update .env.local for production:
NODE_ENV=production
STELLAR_NETWORK=PUBLIC
STELLAR_RPC_URL=https://soroban.stellar.org
HORIZON_URL=https://horizon.stellar.org

# Deploy contracts to mainnet
# Update contract IDs
# Configure production Redis
```

### **2. Build & Deploy**

```bash
# Build frontend
npm run build

# Build backend
cd backend
npm run build

# Deploy to your hosting provider
# (Vercel, Netlify, AWS, etc.)
```

### **3. Monitoring Setup**

```bash
# Set up monitoring dashboards for:
# - Redis connection health
# - API response times
# - Contract call success rates
# - Liquidity pool update frequency
# - User tier distribution
```

---

## **📈 Presentation Points**

### **Market Validation (Goldfinch/Maple Reference)**

**Goldfinch Finance:**

- ✅ $100M+ TVL at peak
- ✅ Risk-based pool access proven model
- ✅ Under-collateralized lending success

**Maple Finance:**

- ✅ $1.6B+ in loan origination
- ✅ Institutional-grade risk assessment
- ✅ Pool delegate model for risk management

**Our Innovation:**

- ✅ Automated risk scoring vs manual assessment
- ✅ Real-time tier classification vs static pools
- ✅ Stellar blockchain efficiency vs Ethereum gas costs
- ✅ Passkey UX vs complex wallet management

### **Technical Excellence**

**Soroban Integration:**

- ✅ Persistent storage with tuple keys
- ✅ Type-safe contract bindings
- ✅ Gas-efficient risk tier storage
- ✅ Advanced access control logic

**User Experience:**

- ✅ Passwordless authentication
- ✅ Gas-free transactions via sponsorship
- ✅ Real-time risk-based recommendations
- ✅ Intuitive tier visualization

**Security & Compliance:**

- ✅ Risk-based access control
- ✅ User protection mechanisms
- ✅ Transparent tier methodology
- ✅ Audit-ready contract design

---

## **🔧 Troubleshooting**

### **Common Issues**

**Redis Connection Failed:**

```bash
# Check Redis status
redis-cli ping

# Restart if needed
sudo systemctl restart redis-server

# Check ports
netstat -tlnp | grep :6379
```

**Contract Deployment Failed:**

```bash
# Check account balance
stellar account --account-id <your-account>

# Fund if needed
stellar keys fund <your-key-name> --network testnet

# Verify network configuration
stellar network ls
```

**Passkey Creation Failed:**

```bash
# Check HTTPS requirement (localhost is OK for dev)
# Verify WebAuthn support:
console.log(!!window.PublicKeyCredential)

# Check browser compatibility
# Chrome 67+, Firefox 60+, Safari 14+
```

**Pool Loading Failed:**

```bash
# Check backend service
curl http://localhost:3001/api/liquidity-stats

# Verify Horizon API access
curl https://horizon-testnet.stellar.org/liquidity_pools?limit=1

# Check Redis data
redis-cli keys "liquidity_pool:*"
```

---

## **🎯 Success Metrics**

### **Demo Checklist**

- [ ] ✅ Backend monitoring service running
- [ ] ✅ Redis storing tier-classified pools
- [ ] ✅ Smart contract deployed with tier functions
- [ ] ✅ Passkey wallet creation works
- [ ] ✅ Risk score calculation and storage
- [ ] ✅ Tier-based pool filtering functional
- [ ] ✅ Gas sponsorship working
- [ ] ✅ Risk-based access control enforced
- [ ] ✅ Goldfinch/Maple methodology explained
- [ ] ✅ UI shows tier badges and recommendations

### **Performance Targets**

- **Pool Loading:** <2 seconds for 100+ pools
- **Risk Calculation:** <500ms for complex analysis
- **Contract Calls:** <3 seconds average
- **Passkey Operations:** <5 seconds for creation
- **Backend API:** <100ms response time

---

## **📞 Support & Documentation**

### **Technical Documentation**

- **Stellar Docs:** https://developers.stellar.org
- **Soroban Docs:** https://soroban.stellar.org
- **Passkey-Kit:** https://github.com/stellar/passkey-kit
- **Goldfinch Methodology:** https://docs.goldfinch.finance

### **Project Resources**

- **GitHub Issues:** For bug reports
- **Discord:** Stellar #soroban channel
- **Documentation:** This README + inline code comments

### **Contact**

- **Team:** Stellar Hackathon Participants
- **Email:** [Your contact email]
- **Demo:** [Deployed application URL]

---

**🎉 System Ready for Stellar Hackathon Presentation!**

Bu gelişmiş sistem, Goldfinch ve Maple Finance'ın kanıtlanmış metodolojilerini Stellar ekosisteminde modern UX ve güvenlikle birleştiriyor. Passkey entegrasyonu, otomatik tier sınıflandırması ve risk tabanlı likidite yönetimi ile DeFi'nin geleceğini bugün sunuyor.
