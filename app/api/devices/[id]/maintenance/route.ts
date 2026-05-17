import { NextResponse } from "next/server";
import { getSession, unauthorized, notFound, badRequest } from "@/lib/session";
import { getDevice } from "@/lib/devices";
import { listMaintenance, createMaintenance } from "@/lib/maintenance";
import { addLogEntry } from "@/lib/log";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const device = await getDevice(id);
  if (!device) return notFound();

  const records = await listMaintenance(id);
  return NextResponse.json(records);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const device = await getDevice(id);
  if (!device) return notFound();

  const body = await req.json();
  if (!body.date) return badRequest("date is required");

  // Create a log entry for this maintenance visit
  const logNotes = body.notes?.trim()
    ? `Maintenance on ${body.date}: ${body.notes}`
    : `Maintenance carried out on ${body.date}`;

  const logId = await addLogEntry({
    device_id: id,
    entry_type: "maintenance",
    notes: logNotes,
    created_by: session.user.id,
  });

  const record = await createMaintenance({
    device_id: id,
    date: body.date,
    settings_checked_to_master: body.settings_checked_to_master ? 1 : 0,
    onload_check: body.onload_check ? 1 : 0,
    trip_function_proved: body.trip_function_proved ? 1 : 0,
    ct_secondary_insulation_check: body.ct_secondary_insulation_check ? 1 : 0,
    vt_secondary_insulation_check: body.vt_secondary_insulation_check ? 1 : 0,
    ct_loop_check: body.ct_loop_check ? 1 : 0,
    vt_loop_check: body.vt_loop_check ? 1 : 0,
    notes: body.notes ?? "",
    form_data_json: body.form_data_json ?? "{}",
    log_id: logId,
    created_by: session.user.id,
  });

  return NextResponse.json(record, { status: 201 });
}
