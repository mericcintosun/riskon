/**
 * API Rate Limiting and Retry Mechanism
 *
 * This module implements exponential backoff retry logic for API calls,
 * handles rate limiting gracefully, and includes circuit breaker pattern
 * to prevent cascading failures.
 *
 * Related Issue: #12 - API Rate Limiting and Retry Mechanism
 */

/**
 * Retry configuration options
 */
export interface RetryOptions {
  maxRetries?: number; // Maximum number of retry attempts (default: 3)
  initialDelay?: number; // Initial delay in ms (default: 1000)
  maxDelay?: number; // Maximum delay in ms (default: 30000)
  backoffMultiplier?: number; // Multiplier for exponential backoff (default: 2)
  retryableStatusCodes?: number[]; // HTTP status codes that should trigger retry
  timeout?: number; // Request timeout in ms (default: 30000)
  onRetry?: (attempt: number, delay: number, error: any) => void; // Callback on retry
}

/**
 * Circuit breaker configuration
 */
interface CircuitBreakerConfig {
  failureThreshold: number; // Number of failures before opening circuit
  successThreshold: number; // Number of successes before closing circuit
  timeout: number; // Time in ms before attempting to close circuit
}

/**
 * Circuit breaker states
 */
enum CircuitState {
  CLOSED = "CLOSED", // Normal operation
  OPEN = "OPEN", // Circuit is open, rejecting requests
  HALF_OPEN = "HALF_OPEN", // Testing if service recovered
}

/**
 * Circuit breaker implementation
 */
class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime: number = 0;
  private config: CircuitBreakerConfig;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = {
      failureThreshold: config.failureThreshold ?? 5,
      successThreshold: config.successThreshold ?? 2,
      timeout: config.timeout ?? 60000, // 1 minute
    };
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() - this.lastFailureTime > this.config.timeout) {
        this.state = CircuitState.HALF_OPEN;
        this.successCount = 0;
      } else {
        throw new Error("Circuit breaker is OPEN. Service is temporarily unavailable.");
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.state = CircuitState.CLOSED;
      }
    }
  }

  private onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = CircuitState.OPEN;
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  reset() {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
  }
}

/**
 * Rate limiter using token bucket algorithm
 */
class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private capacity: number;
  private refillRate: number;

  constructor(capacity: number = 100, refillRate: number = 10) {
    this.capacity = capacity;
    this.refillRate = refillRate; // tokens per second
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  async acquire(): Promise<void> {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }

    // Wait until a token is available
    const waitTime = (1 / this.refillRate) * 1000;
    await this.sleep(waitTime);
    return this.acquire();
  }

  private refill() {
    const now = Date.now();
    const timePassed = (now - this.lastRefill) / 1000;
    const tokensToAdd = timePassed * this.refillRate;

    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Default retry options
 */
const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  timeout: 30000,
};

/**
 * Calculates the delay for the next retry attempt using exponential backoff
 * @param attempt - Current attempt number (starting from 0)
 * @param options - Retry options
 * @returns Delay in milliseconds
 */
function calculateDelay(attempt: number, options: RetryOptions): number {
  const delay = options.initialDelay! * Math.pow(options.backoffMultiplier!, attempt);
  // Add jitter to prevent thundering herd
  const jitter = Math.random() * 1000;
  return Math.min(delay + jitter, options.maxDelay!);
}

/**
 * Checks if an error is retryable
 * @param error - The error to check
 * @param options - Retry options
 * @returns True if the error should trigger a retry
 */
function isRetryableError(error: any, options: RetryOptions): boolean {
  // Network errors are always retryable
  if (error.code === "ECONNREFUSED" || error.code === "ETIMEDOUT" || error.code === "ENOTFOUND") {
    return true;
  }

  // Check HTTP status codes
  if (error.response?.status) {
    return options.retryableStatusCodes!.includes(error.response.status);
  }

  // Check for rate limit errors
  if (error.message?.toLowerCase().includes("rate limit")) {
    return true;
  }

  return false;
}

/**
 * Sleeps for the specified duration
 * @param ms - Duration in milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retries an async function with exponential backoff
 *
 * @param fn - The async function to retry
 * @param options - Retry configuration options
 * @returns Promise that resolves with the function result or rejects after all retries
 *
 * @example
 * const data = await retryWithBackoff(
 *   () => fetch('https://api.example.com/data'),
 *   { maxRetries: 5, initialDelay: 2000 }
 * );
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: any;

  for (let attempt = 0; attempt <= opts.maxRetries!; attempt++) {
    try {
      const result = await fn();
      return result;
    } catch (error) {
      lastError = error;

      if (attempt === opts.maxRetries) {
        throw error;
      }

      if (!isRetryableError(error, opts)) {
        throw error;
      }

      const delay = calculateDelay(attempt, opts);

      if (opts.onRetry) {
        opts.onRetry(attempt + 1, delay, error);
      }

      console.warn(
        `Request failed (attempt ${attempt + 1}/${opts.maxRetries! + 1}). Retrying in ${delay}ms...`,
        error.message || error
      );

      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Creates a fetch wrapper with retry logic
 *
 * @param url - URL to fetch
 * @param init - Fetch options
 * @param retryOptions - Retry configuration
 * @returns Promise that resolves with the Response
 *
 * @example
 * const response = await fetchWithRetry('https://api.example.com/data', {
 *   method: 'GET',
 *   headers: { 'Authorization': 'Bearer token' }
 * });
 */
export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  retryOptions?: RetryOptions
): Promise<Response> {
  return retryWithBackoff(async () => {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      retryOptions?.timeout || DEFAULT_RETRY_OPTIONS.timeout!
    );

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      });

      if (!response.ok) {
        const error: any = new Error(`HTTP ${response.status}: ${response.statusText}`);
        error.response = response;
        throw error;
      }

      return response;
    } finally {
      clearTimeout(timeout);
    }
  }, retryOptions);
}

/**
 * Global circuit breakers for different API endpoints
 */
const circuitBreakers: Map<string, CircuitBreaker> = new Map();

/**
 * Gets or creates a circuit breaker for an endpoint
 */
function getCircuitBreaker(endpoint: string): CircuitBreaker {
  if (!circuitBreakers.has(endpoint)) {
    circuitBreakers.set(endpoint, new CircuitBreaker());
  }
  return circuitBreakers.get(endpoint)!;
}

/**
 * Fetches data with circuit breaker protection
 *
 * @param endpoint - API endpoint identifier
 * @param fn - Function to execute
 * @returns Promise that resolves with the function result
 */
export async function fetchWithCircuitBreaker<T>(
  endpoint: string,
  fn: () => Promise<T>
): Promise<T> {
  const breaker = getCircuitBreaker(endpoint);
  return breaker.execute(fn);
}

/**
 * Global rate limiter for API requests
 */
const rateLimiter = new RateLimiter(100, 10); // 100 requests capacity, 10 per second

/**
 * Fetches data with rate limiting
 *
 * @param fn - Function to execute
 * @returns Promise that resolves with the function result
 */
export async function fetchWithRateLimit<T>(fn: () => Promise<T>): Promise<T> {
  await rateLimiter.acquire();
  return fn();
}

/**
 * Comprehensive fetch with retry, circuit breaker, and rate limiting
 *
 * @param url - URL to fetch
 * @param init - Fetch options
 * @param options - Retry and endpoint configuration
 * @returns Promise that resolves with the Response
 *
 * @example
 * const response = await fetchWithProtection(
 *   'https://horizon-testnet.stellar.org/accounts/GABC...',
 *   { method: 'GET' },
 *   { endpoint: 'horizon', maxRetries: 5 }
 * );
 */
export async function fetchWithProtection(
  url: string,
  init?: RequestInit,
  options: RetryOptions & { endpoint?: string } = {}
): Promise<Response> {
  const endpoint = options.endpoint || new URL(url).hostname;

  return fetchWithCircuitBreaker(endpoint, async () => {
    return fetchWithRateLimit(async () => {
      return fetchWithRetry(url, init, options);
    });
  });
}

/**
 * Resets all circuit breakers
 * Useful for testing or manual recovery
 */
export function resetCircuitBreakers(): void {
  circuitBreakers.forEach((breaker) => breaker.reset());
}

/**
 * Gets the state of a circuit breaker
 */
export function getCircuitBreakerState(endpoint: string): string {
  const breaker = circuitBreakers.get(endpoint);
  return breaker ? breaker.getState() : "UNKNOWN";
}

/**
 * Exports for convenience
 */
export const ApiRetry = {
  retryWithBackoff,
  fetchWithRetry,
  fetchWithCircuitBreaker,
  fetchWithRateLimit,
  fetchWithProtection,
  resetCircuitBreakers,
  getCircuitBreakerState,
};
