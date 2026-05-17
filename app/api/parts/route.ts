import { NextResponse } from "next/server";
import { getSession, unauthorized, forbidden, badRequest } from "@/lib/session";
import { listParts, createPart } from "@/lib/parts";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();
  return NextResponse.json(await listParts());
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (session.user.role !== "admin") return forbidden();

  const body = await req.json();
  if (!body.part_number?.trim()) return badRequest("part_number is required");
  if (!body.device_type?.trim()) return badRequest("device_type is required");

  const part = await createPart({
    part_number: body.part_number.trim(),
    device_type: body.device_type.trim(),
    relay_type: body.relay_type ?? "Microprocessor",
    description: body.description?.trim() ?? "",
    firmware: body.firmware?.trim() ?? "",
    nominal_supply_voltage: body.nominal_supply_voltage?.trim() ?? "",
    nominal_ct_input: body.nominal_ct_input?.trim() ?? "",
    nominal_vt_input: body.nominal_vt_input?.trim() ?? "",
    stock_number: body.stock_number?.trim() ?? "",
  });

  return NextResponse.json(part, { status: 201 });
}
