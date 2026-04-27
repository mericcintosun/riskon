# Riskon Documentation

Welcome to the comprehensive documentation for Riskon, an on-chain credit scoring system for Stellar undercollateralized lending.

## 📚 Documentation Overview

This documentation provides comprehensive information about the Riskon system, from high-level architecture to detailed API references.

### 🏠 [Main README](../README.md)
- Project overview and goals
- Quick start guide
- Architecture overview
- Technology stack

### 🤝 [Contributing Guide](../CONTRIBUTING.md)
- Development setup
- Coding standards
- Testing guidelines
- Contribution workflow

## 📖 API Documentation

### [OpenAPI Specification](./api/openapi.yaml)
Complete API documentation including:
- Risk scoring endpoints
- Liquidity monitoring APIs
- User profile management
- Authentication and rate limiting

### API Endpoints Overview

#### Risk Scoring
- `GET /risk/score` - Get current risk score
- `POST /risk/analyze` - Calculate new risk score
- Rate limited: 1 request/hour per wallet

#### Liquidity Monitoring
- `GET /liquidity/pools` - Get pool data with risk tiers
- `GET /liquidity/monitor` - Get monitoring status

#### User Profile
- `GET /wallet/profile` - Get comprehensive user profile

## 🏗️ Architecture Documentation

### Architecture Decision Records (ADRs)

#### [ADR-0001: Use Stellar and Soroban](./adr/0001-use-stellar-soroban.md)
Decision to use Stellar blockchain and Soroban smart contracts for the infrastructure.

#### [ADR-0002: Client-Side ML Processing](./adr/0002-client-side-ml-processing.md)
Decision to perform machine learning computations in the browser for privacy and scalability.

#### [ADR-0003: Passkey Authentication](./adr/0003-passkey-authentication.md)
Decision to use WebAuthn passkeys for secure, user-friendly wallet authentication.

## 🎨 Component Documentation

### Storybook Documentation
Interactive component documentation available through Storybook:

```bash
# Start Storybook development server
pnpm storybook

# Build Storybook for production
pnpm build-storybook
```

#### Key Components
- **AutomatedRiskAnalyzer** - Main risk analysis interface
- **BlendDashboard** - Liquidity pool management
- **UserRiskProfile** - User risk profile display
- **EnhancedLiquidityPools** - Pool discovery and interaction

### Component Architecture
```
src/components/
├── AutomatedRiskAnalyzer.jsx     # Main analysis interface
├── BlendDashboard.jsx             # Pool management
├── UserRiskProfile.jsx            # Risk profile display
├── EnhancedLiquidityPools.jsx     # Pool interaction
└── *.stories.jsx                  # Storybook documentation
```

## 🔧 Development Documentation

### Smart Contract Documentation
Located in `risk_score/` directory:
- Contract source code (Rust)
- Comprehensive test suite
- Deployment instructions
- API reference

### Frontend Documentation
Key libraries and utilities:
- `src/lib/horizonDataCollector.js` - Stellar data collection
- `src/lib/lightweightRiskModel.js` - ML risk scoring
- `src/lib/blendUtils.js` - Blend protocol integration

### Backend Services
- `backend/liquidityMonitor.js` - Liquidity monitoring service
- Redis caching for performance
- Real-time pool data updates

## 🧪 Testing Documentation

### Test Coverage
- **Smart Contracts**: 18 comprehensive tests
- **Frontend**: Jest + React Testing Library
- **Integration**: End-to-end workflow testing
- **Performance**: Load testing for ML models

### Running Tests
```bash
# Frontend tests
pnpm test

# Smart contract tests
cd risk_score && cargo test

# Integration tests
npm run test:integration

# Test coverage
pnpm test -- --coverage
```

## 🚀 Deployment Documentation

### Environment Setup
Required environment variables:
```bash
NEXT_PUBLIC_HORIZON=https://horizon-testnet.stellar.org
NEXT_PUBLIC_RISKTIER_CONTRACT_ID=your_contract_id
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Deployment Process
1. Build and test contracts
2. Deploy to Stellar Testnet
3. Configure frontend environment
4. Deploy frontend to Vercel
5. Start backend services

## 🔒 Security Documentation

### Security Measures
- Client-side ML processing for privacy
- Passkey authentication
- Rate limiting and caching
- Smart contract access controls
- Regular security audits

### Security Best Practices
- Never expose private keys
- Validate all inputs
- Use HTTPS for all communications
- Implement proper error handling
- Monitor for suspicious activity

## 📊 Performance Documentation

### Performance Optimizations
- Intelligent caching (5min TTL)
- Client-side ML processing
- Rate limiting for API calls
- Optimized smart contract operations
- Progressive loading for large datasets

### Monitoring
- API response times
- ML model performance
- Blockchain transaction costs
- User interaction metrics

## 🔮 Future Roadmap

### Planned Features
- Mainnet deployment
- DAO-governed model updates
- Cross-chain score oracle
- Risk-as-a-Service API
- Advanced ML models

### Technology Evolution
- Support for additional blockchains
- Enhanced privacy features
- Improved user experience
- Expanded protocol integrations

## 📞 Support and Community

### Getting Help
- **GitHub Issues**: Report bugs and request features
- **Discord Community**: Join discussions and get help
- **Documentation**: Check existing docs first
- **Email**: team@riskon.dev (security concerns only)

### Contributing
We welcome contributions! See the [Contributing Guide](../CONTRIBUTING.md) for detailed information on how to get started.

### License
This project is licensed under the MIT License. See [LICENSE](../LICENSE) for details.

---

## 📑 Document Index

| Document | Type | Last Updated |
|----------|------|--------------|
| [Main README](../README.md) | Overview | 2024-01-15 |
| [Contributing Guide](../CONTRIBUTING.md) | Development | 2024-01-15 |
| [API Documentation](./api/openapi.yaml) | API Reference | 2024-01-15 |
| [ADR-0001](./adr/0001-use-stellar-soroban.md) | Architecture | 2024-01-15 |
| [ADR-0002](./adr/0002-client-side-ml-processing.md) | Architecture | 2024-01-16 |
| [ADR-0003](./adr/0003-passkey-authentication.md) | Architecture | 2024-01-17 |
| [Testing Guide](../TESTING.md) | Testing | 2024-01-15 |
| [Development Guide](../DEVELOPMENT.md) | Development | 2024-01-15 |
| [Security Guide](../SECURITY.md) | Security | 2024-01-15 |

---

*This documentation is continuously evolving. Check back regularly for updates and new content.*
