import { NextResponse } from "next/server";
import { getSession, unauthorized, notFound, badRequest } from "@/lib/session";
import { getDevice } from "@/lib/devices";
import { listSettings, createSetting } from "@/lib/settings";
import { addLogEntry } from "@/lib/log";
import { saveCompressed } from "@/lib/files";

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

  const settings = await listSettings(id);
  return NextResponse.json(settings);
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

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const revision = formData.get("revision") as string | null;
  const date = formData.get("date") as string | null;
  const description = formData.get("description") as string | null;

  if (!file) return badRequest("file is required");
  if (!revision?.trim()) return badRequest("revision is required");
  if (!date?.trim()) return badRequest("date is required");
  if (!description?.trim()) return badRequest("description is required");

  const buffer = await file.arrayBuffer();
  const filename = await saveCompressed(buffer, file.name, `settings/${id}`);

  const setting = await createSetting({
    device_id: id,
    revision,
    date,
    description,
    filename,
    created_by: session.user.id,
  });

  await addLogEntry({
    device_id: id,
    entry_type: "settings_change",
    notes: `New master setting uploaded — revision ${revision}: ${description}`,
    created_by: session.user.id,
  });

  return NextResponse.json(setting, { status: 201 });
}
