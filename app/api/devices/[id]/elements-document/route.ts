import { NextResponse } from "next/server";
import { getSession, unauthorized, notFound, badRequest } from "@/lib/session";
import { getDevice } from "@/lib/devices";
import { saveCompressed, readDecompressed, deleteFile, guessMime } from "@/lib/files";
import { run } from "@/lib/db";
import path from "path";

export const dynamic = "force-dynamic";

/** GET — download the elements document */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const device = await getDevice(id);
  if (!device) return notFound();
  if (!device.elements_doc_filename) return notFound();

  const data = await readDecompressed(`elements/${id}`, device.elements_doc_filename);
  const mime = guessMime(device.elements_doc_original_name ?? device.elements_doc_filename);
  const downloadName = device.elements_doc_original_name ?? device.elements_doc_filename.slice(9).replace(/\.gz$/, "");

  return new Response(data, {
    headers: {
      "Content-Type": mime,
      "Content-Disposition": `inline; filename="${encodeURIComponent(downloadName)}"`,
    },
  });
}

/** POST — upload / replace the elements document */
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
  if (!file) return badRequest("file is required");

  const originalName = (formData.get("originalName") as string | null) ?? (file as File).name;

  // Delete old file if one exists
  if (device.elements_doc_filename) {
    await deleteFile(`elements/${id}`, device.elements_doc_filename);
  }

  const buffer = await file.arrayBuffer();
  const filename = await saveCompressed(buffer, originalName, `elements/${id}`);

  await run(
    "UPDATE devices SET elements_doc_filename=?, elements_doc_original_name=?, updated_at=datetime('now') WHERE id=?",
    [filename, originalName ?? null, id]
  );

  return NextResponse.json({ ok: true, original_name: originalName });
}

/** DELETE — remove the elements document */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const device = await getDevice(id);
  if (!device) return notFound();

  if (device.elements_doc_filename) {
    await deleteFile(`elements/${id}`, device.elements_doc_filename);
    await run(
      "UPDATE devices SET elements_doc_filename=NULL, elements_doc_original_name=NULL, updated_at=datetime('now') WHERE id=?",
      [id]
    );
  }

  return new NextResponse(null, { status: 204 });
}
