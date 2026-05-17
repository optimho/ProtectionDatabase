import { query, get, run } from "./db";
import { nanoid } from "nanoid";

export type RelayType = "Electromechanical" | "Electronic" | "Microprocessor";
export const RELAY_TYPES: RelayType[] = ["Electromechanical", "Electronic", "Microprocessor"];

export interface Part {
  id: string;
  part_number: string;
  device_type: string;
  relay_type: RelayType;
  description: string;
  firmware: string;
  nominal_supply_voltage: string;
  nominal_ct_input: string;
  nominal_vt_input: string;
  stock_number: string;
  created_at: string;
  updated_at: string;
}

export interface PartManual {
  id: string;
  part_id: string;
  filename: string;
  original_name: string;
  description: string;
  created_at: string;
}

export async function listParts(): Promise<Part[]> {
  return query<Part>("SELECT * FROM parts ORDER BY part_number");
}

export async function getPart(id: string): Promise<Part | undefined> {
  return get<Part>("SELECT * FROM parts WHERE id = ?", [id]);
}

export async function getPartByNumber(part_number: string): Promise<Part | undefined> {
  return get<Part>("SELECT * FROM parts WHERE part_number = ?", [part_number]);
}

export async function createPart(
  input: Omit<Part, "id" | "created_at" | "updated_at">
): Promise<Part> {
  const id = nanoid();
  await run(
    `INSERT INTO parts (id,part_number,device_type,relay_type,description,firmware,nominal_supply_voltage,nominal_ct_input,nominal_vt_input,stock_number)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [id, input.part_number, input.device_type, input.relay_type, input.description, input.firmware, input.nominal_supply_voltage, input.nominal_ct_input, input.nominal_vt_input, input.stock_number]
  );
  return (await getPart(id))!;
}

export async function updatePart(
  id: string,
  input: Partial<Omit<Part, "id" | "created_at" | "updated_at">>
): Promise<void> {
  const entries = Object.entries(input).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return;
  const fields = entries.map(([k]) => `${k} = ?`);
  const values = entries.map(([, v]) => v);
  await run(
    `UPDATE parts SET ${fields.join(", ")}, updated_at=datetime('now') WHERE id = ?`,
    [...values, id]
  );
}

export async function deletePart(id: string): Promise<void> {
  await run("DELETE FROM parts WHERE id = ?", [id]);
}

// ── Manuals ──────────────────────────────────────────────────────────────────

export async function listManuals(partId: string): Promise<PartManual[]> {
  return query<PartManual>(
    "SELECT * FROM part_manuals WHERE part_id = ? ORDER BY created_at DESC",
    [partId]
  );
}

export async function getManual(id: string): Promise<PartManual | undefined> {
  return get<PartManual>("SELECT * FROM part_manuals WHERE id = ?", [id]);
}

export async function createManual(
  input: Omit<PartManual, "id" | "created_at">
): Promise<PartManual> {
  const id = nanoid();
  await run(
    "INSERT INTO part_manuals (id,part_id,filename,original_name,description) VALUES (?,?,?,?,?)",
    [id, input.part_id, input.filename, input.original_name, input.description]
  );
  return (await getManual(id))!;
}

export async function deleteManual(id: string): Promise<void> {
  await run("DELETE FROM part_manuals WHERE id = ?", [id]);
}
