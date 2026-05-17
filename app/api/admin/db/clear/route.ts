import { NextResponse } from "next/server";
import { getSession, unauthorized, forbidden } from "@/lib/session";
import { run } from "@/lib/db";

export const dynamic = "force-dynamic";

function isAdmin(session: Awaited<ReturnType<typeof getSession>>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (session?.user as any)?.role === "admin";
}

// Tables to clear, in safe deletion order (children before parents).
// Preserved: user, account, session, verification (auth), ansi_device_numbers (ANSI catalog)
const TABLES_TO_CLEAR = [
  "maintenance_files",
  "element_settings",
  "maintenance",
  "master_settings",
  "protection_elements",
  "log",
  "devices",
  "protection_reports",
  "data_reports",
  "form_templates",
  "part_manuals",
  "parts",
];

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!isAdmin(session)) return forbidden();

  const body = await req.json();
  // Require explicit confirmation flag to prevent accidental calls
  if (body.confirm !== "CLEAR") {
    return NextResponse.json({ error: "Confirmation required" }, { status: 400 });
  }

  await run("PRAGMA foreign_keys=OFF");
  for (const table of TABLES_TO_CLEAR) {
    await run(`DELETE FROM ${table}`);
  }
  await run("PRAGMA foreign_keys=ON");
  await run("VACUUM");

  return NextResponse.json({ ok: true, message: "Database cleared successfully" });
}
