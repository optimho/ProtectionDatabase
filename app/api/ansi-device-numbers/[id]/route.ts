import { NextResponse } from "next/server";
import { getSession, unauthorized, forbidden, notFound } from "@/lib/session";
import { getAnsiCode, updateAnsiCode, deleteAnsiCode } from "@/lib/ansi";

export const dynamic = "force-dynamic";

function isAdmin(session: Awaited<ReturnType<typeof getSession>>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (session?.user as any)?.role === "admin";
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!isAdmin(session)) return forbidden();

  const { id } = await params;
  const existing = await getAnsiCode(id);
  if (!existing) return notFound();

  const body = await req.json();
  await updateAnsiCode(id, {
    device_number: body.device_number?.trim(),
    common_name: body.common_name?.trim(),
    description: body.description?.trim(),
  });
  return NextResponse.json(await getAnsiCode(id));
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!isAdmin(session)) return forbidden();

  const { id } = await params;
  const existing = await getAnsiCode(id);
  if (!existing) return notFound();

  await deleteAnsiCode(id);
  return NextResponse.json({ ok: true });
}
