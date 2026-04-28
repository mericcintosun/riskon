import { NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n/config';

const CSRF_COOKIE_NAME = "riskon-csrf-token";
const CSRF_HEADER_NAME = "x-csrf-token";
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100;

// Create the internationalization middleware
const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed'
});

// Simple in-memory rate limiting (in production, use Redis or similar)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function isStateChangingMethod(method: string): boolean {
  return ["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase());
}

function isSameOriginRequest(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  if (!origin && !referer) {
    return true; // Allow same-origin requests without origin header
  }

  const requestOrigin = origin || referer;
  if (!requestOrigin) {
    return false;
  }

  return requestOrigin.startsWith(request.nextUrl.origin);
}

function getClientIdentifier(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const ip = forwardedFor?.split(",")[0]?.trim() || realIp || "unknown";
  return ip;
}

function checkRateLimit(clientId: string): { allowed: boolean; resetTime?: number; remaining?: number } {
  const now = Date.now();
  const existing = rateLimitMap.get(clientId);

  if (!existing || now > existing.resetTime) {
    // Reset or create new rate limit entry
    rateLimitMap.set(clientId, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    });
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1 };
  }

  if (existing.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { 
      allowed: false, 
      resetTime: existing.resetTime,
      remaining: 0 
    };
  }

  existing.count++;
  return { 
    allowed: true, 
    remaining: RATE_LIMIT_MAX_REQUESTS - existing.count 
  };
}

function validateCsrfToken(csrfCookie: string | undefined, csrfHeader: string | undefined): boolean {
  if (!csrfCookie || !csrfHeader) {
    return false;
  }
  
  // Validate token format (UUID)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(csrfCookie) || !uuidRegex.test(csrfHeader)) {
    return false;
  }
  
  return csrfCookie === csrfHeader;
}

export function middleware(request: NextRequest) {
  // Apply internationalization middleware first for non-API routes
  if (!request.nextUrl.pathname.startsWith("/api")) {
    return intlMiddleware(request);
  }

  const clientId = getClientIdentifier(request);
  const rateLimitResult = checkRateLimit(clientId);

  // Rate limiting
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { 
        error: "Too Many Requests: Rate limit exceeded",
        retryAfter: Math.ceil((rateLimitResult.resetTime! - Date.now()) / 1000)
      },
      { 
        status: 429,
        headers: {
          'Retry-After': Math.ceil((rateLimitResult.resetTime! - Date.now()) / 1000).toString(),
          'X-RateLimit-Limit': RATE_LIMIT_MAX_REQUESTS.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(rateLimitResult.resetTime!).toISOString(),
        }
      }
    );
  }

  const csrfCookie = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  const csrfHeader = request.headers.get(CSRF_HEADER_NAME);

  // Same-origin validation
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { error: "Forbidden: invalid request origin" },
      { status: 403 }
    );
  }

  // CSRF validation for state-changing methods
  if (
    isStateChangingMethod(request.method) &&
    !validateCsrfToken(csrfCookie || undefined, csrfHeader || undefined)
  ) {
    return NextResponse.json(
      { error: "Forbidden: CSRF validation failed" },
      { status: 403 }
    );
  }

  const response = NextResponse.next();

  // Set CSRF cookie if not present
  if (!csrfCookie) {
    const token = crypto.randomUUID();
    response.cookies.set(CSRF_COOKIE_NAME, token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60,
    });
  }

  // Add rate limiting headers
  response.headers.set('X-RateLimit-Limit', RATE_LIMIT_MAX_REQUESTS.toString());
  response.headers.set('X-RateLimit-Remaining', (rateLimitResult.remaining || 0).toString());
  response.headers.set('X-RateLimit-Reset', new Date(Date.now() + RATE_LIMIT_WINDOW).toISOString());

  // Additional security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');

  return response;
}

export const config = {
  matcher: ["/api/:path*"],
};
