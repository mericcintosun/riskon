#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# Riskon Risk Tier Contract Deployment Guide
# ═══════════════════════════════════════════════════════════════════════════════
#
# This script helps deploy the RiskTierContract to Stellar Testnet.
# 
# Prerequisites:
#   1. Soroban CLI installed (soroban --version)
#   2. Stellar testnet account with XLM balance:
#      - Create free account at: https://laboratory.stellar.org/#account-creator
#      - Get testnet XLM from: https://laboratory.stellar.org/#account-creator
#   3. Your account's secret key (starts with "S")
#
# ═══════════════════════════════════════════════════════════════════════════════

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Riskon Risk Tier Contract Deployment${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════════════════${NC}"
echo ""

# Check if soroban CLI is installed
if ! command -v soroban &> /dev/null; then
    echo -e "${RED}✗ Soroban CLI not found${NC}"
    echo "Install from: https://github.com/stellar/rs-soroban-cli"
    exit 1
fi

echo -e "${GREEN}✓ Soroban CLI found: $(soroban version)${NC}"
echo ""

# Check if WASM file exists
WASM_FILE="risk_score/target/wasm32-unknown-unknown/release/risk_score.wasm"
if [ ! -f "$WASM_FILE" ]; then
    echo -e "${RED}✗ WASM file not found: $WASM_FILE${NC}"
    echo "Building Rust contract..."
    cd risk_score
    cargo build --target wasm32-unknown-unknown --release
    cd ..
fi

echo -e "${GREEN}✓ WASM file ready: $WASM_FILE${NC}"
echo -e "${YELLOW}  Size: $(ls -lh $WASM_FILE | awk '{print $5}')${NC}"
echo ""

# Read secret key from user
echo -e "${YELLOW}Enter your Stellar testnet secret key (starts with 'S'):${NC}"
read -s SECRET_KEY

# Validate secret key format
if [[ ! $SECRET_KEY =~ ^S[A-Z2-7]{55}$ ]]; then
    echo -e "${RED}✗ Invalid secret key format${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}Deploying contract...${NC}"
echo ""

# Deploy the contract
# Network passphrase for Stellar testnet
NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
RPC_URL="https://soroban-testnet.stellar.org"

CONTRACT_ID=$(soroban contract deploy \
  --wasm $WASM_FILE \
  --source-account "$SECRET_KEY" \
  --network testnet \
  --rpc-url "$RPC_URL" 2>&1 | grep -oP '(?<=Contract deployed successfully! Contract ID: )[^ ]*' || echo "")

if [ -z "$CONTRACT_ID" ]; then
    echo -e "${RED}✗ Deployment failed${NC}"
    echo "Try deploying manually with:"
    echo "  soroban contract deploy --wasm $WASM_FILE --source-account \$SECRET_KEY --network testnet"
    exit 1
fi

echo -e "${GREEN}✓ Contract deployed successfully!${NC}"
echo -e "${GREEN}  Contract ID: $CONTRACT_ID${NC}"
echo ""

# Update .env.local file
echo -e "${BLUE}Updating .env.local with contract ID...${NC}"

if [ -f ".env.local" ]; then
    sed -i "s/NEXT_PUBLIC_RISK_TIER_CONTRACT_ID=.*/NEXT_PUBLIC_RISK_TIER_CONTRACT_ID=$CONTRACT_ID/" .env.local
    sed -i "s/NEXT_PUBLIC_RISK_SCORE_CONTRACT_ID=.*/NEXT_PUBLIC_RISK_SCORE_CONTRACT_ID=$CONTRACT_ID/" .env.local
    echo -e "${GREEN}✓ .env.local updated${NC}"
else
    echo -e "${YELLOW}⚠ .env.local not found, creating...${NC}"
    cp env.example .env.local
    sed -i "s/NEXT_PUBLIC_RISK_TIER_CONTRACT_ID=.*/NEXT_PUBLIC_RISK_TIER_CONTRACT_ID=$CONTRACT_ID/" .env.local
    sed -i "s/NEXT_PUBLIC_RISK_SCORE_CONTRACT_ID=.*/NEXT_PUBLIC_RISK_SCORE_CONTRACT_ID=$CONTRACT_ID/" .env.local
    echo -e "${GREEN}✓ .env.local created with contract ID${NC}"
fi

# Update testnet.contracts.json
echo -e "${BLUE}Updating testnet.contracts.json...${NC}"

# Add RiskTier contract to testnet.contracts.json
npx jq '.ids.riskTier = "'"$CONTRACT_ID"'"' testnet.contracts.json > testnet.contracts.json.tmp && mv testnet.contracts.json.tmp testnet.contracts.json 2>/dev/null || \
  echo "Could not update testnet.contracts.json automatically - please add this line manually:"
echo "  \"riskTier\": \"$CONTRACT_ID\""

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Deployment Complete! 🎉${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "  1. Verify contract on Stellar Expert:"
echo "     https://stellar.expert/explorer/testnet/contract/$CONTRACT_ID"
echo ""
echo "  2. Run the frontend:"
echo "     pnpm install  (if not already done)"
echo "     pnpm dev"
echo ""
echo -e "${YELLOW}Environment variables set:${NC}"
echo "  NEXT_PUBLIC_RISK_TIER_CONTRACT_ID=$CONTRACT_ID"
echo ""
