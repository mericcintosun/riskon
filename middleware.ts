import { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./src/i18n/routing";

const CSRF_COOKIE_NAME = "riskon-csrf-token";
const CSRF_HEADER_NAME = "x-csrf-token";
const handleI18nRouting = createMiddleware(routing);

function isStateChangingMethod(method: string): boolean {
  return ["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase());
}

function isSameOriginRequest(request: NextRequest): boolean {
  const origin = request.headers.get("origin");

  if (!origin) {
    return true;
  }

  return origin === request.nextUrl.origin;
}

export function middleware(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith("/api")) {
    return handleI18nRouting(request);
  }

  const csrfCookie = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  const csrfHeader = request.headers.get(CSRF_HEADER_NAME);

  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { error: "Forbidden: invalid request origin" },
      { status: 403 }
    );
  }

  if (
    isStateChangingMethod(request.method) &&
    (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader)
  ) {
    return NextResponse.json(
      { error: "Forbidden: CSRF validation failed" },
      { status: 403 }
    );
  }

  const response = NextResponse.next();

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

  return response;
}

export const config = {
  matcher: ["/((?!_next|_vercel|.*\\..*).*)", "/api/:path*"],
};
