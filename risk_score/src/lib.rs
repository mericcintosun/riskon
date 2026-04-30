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

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Admin,
    RiskTier(Address),
    ChosenTier(Address),
    TierUsers(Symbol),
}

#[contractimpl]
impl RiskTierContract {
    /// Initialize the contract with an admin address
    pub fn initialize(env: Env, admin: Address) {
        assert!(
            !env.storage().instance().has(&DataKey::Admin),
            "Already initialized"
        );
        env.storage().instance().set(&DataKey::Admin, &admin);
    }

    /// Set risk score with tier classification and timestamp
    /// Only the admin can call this function
    pub fn set_risk_tier(env: Env, user: Address, score: u32, tier: Symbol, chosen_tier: Symbol) {
        // Access Control: Only admin can set risk scores
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .expect("Contract not initialized");
        admin.require_auth();

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

        // Use consistent DataKey for storage
        let key = DataKey::RiskTier(user.clone());
        env.storage().persistent().set(&key, &risk_data);

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

    /// Get complete risk and tier data for user
    pub fn get_risk_tier(env: Env, user: Address) -> Option<RiskTierData> {
        let key = DataKey::RiskTier(user);
        env.storage().persistent().get(&key)
    }

    /// Get only risk score (backward compatibility)
    pub fn get_score(env: Env, user: Address) -> u32 {
        let key = DataKey::RiskTier(user);
        if let Some(data) = env
            .storage()
            .persistent()
            .get::<_, RiskTierData>(&key)
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
    pub fn update_chosen_tier(env: Env, user: Address, new_chosen_tier: Symbol) {
        user.require_auth();
        let key = DataKey::RiskTier(user.clone());

        if let Some(mut risk_data) = env
            .storage()
            .persistent()
            .get::<_, RiskTierData>(&key)
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

            env.storage().persistent().set(&key, &risk_data);

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
        let key = DataKey::RiskTier(user);

        if let Some(risk_data) = env
            .storage()
            .persistent()
            .get::<_, RiskTierData>(&key)
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

    /// Set a new admin address
    pub fn set_admin(env: Env, new_admin: Address) {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .expect("Contract not initialized");
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &new_admin);
    }

    /// Get current admin address
    pub fn get_admin(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .expect("Contract not initialized")
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Env};

    fn setup_test(env: &Env) -> (Address, RiskTierContractClient) {
        let contract_id = env.register_contract(None, RiskTierContract);
        let client = RiskTierContractClient::new(&env, &contract_id);
        let admin = Address::generate(&env);
        client.initialize(&admin);
        (admin, client)
    }

    #[test]
    fn test_initialization() {
        let env = Env::default();
        let (admin, client) = setup_test(&env);
        assert_eq!(client.get_admin(), admin);
    }

    #[test]
    #[should_panic(expected = "Already initialized")]
    fn test_double_initialization() {
        let env = Env::default();
        let (admin, client) = setup_test(&env);
        client.initialize(&admin);
    }

    #[test]
    fn test_set_and_get_risk_tier() {
        let env = Env::default();
        env.mock_all_auths();
        let (admin, client) = setup_test(&env);

        let user = Address::generate(&env);
        let tier_1 = Symbol::new(&env, "TIER_1");
        
        client.set_risk_tier(&user, &25, &tier_1, &tier_1);
        
        let risk_data = client.get_risk_tier(&user).unwrap();
        assert_eq!(risk_data.score, 25);
        assert_eq!(risk_data.tier, tier_1);
        assert_eq!(risk_data.chosen_tier, tier_1);
    }

    #[test]
    #[should_panic] // Should fail because non-admin is calling
    fn test_set_risk_tier_unauthorized() {
        let env = Env::default();
        let (_admin, client) = setup_test(&env);
        let user = Address::generate(&env);
        let non_admin = Address::generate(&env);
        let tier_1 = Symbol::new(&env, "TIER_1");

        env.as_contract(&non_admin, || {
            client.set_risk_tier(&user, &25, &tier_1, &tier_1);
        });
    }

    #[test]
    fn test_score_validation_upper_bound() {
        let env = Env::default();
        env.mock_all_auths();
        let (_admin, client) = setup_test(&env);

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
        env.mock_all_auths();
        let (_admin, client) = setup_test(&env);

        let user = Address::generate(&env);
        let tier_3 = Symbol::new(&env, "TIER_3");
        
        client.set_risk_tier(&user, &101, &tier_3, &tier_3);
    }

    #[test]
    fn test_update_chosen_tier_valid() {
        let env = Env::default();
        env.mock_all_auths();
        let (_admin, client) = setup_test(&env);

        let user = Address::generate(&env);
        let tier_1 = Symbol::new(&env, "TIER_1");
        let tier_2 = Symbol::new(&env, "TIER_2");
        
        client.set_risk_tier(&user, &25, &tier_1, &tier_1);
        client.update_chosen_tier(&user, &tier_2);
        
        let chosen = client.get_chosen_tier(&user);
        assert_eq!(chosen, tier_2);
    }

    #[test]
    #[should_panic] // Update should require user auth
    fn test_update_chosen_tier_unauthorized() {
        let env = Env::default();
        let (_admin, client) = setup_test(&env);

        let user = Address::generate(&env);
        let attacker = Address::generate(&env);
        let tier_1 = Symbol::new(&env, "TIER_1");
        let tier_2 = Symbol::new(&env, "TIER_2");
        
        env.mock_all_auths(); // We mock auth for the set_risk_tier call
        client.set_risk_tier(&user, &25, &tier_1, &tier_1);
        
        // Now we try to update without mocking auth for the user, or by pretending to be someone else
        // In Soroban tests, if we don't mock_all_auth, require_auth will fail unless we are in the right context.
        // But mock_all_auth applies to the NEXT call.
        
        // To test unauthorized access specifically:
        env.as_contract(&attacker, || {
            client.update_chosen_tier(&user, &tier_2);
        });
    }

    #[test]
    fn test_set_admin_success() {
        let env = Env::default();
        env.mock_all_auths();
        let (admin, client) = setup_test(&env);
        let new_admin = Address::generate(&env);

        client.set_admin(&new_admin);
        assert_eq!(client.get_admin(), new_admin);
    }

    #[test]
    #[should_panic]
    fn test_set_admin_unauthorized() {
        let env = Env::default();
        let (_admin, client) = setup_test(&env);
        let non_admin = Address::generate(&env);
        let new_admin = Address::generate(&env);

        env.as_contract(&non_admin, || {
            client.set_admin(&new_admin);
        });
    }

    #[test]
    fn test_tier_access_denied_no_data() {
        let env = Env::default();
        let (_admin, client) = setup_test(&env);
        let user = Address::generate(&env);
        let tier_3 = Symbol::new(&env, "TIER_3");
        
        assert!(!client.can_access_tier(&user, &tier_3));
    }

    #[test]
    fn test_get_tier_stats() {
        let env = Env::default();
        env.mock_all_auths();
        let (_admin, client) = setup_test(&env);

        let user1 = Address::generate(&env);
        let user2 = Address::generate(&env);
        let tier_1 = Symbol::new(&env, "TIER_1");
        let tier_2 = Symbol::new(&env, "TIER_2");
        
        client.set_risk_tier(&user1, &20, &tier_1, &tier_1);
        client.set_risk_tier(&user2, &50, &tier_2, &tier_2);
        
        let stats = client.get_tier_stats();
        assert_eq!(stats.get(tier_1).unwrap(), 1);
        assert_eq!(stats.get(tier_2).unwrap(), 1);
    }
}
