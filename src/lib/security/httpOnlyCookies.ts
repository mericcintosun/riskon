import { NextResponse } from "next/server";

export const DEFAULT_HTTP_ONLY_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
};

export function setHttpOnlyCookie(
  response: NextResponse,
  name: string,
  value: string,
  maxAgeSeconds: number
): NextResponse {
  response.cookies.set(name, value, {
    ...DEFAULT_HTTP_ONLY_COOKIE_OPTIONS,
    maxAge: maxAgeSeconds,
  });

  return response;
}
