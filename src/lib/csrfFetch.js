"use client";

/**
 * fetch() wrapper that satisfies the double-submit CSRF check in middleware.ts.
 *
 * The middleware issues a non-httpOnly `riskon-csrf-token` cookie on any /api
 * request and then requires state-changing calls (POST/PUT/PATCH/DELETE) to echo
 * it back in the `x-csrf-token` header. Plain fetch() gets a 403.
 */

const CSRF_COOKIE_NAME = "riskon-csrf-token";

function readCsrfToken() {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${CSRF_COOKIE_NAME}=([^;]+)`)
  );
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Return the current CSRF token, priming it with a safe GET if the cookie has
 * not been issued yet.
 */
async function ensureCsrfToken() {
  const existing = readCsrfToken();
  if (existing) return existing;

  // A GET to /api/* makes the middleware mint the cookie.
  try {
    await fetch("/api/health", {
      method: "GET",
      credentials: "same-origin",
    });
  } catch {
    // Network failure is surfaced by the real request below.
  }

  return readCsrfToken();
}

/**
 * Same-origin fetch with the CSRF header attached.
 * @param {string} url
 * @param {RequestInit} [options]
 */
export async function csrfFetch(url, options = {}) {
  const token = await ensureCsrfToken();

  const headers = { ...(options.headers || {}) };
  if (token) headers["x-csrf-token"] = token;

  return fetch(url, {
    ...options,
    headers,
    credentials: "same-origin",
  });
}

export { CSRF_COOKIE_NAME, readCsrfToken };
