import { NextResponse } from "next/server";
import { getSession, unauthorized, notFound, badRequest } from "@/lib/session";
import { getDevice } from "@/lib/devices";
import { getMaintenance, listMaintenanceFiles, addMaintenanceFile } from "@/lib/maintenance";
import { saveCompressed } from "@/lib/files";

export const dynamic = "force-dynamic";

const VALID_TYPES = ["asleft_settings", "electronic_test", "test_report", "misc"] as const;

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
  return NextResponse.json(files);
}

export async function POST(
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

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const file_type = formData.get("file_type") as string | null;
  const description = (formData.get("description") as string | null) ?? "";

  if (!file) return badRequest("file is required");
  if (!file_type || !VALID_TYPES.includes(file_type as typeof VALID_TYPES[number])) {
    return badRequest(`file_type must be one of: ${VALID_TYPES.join(", ")}`);
  }

  const buffer = await file.arrayBuffer();
  const filename = await saveCompressed(buffer, file.name, `test_results/${mid}`);

  const mf = await addMaintenanceFile({
    maintenance_id: mid,
    file_type: file_type as typeof VALID_TYPES[number],
    filename,
    original_name: file.name,
    description,
  });

  return NextResponse.json(mf, { status: 201 });
}
