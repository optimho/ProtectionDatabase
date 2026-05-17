import { getSession, unauthorized, notFound } from "@/lib/session";
import { getReport } from "@/lib/reports";
import { readDecompressed, guessMime } from "@/lib/files";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const report = await getReport(id);
  if (!report) return notFound();

  const data = await readDecompressed("reports", report.filename);

  // Strip nanoid prefix (9 chars) and .gz suffix to recover original name
  const bare = report.filename.slice(9).replace(/\.gz$/, "");
  const contentType = guessMime(bare);
  const downloadName = `${report.title.replace(/[^a-zA-Z0-9_-]/g, "_")}_rev${report.revision}_${bare}`;

  return new Response(data, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${downloadName}"`,
    },
  });
}
