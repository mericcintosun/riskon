# Security Hardening (Issue #24)

This document tracks security controls implemented in Riskon and the operational checks to keep them effective.

## 1) Dependency Security Checks

Run these commands regularly (CI and local):

```bash
npm audit
npm audit fix
npm audit fix --omit=dev
```

Recommended process:

1. Run `npm audit` and review severity.
2. Apply only non-breaking updates first with `npm audit fix`.
3. Re-test app behavior (`npm run build`, core flows).
4. Use major-version upgrades only with explicit regression testing.

> Note: In this implementation pass, runtime hardening was completed in code. Dependency updates should be executed in your environment where lockfile updates can be reviewed and committed.

## 2) Security Headers and CSP

Global security headers are defined in `next.config.mjs`:

- `Content-Security-Policy`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`

CSP is configured with:

- strict defaults (`default-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`)
- explicit `connect-src` for Stellar endpoints
- production-safe script policy (only dev allows `unsafe-eval`)

## 3) CSRF Protection for API Routes

`middleware.ts` enforces CSRF for all `/api/*` routes:

- validates same-origin requests via `Origin`
- blocks state-changing methods (`POST`, `PUT`, `PATCH`, `DELETE`) unless:
  - `riskon-csrf-token` cookie exists, and
  - `x-csrf-token` header matches cookie value
- issues CSRF cookie when absent

This provides baseline protection for current and future API route handlers.

## 4) XSS Protection

Input sanitization and safe text escaping are enforced via `src/lib/validation.ts`:

- `sanitizeString()`
- `escapeUnsafeHtml()`

Wallet and passkey flows now sanitize and validate user-controlled values before:

- state updates
- rendering-bound values
- local storage persistence

## 5) Secure Storage Practices

A guarded storage utility is implemented in `src/lib/secureStorage.js`:

- centralizes localStorage access
- blocks writes to sensitive key names (token/jwt/secret/auth/password/session/cookie/credential)
- keeps only non-sensitive metadata in localStorage

For sensitive auth/session values, use server-set httpOnly cookies.

A helper is provided in `src/lib/security/httpOnlyCookies.ts`:

- `setHttpOnlyCookie()`
- strict defaults: `httpOnly`, `sameSite=strict`, `secure` in production

## 6) Implementation Checklist

- [x] Security headers in Next.js config
- [x] CSP configuration added
- [x] CSRF middleware for API paths
- [x] XSS sanitization utilities and usage
- [x] LocalStorage hardening for sensitive keys
- [x] Guidance and helper for httpOnly cookies

## 7) Ongoing Best Practices

- Keep dependencies current and audit regularly.
- Prefer server-side session handling with httpOnly cookies.
- Avoid `dangerouslySetInnerHTML` unless sanitization is strict and reviewed.
- Keep CSP tight and only loosen directives when functionally required.
- Log and monitor blocked CSRF/XSS/storage events in production telemetry.
