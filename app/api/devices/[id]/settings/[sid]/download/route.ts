import { getSession, unauthorized, notFound } from "@/lib/session";
import { getDevice } from "@/lib/devices";
import { listSettings } from "@/lib/settings";
import { readDecompressed, guessMime } from "@/lib/files";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; sid: string }> }
) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { id, sid } = await params;
  const device = await getDevice(id);
  if (!device) return notFound();

  const allSettings = await listSettings(id);
  const setting = allSettings.find((s) => s.id === sid);
  if (!setting) return notFound();

  const data = await readDecompressed(`settings/${id}`, setting.filename);

  // Reconstruct original name: strip nanoid prefix (9 chars) and .gz suffix
  const bare = setting.filename.slice(9).replace(/\.gz$/, "");
  const contentType = guessMime(bare);
  const downloadName = `${device.kks_full}_rev${setting.revision}_${path.basename(bare)}`;

  return new Response(data, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${downloadName}"`,
    },
  });
}
