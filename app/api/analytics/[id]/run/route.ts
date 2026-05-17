import { NextResponse } from "next/server";
import { getSession, unauthorized, notFound } from "@/lib/session";
import { getDataReport, runReport } from "@/lib/data-reports";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const report = await getDataReport(id);
  if (!report) return notFound();

  const result = await runReport(report);
  return NextResponse.json(result);
}
