/**
 * GET /api/admin/db/backup
 *
 * Creates a full backup zip containing:
 *   - app.db           ← the SQLite database (WAL checkpointed first)
 *   - uploads/**       ← all uploaded files (reports, settings, test results, manuals)
 *
 * The zip can be restored via POST /api/admin/db/restore.
 */

import { NextResponse } from "next/server";
import { readFileSync, readdirSync, statSync, existsSync } from "fs";
import { join, relative } from "path";
import { zipSync, type Zippable } from "fflate";
import { getSession, unauthorized, forbidden } from "@/lib/session";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

function isAdmin(session: Awaited<ReturnType<typeof getSession>>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (session?.user as any)?.role === "admin";
}

/**
 * Recursively walk a directory and return every file as a flat map of
 * relative path → Uint8Array, suitable for passing to fflate's zipSync.
 */
function collectFiles(dir: string, root: string): Zippable {
  const result: Zippable = {};
  if (!existsSync(dir)) return result;

  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const rel = relative(root, full).replace(/\\/g, "/"); // normalise on Windows
    if (statSync(full).isDirectory()) {
      Object.assign(result, collectFiles(full, root));
    } else {
      result[rel] = new Uint8Array(readFileSync(full));
    }
  }
  return result;
}

export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!isAdmin(session)) return forbidden();

  // Flush WAL so the database file is fully up-to-date before we read it
  await query("PRAGMA wal_checkpoint(TRUNCATE)");

  const uploadsDir = join(process.cwd(), "public", "uploads");

  // Build the zip file contents
  const zipContents: Zippable = {
    // Database at the root of the zip
    "app.db": new Uint8Array(readFileSync("data/app.db")),
    // All uploaded files, preserving folder structure under uploads/
    ...collectFiles(uploadsDir, join(process.cwd(), "public")),
  };

  const zipped = zipSync(zipContents);
  const date = new Date().toISOString().slice(0, 10);
  const filename = `protection-db-backup-${date}.zip`;

  return new NextResponse(zipped, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(zipped.length),
    },
  });
}
