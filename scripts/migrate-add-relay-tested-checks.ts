/**
 * Adds relay_tested_analogues and relay_tested_comprehensive columns to maintenance table.
 * Run: bun --bun scripts/migrate-add-relay-tested-checks.ts
 */
import { Database } from "bun:sqlite";

const db = new Database("data/app.db");
db.exec("PRAGMA journal_mode=WAL;");
db.exec("PRAGMA foreign_keys=ON;");

const cols = db.query("PRAGMA table_info(maintenance)").all() as { name: string }[];
const names = cols.map((c) => c.name);

if (names.includes("relay_tested_analogues")) {
  console.log("Columns already exist — skipping.");
} else {
  db.exec("ALTER TABLE maintenance ADD COLUMN relay_tested_analogues INTEGER NOT NULL DEFAULT 0");
  db.exec("ALTER TABLE maintenance ADD COLUMN relay_tested_comprehensive INTEGER NOT NULL DEFAULT 0");
  console.log("✓ Added relay_tested_analogues and relay_tested_comprehensive to maintenance table.");
}
