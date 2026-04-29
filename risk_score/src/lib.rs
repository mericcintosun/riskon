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

/// Storage key for the admin address (instance storage)
const ADMIN_KEY: &str = "admin";

#[contractimpl]
impl RiskTierContract {
    /// Initialize the contract with a trusted admin address.
    /// Can only be called once; panics if already initialized.
    pub fn initialize(env: Env, admin: Address) {
        assert!(
            !env.storage().instance().has(&Symbol::new(&env, ADMIN_KEY)),
            "Already initialized"
        );
        env.storage()
            .instance()
            .set(&Symbol::new(&env, ADMIN_KEY), &admin);
    }

    /// Return the current admin address.
    pub fn get_admin(env: Env) -> Address {
        env.storage()
            .instance()
            .get(&Symbol::new(&env, ADMIN_KEY))
            .expect("Not initialized")
    }

    /// Set risk score for a user.
    /// Only the user themselves may call this (self-attestation flow).
    /// For admin-driven scoring, use admin_set_risk_tier.
    pub fn set_risk_tier(env: Env, user: Address, score: u32, tier: Symbol, chosen_tier: Symbol) {
        // Only the user themselves may set their own score.
        // Soroban's require_auth() panics if the address has not signed
        // the current invocation — this is the canonical auth pattern.
        user.require_auth();

        Self::write_risk_tier(&env, user, score, tier, chosen_tier);
    }

    /// Admin-only: set risk score for any user (oracle / backend scoring flow).
    /// Requires the stored admin address to have signed the invocation.
    pub fn admin_set_risk_tier(
        env: Env,
        user: Address,
        score: u32,
        tier: Symbol,
        chosen_tier: Symbol,
    ) {
        let admin: Address = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, ADMIN_KEY))
            .expect("Not initialized");

        admin.require_auth();

        Self::write_risk_tier(&env, user, score, tier, chosen_tier);
    }

    /// Internal helper — shared write logic for both entry points.
    fn write_risk_tier(env: &Env, user: Address, score: u32, tier: Symbol, chosen_tier: Symbol) {
        assert!(score <= 100, "Score must be 0-100");
        assert!(
            tier == Symbol::new(env, "TIER_1")
                || tier == Symbol::new(env, "TIER_2")
                || tier == Symbol::new(env, "TIER_3"),
            "Invalid tier"
        );
        assert!(
            chosen_tier == Symbol::new(env, "TIER_1")
                || chosen_tier == Symbol::new(env, "TIER_2")
                || chosen_tier == Symbol::new(env, "TIER_3"),
            "Invalid chosen tier"
        );

        let timestamp = env.ledger().timestamp();

        let risk_data = RiskTierData {
            score,
            tier: tier.clone(),
            timestamp,
            chosen_tier: chosen_tier.clone(),
        };

        let tuple_key = (user.clone(), Symbol::new(env, "risk_tier"));
        env.storage().persistent().set(&tuple_key, &risk_data);

        // Tier-based index for efficient queries
        let tier_key = (tier.clone(), Symbol::new(env, "users"));
        let mut tier_users: Vec<Address> = env
            .storage()
            .persistent()
            .get(&tier_key)
            .unwrap_or(Vec::new(env));

        if !tier_users.contains(&user) {
            tier_users.push_back(user.clone());
            env.storage().persistent().set(&tier_key, &tier_users);
        }

        let chosen_key = (user.clone(), Symbol::new(env, "chosen_tier"));
        env.storage().persistent().set(&chosen_key, &chosen_tier);

        env.events().publish(
            (Symbol::new(env, "risk_set"), user),
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
        env.storage()
            .persistent()
            .get::<_, RiskTierData>(&tuple_key)
            .map(|d| d.score)
            .unwrap_or(0)
    }

    /// Get user's chosen tier for operations
    pub fn get_chosen_tier(env: Env, user: Address) -> Symbol {
        let chosen_key = (user, Symbol::new(&env, "chosen_tier"));
        env.storage()
            .persistent()
            .get(&chosen_key)
            .unwrap_or(Symbol::new(&env, "TIER_3"))
    }

    /// Get all users in a specific tier
    pub fn get_tier_users(env: Env, tier: Symbol) -> Vec<Address> {
        let tier_key = (tier, Symbol::new(&env, "users"));
        env.storage()
            .persistent()
            .get(&tier_key)
            .unwrap_or(Vec::new(&env))
    }

    /// Update user's chosen tier. Only the user themselves may call this.
    pub fn update_chosen_tier(env: Env, user: Address, new_chosen_tier: Symbol) {
        user.require_auth();

        let tuple_key = (user.clone(), Symbol::new(&env, "risk_tier"));

        if let Some(mut risk_data) = env
            .storage()
            .persistent()
            .get::<_, RiskTierData>(&tuple_key)
        {
            if risk_data.score > 70 {
                assert!(
                    new_chosen_tier == Symbol::new(&env, "TIER_3"),
                    "High risk users can only access TIER_3"
                );
            }

            risk_data.chosen_tier = new_chosen_tier.clone();
            risk_data.timestamp = env.ledger().timestamp();

            env.storage().persistent().set(&tuple_key, &risk_data);

            let chosen_key = (user.clone(), Symbol::new(&env, "chosen_tier"));
            env.storage()
                .persistent()
                .set(&chosen_key, &new_chosen_tier);

            env.events()
                .publish((Symbol::new(&env, "tier_updated"), user), new_chosen_tier);
        }
    }

    /// Get tier statistics
    pub fn get_tier_stats(env: Env) -> Map<Symbol, u32> {
        let mut stats = Map::new(&env);
        for tier in [
            Symbol::new(&env, "TIER_1"),
            Symbol::new(&env, "TIER_2"),
            Symbol::new(&env, "TIER_3"),
        ] {
            let count = Self::get_tier_users(env.clone(), tier.clone()).len();
            stats.set(tier, count);
        }
        stats
    }

    /// Check if user can access specific tier based on risk score
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

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Env};

    fn setup() -> (Env, Address, RiskTierContractClient<'static>) {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, RiskTierContract);
        let client = RiskTierContractClient::new(&env, &contract_id);
        let admin = Address::generate(&env);
        client.initialize(&admin);
        (env, admin, client)
    }

    // ── initialize ───────────────────────────────────────────────────────────

    #[test]
    fn test_initialize_sets_admin() {
        let (_env, admin, client) = setup();
        assert_eq!(client.get_admin(), admin);
    }

    #[test]
    #[should_panic(expected = "Already initialized")]
    fn test_initialize_twice_panics() {
        let (env, _admin, client) = setup();
        client.initialize(&Address::generate(&env));
    }

    // ── set_risk_tier: user self-auth ─────────────────────────────────────────

    #[test]
    fn test_user_can_set_own_risk_tier() {
        let (env, _admin, client) = setup();
        let user = Address::generate(&env);
        let tier_1 = Symbol::new(&env, "TIER_1");
        client.set_risk_tier(&user, &25, &tier_1, &tier_1);
        assert_eq!(client.get_risk_tier(&user).unwrap().score, 25);
    }

    #[test]
    #[should_panic]
    fn test_third_party_cannot_set_risk_tier_for_another_user() {
        let env = Env::default();
        let contract_id = env.register_contract(None, RiskTierContract);
        let client = RiskTierContractClient::new(&env, &contract_id);
        let admin = Address::generate(&env);
        env.mock_all_auths();
        client.initialize(&admin);

        let victim = Address::generate(&env);
        let attacker = Address::generate(&env);
        let tier_3 = Symbol::new(&env, "TIER_3");

        // Only mock auth for attacker — victim has NOT signed
        env.mock_auths(&[soroban_sdk::auth::MockAuth {
            address: &attacker,
            invoke: &soroban_sdk::auth::MockAuthInvoke {
                contract: &contract_id,
                fn_name: "set_risk_tier",
                args: (victim.clone(), 0u32, tier_3.clone(), tier_3.clone()).into_val(&env),
                sub_invokes: &[],
            },
        }]);
        client.set_risk_tier(&victim, &0, &tier_3, &tier_3);
    }

    // ── admin_set_risk_tier ───────────────────────────────────────────────────

    #[test]
    fn test_admin_can_set_risk_tier_for_any_user() {
        let (env, _admin, client) = setup();
        let user = Address::generate(&env);
        let tier_1 = Symbol::new(&env, "TIER_1");
        client.admin_set_risk_tier(&user, &10, &tier_1, &tier_1);
        assert_eq!(client.get_risk_tier(&user).unwrap().score, 10);
    }

    #[test]
    #[should_panic]
    fn test_non_admin_cannot_call_admin_set_risk_tier() {
        let env = Env::default();
        let contract_id = env.register_contract(None, RiskTierContract);
        let client = RiskTierContractClient::new(&env, &contract_id);
        let admin = Address::generate(&env);
        env.mock_all_auths();
        client.initialize(&admin);

        let attacker = Address::generate(&env);
        let victim = Address::generate(&env);
        let tier_3 = Symbol::new(&env, "TIER_3");

        // Mock auth for attacker (not admin)
        env.mock_auths(&[soroban_sdk::auth::MockAuth {
            address: &attacker,
            invoke: &soroban_sdk::auth::MockAuthInvoke {
                contract: &contract_id,
                fn_name: "admin_set_risk_tier",
                args: (victim.clone(), 0u32, tier_3.clone(), tier_3.clone()).into_val(&env),
                sub_invokes: &[],
            },
        }]);
        client.admin_set_risk_tier(&victim, &0, &tier_3, &tier_3);
    }

    // ── update_chosen_tier ────────────────────────────────────────────────────

    #[test]
    fn test_user_can_update_own_chosen_tier() {
        let (env, _admin, client) = setup();
        let user = Address::generate(&env);
        let tier_1 = Symbol::new(&env, "TIER_1");
        let tier_2 = Symbol::new(&env, "TIER_2");
        client.set_risk_tier(&user, &25, &tier_1, &tier_1);
        client.update_chosen_tier(&user, &tier_2);
        assert_eq!(client.get_chosen_tier(&user), tier_2);
    }

    #[test]
    #[should_panic]
    fn test_third_party_cannot_update_chosen_tier() {
        let env = Env::default();
        let contract_id = env.register_contract(None, RiskTierContract);
        let client = RiskTierContractClient::new(&env, &contract_id);
        let admin = Address::generate(&env);
        env.mock_all_auths();
        client.initialize(&admin);
        let user = Address::generate(&env);
        let tier_1 = Symbol::new(&env, "TIER_1");
        client.set_risk_tier(&user, &25, &tier_1, &tier_1);

        let attacker = Address::generate(&env);
        let tier_2 = Symbol::new(&env, "TIER_2");
        env.mock_auths(&[soroban_sdk::auth::MockAuth {
            address: &attacker,
            invoke: &soroban_sdk::auth::MockAuthInvoke {
                contract: &contract_id,
                fn_name: "update_chosen_tier",
                args: (user.clone(), tier_2.clone()).into_val(&env),
                sub_invokes: &[],
            },
        }]);
        client.update_chosen_tier(&user, &tier_2);
    }

    // ── existing functional tests ─────────────────────────────────────────────

    #[test]
    fn test_set_and_get_risk_tier() {
        let (env, _admin, client) = setup();
        let user = Address::generate(&env);
        let tier_1 = Symbol::new(&env, "TIER_1");
        client.set_risk_tier(&user, &25, &tier_1, &tier_1);
        let d = client.get_risk_tier(&user).unwrap();
        assert_eq!(d.score, 25);
        assert_eq!(d.tier, tier_1);
        assert_eq!(d.chosen_tier, tier_1);
    }

    #[test]
    fn test_score_validation_upper_bound() {
        let (env, _admin, client) = setup();
        let user = Address::generate(&env);
        let tier_3 = Symbol::new(&env, "TIER_3");
        client.set_risk_tier(&user, &100, &tier_3, &tier_3);
        assert_eq!(client.get_score(&user), 100);
    }

    #[test]
    #[should_panic(expected = "Score must be 0-100")]
    fn test_score_validation_exceeds_limit() {
        let (env, _admin, client) = setup();
        let user = Address::generate(&env);
        let tier_3 = Symbol::new(&env, "TIER_3");
        client.set_risk_tier(&user, &101, &tier_3, &tier_3);
    }

    #[test]
    #[should_panic(expected = "Invalid tier")]
    fn test_invalid_tier_validation() {
        let (env, _admin, client) = setup();
        let user = Address::generate(&env);
        let invalid = Symbol::new(&env, "TIER_4");
        client.set_risk_tier(&user, &50, &invalid, &invalid);
    }

    #[test]
    fn test_tier_access_tier1_low_risk() {
        let (env, _admin, client) = setup();
        let user = Address::generate(&env);
        let tier_1 = Symbol::new(&env, "TIER_1");
        client.set_risk_tier(&user, &25, &tier_1, &tier_1);
        assert!(client.can_access_tier(&user, &tier_1));
    }

    #[test]
    fn test_tier_access_tier1_boundary() {
        let (env, _admin, client) = setup();
        let user = Address::generate(&env);
        let tier_1 = Symbol::new(&env, "TIER_1");
        client.set_risk_tier(&user, &30, &tier_1, &tier_1);
        assert!(client.can_access_tier(&user, &tier_1));
    }

    #[test]
    fn test_tier_access_tier1_denied() {
        let (env, _admin, client) = setup();
        let user = Address::generate(&env);
        let tier_2 = Symbol::new(&env, "TIER_2");
        let tier_1 = Symbol::new(&env, "TIER_1");
        client.set_risk_tier(&user, &50, &tier_2, &tier_2);
        assert!(!client.can_access_tier(&user, &tier_1));
    }

    #[test]
    fn test_tier_access_tier2_medium_risk() {
        let (env, _admin, client) = setup();
        let user = Address::generate(&env);
        let tier_2 = Symbol::new(&env, "TIER_2");
        client.set_risk_tier(&user, &50, &tier_2, &tier_2);
        assert!(client.can_access_tier(&user, &tier_2));
    }

    #[test]
    fn test_tier_access_tier3_always_accessible() {
        let (env, _admin, client) = setup();
        let user = Address::generate(&env);
        let tier_3 = Symbol::new(&env, "TIER_3");
        client.set_risk_tier(&user, &85, &tier_3, &tier_3);
        assert!(client.can_access_tier(&user, &tier_3));
    }

    #[test]
    fn test_get_tier_users() {
        let (env, _admin, client) = setup();
        let user1 = Address::generate(&env);
        let user2 = Address::generate(&env);
        let tier_1 = Symbol::new(&env, "TIER_1");
        client.set_risk_tier(&user1, &20, &tier_1, &tier_1);
        client.set_risk_tier(&user2, &25, &tier_1, &tier_1);
        assert_eq!(client.get_tier_users(&tier_1).len(), 2);
    }

    #[test]
    #[should_panic(expected = "High risk users can only access TIER_3")]
    fn test_update_chosen_tier_high_risk_restriction() {
        let (env, _admin, client) = setup();
        let user = Address::generate(&env);
        let tier_3 = Symbol::new(&env, "TIER_3");
        let tier_1 = Symbol::new(&env, "TIER_1");
        client.set_risk_tier(&user, &85, &tier_3, &tier_3);
        client.update_chosen_tier(&user, &tier_1);
    }

    #[test]
    fn test_get_tier_stats() {
        let (env, _admin, client) = setup();
        let tier_1 = Symbol::new(&env, "TIER_1");
        let tier_2 = Symbol::new(&env, "TIER_2");
        let tier_3 = Symbol::new(&env, "TIER_3");
        client.set_risk_tier(&Address::generate(&env), &20, &tier_1, &tier_1);
        client.set_risk_tier(&Address::generate(&env), &50, &tier_2, &tier_2);
        client.set_risk_tier(&Address::generate(&env), &80, &tier_3, &tier_3);
        let stats = client.get_tier_stats();
        assert_eq!(stats.get(tier_1).unwrap(), 1);
        assert_eq!(stats.get(tier_2).unwrap(), 1);
        assert_eq!(stats.get(tier_3).unwrap(), 1);
    }

    #[test]
    fn test_score_update_overwrites_previous() {
        let (env, _admin, client) = setup();
        let user = Address::generate(&env);
        let tier_2 = Symbol::new(&env, "TIER_2");
        let tier_1 = Symbol::new(&env, "TIER_1");
        client.set_risk_tier(&user, &50, &tier_2, &tier_2);
        client.set_risk_tier(&user, &25, &tier_1, &tier_1);
        let d = client.get_risk_tier(&user).unwrap();
        assert_eq!(d.score, 25);
        assert_eq!(d.tier, tier_1);
    }

    #[test]
    fn test_no_risk_data_returns_zero_score() {
        let (env, _admin, client) = setup();
        assert_eq!(client.get_score(&Address::generate(&env)), 0);
    }

    #[test]
    fn test_no_risk_data_denies_tier_access() {
        let (env, _admin, client) = setup();
        let tier_3 = Symbol::new(&env, "TIER_3");
        assert!(!client.can_access_tier(&Address::generate(&env), &tier_3));
    }

    #[test]
    fn test_multiple_users_different_tiers() {
        let (env, _admin, client) = setup();
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
