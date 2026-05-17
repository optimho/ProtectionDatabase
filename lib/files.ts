/**
 * lib/files.ts — File storage with transparent gzip compression
 *
 * All user-uploaded files (protection reports, master settings, test results,
 * part manuals) are compressed before being written to disk. This keeps
 * storage requirements low on the Raspberry Pi deployment regardless of
 * file type — most engineering documents (PDF, Word, Excel) compress well.
 *
 * Storage layout under public/uploads/:
 *   reports/                        ← standalone protection report documents
 *   settings/<device_id>/           ← master settings, all revisions kept
 *   test_results/<maintenance_id>/  ← files attached to maintenance records
 *   manuals/                        ← part data sheets
 *
 * Security notes:
 *   - All stored filenames are run through path.basename() before constructing
 *     disk paths. This prevents path traversal attacks (e.g. a filename of
 *     "../../etc/passwd" would become just "passwd").
 *   - Uploaded files are saved with a nanoid prefix to prevent collisions
 *     when the same original filename is uploaded more than once.
 *   - Files are served through API route handlers, not as static assets,
 *     so session checks apply to every download.
 */

import path from "path";
import { mkdirSync } from "fs";
import { readFile, writeFile, unlink } from "fs/promises";
import { gzipSync, gunzipSync } from "zlib";
import { nanoid } from "nanoid";

/**
 * Compress a file buffer with gzip and write to disk.
 * Returns the filename (with .gz extension) that was saved.
 */
export async function saveCompressed(
  buffer: ArrayBuffer,
  originalName: string,
  folder: string
): Promise<string> {
  const safeName = path.basename(originalName).replace(/[^a-zA-Z0-9._-]/g, "_");
  const filename = `${nanoid(8)}_${safeName}.gz`;
  const dir = path.join(process.cwd(), "public", "uploads", folder);
  mkdirSync(dir, { recursive: true });

  const compressed = gzipSync(Buffer.from(buffer));
  await writeFile(path.join(dir, filename), compressed);
  return filename;
}

/**
 * Read a compressed file from disk and return the decompressed buffer.
 */
export async function readDecompressed(folder: string, filename: string): Promise<ArrayBuffer> {
  const safeFilename = path.basename(filename);
  const filePath = path.join(process.cwd(), "public", "uploads", folder, safeFilename);
  const compressed = await readFile(filePath);
  const decompressed = gunzipSync(compressed);
  return decompressed.buffer.slice(decompressed.byteOffset, decompressed.byteOffset + decompressed.byteLength) as ArrayBuffer;
}

/**
 * Delete a compressed file from disk.
 */
export async function deleteFile(folder: string, filename: string): Promise<void> {
  const safeFilename = path.basename(filename);
  const filePath = path.join(process.cwd(), "public", "uploads", folder, safeFilename);
  await unlink(filePath).catch(() => {});
}

/**
 * Guess a MIME type from an original filename.
 */
export function guessMime(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase();
  const map: Record<string, string> = {
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".csv": "text/csv",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".xls": "application/vnd.ms-excel",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".doc": "application/msword",
    ".txt": "text/plain",
    ".zip": "application/zip",
  };
  return map[ext] ?? "application/octet-stream";
}
