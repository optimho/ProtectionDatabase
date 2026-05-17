/**
 * Creates the data_reports table for saved analytical report definitions.
 * Run: npx tsx scripts/migrate-add-data-reports.ts
 */
import { Database } from "bun:sqlite";

const db = new Database("data/app.db");
db.exec("PRAGMA journal_mode=WAL;");
db.exec("PRAGMA foreign_keys=ON;");

const tables = db.query("SELECT name FROM sqlite_master WHERE type='table' AND name='data_reports'").get();

if (tables) {
  console.log("data_reports table already exists — skipping.");
} else {
  db.exec(`
    CREATE TABLE data_reports (
      id              TEXT PRIMARY KEY,
      name            TEXT NOT NULL,
      description     TEXT NOT NULL DEFAULT '',
      report_type     TEXT NOT NULL,
      parameters_json TEXT NOT NULL DEFAULT '{}',
      created_by      TEXT NOT NULL,
      created_at      TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  console.log("✓ Created data_reports table.");
}
