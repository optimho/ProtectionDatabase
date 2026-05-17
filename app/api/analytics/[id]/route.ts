import { NextResponse } from "next/server";
import { getSession, unauthorized, forbidden, notFound } from "@/lib/session";
import { getDataReport, deleteDataReport } from "@/lib/data-reports";

export const dynamic = "force-dynamic";

function isAdmin(session: Awaited<ReturnType<typeof getSession>>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (session?.user as any)?.role === "admin";
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!isAdmin(session)) return forbidden();

  const { id } = await params;
  const report = await getDataReport(id);
  if (!report) return notFound();

  await deleteDataReport(id);
  return NextResponse.json({ ok: true });
}
