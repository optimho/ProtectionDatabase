import { query, run } from "./db";
import { nanoid } from "nanoid";

export interface LogEntry {
  id: string;
  device_id: string;
  entry_type: "general" | "maintenance" | "settings_change";
  notes: string;
  created_by: string;
  created_at: string;
}

export async function getLog(device_id: string): Promise<LogEntry[]> {
  return query<LogEntry>(
    "SELECT * FROM log WHERE device_id = ? ORDER BY created_at DESC",
    [device_id]
  );
}

export async function addLogEntry(input: Omit<LogEntry, "id" | "created_at">): Promise<string> {
  const id = nanoid();
  await run(
    "INSERT INTO log (id,device_id,entry_type,notes,created_by) VALUES (?,?,?,?,?)",
    [id, input.device_id, input.entry_type, input.notes, input.created_by]
  );
  return id;
}
