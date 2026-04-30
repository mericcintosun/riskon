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

const ADMIN_KEY: &str = "admin";

#[contractimpl]
impl RiskTierContract {
    /// Initialize the contract with a trusted admin address.
    /// Can only be called once; subsequent calls panic.
    pub fn initialize(env: Env, admin: Address) {
        let key = Symbol::new(&env, ADMIN_KEY);
        assert!(!env.storage().instance().has(&key), "Already initialized");
        env.storage().instance().set(&key, &admin);
    }

    /// Return the current admin address.
    pub fn get_admin(env: Env) -> Address {
        let key = Symbol::new(&env, ADMIN_KEY);
        env.storage().instance().get(&key).expect("Not initialized")
    }

    /// Set risk score with tier classification and timestamp.
    /// Caller must be the contract admin OR the user themselves.
    pub fn set_risk_tier(
        env: Env,
        caller: Address,
        user: Address,
        score: u32,
        tier: Symbol,
        chosen_tier: Symbol,
    ) {
        // --- Access control ---
        caller.require_auth();
        let admin = Self::get_admin(env.clone());
        assert!(
            caller == admin || caller == user,
            "Unauthorized: caller must be admin or the user"
        );

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

    /// Deploy the contract, initialize it with a fresh admin, and return
    /// (env, contract_id, admin).  Every test calls this to get a clean slate.
    fn setup() -> (Env, soroban_sdk::Address, soroban_sdk::Address) {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(RiskTierContract, ());
        let client = RiskTierContractClient::new(&env, &contract_id);
        let admin = Address::generate(&env);
        client.initialize(&admin);
        (env, contract_id, admin)
    }

    // ── initialize ──────────────────────────────────────────────────────────

    #[test]
    fn test_initialize_sets_admin() {
        let (env, contract_id, admin) = setup();
        let client = RiskTierContractClient::new(&env, &contract_id);
        assert_eq!(client.get_admin(), admin);
    }

    #[test]
    #[should_panic(expected = "Already initialized")]
    fn test_initialize_twice_panics() {
        let (env, contract_id, _admin) = setup();
        let client = RiskTierContractClient::new(&env, &contract_id);
        let other = Address::generate(&env);
        client.initialize(&other);
    }

    // ── access control for set_risk_tier ────────────────────────────────────

    #[test]
    fn test_admin_can_set_any_user_tier() {
        let (env, contract_id, admin) = setup();
        let client = RiskTierContractClient::new(&env, &contract_id);
        let user = Address::generate(&env);
        let tier_1 = Symbol::new(&env, "TIER_1");
        client.set_risk_tier(&admin, &user, &25, &tier_1, &tier_1);
        let data = client.get_risk_tier(&user).unwrap();
        assert_eq!(data.score, 25);
    }

    #[test]
    fn test_user_can_set_own_tier() {
        let (env, contract_id, _admin) = setup();
        let client = RiskTierContractClient::new(&env, &contract_id);
        let user = Address::generate(&env);
        let tier_1 = Symbol::new(&env, "TIER_1");
        client.set_risk_tier(&user, &user, &20, &tier_1, &tier_1);
        let data = client.get_risk_tier(&user).unwrap();
        assert_eq!(data.score, 20);
    }

    #[test]
    #[should_panic(expected = "Unauthorized")]
    fn test_stranger_cannot_set_other_user_tier() {
        let (env, contract_id, _admin) = setup();
        let client = RiskTierContractClient::new(&env, &contract_id);
        let user = Address::generate(&env);
        let stranger = Address::generate(&env);
        let tier_1 = Symbol::new(&env, "TIER_1");
        client.set_risk_tier(&stranger, &user, &0, &tier_1, &tier_1);
    }

    // ── existing functional tests ────────────────────────────────────────────

    #[test]
    fn test_set_and_get_risk_tier() {
        let (env, contract_id, _admin) = setup();
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
        let (env, contract_id, _admin) = setup();
        let client = RiskTierContractClient::new(&env, &contract_id);
        let user = Address::generate(&env);
        let tier_3 = Symbol::new(&env, "TIER_3");
        client.set_risk_tier(&user, &user, &100, &tier_3, &tier_3);
        assert_eq!(client.get_score(&user), 100);
    }

    #[test]
    #[should_panic(expected = "Score must be 0-100")]
    fn test_score_validation_exceeds_limit() {
        let (env, contract_id, _admin) = setup();
        let client = RiskTierContractClient::new(&env, &contract_id);
        let user = Address::generate(&env);
        let tier_3 = Symbol::new(&env, "TIER_3");
        client.set_risk_tier(&user, &user, &101, &tier_3, &tier_3);
    }

    #[test]
    #[should_panic(expected = "Invalid tier")]
    fn test_invalid_tier_validation() {
        let (env, contract_id, _admin) = setup();
        let client = RiskTierContractClient::new(&env, &contract_id);
        let user = Address::generate(&env);
        let invalid_tier = Symbol::new(&env, "TIER_4");
        client.set_risk_tier(&user, &user, &50, &invalid_tier, &invalid_tier);
    }

    #[test]
    fn test_tier_access_tier1_low_risk() {
        let (env, contract_id, _admin) = setup();
        let client = RiskTierContractClient::new(&env, &contract_id);
        let user = Address::generate(&env);
        let tier_1 = Symbol::new(&env, "TIER_1");
        client.set_risk_tier(&user, &user, &25, &tier_1, &tier_1);
        assert!(client.can_access_tier(&user, &tier_1));
    }

    #[test]
    fn test_tier_access_tier1_boundary() {
        let (env, contract_id, _admin) = setup();
        let client = RiskTierContractClient::new(&env, &contract_id);
        let user = Address::generate(&env);
        let tier_1 = Symbol::new(&env, "TIER_1");
        client.set_risk_tier(&user, &user, &30, &tier_1, &tier_1);
        assert!(client.can_access_tier(&user, &tier_1));
    }

    #[test]
    fn test_tier_access_tier1_denied() {
        let (env, contract_id, _admin) = setup();
        let client = RiskTierContractClient::new(&env, &contract_id);
        let user = Address::generate(&env);
        let tier_2 = Symbol::new(&env, "TIER_2");
        let tier_1 = Symbol::new(&env, "TIER_1");
        client.set_risk_tier(&user, &user, &50, &tier_2, &tier_2);
        assert!(!client.can_access_tier(&user, &tier_1));
    }

    #[test]
    fn test_tier_access_tier2_medium_risk() {
        let (env, contract_id, _admin) = setup();
        let client = RiskTierContractClient::new(&env, &contract_id);
        let user = Address::generate(&env);
        let tier_2 = Symbol::new(&env, "TIER_2");
        client.set_risk_tier(&user, &user, &50, &tier_2, &tier_2);
        assert!(client.can_access_tier(&user, &tier_2));
    }

    #[test]
    fn test_tier_access_tier3_always_accessible() {
        let (env, contract_id, _admin) = setup();
        let client = RiskTierContractClient::new(&env, &contract_id);
        let user = Address::generate(&env);
        let tier_3 = Symbol::new(&env, "TIER_3");
        client.set_risk_tier(&user, &user, &85, &tier_3, &tier_3);
        assert!(client.can_access_tier(&user, &tier_3));
    }

    #[test]
    fn test_get_tier_users() {
        let (env, contract_id, _admin) = setup();
        let client = RiskTierContractClient::new(&env, &contract_id);
        let user1 = Address::generate(&env);
        let user2 = Address::generate(&env);
        let tier_1 = Symbol::new(&env, "TIER_1");
        client.set_risk_tier(&user1, &user1, &20, &tier_1, &tier_1);
        client.set_risk_tier(&user2, &user2, &25, &tier_1, &tier_1);
        assert_eq!(client.get_tier_users(&tier_1).len(), 2);
    }

    #[test]
    fn test_update_chosen_tier_valid() {
        let (env, contract_id, _admin) = setup();
        let client = RiskTierContractClient::new(&env, &contract_id);
        let user = Address::generate(&env);
        let tier_1 = Symbol::new(&env, "TIER_1");
        let tier_2 = Symbol::new(&env, "TIER_2");
        client.set_risk_tier(&user, &user, &25, &tier_1, &tier_1);
        client.update_chosen_tier(&user, &tier_2);
        assert_eq!(client.get_chosen_tier(&user), tier_2);
    }

    #[test]
    #[should_panic(expected = "High risk users can only access TIER_3")]
    fn test_update_chosen_tier_high_risk_restriction() {
        let (env, contract_id, _admin) = setup();
        let client = RiskTierContractClient::new(&env, &contract_id);
        let user = Address::generate(&env);
        let tier_3 = Symbol::new(&env, "TIER_3");
        let tier_1 = Symbol::new(&env, "TIER_1");
        client.set_risk_tier(&user, &user, &85, &tier_3, &tier_3);
        client.update_chosen_tier(&user, &tier_1);
    }

    #[test]
    fn test_get_tier_stats() {
        let (env, contract_id, _admin) = setup();
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
        let (env, contract_id, _admin) = setup();
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
        let (env, contract_id, _admin) = setup();
        let client = RiskTierContractClient::new(&env, &contract_id);
        let user = Address::generate(&env);
        assert_eq!(client.get_score(&user), 0);
    }

    #[test]
    fn test_no_risk_data_denies_tier_access() {
        let (env, contract_id, _admin) = setup();
        let client = RiskTierContractClient::new(&env, &contract_id);
        let user = Address::generate(&env);
        let tier_3 = Symbol::new(&env, "TIER_3");
        assert!(!client.can_access_tier(&user, &tier_3));
    }

    #[test]
    fn test_multiple_users_different_tiers() {
        let (env, contract_id, _admin) = setup();
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
}
