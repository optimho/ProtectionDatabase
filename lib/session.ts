/**
 * lib/session.ts — Session retrieval and standard HTTP error helpers
 *
 * Every API route handler starts by calling getSession() and checking the
 * result. The pattern is:
 *
 *   const session = await getSession();
 *   if (!session) return unauthorized();
 *   if (session.user.role !== "admin") return forbidden();
 *
 * The helper functions return pre-built Response objects so callers can
 * `return forbidden()` directly without constructing the response inline.
 */

import { auth } from "./auth";
import { headers } from "next/headers";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: string;   // "user" | "admin"
}

export interface AppSession {
  user: SessionUser;
  session: { id: string };
}

/**
 * Retrieve the current session from the request headers.
 * Returns null if the user is not signed in or the session has expired.
 * Must be called server-side (route handlers, server components).
 */
export async function getSession(): Promise<AppSession | null> {
  return auth.api.getSession({ headers: await headers() }) as Promise<AppSession | null>;
}

// ── Standard HTTP error responses ──────────────────────────────────────────

/** 401 — No session cookie / not signed in. */
export function unauthorized() {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

/** 403 — Signed in but insufficient role (e.g. non-admin on admin route). */
export function forbidden() {
  return Response.json({ error: "Forbidden" }, { status: 403 });
}

/** 404 — Record not found in the database. */
export function notFound() {
  return Response.json({ error: "Not found" }, { status: 404 });
}

/** 400 — Invalid request body or missing required field. */
export function badRequest(msg: string) {
  return Response.json({ error: msg }, { status: 400 });
}
