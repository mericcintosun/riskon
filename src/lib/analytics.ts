import { track } from '@vercel/analytics';

// ── Wallet Events ──────────────────────────────────────────

export function trackWalletConnected(walletType) {
  track('wallet_connected', { wallet_type: walletType });
}

export function trackWalletDisconnected(walletType) {
  track('wallet_disconnected', { wallet_type: walletType });
}

export function trackWalletError(errorMessage) {
  track('wallet_error', { error_message: errorMessage });
}

// ── Transaction Events ─────────────────────────────────────

export function trackTransactionSubmitted(type, amount, asset) {
  track('transaction_submitted', { type, amount: String(amount), asset });
}

export function trackTransactionSuccess(type, amount, asset, txHash) {
  track('transaction_success', { type, amount: String(amount), asset, tx_hash: txHash });
}

export function trackTransactionFailed(type, errorMessage) {
  track('transaction_failed', { type, error_message: errorMessage });
}

// ── Risk Score Events ──────────────────────────────────────

export function trackRiskScoreLookup(address) {
  track('risk_score_lookup', { address });
}

export function trackRiskTierChanged(oldTier, newTier) {
  track('risk_tier_changed', { old_tier: String(oldTier), new_tier: String(newTier) });
}

// ── PWA Events ─────────────────────────────────────────────

export function trackAppInstalled() {
  track('app_installed');
}
