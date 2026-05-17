import { query, get, run } from "./db";
import { nanoid } from "nanoid";

export interface ProtectionElement {
  id: string;
  device_id: string;
  ansi_id: string | null;
  custom_name: string;
  description: string;
  enabled: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
  // Joined from ansi_device_numbers
  ansi_device_number?: string;
  ansi_common_name?: string;
}

export interface ElementSetting {
  id: string;
  element_id: string;
  setting_name: string;
  custom_name: string;
  description: string;
  value: string;
  unit: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export async function listElements(device_id: string): Promise<ProtectionElement[]> {
  return query<ProtectionElement>(
    `SELECT pe.*,
            a.device_number AS ansi_device_number,
            a.common_name   AS ansi_common_name
     FROM protection_elements pe
     LEFT JOIN ansi_device_numbers a ON a.id = pe.ansi_id
     WHERE pe.device_id = ?
     ORDER BY pe.sort_order, pe.created_at`,
    [device_id]
  );
}

export async function getElement(id: string): Promise<ProtectionElement | undefined> {
  return get<ProtectionElement>(
    `SELECT pe.*,
            a.device_number AS ansi_device_number,
            a.common_name   AS ansi_common_name
     FROM protection_elements pe
     LEFT JOIN ansi_device_numbers a ON a.id = pe.ansi_id
     WHERE pe.id = ?`,
    [id]
  );
}

export async function createElement(
  device_id: string,
  input: { ansi_id?: string; custom_name?: string; description?: string; sort_order?: number }
): Promise<ProtectionElement> {
  const id = nanoid();
  await run(
    `INSERT INTO protection_elements (id, device_id, ansi_id, custom_name, description, sort_order)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      id,
      device_id,
      input.ansi_id ?? null,
      input.custom_name ?? "",
      input.description ?? "",
      input.sort_order ?? 0,
    ]
  );
  return (await getElement(id))!;
}

export async function updateElement(
  id: string,
  input: Partial<Pick<ProtectionElement, "ansi_id" | "custom_name" | "description" | "enabled" | "sort_order">>
): Promise<void> {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (input.ansi_id !== undefined) { fields.push("ansi_id = ?"); values.push(input.ansi_id); }
  if (input.custom_name !== undefined) { fields.push("custom_name = ?"); values.push(input.custom_name); }
  if (input.description !== undefined) { fields.push("description = ?"); values.push(input.description); }
  if (input.enabled !== undefined) { fields.push("enabled = ?"); values.push(input.enabled); }
  if (input.sort_order !== undefined) { fields.push("sort_order = ?"); values.push(input.sort_order); }

  if (fields.length === 0) return;
  fields.push("updated_at = datetime('now')");
  values.push(id);

  await run(`UPDATE protection_elements SET ${fields.join(", ")} WHERE id = ?`, values);
}

export async function deleteElement(id: string): Promise<void> {
  await run("DELETE FROM protection_elements WHERE id = ?", [id]);
}

// ── Element Settings ─────────────────────────────────────────────────────────

export async function listSettings(element_id: string): Promise<ElementSetting[]> {
  return query<ElementSetting>(
    "SELECT * FROM element_settings WHERE element_id = ? ORDER BY sort_order, created_at",
    [element_id]
  );
}

export async function getSetting(id: string): Promise<ElementSetting | undefined> {
  return get<ElementSetting>("SELECT * FROM element_settings WHERE id = ?", [id]);
}

export async function createSetting(
  element_id: string,
  input: {
    setting_name: string;
    custom_name?: string;
    description?: string;
    value?: string;
    unit?: string;
    sort_order?: number;
  }
): Promise<ElementSetting> {
  const id = nanoid();
  await run(
    `INSERT INTO element_settings (id, element_id, setting_name, custom_name, description, value, unit, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      element_id,
      input.setting_name,
      input.custom_name ?? "",
      input.description ?? "",
      input.value ?? "",
      input.unit ?? "",
      input.sort_order ?? 0,
    ]
  );
  return (await getSetting(id))!;
}

export async function updateSetting(
  id: string,
  input: Partial<Pick<ElementSetting, "setting_name" | "custom_name" | "description" | "value" | "unit" | "sort_order">>
): Promise<void> {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (input.setting_name !== undefined) { fields.push("setting_name = ?"); values.push(input.setting_name); }
  if (input.custom_name !== undefined) { fields.push("custom_name = ?"); values.push(input.custom_name); }
  if (input.description !== undefined) { fields.push("description = ?"); values.push(input.description); }
  if (input.value !== undefined) { fields.push("value = ?"); values.push(input.value); }
  if (input.unit !== undefined) { fields.push("unit = ?"); values.push(input.unit); }
  if (input.sort_order !== undefined) { fields.push("sort_order = ?"); values.push(input.sort_order); }

  if (fields.length === 0) return;
  fields.push("updated_at = datetime('now')");
  values.push(id);

  await run(`UPDATE element_settings SET ${fields.join(", ")} WHERE id = ?`, values);
}

export async function deleteSetting(id: string): Promise<void> {
  await run("DELETE FROM element_settings WHERE id = ?", [id]);
}
