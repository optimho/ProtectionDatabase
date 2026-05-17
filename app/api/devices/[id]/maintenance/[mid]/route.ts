import { NextResponse } from "next/server";
import { getSession, unauthorized, notFound } from "@/lib/session";
import { getDevice } from "@/lib/devices";
import { getMaintenance, updateMaintenance, listMaintenanceFiles } from "@/lib/maintenance";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; mid: string }> }
) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { id, mid } = await params;
  const device = await getDevice(id);
  if (!device) return notFound();

  const record = await getMaintenance(mid);
  if (!record || record.device_id !== id) return notFound();

  const files = await listMaintenanceFiles(mid);
  return NextResponse.json({ ...record, files });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; mid: string }> }
) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { id, mid } = await params;
  const device = await getDevice(id);
  if (!device) return notFound();

  const record = await getMaintenance(mid);
  if (!record || record.device_id !== id) return notFound();

  const body = await req.json();
  await updateMaintenance(mid, body);
  return NextResponse.json({ ok: true });
}
