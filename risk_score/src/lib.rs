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

/// Blend Protocol oracle parameters derived from a user's Riskon credit score.
///
/// Any Blend pool can call `get_blend_params(user)` on this contract to obtain
/// risk-adjusted lending parameters before executing a borrow or supply
/// operation, enabling credit-gated DeFi without requiring the user to share
/// any raw on-chain data beyond the final score.
///
/// Fields (all rates in basis points, 1 bps = 0.01 %):
///   max_ltv_bps          – Maximum Loan-to-Value ceiling (8500 = 85 %)
///   collateral_factor_bps– Efficiency of deposited collateral (9000 = 90 %)
///   rate_adjustment_bps  – Borrow rate delta vs base rate (signed i32;
///                          negative = discount, positive = premium)
///   max_borrow_usd_cents – Per-tx borrow cap in USD cents (50000_00 = $50 k)
///   tier                 – TIER_1 / TIER_2 / TIER_3
///   score                – Raw 0-100 Riskon score
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct BlendParams {
    pub max_ltv_bps: u32,
    pub collateral_factor_bps: u32,
    pub rate_adjustment_bps: i32,
    pub max_borrow_usd_cents: u64,
    pub tier: Symbol,
    pub score: u32,
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
        let chosen_key = (user, Symbol::new(&env, "chosen_tier"));
        env.storage().persistent().set(&chosen_key, &chosen_tier);
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
            let chosen_key = (user, Symbol::new(&env, "chosen_tier"));
            env.storage()
                .persistent()
                .set(&chosen_key, &new_chosen_tier);
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

    /// Return Blend Protocol oracle parameters for a user.
    ///
    /// Blend pools call this function to obtain credit-adjusted lending
    /// parameters without touching raw wallet data:
    ///
    ///   TIER_1 (score 0-30)  → 85% LTV, 90% CF, −50 bps discount
    ///   TIER_2 (score 31-70) → 70% LTV, 75% CF, ±0 bps (standard)
    ///   TIER_3 (score 71-100)→ 50% LTV, 55% CF, +250 bps premium
    ///
    /// If the user has no Riskon score yet, the most conservative TIER_3
    /// parameters are returned so the call never panics.
    pub fn get_blend_params(env: Env, user: Address) -> BlendParams {
        let tuple_key = (user, Symbol::new(&env, "risk_tier"));

        if let Some(data) = env
            .storage()
            .persistent()
            .get::<_, RiskTierData>(&tuple_key)
        {
            let tier_1 = Symbol::new(&env, "TIER_1");
            let tier_2 = Symbol::new(&env, "TIER_2");

            if data.tier == tier_1 {
                BlendParams {
                    max_ltv_bps: 8500,           // 85 %
                    collateral_factor_bps: 9000,  // 90 %
                    rate_adjustment_bps: -50,     // −0.50 % discount
                    max_borrow_usd_cents: 5_000_000, // $50 000
                    tier: data.tier,
                    score: data.score,
                }
            } else if data.tier == tier_2 {
                BlendParams {
                    max_ltv_bps: 7000,           // 70 %
                    collateral_factor_bps: 7500,  // 75 %
                    rate_adjustment_bps: 0,       // Standard rate
                    max_borrow_usd_cents: 2_000_000, // $20 000
                    tier: data.tier,
                    score: data.score,
                }
            } else {
                BlendParams {
                    max_ltv_bps: 5000,           // 50 %
                    collateral_factor_bps: 5500,  // 55 %
                    rate_adjustment_bps: 250,     // +2.50 % premium
                    max_borrow_usd_cents: 500_000, // $5 000
                    tier: data.tier,
                    score: data.score,
                }
            }
        } else {
            // No Riskon score → most conservative defaults
            BlendParams {
                max_ltv_bps: 5000,
                collateral_factor_bps: 5500,
                rate_adjustment_bps: 250,
                max_borrow_usd_cents: 500_000,
                tier: Symbol::new(&env, "TIER_3"),
                score: 100,
            }
        }
    }
}
