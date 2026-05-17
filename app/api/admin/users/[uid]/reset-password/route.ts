import { NextResponse } from "next/server";
import { getSession, unauthorized, forbidden, notFound, badRequest } from "@/lib/session";
import { get, run } from "@/lib/db";

export const dynamic = "force-dynamic";

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

export async function POST(
  req: Request,
  { params }: { params: Promise<{ uid: string }> }
) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!isAdmin(session)) return forbidden();

  const { uid } = await params;
  const user = await get<{ id: string }>("SELECT id FROM user WHERE id = ?", [uid]);
  if (!user) return notFound();

  const body = await req.json();
  if (!body.password || body.password.length < 6) return badRequest("Password must be at least 6 characters");

  const hash = await hashPassword(body.password);
  await run(
    "UPDATE account SET password = ? WHERE userId = ? AND providerId = 'credential'",
    [hash, uid]
  );
  return NextResponse.json({ ok: true });
}
