/**
 * lib/devices.ts — Protection relay device CRUD
 *
 * A Device represents a single installed protection relay. The record holds:
 *   - Physical identity: part_number, firmware, serial_number
 *   - Location: KKS code (8 parts stored individually + assembled kks_full)
 *   - Operational: circuit, device_location, commissioning_date
 *   - Compliance: eipc flag, maintenance_period_years
 *   - Type-specific data: device_fields_json (values for the form_template fields)
 *   - Optional report link: report_id → protection_reports
 *
 * Cascading deletes are defined at the DB level, so deleting a device also
 * removes its maintenance records, log entries, settings revisions, and
 * protection elements automatically.
 */

import { query, get, run } from "./db";
import { assembleKKS, type KKSParts } from "./kks";
import { nanoid } from "nanoid";

export interface Device extends KKSParts {
  id: string;
  part_number: string;
  device_type: string;
  firmware: string | null;
  serial_number: string | null;
  commissioning_date: string | null;
  device_location: string;
  circuit: string;
  kks_full: string;                   // assembled from the 8 KKS parts
  report_id: string | null;           // optional link to a protection report
  elements_doc_filename: string | null;      // uploaded protection elements document
  elements_doc_original_name: string | null;
  eipc: number;                       // 1 = EIPC compliance testing required
  maintenance_period_years: number;   // retest interval; 0 means no period set
  device_fields_json: string;         // JSON object: values for form_template fields
  decommissioned_at: string | null;   // ISO datetime when decommissioned, null = active
  decommissioned_by_name: string;
  decommission_reason: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export async function listDevices(): Promise<Device[]> {
  return query<Device>("SELECT * FROM devices WHERE decommissioned_at IS NULL ORDER BY kks_full");
}

export async function listAllDevices(): Promise<Device[]> {
  return query<Device>("SELECT * FROM devices ORDER BY kks_full");
}

export async function getDevice(id: string): Promise<Device | undefined> {
  return get<Device>("SELECT * FROM devices WHERE id = ?", [id]);
}

export async function getDeviceByKKS(kks_full: string): Promise<Device | undefined> {
  return get<Device>("SELECT * FROM devices WHERE kks_full = ?", [kks_full]);
}

export interface CreateDeviceInput extends KKSParts {
  part_number: string;
  device_type: string;
  firmware?: string;
  serial_number?: string;
  commissioning_date?: string;
  device_location: string;
  circuit: string;
  report_id?: string;
  eipc?: boolean;
  maintenance_period_years?: number;
  device_fields_json?: string;
  created_by: string;
}

export async function createDevice(input: CreateDeviceInput): Promise<Device> {
  const id = nanoid();
  // Assemble kks_full from the eight KKS parts before inserting.
  // The assembled string is also stored separately for fast UNIQUE lookups.
  const kks_full = assembleKKS(input);
  await run(
    `INSERT INTO devices (
      id, part_number, device_type, firmware, serial_number, commissioning_date,
      device_location, circuit,
      kks_station, kks_unit, kks_system_code, kks_system_number,
      kks_equipment_unit_code, kks_equipment_number,
      kks_component_code, kks_component_number, kks_full,
      report_id, eipc, maintenance_period_years, device_fields_json, created_by
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      id, input.part_number, input.device_type, input.firmware ?? null,
      input.serial_number ?? null, input.commissioning_date ?? null,
      input.device_location, input.circuit,
      input.kks_station, input.kks_unit, input.kks_system_code, input.kks_system_number,
      input.kks_equipment_unit_code, input.kks_equipment_number,
      input.kks_component_code, input.kks_component_number, kks_full,
      input.report_id ?? null, input.eipc ? 1 : 0,
      input.maintenance_period_years ?? 0, input.device_fields_json ?? "{}",
      input.created_by,
    ]
  );
  return (await getDevice(id))!;
}

/**
 * Partial update — merges the supplied fields with the existing record
 * so callers only need to send what changed. KKS assembly is re-run
 * because any of the eight KKS parts might have been edited.
 */
export async function updateDevice(id: string, input: Partial<CreateDeviceInput>): Promise<void> {
  const existing = await getDevice(id);
  if (!existing) throw new Error("Device not found");

  const merged = { ...existing, ...input };
  const kks_full = assembleKKS(merged);

  await run(
    `UPDATE devices SET
      part_number=?, device_type=?, firmware=?, serial_number=?, commissioning_date=?,
      device_location=?, circuit=?,
      kks_station=?, kks_unit=?, kks_system_code=?, kks_system_number=?,
      kks_equipment_unit_code=?, kks_equipment_number=?,
      kks_component_code=?, kks_component_number=?, kks_full=?,
      report_id=?, eipc=?, maintenance_period_years=?, device_fields_json=?, updated_at=datetime('now')
    WHERE id=?`,
    [
      merged.part_number, merged.device_type, merged.firmware ?? null,
      merged.serial_number ?? null, merged.commissioning_date ?? null,
      merged.device_location, merged.circuit,
      merged.kks_station, merged.kks_unit, merged.kks_system_code, merged.kks_system_number,
      merged.kks_equipment_unit_code, merged.kks_equipment_number,
      merged.kks_component_code, merged.kks_component_number, kks_full,
      merged.report_id ?? null, merged.eipc ? 1 : 0,
      merged.maintenance_period_years ?? 0, merged.device_fields_json ?? "{}",
      id,
    ]
  );
}

/**
 * Delete a device. Cascading deletes in the schema remove all related
 * maintenance records, log entries, settings, and protection elements.
 */
export async function deleteDevice(id: string): Promise<void> {
  await run("DELETE FROM devices WHERE id = ?", [id]);
}

export async function decommissionDevice(
  id: string,
  byName: string,
  reason: string
): Promise<void> {
  await run(
    `UPDATE devices SET decommissioned_at = datetime('now'), decommissioned_by_name = ?, decommission_reason = ?, updated_at = datetime('now') WHERE id = ?`,
    [byName, reason, id]
  );
}

/**
 * Build a tree structure for the dashboard device browser.
 * Groups devices by Station → Unit → System Code so the UI can render
 * a collapsible three-level hierarchy without a recursive SQL query.
 *
 * Example:  tree["THI"]["1"]["BBA"] → Device[]
 */
export async function getDeviceTree(): Promise<DeviceTree> {
  const devices = await listDevices();
  const tree: DeviceTree = {};
  for (const d of devices) {
    const s = d.kks_station;
    const u = d.kks_unit;
    const sys = d.kks_system_code;
    tree[s] ??= {};
    tree[s][u] ??= {};
    tree[s][u][sys] ??= [];
    tree[s][u][sys].push(d);
  }
  return tree;
}

/** station → unit → system_code → devices */
export type DeviceTree = Record<string, Record<string, Record<string, Device[]>>>;
