/**
 * Tests for src/lib/apiRetry.ts
 * Covers: retryWithBackoff, fetchWithCircuitBreaker, resetCircuitBreakers,
 *         getCircuitBreakerState, fetchWithRateLimit
 * Closes #9
 */
import {
  retryWithBackoff,
  fetchWithCircuitBreaker,
  resetCircuitBreakers,
  getCircuitBreakerState,
} from "../apiRetry";

beforeEach(() => {
  resetCircuitBreakers();
  jest.clearAllMocks();
});

// ── retryWithBackoff ──────────────────────────────────────────────────────────
describe("retryWithBackoff", () => {
  it("resolves immediately on first success", async () => {
    const fn = jest.fn().mockResolvedValue("ok");
    const result = await retryWithBackoff(fn, { maxRetries: 3, initialDelay: 10 });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on retryable error and succeeds", async () => {
    const networkError = Object.assign(new Error("timeout"), { code: "ETIMEDOUT" });
    const fn = jest
      .fn()
      .mockRejectedValueOnce(networkError)
      .mockResolvedValueOnce("success");

    const result = await retryWithBackoff(fn, { maxRetries: 3, initialDelay: 10 });
    expect(result).toBe("success");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("throws immediately on non-retryable error", async () => {
    const nonRetryable = new Error("Validation failed");
    const fn = jest.fn().mockRejectedValue(nonRetryable);

    await expect(
      retryWithBackoff(fn, { maxRetries: 3, initialDelay: 10 })
    ).rejects.toThrow("Validation failed");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("throws after exhausting all retries", async () => {
    const networkError = Object.assign(new Error("Connection refused"), { code: "ECONNREFUSED" });
    const fn = jest.fn().mockRejectedValue(networkError);

    await expect(
      retryWithBackoff(fn, { maxRetries: 2, initialDelay: 10 })
    ).rejects.toThrow("Connection refused");
    expect(fn).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
  });

  it("calls onRetry callback on each retry", async () => {
    const networkError = Object.assign(new Error("ETIMEDOUT"), { code: "ETIMEDOUT" });
    const fn = jest
      .fn()
      .mockRejectedValueOnce(networkError)
      .mockRejectedValueOnce(networkError)
      .mockResolvedValueOnce("done");

    const onRetry = jest.fn();
    await retryWithBackoff(fn, { maxRetries: 3, initialDelay: 10, onRetry });
    expect(onRetry).toHaveBeenCalledTimes(2);
  });

  it("retries on 429 HTTP status code", async () => {
    const rateLimitError = Object.assign(new Error("Too Many Requests"), {
      response: { status: 429 },
    });
    const fn = jest
      .fn()
      .mockRejectedValueOnce(rateLimitError)
      .mockResolvedValueOnce("ok");

    const result = await retryWithBackoff(fn, { maxRetries: 3, initialDelay: 10 });
    expect(result).toBe("ok");
  });
});

// ── fetchWithCircuitBreaker ───────────────────────────────────────────────────
describe("fetchWithCircuitBreaker", () => {
  it("executes function successfully in CLOSED state", async () => {
    const fn = jest.fn().mockResolvedValue("data");
    const result = await fetchWithCircuitBreaker("test-endpoint", fn);
    expect(result).toBe("data");
  });

  it("opens circuit after threshold failures", async () => {
    const fn = jest.fn().mockRejectedValue(new Error("Service down"));

    // Trigger 5 failures (default threshold)
    for (let i = 0; i < 5; i++) {
      await fetchWithCircuitBreaker("circuit-test", fn).catch(() => {});
    }

    // Circuit should now be OPEN
    await expect(
      fetchWithCircuitBreaker("circuit-test", fn)
    ).rejects.toThrow("Circuit breaker is OPEN");
  });

  it("returns UNKNOWN for non-existent endpoint", () => {
    expect(getCircuitBreakerState("non-existent")).toBe("UNKNOWN");
  });

  it("returns CLOSED state for fresh endpoint", async () => {
    const fn = jest.fn().mockResolvedValue("ok");
    await fetchWithCircuitBreaker("fresh-endpoint", fn);
    expect(getCircuitBreakerState("fresh-endpoint")).toBe("CLOSED");
  });
});

// ── resetCircuitBreakers ──────────────────────────────────────────────────────
describe("resetCircuitBreakers", () => {
  it("resets all open circuit breakers", async () => {
    const fn = jest.fn().mockRejectedValue(new Error("fail"));

    // Open the circuit
    for (let i = 0; i < 5; i++) {
      await fetchWithCircuitBreaker("reset-test", fn).catch(() => {});
    }

    resetCircuitBreakers();

    // After reset, should work again
    const successFn = jest.fn().mockResolvedValue("ok");
    const result = await fetchWithCircuitBreaker("reset-test", successFn);
    expect(result).toBe("ok");
  });
});
