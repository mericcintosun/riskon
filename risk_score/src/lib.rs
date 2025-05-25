#![no_std]
use soroban_sdk::{contract, contractimpl, Env, Address};

/// Sözleşme tipini tanıt — **#[contract]** önemli!  
#[contract]
pub struct RiskContract;

/// Fonksiyonları dışa aç  
#[contractimpl]
impl RiskContract {
    /// 0-100 arası skoru kalıcı depola
    pub fn set_score(env: Env, user: Address, score: u32) {
        assert!(score <= 100);
        env.storage().persistent().set(&user, &score);
    }

    /// Skoru getir; yoksa 0
    pub fn get_score(env: Env, user: Address) -> u32 {
        env.storage().persistent().get(&user).unwrap_or(0)
    }
}