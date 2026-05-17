"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import FormTemplateEditor from "@/components/FormTemplateEditor";
import type { FieldSchema, FormTemplate } from "@/lib/form-templates";

export default function EditFormTemplatePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [template, setTemplate] = useState<FormTemplate | null>(null);
  const [maintenanceFields, setMaintenanceFields] = useState<FieldSchema[]>([]);
  const [settingsFields, setSettingsFields] = useState<FieldSchema[]>([]);
  const [existingKeys, setExistingKeys] = useState<{ key: string; label: string }[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/form-templates/${id}`).then((r) => r.json()),
      fetch("/api/form-templates").then((r) => r.json()),
    ]).then(([t, allTemplates]: [FormTemplate, FormTemplate[]]) => {
      setTemplate(t);
      setMaintenanceFields(JSON.parse(t.maintenance_fields_json));
      setSettingsFields(JSON.parse(t.settings_fields_json));
      const seen = new Map<string, string>();
      for (const tmpl of allTemplates) {
        const fields: FieldSchema[] = JSON.parse(tmpl.maintenance_fields_json ?? "[]");
        for (const f of fields) {
          if (f.key && !seen.has(f.key)) seen.set(f.key, f.label);
        }
      }
      setExistingKeys(Array.from(seen.entries()).map(([key, label]) => ({ key, label })));
    });
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!template) return;
    setError(""); setSaving(true);
    const res = await fetch(`/api/form-templates/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        part_number: template.part_number,
        device_type_label: template.device_type_label,
        maintenance_fields: maintenanceFields,
        settings_fields: settingsFields,
      }),
    });
    setSaving(false);
    if (!res.ok) { const j = await res.json(); setError(j.error ?? "Failed"); return; }
    router.push("/form-templates");
  }

  if (!template) return <div className="p-6 text-sm text-slate-500">Loading…</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/form-templates" className="text-sm text-slate-500 hover:text-slate-700">← Templates</Link>
        <h1 className="text-xl font-semibold text-slate-900">Edit Template — {template.part_number}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4 pb-2 border-b border-slate-100">Device Identity</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Part Number *</label>
              <input required type="text" value={template.part_number} onChange={(e) => setTemplate((t) => t && { ...t, part_number: e.target.value })} className={inp} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Device Type Label *</label>
              <input required type="text" value={template.device_type_label} onChange={(e) => setTemplate((t) => t && { ...t, device_type_label: e.target.value })} className={inp} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <FormTemplateEditor fields={maintenanceFields} onChange={setMaintenanceFields} label="Maintenance Form Fields" existingKeys={existingKeys} />
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <FormTemplateEditor fields={settingsFields} onChange={setSettingsFields} label="Settings Form Fields" />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50">
            {saving ? "Saving…" : "Save Changes"}
          </button>
          <Link href="/form-templates" className="px-4 py-2 border border-slate-300 text-slate-700 text-sm rounded-md hover:bg-slate-50 inline-flex items-center">Cancel</Link>
        </div>
      </form>
    </div>
  );
}

const inp = "w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
