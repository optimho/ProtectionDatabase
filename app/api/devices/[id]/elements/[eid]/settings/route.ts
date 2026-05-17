import { NextResponse } from "next/server";
import { getSession, unauthorized, notFound, badRequest } from "@/lib/session";
import { getElement, listSettings, createSetting } from "@/lib/elements";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; eid: string }> }
) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { eid } = await params;
  if (!await getElement(eid)) return notFound();

  return NextResponse.json(await listSettings(eid));
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; eid: string }> }
) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { eid } = await params;
  if (!await getElement(eid)) return notFound();

  const body = await req.json();
  if (!body.setting_name?.trim()) return badRequest("setting_name is required");

  const setting = await createSetting(eid, {
    setting_name: body.setting_name.trim(),
    custom_name: body.custom_name?.trim() ?? "",
    description: body.description?.trim() ?? "",
    value: body.value?.trim() ?? "",
    unit: body.unit?.trim() ?? "",
    sort_order: body.sort_order ?? 0,
  });
  return NextResponse.json(setting, { status: 201 });
}
