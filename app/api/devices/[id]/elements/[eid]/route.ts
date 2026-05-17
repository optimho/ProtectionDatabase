import { NextResponse } from "next/server";
import { getSession, unauthorized, notFound } from "@/lib/session";
import { getElement, updateElement, deleteElement } from "@/lib/elements";

export const dynamic = "force-dynamic";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; eid: string }> }
) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { eid } = await params;
  if (!await getElement(eid)) return notFound();

  const body = await req.json();
  await updateElement(eid, {
    ansi_id: body.ansi_id,
    custom_name: body.custom_name,
    description: body.description,
    enabled: body.enabled !== undefined ? (body.enabled ? 1 : 0) : undefined,
    sort_order: body.sort_order,
  });
  return NextResponse.json(await getElement(eid));
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; eid: string }> }
) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { eid } = await params;
  if (!await getElement(eid)) return notFound();

  await deleteElement(eid);
  return NextResponse.json({ ok: true });
}
