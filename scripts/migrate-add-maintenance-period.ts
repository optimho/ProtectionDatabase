/**
 * Adds maintenance_period_years column to the devices table.
 * Run: npx tsx scripts/migrate-add-maintenance-period.ts
 */
import Database from "better-sqlite3";

const db = new Database("data/app.db");
db.exec("PRAGMA journal_mode=WAL;");
db.exec("PRAGMA foreign_keys=ON;");

// Check if column already exists
const cols = db.prepare("PRAGMA table_info(devices)").all() as { name: string }[];
const exists = cols.some((c) => c.name === "maintenance_period_years");

if (exists) {
  console.log("Column maintenance_period_years already exists — skipping.");
} else {
  db.exec("ALTER TABLE devices ADD COLUMN maintenance_period_years REAL NOT NULL DEFAULT 0");
  console.log("✓ Added maintenance_period_years column to devices table.");
}
