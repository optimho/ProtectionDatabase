import { query, get, run } from "./db";
import { nanoid } from "nanoid";

export interface MaintenanceRecord {
  id: string;
  device_id: string;
  date: string;
  settings_checked_to_master: number;
  onload_check: number;
  trip_function_proved: number;
  ct_secondary_insulation_check: number;
  vt_secondary_insulation_check: number;
  ct_loop_check: number;
  vt_loop_check: number;
  notes: string;
  form_data_json: string;
  log_id: string | null;
  created_by: string;
  created_at: string;
}

export interface MaintenanceFile {
  id: string;
  maintenance_id: string;
  file_type: "asleft_settings" | "electronic_test" | "test_report" | "misc";
  filename: string;
  original_name: string;
  description: string;
  created_at: string;
}

export async function listMaintenance(device_id: string): Promise<MaintenanceRecord[]> {
  return query<MaintenanceRecord>(
    "SELECT * FROM maintenance WHERE device_id = ? ORDER BY date DESC",
    [device_id]
  );
}

export async function getMaintenance(id: string): Promise<MaintenanceRecord | undefined> {
  return get<MaintenanceRecord>("SELECT * FROM maintenance WHERE id = ?", [id]);
}

export async function createMaintenance(
  input: Omit<MaintenanceRecord, "id" | "created_at">
): Promise<MaintenanceRecord> {
  const id = nanoid();
  await run(
    `INSERT INTO maintenance (
      id, device_id, date,
      settings_checked_to_master, onload_check, trip_function_proved,
      ct_secondary_insulation_check, vt_secondary_insulation_check,
      ct_loop_check, vt_loop_check,
      notes, form_data_json, log_id, created_by
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      id, input.device_id, input.date,
      input.settings_checked_to_master, input.onload_check, input.trip_function_proved,
      input.ct_secondary_insulation_check, input.vt_secondary_insulation_check,
      input.ct_loop_check, input.vt_loop_check,
      input.notes, input.form_data_json, input.log_id ?? null,
      input.created_by,
    ]
  );
  return (await getMaintenance(id))!;
}

export async function updateMaintenance(
  id: string,
  input: Partial<Omit<MaintenanceRecord, "id" | "device_id" | "created_by" | "created_at">>
): Promise<void> {
  const fields = Object.entries(input)
    .filter(([, v]) => v !== undefined)
    .map(([k]) => `${k} = ?`);
  const values = Object.entries(input)
    .filter(([, v]) => v !== undefined)
    .map(([, v]) => v);
  if (fields.length === 0) return;
  await run(`UPDATE maintenance SET ${fields.join(", ")} WHERE id = ?`, [...values, id]);
}

export async function listMaintenanceFiles(maintenance_id: string): Promise<MaintenanceFile[]> {
  return query<MaintenanceFile>(
    "SELECT * FROM maintenance_files WHERE maintenance_id = ? ORDER BY created_at",
    [maintenance_id]
  );
}

export async function addMaintenanceFile(
  input: Omit<MaintenanceFile, "id" | "created_at">
): Promise<MaintenanceFile> {
  const id = nanoid();
  await run(
    "INSERT INTO maintenance_files (id,maintenance_id,file_type,filename,original_name,description) VALUES (?,?,?,?,?,?)",
    [id, input.maintenance_id, input.file_type, input.filename, input.original_name, input.description]
  );
  const rows = await query<MaintenanceFile>("SELECT * FROM maintenance_files WHERE id = ?", [id]);
  return rows[0];
}

export async function getMaintenanceFile(id: string): Promise<MaintenanceFile | undefined> {
  return get<MaintenanceFile>("SELECT * FROM maintenance_files WHERE id = ?", [id]);
}

export async function deleteMaintenanceFile(id: string): Promise<void> {
  await run("DELETE FROM maintenance_files WHERE id = ?", [id]);
}
