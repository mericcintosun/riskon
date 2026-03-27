#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# RISKON PROJECT - QUICK START GUIDE
# ═══════════════════════════════════════════════════════════════════════════════
#
# This file documents all commands needed to go from setup to live deployment.
#
# ═══════════════════════════════════════════════════════════════════════════════

# 📍 CURRENT STATUS
# ✅ Frontend: Running on http://localhost:3000
# ✅ Smart Contract: Built & ready
# ⏳ Deployment: Needs your testnet secret key

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 1: GET STELLAR TESTNET ACCOUNT (if you don't have one)
# ═══════════════════════════════════════════════════════════════════════════════

# 1a. Create account and get secret key:
#     Open: https://laboratory.stellar.org/#account-creator
#     Click "Generate keypair"
#     Save your secret key (starts with 'S')

# 1b. Fund account with testnet XLM:
#     Go to: https://laboratory.stellar.org/#account-creator
#     Click "Get test network lumens"
#     You'll get ~10,000 XLM for testing

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 2: DEPLOY SMART CONTRACT
# ═══════════════════════════════════════════════════════════════════════════════

# Navigate to project root
cd /home/muratkeskin/stellaropensource/riskon

# Option A: Use interactive deployment script (RECOMMENDED)
./deploy-contract.sh
# Script will:
#   1. Ask for your secret key
#   2. Deploy contract to Stellar testnet
#   3. Save contract ID to .env.local
#   4. Restart frontend if needed

# Option B: Manual deployment (advanced)
WASM_FILE="risk_score/target/wasm32-unknown-unknown/release/risk_score.wasm"
SECRET_KEY="SXXXXXXXXXXXXXXXX"  # Your secret key from Step 1

soroban contract deploy \
  --wasm $WASM_FILE \
  --source-account "$SECRET_KEY" \
  --network testnet \
  --rpc-url https://soroban-testnet.stellar.org

# After deployment, you'll see:
# "Contract deployed successfully! Contract ID: C..."
# Save this CONTRACT_ID

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 3: UPDATE ENVIRONMENT (if using manual deployment)
# ═══════════════════════════════════════════════════════════════════════════════

# Edit .env.local and replace with your contract ID:
sed -i 's/NEXT_PUBLIC_RISK_TIER_CONTRACT_ID=.*/NEXT_PUBLIC_RISK_TIER_CONTRACT_ID=CXXXXX.../' .env.local
sed -i 's/NEXT_PUBLIC_RISK_SCORE_CONTRACT_ID=.*/NEXT_PUBLIC_RISK_SCORE_CONTRACT_ID=CXXXXX.../' .env.local

# Verify:
grep NEXT_PUBLIC_RISK_TIER_CONTRACT_ID .env.local

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 4: VERIFY DEPLOYMENT
# ═══════════════════════════════════════════════════════════════════════════════

# Check contract on Stellar Expert:
# https://stellar.expert/explorer/testnet/contract/C...
#
# Or query with soroban CLI:
soroban contract invoke \
  --contract-id "C..." \
  --network testnet \
  --rpc-url https://soroban-testnet.stellar.org \
  -- get_tier_stats

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 5: TEST IN BROWSER
# ═══════════════════════════════════════════════════════════════════════════════

# 1. Frontend should auto-reload with new contract ID
#    If not, restart:
pnpm dev

# 2. Open http://localhost:3000 in browser

# 3. Click "Connect Wallet"
#    - Use Passkey (Face ID / fingerprint)
#    - Or choose alternate connection method

# 4. Go to "🌊 Blend DeFi" tab

# 5. Click "🔮 Credit Oracle" tab

# 6. You should see:
#    ✓ Riskon Score (0-100)
#    ✓ Credit Tier (TIER_1, TIER_2, TIER_3)
#    ✓ Max LTV (85%, 70%, or 50%)
#    ✓ Collateral Factor
#    ✓ Interest Rate Adjustment
#    ✓ Borrow Cap
#    ✓ Eligible Assets
#    ✓ Pool Access

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 6: TEST BLEND OPERATIONS (Optional)
# ═══════════════════════════════════════════════════════════════════════════════

# 1. Still in same "Blend DeFi" tab, scroll to "⚡ Execute Operation"

# 2. Try an operation:
#    - Select pool
#    - Choose operation (Supply/Borrow)
#    - Select asset (XLM, USDC, etc.)
#    - Enter amount
#    - Click button to execute

# 3. Pre-flight validation runs:
#    ✓ Checks if asset is allowed for your tier
#    ✓ Checks borrow cap
#    ✓ Shows warnings if needed
#    ✓ Only signs if all checks pass

# ═══════════════════════════════════════════════════════════════════════════════
# USEFUL COMMANDS
# ═══════════════════════════════════════════════════════════════════════════════

# View frontend logs:
# pnpm dev

# Stop frontend:
# Ctrl+C

# Restart dependencies:
# pnpm install

# Build frontend for production:
# pnpm build
# pnpm start

# Build contract:
# cd risk_score && cargo build --target wasm32-unknown-unknown --release

# Check soroban CLI version:
# soroban version

# Get account balance:
curl https://horizon-testnet.stellar.org/accounts/GXXXXXXXX... | grep "\"balances\""

# View all your contracts:
soroban contract list --network testnet

# ═══════════════════════════════════════════════════════════════════════════════
# TROUBLESHOOTING
# ═══════════════════════════════════════════════════════════════════════════════

# ❌ "Contract ID not in .env.local"
#    → Run deploy-contract.sh again or manually edit .env.local

# ❌ "Insufficient balance"
#    → Get more testnet XLM: https://laboratory.stellar.org/#account-creator

# ❌ "Invalid secret key"
#    → Ensure: starts with 'S', 56 chars, from Stellar testnet (not mainnet)

# ❌ "Frontend shows 404"
#    → Restart: pnpm dev
#    → Check port: lsof -i :3000

# ❌ "Oracle returns empty"
#    → Contract not deployed yet
#    → Contract ID wrong in .env.local
#    → Network passphrase mismatch

# ═══════════════════════════════════════════════════════════════════════════════
# DOCUMENTATION
# ═══════════════════════════════════════════════════════════════════════════════

# For more details, see:
# - SETUP_COMPLETE.md     (What was set up)
# - DEPLOYMENT.md         (Detailed deployment guide)
# - README.md            (Project overview)

# ═══════════════════════════════════════════════════════════════════════════════
# 🎉 You're all set! Deploy the contract and enjoy Riskon!
# ═══════════════════════════════════════════════════════════════════════════════
