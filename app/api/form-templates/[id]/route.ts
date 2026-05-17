import { NextResponse } from "next/server";
import { getSession, unauthorized, forbidden, notFound } from "@/lib/session";
import { getFormTemplate, updateFormTemplate, deleteFormTemplate } from "@/lib/form-templates";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const template = await getFormTemplate(id);
  if (!template) return notFound();

  return NextResponse.json(template);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (session.user.role !== "admin") return forbidden();

  const { id } = await params;
  const template = await getFormTemplate(id);
  if (!template) return notFound();

  const body = await req.json();
  await updateFormTemplate(id, {
    part_number: body.part_number,
    device_type_label: body.device_type_label,
    maintenance_fields_json: body.maintenance_fields ? JSON.stringify(body.maintenance_fields) : undefined,
    settings_fields_json: body.settings_fields ? JSON.stringify(body.settings_fields) : undefined,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (session.user.role !== "admin") return forbidden();

  const { id } = await params;
  const template = await getFormTemplate(id);
  if (!template) return notFound();

  await deleteFormTemplate(id);
  return NextResponse.json({ ok: true });
}
