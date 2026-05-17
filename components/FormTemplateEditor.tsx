"use client";

/**
 * FormTemplateEditor — admin schema builder for dynamic form fields.
 *
 * Renders an editable list of FieldSchema objects. Admins use this on
 * the /form-templates/new and /form-templates/[id]/edit pages to define
 * the extra fields that appear on maintenance forms and the Device
 * Information panel for a given relay type.
 *
 * Features:
 *   - Add / remove fields
 *   - Edit key, label, type, and required flag inline
 *   - Add/remove options for select-type fields
 *   - Datalist suggestions for the key field — populated from keys that
 *     already exist in other templates, so common fields (e.g. ct_ratio)
 *     stay consistent across relay types. Selecting an existing key
 *     auto-fills the label if the label field is still empty.
 */

import { useState } from "react";
import type { FieldSchema } from "@/lib/form-templates";

interface ExistingKey {
  key: string;
  label: string;
}

interface Props {
  fields: FieldSchema[];
  onChange: (fields: FieldSchema[]) => void;
  label: string;
  existingKeys?: ExistingKey[];
}

const TYPES = ["text", "number", "date", "select", "checkbox", "textarea"] as const;

const emptyField = (): FieldSchema => ({ key: "", label: "", type: "text", required: false });

export default function FormTemplateEditor({ fields, onChange, label, existingKeys = [] }: Props) {
  const datalistId = `field-keys-${label.replace(/\s+/g, "-").toLowerCase()}`;
  const [optionInput, setOptionInput] = useState<Record<number, string>>({});

  function update(index: number, patch: Partial<FieldSchema>) {
    onChange(fields.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  }

  function remove(index: number) {
    onChange(fields.filter((_, i) => i !== index));
  }

  function addOption(index: number) {
    const val = optionInput[index]?.trim();
    if (!val) return;
    const f = fields[index];
    update(index, { options: [...(f.options ?? []), val] });
    setOptionInput((p) => ({ ...p, [index]: "" }));
  }

  function removeOption(fieldIndex: number, optIndex: number) {
    const f = fields[fieldIndex];
    update(fieldIndex, { options: (f.options ?? []).filter((_, i) => i !== optIndex) });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">{label}</h3>
        <button
          type="button"
          onClick={() => onChange([...fields, emptyField()])}
          className="text-xs px-2 py-1 bg-slate-700 text-white rounded hover:bg-slate-800"
        >
          + Add Field
        </button>
      </div>

      {existingKeys.length > 0 && (
        <datalist id={datalistId}>
          {existingKeys.map((ek) => (
            <option key={ek.key} value={ek.key} label={ek.label} />
          ))}
        </datalist>
      )}

      {fields.length === 0 && (
        <p className="text-xs text-slate-400">No fields defined.</p>
      )}

      {fields.map((f, i) => (
        <div key={i} className="border border-slate-200 rounded-md p-3 space-y-2 bg-slate-50">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Key</label>
              <input
                type="text"
                value={f.key}
                onChange={(e) => {
                  const newKey = e.target.value.replace(/\s/g, "_");
                  const match = existingKeys.find((ek) => ek.key === newKey);
                  update(i, { key: newKey, ...(match && !f.label ? { label: match.label } : {}) });
                }}
                placeholder="field_key"
                list={existingKeys.length > 0 ? datalistId : undefined}
                className={inp}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Label</label>
              <input
                type="text"
                value={f.label}
                onChange={(e) => update(i, { label: e.target.value })}
                placeholder="Display label"
                className={inp}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
              <select
                value={f.type}
                onChange={(e) => update(i, { type: e.target.value as FieldSchema["type"] })}
                className={inp}
              >
                {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <label className="flex items-center gap-1 text-xs text-slate-600 mb-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!f.required}
                  onChange={(e) => update(i, { required: e.target.checked })}
                  className="h-3 w-3"
                />
                Required
              </label>
              <button
                type="button"
                onClick={() => remove(i)}
                className="ml-auto mb-1 text-xs text-red-500 hover:underline"
              >
                Remove
              </button>
            </div>
          </div>

          {f.type === "select" && (
            <div>
              <p className="text-xs font-medium text-slate-600 mb-1">Options</p>
              <div className="flex flex-wrap gap-1 mb-1">
                {(f.options ?? []).map((opt, oi) => (
                  <span key={oi} className="inline-flex items-center gap-1 text-xs bg-white border border-slate-200 px-2 py-0.5 rounded">
                    {opt}
                    <button type="button" onClick={() => removeOption(i, oi)} className="text-slate-400 hover:text-red-500">×</button>
                  </span>
                ))}
              </div>
              <div className="flex gap-1">
                <input
                  type="text"
                  value={optionInput[i] ?? ""}
                  onChange={(e) => setOptionInput((p) => ({ ...p, [i]: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addOption(i))}
                  placeholder="Option value"
                  className={`${inp} flex-1`}
                />
                <button type="button" onClick={() => addOption(i)} className="px-2 py-1 bg-slate-600 text-white text-xs rounded hover:bg-slate-700">
                  Add
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

const inp = "w-full px-2 py-1.5 border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500";
