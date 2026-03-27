# Riskon Smart Contract Deployment Guide

## ⚡ Quick Start

### 1. Prerequisites

Before deploying, you need:

- **Soroban CLI** installed (check: `soroban version`)
- **Stellar Testnet Account** with XLM balance
  - Create free account: https://laboratory.stellar.org/#account-creator
  - Fund with testnet XLM: https://laboratory.stellar.org/#account-creator
- **Your account's secret key** (starts with "S")

### 2. View Current Status

```bash
# Check WASM file
ls -lh risk_score/target/wasm32-unknown-unknown/release/risk_score.wasm

# Check environment
cat .env.local | grep NEXT_PUBLIC_RISK_TIER_CONTRACT_ID
```

### 3. Deploy Contract

#### Option A: Using the deployment script (recommended)

```bash
chmod +x deploy-contract.sh
./deploy-contract.sh
```

When prompted, enter your **secret key** (starts with 'S').

#### Option B: Manual deployment

```bash
WASM_FILE="risk_score/target/wasm32-unknown-unknown/release/risk_score.wasm"
SECRET_KEY="S..."  # Your account secret key

soroban contract deploy \
  --wasm $WASM_FILE \
  --source-account "$SECRET_KEY" \
  --network testnet \
  --rpc-url https://soroban-testnet.stellar.org
```

### 4. Get Your Contract ID

After successful deployment, you'll see:
```
Contract deployed successfully! Contract ID: C...
```

### 5. Update Environment

Edit `.env.local`:
```
NEXT_PUBLIC_RISK_TIER_CONTRACT_ID=C...  # Replace with your contract ID
```

## 🚀 Contract Functions

The deployed contract supports:

### Query Functions
```javascript
// Get user's risk tier data
get_risk_tier(user_address)
// Returns: { score, tier, timestamp, chosen_tier }

// Get risk score only
get_score(user_address)
// Returns: 0-100

// Get Blend parameters (NEW ORACLE)
get_blend_params(user_address)
// Returns: { max_ltv_bps, collateral_factor_bps, rate_adjustment_bps, max_borrow_usd_cents, tier, score }

// Check tier access
can_access_tier(user_address, target_tier)
// Returns: boolean
```

### Write Functions
```javascript
// Set user's risk score and tier
set_risk_tier(user, score, tier, chosen_tier)

// Update chosen tier
update_chosen_tier(user, new_chosen_tier)

// Get tier statistics
get_tier_stats()
// Returns: { TIER_1: count, TIER_2: count, TIER_3: count }
```

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│  Riskon Risk Tier Contract (Soroban)       │
│  (Stellar Testnet)                          │
└────────────────┬────────────────────────────┘
                 │
        ┌────────┴─────────┬───────────────┐
        │                  │               │
        ▼                  ▼               ▼
   Frontend         Blend Pool         Web3 Apps
   (TensorFlow.js)  Integration        (Composable)
```

## 🔗 Integration Points

### 1. Frontend (Next.js)

The frontend uses the oracle automatically:

```javascript
import { loadRiskonBlendParams } from "./lib/blendUtils.js";

// Load user's Blend parameters from oracle
const params = await loadRiskonBlendParams(userAddress, localScore);

// Shows:
// - Max LTV (85%, 70%, or 50%)
// - Collateral factor
// - Interest rate adjustment (discount/premium)
// - Borrow cap
// - Eligible borrow assets
```

### 2. Blend Pool Integration

Blend pools (V2 or V3) can call:

```rust
let params = riskon_contract.call("get_blend_params", user_address);

// Use parameters for:
// - Risk-adjusted LTV enforcement
// - Dynamic interest rate adjustment
// - Asset-tier whitelisting
// - Borrow cap enforcement
```

### 3. JavaScript RPC Calls

```javascript
// Direct RPC simulation queries
const oracleData = await invoke_contract_function(
  RISK_TIER_CONTRACT_ID,
  "get_blend_params",
  [user_address]
);
```

## 📊 Tier Mapping

| Score | Tier   | Max LTV | Collateral | Rate | Borrow Cap |
|-------|--------|---------|------------|------|------------|
| 0-30  | TIER_1 | 85%     | 90%        | -50 bps | $50,000 |
| 31-70 | TIER_2 | 70%     | 75%        | ±0 bps  | $20,000 |
| 71-100| TIER_3 | 50%     | 55%        | +250 bps| $5,000  |

## 🔍 Verify Deployment

### On Stellar Expert
```
https://stellar.expert/explorer/testnet/contract/C...
```

### Using Soroban CLI
```bash
soroban contract read \
  --contract-id C... \
  --network testnet \
  --rpc-url https://soroban-testnet.stellar.org
```

## ⚠️ Troubleshooting

### Contract ID not working in frontend

1. Verify contract is deployed:
   ```bash
   soroban contract invoke ... --function get_tier_stats
   ```

2. Check `.env.local` is loaded:
   ```bash
   grep NEXT_PUBLIC_RISK_TIER_CONTRACT_ID .env.local
   ```

3. Check network in browser DevTools:
   - Should query: `https://soroban-testnet.stellar.org`

### Deployment fails with "insufficient balance"

Add more XLM to your testnet account using the faucet:
https://laboratory.stellar.org/#account-creator

### "Invalid secret key" error

Ensure your secret key:
- Starts with 'S'
- Is exactly 56 characters long
- Is on Stellar testnet (not mainnet)

## 📚 Resources

- [Soroban Documentation](https://developers.stellar.org/learn/fundamentals/conventions)
- [Stellar Lab](https://laboratory.stellar.org)
- [Blend Protocol Docs](https://docs.blend.capital)
- [Passkey Kit Docs](https://github.com/StellarWallets/passkey-kit)

## 🎯 Next Steps

1. **Deploy contract** using `./deploy-contract.sh`
2. **Verify** on https://stellar.expert/explorer/testnet
3. **Update .env.local** with your contract ID
4. **Restart frontend**: `pnpm dev`
5. **Test oracle** in browser at `http://localhost:3000`
