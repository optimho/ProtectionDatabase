/**
 * lib/data-reports.ts — Analytics report definitions and SQL runners
 *
 * Saved report definitions live in the data_reports table. Each record
 * stores the report type and optional parameter filters (dates, station,
 * device KKS, etc.) as JSON. Any user can run a saved report; only admins
 * can create or delete them.
 *
 * runReport() dispatches to the appropriate private function based on
 * report_type. Each function executes a SQL query and returns a uniform
 * { columns, rows, summary } structure that the analytics page renders as
 * a table and can export to CSV.
 *
 * NOTE: This file imports better-sqlite3 indirectly via db.ts and must
 * never be imported by client components. Use lib/report-types.ts for
 * the REPORT_TYPES constant in client code.
 */

import { query, get, run } from "./db";
import { nanoid } from "nanoid";
export { REPORT_TYPES } from "./report-types";
export type { ReportType } from "./report-types";
import type { ReportType } from "./report-types";

export interface ReportParameters {
  date_from?: string;
  date_to?: string;
  station?: string;
  device_kks?: string;   // filter elements_per_relay to a single device
  months_ahead?: number;    // maintenance_upcoming: look-ahead window in months
  firmware_filter?: string; // firmware_search: partial firmware string to match
}

// ── Saved report definitions ───────────────────────────────────────────────

export interface DataReport {
  id: string;
  name: string;
  description: string;
  report_type: ReportType;
  parameters_json: string;
  created_by: string;
  created_at: string;
}

export async function listDataReports(): Promise<DataReport[]> {
  return query<DataReport>("SELECT * FROM data_reports ORDER BY created_at DESC");
}

export async function getDataReport(id: string): Promise<DataReport | undefined> {
  return get<DataReport>("SELECT * FROM data_reports WHERE id = ?", [id]);
}

export async function createDataReport(input: {
  name: string;
  description?: string;
  report_type: ReportType;
  parameters?: ReportParameters;
  created_by: string;
}): Promise<DataReport> {
  const id = nanoid();
  await run(
    "INSERT INTO data_reports (id, name, description, report_type, parameters_json, created_by) VALUES (?,?,?,?,?,?)",
    [id, input.name, input.description ?? "", input.report_type, JSON.stringify(input.parameters ?? {}), input.created_by]
  );
  return (await getDataReport(id))!;
}

export async function deleteDataReport(id: string): Promise<void> {
  await run("DELETE FROM data_reports WHERE id = ?", [id]);
}

// ── Report runner ──────────────────────────────────────────────────────────

export interface ReportColumn {
  key: string;
  label: string;
}

export interface ReportResult {
  columns: ReportColumn[];
  rows: Record<string, string | number | null>[];
  summary?: string;
}

export async function runReport(report: DataReport): Promise<ReportResult> {
  const params: ReportParameters = JSON.parse(report.parameters_json ?? "{}");

  switch (report.report_type) {
    case "device_inventory":
      return runDeviceInventory(params);
    case "maintenance_due":
      return runMaintenanceDue();
    case "eipc_compliance":
      return runEipcCompliance();
    case "maintenance_history":
      return runMaintenanceHistory(params);
    case "protection_elements":
      return runProtectionElements();
    case "elements_per_relay":
      return runElementsPerRelay(params);
    case "maintenance_upcoming":
      return runMaintenanceUpcoming(params);
    case "firmware_search":
      return runFirmwareSearch(params);
    default:
      throw new Error(`Unknown report type: ${report.report_type}`);
  }
}

// ── Device Inventory ──────────────────────────────────────────────────────

async function runDeviceInventory(params: ReportParameters): Promise<ReportResult> {
  const where = params.station ? "WHERE d.kks_station = ?" : "";
  const args = params.station ? [params.station] : [];

  const rows = await query<Record<string, string | number | null>>(
    `SELECT
       d.kks_station                  AS "Station",
       d.part_number                  AS "Part Number",
       COALESCE(d.firmware, '—')      AS "Firmware"
     FROM devices d
     LEFT JOIN parts p ON p.part_number = d.part_number
     ${where}
     GROUP BY d.kks_station, d.part_number, d.firmware
     ORDER BY d.kks_station, d.part_number`,
    args
  );

  return {
    columns: [
      { key: "Station",     label: "Station" },
      { key: "Part Number", label: "Part Number" },
      { key: "Firmware",    label: "Firmware" },
    ],
    rows,
    summary: `${rows.length} combination${rows.length !== 1 ? "s" : ""} across ${new Set(rows.map((r) => r["Station"])).size} station${new Set(rows.map((r) => r["Station"])).size !== 1 ? "s" : ""}`,
  };
}

// ── Maintenance Due ───────────────────────────────────────────────────────

async function runMaintenanceDue(): Promise<ReportResult> {
  const rows = await query<Record<string, string | number | null>>(
    `SELECT
       d.kks_full                                       AS "KKS Code",
       d.device_location                                AS "Location",
       COALESCE(MAX(m.date), '—')                       AS "Last Maintenance",
       CASE
         WHEN d.maintenance_period_years <= 0 THEN '—'
         WHEN MAX(m.date) IS NULL THEN 'No record'
         ELSE date(MAX(m.date), '+' || CAST(ROUND(d.maintenance_period_years * 365) AS INT) || ' days')
       END                                              AS "Next Due",
       CASE
         WHEN d.maintenance_period_years <= 0 THEN 'No period set'
         WHEN MAX(m.date) IS NULL THEN 'Overdue — never maintained'
         WHEN date(MAX(m.date), '+' || CAST(ROUND(d.maintenance_period_years * 365) AS INT) || ' days') <= date('now') THEN 'OVERDUE'
         ELSE 'OK'
       END                                              AS "Status"
     FROM devices d
     LEFT JOIN maintenance m ON m.device_id = d.id
     GROUP BY d.id
     HAVING "Status" IN ('OVERDUE', 'Overdue — never maintained')
     ORDER BY "Next Due" ASC, d.kks_full ASC`
  );

  return {
    columns: [
      { key: "KKS Code", label: "KKS Code" },
      { key: "Location", label: "Location" },
      { key: "Last Maintenance", label: "Last Maintenance" },
      { key: "Next Due", label: "Next Due" },
      { key: "Status", label: "Status" },
    ],
    rows,
    summary: rows.length === 0 ? "No devices overdue" : `${rows.length} device${rows.length !== 1 ? "s" : ""} overdue`,
  };
}

// ── EIPC Compliance ───────────────────────────────────────────────────────

async function runEipcCompliance(): Promise<ReportResult> {
  const rows = await query<Record<string, string | number | null>>(
    `SELECT
       d.kks_full                       AS "KKS Code",
       d.device_type                    AS "Device Type",
       d.device_location                AS "Location",
       d.circuit                        AS "Circuit",
       COALESCE(MAX(m.date), '—')       AS "Last Maintenance",
       d.maintenance_period_years       AS "Period (years)"
     FROM devices d
     LEFT JOIN maintenance m ON m.device_id = d.id
     WHERE d.eipc = 1
     GROUP BY d.id
     ORDER BY d.kks_full`
  );

  return {
    columns: [
      { key: "KKS Code", label: "KKS Code" },
      { key: "Device Type", label: "Device Type" },
      { key: "Location", label: "Location" },
      { key: "Circuit", label: "Circuit" },
      { key: "Last Maintenance", label: "Last Maintenance" },
      { key: "Period (years)", label: "Period (years)" },
    ],
    rows,
    summary: `${rows.length} EIPC-required device${rows.length !== 1 ? "s" : ""}`,
  };
}

// ── Maintenance History ───────────────────────────────────────────────────

async function runMaintenanceHistory(params: ReportParameters): Promise<ReportResult> {
  const from = params.date_from ?? "1900-01-01";
  const to   = params.date_to   ?? "2999-12-31";

  const rows = await query<Record<string, string | number | null>>(
    `SELECT
       m.date                                           AS "Date",
       d.kks_full                                       AS "KKS Code",
       d.device_type                                    AS "Device Type",
       d.device_location                                AS "Location",
       CASE WHEN m.settings_checked_to_master THEN 'Yes' ELSE 'No' END AS "Settings Checked",
       CASE WHEN m.trip_function_proved       THEN 'Yes' ELSE 'No' END AS "Trip Proved",
       COALESCE(m.notes, '—')                           AS "Notes"
     FROM maintenance m
     JOIN devices d ON d.id = m.device_id
     WHERE m.date BETWEEN ? AND ?
     ORDER BY m.date DESC`,
    [from, to]
  );

  return {
    columns: [
      { key: "Date", label: "Date" },
      { key: "KKS Code", label: "KKS Code" },
      { key: "Device Type", label: "Device Type" },
      { key: "Location", label: "Location" },
      { key: "Settings Checked", label: "Settings Checked" },
      { key: "Trip Proved", label: "Trip Proved" },
      { key: "Notes", label: "Notes" },
    ],
    rows,
    summary: `${rows.length} maintenance record${rows.length !== 1 ? "s" : ""}${params.date_from || params.date_to ? ` from ${from} to ${to}` : ""}`,
  };
}

// ── Protection Elements ───────────────────────────────────────────────────

async function runProtectionElements(): Promise<ReportResult> {
  const rows = await query<Record<string, string | number | null>>(
    `SELECT
       a.device_number          AS "ANSI No.",
       a.common_name            AS "Name",
       COUNT(pe.id)             AS "In Use",
       COUNT(DISTINCT pe.device_id) AS "Devices"
     FROM ansi_device_numbers a
     LEFT JOIN protection_elements pe ON pe.ansi_id = a.id
     GROUP BY a.id
     ORDER BY "In Use" DESC, a.device_number ASC`
  );

  const inUse = rows.filter((r) => Number(r["In Use"]) > 0).length;

  return {
    columns: [
      { key: "ANSI No.", label: "ANSI No." },
      { key: "Name", label: "Name" },
      { key: "In Use", label: "Elements" },
      { key: "Devices", label: "Devices" },
    ],
    rows,
    summary: `${inUse} ANSI element type${inUse !== 1 ? "s" : ""} in use across the fleet`,
  };
}

// ── Protection Elements per Relay ─────────────────────────────────────────

async function runElementsPerRelay(params: ReportParameters): Promise<ReportResult> {
  const conditions: string[] = [];
  const args: string[] = [];
  if (params.device_kks) { conditions.push("d.kks_full = ?");    args.push(params.device_kks); }
  else if (params.station) { conditions.push("d.kks_station = ?"); args.push(params.station); }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  // One row per setting (LEFT JOIN so elements with no settings still appear)
  const rows = await query<Record<string, string | number | null>>(
    `SELECT
       d.kks_full                                                          AS "KKS Code",
       COALESCE(a.device_number, '—')                                      AS "ANSI No.",
       COALESCE(NULLIF(pe.custom_name, ''), a.common_name, '—')           AS "Element",
       COALESCE(es.setting_name, '—')                                     AS "Setting",
       COALESCE(es.value, '—')                                            AS "Value",
       COALESCE(NULLIF(es.unit, ''), '—')                                 AS "Unit",
       COALESCE(NULLIF(es.description, ''), '—')                         AS "Description"
     FROM devices d
     JOIN protection_elements pe ON pe.device_id = d.id
     LEFT JOIN ansi_device_numbers a ON a.id = pe.ansi_id
     LEFT JOIN element_settings es ON es.element_id = pe.id
     ${where}
     ORDER BY d.kks_full ASC, pe.sort_order ASC, es.sort_order ASC`,
    args
  );

  const deviceCount = new Set(rows.map((r) => r["KKS Code"])).size;
  const scopeLabel = params.device_kks
    ? `for ${params.device_kks}`
    : params.station
    ? `in station ${params.station}`
    : "across all devices";

  return {
    columns: [
      { key: "KKS Code",    label: "KKS Code" },
      { key: "ANSI No.",    label: "ANSI No." },
      { key: "Element",     label: "Element" },
      { key: "Setting",     label: "Setting" },
      { key: "Value",       label: "Value" },
      { key: "Unit",        label: "Unit" },
      { key: "Description", label: "Description" },
    ],
    rows,
    summary: `${rows.length} setting${rows.length !== 1 ? "s" : ""} ${scopeLabel}`,
  };
}

// ── Maintenance Upcoming ──────────────────────────────────────────────────

async function runMaintenanceUpcoming(params: ReportParameters): Promise<ReportResult> {
  // Default to 3 months if not specified; clamp to a safe integer to avoid SQL injection
  const months = Math.max(1, Math.min(120, Math.round(Number(params.months_ahead) || 3)));
  const cutoff = `date('now', '+${months} months')`;

  const rows = await query<Record<string, string | number | null>>(
    `SELECT
       d.kks_full                                       AS "KKS Code",
       d.device_location                                AS "Location",
       COALESCE(MAX(m.date), '—')                       AS "Last Maintenance",
       date(MAX(m.date), '+' || CAST(ROUND(d.maintenance_period_years * 365) AS INT) || ' days')
                                                        AS "Next Due"
     FROM devices d
     LEFT JOIN maintenance m ON m.device_id = d.id
     WHERE d.maintenance_period_years > 0
     GROUP BY d.id
     HAVING "Next Due" > date('now')
        AND "Next Due" <= ${cutoff}
     ORDER BY "Next Due" ASC`
  );

  return {
    columns: [
      { key: "KKS Code",        label: "KKS Code" },
      { key: "Location",        label: "Location" },
      { key: "Last Maintenance", label: "Last Maintenance" },
      { key: "Next Due",        label: "Next Due" },
    ],
    rows,
    summary: rows.length === 0
      ? `No devices due in the next ${months} month${months !== 1 ? "s" : ""}`
      : `${rows.length} device${rows.length !== 1 ? "s" : ""} due within ${months} month${months !== 1 ? "s" : ""}`,
  };
}

// ── Firmware Search ───────────────────────────────────────────────────────

async function runFirmwareSearch(params: ReportParameters): Promise<ReportResult> {
  const filter = (params.firmware_filter ?? "").trim();
  if (!filter) {
    return {
      columns: [
        { key: "KKS Code",    label: "KKS Code" },
        { key: "Part Number", label: "Part Number" },
        { key: "Firmware",    label: "Firmware" },
        { key: "Location",    label: "Location" },
        { key: "Circuit",     label: "Circuit" },
      ],
      rows: [],
      summary: "No firmware filter specified",
    };
  }

  const rows = await query<Record<string, string | number | null>>(
    `SELECT
       d.kks_full               AS "KKS Code",
       d.part_number            AS "Part Number",
       d.firmware               AS "Firmware",
       d.device_location        AS "Location",
       d.circuit                AS "Circuit"
     FROM devices d
     WHERE d.firmware LIKE ? ESCAPE '\\'
     ORDER BY d.firmware ASC, d.kks_full ASC`,
    [`%${filter}%`]
  );

  return {
    columns: [
      { key: "KKS Code",    label: "KKS Code" },
      { key: "Part Number", label: "Part Number" },
      { key: "Firmware",    label: "Firmware" },
      { key: "Location",    label: "Location" },
      { key: "Circuit",     label: "Circuit" },
    ],
    rows,
    summary: rows.length === 0
      ? `No devices found matching firmware "${filter}"`
      : `${rows.length} device${rows.length !== 1 ? "s" : ""} matching firmware "${filter}"`,
  };
}
