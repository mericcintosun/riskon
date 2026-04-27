use risk_score::{RiskTierContract, RiskTierContractClient};
use soroban_sdk::{Address, Env, Symbol};

/// Test complex multi-user scenarios
#[test]
fn test_multi_user_risk_tier_interactions() {
    let env = Env::default();
    let contract_id = env.register_contract(None, RiskTierContract);
    let client = RiskTierContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);
    let user3 = Address::generate(&env);

    let tier_1 = Symbol::new(&env, "TIER_1");
    let tier_2 = Symbol::new(&env, "TIER_2");
    let tier_3 = Symbol::new(&env, "TIER_3");

    // Initialize admin
    client.initialize(&admin);

    // Admin sets risk tiers for multiple users
    client.set_risk_tier(&admin, &user1, &15, &tier_1, &tier_1);
    client.set_risk_tier(&admin, &user2, &45, &tier_2, &tier_2);
    client.set_risk_tier(&admin, &user3, &85, &tier_3, &tier_3);

    // Verify all users have correct access
    assert!(client.can_access_tier(&user1, &tier_1));
    assert!(client.can_access_tier(&user1, &tier_2));
    assert!(client.can_access_tier(&user1, &tier_3));

    assert!(!client.can_access_tier(&user2, &tier_1));
    assert!(client.can_access_tier(&user2, &tier_2));
    assert!(client.can_access_tier(&user2, &tier_3));

    assert!(!client.can_access_tier(&user3, &tier_1));
    assert!(!client.can_access_tier(&user3, &tier_2));
    assert!(client.can_access_tier(&user3, &tier_3));

    // Verify tier statistics
    let stats = client.get_tier_stats();
    assert_eq!(stats.get(tier_1).unwrap(), 1);
    assert_eq!(stats.get(tier_2).unwrap(), 1);
    assert_eq!(stats.get(tier_3).unwrap(), 1);
}

/// Test risk score progression scenarios
#[test]
fn test_risk_score_progression() {
    let env = Env::default();
    let contract_id = env.register_contract(None, RiskTierContract);
    let client = RiskTierContractClient::new(&env, &contract_id);

    let user = Address::generate(&env);
    let tier_3 = Symbol::new(&env, "TIER_3");
    let tier_2 = Symbol::new(&env, "TIER_2");
    let tier_1 = Symbol::new(&env, "TIER_1");

    // Start with high risk
    client.set_risk_tier(&user, &user, &90, &tier_3, &tier_3);
    assert!(!client.can_access_tier(&user, &tier_1));
    assert!(!client.can_access_tier(&user, &tier_2));
    assert!(client.can_access_tier(&user, &tier_3));

    // Improve to medium risk
    client.set_risk_tier(&user, &user, &50, &tier_2, &tier_2);
    assert!(!client.can_access_tier(&user, &tier_1));
    assert!(client.can_access_tier(&user, &tier_2));
    assert!(client.can_access_tier(&user, &tier_3));

    // Improve to low risk
    client.set_risk_tier(&user, &user, &25, &tier_1, &tier_1);
    assert!(client.can_access_tier(&user, &tier_1));
    assert!(client.can_access_tier(&user, &tier_2));
    assert!(client.can_access_tier(&user, &tier_3));
}

/// Test boundary conditions for tier access
#[test]
fn test_tier_boundary_conditions() {
    let env = Env::default();
    let contract_id = env.register_contract(None, RiskTierContract);
    let client = RiskTierContractClient::new(&env, &contract_id);

    let tier_1 = Symbol::new(&env, "TIER_1");
    let tier_2 = Symbol::new(&env, "TIER_2");
    let tier_3 = Symbol::new(&env, "TIER_3");

    // Test exact boundary values
    let test_cases = vec![
        (0, true, true, true),    // TIER_1 boundary
        (30, true, true, true),   // TIER_1 boundary
        (31, false, true, true),  // Just above TIER_1
        (70, false, true, true),  // TIER_2 boundary
        (71, false, false, true), // Just above TIER_2
        (100, false, false, true), // Maximum score
    ];

    for (score, can_access_tier1, can_access_tier2, can_access_tier3) in test_cases {
        let user = Address::generate(&env);
        
        if score <= 30 {
            client.set_risk_tier(&user, &user, &score, &tier_1, &tier_1);
        } else if score <= 70 {
            client.set_risk_tier(&user, &user, &score, &tier_2, &tier_2);
        } else {
            client.set_risk_tier(&user, &user, &score, &tier_3, &tier_3);
        }

        assert_eq!(client.can_access_tier(&user, &tier_1), can_access_tier1);
        assert_eq!(client.can_access_tier(&user, &tier_2), can_access_tier2);
        assert_eq!(client.can_access_tier(&user, &tier_3), can_access_tier3);
    }
}

/// Test concurrent user operations
#[test]
fn test_concurrent_user_operations() {
    let env = Env::default();
    let contract_id = env.register_contract(None, RiskTierContract);
    let client = RiskTierContractClient::new(&env, &contract_id);

    let users: Vec<Address> = (0..10).map(|_| Address::generate(&env)).collect();
    let tier_2 = Symbol::new(&env, "TIER_2");

    // Set risk tiers for multiple users
    for (i, user) in users.iter().enumerate() {
        let score = (i * 10) as u32;
        client.set_risk_tier(user, user, &score, &tier_2, &tier_2);
    }

    // Verify all users have correct scores
    for (i, user) in users.iter().enumerate() {
        let expected_score = (i * 10) as u32;
        let actual_score = client.get_score(user);
        assert_eq!(actual_score, expected_score);
    }

    // Verify tier statistics
    let stats = client.get_tier_stats();
    assert_eq!(stats.get(tier_2).unwrap(), 10);
}

/// Test admin override capabilities
#[test]
fn test_admin_override_capabilities() {
    let env = Env::default();
    let contract_id = env.register_contract(None, RiskTierContract);
    let client = RiskTierContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);

    let tier_1 = Symbol::new(&env, "TIER_1");
    let tier_3 = Symbol::new(&env, "TIER_3");

    // Initialize admin
    client.initialize(&admin);

    // User sets their own risk tier
    client.set_risk_tier(&user1, &user1, &25, &tier_1, &tier_1);
    assert_eq!(client.get_score(&user1), 25);

    // Admin overrides user's risk tier
    client.set_risk_tier(&admin, &user1, &85, &tier_3, &tier_3);
    assert_eq!(client.get_score(&user1), 85);

    // Admin can set risk tier for user who hasn't set their own
    client.set_risk_tier(&admin, &user2, &50, &tier_1, &tier_1);
    assert_eq!(client.get_score(&user2), 50);
}

/// Test data persistence across multiple operations
#[test]
fn test_data_persistence() {
    let env = Env::default();
    let contract_id = env.register_contract(None, RiskTierContract);
    let client = RiskTierContractClient::new(&env, &contract_id);

    let user = Address::generate(&env);
    let tier_1 = Symbol::new(&env, "TIER_1");
    let tier_2 = Symbol::new(&env, "TIER_2");

    // Set initial risk tier
    client.set_risk_tier(&user, &user, &25, &tier_1, &tier_1);

    // Update chosen tier
    client.update_chosen_tier(&user, &tier_2);

    // Verify all data is persisted correctly
    let risk_data = client.get_risk_tier(&user).unwrap();
    assert_eq!(risk_data.score, 25);
    assert_eq!(risk_data.tier, tier_1);
    assert_eq!(risk_data.chosen_tier, tier_2);

    let chosen_tier = client.get_chosen_tier(&user);
    assert_eq!(chosen_tier, tier_2);

    let score = client.get_score(&user);
    assert_eq!(score, 25);
}
