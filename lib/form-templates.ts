/**
 * lib/form-templates.ts — Dynamic form schema per relay type
 *
 * A FormTemplate is a JSON-driven schema that extends the standard device
 * record with relay-type-specific fields. There is at most one template per
 * part_number (enforced by UNIQUE constraint).
 *
 * The schema is split into two field arrays:
 *   - maintenance_fields_json: rendered on the maintenance form during a visit
 *   - settings_fields_json: reserved for future settings-related forms
 *
 * Field values entered against these schemas are stored as JSON blobs:
 *   - devices.device_fields_json   — persists across edits, shown in Device Information
 *   - maintenance.form_data_json   — captured per maintenance visit
 *
 * Admins manage templates via /form-templates (the "Type Templates" section).
 * The FormTemplateEditor component provides the drag-sort schema builder UI.
 */

import { query, get, run } from "./db";
import { nanoid } from "nanoid";

/** A single field definition within a form template. */
export interface FieldSchema {
  key: string;   // snake_case identifier; stored as the JSON key in form_data_json
  label: string; // human-readable display label in the rendered form
  type: "text" | "number" | "select" | "checkbox" | "textarea" | "date";
  required?: boolean;
  options?: string[];  // only used when type === "select"
}

export interface FormTemplate {
  id: string;
  part_number: string;
  device_type_label: string;
  maintenance_fields_json: string;  // JSON-serialised FieldSchema[]
  settings_fields_json: string;     // JSON-serialised FieldSchema[] (reserved)
  created_at: string;
  updated_at: string;
}

export async function listFormTemplates(): Promise<FormTemplate[]> {
  return query<FormTemplate>("SELECT * FROM form_templates ORDER BY part_number");
}

export async function getFormTemplate(id: string): Promise<FormTemplate | undefined> {
  return get<FormTemplate>("SELECT * FROM form_templates WHERE id = ?", [id]);
}

/** Look up a template by part_number — used when rendering device forms. */
export async function getFormTemplateByPartNumber(part_number: string): Promise<FormTemplate | undefined> {
  return get<FormTemplate>("SELECT * FROM form_templates WHERE part_number = ?", [part_number]);
}

export async function createFormTemplate(
  input: Omit<FormTemplate, "id" | "created_at" | "updated_at">
): Promise<FormTemplate> {
  const id = nanoid();
  await run(
    "INSERT INTO form_templates (id,part_number,device_type_label,maintenance_fields_json,settings_fields_json) VALUES (?,?,?,?,?)",
    [id, input.part_number, input.device_type_label, input.maintenance_fields_json, input.settings_fields_json]
  );
  return (await getFormTemplate(id))!;
}

/**
 * Partial update — only supplied fields are changed.
 * Builds the SET clause dynamically from the provided keys so callers
 * don't need to send the full object.
 */
export async function updateFormTemplate(
  id: string,
  input: Partial<Omit<FormTemplate, "id" | "created_at" | "updated_at">>
): Promise<void> {
  const fields = Object.entries(input)
    .filter(([, v]) => v !== undefined)
    .map(([k]) => `${k} = ?`);
  const values = Object.entries(input)
    .filter(([, v]) => v !== undefined)
    .map(([, v]) => v);
  if (fields.length === 0) return;
  await run(
    `UPDATE form_templates SET ${fields.join(", ")}, updated_at=datetime('now') WHERE id = ?`,
    [...values, id]
  );
}

export async function deleteFormTemplate(id: string): Promise<void> {
  await run("DELETE FROM form_templates WHERE id = ?", [id]);
}
