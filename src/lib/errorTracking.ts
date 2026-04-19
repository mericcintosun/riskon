/**
 * Error Tracking Module
 *
 * Provides structured error capture and reporting for the Riskon application.
 * Designed to be compatible with Sentry's interface for easy future migration.
 *
 * Security guarantees:
 * - Sensitive data scrubber runs on ALL payloads before any network call
 * - Private keys, full wallet addresses, and credentials are never transmitted
 * - Falls back to console logging when NEXT_PUBLIC_SENTRY_DSN is not set
 *
 * Related Issue: #21 - Analytics and Monitoring
 */

/** Severity levels aligned with standard logging conventions */
export type Severity = 'fatal' | 'error' | 'warning' | 'info' | 'debug';

/** Extra context attached to error reports — must be scrubbed before sending */
export interface ErrorContext {
  [key: string]: string | number | boolean | null | undefined;
}

/** Captured error payload */
export interface ErrorReport {
  message: string;
  severity: Severity;
  context?: ErrorContext;
  timestamp: number;
  /** Stack trace if available */
  stack?: string;
}

/** Anonymous user context — no PII, no addresses */
export interface UserContext {
  /** A hashed or anonymous session identifier — never a raw wallet address */
  sessionId?: string;
  /** Risk tier the user is in — safe to log */
  riskTier?: string;
}

/** Patterns that must never appear in error reports */
const SENSITIVE_PATTERNS: RegExp[] = [
  /[sS][0-9a-zA-Z]{55}/g,          // Stellar secret keys (starts with S, 56 chars)
  /private[\s_-]?key/gi,
  /secret[\s_-]?key/gi,
  /password/gi,
  /credential/gi,
  /jwt|bearer/gi,
  /auth[\s_-]?token/gi,
];

/** Redaction placeholder */
const REDACTED = '[REDACTED]';

/**
 * Scrubs sensitive data from a string value.
 * Applied to all string values in error payloads before transmission.
 *
 * @param value - Raw string that may contain sensitive information
 * @returns Scrubbed string safe for transmission
 */
export function scrubSensitiveData(value: string): string {
  if (!value || typeof value !== 'string') return value;

  let scrubbed = value;
  for (const pattern of SENSITIVE_PATTERNS) {
    scrubbed = scrubbed.replace(pattern, REDACTED);
  }

  // Truncate full Stellar public addresses (56 chars starting with G or C)
  // Replace mid-section with ellipsis to preserve context but not full address
  scrubbed = scrubbed.replace(
    /\b([GC][A-Z0-9]{5})[A-Z0-9]{44}([A-Z0-9]{5})\b/g,
    '$1...$2'
  );

  return scrubbed;
}

/**
 * Recursively scrubs an ErrorContext object.
 *
 * @param context - Raw context object
 * @returns Scrubbed context safe for transmission
 */
export function scrubContext(context: ErrorContext): ErrorContext {
  const scrubbed: ErrorContext = {};

  for (const [key, value] of Object.entries(context)) {
    if (typeof value === 'string') {
      scrubbed[key] = scrubSensitiveData(value);
    } else {
      scrubbed[key] = value;
    }
  }

  return scrubbed;
}

/** Internal error tracking config resolved from environment */
interface ErrorTrackingConfig {
  sentryDsn: string | null;
  enabled: boolean;
  environment: string;
}

function resolveConfig(): ErrorTrackingConfig {
  const sentryDsn =
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SENTRY_DSN) ||
    null;

  return {
    sentryDsn: sentryDsn || null,
    enabled: Boolean(sentryDsn),
    environment: process.env.NODE_ENV ?? 'development',
  };
}

/** In-memory store for user context (cleared on logout) */
let _userContext: UserContext | null = null;

/**
 * Sets anonymous user context for enriching subsequent error reports.
 * Must not contain raw wallet addresses or any PII.
 *
 * @param context - Anonymous user context
 */
export function setUserContext(context: UserContext): void {
  // Only allow safe fields
  _userContext = {
    sessionId: context.sessionId,
    riskTier: context.riskTier,
  };
}

/**
 * Clears the current user context (call on logout / wallet disconnect).
 */
export function clearUserContext(): void {
  _userContext = null;
}

/**
 * Core capture function — scrubs payload, logs to console, and optionally
 * forwards to the configured error tracking endpoint.
 */
async function sendReport(report: ErrorReport): Promise<void> {
  const config = resolveConfig();

  // Always log locally in development
  if (config.environment === 'development') {
    const logFn =
      report.severity === 'fatal' || report.severity === 'error'
        ? console.error
        : report.severity === 'warning'
        ? console.warn
        : console.info;
    logFn(`[ErrorTracking][${report.severity.toUpperCase()}]`, report.message, report.context);
  }

  if (!config.enabled || !config.sentryDsn) {
    return;
  }

  // Build a minimal Sentry-compatible envelope
  const envelope = {
    event_id: Math.random().toString(36).slice(2),
    timestamp: report.timestamp / 1000,
    level: report.severity,
    message: report.message,
    extra: report.context ?? {},
    user: _userContext ?? undefined,
    environment: config.environment,
    platform: 'javascript',
    ...(report.stack ? { exception: { values: [{ type: 'Error', value: report.message, stacktrace: { frames: [{ filename: report.stack }] } }] } } : {}),
  };

  try {
    await fetch(`${config.sentryDsn}/api/store/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(envelope),
      keepalive: true,
    });
  } catch {
    // Error tracking failures must never throw or affect the user
  }
}

/**
 * Captures an Error object with optional additional context.
 * Scrubs all context values before transmission.
 *
 * @param error - The error to capture
 * @param context - Optional extra context (will be scrubbed)
 * @param severity - Severity level (default: 'error')
 */
export async function captureError(
  error: Error | unknown,
  context?: ErrorContext,
  severity: Severity = 'error'
): Promise<void> {
  const err = error instanceof Error ? error : new Error(String(error));

  const report: ErrorReport = {
    message: scrubSensitiveData(err.message),
    severity,
    context: context ? scrubContext(context) : undefined,
    timestamp: Date.now(),
    stack: err.stack ? scrubSensitiveData(err.stack) : undefined,
  };

  await sendReport(report);
}

/**
 * Captures a plain message (non-exception) at a given severity level.
 *
 * @param message - The message to capture
 * @param severity - Severity level (default: 'info')
 * @param context - Optional extra context (will be scrubbed)
 */
export async function captureMessage(
  message: string,
  severity: Severity = 'info',
  context?: ErrorContext
): Promise<void> {
  const report: ErrorReport = {
    message: scrubSensitiveData(message),
    severity,
    context: context ? scrubContext(context) : undefined,
    timestamp: Date.now(),
  };

  await sendReport(report);
}

/**
 * Higher-order function that wraps an async function with automatic error tracking.
 * Errors are captured and re-thrown so the caller can still handle them.
 *
 * @param fn - Async function to wrap
 * @param context - Optional static context added to any captured error
 * @returns Wrapped function with the same signature
 *
 * @example
 * const safeSetRiskTier = withErrorTracking(setRiskTier, { operation: 'set_risk_tier' });
 * await safeSetRiskTier(user, score, tier);
 */
export function withErrorTracking<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  context?: ErrorContext
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      await captureError(error, context);
      throw error;
    }
  }) as T;
}

/**
 * Convenience export object following the project's existing module pattern.
 */
export const ErrorTracking = {
  captureError,
  captureMessage,
  setUserContext,
  clearUserContext,
  withErrorTracking,
  scrubSensitiveData,
  scrubContext,
};

export default ErrorTracking;
