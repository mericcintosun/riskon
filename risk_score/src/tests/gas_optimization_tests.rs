#[cfg(test)]
mod gas_optimization_tests {
    use super::*;
    use soroban_sdk::{Address, Env, Symbol};

    /// Test gas consumption for basic operations
    #[test]
    fn test_gas_consumption_basic_operations() {
        let env = Env::default();
        let contract_id = env.register_contract(None, RiskTierContract);
        let client = RiskTierContractClient::new(&env, &contract_id);

        let user = Address::generate(&env);
        let tier_1 = Symbol::new(&env, "TIER_1");

        // Measure gas for setting risk tier
        let initial_budget = env.budget().clone();
        client.set_risk_tier(&user, &user, &25, &tier_1, &tier_1);
        let set_risk_tier_cost = initial_budget - env.budget();

        // Measure gas for getting risk tier
        let initial_budget = env.budget().clone();
        let _risk_data = client.get_risk_tier(&user);
        let get_risk_tier_cost = initial_budget - env.budget();

        // Measure gas for checking tier access
        let initial_budget = env.budget().clone();
        let _can_access = client.can_access_tier(&user, &tier_1);
        let can_access_tier_cost = initial_budget - env.budget();

        // Log gas costs for analysis
        println!("Gas costs:");
        println!("  set_risk_tier: {:?}", set_risk_tier_cost);
        println!("  get_risk_tier: {:?}", get_risk_tier_cost);
        println!("  can_access_tier: {:?}", can_access_tier_cost);

        // Basic sanity checks - these operations should consume reasonable amounts of gas
        assert!(set_risk_tier_cost.cpu_instructions > 0);
        assert!(get_risk_tier_cost.cpu_instructions > 0);
        assert!(can_access_tier_cost.cpu_instructions > 0);
    }

    /// Test gas consumption for bulk operations
    #[test]
    fn test_gas_consumption_bulk_operations() {
        let env = Env::default();
        let contract_id = env.register_contract(None, RiskTierContract);
        let client = RiskTierContractClient::new(&env, &contract_id);

        let tier_2 = Symbol::new(&env, "TIER_2");
        let user_count = 100;
        let users: Vec<Address> = (0..user_count).map(|_| Address::generate(&env)).collect();

        // Measure gas for setting risk tiers in bulk
        let initial_budget = env.budget().clone();
        for (i, user) in users.iter().enumerate() {
            let score = (i % 100) as u32;
            client.set_risk_tier(user, user, &score, &tier_2, &tier_2);
        }
        let bulk_set_cost = initial_budget - env.budget();

        // Measure gas for getting risk tiers in bulk
        let initial_budget = env.budget().clone();
        for user in users.iter() {
            let _score = client.get_score(user);
        }
        let bulk_get_cost = initial_budget - env.budget();

        println!("Bulk gas costs ({} users):", user_count);
        println!("  bulk set_risk_tier: {:?}", bulk_set_cost);
        println!("  bulk get_score: {:?}", bulk_get_cost);
        println!("  average per set: {:?}", bulk_set_cost / user_count);
        println!("  average per get: {:?}", bulk_get_cost / user_count);

        // Verify that bulk operations are efficient
        let avg_set_cost = bulk_set_cost / user_count;
        let avg_get_cost = bulk_get_cost / user_count;
        
        // These should be reasonable per-operation costs
        assert!(avg_set_cost.cpu_instructions < 1000000); // Less than 1M CPU instructions per set
        assert!(avg_get_cost.cpu_instructions < 500000);  // Less than 500K CPU instructions per get
    }

    /// Test gas consumption for tier statistics
    #[test]
    fn test_gas_consumption_tier_stats() {
        let env = Env::default();
        let contract_id = env.register_contract(None, RiskTierContract);
        let client = RiskTierContractClient::new(&env, &contract_id);

        let tier_1 = Symbol::new(&env, "TIER_1");
        let tier_2 = Symbol::new(&env, "TIER_2");
        let tier_3 = Symbol::new(&env, "TIER_3");

        // Create users across different tiers
        let user_count = 50;
        for i in 0..user_count {
            let user = Address::generate(&env);
            let (score, tier) = match i % 3 {
                0 => (25, tier_1.clone()),
                1 => (50, tier_2.clone()),
                _ => (85, tier_3.clone()),
            };
            client.set_risk_tier(&user, &user, &score, &tier, &tier);
        }

        // Measure gas for getting tier statistics
        let initial_budget = env.budget().clone();
        let _stats = client.get_tier_stats();
        let tier_stats_cost = initial_budget - env.budget();

        println!("Tier statistics gas cost: {:?}", tier_stats_cost);

        // Tier stats should be reasonably efficient
        assert!(tier_stats_cost.cpu_instructions < 2000000); // Less than 2M CPU instructions
    }

    /// Test memory usage patterns
    #[test]
    fn test_memory_usage_patterns() {
        let env = Env::default();
        let contract_id = env.register_contract(None, RiskTierContract);
        let client = RiskTierContractClient::new(&env, &contract_id);

        let tier_2 = Symbol::new(&env, "TIER_2");
        let user_count = 50;

        // Measure memory usage before operations
        let initial_memory = env.budget().memory_bytes;

        // Set risk tiers for multiple users
        for i in 0..user_count {
            let user = Address::generate(&env);
            let score = (i * 2) as u32;
            client.set_risk_tier(&user, &user, &score, &tier_2, &tier_2);
        }

        let after_set_memory = env.budget().memory_bytes;
        let set_memory_usage = after_set_memory - initial_memory;

        // Read risk tiers for all users
        for i in 0..user_count {
            let user = Address::generate(&env);
            let _score = client.get_score(&user);
        }

        let final_memory = env.budget().memory_bytes;

        println!("Memory usage patterns:");
        println!("  Initial memory: {} bytes", initial_memory);
        println!("  After setting {} users: {} bytes", user_count, after_set_memory);
        println!("  Memory used for sets: {} bytes", set_memory_usage);
        println!("  Final memory: {} bytes", final_memory);

        // Memory usage should be reasonable
        assert!(set_memory_usage > 0); // Should use some memory
        assert!(set_memory_usage < user_count * 1000); // Less than 1KB per user
    }

    /// Test edge case gas consumption
    #[test]
    fn test_edge_case_gas_consumption() {
        let env = Env::default();
        let contract_id = env.register_contract(None, RiskTierContract);
        let client = RiskTierContractClient::new(&env, &contract_id);

        let user = Address::generate(&env);
        let tier_3 = Symbol::new(&env, "TIER_3");

        // Test getting data for non-existent user
        let initial_budget = env.budget().clone();
        let _score = client.get_score(&user);
        let get_nonexistent_cost = initial_budget - env.budget();

        // Test tier access for non-existent user
        let initial_budget = env.budget().clone();
        let _can_access = client.can_access_tier(&user, &tier_3);
        let access_nonexistent_cost = initial_budget - env.budget();

        println!("Edge case gas costs:");
        println!("  get_score (non-existent): {:?}", get_nonexistent_cost);
        println!("  can_access_tier (non-existent): {:?}", access_nonexistent_cost);

        // These should be very cheap operations
        assert!(get_nonexistent_cost.cpu_instructions < 100000);
        assert!(access_nonexistent_cost.cpu_instructions < 100000);
    }

    /// Test gas consumption with large data structures
    #[test]
    fn test_gas_consumption_large_data() {
        let env = Env::default();
        let contract_id = env.register_contract(None, RiskTierContract);
        let client = RiskTierContractClient::new(&env, &contract_id);

        let tier_1 = Symbol::new(&env, "TIER_1");
        let large_user_count = 200;

        // Create a large number of users in the same tier
        let initial_budget = env.budget().clone();
        for _ in 0..large_user_count {
            let user = Address::generate(&env);
            client.set_risk_tier(&user, &user, &25, &tier_1, &tier_1);
        }
        let large_set_cost = initial_budget - env.budget();

        // Get all users in the tier
        let initial_budget = env.budget().clone();
        let _tier_users = client.get_tier_users(&tier_1);
        let get_tier_users_cost = initial_budget - env.budget();

        println!("Large data gas costs ({} users):", large_user_count);
        println!("  Large set cost: {:?}", large_set_cost);
        println!("  Get tier users cost: {:?}", get_tier_users_cost);

        // Verify scalability
        let avg_set_cost = large_set_cost / large_user_count;
        assert!(avg_set_cost.cpu_instructions < 2000000); // Reasonable per-user cost even at scale
    }
}
