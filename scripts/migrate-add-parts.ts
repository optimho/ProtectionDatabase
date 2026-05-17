import { Database } from "bun:sqlite";

const db = new Database("data/app.db");

db.exec(`
CREATE TABLE IF NOT EXISTS parts (
  id                     TEXT PRIMARY KEY,
  part_number            TEXT NOT NULL UNIQUE,
  device_type            TEXT NOT NULL,
  nominal_supply_voltage TEXT NOT NULL DEFAULT '',
  nominal_ct_input       TEXT NOT NULL DEFAULT '',
  nominal_vt_input       TEXT NOT NULL DEFAULT '',
  stock_number           TEXT NOT NULL DEFAULT '',
  created_at             TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at             TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

console.log("Migration complete: parts table added.");
