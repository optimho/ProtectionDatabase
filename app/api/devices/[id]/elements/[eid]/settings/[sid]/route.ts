import { NextResponse } from "next/server";
import { getSession, unauthorized, notFound } from "@/lib/session";
import { getSetting, updateSetting, deleteSetting } from "@/lib/elements";

export const dynamic = "force-dynamic";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; eid: string; sid: string }> }
) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { sid } = await params;
  if (!await getSetting(sid)) return notFound();

  const body = await req.json();
  await updateSetting(sid, {
    setting_name: body.setting_name,
    custom_name: body.custom_name,
    description: body.description,
    value: body.value,
    unit: body.unit,
    sort_order: body.sort_order,
  });
  return NextResponse.json(await getSetting(sid));
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; eid: string; sid: string }> }
) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { sid } = await params;
  if (!await getSetting(sid)) return notFound();

  await deleteSetting(sid);
  return NextResponse.json({ ok: true });
}
