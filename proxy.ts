/**
 * middleware.ts — Next.js edge middleware
 *
 * Runs before every request that matches the paths in `config.matcher`.
 * Provides two layers of protection:
 *
 *   1. Rate limiting on auth endpoints (sign-in, sign-up) — prevents brute
 *      force attacks. In-memory map keyed by IP; resets after 15 minutes.
 *      NOTE: This is per-process, so it resets on server restart and doesn't
 *      coordinate across multiple processes. It's a reasonable first line of
 *      defence for a single-server Raspberry Pi deployment.
 *
 *   2. Cookie presence check — a fast pre-filter that rejects requests with
 *      no session cookie before they reach route handlers. This is NOT a full
 *      auth check — the actual session validation (signature, expiry) happens
 *      in each route handler via getSession(). The cookie check here just
 *      avoids wasting a database query on clearly unauthenticated requests.
 *      Unauthenticated API calls get 401; unauthenticated page visits are
 *      redirected to the login page.
 */

import { NextRequest, NextResponse } from "next/server";

const WINDOW_MS = 15 * 60 * 1000; // 15-minute sliding window
const MAX_REQUESTS = 10;           // max sign-in/sign-up attempts per window

// In-memory rate limit store: IP → { count, resetAt }
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  // Prune expired entries to avoid unbounded memory growth
  for (const [key, val] of rateLimitMap) {
    if (now > val.resetAt) rateLimitMap.delete(key);
  }
  const entry = rateLimitMap.get(ip);
  if (!entry) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > MAX_REQUESTS;
}

// All pages under (protected)/ that require a session cookie
const PROTECTED_PAGES = [
  "/dashboard",
  "/devices",
  "/reports",
  "/analytics",
  "/ansi-device-numbers",
  "/parts",
  "/form-templates",
  "/users",
  "/admin",
  "/upload",
];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── Rate limit auth endpoints ───────────────────────────────────────────
  if (pathname.startsWith("/api/auth/sign-in") || pathname.startsWith("/api/auth/sign-up")) {
    const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown";
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
  }

  const cookie = req.headers.get("cookie") ?? "";
  const hasSession =
    cookie.includes("better-auth.session_token") ||
    cookie.includes("__Secure-better-auth.session_token");

  // ── Protect API routes ──────────────────────────────────────────────────
  // Skip /api/auth/* — those are the auth endpoints themselves
  if (pathname.startsWith("/api/") && !pathname.startsWith("/api/auth/")) {
    if (!hasSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // ── Protect page routes — redirect to login ─────────────────────────────
  const isProtectedPage = PROTECTED_PAGES.some((p) => pathname.startsWith(p));
  if (isProtectedPage && !hasSession) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/";
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/devices/:path*",
    "/reports/:path*",
    "/analytics/:path*",
    "/ansi-device-numbers/:path*",
    "/parts/:path*",
    "/form-templates/:path*",
    "/users/:path*",
    "/admin/:path*",
    "/upload/:path*",
    "/api/:path*",
  ],
};
