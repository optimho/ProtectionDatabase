import Database from "better-sqlite3";
import { mkdirSync } from "fs";

const db = new Database("data/app.db");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function hasColumn(table: string, column: string): boolean {
  return (db.prepare(`PRAGMA table_info(${table})`).all() as any[]).some(
    (col) => col.name === column
  );
}

// Add description to parts
if (!hasColumn("parts", "description")) {
  db.exec(`ALTER TABLE parts ADD COLUMN description TEXT NOT NULL DEFAULT ''`);
  console.log("Added parts.description");
}

// Add firmware to parts (default/typical firmware version)
if (!hasColumn("parts", "firmware")) {
  db.exec(`ALTER TABLE parts ADD COLUMN firmware TEXT NOT NULL DEFAULT ''`);
  console.log("Added parts.firmware");
}

// Create part_manuals table
db.exec(`
CREATE TABLE IF NOT EXISTS part_manuals (
  id            TEXT PRIMARY KEY,
  part_id       TEXT NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
  filename      TEXT NOT NULL,
  original_name TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
`);
console.log("Created part_manuals table");

// Create manuals upload directory
mkdirSync("public/uploads/manuals", { recursive: true });
console.log("Created public/uploads/manuals directory");

console.log("Migration complete.");
