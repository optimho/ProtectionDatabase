import { NextResponse } from "next/server";
import { getSession, unauthorized, notFound, badRequest } from "@/lib/session";
import { getDevice } from "@/lib/devices";
import { listElements, createElement } from "@/lib/elements";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { id } = await params;
  if (!await getDevice(id)) return notFound();

  return NextResponse.json(await listElements(id));
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { id } = await params;
  if (!await getDevice(id)) return notFound();

  const body = await req.json();
  if (!body.ansi_id && !body.custom_name?.trim()) {
    return badRequest("Either ansi_id or custom_name is required");
  }

  const element = await createElement(id, {
    ansi_id: body.ansi_id || undefined,
    custom_name: body.custom_name?.trim() ?? "",
    description: body.description?.trim() ?? "",
    sort_order: body.sort_order ?? 0,
  });
  return NextResponse.json(element, { status: 201 });
}
