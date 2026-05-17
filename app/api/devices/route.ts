import { NextResponse } from "next/server";
import { getSession, unauthorized, badRequest } from "@/lib/session";
import { listDevices, createDevice, getDeviceByKKS } from "@/lib/devices";
import { assembleKKS } from "@/lib/kks";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();

  const devices = await listDevices();
  return NextResponse.json(devices);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return unauthorized();

  const body = await req.json();

  const required = [
    "part_number", "device_type", "device_location", "circuit",
    "kks_station", "kks_unit", "kks_system_code", "kks_system_number",
    "kks_equipment_unit_code", "kks_equipment_number",
    "kks_component_code", "kks_component_number",
  ];
  for (const field of required) {
    if (!body[field]) return badRequest(`Missing field: ${field}`);
  }

  const kks_full = assembleKKS(body);
  const existing = await getDeviceByKKS(kks_full);
  if (existing) return badRequest(`KKS ${kks_full} is already in use`);

  const device = await createDevice({ ...body, created_by: session.user.id });
  return NextResponse.json(device, { status: 201 });
}
