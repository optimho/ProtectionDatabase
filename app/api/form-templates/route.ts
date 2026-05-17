import { NextResponse } from "next/server";
import { getSession, unauthorized, forbidden, badRequest } from "@/lib/session";
import { listFormTemplates, createFormTemplate } from "@/lib/form-templates";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();

  const templates = await listFormTemplates();
  return NextResponse.json(templates);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (session.user.role !== "admin") return forbidden();

  const body = await req.json();
  if (!body.part_number?.trim()) return badRequest("part_number is required");
  if (!body.device_type_label?.trim()) return badRequest("device_type_label is required");

  const template = await createFormTemplate({
    part_number: body.part_number,
    device_type_label: body.device_type_label,
    maintenance_fields_json: JSON.stringify(body.maintenance_fields ?? []),
    settings_fields_json: JSON.stringify(body.settings_fields ?? []),
  });

  return NextResponse.json(template, { status: 201 });
}
