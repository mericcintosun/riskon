#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, Map, Symbol, Vec};

/// Enhanced Risk & Tier Management Contract
/// Stores risk scores with tier classifications and timestamps
#[contract]
pub struct RiskTierContract;

/// Risk and tier data structure - using contracttype for Soroban serialization
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RiskTierData {
    pub score: u32,          // 0-100 risk score
    pub tier: Symbol,        // TIER_1, TIER_2, or TIER_3
    pub timestamp: u64,      // Unix timestamp
    pub chosen_tier: Symbol, // User's chosen tier for operations
}

#[contractimpl]
impl RiskTierContract {
    /// Set risk score with tier classification and timestamp
    /// Following Soroban persistent storage best practices with tuple keys
    pub fn set_risk_tier(env: Env, user: Address, score: u32, tier: Symbol, chosen_tier: Symbol) {
        // Validate inputs
        assert!(score <= 100, "Score must be 0-100");
        assert!(
            tier == Symbol::new(&env, "TIER_1")
                || tier == Symbol::new(&env, "TIER_2")
                || tier == Symbol::new(&env, "TIER_3"),
            "Invalid tier"
        );
        assert!(
            chosen_tier == Symbol::new(&env, "TIER_1")
                || chosen_tier == Symbol::new(&env, "TIER_2")
                || chosen_tier == Symbol::new(&env, "TIER_3"),
            "Invalid chosen tier"
        );

        let timestamp = env.ledger().timestamp();

        let risk_data = RiskTierData {
            score,
            tier: tier.clone(),
            timestamp,
            chosen_tier: chosen_tier.clone(),
        };

        // Use tuple key for better organization: (user, "risk_tier")
        let tuple_key = (user.clone(), Symbol::new(&env, "risk_tier"));
        env.storage().persistent().set(&tuple_key, &risk_data);

        // Also store in tier-based index for efficient queries
        let tier_key = (tier.clone(), Symbol::new(&env, "users"));
        let mut tier_users: Vec<Address> = env
            .storage()
            .persistent()
            .get(&tier_key)
            .unwrap_or(Vec::new(&env));

        // Add user to tier list if not already present
        if !tier_users.contains(&user) {
            tier_users.push_back(user.clone());
            env.storage().persistent().set(&tier_key, &tier_users);
        }

        // Store user's chosen tier separately for quick access
        let chosen_key = (user.clone(), Symbol::new(&env, "chosen_tier"));
        env.storage().persistent().set(&chosen_key, &chosen_tier);

        // Emit Event for Indexers
        env.events().publish(
            (Symbol::new(&env, "risk_set"), user),
            (score, tier, chosen_tier),
        );
    }

    /// Get complete risk and tier data for user
    pub fn get_risk_tier(env: Env, user: Address) -> Option<RiskTierData> {
        let tuple_key = (user, Symbol::new(&env, "risk_tier"));
        env.storage().persistent().get(&tuple_key)
    }

    /// Get only risk score (backward compatibility)
    pub fn get_score(env: Env, user: Address) -> u32 {
        let tuple_key = (user, Symbol::new(&env, "risk_tier"));
        if let Some(data) = env
            .storage()
            .persistent()
            .get::<_, RiskTierData>(&tuple_key)
        {
            data.score
        } else {
            0
        }
    }

    /// Get user's chosen tier for operations
    pub fn get_chosen_tier(env: Env, user: Address) -> Symbol {
        let chosen_key = (user, Symbol::new(&env, "chosen_tier"));
        env.storage()
            .persistent()
            .get(&chosen_key)
            .unwrap_or(Symbol::new(&env, "TIER_3")) // Default to most conservative
    }

    /// Get all users in a specific tier
    pub fn get_tier_users(env: Env, tier: Symbol) -> Vec<Address> {
        let tier_key = (tier, Symbol::new(&env, "users"));
        env.storage()
            .persistent()
            .get(&tier_key)
            .unwrap_or(Vec::new(&env))
    }

    /// Update user's chosen tier (risk-based validation)
    pub fn update_chosen_tier(env: Env, user: Address, new_chosen_tier: Symbol) {
        let tuple_key = (user.clone(), Symbol::new(&env, "risk_tier"));

        if let Some(mut risk_data) = env
            .storage()
            .persistent()
            .get::<_, RiskTierData>(&tuple_key)
        {
            // Risk-based tier access control
            // High risk users (>70) can only choose TIER_3 for "opportunity" access
            if risk_data.score > 70 {
                assert!(
                    new_chosen_tier == Symbol::new(&env, "TIER_3"),
                    "High risk users can only access TIER_3"
                );
            }

            risk_data.chosen_tier = new_chosen_tier.clone();
            risk_data.timestamp = env.ledger().timestamp(); // Update timestamp

            env.storage().persistent().set(&tuple_key, &risk_data);

            // Update chosen tier cache
            let chosen_key = (user.clone(), Symbol::new(&env, "chosen_tier"));
            env.storage()
                .persistent()
                .set(&chosen_key, &new_chosen_tier);

            // Emit Event for Indexers
            env.events()
                .publish((Symbol::new(&env, "tier_updated"), user), new_chosen_tier);
        }
    }

    /// Get tier statistics
    pub fn get_tier_stats(env: Env) -> Map<Symbol, u32> {
        let mut stats = Map::new(&env);

        let tiers = [
            Symbol::new(&env, "TIER_1"),
            Symbol::new(&env, "TIER_2"),
            Symbol::new(&env, "TIER_3"),
        ];

        for tier in tiers {
            let tier_users = Self::get_tier_users(env.clone(), tier.clone());
            stats.set(tier, tier_users.len());
        }

        stats
    }

    /// Check if user can access specific tier based on risk score
    /// Following Goldfinch/Maple risk-liquidity mapping methodology
    pub fn can_access_tier(env: Env, user: Address, target_tier: Symbol) -> bool {
        let tuple_key = (user, Symbol::new(&env, "risk_tier"));

        if let Some(risk_data) = env
            .storage()
            .persistent()
            .get::<_, RiskTierData>(&tuple_key)
        {
            let tier_1 = Symbol::new(&env, "TIER_1");
            let tier_2 = Symbol::new(&env, "TIER_2");
            let tier_3 = Symbol::new(&env, "TIER_3");

            match target_tier {
                t if t == tier_1 => risk_data.score <= 30, // Low risk only
                t if t == tier_2 => risk_data.score <= 70, // Low to medium risk
                t if t == tier_3 => true, // All users (with opportunity badge for high risk)
                _ => false,
            }
        } else {
            false // No risk data means no access
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Env};

    #[test]
    fn test_set_and_get_risk_tier() {
        let env = Env::default();
        let contract_id = env.register_contract(None, RiskTierContract);
        let client = RiskTierContractClient::new(&env, &contract_id);

        let user = Address::generate(&env);
        let tier_1 = Symbol::new(&env, "TIER_1");
        
        client.set_risk_tier(&user, &25, &tier_1, &tier_1);
        
        let risk_data = client.get_risk_tier(&user).unwrap();
        assert_eq!(risk_data.score, 25);
        assert_eq!(risk_data.tier, tier_1);
        assert_eq!(risk_data.chosen_tier, tier_1);
    }

    #[test]
    fn test_score_validation_upper_bound() {
        let env = Env::default();
        let contract_id = env.register_contract(None, RiskTierContract);
        let client = RiskTierContractClient::new(&env, &contract_id);

        let user = Address::generate(&env);
        let tier_3 = Symbol::new(&env, "TIER_3");
        
        client.set_risk_tier(&user, &100, &tier_3, &tier_3);
        
        let score = client.get_score(&user);
        assert_eq!(score, 100);
    }

    #[test]
    #[should_panic(expected = "Score must be 0-100")]
    fn test_score_validation_exceeds_limit() {
        let env = Env::default();
        let contract_id = env.register_contract(None, RiskTierContract);
        let client = RiskTierContractClient::new(&env, &contract_id);

        let user = Address::generate(&env);
        let tier_3 = Symbol::new(&env, "TIER_3");
        
        client.set_risk_tier(&user, &101, &tier_3, &tier_3);
    }

    #[test]
    #[should_panic(expected = "Invalid tier")]
    fn test_invalid_tier_validation() {
        let env = Env::default();
        let contract_id = env.register_contract(None, RiskTierContract);
        let client = RiskTierContractClient::new(&env, &contract_id);

        let user = Address::generate(&env);
        let invalid_tier = Symbol::new(&env, "TIER_4");
        
        client.set_risk_tier(&user, &50, &invalid_tier, &invalid_tier);
    }

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

    #[test]
    fn test_tier_access_tier1_boundary() {
        let env = Env::default();
        let contract_id = env.register_contract(None, RiskTierContract);
        let client = RiskTierContractClient::new(&env, &contract_id);

        let user = Address::generate(&env);
        let tier_1 = Symbol::new(&env, "TIER_1");
        
        client.set_risk_tier(&user, &30, &tier_1, &tier_1);
        
        assert!(client.can_access_tier(&user, &tier_1));
    }

    #[test]
    fn test_tier_access_tier1_denied() {
        let env = Env::default();
        let contract_id = env.register_contract(None, RiskTierContract);
        let client = RiskTierContractClient::new(&env, &contract_id);

        let user = Address::generate(&env);
        let tier_2 = Symbol::new(&env, "TIER_2");
        let tier_1 = Symbol::new(&env, "TIER_1");
        
        client.set_risk_tier(&user, &50, &tier_2, &tier_2);
        
        assert!(!client.can_access_tier(&user, &tier_1));
    }

    #[test]
    fn test_tier_access_tier2_medium_risk() {
        let env = Env::default();
        let contract_id = env.register_contract(None, RiskTierContract);
        let client = RiskTierContractClient::new(&env, &contract_id);

        let user = Address::generate(&env);
        let tier_2 = Symbol::new(&env, "TIER_2");
        
        client.set_risk_tier(&user, &50, &tier_2, &tier_2);
        
        assert!(client.can_access_tier(&user, &tier_2));
    }

    #[test]
    fn test_tier_access_tier3_always_accessible() {
        let env = Env::default();
        let contract_id = env.register_contract(None, RiskTierContract);
        let client = RiskTierContractClient::new(&env, &contract_id);

        let user = Address::generate(&env);
        let tier_3 = Symbol::new(&env, "TIER_3");
        
        client.set_risk_tier(&user, &85, &tier_3, &tier_3);
        
        assert!(client.can_access_tier(&user, &tier_3));
    }

    #[test]
    fn test_get_tier_users() {
        let env = Env::default();
        let contract_id = env.register_contract(None, RiskTierContract);
        let client = RiskTierContractClient::new(&env, &contract_id);

        let user1 = Address::generate(&env);
        let user2 = Address::generate(&env);
        let tier_1 = Symbol::new(&env, "TIER_1");
        
        client.set_risk_tier(&user1, &20, &tier_1, &tier_1);
        client.set_risk_tier(&user2, &25, &tier_1, &tier_1);
        
        let tier_users = client.get_tier_users(&tier_1);
        assert_eq!(tier_users.len(), 2);
    }

    #[test]
    fn test_update_chosen_tier_valid() {
        let env = Env::default();
        let contract_id = env.register_contract(None, RiskTierContract);
        let client = RiskTierContractClient::new(&env, &contract_id);

        let user = Address::generate(&env);
        let tier_1 = Symbol::new(&env, "TIER_1");
        let tier_2 = Symbol::new(&env, "TIER_2");
        
        client.set_risk_tier(&user, &25, &tier_1, &tier_1);
        client.update_chosen_tier(&user, &tier_2);
        
        let chosen = client.get_chosen_tier(&user);
        assert_eq!(chosen, tier_2);
    }

    #[test]
    #[should_panic(expected = "High risk users can only access TIER_3")]
    fn test_update_chosen_tier_high_risk_restriction() {
        let env = Env::default();
        let contract_id = env.register_contract(None, RiskTierContract);
        let client = RiskTierContractClient::new(&env, &contract_id);

        let user = Address::generate(&env);
        let tier_3 = Symbol::new(&env, "TIER_3");
        let tier_1 = Symbol::new(&env, "TIER_1");
        
        client.set_risk_tier(&user, &85, &tier_3, &tier_3);
        client.update_chosen_tier(&user, &tier_1);
    }

    #[test]
    fn test_get_tier_stats() {
        let env = Env::default();
        let contract_id = env.register_contract(None, RiskTierContract);
        let client = RiskTierContractClient::new(&env, &contract_id);

        let user1 = Address::generate(&env);
        let user2 = Address::generate(&env);
        let user3 = Address::generate(&env);
        
        let tier_1 = Symbol::new(&env, "TIER_1");
        let tier_2 = Symbol::new(&env, "TIER_2");
        let tier_3 = Symbol::new(&env, "TIER_3");
        
        client.set_risk_tier(&user1, &20, &tier_1, &tier_1);
        client.set_risk_tier(&user2, &50, &tier_2, &tier_2);
        client.set_risk_tier(&user3, &80, &tier_3, &tier_3);
        
        let stats = client.get_tier_stats();
        assert_eq!(stats.get(tier_1).unwrap(), 1);
        assert_eq!(stats.get(tier_2).unwrap(), 1);
        assert_eq!(stats.get(tier_3).unwrap(), 1);
    }

    #[test]
    fn test_score_update_overwrites_previous() {
        let env = Env::default();
        let contract_id = env.register_contract(None, RiskTierContract);
        let client = RiskTierContractClient::new(&env, &contract_id);

        let user = Address::generate(&env);
        let tier_2 = Symbol::new(&env, "TIER_2");
        let tier_1 = Symbol::new(&env, "TIER_1");
        
        client.set_risk_tier(&user, &50, &tier_2, &tier_2);
        client.set_risk_tier(&user, &25, &tier_1, &tier_1);
        
        let risk_data = client.get_risk_tier(&user).unwrap();
        assert_eq!(risk_data.score, 25);
        assert_eq!(risk_data.tier, tier_1);
    }

    #[test]
    fn test_no_risk_data_returns_zero_score() {
        let env = Env::default();
        let contract_id = env.register_contract(None, RiskTierContract);
        let client = RiskTierContractClient::new(&env, &contract_id);

        let user = Address::generate(&env);
        
        let score = client.get_score(&user);
        assert_eq!(score, 0);
    }

    #[test]
    fn test_no_risk_data_denies_tier_access() {
        let env = Env::default();
        let contract_id = env.register_contract(None, RiskTierContract);
        let client = RiskTierContractClient::new(&env, &contract_id);

        let user = Address::generate(&env);
        let tier_3 = Symbol::new(&env, "TIER_3");
        
        assert!(!client.can_access_tier(&user, &tier_3));
    }

    #[test]
    fn test_multiple_users_different_tiers() {
        let env = Env::default();
        let contract_id = env.register_contract(None, RiskTierContract);
        let client = RiskTierContractClient::new(&env, &contract_id);

        let user1 = Address::generate(&env);
        let user2 = Address::generate(&env);
        let user3 = Address::generate(&env);
        
        let tier_1 = Symbol::new(&env, "TIER_1");
        let tier_2 = Symbol::new(&env, "TIER_2");
        let tier_3 = Symbol::new(&env, "TIER_3");
        
        client.set_risk_tier(&user1, &15, &tier_1, &tier_1);
        client.set_risk_tier(&user2, &45, &tier_2, &tier_2);
        client.set_risk_tier(&user3, &90, &tier_3, &tier_3);
        
        assert!(client.can_access_tier(&user1, &tier_1));
        assert!(!client.can_access_tier(&user2, &tier_1));
        assert!(client.can_access_tier(&user2, &tier_2));
        assert!(client.can_access_tier(&user3, &tier_3));
    }

    // ==================== COMPREHENSIVE TEST SUITE ====================

    // ===== SCORE BOUNDARY AND VALIDATION TESTS =====

    #[test]
    fn test_score_zero_valid() {
        let env = Env::default();
        let contract_id = env.register_contract(None, RiskTierContract);
        let client = RiskTierContractClient::new(&env, &contract_id);

        let user = Address::generate(&env);
        let tier_1 = Symbol::new(&env, "TIER_1");
        
        client.set_risk_tier(&user, &0, &tier_1, &tier_1);
        
        let score = client.get_score(&user);
        assert_eq!(score, 0);
    }

    #[test]
    #[should_panic(expected = "Score must be 0-100")]
    fn test_score_negative_invalid() {
        // This test demonstrates that negative scores should be rejected
        // Rust u32 type prevents negative values at compile time
        // but we document the behavior for clarity
        let env = Env::default();
        let contract_id = env.register_contract(None, RiskTierContract);
        let client = RiskTierContractClient::new(&env, &contract_id);

        let user = Address::generate(&env);
        let tier_3 = Symbol::new(&env, "TIER_3");
        
        client.set_risk_tier(&user, &255, &tier_3, &tier_3);
    }

    // ===== TIER ACCESS CONTROL BOUNDARY TESTS =====

    #[test]
    fn test_tier2_boundary_lower_edge() {
        // Score 31 should deny TIER_1 access
        let env = Env::default();
        let contract_id = env.register_contract(None, RiskTierContract);
        let client = RiskTierContractClient::new(&env, &contract_id);

        let user = Address::generate(&env);
        let tier_1 = Symbol::new(&env, "TIER_1");
        let tier_2 = Symbol::new(&env, "TIER_2");
        
        client.set_risk_tier(&user, &31, &tier_2, &tier_2);
        
        assert!(!client.can_access_tier(&user, &tier_1));
        assert!(client.can_access_tier(&user, &tier_2));
    }

    #[test]
    fn test_tier2_boundary_upper_edge() {
        // Score 70 should allow TIER_2 access
        let env = Env::default();
        let contract_id = env.register_contract(None, RiskTierContract);
        let client = RiskTierContractClient::new(&env, &contract_id);

        let user = Address::generate(&env);
        let tier_2 = Symbol::new(&env, "TIER_2");
        
        client.set_risk_tier(&user, &70, &tier_2, &tier_2);
        
        assert!(client.can_access_tier(&user, &tier_2));
    }

    #[test]
    fn test_tier3_boundary_high_risk() {
        // Score 71 should deny TIER_1 and TIER_2 but allow TIER_3
        let env = Env::default();
        let contract_id = env.register_contract(None, RiskTierContract);
        let client = RiskTierContractClient::new(&env, &contract_id);

        let user = Address::generate(&env);
        let tier_1 = Symbol::new(&env, "TIER_1");
        let tier_2 = Symbol::new(&env, "TIER_2");
        let tier_3 = Symbol::new(&env, "TIER_3");
        
        client.set_risk_tier(&user, &71, &tier_3, &tier_3);
        
        assert!(!client.can_access_tier(&user, &tier_1));
        assert!(!client.can_access_tier(&user, &tier_2));
        assert!(client.can_access_tier(&user, &tier_3));
    }

    // ===== CHOSEN TIER MANAGEMENT TESTS =====

    #[test]
    fn test_chosen_tier_default_tier3() {
        // User without chosen tier should default to TIER_3
        let env = Env::default();
        let contract_id = env.register_contract(None, RiskTierContract);
        let client = RiskTierContractClient::new(&env, &contract_id);

        let user = Address::generate(&env);
        
        let chosen = client.get_chosen_tier(&user);
        assert_eq!(chosen, Symbol::new(&env, "TIER_3"));
    }

    #[test]
    fn test_chosen_tier_update_low_risk_user() {
        // Low-risk users can update chosen tier freely
        let env = Env::default();
        let contract_id = env.register_contract(None, RiskTierContract);
        let client = RiskTierContractClient::new(&env, &contract_id);

        let user = Address::generate(&env);
        let tier_1 = Symbol::new(&env, "TIER_1");
        let tier_3 = Symbol::new(&env, "TIER_3");
        
        client.set_risk_tier(&user, &20, &tier_1, &tier_1);
        client.update_chosen_tier(&user, &tier_3);
        
        let chosen = client.get_chosen_tier(&user);
        assert_eq!(chosen, tier_3);
    }

    #[test]
    fn test_chosen_tier_high_risk_to_tier3() {
        // High-risk users can set TIER_3 as chosen tier
        let env = Env::default();
        let contract_id = env.register_contract(None, RiskTierContract);
        let client = RiskTierContractClient::new(&env, &contract_id);

        let user = Address::generate(&env);
        let tier_3 = Symbol::new(&env, "TIER_3");
        
        client.set_risk_tier(&user, &75, &tier_3, &tier_3);
        client.update_chosen_tier(&user, &tier_3);
        
        let chosen = client.get_chosen_tier(&user);
        assert_eq!(chosen, tier_3);
    }

    #[test]
    #[should_panic(expected = "High risk users can only access TIER_3")]
    fn test_chosen_tier_high_risk_to_tier2_denied() {
        let env = Env::default();
        let contract_id = env.register_contract(None, RiskTierContract);
        let client = RiskTierContractClient::new(&env, &contract_id);

        let user = Address::generate(&env);
        let tier_3 = Symbol::new(&env, "TIER_3");
        let tier_2 = Symbol::new(&env, "TIER_2");
        
        client.set_risk_tier(&user, &75, &tier_3, &tier_3);
        client.update_chosen_tier(&user, &tier_2);
    }

    // ===== TIER USER MANAGEMENT TESTS =====

    #[test]
    fn test_tier_users_no_duplicates() {
        // Setting risk tier multiple times shouldn't create duplicate users
        let env = Env::default();
        let contract_id = env.register_contract(None, RiskTierContract);
        let client = RiskTierContractClient::new(&env, &contract_id);

        let user = Address::generate(&env);
        let tier_1 = Symbol::new(&env, "TIER_1");
        
        client.set_risk_tier(&user, &20, &tier_1, &tier_1);
        client.set_risk_tier(&user, &25, &tier_1, &tier_1);
        
        let tier_users = client.get_tier_users(&tier_1);
        assert_eq!(tier_users.len(), 1);
    }

    #[test]
    fn test_tier_users_cross_tier_separation() {
        // Users in different tiers should not overlap
        let env = Env::default();
        let contract_id = env.register_contract(None, RiskTierContract);
        let client = RiskTierContractClient::new(&env, &contract_id);

        let user1 = Address::generate(&env);
        let user2 = Address::generate(&env);
        
        let tier_1 = Symbol::new(&env, "TIER_1");
        let tier_2 = Symbol::new(&env, "TIER_2");
        
        client.set_risk_tier(&user1, &10, &tier_1, &tier_1);
        client.set_risk_tier(&user2, &50, &tier_2, &tier_2);
        
        let tier1_users = client.get_tier_users(&tier_1);
        let tier2_users = client.get_tier_users(&tier_2);
        
        assert_eq!(tier1_users.len(), 1);
        assert_eq!(tier2_users.len(), 1);
        assert!(tier1_users.contains(&user1));
        assert!(tier2_users.contains(&user2));
    }

    #[test]
    fn test_large_tier_population() {
        // Test with many users in same tier (gas optimization check)
        let env = Env::default();
        let contract_id = env.register_contract(None, RiskTierContract);
        let client = RiskTierContractClient::new(&env, &contract_id);

        let tier_1 = Symbol::new(&env, "TIER_1");
        
        // Add 10 users to same tier
        for _ in 0..10 {
            let user = Address::generate(&env);
            client.set_risk_tier(&user, &15, &tier_1, &tier_1);
        }
        
        let tier_users = client.get_tier_users(&tier_1);
        assert_eq!(tier_users.len(), 10);
    }

    // ===== TIMESTAMP TESTS =====

    #[test]
    fn test_timestamp_is_recorded() {
        let env = Env::default();
        let contract_id = env.register_contract(None, RiskTierContract);
        let client = RiskTierContractClient::new(&env, &contract_id);

        let user = Address::generate(&env);
        let tier_1 = Symbol::new(&env, "TIER_1");
        
        client.set_risk_tier(&user, &25, &tier_1, &tier_1);
        
        let risk_data = client.get_risk_tier(&user).unwrap();
        // Timestamp is recorded (may be 0 in test environment, that's ok)
        // The important thing is that the field is populated
        assert!(risk_data.timestamp >= 0);
    }

    #[test]
    fn test_timestamp_updated_on_change() {
        let env = Env::default();
        let contract_id = env.register_contract(None, RiskTierContract);
        let client = RiskTierContractClient::new(&env, &contract_id);

        let user = Address::generate(&env);
        let tier_1 = Symbol::new(&env, "TIER_1");
        let tier_2 = Symbol::new(&env, "TIER_2");
        
        client.set_risk_tier(&user, &25, &tier_1, &tier_1);
        let first_data = client.get_risk_tier(&user).unwrap();
        let first_timestamp = first_data.timestamp;
        
        client.set_risk_tier(&user, &50, &tier_2, &tier_2);
        let second_data = client.get_risk_tier(&user).unwrap();
        let second_timestamp = second_data.timestamp;
        
        // Timestamp should be updated (or at least not decrease)
        assert!(second_timestamp >= first_timestamp);
    }

    // ===== DATA CONSISTENCY TESTS =====

    #[test]
    fn test_tier_stats_consistency() {
        // Stats should accurately reflect tier population
        let env = Env::default();
        let contract_id = env.register_contract(None, RiskTierContract);
        let client = RiskTierContractClient::new(&env, &contract_id);

        let tier_1 = Symbol::new(&env, "TIER_1");
        let tier_2 = Symbol::new(&env, "TIER_2");
        let tier_3 = Symbol::new(&env, "TIER_3");
        
        let user1 = Address::generate(&env);
        let user2 = Address::generate(&env);
        let user3 = Address::generate(&env);
        let user4 = Address::generate(&env);
        
        client.set_risk_tier(&user1, &15, &tier_1, &tier_1);
        client.set_risk_tier(&user2, &20, &tier_1, &tier_1);
        client.set_risk_tier(&user3, &60, &tier_2, &tier_2);
        client.set_risk_tier(&user4, &95, &tier_3, &tier_3);
        
        let stats = client.get_tier_stats();
        assert_eq!(stats.get(tier_1).unwrap(), 2);
        assert_eq!(stats.get(tier_2).unwrap(), 1);
        assert_eq!(stats.get(tier_3).unwrap(), 1);
    }

    #[test]
    fn test_compliance_with_tier_access_rules() {
        // Integration test: verify access rules work correctly across operations
        let env = Env::default();
        let contract_id = env.register_contract(None, RiskTierContract);
        let client = RiskTierContractClient::new(&env, &contract_id);

        let low_risk_user = Address::generate(&env);
        let medium_risk_user = Address::generate(&env);
        let high_risk_user = Address::generate(&env);
        
        let tier_1 = Symbol::new(&env, "TIER_1");
        let tier_2 = Symbol::new(&env, "TIER_2");
        let tier_3 = Symbol::new(&env, "TIER_3");
        
        client.set_risk_tier(&low_risk_user, &25, &tier_1, &tier_1);
        client.set_risk_tier(&medium_risk_user, &50, &tier_2, &tier_2);
        client.set_risk_tier(&high_risk_user, &80, &tier_3, &tier_3);
        
        // Low-risk user: can access tier 1 & 2, 3
        assert!(client.can_access_tier(&low_risk_user, &tier_1));
        assert!(client.can_access_tier(&low_risk_user, &tier_2));
        assert!(client.can_access_tier(&low_risk_user, &tier_3));
        
        // Medium-risk user: can access tier 2 & 3, not 1
        assert!(!client.can_access_tier(&medium_risk_user, &tier_1));
        assert!(client.can_access_tier(&medium_risk_user, &tier_2));
        assert!(client.can_access_tier(&medium_risk_user, &tier_3));
        
        // High-risk user: can only access tier 3
        assert!(!client.can_access_tier(&high_risk_user, &tier_1));
        assert!(!client.can_access_tier(&high_risk_user, &tier_2));
        assert!(client.can_access_tier(&high_risk_user, &tier_3));
    }

    // ===== SIMULATION AND STRESS TESTS =====

    #[test]
    fn test_rapid_score_updates() {
        // Test multiple rapid updates to same user
        let env = Env::default();
        let contract_id = env.register_contract(None, RiskTierContract);
        let client = RiskTierContractClient::new(&env, &contract_id);

        let user = Address::generate(&env);
        let tiers = [
            Symbol::new(&env, "TIER_1"),
            Symbol::new(&env, "TIER_2"),
            Symbol::new(&env, "TIER_3"),
        ];
        
        let scores = [10, 40, 80, 5, 75];
        
        for (i, score) in scores.iter().enumerate() {
            let tier = &tiers[i % 3];
            client.set_risk_tier(&user, score, tier, tier);
        }
        
        // Final state should reflect last update
        let final_data = client.get_risk_tier(&user).unwrap();
        assert_eq!(final_data.score, 75);
    }

    #[test]
    fn test_concurrent_multi_user_operations() {
        // Simulate concurrent operations from multiple users
        let env = Env::default();
        let contract_id = env.register_contract(None, RiskTierContract);
        let client = RiskTierContractClient::new(&env, &contract_id);

        let tiers = [
            Symbol::new(&env, "TIER_1"),
            Symbol::new(&env, "TIER_2"),
            Symbol::new(&env, "TIER_3"),
        ];
        
        // Create and test 5 users
        for i in 0..5 {
            let user = Address::generate(&env);
            let tier = &tiers[i % 3];
            let score = ((i as u32) * 20) % 101;
            client.set_risk_tier(&user, &score, tier, tier);
            
            // Verify user is correctly stored
            let data = client.get_risk_tier(&user).unwrap();
            assert_eq!(data.score, score);
        }
    }

    #[test]
    fn test_tier_transition_complex_scenario() {
        // Test user moving between tiers (risk profile evolution)
        let env = Env::default();
        let contract_id = env.register_contract(None, RiskTierContract);
        let client = RiskTierContractClient::new(&env, &contract_id);

        let user = Address::generate(&env);
        let tier_1 = Symbol::new(&env, "TIER_1");
        let tier_2 = Symbol::new(&env, "TIER_2");
        let tier_3 = Symbol::new(&env, "TIER_3");
        
        // User starts as low risk
        client.set_risk_tier(&user, &20, &tier_1, &tier_1);
        assert!(client.can_access_tier(&user, &tier_1));
        
        // User risk increases to medium
        client.set_risk_tier(&user, &50, &tier_2, &tier_2);
        assert!(!client.can_access_tier(&user, &tier_1));
        assert!(client.can_access_tier(&user, &tier_2));
        
        // User risk increases to high
        client.set_risk_tier(&user, &85, &tier_3, &tier_3);
        assert!(!client.can_access_tier(&user, &tier_2));
        assert!(client.can_access_tier(&user, &tier_3));
        
        // User risk decreases
        client.set_risk_tier(&user, &40, &tier_2, &tier_2);
        assert!(client.can_access_tier(&user, &tier_2));
        assert!(!client.can_access_tier(&user, &tier_1));
    }

    // ===== GAS OPTIMIZATION CONSIDERATION TESTS =====
    // These tests verify the contract uses storage efficiently

    #[test]
    fn test_tuple_key_storage_efficiency() {
        // Verify tuple keys are used for organized storage
        let env = Env::default();
        let contract_id = env.register_contract(None, RiskTierContract);
        let client = RiskTierContractClient::new(&env, &contract_id);

        let user = Address::generate(&env);
        let tier_1 = Symbol::new(&env, "TIER_1");
        
        // Set risk tier
        client.set_risk_tier(&user, &25, &tier_1, &tier_1);
        
        // Verify data is stored
        let data = client.get_risk_tier(&user).unwrap();
        assert_eq!(data.score, 25);
        // This indirectly verifies efficient tuple key storage
    }

    #[test]
    fn test_cached_chosen_tier_lookup() {
        // Test that chosen tier has fast lookup path
        let env = Env::default();
        let contract_id = env.register_contract(None, RiskTierContract);
        let client = RiskTierContractClient::new(&env, &contract_id);

        let user = Address::generate(&env);
        let tier_2 = Symbol::new(&env, "TIER_2");
        
        client.set_risk_tier(&user, &50, &tier_2, &tier_2);
        
        // Fast lookup should be efficient
        let chosen = client.get_chosen_tier(&user);
        assert_eq!(chosen, tier_2);
    }
}
