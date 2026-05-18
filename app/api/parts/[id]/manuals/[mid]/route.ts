import { NextResponse } from "next/server";
import { getSession, unauthorized, forbidden, notFound } from "@/lib/session";
import { getManual, deleteManual } from "@/lib/parts";
import { unlink } from "node:fs/promises";
import path from "path";
import { guessMime } from "@/lib/files";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; mid: string }> }) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { mid } = await params;
  const manual = await getManual(mid);
  if (!manual) return notFound();

  const filePath = path.join(process.cwd(), "public", "uploads", "manuals", path.basename(manual.filename));
  const bunFile = Bun.file(filePath);
  if (!(await bunFile.exists())) return notFound();
  const buffer = await bunFile.arrayBuffer();

  const mime = guessMime(manual.original_name);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": mime,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(manual.original_name)}"`,
    },
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; mid: string }> }) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (session.user.role !== "admin") return forbidden();

  const { mid } = await params;
  const manual = await getManual(mid);
  if (!manual) return notFound();

  const filePath = path.join(process.cwd(), "public", "uploads", "manuals", path.basename(manual.filename));
  await unlink(filePath).catch(() => {});

  await deleteManual(mid);

  return new NextResponse(null, { status: 204 });
}
