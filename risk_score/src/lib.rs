#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, Map, Symbol, Vec};

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

const ADMIN_KEY: Symbol = symbol_short!("ADMIN");
const INIT_KEY: Symbol = symbol_short!("INIT");
const MAX_AGE_KEY: &str = "max_age";

#[contractimpl]
impl RiskTierContract {
    /// Initialize the contract with an admin address and max score age in ledgers.
    /// Can only be called once — panics if already initialized.
    pub fn initialize(env: Env, admin: Address, max_age_ledgers: u32) {
        if env.storage().instance().has(&INIT_KEY) {
            panic!("Contract already initialized");
        }
        env.storage().instance().set(&ADMIN_KEY, &admin);
        env.storage().instance().set(&INIT_KEY, &true);
        env.storage()
            .instance()
            .set(&Symbol::new(&env, MAX_AGE_KEY), &max_age_ledgers);
    }

    /// Get the stored admin address.
    pub fn get_admin(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&ADMIN_KEY)
            .expect("Contract not initialized")
    }

    /// Get the age of a user's risk score in ledgers (None if no score stored)
    pub fn get_score_age(env: Env, user: Address) -> Option<u32> {
        let tuple_key = (user, Symbol::new(&env, "risk_tier"));
        if let Some(risk_data) = env
            .storage()
            .persistent()
            .get::<_, RiskTierData>(&tuple_key)
        {
            let current_ledger = env.ledger().sequence();
            let age = current_ledger.saturating_sub(
                risk_data.timestamp as u32
            );
            Some(age)
        } else {
            None
        }
    }

    /// Set risk score with tier classification and timestamp
    /// Following Soroban persistent storage best practices with tuple keys
    /// Requires authorization from either the admin or the user themselves.
    pub fn set_risk_tier(env: Env, caller: Address, user: Address, score: u32, tier: Symbol, chosen_tier: Symbol) {
        // Authorization: when contract is initialized, require auth
        // Either admin (protocol-level write) or user (self-reporting) must authorize
        if env.storage().instance().has(&INIT_KEY) {
            let admin: Address = env.storage().instance().get(&ADMIN_KEY).unwrap();
            if caller != admin && caller != user {
                panic!("Unauthorized: caller must be admin or the user");
            }
            caller.require_auth();
        }
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
    pub fn can_access_tier(env: Env, user: Address,
                           target_tier: Symbol) -> bool {
        let tuple_key = (user, Symbol::new(&env, "risk_tier"));
        if let Some(risk_data) = env
            .storage()
            .persistent()
            .get::<_, RiskTierData>(&tuple_key)
        {
            // Check score freshness before granting access
            if !is_score_fresh(&env, risk_data.timestamp) {
                return false; // Score expired — deny access
            }

            let tier_1 = Symbol::new(&env, "TIER_1");
            let tier_2 = Symbol::new(&env, "TIER_2");
            let tier_3 = Symbol::new(&env, "TIER_3");
            match target_tier {
                t if t == tier_1 => risk_data.score <= 30,
                t if t == tier_2 => risk_data.score <= 70,
                t if t == tier_3 => true,
                _ => false,
            }
        } else {
            false
        }
    }
}

/// Check if a score timestamp is within the configured max_age window.
/// Uses ledger sequence numbers as a proxy for time.
fn is_score_fresh(env: &Env, timestamp: u64) -> bool {
    let max_age: u32 = env
        .storage()
        .instance()
        .get(&Symbol::new(env, MAX_AGE_KEY))
        .unwrap_or(u32::MAX);

    if max_age == u32::MAX {
        return true; // No expiry configured
    }

    let current_ledger = env.ledger().sequence();
    let score_ledger = timestamp as u32;
    let age = current_ledger.saturating_sub(score_ledger);
    age <= max_age
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::testutils::Address as _;
    use soroban_sdk::testutils::Ledger as _;
    use soroban_sdk::Env;

    #[test]
    fn test_set_and_get_risk_tier() {
        let env = Env::default();
        let contract_id = env.register(RiskTierContract, ());
        let client = RiskTierContractClient::new(&env, &contract_id);

        let user = Address::generate(&env);
        let tier_1 = Symbol::new(&env, "TIER_1");
        
        client.set_risk_tier(&user, &user, &25, &tier_1, &tier_1);
        
        let risk_data = client.get_risk_tier(&user).unwrap();
        assert_eq!(risk_data.score, 25);
        assert_eq!(risk_data.tier, tier_1);
        assert_eq!(risk_data.chosen_tier, tier_1);
    }

    #[test]
    fn test_score_validation_upper_bound() {
        let env = Env::default();
        let contract_id = env.register(RiskTierContract, ());
        let client = RiskTierContractClient::new(&env, &contract_id);

        let user = Address::generate(&env);
        let tier_3 = Symbol::new(&env, "TIER_3");
        
        client.set_risk_tier(&user, &user, &100, &tier_3, &tier_3);
        
        let score = client.get_score(&user);
        assert_eq!(score, 100);
    }

    #[test]
    #[should_panic(expected = "Score must be 0-100")]
    fn test_score_validation_exceeds_limit() {
        let env = Env::default();
        let contract_id = env.register(RiskTierContract, ());
        let client = RiskTierContractClient::new(&env, &contract_id);

        let user = Address::generate(&env);
        let tier_3 = Symbol::new(&env, "TIER_3");
        
        client.set_risk_tier(&user, &user, &101, &tier_3, &tier_3);
    }

    #[test]
    #[should_panic(expected = "Invalid tier")]
    fn test_invalid_tier_validation() {
        let env = Env::default();
        let contract_id = env.register(RiskTierContract, ());
        let client = RiskTierContractClient::new(&env, &contract_id);

        let user = Address::generate(&env);
        let invalid_tier = Symbol::new(&env, "TIER_4");
        
        client.set_risk_tier(&user, &user, &50, &invalid_tier, &invalid_tier);
    }

    #[test]
    fn test_tier_access_tier1_low_risk() {
        let env = Env::default();
        let contract_id = env.register(RiskTierContract, ());
        let client = RiskTierContractClient::new(&env, &contract_id);

        let user = Address::generate(&env);
        let tier_1 = Symbol::new(&env, "TIER_1");
        
        client.set_risk_tier(&user, &user, &25, &tier_1, &tier_1);
        
        assert!(client.can_access_tier(&user, &tier_1));
    }

    #[test]
    fn test_tier_access_tier1_boundary() {
        let env = Env::default();
        let contract_id = env.register(RiskTierContract, ());
        let client = RiskTierContractClient::new(&env, &contract_id);

        let user = Address::generate(&env);
        let tier_1 = Symbol::new(&env, "TIER_1");
        
        client.set_risk_tier(&user, &user, &30, &tier_1, &tier_1);
        
        assert!(client.can_access_tier(&user, &tier_1));
    }

    #[test]
    fn test_tier_access_tier1_denied() {
        let env = Env::default();
        let contract_id = env.register(RiskTierContract, ());
        let client = RiskTierContractClient::new(&env, &contract_id);

        let user = Address::generate(&env);
        let tier_2 = Symbol::new(&env, "TIER_2");
        let tier_1 = Symbol::new(&env, "TIER_1");
        
        client.set_risk_tier(&user, &user, &50, &tier_2, &tier_2);
        
        assert!(!client.can_access_tier(&user, &tier_1));
    }

    #[test]
    fn test_tier_access_tier2_medium_risk() {
        let env = Env::default();
        let contract_id = env.register(RiskTierContract, ());
        let client = RiskTierContractClient::new(&env, &contract_id);

        let user = Address::generate(&env);
        let tier_2 = Symbol::new(&env, "TIER_2");
        
        client.set_risk_tier(&user, &user, &50, &tier_2, &tier_2);
        
        assert!(client.can_access_tier(&user, &tier_2));
    }

    #[test]
    fn test_tier_access_tier3_always_accessible() {
        let env = Env::default();
        let contract_id = env.register(RiskTierContract, ());
        let client = RiskTierContractClient::new(&env, &contract_id);

        let user = Address::generate(&env);
        let tier_3 = Symbol::new(&env, "TIER_3");
        
        client.set_risk_tier(&user, &user, &85, &tier_3, &tier_3);
        
        assert!(client.can_access_tier(&user, &tier_3));
    }

    #[test]
    fn test_get_tier_users() {
        let env = Env::default();
        let contract_id = env.register(RiskTierContract, ());
        let client = RiskTierContractClient::new(&env, &contract_id);

        let user1 = Address::generate(&env);
        let user2 = Address::generate(&env);
        let tier_1 = Symbol::new(&env, "TIER_1");
        
        client.set_risk_tier(&user1, &user1, &20, &tier_1, &tier_1);
        client.set_risk_tier(&user2, &user2, &25, &tier_1, &tier_1);
        
        let tier_users = client.get_tier_users(&tier_1);
        assert_eq!(tier_users.len(), 2);
    }

    #[test]
    fn test_update_chosen_tier_valid() {
        let env = Env::default();
        let contract_id = env.register(RiskTierContract, ());
        let client = RiskTierContractClient::new(&env, &contract_id);

        let user = Address::generate(&env);
        let tier_1 = Symbol::new(&env, "TIER_1");
        let tier_2 = Symbol::new(&env, "TIER_2");
        
        client.set_risk_tier(&user, &user, &25, &tier_1, &tier_1);
        client.update_chosen_tier(&user, &tier_2);
        
        let chosen = client.get_chosen_tier(&user);
        assert_eq!(chosen, tier_2);
    }

    #[test]
    #[should_panic(expected = "High risk users can only access TIER_3")]
    fn test_update_chosen_tier_high_risk_restriction() {
        let env = Env::default();
        let contract_id = env.register(RiskTierContract, ());
        let client = RiskTierContractClient::new(&env, &contract_id);

        let user = Address::generate(&env);
        let tier_3 = Symbol::new(&env, "TIER_3");
        let tier_1 = Symbol::new(&env, "TIER_1");
        
        client.set_risk_tier(&user, &user, &85, &tier_3, &tier_3);
        client.update_chosen_tier(&user, &tier_1);
    }

    #[test]
    fn test_get_tier_stats() {
        let env = Env::default();
        let contract_id = env.register(RiskTierContract, ());
        let client = RiskTierContractClient::new(&env, &contract_id);

        let user1 = Address::generate(&env);
        let user2 = Address::generate(&env);
        let user3 = Address::generate(&env);
        
        let tier_1 = Symbol::new(&env, "TIER_1");
        let tier_2 = Symbol::new(&env, "TIER_2");
        let tier_3 = Symbol::new(&env, "TIER_3");
        
        client.set_risk_tier(&user1, &user1, &20, &tier_1, &tier_1);
        client.set_risk_tier(&user2, &user2, &50, &tier_2, &tier_2);
        client.set_risk_tier(&user3, &user3, &80, &tier_3, &tier_3);
        
        let stats = client.get_tier_stats();
        assert_eq!(stats.get(tier_1).unwrap(), 1);
        assert_eq!(stats.get(tier_2).unwrap(), 1);
        assert_eq!(stats.get(tier_3).unwrap(), 1);
    }

    #[test]
    fn test_score_update_overwrites_previous() {
        let env = Env::default();
        let contract_id = env.register(RiskTierContract, ());
        let client = RiskTierContractClient::new(&env, &contract_id);

        let user = Address::generate(&env);
        let tier_2 = Symbol::new(&env, "TIER_2");
        let tier_1 = Symbol::new(&env, "TIER_1");
        
        client.set_risk_tier(&user, &user, &50, &tier_2, &tier_2);
        client.set_risk_tier(&user, &user, &25, &tier_1, &tier_1);
        
        let risk_data = client.get_risk_tier(&user).unwrap();
        assert_eq!(risk_data.score, 25);
        assert_eq!(risk_data.tier, tier_1);
    }

    #[test]
    fn test_no_risk_data_returns_zero_score() {
        let env = Env::default();
        let contract_id = env.register(RiskTierContract, ());
        let client = RiskTierContractClient::new(&env, &contract_id);

        let user = Address::generate(&env);
        
        let score = client.get_score(&user);
        assert_eq!(score, 0);
    }

    #[test]
    fn test_no_risk_data_denies_tier_access() {
        let env = Env::default();
        let contract_id = env.register(RiskTierContract, ());
        let client = RiskTierContractClient::new(&env, &contract_id);

        let user = Address::generate(&env);
        let tier_3 = Symbol::new(&env, "TIER_3");
        
        assert!(!client.can_access_tier(&user, &tier_3));
    }

    #[test]
    fn test_multiple_users_different_tiers() {
        let env = Env::default();
        let contract_id = env.register(RiskTierContract, ());
        let client = RiskTierContractClient::new(&env, &contract_id);

        let user1 = Address::generate(&env);
        let user2 = Address::generate(&env);
        let user3 = Address::generate(&env);
        
        let tier_1 = Symbol::new(&env, "TIER_1");
        let tier_2 = Symbol::new(&env, "TIER_2");
        let tier_3 = Symbol::new(&env, "TIER_3");
        
        client.set_risk_tier(&user1, &user1, &15, &tier_1, &tier_1);
        client.set_risk_tier(&user2, &user2, &45, &tier_2, &tier_2);
        client.set_risk_tier(&user3, &user3, &90, &tier_3, &tier_3);
        
        assert!(client.can_access_tier(&user1, &tier_1));
        assert!(!client.can_access_tier(&user2, &tier_1));
        assert!(client.can_access_tier(&user2, &tier_2));
        assert!(client.can_access_tier(&user3, &tier_3));
    }

    // ===== New admin & auth tests =====

    #[test]
    fn test_admin_can_set_any_user_tier() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(RiskTierContract, ());
        let client = RiskTierContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let user = Address::generate(&env);
        let tier_1 = Symbol::new(&env, "TIER_1");

        client.initialize(&admin, &100000u32);
        client.set_risk_tier(&admin, &user, &25, &tier_1, &tier_1);

        let risk_data = client.get_risk_tier(&user).unwrap();
        assert_eq!(risk_data.score, 25);
        assert_eq!(risk_data.tier, tier_1);
    }

    #[test]
    fn test_user_can_set_own_tier() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(RiskTierContract, ());
        let client = RiskTierContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let user = Address::generate(&env);
        let tier_2 = Symbol::new(&env, "TIER_2");

        client.initialize(&admin, &100000u32);
        // User sets their own tier (self-reporting)
        client.set_risk_tier(&user, &user, &50, &tier_2, &tier_2);

        let risk_data = client.get_risk_tier(&user).unwrap();
        assert_eq!(risk_data.score, 50);
        assert_eq!(risk_data.tier, tier_2);
    }

    #[test]
    #[should_panic]
    fn test_unauthorized_caller_panics() {
        let env = Env::default();
        // No mock_all_auths — auth will fail
        let contract_id = env.register(RiskTierContract, ());
        let client = RiskTierContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let user = Address::generate(&env);
        let tier_1 = Symbol::new(&env, "TIER_1");

        // initialize doesn't require auth, so this works without mocking
        client.initialize(&admin, &100000u32);

        // This should panic — caller.require_auth() is called but no auth provided
        client.set_risk_tier(&user, &user, &25, &tier_1, &tier_1);
    }

    #[test]
    #[should_panic(expected = "Contract already initialized")]
    fn test_initialize_panics_if_called_twice() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(RiskTierContract, ());
        let client = RiskTierContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        client.initialize(&admin, &100000u32);
        // Second call should panic
        client.initialize(&admin, &100000u32);
    }

    #[test]
    fn test_get_admin_returns_stored_admin() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(RiskTierContract, ());
        let client = RiskTierContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        client.initialize(&admin, &100000u32);

        let stored_admin = client.get_admin();
        assert_eq!(stored_admin, admin);
    }

    #[test]
    fn test_fresh_score_grants_access() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(RiskTierContract, ());
        let client = RiskTierContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let user = Address::generate(&env);
        // 100 ledger max age
        client.initialize(&admin, &100u32);

        let tier = Symbol::new(&env, "TIER_2");
        let chosen = Symbol::new(&env, "TIER_2");
        client.set_risk_tier(&admin, &user, &50u32, &tier, &chosen);

        // Score is fresh (just set) — should grant access
        assert!(client.can_access_tier(&user, &tier));
    }

    #[test]
    fn test_expired_score_denies_access() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(RiskTierContract, ());
        let client = RiskTierContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let user = Address::generate(&env);
        // 1 ledger max age — will expire quickly
        client.initialize(&admin, &1u32);

        let tier = Symbol::new(&env, "TIER_2");
        let chosen = Symbol::new(&env, "TIER_2");
        client.set_risk_tier(&admin, &user, &50u32, &tier, &chosen);

        // Advance ledger sequence past max_age
        env.ledger().with_mut(|l| {
            l.sequence_number += 100;
        });

        // Score is expired — should deny access
        assert!(!client.can_access_tier(&user, &tier));
    }

    #[test]
    fn test_no_max_age_never_expires() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(RiskTierContract, ());
        let client = RiskTierContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let user = Address::generate(&env);
        // u32::MAX = effectively no expiry
        client.initialize(&admin, &u32::MAX);

        let tier = Symbol::new(&env, "TIER_1");
        let chosen = Symbol::new(&env, "TIER_1");
        client.set_risk_tier(&admin, &user, &10u32, &tier, &chosen);

        // Advance ledger moderately — 1,000 ledgers.
        // Stays well within Soroban's default instance TTL window to avoid test-mode
        // archival, while still proving that u32::MAX max_age never expires.
        env.ledger().with_mut(|l| {
            l.sequence_number += 1000;
        });

        // Should still have access — no expiry configured
        assert!(client.can_access_tier(&user, &tier));
    }

    #[test]
    fn test_get_score_age_returns_correct_value() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(RiskTierContract, ());
        let client = RiskTierContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let user = Address::generate(&env);
        client.initialize(&admin, &100000u32);

        let tier = Symbol::new(&env, "TIER_1");
        let chosen = Symbol::new(&env, "TIER_1");
        client.set_risk_tier(&admin, &user, &10u32, &tier, &chosen);

        // Advance by 50 ledgers
        env.ledger().with_mut(|l| {
            l.sequence_number += 50;
        });

        let age = client.get_score_age(&user);
        assert!(age.is_some());
        // Age should be approximately 50 ledgers
        assert!(age.unwrap() >= 50);
    }

    #[test]
    fn test_get_score_age_returns_none_for_unknown_user() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(RiskTierContract, ());
        let client = RiskTierContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let unknown = Address::generate(&env);
        client.initialize(&admin, &100000u32);

        assert!(client.get_score_age(&unknown).is_none());
    }

    #[test]
    fn test_boundary_score_at_max_age_still_valid() {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(RiskTierContract, ());
        let client = RiskTierContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let user = Address::generate(&env);
        client.initialize(&admin, &100u32);

        let tier = Symbol::new(&env, "TIER_1");
        let chosen = Symbol::new(&env, "TIER_1");
        client.set_risk_tier(&admin, &user, &10u32, &tier, &chosen);

        // Advance exactly to max_age — should still be valid
        env.ledger().with_mut(|l| {
            l.sequence_number += 100;
        });
        assert!(client.can_access_tier(&user, &tier));

        // Advance one more — should now be expired
        env.ledger().with_mut(|l| {
            l.sequence_number += 1;
        });
        assert!(!client.can_access_tier(&user, &tier));
    }
}
