"use client";

/**
 * DynamicFormFields — renders a FieldSchema[] as form inputs.
 *
 * Used in two contexts:
 *   1. The edit-device form: shows the device-level fields defined in
 *      the form_template for that relay type (values saved to device_fields_json).
 *   2. The new-maintenance form: shows the same schema for per-visit
 *      data entry (values saved to maintenance.form_data_json).
 *
 * The parent component is responsible for providing the current values
 * and handling the onChange callback to update its own state.
 */

import type { FieldSchema } from "@/lib/form-templates";

interface Props {
  fields: FieldSchema[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

export default function DynamicFormFields({ fields, values, onChange }: Props) {
  if (fields.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {fields.map((f) => (
          <div key={f.key}>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {f.label}
              {f.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {f.type === "textarea" ? (
              <textarea
                required={f.required}
                value={values[f.key] ?? ""}
                onChange={(e) => onChange(f.key, e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : f.type === "select" ? (
              <select
                required={f.required}
                value={values[f.key] ?? ""}
                onChange={(e) => onChange(f.key, e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select…</option>
                {(f.options ?? []).map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            ) : f.type === "checkbox" ? (
              <input
                type="checkbox"
                checked={values[f.key] === "true"}
                onChange={(e) => onChange(f.key, String(e.target.checked))}
                className="h-4 w-4 text-blue-600 border-slate-300 rounded"
              />
            ) : (
              <input
                type={f.type === "date" ? "date" : f.type === "number" ? "number" : "text"}
                required={f.required}
                value={values[f.key] ?? ""}
                onChange={(e) => onChange(f.key, e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
