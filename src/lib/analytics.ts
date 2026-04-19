/**
 * Privacy-First Analytics Module
 *
 * Provides privacy-friendly, anonymous event tracking for the Riskon application.
 * Compatible with Plausible Analytics API.
 *
 * Key privacy guarantees:
 * - No wallet addresses or private keys are ever sent
 * - No personal identifiable information (PII) collected
 * - All data is anonymous and aggregate only
 * - No-ops gracefully when NEXT_PUBLIC_ANALYTICS_URL is not configured
 *
 * Related Issue: #21 - Analytics and Monitoring
 */

/** Analytics event payload — strictly no PII */
export interface AnalyticsEvent {
  /** Event name (e.g. "Risk Score Calculated") */
  name: string;
  /** Anonymous properties — must not include wallet addresses or private data */
  props?: Record<string, string | number | boolean>;
}

/** Tier labels used in analytics — safe, non-identifying */
export type RiskTierLabel = 'TIER_1' | 'TIER_2' | 'TIER_3' | 'unknown';

/** Scoring mode labels */
export type ScoringMode = 'manual' | 'automated' | 'ai_enhanced';

/** Internal config resolved from environment */
interface AnalyticsConfig {
  analyticsUrl: string | null;
  enabled: boolean;
}

/**
 * Resolves analytics configuration from environment variables.
 * All env vars are optional — the module is fully functional without them.
 */
function resolveConfig(): AnalyticsConfig {
  const analyticsUrl =
    (typeof process !== 'undefined' &&
      process.env?.NEXT_PUBLIC_ANALYTICS_URL) ||
    null;

  return {
    analyticsUrl: analyticsUrl || null,
    enabled: Boolean(analyticsUrl),
  };
}

/**
 * Sends an analytics event to the configured endpoint.
 * No-ops silently if analytics is not configured.
 *
 * @param event - The event to track (no PII allowed)
 */
export async function trackEvent(event: AnalyticsEvent): Promise<void> {
  const config = resolveConfig();

  if (!config.enabled || !config.analyticsUrl) {
    // Analytics not configured — log in development only
    if (process.env.NODE_ENV === 'development') {
      console.debug('[Analytics] No-op (not configured):', event.name, event.props);
    }
    return;
  }

  try {
    const payload = {
      n: event.name,
      u: typeof window !== 'undefined' ? window.location.href : '/',
      d: typeof window !== 'undefined' ? window.location.hostname : 'riskon',
      r: typeof document !== 'undefined' ? document.referrer : null,
      p: event.props ?? {},
    };

    await fetch(`${config.analyticsUrl}/api/event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      // Use keepalive so the request survives page unloads
      keepalive: true,
    });
  } catch {
    // Analytics failures must never affect the user experience
    if (process.env.NODE_ENV === 'development') {
      console.debug('[Analytics] Event send failed (non-fatal)');
    }
  }
}

/**
 * Tracks a page view.
 * Safe to call on every route change.
 *
 * @param path - The page path (e.g. "/wallet"). Defaults to current pathname.
 */
export async function trackPageView(path?: string): Promise<void> {
  const page =
    path ??
    (typeof window !== 'undefined' ? window.location.pathname : '/');

  await trackEvent({
    name: 'pageview',
    props: { page },
  });
}

/**
 * Tracks a risk score calculation event.
 * Only the tier and scoring mode are sent — never the raw score or wallet address.
 *
 * @param tier - The resulting risk tier (TIER_1 / TIER_2 / TIER_3)
 * @param mode - The scoring mode used
 */
export async function trackRiskScoreCalculated(
  tier: RiskTierLabel,
  mode: ScoringMode
): Promise<void> {
  await trackEvent({
    name: 'Risk Score Calculated',
    props: {
      tier,
      mode,
    },
  });
}

/**
 * Tracks when a user connects a wallet.
 * No address is collected — only the connection method.
 *
 * @param method - e.g. "passkey", "freighter"
 */
export async function trackWalletConnected(method: string): Promise<void> {
  await trackEvent({
    name: 'Wallet Connected',
    props: { method },
  });
}

/**
 * Tracks when a user accesses a specific DeFi tier pool.
 * No wallet address is sent.
 *
 * @param tier - The tier accessed (TIER_1 / TIER_2 / TIER_3)
 */
export async function trackTierAccessed(tier: RiskTierLabel): Promise<void> {
  await trackEvent({
    name: 'Tier Accessed',
    props: { tier },
  });
}

/**
 * Tracks when a score is committed to the Soroban smart contract.
 * No wallet address or score value is included.
 *
 * @param success - Whether the on-chain write succeeded
 */
export async function trackScoreCommitted(success: boolean): Promise<void> {
  await trackEvent({
    name: 'Score Committed On-Chain',
    props: { success },
  });
}

/**
 * Convenience export object following the project's existing Validators/Sanitizers pattern.
 */
export const Analytics = {
  trackEvent,
  trackPageView,
  trackRiskScoreCalculated,
  trackWalletConnected,
  trackTierAccessed,
  trackScoreCommitted,
};

export default Analytics;
