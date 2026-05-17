/**
 * Migration: ANSI-based protection elements
 *
 * - Drops old protection_elements (stored settings as an opaque JSON blob — no live data to preserve)
 * - Creates ansi_device_numbers, new protection_elements, element_settings
 * - Seeds ansi_device_numbers with common ANSI device codes
 *
 * Run: npx tsx scripts/migrate-ansi-elements.ts
 */
import { Database } from "bun:sqlite";

const db = new Database("data/app.db");
db.exec("PRAGMA journal_mode=WAL;");
db.exec("PRAGMA foreign_keys=OFF;"); // off during migration so we can drop/recreate

db.exec("DROP TABLE IF EXISTS protection_elements;");

db.exec(`
CREATE TABLE IF NOT EXISTS ansi_device_numbers (
  id            TEXT PRIMARY KEY,
  device_number TEXT NOT NULL UNIQUE,
  common_name   TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS protection_elements (
  id           TEXT PRIMARY KEY,
  device_id    TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  ansi_id      TEXT REFERENCES ansi_device_numbers(id) ON DELETE SET NULL,
  custom_name  TEXT NOT NULL DEFAULT '',
  description  TEXT NOT NULL DEFAULT '',
  enabled      INTEGER NOT NULL DEFAULT 1,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS element_settings (
  id           TEXT PRIMARY KEY,
  element_id   TEXT NOT NULL REFERENCES protection_elements(id) ON DELETE CASCADE,
  setting_name TEXT NOT NULL,
  custom_name  TEXT NOT NULL DEFAULT '',
  description  TEXT NOT NULL DEFAULT '',
  value        TEXT NOT NULL DEFAULT '',
  unit         TEXT NOT NULL DEFAULT '',
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

const ansiSeed = [
  { device_number: "21",  common_name: "Distance Relay",                         description: "Measures impedance to a fault; used for line protection." },
  { device_number: "25",  common_name: "Synchronism-Check Device",               description: "Permits connection of a machine to a live bus when synchronism conditions are met." },
  { device_number: "27",  common_name: "Undervoltage Relay",                     description: "Operates when voltage falls below a preset level." },
  { device_number: "32",  common_name: "Directional Power Relay",                description: "Operates on a predetermined value of power flow in a given direction (reverse power)." },
  { device_number: "46",  common_name: "Reverse-Phase / Phase-Balance Relay",    description: "Operates when polyphase currents are of reverse-phase sequence, or when the balance of polyphase currents is below or above a given amount." },
  { device_number: "47",  common_name: "Phase-Sequence Voltage Relay",           description: "Operates on a predetermined value of polyphase voltage in a given phase sequence." },
  { device_number: "49",  common_name: "Machine or Transformer Thermal Relay",   description: "Operates when the temperature of a machine armature winding or other load-carrying winding or element of a machine or power transformer exceeds a predetermined value." },
  { device_number: "50",  common_name: "Instantaneous Overcurrent Relay",        description: "Operates instantaneously on an excessive value of current." },
  { device_number: "50N", common_name: "Instantaneous Ground Overcurrent Relay", description: "Instantaneous overcurrent element responding to ground (neutral/residual) current." },
  { device_number: "51",  common_name: "AC Time Overcurrent Relay",              description: "Operates with a definite or inverse time characteristic when the current exceeds a predetermined value." },
  { device_number: "51N", common_name: "AC Time Ground Overcurrent Relay",       description: "Time overcurrent element responding to ground (neutral/residual) current." },
  { device_number: "59",  common_name: "Overvoltage Relay",                      description: "Operates when the voltage exceeds a predetermined value." },
  { device_number: "60",  common_name: "Voltage or Current Balance Relay",       description: "Operates on a given difference in voltage, or current input or output of two circuits." },
  { device_number: "64",  common_name: "Ground Detector Relay",                  description: "Operates on failure of machine or other apparatus insulation to ground." },
  { device_number: "67",  common_name: "AC Directional Overcurrent Relay",       description: "Operates on a predetermined value of overcurrent flowing in a predetermined direction." },
  { device_number: "67N", common_name: "AC Directional Ground Overcurrent Relay",description: "Directional overcurrent element responding to ground (neutral/residual) current." },
  { device_number: "79",  common_name: "AC Reclosing Relay",                     description: "Controls the automatic reclosing and locking out of an AC circuit interrupter." },
  { device_number: "81O", common_name: "Overfrequency Relay",                    description: "Operates when the frequency exceeds a predetermined value." },
  { device_number: "81U", common_name: "Underfrequency Relay",                   description: "Operates when the frequency falls below a predetermined value." },
  { device_number: "86",  common_name: "Lockout Relay",                          description: "An electrically operated hand or electrically reset device which operates to shut down and hold an equipment out of service on the occurrence of abnormal conditions." },
  { device_number: "87",  common_name: "Differential Protective Relay",          description: "Operates on a percentage or phase angle or other quantitative difference of two currents or of some other electrical quantities." },
  { device_number: "87T", common_name: "Transformer Differential Relay",         description: "Differential protection applied specifically to a power transformer." },
  { device_number: "87B", common_name: "Bus Differential Relay",                 description: "Differential protection applied to a busbar." },
  { device_number: "87L", common_name: "Line Differential Relay",               description: "Differential protection applied to a transmission or distribution line." },
];

const insertAnsi = db.query(
  "INSERT OR IGNORE INTO ansi_device_numbers (id, device_number, common_name, description) VALUES (?, ?, ?, ?)"
);
for (const row of ansiSeed) {
  const id = `ansi-${row.device_number.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
  insertAnsi.run(id, row.device_number, row.common_name, row.description);
}

db.exec("PRAGMA foreign_keys=ON;");

console.log("Migration complete: ansi_device_numbers, protection_elements (new schema), element_settings created and seeded.");
