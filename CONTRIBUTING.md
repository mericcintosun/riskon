# Contributing to Riskon

Thank you for your interest in contributing to Riskon! This guide will help you get started with contributing to our on-chain credit scoring system for Stellar.

## 🚀 Quick Start

### Prerequisites

- **Node.js** >= 20.0.0
- **pnpm** >= 9.0.0 (recommended) or npm >= 9.0.0
- **Rust** >= 1.78.0 with `wasm32-unknown-unknown` target
- **Soroban CLI** >= 24.0.0
- **Git** for version control

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/your-username/riskon.git
   cd riskon
   ```

2. **Install Dependencies**
   ```bash
   # Frontend dependencies
   pnpm install
   
   # Backend dependencies (if working on liquidity monitor)
   cd backend
   npm install
   cd ..
   ```

3. **Environment Setup**
   ```bash
   cp env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Start Development Server**
   ```bash
   pnpm dev
   ```

5. **Run Tests**
   ```bash
   # Frontend tests
   pnpm test
   
   # Smart contract tests
   cd risk_score
   cargo test
   ```

## 📁 Project Structure

```
riskon/
├── src/                          # Frontend source code
│   ├── components/               # React components
│   ├── lib/                      # Utility libraries
│   ├── contexts/                 # React contexts
│   ├── hooks/                    # Custom React hooks
│   ├── types/                    # TypeScript type definitions
│   └── app/                      # Next.js app router pages
├── backend/                      # Backend services
│   └── liquidityMonitor.js       # Liquidity monitoring service
├── risk_score/                   # Smart contract (Rust)
│   ├── src/                      # Contract source code
│   └── tests/                    # Contract tests
├── docs/                         # Documentation
│   ├── api/                      # API documentation
│   └── adr/                      # Architecture Decision Records
└── .storybook/                   # Storybook configuration
```

## 🎯 Types of Contributions

We welcome various types of contributions:

### 🐛 Bug Fixes
- Fix issues in the frontend, backend, or smart contracts
- Improve error handling and edge cases
- Performance optimizations

### ✨ Features
- New risk analysis features
- Enhanced user interface components
- Integration with new Stellar protocols
- Improved ML models and scoring algorithms

### 📚 Documentation
- Improve API documentation
- Add JSDoc/TSDoc comments
- Create tutorials and guides
- Update README and contributing guides

### 🧪 Testing
- Add unit tests for components and utilities
- Improve test coverage for smart contracts
- Add integration tests
- Performance testing

### 🎨 Design
- UI/UX improvements
- Component library enhancements
- Accessibility improvements
- Mobile responsiveness

## 🔄 Development Workflow

### 1. Create an Issue
Before starting work, create an issue or comment on an existing one to discuss your approach.

### 2. Create a Branch
```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-number-description
```

### 3. Make Changes
- Follow our coding standards (see below)
- Add tests for new functionality
- Update documentation as needed

### 4. Test Your Changes
```bash
# Run linting
pnpm lint

# Run tests
pnpm test

# Build the project
pnpm build

# Test smart contracts
cd risk_score && cargo test
```

### 5. Commit Changes
```bash
git add .
git commit -s -m "feat: add new risk analysis feature"
```

### 6. Push and Create PR
```bash
git push origin feature/your-feature-name
```
Create a Pull Request with:
- Clear description of changes
- Link to relevant issues
- Testing instructions
- Screenshots for UI changes

## 📝 Coding Standards

### JavaScript/TypeScript
- Use **ESLint** and **Prettier** configurations
- Follow **JSDoc/TSDoc** standards for documentation
- Use **TypeScript** for new code when possible
- Prefer functional components and hooks

### React Components
- Use **functional components** with hooks
- Follow **hooks-first** pattern
- Implement proper **error boundaries**
- Add **Storybook stories** for new components

### Smart Contracts (Rust)
- Follow **Rust** naming conventions
- Use **proper error handling** with Result types
- Add **comprehensive tests**
- Document public functions with comments

### Git Commits
Follow **Conventional Commits**:
- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `style:` Code style changes
- `refactor:` Code refactoring
- `test:` Test additions
- `chore:` Maintenance tasks

## 🧪 Testing Guidelines

### Frontend Testing
```bash
# Run all tests
pnpm test

# Run tests with coverage
pnpm test -- --coverage

# Run specific test file
pnpm test AutomatedRiskAnalyzer
```

### Smart Contract Testing
```bash
cd risk_score

# Run all tests
cargo test

# Run specific test
cargo test test_risk_tier_setting

# Run tests with output
cargo test -- --nocapture
```

### Integration Testing
```bash
# Test full flow
npm run test:integration

# Test API endpoints
npm run test:api
```

## 📖 Documentation Standards

### JSDoc/TSDoc Comments
```javascript
/**
 * Calculate risk score from transaction metrics
 * @param {Object} metrics - Transaction metrics from Horizon API
 * @returns {Object} Complete risk analysis result
 * @example
 * const result = calculateRiskScore(metrics);
 * console.log(result.riskScore); // 25
 */
export function calculateRiskScore(metrics) {
  // implementation
}
```

### Component Documentation
```jsx
/**
 * Risk Analyzer Component
 * 
 * Provides comprehensive risk analysis with ML scoring.
 * 
 * @component
 * @param {Object} props - Component props
 * @param {string} props.walletAddress - User's wallet address
 * @returns {JSX.Element} Risk analyzer interface
 */
export default function RiskAnalyzer({ walletAddress }) {
  // implementation
}
```

### API Documentation
- Update OpenAPI specification in `docs/api/openapi.yaml`
- Include request/response examples
- Document error scenarios
- Add authentication requirements

## 🎨 Component Development

### Storybook Stories
Create stories for new components:
```jsx
export default {
  title: 'Components/YourComponent',
  component: YourComponent,
  parameters: {
    layout: 'centered',
  },
};

export const Default = {
  args: {
    // default props
  },
};
```

### Component Structure
```
src/components/
├── YourComponent.jsx
├── YourComponent.stories.jsx
├── YourComponent.test.js
└── YourComponent.module.css
```

## 🔧 Development Tools

### Recommended VS Code Extensions
- **ES7+ React/Redux/React-Native snippets**
- **Prettier - Code formatter**
- **ESLint**
- **Auto Rename Tag**
- **Bracket Pair Colorizer**
- **GitLens**

### Browser DevTools
- **React Developer Tools**
- **Redux DevTools** (if using Redux)
- **Stellar Laboratory** for blockchain testing

## 🚀 Deployment

### Testing Deployment
```bash
# Build for production
pnpm build

# Test production build locally
pnpm start

# Deploy to Vercel (if you have access)
vercel --prod
```

### Environment Variables
Required environment variables:
```bash
NEXT_PUBLIC_HORIZON=https://horizon-testnet.stellar.org
NEXT_PUBLIC_RISKTIER_CONTRACT_ID=your_contract_id
REDIS_HOST=localhost
REDIS_PORT=6379
```

## 🤝 Community Guidelines

### Code of Conduct
- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Assume good intentions

### Getting Help
- Create an issue for bugs or questions
- Join our Discord community
- Check existing documentation
- Search for similar issues first

### Review Process
- All PRs require at least one review
- Maintainers will review within 3-5 business days
- Address review feedback promptly
- Keep PRs focused and manageable

## 🏆 Recognition

Contributors will be recognized through:
- GitHub contributor statistics
- Release notes acknowledgments
- Community spotlight features
- Potential bounties for significant contributions

## 📞 Contact

- **GitHub Issues**: For bugs and feature requests
- **Discord**: For community discussion
- **Email**: team@riskon.dev (for security concerns)

## 📄 License

By contributing to Riskon, you agree that your contributions will be licensed under the same [MIT License](LICENSE) as the project.

---

Thank you for contributing to Riskon! Your contributions help make Stellar DeFi more accessible and secure for everyone. 🚀
