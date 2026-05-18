/**
 * Adds elements_doc_filename and elements_doc_original_name columns to devices table.
 * Run: bun --bun scripts/migrate-add-elements-doc.ts
 */
import { Database } from "bun:sqlite";

const db = new Database("data/app.db");
db.exec("PRAGMA journal_mode=WAL;");
db.exec("PRAGMA foreign_keys=ON;");

const cols = db.query("PRAGMA table_info(devices)").all() as { name: string }[];
const names = cols.map((c) => c.name);

if (names.includes("elements_doc_filename")) {
  console.log("Columns already exist — skipping.");
} else {
  db.exec("ALTER TABLE devices ADD COLUMN elements_doc_filename TEXT");
  db.exec("ALTER TABLE devices ADD COLUMN elements_doc_original_name TEXT");
  console.log("✓ Added elements_doc_filename and elements_doc_original_name to devices table.");
}
