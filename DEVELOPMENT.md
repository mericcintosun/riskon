# Development Guide

## Getting Started

### Prerequisites
- Node.js >= 20
- pnpm >= 9 (or npm)
- Rust >= 1.78 + `wasm32-unknown-unknown` target
- Soroban CLI >= 24.0.0
- Redis (for backend services)

### Installation

```bash
# Clone the repository
git clone https://github.com/mericcintosun/riskon.git
cd riskon

# Install dependencies
npm install

# Copy environment file
cp env.example .env.local

# Fill in your environment variables
nano .env.local
```

### Running the Application

```bash
# Development mode
npm run dev

# Production build
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

## Project Structure

```
riskon/
├── src/
│   ├── app/              # Next.js app router pages
│   ├── components/       # React components
│   ├── config/           # Configuration (env validation)
│   ├── contexts/         # React contexts
│   ├── hooks/            # Custom hooks
│   ├── lib/              # Utility libraries
│   │   ├── validation.ts      # Input validation
│   │   ├── apiRetry.ts        # API retry logic
│   │   ├── cacheManager.ts    # Caching strategy
│   │   ├── accessibility.ts   # A11y utilities
│   │   └── performanceUtils.ts # Performance helpers
│   └── providers/        # React providers
├── risk_score/           # Soroban smart contract (Rust)
├── backend/              # Node.js backend services
├── scripts/              # Utility scripts
└── public/               # Static assets
```

## Key Features

### Environment Validation
All environment variables are validated at startup using Zod schemas.

```typescript
import { validateEnv } from '@/config/env';
const env = validateEnv();
```

See [src/config/ENV_VALIDATION_README.md](src/config/ENV_VALIDATION_README.md) for details.

### Input Validation
Comprehensive validation for all user inputs.

```typescript
import { Validators } from '@/lib/validation';
const result = Validators.stellarAddress(address);
```

### API Retry Mechanism
Automatic retry with exponential backoff and circuit breaker.

```typescript
import { fetchWithProtection } from '@/lib/apiRetry';
const response = await fetchWithProtection(url);
```

### Caching Strategy
Intelligent caching with TTL and version management.

```typescript
import { cache } from '@/lib/cacheManager';
cache.set('key', data, { ttl: 5 * 60 * 1000 });
```

### Accessibility
ARIA labels and keyboard navigation support.

```typescript
import { keyboardHandlers } from '@/lib/accessibility';
const props = keyboardHandlers.onActivate(callback);
```

### Performance
Debouncing, throttling, and memoization utilities.

```typescript
import { debounce } from '@/lib/performanceUtils';
const debouncedFn = debounce(fn, 300);
```

## Testing

```bash
# Run all tests
npm test

# Environment validation tests
node scripts/test-env-validation-simple.js

# Input validation tests
node scripts/test-validation.js

# API retry tests
node scripts/test-api-retry.js
```

## Smart Contract Development

### Building Contracts

```bash
cd risk_score
cargo build --target wasm32-unknown-unknown --release
```

### Running Contract Tests

```bash
cd risk_score
cargo test
```

### Deploying Contracts

```bash
soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/risk_score.wasm \
  --network testnet \
  --source YOUR_SECRET_KEY
```

## Backend Services

### Liquidity Monitor

```bash
cd backend
npm install
node liquidityMonitor.js
```

Requires Redis running on localhost:6379 (or configured in .env)

## Code Style

- Use TypeScript for new code
- Follow existing naming conventions
- Add JSDoc comments for public APIs
- Run linter before committing: `npm run lint`

## Contributing

1. Create a feature branch
2. Make your changes
3. Add tests
4. Run linting and tests
5. Submit a pull request

See [CONTRIBUTIONS.md](CONTRIBUTIONS.md) for details on recent contributions.

## Common Issues

### Module Resolution Errors
```bash
# Clear Next.js cache
rm -rf .next
npm run dev
```

### Contract Deployment Fails
- Check your Stellar account has enough XLM
- Verify network configuration in .env
- Ensure Soroban CLI is up to date

### Redis Connection Failed
```bash
# Start Redis
redis-server

# Or use Docker
docker run -p 6379:6379 redis
```

## Resources

- [Stellar Documentation](https://developers.stellar.org/)
- [Soroban Documentation](https://soroban.stellar.org/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Passkey Kit](https://docs.stellar.org/passkey-kit)

## Project Structure
Explain where core logic lives:
- app / pages
- components
- lib / utils
- blockchain / contract integration
- AI / scoring related logic

## Local Development Workflow
1. install dependencies
2. configure env variables
3. run dev server
4. run tests before submitting changes

## Documentation Expectations
When adding a new module or utility:
- include comments for non-obvious logic
- document public interfaces
- keep README and development docs in sync