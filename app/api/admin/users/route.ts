import { NextResponse } from "next/server";
import { getSession, unauthorized, forbidden, badRequest } from "@/lib/session";
import { query, get, run } from "@/lib/db";
import { nanoid } from "nanoid";

export const dynamic = "force-dynamic";

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  emailVerified: number;
  createdAt: string;
}

function isAdmin(session: Awaited<ReturnType<typeof getSession>>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (session?.user as any)?.role === "admin";
}

async function hashPassword(password: string): Promise<string> {
  const { scryptAsync } = await import("@noble/hashes/scrypt.js");
  const config = { N: 16384, r: 16, p: 1, dkLen: 64 };
  const saltBytes = new Uint8Array(16);
  crypto.getRandomValues(saltBytes);
  const salt = Array.from(saltBytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  const key = await scryptAsync(password.normalize("NFKC"), salt, {
    N: config.N, r: config.r, p: config.p, dkLen: config.dkLen,
    maxmem: 128 * config.N * config.r * 2,
  });
  const keyHex = Array.from(key as Uint8Array).map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${salt}:${keyHex}`;
}

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!isAdmin(session)) return forbidden();

  const users = await query<UserRow>(
    "SELECT id, name, email, role, emailVerified, createdAt FROM user ORDER BY createdAt"
  );
  return NextResponse.json(users);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!isAdmin(session)) return forbidden();

  const body = await req.json();
  if (!body.name?.trim()) return badRequest("name is required");
  if (!body.email?.trim()) return badRequest("email is required");
  if (!body.password || body.password.length < 6) return badRequest("password must be at least 6 characters");

  const existing = await get<UserRow>("SELECT id FROM user WHERE email = ?", [body.email.trim()]);
  if (existing) return badRequest("A user with that email already exists");

  const id = nanoid();
  const accountId = nanoid();
  const hash = await hashPassword(body.password);
  const role = body.role === "admin" ? "admin" : "user";

  await run(
    "INSERT INTO user (id, name, email, emailVerified, role) VALUES (?, ?, ?, 1, ?)",
    [id, body.name.trim(), body.email.trim(), role]
  );
  await run(
    "INSERT INTO account (id, accountId, providerId, userId, password) VALUES (?, ?, 'credential', ?, ?)",
    [accountId, accountId, id, hash]
  );

  return NextResponse.json({ id, name: body.name.trim(), email: body.email.trim(), role }, { status: 201 });
}
