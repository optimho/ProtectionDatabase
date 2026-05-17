import { query, run } from "./db";
import { nanoid } from "nanoid";

export interface MasterSetting {
  id: string;
  device_id: string;
  revision: string;
  date: string;
  description: string;
  filename: string;
  created_by: string;
  created_at: string;
}

export async function listSettings(device_id: string): Promise<MasterSetting[]> {
  return query<MasterSetting>(
    "SELECT * FROM master_settings WHERE device_id = ? ORDER BY date DESC, created_at DESC",
    [device_id]
  );
}

export async function createSetting(input: Omit<MasterSetting, "id" | "created_at">): Promise<MasterSetting> {
  const id = nanoid();
  await run(
    "INSERT INTO master_settings (id,device_id,revision,date,description,filename,created_by) VALUES (?,?,?,?,?,?,?)",
    [id, input.device_id, input.revision, input.date, input.description, input.filename, input.created_by]
  );
  const rows = await query<MasterSetting>("SELECT * FROM master_settings WHERE id = ?", [id]);
  return rows[0];
}

export async function deleteSetting(id: string): Promise<void> {
  await run("DELETE FROM master_settings WHERE id = ?", [id]);
}
