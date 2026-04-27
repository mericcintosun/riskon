# Testing Infrastructure for Riskon

This document describes the comprehensive testing infrastructure for the Riskon on-chain credit scoring system.

## Overview

Riskon now includes a robust testing framework covering:
- **Smart Contract Tests** (Rust/Soroban)
- **Frontend Component Tests** (Jest + React Testing Library)
- **Risk Model Tests** (JavaScript)
- **Integration Tests**

---

## Smart Contract Tests

### Location
`risk_score/src/lib.rs` - Tests are included in the same file using `#[cfg(test)]`

### Running Tests

```bash
cd risk_score
cargo test
```

### Test Coverage

The smart contract test suite includes **18 comprehensive tests** covering:

#### 1. Core Functionality Tests
- `test_set_and_get_risk_tier` - Basic set/get operations
- `test_score_validation_upper_bound` - Maximum score validation (100)
- `test_get_tier_users` - Tier-based user indexing
- `test_get_tier_stats` - Tier statistics aggregation

#### 2. Validation Tests
- `test_score_validation_exceeds_limit` - Rejects scores > 100
- `test_invalid_tier_validation` - Rejects invalid tier symbols

#### 3. Tier Access Control Tests
- `test_tier_access_tier1_low_risk` - TIER_1 access for low risk (≤30)
- `test_tier_access_tier1_boundary` - TIER_1 boundary case (score = 30)
- `test_tier_access_tier1_denied` - TIER_1 denied for medium risk
- `test_tier_access_tier2_medium_risk` - TIER_2 access for medium risk (≤70)
- `test_tier_access_tier3_always_accessible` - TIER_3 accessible to all

#### 4. Chosen Tier Management Tests
- `test_update_chosen_tier_valid` - Valid tier updates
- `test_update_chosen_tier_high_risk_restriction` - High risk users restricted to TIER_3

#### 5. Edge Case Tests
- `test_score_update_overwrites_previous` - Score updates work correctly
- `test_no_risk_data_returns_zero_score` - Unregistered users return 0
- `test_no_risk_data_denies_tier_access` - Unregistered users denied access
- `test_multiple_users_different_tiers` - Multi-user scenarios

### Test Philosophy

The test suite follows **Goldfinch/Maple risk-liquidity mapping methodology**:
- **TIER_1 (Low Risk)**: Score ≤ 30 - Premium access
- **TIER_2 (Medium Risk)**: Score ≤ 70 - Standard access
- **TIER_3 (High Risk)**: Score > 70 - Opportunity access (all users)

---

## Frontend Testing Setup

### Prerequisites

Install testing dependencies:

```bash
npm install --save-dev jest @testing-library/react @testing-library/jest-dom @testing-library/user-event jest-environment-jsdom @babel/preset-env @babel/preset-react identity-obj-proxy
```

### Configuration Files

- `jest.config.js` - Jest configuration
- `jest.setup.js` - Test environment setup with mocks

### Running Frontend Tests

```bash
npm test
```

### Test Structure

Frontend tests should be placed in:
- `src/**/__tests__/` - Test directories
- `src/**/*.test.js` - Test files alongside components

---

## Risk Model Testing

### Test Coverage Areas

1. **Score Calculation**
   - Feature normalization
   - Logistic regression computation
   - Tier mapping (0-100 → TIER_1/2/3)

2. **Feature Importance**
   - Volume impact
   - Counterparty diversity
   - Asset diversity
   - Night/day ratio

3. **Edge Cases**
   - Zero transaction history
   - Extreme values
   - Missing data handling

### Example Test Structure

```javascript
describe('Risk Score Calculation', () => {
  test('should calculate correct score for low-risk profile', () => {
    const metrics = {
      totalVolume: 5000,
      uniqueCounterparties: 25,
      assetDiversity: 5,
      nightDayRatio: 0.2
    };
    
    const result = calculateRiskScore(metrics);
    
    expect(result.riskScore).toBeLessThanOrEqual(30);
    expect(result.tier).toBe('TIER_1');
  });
});
```

---

## Integration Testing

### Horizon Data Collection Tests

Test the integration with Stellar Horizon API:

```javascript
describe('Horizon Data Collector', () => {
  test('should fetch transaction history', async () => {
    const address = 'GTEST...';
    const data = await collectHorizonData(address);
    
    expect(data).toHaveProperty('totalVolume');
    expect(data).toHaveProperty('uniqueCounterparties');
  });
});
```

### Contract Interaction Tests

Test the interaction between frontend and Soroban contract:

```javascript
describe('Risk Tier Contract Integration', () => {
  test('should set and retrieve risk tier', async () => {
    const user = generateTestAddress();
    await setRiskTier(user, 25, 'TIER_1');
    
    const data = await getRiskTier(user);
    expect(data.score).toBe(25);
    expect(data.tier).toBe('TIER_1');
  });
});
```

---

## Continuous Integration

### GitHub Actions Workflow

Create `.github/workflows/test.yml`:

```yaml
name: Test Suite

on: [push, pull_request]

jobs:
  smart-contract-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install Rust
        uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
          target: wasm32-unknown-unknown
      - name: Run Soroban tests
        run: |
          cd risk_score
          cargo test

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      - name: Install dependencies
        run: npm install
      - name: Run tests
        run: npm test
```

---

## Test Coverage Goals

- **Smart Contract**: ✅ 100% coverage (18/18 tests passing)
- **Frontend Components**: 🎯 Target 80%+ coverage
- **Risk Model**: 🎯 Target 90%+ coverage
- **Integration**: 🎯 Target 70%+ coverage

---

## Best Practices

### 1. Test Naming Convention
- Use descriptive names: `test_tier_access_tier1_boundary`
- Follow pattern: `test_<feature>_<scenario>_<expected_result>`

### 2. Test Independence
- Each test should be independent
- Use `beforeEach` for setup
- Clean up after tests

### 3. Edge Case Coverage
- Test boundary values (0, 30, 70, 100)
- Test invalid inputs
- Test missing data scenarios

### 4. Mock External Dependencies
- Mock Horizon API calls
- Mock contract interactions in frontend tests
- Use test fixtures for consistent data

---

## Running All Tests

```bash
# Smart contract tests
cd risk_score && cargo test

# Frontend tests
npm test

# With coverage
npm test -- --coverage

# Watch mode for development
npm test -- --watch
```

---

## Troubleshooting

### Common Issues

**Issue**: `cargo test` fails with file lock errors on Windows
**Solution**: Run `cargo clean` first, then retry

**Issue**: Jest can't find modules
**Solution**: Check `moduleNameMapper` in `jest.config.js`

**Issue**: React Testing Library errors
**Solution**: Ensure `jest.setup.js` is properly configured

---

## Future Enhancements

- [ ] Add E2E tests with Playwright
- [ ] Add performance benchmarks
- [ ] Add mutation testing
- [ ] Add visual regression tests
- [ ] Add load testing for contract operations

---

## Contributing

When adding new features:
1. Write tests first (TDD approach)
2. Ensure all existing tests pass
3. Add new test cases for edge scenarios
4. Update this documentation

---

## Resources

- [Soroban Testing Guide](https://soroban.stellar.org/docs/how-to-guides/testing)
- [React Testing Library](https://testing-library.com/react)
- [Jest Documentation](https://jestjs.io/)
- [Goldfinch Risk Model](https://docs.goldfinch.finance/)
