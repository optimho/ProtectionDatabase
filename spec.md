# ProtectionDeviceDataBase — Technical Specification

## 1. Overview

A web application for managing protection relays in electrical power systems. The system stores device metadata, KKS location codes, protection reports, master settings revisions, maintenance records, device-specific field data, protection element configurations, and per-device activity journals.

Multi-user with email/password authentication and role-based access control (user / admin).

Deployed on a Raspberry Pi and exposed over Tailscale Funnel. Also runs on Windows for local development.

---

## 2. Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router) |
| Runtime | Bun |
| Language | TypeScript |
| Styling | TailwindCSS v4 + @tailwindcss/postcss |
| Database | SQLite via bun:sqlite (no ORM, raw SQL) |
| Auth | better-auth (email/password, session cookies) |
| File storage | Compressed gzip files in `public/uploads/` |
| File I/O | Bun-native APIs (`Bun.file()`, `Bun.write()`, `Bun.gzipSync()`, `Bun.gunzipSync()`) |
| Deployment | Raspberry Pi + Tailscale Funnel; also Windows for local development |

> **Note:** The server must be started with `bun --bun run dev/start`. Without `--bun`, `bun:sqlite` is not available server-side.

> **Windows note:** `node:fs` is still used for directory operations (`mkdirSync`, `readdirSync`, `statSync`, `unlink`) as Bun has no native mkdir/directory-walk API. All other file I/O uses Bun-native APIs.

> **Body size limit:** `next.config.ts` sets `experimental.proxyClientMaxBodySize: 100 * 1024 * 1024` (100 MB) to allow large file uploads through the Next.js proxy layer.

---

## 3. KKS Code Structure

KKS (Kraftwerk-Kennzeichensystem) is the international power station identification system used to uniquely locate every piece of plant equipment. All KKS parts are entered by the user when creating a device. The assembled string is stored as a UNIQUE indexed column — no two devices can share the same KKS.

| Field | Level | Example | Format |
|---|---|---|---|
| Station | Prefix | THI | 3 uppercase letters |
| Unit | Level 0 | 1 | 1 digit |
| System Code | Level 1 | BBA | 3 uppercase letters |
| System Number | Level 1 | 01 | 2 digits |
| Equipment Unit Code | Level 2 | AP | 2 uppercase letters |
| Equipment Number | Level 2 | 001 | 3 digits |
| Component Code | Level 3 | EY | 2 uppercase letters |
| Component Number | Level 3 | 01 | 2 digits |

**Assembly rule:** `{station}{unit}{system_code}{system_number}{equipment_unit_code}{equipment_number}-{component_code}{component_number}`

**Example:** `THI1BBA01AP001-EY01`

The `kks_full` column is UNIQUE — no two devices can share the same KKS.

---

## 4. Database Schema

### Auth tables (managed by better-auth)

`user`, `session`, `account`, `verification` — created automatically by better-auth on first run. The `user` table has an additional `role TEXT NOT NULL DEFAULT 'user'` column (values: `'user'` or `'admin'`).

---

### Relay type catalog

```sql
-- Physical relay type catalogue — one row per part number
CREATE TABLE IF NOT EXISTS parts (
  id                      TEXT PRIMARY KEY,
  part_number             TEXT NOT NULL UNIQUE,
  device_type             TEXT NOT NULL,
  relay_type              TEXT NOT NULL,  -- Electromechanical | Electronic | Microprocessor
  description             TEXT NOT NULL DEFAULT '',
  firmware                TEXT NOT NULL DEFAULT '',
  nominal_supply_voltage  TEXT NOT NULL DEFAULT '',
  nominal_ct_input        TEXT NOT NULL DEFAULT '',
  nominal_vt_input        TEXT NOT NULL DEFAULT '',
  stock_number            TEXT NOT NULL DEFAULT '',
  created_at              TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at              TEXT NOT NULL DEFAULT (datetime('now'))
);

-- PDF manuals and data sheets attached to a relay type
CREATE TABLE IF NOT EXISTS part_manuals (
  id            TEXT PRIMARY KEY,
  part_id       TEXT NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
  filename      TEXT NOT NULL,       -- compressed file in public/uploads/manuals/
  original_name TEXT NOT NULL,       -- original filename for download
  description   TEXT NOT NULL DEFAULT '',
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
```

---

### Form templates (dynamic field schema)

```sql
-- One template per part_number. Defines the extra fields that appear
-- on maintenance forms and in the Device Information panel for that relay type.
CREATE TABLE IF NOT EXISTS form_templates (
  id                       TEXT PRIMARY KEY,
  part_number              TEXT NOT NULL UNIQUE REFERENCES parts(part_number),
  device_type_label        TEXT NOT NULL,              -- human-readable type label
  maintenance_fields_json  TEXT NOT NULL DEFAULT '[]', -- JSON: FieldSchema[]
  settings_fields_json     TEXT NOT NULL DEFAULT '[]', -- JSON: FieldSchema[] (reserved)
  created_at               TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at               TEXT NOT NULL DEFAULT (datetime('now'))
);
```

Each JSON array holds `FieldSchema` objects:

```json
[
  { "key": "pickup_current", "label": "Pickup Current (A)", "type": "number", "required": true },
  { "key": "curve_type",     "label": "Curve Type",         "type": "select",
    "options": ["IEC Standard Inverse", "IEC Very Inverse", "IEC Extremely Inverse"], "required": true },
  { "key": "ct_ratio",       "label": "CT Ratio",           "type": "text",   "required": true }
]
```

Supported field types: `text` `number` `date` `select` `checkbox` `textarea`

---

### Standalone protection report library

```sql
-- System protection reports (PDF/Word documents), independent of individual devices.
-- A device can be linked to one report via report_id.
CREATE TABLE IF NOT EXISTS protection_reports (
  id            TEXT PRIMARY KEY,
  title         TEXT NOT NULL,
  report_number TEXT NOT NULL DEFAULT '',
  description   TEXT NOT NULL,
  revision      TEXT NOT NULL,
  date          TEXT NOT NULL,
  filename      TEXT NOT NULL,    -- compressed file in public/uploads/reports/
  original_name TEXT NOT NULL DEFAULT '',
  created_by    TEXT NOT NULL REFERENCES user(id),
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
```

---

### Protection relay devices

```sql
-- A single installed protection relay.
-- KKS fields (8 parts) are stored individually and also as the assembled kks_full.
-- device_fields_json holds values for the extra fields defined in the matching form_template.
CREATE TABLE IF NOT EXISTS devices (
  id                       TEXT PRIMARY KEY,
  part_number              TEXT NOT NULL REFERENCES parts(part_number),
  device_type              TEXT NOT NULL,
  firmware                 TEXT,
  serial_number            TEXT,
  commissioning_date       TEXT,
  device_location          TEXT NOT NULL,
  circuit                  TEXT NOT NULL,
  -- KKS location identifier (8 parts stored separately for filtering)
  kks_station              TEXT NOT NULL,   -- 3 letters  e.g. THI
  kks_unit                 TEXT NOT NULL,   -- 1 digit    e.g. 1
  kks_system_code          TEXT NOT NULL,   -- 3 letters  e.g. BBA
  kks_system_number        TEXT NOT NULL,   -- 2 digits   e.g. 01
  kks_equipment_unit_code  TEXT NOT NULL,   -- 2 letters  e.g. AP
  kks_equipment_number     TEXT NOT NULL,   -- 3 digits   e.g. 001
  kks_component_code       TEXT NOT NULL,   -- 2 letters  e.g. EY
  kks_component_number     TEXT NOT NULL,   -- 2 digits   e.g. 01
  kks_full                 TEXT NOT NULL UNIQUE,  -- assembled: THI1BBA01AP001-EY01
  -- linked protection report (many devices may reference the same report)
  report_id                TEXT REFERENCES protection_reports(id) ON DELETE SET NULL,
  eipc                     INTEGER NOT NULL DEFAULT 0,  -- 1 = EIPC compliance required
  maintenance_period_years REAL    NOT NULL DEFAULT 0,  -- retest interval (0 = not set)
  device_fields_json       TEXT NOT NULL DEFAULT '{}',  -- type-specific field values
  -- optional document explaining protection elements (added via migration)
  elements_doc_filename    TEXT,   -- compressed file in public/uploads/elements/<device_id>/
  elements_doc_original_name TEXT,
  created_by               TEXT NOT NULL REFERENCES user(id),
  created_at               TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at               TEXT NOT NULL DEFAULT (datetime('now'))
);
```

---

### ANSI device number library

```sql
-- ANSI C37.2 protection element definitions (e.g. 51 = Time Overcurrent, 87L = Line Differential).
-- This is a seeded reference table maintained by admins.
CREATE TABLE IF NOT EXISTS ansi_device_numbers (
  id           TEXT PRIMARY KEY,
  device_number TEXT NOT NULL UNIQUE,   -- e.g. "51", "87L", "21"
  common_name  TEXT NOT NULL,
  description  TEXT NOT NULL DEFAULT '',
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
```

---

### Protection elements per device

```sql
-- Protection elements enabled on a device. References the ANSI library,
-- or uses custom_name for non-standard elements.
CREATE TABLE IF NOT EXISTS protection_elements (
  id          TEXT PRIMARY KEY,
  device_id   TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  ansi_id     TEXT REFERENCES ansi_device_numbers(id) ON DELETE SET NULL,
  custom_name TEXT NOT NULL DEFAULT '',   -- override or supplement the ANSI name
  description TEXT NOT NULL DEFAULT '',
  enabled     INTEGER NOT NULL DEFAULT 1,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Applied setting values for a protection element (e.g. pickup = 1.2A, time dial = 0.5)
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
```

---

### Device activity journal

```sql
-- Append-only per-device journal. Entries are created automatically when
-- maintenance records are saved, and can also be added manually.
CREATE TABLE IF NOT EXISTS log (
  id          TEXT PRIMARY KEY,
  device_id   TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  entry_type  TEXT NOT NULL CHECK (entry_type IN ('general','maintenance','settings_change')),
  notes       TEXT NOT NULL,
  created_by  TEXT NOT NULL REFERENCES user(id),
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
```

---

### Master settings history

```sql
-- Versioned settings revisions per device. All revisions are kept;
-- the most recent by date is considered the current master.
CREATE TABLE IF NOT EXISTS master_settings (
  id          TEXT PRIMARY KEY,
  device_id   TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  revision    TEXT NOT NULL,
  date        TEXT NOT NULL,
  description TEXT NOT NULL,
  filename    TEXT NOT NULL,    -- compressed file in public/uploads/settings/<device_id>/
  original_name TEXT NOT NULL DEFAULT '',
  created_by  TEXT NOT NULL REFERENCES user(id),
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
```

---

### Maintenance records

```sql
-- A maintenance visit record. The standard checkbox fields cover the universal
-- checks; form_data_json holds values for the device-type-specific fields
-- defined in the matching form_template.
CREATE TABLE IF NOT EXISTS maintenance (
  id                              TEXT PRIMARY KEY,
  device_id                       TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  date                            TEXT NOT NULL,
  settings_checked_to_master      INTEGER NOT NULL DEFAULT 0,
  onload_check                    INTEGER NOT NULL DEFAULT 0,
  trip_function_proved            INTEGER NOT NULL DEFAULT 0,
  ct_secondary_insulation_check   INTEGER NOT NULL DEFAULT 0,
  vt_secondary_insulation_check   INTEGER NOT NULL DEFAULT 0,
  ct_loop_check                   INTEGER NOT NULL DEFAULT 0,
  vt_loop_check                   INTEGER NOT NULL DEFAULT 0,
  relay_tested_analogues          INTEGER NOT NULL DEFAULT 0,  -- added via migration
  relay_tested_comprehensive      INTEGER NOT NULL DEFAULT 0,  -- added via migration
  notes                           TEXT NOT NULL DEFAULT '',
  form_data_json                  TEXT NOT NULL DEFAULT '{}',   -- device-specific field values
  log_id                          TEXT REFERENCES log(id),      -- auto-created log entry
  created_by                      TEXT NOT NULL REFERENCES user(id),
  created_at                      TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Files attached to a maintenance record (test reports, as-left settings, etc.)
CREATE TABLE IF NOT EXISTS maintenance_files (
  id              TEXT PRIMARY KEY,
  maintenance_id  TEXT NOT NULL REFERENCES maintenance(id) ON DELETE CASCADE,
  file_type       TEXT NOT NULL CHECK (file_type IN ('asleft_settings','electronic_test','test_report','misc')),
  filename        TEXT NOT NULL,   -- compressed in public/uploads/test_results/<maintenance_id>/
  original_name   TEXT NOT NULL DEFAULT '',
  description     TEXT NOT NULL DEFAULT '',
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
```

---

### Analytics — saved report definitions

```sql
-- Admin-created report definitions. Any user can run a saved report.
-- parameters_json holds optional filters (dates, station, device KKS, etc.)
CREATE TABLE IF NOT EXISTS data_reports (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  description     TEXT NOT NULL DEFAULT '',
  report_type     TEXT NOT NULL,    -- one of the REPORT_TYPES values
  parameters_json TEXT NOT NULL DEFAULT '{}',
  created_by      TEXT NOT NULL REFERENCES user(id),
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);
```

---

## 5. File Storage Layout

All uploaded files are compressed with gzip before being written to disk. Downloads are decompressed on-the-fly. This keeps storage small regardless of file type.

```
public/
  uploads/
    reports/                          ← standalone protection report documents
    settings/<device_id>/             ← master settings files (all revisions kept)
    test_results/<maintenance_id>/    ← test results attached to maintenance records
    manuals/                          ← part data sheets and manuals
    elements/<device_id>/             ← protection elements reference document (one per device)
```

**Upload pipeline:**
1. File received as `multipart/form-data`
2. The frontend always appends the original filename as a separate `originalName` text field in the form data (in addition to the `file` blob field). This is required because Bun's `req.formData()` returns `Blob` objects (no `.name` property) rather than `File` objects in some Next.js route contexts.
3. Buffer compressed with `Bun.gzipSync()`
4. Saved as `<nanoid8>_<original_name>.gz` (original name sanitised with `path.basename`)
5. Filename + original name stored in database
6. On download: read `.gz` with `Bun.file().bytes()`, decompress with `Bun.gunzipSync()`, serve with guessed MIME type

Path traversal attacks are prevented by running every stored filename through `path.basename()` before constructing disk paths.

---

## 6. Dynamic Form System

Each relay type (part_number) can have a `form_template` that defines extra fields. These appear in two places:

1. **Device Information panel** — `device_fields_json` on the `devices` row, shown on the device detail page
2. **Maintenance form** — `form_data_json` on each `maintenance` row, captured during each visit

The `DynamicFormFields` component renders the field schema at runtime. The `FormTemplateEditor` admin component allows drag-sort editing of the schema without any code changes.

---

## 7. Analytics & Report Engine

Report definitions are saved in `data_reports`. Any user can run a saved report; only admins can create or delete them.

Running a report executes SQL and returns `{ columns, rows, summary }`. Results render as an inline table and can be exported to CSV.

### Report Types

| Type key | Label | Description |
|---|---|---|
| `device_inventory` | Device Inventory | Relay count grouped by station, part number, and firmware version |
| `maintenance_due` | Maintenance Due | Devices overdue for maintenance based on their period setting |
| `eipc_compliance` | EIPC Compliance | All EIPC-required devices and their last maintenance date |
| `maintenance_history` | Maintenance History | All maintenance records between two dates |
| `protection_elements` | Protection Elements | ANSI elements in use across the fleet with device counts |
| `elements_per_relay` | Protection Elements per Relay | All elements and applied settings per device (filterable by station or single KKS) |
| `maintenance_upcoming` | Maintenance Upcoming | Devices whose next due date falls within a selectable number of months |
| `firmware_search` | Firmware Search | Find all devices matching a partial firmware string |

### Optional report parameters

| Parameter | Used by |
|---|---|
| `date_from` / `date_to` | maintenance_history |
| `station` | device_inventory, elements_per_relay |
| `device_kks` | elements_per_relay (single device) |
| `months_ahead` | maintenance_upcoming (1–120, default 3) |
| `firmware_filter` | firmware_search (partial LIKE match) |

---

## 8. API Endpoints

All endpoints require a valid session cookie. Unauthenticated requests return 401; insufficient role returns 403.

### Devices
| Method | Path | Description |
|---|---|---|
| GET | `/api/devices` | List all devices |
| POST | `/api/devices` | Create device |
| GET | `/api/devices/[id]` | Get device |
| PUT | `/api/devices/[id]` | Update device |
| DELETE | `/api/devices/[id]` | Delete device |

### Master Settings
| Method | Path | Description |
|---|---|---|
| GET | `/api/devices/[id]/settings` | List all settings revisions |
| POST | `/api/devices/[id]/settings` | Upload new revision |
| GET | `/api/devices/[id]/settings/[sid]/download` | Download a settings file |

### Maintenance
| Method | Path | Description |
|---|---|---|
| GET | `/api/devices/[id]/maintenance` | List maintenance records |
| POST | `/api/devices/[id]/maintenance` | Create record |
| GET | `/api/devices/[id]/maintenance/[mid]` | Get record |
| PUT | `/api/devices/[id]/maintenance/[mid]` | Update record |
| POST | `/api/devices/[id]/maintenance/[mid]/files` | Attach file |
| GET | `/api/devices/[id]/maintenance/[mid]/files/[fid]/download` | Download file |
| DELETE | `/api/devices/[id]/maintenance/[mid]/files/[fid]` | Delete file |

### Elements Document
| Method | Path | Description |
|---|---|---|
| GET | `/api/devices/[id]/elements-document` | Open/download the protection elements reference document (served inline so it opens in the browser) |
| POST | `/api/devices/[id]/elements-document` | Upload (or replace) the elements reference document |
| DELETE | `/api/devices/[id]/elements-document` | Delete the elements reference document |

### Protection Elements
| Method | Path | Description |
|---|---|---|
| GET | `/api/devices/[id]/elements` | List elements |
| PUT | `/api/devices/[id]/elements` | Upsert element list |
| GET | `/api/devices/[id]/elements/[eid]` | Get element |
| PUT | `/api/devices/[id]/elements/[eid]` | Update element |
| GET | `/api/devices/[id]/elements/[eid]/settings` | List element settings |
| POST | `/api/devices/[id]/elements/[eid]/settings` | Create setting |
| PUT | `/api/devices/[id]/elements/[eid]/settings/[sid]` | Update setting |
| DELETE | `/api/devices/[id]/elements/[eid]/settings/[sid]` | Delete setting |

### Device Log
| Method | Path | Description |
|---|---|---|
| GET | `/api/devices/[id]/log` | Get log entries |
| POST | `/api/devices/[id]/log` | Add log entry |

### Protection Reports
| Method | Path | Description |
|---|---|---|
| GET | `/api/reports` | List reports |
| POST | `/api/reports` | Upload report |
| GET | `/api/reports/[id]` | Get metadata |
| DELETE | `/api/reports/[id]` | Delete report + file |
| GET | `/api/reports/[id]/download` | Download report file |

### Relay Types (Parts)
| Method | Path | Description |
|---|---|---|
| GET | `/api/parts` | List relay types |
| POST | `/api/parts` | Create relay type |
| GET | `/api/parts/[id]` | Get relay type |
| PUT | `/api/parts/[id]` | Update relay type |
| DELETE | `/api/parts/[id]` | Delete relay type |
| GET | `/api/parts/[id]/manuals` | List manuals |
| POST | `/api/parts/[id]/manuals` | Upload manual |
| DELETE | `/api/parts/[id]/manuals/[mid]` | Delete manual |

### Form Templates (admin only)
| Method | Path | Description |
|---|---|---|
| GET | `/api/form-templates` | List templates |
| POST | `/api/form-templates` | Create template |
| GET | `/api/form-templates/[id]` | Get template |
| PUT | `/api/form-templates/[id]` | Update template |

### ANSI Device Numbers
| Method | Path | Description |
|---|---|---|
| GET | `/api/ansi-device-numbers` | List ANSI codes |
| POST | `/api/ansi-device-numbers` | Create ANSI code (admin) |
| GET | `/api/ansi-device-numbers/[id]` | Get ANSI code |
| PUT | `/api/ansi-device-numbers/[id]` | Update ANSI code (admin) |
| DELETE | `/api/ansi-device-numbers/[id]` | Delete ANSI code (admin) |

### Analytics
| Method | Path | Description |
|---|---|---|
| GET | `/api/analytics` | List saved reports |
| POST | `/api/analytics` | Create saved report (admin) |
| GET | `/api/analytics/[id]` | Get saved report |
| DELETE | `/api/analytics/[id]` | Delete saved report (admin) |
| POST | `/api/analytics/[id]/run` | Execute report — returns `{ columns, rows, summary }` |

### Admin
| Method | Path | Description |
|---|---|---|
| GET | `/api/admin/users` | List users (admin) |
| PUT | `/api/admin/users/[uid]` | Update user role / details (admin) |
| POST | `/api/admin/users/[uid]/reset-password` | Reset a user's password (admin) |
| GET | `/api/admin/db/backup` | Download a zip containing the database + all uploaded files (admin) |
| POST | `/api/admin/db/restore` | Upload a backup zip to restore database + uploaded files (admin) |
| POST | `/api/admin/db/clear` | Delete all app data except users (admin) |

---

## 9. Page Routes

| Route | Access | Description |
|---|---|---|
| `/` | Public | Login page — redirects authenticated users to `/dashboard` |
| `/register` | Public | User self-registration |
| `/dashboard` | All users | Device tree: Station → Unit → System → Devices, collapsible, with search |
| `/devices/new` | All users | Add relay — KKS builder + device-type fields |
| `/devices/[id]` | All users | Relay detail: info panel, form template fields, linked protection report (with link/change/remove button), settings, maintenance history, log |
| `/devices/[id]/edit` | All users | Edit relay metadata and device-specific fields |
| `/devices/[id]/settings` | All users | Settings revision history — upload, list, download |
| `/devices/[id]/elements` | All users | Protection elements — add, enable/disable, edit applied settings; upload/open/delete a reference document explaining the elements |
| `/devices/[id]/maintenance/new` | All users | New maintenance record with dynamic form from template |
| `/devices/[id]/maintenance/[mid]` | All users | View / edit past maintenance record and attached files |
| `/reports` | All users | Standalone protection report library (navigation label: "Protection Reports") |
| `/analytics` | All users | Run saved reports; admin can create / delete reports |
| `/ansi-device-numbers` | All users | Browse ANSI element library; admin can edit |
| `/parts` | Admin only | Relay type catalog |
| `/parts/new` | Admin only | Create relay type |
| `/parts/[id]/edit` | Admin only | Edit relay type, manage manuals |
| `/form-templates` | Admin only | Type template list (dynamic form schema per part number) |
| `/form-templates/new` | Admin only | Create type template ("Extend Type") |
| `/form-templates/[id]/edit` | Admin only | Edit type template field schema |
| `/users` | Admin only | User management — list, reset passwords, assign roles |
| `/admin/database` | Admin only | Database backup, restore, and clear utilities |

---

## 10. Component Library

| Component | Purpose |
|---|---|
| `Nav.tsx` | Left sidebar navigation; shows role-conditional admin links; user email and sign-out. The protection reports link is labelled "Protection Reports". |
| `DeviceTree.tsx` | Hierarchical device tree (Station → Unit → System → Device cards), collapsible, searchable |
| `KKSBuilder.tsx` | 8-field structured input that assembles and previews the `kks_full` string in real time |
| `DynamicFormFields.tsx` | Renders a `FieldSchema[]` as form fields (text, number, select, checkbox, textarea, date) |
| `FormTemplateEditor.tsx` | Admin field-schema builder: add/remove/reorder fields, set type/required/options |
| `FileUploader.tsx` | Generic upload + list + download + delete component used for reports, settings, and test results. Sends filename as explicit `originalName` form field alongside the file blob. |
| `FileInput.tsx` | Single-file input with label; used within forms |
| `LogPanel.tsx` | Device activity log: displays entries, allows manual addition of general/maintenance/settings_change entries |
| `LinkReportButton.tsx` | Client component on the device detail page. Fetches the protection report list, lets the user link or change the report associated with a device (PUT `/api/devices/[id]`), and provides a "Remove link" option. |

---

## 11. Data Layer (lib/)

All database access goes through `lib/db.ts` helpers — no ORM. Each domain module exports typed CRUD functions:

| Module | Domain |
|---|---|
| `db.ts` | SQLite connection, WAL mode, query helpers, `closeDb()` |
| `devices.ts` | Device CRUD + KKS assembly + `getDeviceTree()` |
| `maintenance.ts` | Maintenance records + file metadata |
| `parts.ts` | Relay type catalog + manuals |
| `form-templates.ts` | Dynamic form schema per part number |
| `reports.ts` | Standalone protection report metadata |
| `elements.ts` | Protection elements + applied settings |
| `log.ts` | Device journal (append-only) |
| `settings.ts` | Master settings revisions |
| `ansi.ts` | ANSI device number library |
| `data-reports.ts` | Analytics: saved report CRUD + all `runReport()` SQL |
| `files.ts` | gzip compress/decompress + disk I/O + MIME guessing |
| `kks.ts` | `assembleKKS()` + `parseKKS()` |
| `session.ts` | `getSession()` + standard HTTP error helpers |
| `auth.ts` | better-auth singleton (server) |
| `auth-client.ts` | better-auth client SDK (`useSession`, `signIn`, `signOut`) |
| `report-types.ts` | Client-safe `REPORT_TYPES` constant (no server imports) |

> `report-types.ts` exists as a separate file so the client bundle can import report type labels without pulling in server-side SQLite imports.

---

## 12. Auth & Security

- **Middleware (`middleware.ts`):** Edge layer that runs before every matched request. Provides:
  - Rate limiting on sign-in/sign-up (10 requests per 15 minutes per IP) to limit brute force
  - Cookie presence pre-check for API routes (returns 401) and page routes (redirects to `/`) — a fast first filter before the database is touched
- **Session validation:** Every API route handler calls `getSession()` for full signature/expiry verification, not just cookie presence
- **Role enforcement:** Admin-only routes check `session.user.role === 'admin'` and return 403 if not
- **Path traversal:** All stored filenames are run through `path.basename()` before constructing disk paths
- **LIKE injection:** Firmware search uses `LIKE ? ESCAPE '\\'` with parameterised values — no string interpolation into SQL
- **SQL injection:** All user input goes through parameterised queries — no string-interpolated SQL except for safe integer clamping in `months_ahead`
- **Backup zip validation:** Restore endpoint checks the zip contains `app.db` and validates its SQLite magic bytes (`SQLite format 3\x00`) before touching anything on disk
- **Roles:** `user` (default) and `admin`. Role stored on the `user` table via better-auth's `additionalFields`

---

## 13. Environment Variables

```bash
BETTER_AUTH_SECRET=<random 32+ character string>
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000
BETTER_AUTH_TRUSTED_ORIGINS=http://localhost:3000
```

For the Raspberry Pi deployment, replace `localhost:3000` with the device's LAN IP or Tailscale address. The `NEXT_PUBLIC_` variable must also be set for client-side auth redirects to work.

---

## 14. Database Administration

Accessible at `/admin/database` (admin only):

- **Backup** — Checkpoints the WAL (`PRAGMA wal_checkpoint(TRUNCATE)`), then builds a zip archive containing `app.db` and the full `public/uploads/` tree. Download is a single `.zip` file that is a complete recovery point.
- **Restore** — Accepts the backup zip, validates it contains `app.db` with correct SQLite magic bytes, then closes the live connection, overwrites `data/app.db`, and extracts all `uploads/*` entries back to `public/uploads/`. The database connection is re-established automatically on the next request.
- **Format:** Backup and restore use `fflate` (pure JavaScript zip library — no native compilation required, works on ARM64).
- **Clear** — Disables foreign key enforcement, deletes all application data tables, re-enables FK enforcement. User/session/account/verification tables are intentionally preserved so admins can continue to log in after a clear.

---

## 15. Database Migrations

Schema changes after the initial `init-db` are applied as idempotent migration scripts in `scripts/`. Each script checks whether the target column already exists before running `ALTER TABLE`, so re-running is safe. Run with:

```bash
bun --bun scripts/<migration-name>.ts
```

| Script | Change |
|---|---|
| `migrate-add-relay-tested-checks.ts` | Adds `relay_tested_analogues` and `relay_tested_comprehensive` columns to the `maintenance` table |
| `migrate-add-elements-doc.ts` | Adds `elements_doc_filename` and `elements_doc_original_name` columns to the `devices` table |

> **Note:** Backup the database (`/admin/database → Backup`) before running any migration in production.
