import { NextResponse } from "next/server";
import { getSession, unauthorized, badRequest } from "@/lib/session";
import { listReports, createReport } from "@/lib/reports";
import { saveCompressed } from "@/lib/files";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();

  const reports = await listReports();
  return NextResponse.json(reports);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return unauthorized();

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const title = formData.get("title") as string | null;
  const report_number = formData.get("report_number") as string | null;
  const description = formData.get("description") as string | null;
  const revision = formData.get("revision") as string | null;
  const date = formData.get("date") as string | null;

  if (!file) return badRequest("file is required");
  if (!title?.trim()) return badRequest("title is required");
  if (!report_number?.trim()) return badRequest("report_number is required");
  if (!description?.trim()) return badRequest("description is required");
  if (!revision?.trim()) return badRequest("revision is required");
  if (!date?.trim()) return badRequest("date is required");

  const originalName = (formData.get("originalName") as string | null) ?? (file as File).name;
  const buffer = await file.arrayBuffer();
  const filename = await saveCompressed(buffer, originalName, "reports");

  const report = await createReport({
    title,
    report_number,
    description,
    revision,
    date,
    filename,
    created_by: session.user.id,
  });

  return NextResponse.json(report, { status: 201 });
}
