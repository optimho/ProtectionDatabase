import { NextResponse } from "next/server";
import { getSession, unauthorized, notFound, badRequest } from "@/lib/session";
import { getDevice } from "@/lib/devices";
import { getLog, addLogEntry } from "@/lib/log";

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

  const entries = await getLog(id);
  return NextResponse.json(entries);
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

  const { notes, entry_type = "general" } = await req.json();
  if (!notes?.trim()) return badRequest("notes is required");

  const validTypes = ["general", "maintenance", "settings_change"];
  if (!validTypes.includes(entry_type)) return badRequest("Invalid entry_type");

  const logId = await addLogEntry({ device_id: id, entry_type, notes, created_by: session.user.id });
  return NextResponse.json({ id: logId }, { status: 201 });
}
