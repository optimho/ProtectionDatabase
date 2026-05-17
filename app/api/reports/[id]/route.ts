import { NextResponse } from "next/server";
import { getSession, unauthorized, notFound } from "@/lib/session";
import { getReport, deleteReport } from "@/lib/reports";
import { deleteFile } from "@/lib/files";

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

  return NextResponse.json(report);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const report = await getReport(id);
  if (!report) return notFound();

  await deleteFile("reports", report.filename);
  await deleteReport(id);
  return NextResponse.json({ ok: true });
}
