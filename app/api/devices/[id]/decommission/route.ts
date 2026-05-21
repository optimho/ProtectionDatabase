import { NextResponse } from "next/server";
import { getSession, unauthorized, badRequest, notFound } from "@/lib/session";
import { getDevice, decommissionDevice } from "@/lib/devices";
import { addLogEntry } from "@/lib/log";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const device = await getDevice(id);
  if (!device) return notFound();

  if (device.decommissioned_at) {
    return badRequest("Device is already decommissioned");
  }

  const body = await req.json();
  const byName = (body.decommissioned_by_name ?? "").trim();
  const reason = (body.decommission_reason ?? "").trim();

  if (!byName) return badRequest("Missing field: decommissioned_by_name");
  if (!reason) return badRequest("Missing field: decommission_reason");

  await decommissionDevice(id, byName, reason);
  await addLogEntry({
    device_id: id,
    entry_type: "general",
    notes: `Relay decommissioned by ${byName}. Reason: ${reason}`,
    created_by: session.user.id,
  });

  return NextResponse.json({ ok: true });
}
