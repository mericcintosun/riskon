# API Documentation - riskon Credit Scoring System

## Overview

The riskon system provides several APIs for integration with external applications and protocols. This document covers both the smart contract API and the frontend integration points.

## Smart Contract API

### RiskTierContract Interface

The core smart contract is deployed on Stellar and provides the following functions:

#### `set_risk_tier(env, user, score, tier, chosen_tier)`

Stores or updates a user's risk profile on-chain.

**Parameters:**
- `env`: Soroban environment context
- `user`: Stellar address of the user (String<Address>)
- `score`: Risk score (0-100) (u32)
- `tier`: Calculated risk tier (Symbol) - TIER_1, TIER_2, or TIER_3
- `chosen_tier`: User's preferred tier for operations (Symbol)

**Access Control:**
- Can only be called by the user themselves or authorized scoring contracts
- Requires valid Soroban transaction signature

**Example:**
```rust
// In your smart contract
let user_address = Address::from_string("G...")?;
let score = 25u32;
let tier = Symbol::from_str("TIER_1")?;
let chosen_tier = Symbol::from_str("TIER_1")?;

risktier_contract.set_risk_tier(
    &env,
    &user_address,
    &score,
    &tier,
    &chosen_tier
);
```

#### `get_risk_tier(env, user) -> RiskTierData`

Retrieves the complete risk profile for a user.

**Parameters:**
- `env`: Soroban environment context
- `user`: Stellar address of the user (String<Address>)

**Returns:** `RiskTierData` struct containing:
```rust
pub struct RiskTierData {
    pub score: u32,          // 0-100 risk score
    pub tier: Symbol,        // TIER_1, TIER_2, or TIER_3
    pub timestamp: u64,      // Unix timestamp of last update
    pub chosen_tier: Symbol, // User's chosen tier for operations
}
```

**Example:**
```rust
let user_data = risktier_contract.get_risk_tier(&env, &user_address);
println!("Score: {}", user_data.score);
println!("Tier: {}", user_data.tier);
```

#### `can_access_tier(env, user, target_tier) -> bool`

Checks if a user can access a specific risk tier.

**Parameters:**
- `env`: Soroban environment context
- `user`: Stellar address of the user (String<Address>)
- `target_tier`: Tier to check access for (Symbol)

**Returns:** Boolean indicating access permission

**Access Logic:**
- `TIER_1`: Accessible if score ≤ 30
- `TIER_2`: Accessible if score ≤ 70
- `TIER_3`: Accessible by all users (always returns true)

**Example:**
```rust
let can_access_tier1 = risktier_contract.can_access_tier(
    &env, 
    &user_address, 
    &Symbol::from_str("TIER_1")?
);
```

#### `update_score(env, user, new_score)`

Updates only the score component (for authorized scoring services).

**Parameters:**
- `env`: Soroban environment context
- `user`: Stellar address of the user (String<Address>)
- `new_score`: New risk score (0-100) (u32)

**Access Control:**
- Only callable by authorized scoring contracts
- Automatically recalculates tier based on new score

### Contract Deployment

#### Testnet Deployment
```bash
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/risktiercontract.wasm \
  --network testnet \
  --source <your_secret_key>
```

#### Mainnet Deployment
```bash
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/risktiercontract.wasm \
  --network mainnet \
  --source <your_secret_key>
```

## Frontend Integration API

### JavaScript/TypeScript SDK

#### Installation
```bash
npm install @riskon/sdk
# or
yarn add @riskon/sdk
```

#### Basic Usage
```typescript
import { RiskonClient } from '@riskon/sdk';

const client = new RiskonClient({
  horizonUrl: 'https://horizon-testnet.stellar.org',
  contractId: 'YOUR_CONTRACT_ID',
  network: 'testnet'
});

// Get user risk data
const userData = await client.getRiskTier('G...');
console.log('Score:', userData.score);
console.log('Tier:', userData.tier);

// Check tier access
const canAccess = await client.canAccessTier('G...', 'TIER_1');
console.log('Can access TIER_1:', canAccess);
```

### React Components

#### RiskScoreDisplay
```tsx
import { RiskScoreDisplay } from '@riskon/react';

function UserProfile({ userAddress }: { userAddress: string }) {
  return (
    <RiskScoreDisplay 
      address={userAddress}
      contractId="YOUR_CONTRACT_ID"
      network="testnet"
      showDetails={true}
    />
  );
}
```

#### TierGatedContent
```tsx
import { TierGatedContent } from '@riskon/react';

function PremiumFeatures({ userAddress }: { userAddress: string }) {
  return (
    <TierGatedContent
      address={userAddress}
      requiredTier="TIER_1"
      contractId="YOUR_CONTRACT_ID"
      fallback={<p>This content requires TIER_1 access</p>}
    >
      <PremiumContent />
    </TierGatedContent>
  );
}
```

## REST API (Optional Service)

For protocols that prefer REST integration, riskon provides a lightweight API service:

### Base URL
- Testnet: `https://api-testnet.riskon.dev`
- Mainnet: `https://api.riskon.dev`

### Endpoints

#### GET /v1/score/{address}

Retrieves a user's current risk score and tier.

**Parameters:**
- `address`: Stellar public key

**Response:**
```json
{
  "address": "G...",
  "score": 25,
  "tier": "TIER_1",
  "timestamp": 1640995200,
  "chosen_tier": "TIER_1"
}
```

#### GET /v1/access/{address}/{tier}

Checks if a user can access a specific tier.

**Parameters:**
- `address`: Stellar public key
- `tier`: TIER_1, TIER_2, or TIER_3

**Response:**
```json
{
  "address": "G...",
  "tier": "TIER_1",
  "can_access": true,
  "score": 25
}
```

#### POST /v1/score/calculate

Calculates a risk score (for authorized scoring services).

**Headers:**
- `Authorization: Bearer <api_key>`
- `Content-Type: application/json`

**Request Body:**
```json
{
  "address": "G...",
  "mode": "automated",
  "horizon_data": {
    "transaction_count": 150,
    "account_age": 365,
    "protocols_used": ["protocol1", "protocol2"],
    "avg_collateral_ratio": 0.75
  }
}
```

**Response:**
```json
{
  "score": 25,
  "tier": "TIER_1",
  "confidence": 0.87,
  "feature_importance": {
    "transaction_frequency": 0.3,
    "protocol_diversity": 0.25,
    "risk_management": 0.25,
    "account_age": 0.2
  }
}
```

## Integration Examples

### DeFi Lending Protocol Integration

```typescript
// Check if user qualifies for reduced collateral
async function getCollateralRequirement(userAddress: string) {
  const userData = await riskonClient.getRiskTier(userAddress);
  
  switch(userData.tier) {
    case 'TIER_1':
      return 0.5; // 50% collateral
    case 'TIER_2':
      return 0.75; // 75% collateral
    case 'TIER_3':
      return 1.0; // 100% collateral
    default:
      return 1.0;
  }
}

// Apply tier-based interest rates
function getInterestRate(userAddress: string, baseRate: number) {
  const userData = await riskonClient.getRiskTier(userAddress);
  
  const tierDiscounts = {
    'TIER_1': -0.02, // 2% discount
    'TIER_2': -0.01, // 1% discount
    'TIER_3': 0      // No discount
  };
  
  return baseRate + tierDiscounts[userData.tier] || baseRate;
}
```

### DEX Integration

```typescript
// Tier-based fee reduction
function getTradingFee(userAddress: string) {
  const userData = await riskonClient.getRiskTier(userAddress);
  
  const feeStructure = {
    'TIER_1': 0.001, // 0.1% fee
    'TIER_2': 0.002, // 0.2% fee
    'TIER_3': 0.003  // 0.3% fee
  };
  
  return feeStructure[userData.tier] || 0.003;
}
```

## Error Handling

### Common Error Codes

| Code | Description | Resolution |
|------|-------------|------------|
| `USER_NOT_FOUND` | No risk data found for address | User needs to complete scoring first |
| `INVALID_TIER` | Requested tier is not valid | Use TIER_1, TIER_2, or TIER_3 |
| `ACCESS_DENIED` | User cannot access requested tier | User score is too high for the tier |
| `CONTRACT_ERROR` | Smart contract execution failed | Check network status and retry |
| `INVALID_ADDRESS` | Stellar address format is invalid | Verify address format |

### Error Response Format
```json
{
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "No risk data found for this address",
    "details": {
      "address": "G...",
      "suggestion": "Complete the risk scoring process first"
    }
  }
}
```

## Rate Limits

### API Rate Limits
- **Free tier**: 100 requests per minute
- **Pro tier**: 1,000 requests per minute
- **Enterprise**: Custom limits

### Smart Contract Limits
- **Updates**: Once per 24 hours per user
- **Queries**: No rate limit
- **Bulk queries**: Maximum 100 addresses per request

## Security Considerations

### API Security
- Use HTTPS for all API calls
- Validate all input parameters
- Implement proper error handling
- Cache responses appropriately

### Smart Contract Security
- Verify contract address before interaction
- Validate transaction signatures
- Use proper Soroban environment checks
- Implement reentrancy protection

### Data Privacy
- All score calculations happen client-side
- Only final scores are stored on-chain
- No PII is transmitted or stored
- Users control their data sharing preferences

## Support

For integration support:
- **Documentation**: [docs.riskon.dev](https://docs.riskon.dev)
- **GitHub**: [github.com/riskon-labs/riskon](https://github.com/riskon-labs/riskon)
- **Email**: api@riskon.dev
- **Discord**: [discord.gg/riskon](https://discord.gg/riskon)

---

**Note**: This API documentation is for integration purposes. The riskon scoring system is for informational use only and does not constitute financial advice.
