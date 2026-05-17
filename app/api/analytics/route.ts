import { NextResponse } from "next/server";
import { getSession, unauthorized, forbidden, badRequest } from "@/lib/session";
import { listDataReports, createDataReport, REPORT_TYPES, type ReportType } from "@/lib/data-reports";

export const dynamic = "force-dynamic";

function isAdmin(session: Awaited<ReturnType<typeof getSession>>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (session?.user as any)?.role === "admin";
}

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();
  return NextResponse.json(await listDataReports());
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!isAdmin(session)) return forbidden();

  const body = await req.json();
  if (!body.name?.trim()) return badRequest("name is required");

  const validTypes = REPORT_TYPES.map((t) => t.value);
  if (!validTypes.includes(body.report_type)) return badRequest("Invalid report type");

  const report = await createDataReport({
    name: body.name.trim(),
    description: body.description?.trim() ?? "",
    report_type: body.report_type as ReportType,
    parameters: body.parameters ?? {},
    created_by: session.user.id,
  });

  return NextResponse.json(report, { status: 201 });
}
