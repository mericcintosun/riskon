# Contract Testing Documentation

This document describes the comprehensive testing infrastructure for the Riskon smart contract.

## Overview

The Riskon contract includes a robust testing framework covering:
- **Unit Tests**: Core contract functionality
- **Integration Tests**: Multi-user scenarios and complex interactions
- **Gas Optimization Tests**: Performance and cost analysis
- **Simulation Tests**: Real-world usage scenarios

## Test Structure

### Unit Tests (`src/lib.rs`)
Located in the main contract file under `#[cfg(test)]` module.

**Coverage:**
- Contract initialization and admin management
- Risk tier setting and retrieval
- Authorization and access control
- Input validation (score bounds, tier validation)
- Tier access logic (TIER_1 ≤30, TIER_2 ≤70, TIER_3 all)
- Edge cases and error conditions

**Key Test Functions:**
- `test_initialize_and_get_admin()` - Admin setup
- `test_set_and_get_risk_tier()` - Basic CRUD operations
- `test_tier_access_tier1_boundary()` - Boundary conditions
- `test_admin_can_set_any_user_risk_tier()` - Admin override
- `test_unauthorized_cannot_set_other_user_risk_tier()` - Access control

### Integration Tests (`src/tests/integration_tests.rs`)
Complex multi-user scenarios and contract interactions.

**Test Scenarios:**
- Multi-user risk tier interactions
- Credit score progression over time
- Tier boundary conditions
- Concurrent user operations
- Admin override capabilities
- Data persistence validation

### Gas Optimization Tests (`src/tests/gas_optimization_tests.rs`)
Performance analysis and cost optimization.

**Test Categories:**
- Basic operation gas consumption
- Bulk operation efficiency
- Memory usage patterns
- Tier statistics performance
- Edge case optimization
- Large data scalability

### Simulation Tests (`src/tests/simulation_tests.rs`)
Real-world usage scenarios and stress testing.

**Simulation Scenarios:**
- Real-world credit scoring scenarios
- Credit score improvement simulation
- Lending protocol integration
- Risk-based fee structures
- Portfolio risk management
- High-volume stress testing

## Running Tests

### All Tests
```bash
cd risk_score
cargo test
```

### Specific Test Categories
```bash
# Unit tests only
cargo test --lib

# Integration tests
cargo test --test integration_tests

# Gas optimization tests
cargo test --test gas_optimization_tests

# Simulation tests
cargo test --test simulation_tests
```

### Test with Coverage
```bash
cd risk_score
cargo install cargo-tarpaulin
cargo tarpaulin --out Html
```

## Test Results Summary

### Current Test Coverage
- **Total Tests**: 23 unit tests + 6 integration tests + 7 gas tests + 6 simulation tests
- **Coverage Areas**: 100% contract function coverage
- **Test Categories**: Unit, Integration, Performance, Simulation

### Performance Benchmarks
- **Average set_risk_tier**: ~50,000 CPU instructions
- **Average get_risk_tier**: ~25,000 CPU instructions
- **Tier statistics**: ~100,000 CPU instructions
- **Memory usage**: ~100 bytes per user record

## CI/CD Pipeline

### Automated Testing (`.github/workflows/contract-tests.yml`)
The GitHub Actions workflow includes:

1. **Smart Contract Tests**
   - All unit and integration tests
   - Gas optimization benchmarks
   - Simulation tests

2. **Security Audit**
   - Dependency vulnerability scanning
   - Outdated dependency checking

3. **Code Quality**
   - Rust formatting checks
   - Clippy linting
   - Documentation generation

4. **Contract Analysis**
   - Binary size analysis
   - WASM optimization verification

### Test Triggers
- Push to `main`, `dev`, `develop` branches
- Pull requests to `main`, `dev`, `develop` branches

## Test Data and Fixtures

### Test Address Generation
Tests use `Address::generate(&env)` to create unique test addresses for each test run.

### Test Scenarios
- **New User**: Score 95, TIER_3 (high risk)
- **Established User**: Score 15, TIER_1 (low risk)
- **Medium Risk**: Score 55, TIER_2 (medium risk)

### Boundary Testing
Critical test values:
- Score 0, 30, 31, 70, 71, 100
- Tier boundaries for access control
- Maximum contract size limits

## Gas Optimization Guidelines

### Efficient Patterns
1. **Batch Operations**: Process multiple users in single transactions
2. **Storage Optimization**: Use tuple keys for better organization
3. **Event Publishing**: Minimal event data for lower costs
4. **Validation**: Early input validation to avoid unnecessary computation

### Performance Targets
- **set_risk_tier**: < 100,000 CPU instructions
- **get_risk_tier**: < 50,000 CPU instructions
- **can_access_tier**: < 25,000 CPU instructions
- **Contract size**: < 1MB WASM binary

## Troubleshooting

### Common Issues

**Issue**: Tests fail with "unauthorized" errors
**Solution**: Ensure proper admin initialization and caller authorization

**Issue**: Gas consumption too high
**Solution**: Check for inefficient storage patterns or unnecessary computations

**Issue**: Contract size exceeds limits
**Solution**: Optimize imports and remove unused dependencies

### Debug Commands
```bash
# Run tests with detailed output
cargo test -- --nocapture

# Run specific test with debugging
cargo test test_function_name -- --nocapture

# Check contract size
ls -lh target/wasm32-unknown-unknown/release/risk_score.wasm
```

## Future Enhancements

### Planned Additions
- [ ] Property-based testing with proptest
- [ ] Formal verification with kprove
- [ ] Cross-chain interaction tests
- [ ] Load testing with simulated network conditions
- [ ] Fuzzing for edge case discovery

### Testing Best Practices
1. **Test Isolation**: Each test should be independent
2. **Deterministic Results**: No reliance on external randomness
3. **Comprehensive Coverage**: Test all success and failure paths
4. **Performance Monitoring**: Regular gas cost analysis
5. **Documentation**: Clear test descriptions and scenarios

## Contributing

When adding new features:
1. Write tests first (TDD approach)
2. Ensure all existing tests pass
3. Add integration tests for complex scenarios
4. Update this documentation
5. Verify CI/CD pipeline success

## Resources

- [Soroban Testing Guide](https://soroban.stellar.org/docs/how-to-guides/testing)
- [Rust Testing Documentation](https://doc.rust-lang.org/book/ch11-00-testing.html)
- [Gas Optimization Techniques](https://soroban.stellar.org/docs/learn/gas)
- [Contract Security Best Practices](https://soroban.stellar.org/docs/learn/security)
