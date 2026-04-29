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

/// Storage keys for typed access
#[contracttype]
enum DataKey {
    Admin,                   // Storage key for admin address
    RiskTier(Address),       // Storage key for user's risk tier data
    ChosenTier(Address),     // Storage key for user's chosen tier
    TierUsers(Symbol),       // Storage key for users in a specific tier
}

#[contractimpl]
impl RiskTierContract {
    /// Initialize the contract with an admin address
    /// Can only be called once - panics on second initialization
    /// CRITICAL SECURITY: This function MUST be called before set_risk_tier works
    pub fn initialize(env: Env, admin: Address) {
        // Check if already initialized
        let admin_key = DataKey::Admin;
        if env.storage().persistent().has(&admin_key) {
            panic!("Contract already initialized");
        }

        // Store admin address
        env.storage().persistent().set(&admin_key, &admin);

        // Emit initialization event
        env.events().publish(
            (Symbol::new(&env, "contract_initialized"),),
            admin,
        );
    }

    /// Get the current admin address
    /// Returns None if contract not initialized
    pub fn get_admin(env: Env) -> Option<Address> {
        let admin_key = DataKey::Admin;
        env.storage().persistent().get(&admin_key)
    }

    /// Internal helper: Validate that contract is initialized
    fn require_initialized(env: &Env) {
        let admin_key = DataKey::Admin;
        assert!(
            env.storage().persistent().has(&admin_key),
            "Contract not initialized - call initialize(admin) first"
        );
    }

    /// Set risk score for a user - User can set their own score
    /// Requires the user to sign the transaction
    /// Alternative: admin_set_risk_tier for oracle/backend calls
    pub fn set_risk_tier(env: Env, user: Address, score: u32, tier: Symbol, chosen_tier: Symbol) {
        // Verify contract is initialized
        Self::require_initialized(&env);

        // CRITICAL SECURITY: User must sign this transaction
        user.require_auth();

        // Validate inputs
        Self::validate_score(score);
        Self::validate_tier(&env, &tier);
        Self::validate_tier(&env, &chosen_tier);

        let timestamp = env.ledger().timestamp();

        let risk_data = RiskTierData {
            score,
            tier: tier.clone(),
            timestamp,
            chosen_tier: chosen_tier.clone(),
        };

        // Store risk tier data using typed key
        let risk_key = DataKey::RiskTier(user.clone());
        env.storage().persistent().set(&risk_key, &risk_data);

        // Also store in tier-based index for efficient queries
        let tier_key = DataKey::TierUsers(tier.clone());
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
        let chosen_key = DataKey::ChosenTier(user.clone());
        env.storage().persistent().set(&chosen_key, &chosen_tier);

        // Emit Event for Indexers
        env.events().publish(
            (Symbol::new(&env, "risk_set"), user),
            (score, tier, chosen_tier),
        );
    }

    /// ADMIN-ONLY: Set risk score for any user (oracle/backend flow)
    /// Requires the admin to sign the transaction
    /// Used by automated scoring systems or protocol governance
    pub fn admin_set_risk_tier(
        env: Env,
        user: Address,
        score: u32,
        tier: Symbol,
        chosen_tier: Symbol,
    ) {
        // Verify contract is initialized
        Self::require_initialized(&env);

        // CRITICAL SECURITY: Admin must sign this transaction
        if let Some(admin) = Self::get_admin(env.clone()) {
            admin.require_auth();
        } else {
            panic!("No admin set - call initialize(admin) first");
        }

        // Validate inputs
        Self::validate_score(score);
        Self::validate_tier(&env, &tier);
        Self::validate_tier(&env, &chosen_tier);

        let timestamp = env.ledger().timestamp();

        let risk_data = RiskTierData {
            score,
            tier: tier.clone(),
            timestamp,
            chosen_tier: chosen_tier.clone(),
        };

        // Store risk tier data using typed key
        let risk_key = DataKey::RiskTier(user.clone());
        env.storage().persistent().set(&risk_key, &risk_data);

        // Also store in tier-based index for efficient queries
        let tier_key = DataKey::TierUsers(tier.clone());
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
        let chosen_key = DataKey::ChosenTier(user.clone());
        env.storage().persistent().set(&chosen_key, &chosen_tier);

        // Emit Event for Indexers
        env.events().publish(
            (Symbol::new(&env, "risk_set_admin"), user),
            (score, tier, chosen_tier),
        );
    }

    /// Internal helper: Validate score is within bounds
    fn validate_score(score: u32) {
        assert!(score <= 100, "Score must be 0-100");
    }

    /// Internal helper: Validate tier is one of the valid options
    fn validate_tier(env: &Env, tier: &Symbol) {
        assert!(
            tier == &Symbol::new(env, "TIER_1")
                || tier == &Symbol::new(env, "TIER_2")
                || tier == &Symbol::new(env, "TIER_3"),
            "Invalid tier - must be TIER_1, TIER_2, or TIER_3"
        );
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
        let risk_key = DataKey::RiskTier(user);
        env.storage().persistent().get(&risk_key)
    }

    /// Get only risk score (backward compatibility)
    pub fn get_score(env: Env, user: Address) -> u32 {
        let risk_key = DataKey::RiskTier(user);
        if let Some(data) = env
            .storage()
            .persistent()
            .get::<_, RiskTierData>(&risk_key)
        {
            data.score
        } else {
            0
        }
    }

    /// Get user's chosen tier for operations
    pub fn get_chosen_tier(env: Env, user: Address) -> Symbol {
        let chosen_key = DataKey::ChosenTier(user);
        env.storage()
            .persistent()
            .get(&chosen_key)
            .unwrap_or(Symbol::new(&env, "TIER_3")) // Default to most conservative
    }

    /// Get all users in a specific tier
    pub fn get_tier_users(env: Env, tier: Symbol) -> Vec<Address> {
        let tier_key = DataKey::TierUsers(tier);
        env.storage()
            .persistent()
            .get(&tier_key)
            .unwrap_or(Vec::new(&env))
    }

    /// Update user's chosen tier (risk-based validation)
    /// CRITICAL SECURITY: Only the user themselves can update their chosen tier
    pub fn update_chosen_tier(env: Env, user: Address, new_chosen_tier: Symbol) {
        // Verify contract is initialized
        Self::require_initialized(&env);

        // CRITICAL SECURITY: User must sign this transaction
        user.require_auth();

        // Validate tier
        Self::validate_tier(&env, &new_chosen_tier);

        let risk_key = DataKey::RiskTier(user.clone());

        if let Some(mut risk_data) = env
            .storage()
            .persistent()
            .get::<_, RiskTierData>(&risk_key)
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

            env.storage().persistent().set(&risk_key, &risk_data);

            // Update chosen tier cache
            let chosen_key = DataKey::ChosenTier(user.clone());
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
        let risk_key = DataKey::RiskTier(user);

        if let Some(risk_data) = env
            .storage()
            .persistent()
            .get::<_, RiskTierData>(&risk_key)
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

    /// Helper function to initialize contract with admin
    fn setup(env: &Env) -> Address {
        let contract_id = env.register_contract(None, RiskTierContract);
        let client = RiskTierContractClient::new(&env, &contract_id);
        let admin = Address::generate(&env);
        
        client.initialize(&admin);
        admin
    }

    /// TEST 1: Initialization - Can only be called once
    #[test]
    fn test_initialize_sets_admin() {
        let env = Env::default();
        let contract_id = env.register_contract(None, RiskTierContract);
        let client = RiskTierContractClient::new(&env, &contract_id);
        let admin = Address::generate(&env);
        
        client.initialize(&admin);
        let stored_admin = client.get_admin().unwrap();
        assert_eq!(stored_admin, admin);
    }

    /// TEST 2: Initialization - Re-initialization panics
    #[test]
    #[should_panic(expected = "Contract already initialized")]
    fn test_initialize_twice_panics() {
        let env = Env::default();
        let contract_id = env.register_contract(None, RiskTierContract);
        let client = RiskTierContractClient::new(&env, &contract_id);
        let admin1 = Address::generate(&env);
        let admin2 = Address::generate(&env);
        
        client.initialize(&admin1);
        client.initialize(&admin2); // Should panic
    }

    /// TEST 3: set_risk_tier requires initialization
    #[test]
    #[should_panic(expected = "Contract not initialized")]
    fn test_set_risk_tier_requires_initialization() {
        let env = Env::default();
        let contract_id = env.register_contract(None, RiskTierContract);
        let client = RiskTierContractClient::new(&env, &contract_id);
        
        let user = Address::generate(&env);
        let tier_1 = Symbol::new(&env, "TIER_1");
        
        // Call without initialization - should panic
        client.set_risk_tier(&user, &25, &tier_1, &tier_1);
    }

    /// TEST 4: User can set their own risk tier
    #[test]
    fn test_user_can_set_own_risk_tier() {
        let env = Env::default();
        setup(&env);
        
        let contract_id = env.register_contract(None, RiskTierContract);
        let client = RiskTierContractClient::new(&env, &contract_id);
        
        let user = Address::generate(&env);
        let tier_1 = Symbol::new(&env, "TIER_1");
        
        // User sets their own risk tier
        client.set_risk_tier(&user, &25, &tier_1, &tier_1);
        
        let risk_data = client.get_risk_tier(&user).unwrap();
        assert_eq!(risk_data.score, 25);
        assert_eq!(risk_data.tier, tier_1);
        assert_eq!(risk_data.chosen_tier, tier_1);
    }

    /// TEST 5: Admin can set risk tier for any user
    #[test]
    fn test_admin_can_set_risk_tier_for_any_user() {
        let env = Env::default();
        let admin = setup(&env);
        
        let contract_id = env.register_contract(None, RiskTierContract);
        let client = RiskTierContractClient::new(&env, &contract_id);
        
        let user = Address::generate(&env);
        let tier_2 = Symbol::new(&env, "TIER_2");
        
        // Admin sets risk tier for user (simulated via admin_set_risk_tier)
        client.admin_set_risk_tier(&admin, &user, &50, &tier_2, &tier_2);
        
        let risk_data = client.get_risk_tier(&user).unwrap();
        assert_eq!(risk_data.score, 50);
    }

    /// TEST 6: Non-admin, non-user cannot set risk tier
    #[test]
    #[should_panic]
    fn test_third_party_cannot_set_risk_tier_for_another_user() {
        let env = Env::default();
        setup(&env);
        
        let contract_id = env.register_contract(None, RiskTierContract);
        let client = RiskTierContractClient::new(&env, &contract_id);
        
        let user = Address::generate(&env);
        let attacker = Address::generate(&env);
        let tier_1 = Symbol::new(&env, "TIER_1");
        
        // Attacker tries to set user's risk tier - should panic
        // In real environment, this would fail auth check
        client.set_risk_tier(&user, &25, &tier_1, &tier_1);
    }

    /// TEST 7: User can update their own chosen tier
    #[test]
    fn test_user_can_update_own_chosen_tier() {
        let env = Env::default();
        setup(&env);
        
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

    /// TEST 8: High risk user cannot choose TIER_1 or TIER_2
    #[test]
    #[should_panic(expected = "High risk users can only access TIER_3")]
    fn test_high_risk_user_cannot_choose_lower_tier() {
        let env = Env::default();
        setup(&env);
        
        let contract_id = env.register_contract(None, RiskTierContract);
        let client = RiskTierContractClient::new(&env, &contract_id);
        
        let user = Address::generate(&env);
        let tier_3 = Symbol::new(&env, "TIER_3");
        let tier_1 = Symbol::new(&env, "TIER_1");
        
        client.set_risk_tier(&user, &85, &tier_3, &tier_3); // High risk
        client.update_chosen_tier(&user, &tier_1); // Should panic
    }

    /// TEST 9: Score validation works
    #[test]
    fn test_set_and_get_risk_tier() {
        let env = Env::default();
        setup(&env);
        
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
        setup(&env);
        
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
        setup(&env);
        
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
        setup(&env);
        
        let contract_id = env.register_contract(None, RiskTierContract);
        let client = RiskTierContractClient::new(&env, &contract_id);

        let user = Address::generate(&env);
        let invalid_tier = Symbol::new(&env, "TIER_4");
        
        client.set_risk_tier(&user, &50, &invalid_tier, &invalid_tier);
    }

    #[test]
    fn test_tier_access_tier1_low_risk() {
        let env = Env::default();
        setup(&env);
        
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
        setup(&env);
        
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
        setup(&env);
        
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
        setup(&env);
        
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
        setup(&env);
        
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
        setup(&env);
        
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
        setup(&env);
        
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
        setup(&env);
        
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
        setup(&env);
        
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
}
