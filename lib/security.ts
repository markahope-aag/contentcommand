import { NextRequest, NextResponse } from "next/server";
import { clientEnv } from "@/lib/env";

/**
 * CSRF protection via Origin header verification.
 *
 * For state-changing requests (POST, PUT, PATCH, DELETE), verifies that
 * the Origin (or Referer) header matches the application's host.
 * This prevents cross-site request forgery from malicious third-party sites.
 *
 * Exemptions:
 * - GET/HEAD/OPTIONS requests (safe methods)
 * - /api/cron/* routes (authenticated via Bearer token, no browser origin)
 * - /auth/callback (OAuth redirect, no origin header)
 */
export function csrfCheck(request: NextRequest): NextResponse | null {
  const method = request.method.toUpperCase();

  // Safe methods don't need CSRF protection
  if (["GET", "HEAD", "OPTIONS"].includes(method)) {
    return null;
  }

  const pathname = request.nextUrl.pathname;

  // Exempt cron routes (authenticated via CRON_SECRET bearer token)
  if (pathname.startsWith("/api/cron/")) {
    return null;
  }

  // Exempt auth callback (OAuth redirects have no origin)
  if (pathname.startsWith("/auth/")) {
    return null;
  }

  // Only check API routes and server actions
  if (!pathname.startsWith("/api/")) {
    return null;
  }

  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const host = request.headers.get("host");

  if (!host) {
    return NextResponse.json(
      { error: "Missing host header" },
      { status: 400 }
    );
  }

  // Check Origin header first (preferred), fall back to Referer
  const sourceOrigin = origin ?? (referer ? new URL(referer).origin : null);

  if (!sourceOrigin) {
    // No Origin or Referer — reject (browsers always send Origin on cross-origin)
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  // Compare: origin must match the host
  const expectedOrigins = getAllowedOrigins(host);
  if (!expectedOrigins.some((allowed) => sourceOrigin === allowed)) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  return null;
}

function getAllowedOrigins(host: string): string[] {
  const origins: string[] = [];

  // Derive from host header
  if (host.startsWith("localhost") || host.startsWith("127.0.0.1")) {
    origins.push(`http://${host}`);
  } else {
    origins.push(`https://${host}`);
  }

  // Also allow configured app URL if set
  const appUrl = clientEnv().NEXT_PUBLIC_APP_URL;
  if (appUrl) {
    // Normalize: remove trailing slash
    origins.push(appUrl.replace(/\/$/, ""));
  }

  return origins;
}
