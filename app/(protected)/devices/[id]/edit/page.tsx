"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import KKSBuilder from "@/components/KKSBuilder";
import DynamicFormFields from "@/components/DynamicFormFields";
import type { KKSParts } from "@/lib/kks";
import type { FieldSchema, FormTemplate } from "@/lib/form-templates";

export default function EditDevicePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [device, setDevice] = useState<Record<string, any> | null>(null);
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [reports, setReports] = useState<Array<{ id: string; title: string; revision: string }>>([]);
  const [kks, setKks] = useState<KKSParts>({
    kks_station: "", kks_unit: "", kks_system_code: "", kks_system_number: "",
    kks_equipment_unit_code: "", kks_equipment_number: "",
    kks_component_code: "", kks_component_number: "",
  });
  const [deviceFields, setDeviceFields] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/devices/${id}`).then((r) => r.json()),
      fetch("/api/form-templates").then((r) => r.json()),
      fetch("/api/reports").then((r) => r.json()),
    ]).then(([dev, tmps, rpts]) => {
      setDevice(dev);
      setTemplates(tmps);
      setReports(rpts);
      setKks({
        kks_station: dev.kks_station, kks_unit: dev.kks_unit,
        kks_system_code: dev.kks_system_code, kks_system_number: dev.kks_system_number,
        kks_equipment_unit_code: dev.kks_equipment_unit_code, kks_equipment_number: dev.kks_equipment_number,
        kks_component_code: dev.kks_component_code, kks_component_number: dev.kks_component_number,
      });
      setDeviceFields(JSON.parse(dev.device_fields_json ?? "{}"));
    });
  }, [id]);

  const selectedTemplate = templates.find((t) => t.part_number === device?.part_number);
  const extraFields: FieldSchema[] = selectedTemplate ? JSON.parse(selectedTemplate.maintenance_fields_json) : [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!device) return;
    setError(""); setSaving(true);
    const res = await fetch(`/api/devices/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...kks, ...device, device_fields_json: JSON.stringify(deviceFields) }),
    });
    setSaving(false);
    if (!res.ok) { const j = await res.json(); setError(j.error ?? "Failed"); return; }
    router.push(`/devices/${id}`);
  }

  if (!device) return <div className="p-6 text-sm text-slate-500">Loading…</div>;

  const inp = "w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Link href={`/devices/${id}`} className="text-sm text-slate-500 hover:text-slate-700">← Device</Link>
        <h1 className="text-xl font-semibold text-slate-900">Edit Device</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Card title="KKS Code">
          <KKSBuilder value={kks} onChange={setKks} />
        </Card>

        <Card title="Device Details">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              { key: "part_number", label: "Part Number", required: true },
              { key: "device_type", label: "Device Type", required: true },
              { key: "firmware", label: "Firmware" },
              { key: "serial_number", label: "Serial Number" },
              { key: "device_location", label: "Device Location", required: true },
              { key: "circuit", label: "Circuit", required: true },
            ].map(({ key, label, required }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-slate-700 mb-1">{label}{required && <span className="text-red-500 ml-1">*</span>}</label>
                <input type="text" required={required} value={device[key] ?? ""} onChange={(e) => setDevice((d) => ({ ...d!, [key]: e.target.value }))} className={inp} />
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Commissioning Date</label>
              <input type="date" value={device.commissioning_date ?? ""} onChange={(e) => setDevice((d) => ({ ...d!, commissioning_date: e.target.value }))} className={inp} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Linked Report</label>
              <select value={device.report_id ?? ""} onChange={(e) => setDevice((d) => ({ ...d!, report_id: e.target.value || null }))} className={inp}>
                <option value="">None</option>
                {reports.map((r) => <option key={r.id} value={r.id}>{r.title} (Rev {r.revision})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Maintenance Period (years)</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={device.maintenance_period_years ?? 0}
                onChange={(e) => setDevice((d) => ({ ...d!, maintenance_period_years: parseFloat(e.target.value) || 0 }))}
                className={inp}
                placeholder="e.g. 2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">EIPC Compliance</label>
              <label className="flex items-center gap-2 cursor-pointer mt-1">
                <input
                  type="checkbox"
                  checked={!!device.eipc}
                  onChange={(e) => setDevice((d) => ({ ...d!, eipc: e.target.checked ? 1 : 0 }))}
                  className="h-4 w-4 text-blue-600 border-slate-300 rounded"
                />
                <span className="text-sm text-slate-700">EIPC testing required</span>
              </label>
            </div>
          </div>
        </Card>

        {extraFields.length > 0 && (
          <Card title="Device-Specific Fields">
            <DynamicFormFields fields={extraFields} values={deviceFields} onChange={(k, v) => setDeviceFields((p) => ({ ...p, [k]: v }))} />
          </Card>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50">
            {saving ? "Saving…" : "Save Changes"}
          </button>
          <Link href={`/devices/${id}`} className="px-4 py-2 border border-slate-300 text-slate-700 text-sm rounded-md hover:bg-slate-50 inline-flex items-center">Cancel</Link>
        </div>
      </form>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-5">
      <h2 className="text-sm font-semibold text-slate-700 mb-4 pb-2 border-b border-slate-100">{title}</h2>
      {children}
    </div>
  );
}
