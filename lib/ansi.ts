import { query, get, run } from "./db";
import { nanoid } from "nanoid";

export interface AnsiDeviceNumber {
  id: string;
  device_number: string;
  common_name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export async function listAnsiCodes(): Promise<AnsiDeviceNumber[]> {
  return query<AnsiDeviceNumber>(
    "SELECT * FROM ansi_device_numbers ORDER BY CAST(device_number AS REAL), device_number"
  );
}

export async function getAnsiCode(id: string): Promise<AnsiDeviceNumber | undefined> {
  return get<AnsiDeviceNumber>("SELECT * FROM ansi_device_numbers WHERE id = ?", [id]);
}

export async function createAnsiCode(
  input: Pick<AnsiDeviceNumber, "device_number" | "common_name" | "description">
): Promise<AnsiDeviceNumber> {
  const id = nanoid();
  await run(
    "INSERT INTO ansi_device_numbers (id, device_number, common_name, description) VALUES (?, ?, ?, ?)",
    [id, input.device_number, input.common_name, input.description]
  );
  return (await getAnsiCode(id))!;
}

export async function updateAnsiCode(
  id: string,
  input: Partial<Pick<AnsiDeviceNumber, "device_number" | "common_name" | "description">>
): Promise<void> {
  await run(
    `UPDATE ansi_device_numbers SET
      device_number = COALESCE(?, device_number),
      common_name   = COALESCE(?, common_name),
      description   = COALESCE(?, description),
      updated_at    = datetime('now')
     WHERE id = ?`,
    [input.device_number ?? null, input.common_name ?? null, input.description ?? null, id]
  );
}

export async function deleteAnsiCode(id: string): Promise<void> {
  await run("DELETE FROM ansi_device_numbers WHERE id = ?", [id]);
}
