# Environment Variables Validation

This document explains the environment variables validation system implemented for the Riskon project.

## Overview

This implementation adds runtime validation of environment variables using [Zod](https://github.com/colinhacks/zod), a TypeScript-first schema validation library. It ensures all required configuration is present and valid before the application starts, preventing runtime errors caused by missing or misconfigured environment variables.

**Related Issue:** [#15 - Environment Variables Validation](https://github.com/mericcintosun/riskon/issues/15)

## Features

✅ **Runtime Validation** - Validates environment variables at application startup
✅ **Type Safety** - Provides TypeScript types for all environment variables
✅ **Clear Error Messages** - Descriptive validation errors with exact field names
✅ **Schema Validation** - Validates URLs, contract IDs, ports, and other formats
✅ **Separation of Concerns** - Separate validation for client-side and server-side variables
✅ **Development-Friendly** - Allows development to continue with warnings instead of crashes
✅ **Production-Safe** - Fails fast in production if configuration is invalid

## Files

```
src/config/
├── env.ts              # Zod schemas and validation functions
├── env.init.ts         # Initialization and auto-validation
└── ENV_VALIDATION_README.md  # This documentation
```

## Usage

### Automatic Initialization (Server-Side)

The validation runs automatically on server startup when you import the initialization module:

```typescript
// In your API routes or server-side code
import "../config/env.init";

// Environment is now validated and available
```

### Manual Validation

You can also manually validate environment variables:

```typescript
import { validateEnv, validateClientEnv, validateServerEnv } from "@/config/env";

// Validate all environment variables
const env = validateEnv();

// Validate only client-side variables
const clientEnv = validateClientEnv();

// Validate only server-side variables
const serverEnv = validateServerEnv();
```

### Type-Safe Environment Access

```typescript
import { getEnv } from "@/config/env";

// Type-safe access to environment variables
const rpcUrl = getEnv("NEXT_PUBLIC_RPC_URL");
const redisHost = getEnv("REDIS_HOST");
```

### Checking for Missing Variables

```typescript
import { checkMissingEnvVars } from "@/config/env";

const missing = checkMissingEnvVars();
if (missing.length > 0) {
  console.error("Missing variables:", missing);
}
```

## Environment Variables

### Required Variables

- `NEXT_PUBLIC_RPC_URL` - Stellar RPC endpoint URL
- `NEXT_PUBLIC_NETWORK_PASSPHRASE` - Network passphrase

### Client-Side Variables (NEXT_PUBLIC_*)

These are accessible in the browser:

- `NEXT_PUBLIC_RPC_URL` - Stellar RPC endpoint
- `NEXT_PUBLIC_NETWORK_PASSPHRASE` - Network passphrase
- `NEXT_PUBLIC_RISK_TIER_CONTRACT_ID` - Risk tier contract address
- `NEXT_PUBLIC_RISK_SCORE_CONTRACT_ID` - Risk score contract address
- `NEXT_PUBLIC_FACTORY_CONTRACT_ID` - Passkey factory contract
- `NEXT_PUBLIC_PASSKEY_ENABLED` - Enable/disable passkey features
- `NEXT_PUBLIC_WEBAUTHN_ORIGIN` - WebAuthn origin URL
- `NEXT_PUBLIC_API_BASE_URL` - API base URL
- `NEXT_PUBLIC_LIQUIDITY_API_URL` - Liquidity API URL
- `NEXT_PUBLIC_LAUNCHTUBE_API_URL` - Launchtube API URL
- `NEXT_PUBLIC_ENVIRONMENT` - Current environment

### Server-Side Variables

These are only available in server-side code:

#### Network Configuration
- `STELLAR_NETWORK` - Network type (TESTNET/PUBLIC)
- `STELLAR_RPC_URL` - RPC URL
- `HORIZON_URL` - Horizon API URL
- `STELLAR_NETWORK_PASSPHRASE` - Network passphrase

#### Redis
- `REDIS_HOST` - Redis hostname
- `REDIS_PORT` - Redis port (1-65535)
- `REDIS_PASSWORD` - Redis password

#### Backend Services
- `MONITORING_INTERVAL` - Liquidity monitoring interval (ms)
- `LIQUIDITY_API_PORT` - Liquidity API port

#### Security
- `JWT_SECRET` - JWT secret key
- `RATE_LIMIT_REQUESTS_PER_MINUTE` - Rate limit threshold
- `RATE_LIMIT_WINDOW_MS` - Rate limit window

#### External Services
- `LAUNCHTUBE_JWT` - Launchtube authentication token
- `MERCURY_URL` - Mercury service URL
- `MERCURY_JWT` - Mercury authentication token
- `COINGECKO_API_KEY` - CoinGecko API key

#### Feature Flags
- `FEATURE_PASSKEY_WALLET` - Enable passkey wallet
- `FEATURE_LIQUIDITY_MONITORING` - Enable liquidity monitoring
- `FEATURE_RISK_TIER_SYSTEM` - Enable risk tier system
- `FEATURE_AUTO_RISK_ANALYSIS` - Enable auto risk analysis
- `FEATURE_LAUNCHTUBE_SPONSORSHIP` - Enable Launchtube sponsorship

#### Debug Flags
- `DEBUG_LIQUIDITY_MONITORING` - Debug liquidity monitoring
- `DEBUG_RISK_CALCULATIONS` - Debug risk calculations
- `DEBUG_PASSKEY_OPERATIONS` - Debug passkey operations
- `DEBUG_CONTRACT_CALLS` - Debug contract calls

## Validation Rules

### URLs
- Must be valid HTTP/HTTPS URLs
- Example: `https://soroban-testnet.stellar.org`

### Contract IDs
- Must be 56 characters long
- Must start with 'C'
- Must contain only uppercase A-Z and 0-9
- Example: `CCGZV37C3FC2GLVNIHFEC6OVDHRFLQCELPTQLII44Z7RXZBEER5POPRO`

### Ports
- Must be between 1 and 65535
- Example: `3001`, `6379`

### Boolean Values
- Accepts: `"true"`, `"false"`, `"1"`, `"0"`
- Converted to boolean automatically

### Network Type
- Must be either `"TESTNET"` or `"PUBLIC"`

## Error Handling

### Development Mode
- Validation errors are logged as warnings
- Application continues to run
- Useful for iterative development

### Production Mode
- Validation errors cause the application to crash
- Prevents running with invalid configuration
- Ensures system reliability

## Example Error Messages

```
❌ Environment validation failed:
  • NEXT_PUBLIC_RPC_URL: Must be a valid URL (received: undefined)
  • REDIS_PORT: Port must be between 1 and 65535 (received: 70000)
  • NEXT_PUBLIC_RISK_TIER_CONTRACT_ID: Must be a valid Stellar contract ID (received: ABC123)
```

## Setup Instructions

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Fill in the required variables in `.env.local`

3. Start the application:
   ```bash
   npm run dev
   ```

4. If validation fails, check the error messages and fix the configuration

## Benefits

1. **Early Error Detection** - Catches configuration errors before they cause runtime failures
2. **Better Developer Experience** - Clear error messages guide developers to fix issues
3. **Type Safety** - TypeScript types ensure correct usage throughout the codebase
4. **Documentation** - Schema serves as living documentation of required configuration
5. **Production Safety** - Prevents deploying with invalid configuration
6. **Reduced Debugging Time** - No more mysterious "undefined" errors at runtime

## Extending the Validation

To add new environment variables:

1. Add the variable to `env.example`
2. Add validation to the appropriate schema in `src/config/env.ts`:
   - `clientEnvSchema` for NEXT_PUBLIC_* variables
   - `serverEnvSchema` for server-only variables
3. Update the TypeScript types (automatically inferred from schemas)
4. Document the variable in this README

Example:

```typescript
// Add to clientEnvSchema
const clientEnvSchema = z.object({
  // ... existing variables
  NEXT_PUBLIC_NEW_VARIABLE: z.string().min(1, "New variable is required"),
});
```

## Testing

To test the validation:

1. Remove a required variable from `.env.local`
2. Run `npm run dev`
3. Check that you see a validation error
4. Add the variable back
5. Run `npm run dev` again
6. Check that validation passes

## Troubleshooting

### "Module not found" error
- Make sure `zod` is installed: `npm install zod`

### Validation passes but variable is still undefined
- Make sure you're accessing NEXT_PUBLIC_* variables correctly
- Client-side: use `process.env.NEXT_PUBLIC_VAR`
- Server-side: import and use the validated env object

### Changes to .env.local not reflected
- Restart the development server after changing environment variables

## Contributing

When adding new features that require environment variables:

1. Add the variable to `env.example` with documentation
2. Add validation to `src/config/env.ts`
3. Update this README
4. Test with both valid and invalid values

## References

- [Zod Documentation](https://zod.dev/)
- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
- [Issue #15](https://github.com/mericcintosun/riskon/issues/15)
