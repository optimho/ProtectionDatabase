/**
 * lib/report-types.ts — Client-safe analytics report type definitions
 *
 * This file intentionally contains NO server-side imports (no db, no fs,
 * no better-sqlite3). It exists so the analytics page component can import
 * the report type labels and descriptions without pulling the full
 * data-reports module into the browser bundle.
 *
 * If REPORT_TYPES were imported directly from data-reports.ts, Next.js
 * would try to bundle better-sqlite3 (a native Node.js module) into the
 * client bundle and fail with "Module not found: Can't resolve 'fs'".
 *
 * data-reports.ts re-exports from here so server-side code has one import.
 */

export const REPORT_TYPES = [
  {
    value: "device_inventory",
    label: "Device Inventory",
    description: "Count of relays by station, relay type and EIPC status.",
  },
  {
    value: "maintenance_due",
    label: "Maintenance Due",
    description: "Devices overdue or with no maintenance recorded, based on their maintenance period.",
  },
  {
    value: "eipc_compliance",
    label: "EIPC Compliance",
    description: "All EIPC-required devices and their last maintenance date.",
  },
  {
    value: "maintenance_history",
    label: "Maintenance History",
    description: "All maintenance records between two dates.",
  },
  {
    value: "protection_elements",
    label: "Protection Elements",
    description: "ANSI protection elements in use across the device fleet.",
  },
  {
    value: "elements_per_relay",
    label: "Protection Elements per Relay",
    description: "All protection elements and their applied settings for each relay. Optional station filter.",
  },
  {
    value: "maintenance_upcoming",
    label: "Maintenance Upcoming",
    description: "Devices whose next maintenance falls within a set number of months from today.",
  },
  {
    value: "firmware_search",
    label: "Firmware Search",
    description: "Find all devices matching a firmware string (partial match — e.g. 'R31' matches R311, R312).",
  },
] as const;

export type ReportType = typeof REPORT_TYPES[number]["value"];
