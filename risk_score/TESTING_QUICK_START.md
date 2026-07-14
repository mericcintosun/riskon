# Soroban Smart Contract Test Framework - Quick Start

## Overview

This guide provides a quick start for testing the RiskTierContract using the Soroban test environment.

## Project Structure

```
risk_score/
├── src/lib.rs                      # Contract code + unit tests
├── tests/
│   ├── integration_tests.rs       # Integration & lifecycle tests
│   ├── simulation_tests.rs        # Real-world scenario simulations
│   └── gas_optimization_tests.rs  # Gas cost analysis & optimization
├── Cargo.toml                      # Project config & dependencies
└── TESTING.md                      # Comprehensive test documentation
```

## Quick Commands

### Run All Tests
```bash
cd risk_score
cargo test
```

### Run Specific Test Type
```bash
cargo test --lib                    # Unit tests only
cargo test --test integration_tests # Integration tests
cargo test --test simulation_tests  # Simulation tests  
cargo test --test gas_optimization_tests # Gas analysis
```

### Run Single Test
```bash
cargo test test_set_and_get_risk_tier -- --exact
```

### Run with Output
```bash
cargo test -- --nocapture --test-threads=1
```

### Release Build (Faster)
```bash
cargo test --release
```

## Test Structure

### Unit Tests (40+ tests in `src/lib.rs`)

**Categories:**
- Score management & validation
- Tier access control
- Data consistency  
- Timestamp tracking
- User tier management
- Edge cases & boundaries
- Stress scenarios

**Example:**
```rust
#[test]
fn test_tier_access_tier1_low_risk() {
    let env = Env::default();
    let contract_id = env.register_contract(None, RiskTierContract);
    let client = RiskTierContractClient::new(&env, &contract_id);

    let user = Address::generate(&env);
    let tier_1 = Symbol::new(&env, "TIER_1");
    
    client.set_risk_tier(&user, &25, &tier_1, &tier_1);
    assert!(client.can_access_tier(&user, &tier_1));
}
```

### Integration Tests (8 tests)

Verify contract behavior in deployment scenarios:
- Contract initialization
- User lifecycle management
- Event emission
- Storage consistency
- Contract upgrades
- Cross-contract interactions

### Simulation Tests (15+ scenarios)

Model real-world conditions:
- Market downturns & recoveries
- User acquisition scale
- Attack prevention
- Concurrent operations
- Time-based scenarios
- Liquidity pool integration
- Fee structures
- Governance voting

### Gas Optimization Tests (15+ analyses)

Analyze resource usage:
- Read operation efficiency
- Write operation costs
- Storage layout optimization
- Deduplication impact
- Batch operation potential
- Cost estimation & monitoring

## Test Coverage

| Area | Coverage | Tests |
|------|----------|-------|
| Score validation | 100% | 6 |
| Tier access control | 100% | 7 |
| Chosen tier management | 100% | 6 |
| User tracking | 100% | 3 |
| Data consistency | 100% | 4 |
| Edge cases | 100% | 8+ |
| Stress/Scale | Comprehensive | 4 |

**Total: 80+ test cases**

## Tier Access Rules

```
Risk Score | TIER_1 | TIER_2 | TIER_3
-----------|--------|--------|--------
0-30       | ✓      | ✓      | ✓
31-70      | ✗      | ✓      | ✓
71-100     | ✗      | ✗      | ✓
```

**Bonus Rule:** High-risk users (score > 70) can only set chosen_tier to TIER_3.

## Key Test Scenarios

### Basic Flow
```rust
// 1. Create user
let user = Address::generate(&env);

// 2. Set risk tier
client.set_risk_tier(&user, &score, &tier, &chosen_tier);

// 3. Get risk data
let data = client.get_risk_tier(&user);

// 4. Check access
let can_access = client.can_access_tier(&user, &target_tier);
```

### Common Test Patterns

**Testing Valid Operations:**
```rust
client.set_risk_tier(&user, &25, &tier_1, &tier_1);
assert!(client.can_access_tier(&user, &tier_1));
```

**Testing Invalid Operations (Should Panic):**
```rust
#[test]
#[should_panic(expected = "Score must be 0-100")]
fn test_invalid_score() {
    client.set_risk_tier(&user, &101, &tier_1, &tier_1);
}
```

**Testing Boundary Conditions:**
```rust
// Boundary: score = 30 should allow TIER_1
client.set_risk_tier(&user, &30, &tier_1, &tier_1);
assert!(client.can_access_tier(&user, &tier_1));

// Boundary: score = 31 should deny TIER_1
client.set_risk_tier(&user, &31, &tier_2, &tier_2);
assert!(!client.can_access_tier(&user, &tier_1));
```

## Test Execution

### Expected Results
```
running 40 tests (unit tests)
running 8 tests (integration tests)
running 15+ tests (simulation tests)
running 15+ tests (gas analysis)

test result: ok. [Total tests passed]
```

### Expected Time
- **Unit tests**: ~20 seconds
- **Integration tests**: ~3 seconds
- **Simulation tests**: ~2 seconds
- **All tests**: ~26 seconds

## Common Issues

### Issue: Test Won't Compile
**Error**: `cannot find type 'RiskTierContractClient'`
**Fix**: Ensure soroban-sdk dependency in Cargo.toml includes testutils:
```toml
[dev-dependencies]
soroban-sdk = { version = "22.0.8", features = ["testutils"] }
```

### Issue: Tests Timeout
**Fix**: Run in release mode:
```bash
cargo test --release
```

### Issue: Storage Errors
**Fix**: Clear and rebuild:
```bash
cargo clean
cargo test
```

## Soroban Test Environment Features

The contract uses Soroban's built-in test environment:

```rust
let env = Env::default();           // Create test env
env.register_contract(...)          // Register contract
env.ledger().timestamp()            // Mock ledger time
env.storage()                       // In-memory storage
env.budget()                        // Resource tracking
```

## Gas Cost Estimates

| Operation | Stroops (est.) |
|-----------|----------------|
| set_risk_tier | 10,000-50,000 |
| get_risk_tier | 1,000-5,000 |
| get_score | 1,000-5,000 |
| can_access_tier | 1,000-5,000 |
| get_tier_users (n users) | 1,000 + 1000*n |
| get_tier_stats | 3,000-5,000 |
| update_chosen_tier | 5,000-20,000 |

*(1 stroop ≈ 0.0000001 XLM)*

## Writing New Tests

### Template
```rust
#[test]
fn test_new_behavior() {
    let env = Env::default();
    let contract_id = env.register_contract(None, RiskTierContract);
    let client = RiskTierContractClient::new(&env, &contract_id);

    // Setup
    let user = Address::generate(&env);
    let tier = Symbol::new(&env, "TIER_1");
    
    // Execute
    client.set_risk_tier(&user, &25, &tier, &tier);
    
    // Assert
    assert_eq!(client.get_score(&user), 25);
}
```

### Naming Convention
- `test_<operation>_<scenario>`
- Examples: `test_tier_access_boundary`, `test_score_validation`

## Deployment Checklist

Before mainnet deployment:

- [ ] All 80+ tests pass
- [ ] Release build passes: `cargo test --release`
- [ ] No unwanted panics
- [ ] Gas estimates documented
- [ ] Events verified
- [ ] Edge cases validated

## Debugging Tests

### Print Debug Info
```rust
println!("Score: {}", score);
```

Run with:
```bash
cargo test -- --nocapture
```

### Step Through Execution
```bash
cargo test test_name -- --exact -- --nocapture
```

## Resources

- 📖 [Soroban Docs](https://developers.stellar.org/learn/building-apps/smart-contracts)
- 🧪 [Testing Guide](https://developers.stellar.org/docs/learn/building-apps/smart-contracts/testing)
- 📦 [SDK Repository](https://github.com/stellar/rs-soroban-sdk)
- 📚 [Full Documentation](./TESTING.md)

## Next Steps

1. **Run tests**: `cargo test`
2. **Review results**: Check test output
3. **Explore test code**: Read through test cases
4. **Add tests**: Create new tests for features
5. **Analyze gas**: Review gas optimization tests
6. **Deploy**: Follow deployment checklist

---

**Version**: 2.0  
**Last Updated**: 2026-03-22  
**Soroban SDK**: 22.0.8
