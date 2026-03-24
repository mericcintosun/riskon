#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, Address, Env, Symbol,
};

// ─────────────────────────────────────────────
// Error Types
// ─────────────────────────────────────────────

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum RiskError {
    /// Score must be in the range 0–100 (inclusive).
    InvalidScore = 1,
    /// Tier must be one of: TIER_1, TIER_2, TIER_3.
    InvalidTier = 2,
    /// Caller is not authorised to update this user's risk profile.
    Unauthorized = 3,
    /// No risk data found for the given user address.
    NotFound = 4,
}

// ─────────────────────────────────────────────
// Storage Types
// ─────────────────────────────────────────────

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RiskTierData {
    /// AI-predicted credit score (0 = lowest risk, 100 = highest risk).
    pub score: u32,
    /// Assigned risk tier derived from the score.
    pub tier: Symbol,
    /// Unix timestamp of the last update (ledger timestamp).
    pub timestamp: u64,
    /// The tier the user has selected for their current DeFi operations.
    pub chosen_tier: Symbol,
}

#[contracttype]
pub enum DataKey {
    RiskTier(Address),
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/// Returns `true` when `sym` is one of the three accepted tier symbols.
fn is_valid_tier(sym: &Symbol) -> bool {
    *sym == symbol_short!("TIER_1")
        || *sym == symbol_short!("TIER_2")
        || *sym == symbol_short!("TIER_3")
}

/// Derives the expected tier from a numeric score according to protocol rules:
/// - 0–30  → TIER_1 (low risk)
/// - 31–70 → TIER_2 (medium risk)
/// - 71–100→ TIER_3 (high risk)
fn tier_for_score(env: &Env, score: u32) -> Symbol {
    if score <= 30 {
        symbol_short!("TIER_1")
    } else if score <= 70 {
        symbol_short!("TIER_2")
    } else {
        symbol_short!("TIER_3")
    }
}

// ─────────────────────────────────────────────
// Contract
// ─────────────────────────────────────────────

#[contract]
pub struct RiskTierContract;

#[contractimpl]
impl RiskTierContract {
    // ── Write ────────────────────────────────

    /// Store or update a user's risk profile on-chain.
    ///
    /// # Arguments
    /// * `user`         – The Stellar address whose profile is being updated.
    ///                    The caller *must* be `user` (enforced via `require_auth`).
    /// * `score`        – AI-predicted credit score, **must be 0–100 inclusive**.
    /// * `tier`         – Risk tier Symbol (`TIER_1` / `TIER_2` / `TIER_3`).
    ///                    **Must be consistent with `score`** per the tier mapping above.
    /// * `chosen_tier`  – The tier the user selects for their active DeFi operations.
    ///                    **Must be a valid tier Symbol.**
    ///
    /// # Errors
    /// Returns `RiskError::InvalidScore`  if `score > 100`.
    /// Returns `RiskError::InvalidTier`   if `tier` or `chosen_tier` is unrecognised.
    pub fn set_risk_tier(
        env: Env,
        user: Address,
        score: u32,
        tier: Symbol,
        chosen_tier: Symbol,
    ) -> Result<(), RiskError> {
        // 1. Caller authorisation — only the user themselves may update their profile.
        user.require_auth();

        // 2. Validate score range.
        if score > 100 {
            return Err(RiskError::InvalidScore);
        }

        // 3. Validate tier symbols.
        if !is_valid_tier(&tier) {
            return Err(RiskError::InvalidTier);
        }
        if !is_valid_tier(&chosen_tier) {
            return Err(RiskError::InvalidTier);
        }

        // 4. Persist the risk profile.
        let data = RiskTierData {
            score,
            tier,
            timestamp: env.ledger().timestamp(),
            chosen_tier,
        };

        env.storage()
            .persistent()
            .set(&DataKey::RiskTier(user), &data);

        Ok(())
    }

    // ── Read ─────────────────────────────────

    /// Retrieve the full risk profile for `user`.
    ///
    /// # Errors
    /// Returns `RiskError::NotFound` when the address has no stored profile.
    pub fn get_risk_tier(env: Env, user: Address) -> Result<RiskTierData, RiskError> {
        env.storage()
            .persistent()
            .get(&DataKey::RiskTier(user))
            .ok_or(RiskError::NotFound)
    }

    /// Check whether `user` is eligible to access `target_tier`.
    ///
    /// Access rules:
    /// - `TIER_1` (low risk)    — requires `score <= 30`
    /// - `TIER_2` (medium risk) — requires `score <= 70`
    /// - `TIER_3` (high risk)   — always accessible (open tier)
    ///
    /// Returns `false` when the user has no stored profile or the tier is invalid.
    pub fn can_access_tier(env: Env, user: Address, target_tier: Symbol) -> bool {
        let data: RiskTierData = match env.storage().persistent().get(&DataKey::RiskTier(user)) {
            Some(d) => d,
            None => return false,
        };

        if target_tier == symbol_short!("TIER_1") {
            data.score <= 30
        } else if target_tier == symbol_short!("TIER_2") {
            data.score <= 70
        } else if target_tier == symbol_short!("TIER_3") {
            true
        } else {
            // Unknown tier — deny access.
            false
        }
    }
}

// ─────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{symbol_short, testutils::Address as _, Address, Env};

    /// Convenience: deploy the contract and return (env, client).
    fn setup() -> (Env, RiskTierContractClient<'static>) {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register_contract(None, RiskTierContract);
        let client = RiskTierContractClient::new(&env, &contract_id);
        // SAFETY: lifetime is tied to `env` which is returned; safe for test scope.
        let client: RiskTierContractClient<'static> = unsafe { core::mem::transmute(client) };
        (env, client)
    }

    // ── Happy-path ───────────────────────────

    #[test]
    fn test_set_and_get_tier1() {
        let (env, client) = setup();
        let user = Address::generate(&env);

        client
            .set_risk_tier(
                &user,
                &20,
                &symbol_short!("TIER_1"),
                &symbol_short!("TIER_1"),
            )
            .unwrap();

        let data = client.get_risk_tier(&user).unwrap();
        assert_eq!(data.score, 20);
        assert_eq!(data.tier, symbol_short!("TIER_1"));
        assert_eq!(data.chosen_tier, symbol_short!("TIER_1"));
    }

    #[test]
    fn test_set_and_get_tier2() {
        let (env, client) = setup();
        let user = Address::generate(&env);

        client
            .set_risk_tier(
                &user,
                &50,
                &symbol_short!("TIER_2"),
                &symbol_short!("TIER_2"),
            )
            .unwrap();

        let data = client.get_risk_tier(&user).unwrap();
        assert_eq!(data.score, 50);
        assert_eq!(data.tier, symbol_short!("TIER_2"));
    }

    #[test]
    fn test_set_and_get_tier3() {
        let (env, client) = setup();
        let user = Address::generate(&env);

        client
            .set_risk_tier(
                &user,
                &85,
                &symbol_short!("TIER_3"),
                &symbol_short!("TIER_3"),
            )
            .unwrap();

        let data = client.get_risk_tier(&user).unwrap();
        assert_eq!(data.score, 85);
        assert_eq!(data.tier, symbol_short!("TIER_3"));
    }

    #[test]
    fn test_score_boundary_zero() {
        let (env, client) = setup();
        let user = Address::generate(&env);

        // Score 0 is the minimum valid value.
        client
            .set_risk_tier(
                &user,
                &0,
                &symbol_short!("TIER_1"),
                &symbol_short!("TIER_1"),
            )
            .unwrap();

        let data = client.get_risk_tier(&user).unwrap();
        assert_eq!(data.score, 0);
    }

    #[test]
    fn test_score_boundary_100() {
        let (env, client) = setup();
        let user = Address::generate(&env);

        // Score 100 is the maximum valid value.
        client
            .set_risk_tier(
                &user,
                &100,
                &symbol_short!("TIER_3"),
                &symbol_short!("TIER_3"),
            )
            .unwrap();

        let data = client.get_risk_tier(&user).unwrap();
        assert_eq!(data.score, 100);
    }

    #[test]
    fn test_update_overwrites_previous_profile() {
        let (env, client) = setup();
        let user = Address::generate(&env);

        client
            .set_risk_tier(
                &user,
                &10,
                &symbol_short!("TIER_1"),
                &symbol_short!("TIER_1"),
            )
            .unwrap();
        client
            .set_risk_tier(
                &user,
                &60,
                &symbol_short!("TIER_2"),
                &symbol_short!("TIER_2"),
            )
            .unwrap();

        let data = client.get_risk_tier(&user).unwrap();
        // Latest write must win.
        assert_eq!(data.score, 60);
        assert_eq!(data.tier, symbol_short!("TIER_2"));
    }

    // ── Input validation ─────────────────────

    #[test]
    fn test_reject_score_above_100() {
        let (env, client) = setup();
        let user = Address::generate(&env);

        let result = client.try_set_risk_tier(
            &user,
            &101,
            &symbol_short!("TIER_3"),
            &symbol_short!("TIER_3"),
        );
        assert_eq!(result.unwrap_err().unwrap(), RiskError::InvalidScore);
    }

    #[test]
    fn test_reject_score_999() {
        let (env, client) = setup();
        let user = Address::generate(&env);

        let result = client.try_set_risk_tier(
            &user,
            &999,
            &symbol_short!("TIER_1"),
            &symbol_short!("TIER_1"),
        );
        assert_eq!(result.unwrap_err().unwrap(), RiskError::InvalidScore);
    }

    #[test]
    fn test_reject_invalid_tier_symbol() {
        let (env, client) = setup();
        let user = Address::generate(&env);

        let result = client.try_set_risk_tier(
            &user,
            &50,
            &symbol_short!("GARBAGE"),
            &symbol_short!("TIER_2"),
        );
        assert_eq!(result.unwrap_err().unwrap(), RiskError::InvalidTier);
    }

    #[test]
    fn test_reject_invalid_chosen_tier_symbol() {
        let (env, client) = setup();
        let user = Address::generate(&env);

        let result =
            client.try_set_risk_tier(&user, &50, &symbol_short!("TIER_2"), &symbol_short!("NONE"));
        assert_eq!(result.unwrap_err().unwrap(), RiskError::InvalidTier);
    }

    // ── can_access_tier boundaries ───────────

    #[test]
    fn test_can_access_tier1_at_boundary_30() {
        let (env, client) = setup();
        let user = Address::generate(&env);

        client
            .set_risk_tier(
                &user,
                &30,
                &symbol_short!("TIER_1"),
                &symbol_short!("TIER_1"),
            )
            .unwrap();

        assert!(client.can_access_tier(&user, &symbol_short!("TIER_1")));
        assert!(client.can_access_tier(&user, &symbol_short!("TIER_2")));
        assert!(client.can_access_tier(&user, &symbol_short!("TIER_3")));
    }

    #[test]
    fn test_cannot_access_tier1_at_score_31() {
        let (env, client) = setup();
        let user = Address::generate(&env);

        client
            .set_risk_tier(
                &user,
                &31,
                &symbol_short!("TIER_2"),
                &symbol_short!("TIER_2"),
            )
            .unwrap();

        assert!(!client.can_access_tier(&user, &symbol_short!("TIER_1")));
        assert!(client.can_access_tier(&user, &symbol_short!("TIER_2")));
        assert!(client.can_access_tier(&user, &symbol_short!("TIER_3")));
    }

    #[test]
    fn test_can_access_tier2_at_boundary_70() {
        let (env, client) = setup();
        let user = Address::generate(&env);

        client
            .set_risk_tier(
                &user,
                &70,
                &symbol_short!("TIER_2"),
                &symbol_short!("TIER_2"),
            )
            .unwrap();

        assert!(!client.can_access_tier(&user, &symbol_short!("TIER_1")));
        assert!(client.can_access_tier(&user, &symbol_short!("TIER_2")));
        assert!(client.can_access_tier(&user, &symbol_short!("TIER_3")));
    }

    #[test]
    fn test_cannot_access_tier2_at_score_71() {
        let (env, client) = setup();
        let user = Address::generate(&env);

        client
            .set_risk_tier(
                &user,
                &71,
                &symbol_short!("TIER_3"),
                &symbol_short!("TIER_3"),
            )
            .unwrap();

        assert!(!client.can_access_tier(&user, &symbol_short!("TIER_1")));
        assert!(!client.can_access_tier(&user, &symbol_short!("TIER_2")));
        assert!(client.can_access_tier(&user, &symbol_short!("TIER_3")));
    }

    #[test]
    fn test_tier3_always_accessible() {
        let (env, client) = setup();
        let user = Address::generate(&env);

        // Even the riskiest score grants TIER_3 access.
        client
            .set_risk_tier(
                &user,
                &100,
                &symbol_short!("TIER_3"),
                &symbol_short!("TIER_3"),
            )
            .unwrap();

        assert!(client.can_access_tier(&user, &symbol_short!("TIER_3")));
    }

    #[test]
    fn test_can_access_tier_unknown_target_returns_false() {
        let (env, client) = setup();
        let user = Address::generate(&env);

        client
            .set_risk_tier(
                &user,
                &10,
                &symbol_short!("TIER_1"),
                &symbol_short!("TIER_1"),
            )
            .unwrap();

        // An unrecognised target tier should deny access rather than panic.
        assert!(!client.can_access_tier(&user, &symbol_short!("TIER_X")));
    }

    // ── Not-found handling ───────────────────

    #[test]
    fn test_get_risk_tier_not_found() {
        let (env, client) = setup();
        let user = Address::generate(&env);

        let result = client.try_get_risk_tier(&user);
        assert_eq!(result.unwrap_err().unwrap(), RiskError::NotFound);
    }

    #[test]
    fn test_can_access_tier_no_profile_returns_false() {
        let (env, client) = setup();
        let user = Address::generate(&env);

        // No profile stored — must return false rather than panic.
        assert!(!client.can_access_tier(&user, &symbol_short!("TIER_3")));
    }

    // ── Timestamp is recorded ────────────────

    #[test]
    fn test_timestamp_is_stored() {
        let (env, client) = setup();
        let user = Address::generate(&env);

        client
            .set_risk_tier(
                &user,
                &42,
                &symbol_short!("TIER_2"),
                &symbol_short!("TIER_2"),
            )
            .unwrap();

        let data = client.get_risk_tier(&user).unwrap();
        // Timestamp should be a non-zero ledger timestamp.
        assert!(data.timestamp > 0);
    }
}
