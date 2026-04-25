#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, Map, Symbol, Vec};

/// Enhanced Risk & Tier Management Contract
/// Stores risk scores with tier classifications and timestamps
/// 
const DAY_IN_LEDGERS: u32 = 17280;
const BUMP_AMOUNT: u32 = 30 * DAY_IN_LEDGERS;
const LIFETIME_THRESHOLD: u32 = 15 * DAY_IN_LEDGERS;
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
        env.storage().persistent().extend_ttl(&tuple_key, LIFETIME_THRESHOLD, BUMP_AMOUNT);

        
    
        let user_membership_key = (tier.clone(), Symbol::new(&env, "is_member"), user.clone());
        let is_already_member: bool = env
            .storage()
            .persistent()
            .get(&user_membership_key)
            .unwrap_or(false);

        
        if !is_already_member {
            
            env.storage().persistent().set(&user_membership_key, &true);
            env.storage().persistent().extend_ttl(&user_membership_key, LIFETIME_THRESHOLD, BUMP_AMOUNT);

            
            let stats_key = (tier.clone(), Symbol::new(&env, "count"));
            let current_count: u32 = env
                .storage()
                .persistent()
                .get(&stats_key)
                .unwrap_or(0);
                
            env.storage().persistent().set(&stats_key, &(current_count + 1));
            env.storage().persistent().extend_ttl(&stats_key, LIFETIME_THRESHOLD, BUMP_AMOUNT);
        }
        // --------------------------

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
       
        if env.storage().persistent().has(&tuple_key) {
            env.storage().persistent().extend_ttl(&tuple_key, LIFETIME_THRESHOLD, BUMP_AMOUNT);
        }
        env.storage().persistent().get(&tuple_key)
    }
    /// Get only risk score (backward compatibility)
   pub fn get_score(env: Env, user: Address) -> u32 {
        let tuple_key = (user, Symbol::new(&env, "risk_tier"));
       
        if let Some(data) = env.storage().persistent().get::<_, RiskTierData>(&tuple_key) {
            env.storage().persistent().extend_ttl(&tuple_key, LIFETIME_THRESHOLD, BUMP_AMOUNT);
            data.score
        } else {
            0
        }
    }

    /// Get user's chosen tier for operations
  pub fn get_chosen_tier(env: Env, user: Address) -> Symbol {
        let chosen_key = (user, Symbol::new(&env, "chosen_tier"));
        if env.storage().persistent().has(&chosen_key) {
             env.storage().persistent().extend_ttl(&chosen_key, LIFETIME_THRESHOLD, BUMP_AMOUNT);
        }
        env.storage()
            .persistent()
            .get(&chosen_key)
            .unwrap_or(Symbol::new(&env, "TIER_3"))
    }

    

    
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
            risk_data.timestamp = env.ledger().timestamp(); // Atualiza o timestamp

            env.storage().persistent().set(&tuple_key, &risk_data);

            
            let chosen_key = (user.clone(), Symbol::new(&env, "chosen_tier"));
            env.storage()
                .persistent()
                .set(&chosen_key, &new_chosen_tier);
            env.storage().persistent().extend_ttl(&tuple_key, LIFETIME_THRESHOLD, BUMP_AMOUNT);

        
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
           let stats_key = (tier.clone(), Symbol::new(&env, "count"));
    let count: u32 = env.storage().persistent().get(&stats_key).unwrap_or(0);
    stats.set(tier, count);
        }

        stats
        }

    /// Check if user can access specific tier based on risk score
    /// Following Goldfinch/Maple risk-liquidity mapping methodology
  pub fn can_access_tier(env: Env, user: Address, target_tier: Symbol) -> bool {
        let tuple_key = (user, Symbol::new(&env, "risk_tier"));

        if let Some(risk_data) = env.storage().persistent().get::<_, RiskTierData>(&tuple_key) {
            // Explicação: Renova a vida do score do usuário sempre que o acesso a um tier for validado.
            env.storage().persistent().extend_ttl(&tuple_key, LIFETIME_THRESHOLD, BUMP_AMOUNT);
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
   use soroban_sdk::{testutils::Address as _, Address, Env, Symbol};

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
    fn test_update_chosen_tier_valid() {
        let env = Env::default();
        env.mock_all_auths();
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
        env.mock_all_auths();
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
}
