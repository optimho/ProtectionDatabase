"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import FormTemplateEditor from "@/components/FormTemplateEditor";
import type { FieldSchema } from "@/lib/form-templates";
import type { Part } from "@/lib/parts";

export default function NewFormTemplatePage() {
  const router = useRouter();
  const [parts, setParts] = useState<Part[]>([]);
  const [partNumber, setPartNumber] = useState("");
  const [deviceTypeLabel, setDeviceTypeLabel] = useState("");
  const [maintenanceFields, setMaintenanceFields] = useState<FieldSchema[]>([]);
  const [settingsFields, setSettingsFields] = useState<FieldSchema[]>([]);
  const [existingKeys, setExistingKeys] = useState<{ key: string; label: string }[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/parts").then((r) => r.json()).then(setParts);
    fetch("/api/form-templates").then((r) => r.json()).then((templates: import("@/lib/form-templates").FormTemplate[]) => {
      const seen = new Map<string, string>();
      for (const t of templates) {
        const fields: FieldSchema[] = JSON.parse(t.maintenance_fields_json ?? "[]");
        for (const f of fields) {
          if (f.key && !seen.has(f.key)) seen.set(f.key, f.label);
        }
      }
      setExistingKeys(Array.from(seen.entries()).map(([key, label]) => ({ key, label })));
    });
  }, []);

  function handlePartChange(selectedPartNumber: string) {
    setPartNumber(selectedPartNumber);
    const part = parts.find((p) => p.part_number === selectedPartNumber);
    if (part) setDeviceTypeLabel(part.device_type);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSaving(true);
    const res = await fetch("/api/form-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        part_number: partNumber,
        device_type_label: deviceTypeLabel,
        maintenance_fields: maintenanceFields,
        settings_fields: settingsFields,
      }),
    });
    setSaving(false);
    if (!res.ok) { const j = await res.json(); setError(j.error ?? "Failed"); return; }
    router.push("/form-templates");
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/form-templates" className="text-sm text-slate-500 hover:text-slate-700">← Type Templates</Link>
        <h1 className="text-xl font-semibold text-slate-900">Extend Type</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4 pb-2 border-b border-slate-100">Relay Type</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Part Number *</label>
              <select required value={partNumber} onChange={(e) => handlePartChange(e.target.value)} className={inp}>
                <option value="">Select relay type…</option>
                {parts.map((p) => (
                  <option key={p.id} value={p.part_number}>{p.part_number} — {p.device_type}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Device Type Label *</label>
              <input required type="text" value={deviceTypeLabel} onChange={(e) => setDeviceTypeLabel(e.target.value)} className={inp} placeholder="e.g. Line Distance Relay" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <FormTemplateEditor fields={maintenanceFields} onChange={setMaintenanceFields} label="Maintenance Form Fields" existingKeys={existingKeys} />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50">
            {saving ? "Saving…" : "Save Template"}
          </button>
          <Link href="/form-templates" className="px-4 py-2 border border-slate-300 text-slate-700 text-sm rounded-md hover:bg-slate-50 inline-flex items-center">Cancel</Link>
        </div>
      </form>
    </div>
  );
}

const inp = "w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
