import { NextResponse } from "next/server";
import { getSession, unauthorized, forbidden, notFound, badRequest } from "@/lib/session";
import { get, run } from "@/lib/db";

export const dynamic = "force-dynamic";

function isAdmin(session: Awaited<ReturnType<typeof getSession>>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (session?.user as any)?.role === "admin";
}

export async function PUT(
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
  const fields: string[] = [];
  const values: unknown[] = [];

  if (body.name?.trim()) { fields.push("name = ?"); values.push(body.name.trim()); }
  if (body.role === "admin" || body.role === "user") { fields.push("role = ?"); values.push(body.role); }

  if (fields.length === 0) return badRequest("No valid fields to update");

  values.push(uid);
  await run(`UPDATE user SET ${fields.join(", ")} WHERE id = ?`, values);
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ uid: string }> }
) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!isAdmin(session)) return forbidden();

  const { uid } = await params;

  // Prevent deleting yourself
  if (uid === session.user.id) return badRequest("You cannot delete your own account");

  const user = await get<{ id: string }>("SELECT id FROM user WHERE id = ?", [uid]);
  if (!user) return notFound();

  await run("DELETE FROM user WHERE id = ?", [uid]);
  return NextResponse.json({ ok: true });
}
