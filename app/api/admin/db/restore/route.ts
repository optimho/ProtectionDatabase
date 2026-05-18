/**
 * POST /api/admin/db/restore
 *
 * Accepts a backup zip produced by GET /api/admin/db/backup and restores
 * both the database and all uploaded files.
 *
 * Restore steps:
 *   1. Unzip the archive
 *   2. Validate app.db has the SQLite magic bytes
 *   3. Close the live database connection
 *   4. Overwrite data/app.db
 *   5. Write all uploads/* files to public/uploads/, creating directories as needed
 *
 * The database connection is re-established automatically on the next request.
 */

import { NextResponse } from "next/server";
import { mkdirSync } from "node:fs";
import { join, dirname } from "path";
import { unzipSync } from "fflate";
import { getSession, unauthorized, forbidden, badRequest } from "@/lib/session";
import { closeDb } from "@/lib/db";

export const dynamic = "force-dynamic";

function isAdmin(session: Awaited<ReturnType<typeof getSession>>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (session?.user as any)?.role === "admin";
}

// SQLite databases always start with this 16-byte magic string
const SQLITE_MAGIC = "SQLite format 3\x00";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!isAdmin(session)) return forbidden();

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return badRequest("No file provided");

  const buffer = Buffer.from(await file.arrayBuffer());

  // Unzip the archive
  let entries: ReturnType<typeof unzipSync>;
  try {
    entries = unzipSync(new Uint8Array(buffer));
  } catch {
    return badRequest("File is not a valid zip archive. Upload a backup created by the Download Backup button.");
  }

  // Must contain app.db
  const dbBytes = entries["app.db"];
  if (!dbBytes) {
    return badRequest("Zip does not contain app.db — this does not look like a valid backup.");
  }

  // Validate SQLite magic bytes before touching anything on disk
  const magic = Buffer.from(dbBytes.subarray(0, 16)).toString("binary");
  if (magic !== SQLITE_MAGIC) {
    return badRequest("app.db inside the zip is not a valid SQLite database.");
  }

  // ── All validation passed — now replace files on disk ───────────────────

  // Close the live connection so we can overwrite the database file
  closeDb();
  await Bun.write("data/app.db", dbBytes);

  // Restore uploaded files from the zip (uploads/* entries)
  const uploadsRoot = join(process.cwd(), "public");
  for (const [entryPath, bytes] of Object.entries(entries)) {
    if (!entryPath.startsWith("uploads/")) continue;
    const dest = join(uploadsRoot, entryPath);
    // Create parent directories as needed
    mkdirSync(dirname(dest), { recursive: true });
    await Bun.write(dest, bytes);
  }

  return NextResponse.json({ ok: true, message: "Backup restored successfully" });
}
