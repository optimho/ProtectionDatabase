/**
 * Adds decommission columns to the devices table.
 * Run: bun --bun scripts/migrate-add-decommission.ts
 */
import { Database } from "bun:sqlite";

const db = new Database("data/app.db");
db.exec("PRAGMA journal_mode=WAL;");
db.exec("PRAGMA foreign_keys=ON;");

const cols = db.query("PRAGMA table_info(devices)").all() as { name: string }[];
const names = cols.map((c) => c.name);

if (names.includes("decommissioned_at")) {
  console.log("Columns already exist — skipping.");
} else {
  db.exec("ALTER TABLE devices ADD COLUMN decommissioned_at TEXT");
  db.exec("ALTER TABLE devices ADD COLUMN decommissioned_by_name TEXT NOT NULL DEFAULT ''");
  db.exec("ALTER TABLE devices ADD COLUMN decommission_reason TEXT NOT NULL DEFAULT ''");
  console.log("✓ Added decommissioned_at, decommissioned_by_name, decommission_reason to devices table.");
}
