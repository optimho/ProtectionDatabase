import { getSession, unauthorized, notFound } from "@/lib/session";
import { getDevice } from "@/lib/devices";
import { getMaintenance, getMaintenanceFile, deleteMaintenanceFile } from "@/lib/maintenance";
import { readDecompressed, deleteFile, guessMime } from "@/lib/files";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; mid: string; fid: string }> }
) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { id, mid, fid } = await params;
  const device = await getDevice(id);
  if (!device) return notFound();

  const record = await getMaintenance(mid);
  if (!record || record.device_id !== id) return notFound();

  const mf = await getMaintenanceFile(fid);
  if (!mf || mf.maintenance_id !== mid) return notFound();

  const data = await readDecompressed(`test_results/${mid}`, mf.filename);
  const contentType = guessMime(mf.original_name);

  return new Response(data, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${mf.original_name}"`,
    },
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; mid: string; fid: string }> }
) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { id, mid, fid } = await params;
  const device = await getDevice(id);
  if (!device) return notFound();

  const record = await getMaintenance(mid);
  if (!record || record.device_id !== id) return notFound();

  const mf = await getMaintenanceFile(fid);
  if (!mf || mf.maintenance_id !== mid) return notFound();

  await deleteFile(`test_results/${mid}`, mf.filename);
  await deleteMaintenanceFile(fid);
  return Response.json({ ok: true });
}
