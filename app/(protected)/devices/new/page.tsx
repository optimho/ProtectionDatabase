"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import KKSBuilder from "@/components/KKSBuilder";
import DynamicFormFields from "@/components/DynamicFormFields";
import type { KKSParts } from "@/lib/kks";
import type { FieldSchema, FormTemplate } from "@/lib/form-templates";
import type { Part } from "@/lib/parts";

const emptyKKS: KKSParts = {
  kks_station: "", kks_unit: "", kks_system_code: "", kks_system_number: "",
  kks_equipment_unit_code: "", kks_equipment_number: "",
  kks_component_code: "", kks_component_number: "",
};

export default function NewDevicePage() {
  const router = useRouter();
  const [parts, setParts] = useState<Part[]>([]);
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [reports, setReports] = useState<Array<{ id: string; title: string; revision: string }>>([]);
  const [kks, setKks] = useState<KKSParts>(emptyKKS);
  const kksRef = useRef<KKSParts>(emptyKKS);
  const [partNumber, setPartNumber] = useState("");
  const [deviceType, setDeviceType] = useState("");
  const [firmware, setFirmware] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [commDate, setCommDate] = useState("");
  const [location, setLocation] = useState("");
  const [circuit, setCircuit] = useState("");
  const [reportId, setReportId] = useState("");
  const [eipc, setEipc] = useState(false);
  const [maintenancePeriod, setMaintenancePeriod] = useState("");
  const [deviceFields, setDeviceFields] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/parts").then((r) => r.json()).then(setParts);
    fetch("/api/form-templates").then((r) => r.json()).then(setTemplates);
    fetch("/api/reports").then((r) => r.json()).then(setReports);
  }, []);

  function handleKksChange(parts: KKSParts) {
    setKks(parts);
    kksRef.current = parts;
  }

  function handlePartChange(selectedPartNumber: string) {
    setPartNumber(selectedPartNumber);
    setDeviceFields({});
    const selectedPart = parts.find((p) => p.part_number === selectedPartNumber);
    setDeviceType(selectedPart?.device_type ?? "");
    setFirmware(selectedPart?.firmware ?? "");
  }

  const selectedTemplate = templates.find((t) => t.part_number === partNumber);
  const extraFields: FieldSchema[] = selectedTemplate
    ? JSON.parse(selectedTemplate.maintenance_fields_json)
    : [];

  function setField(key: string, val: string) {
    setDeviceFields((prev) => ({ ...prev, [key]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const currentKks = kksRef.current;
    const missingKks = Object.entries(currentKks).find(([, v]) => !v);
    if (missingKks) {
      setError("Please fill in all KKS code fields.");
      return;
    }

    setSaving(true);
    const res = await fetch("/api/devices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...currentKks,
        part_number: partNumber,
        device_type: deviceType,
        firmware: firmware || undefined,
        serial_number: serialNumber || undefined,
        commissioning_date: commDate || undefined,
        device_location: location,
        circuit,
        report_id: reportId || undefined,
        eipc,
        maintenance_period_years: parseFloat(maintenancePeriod) || 0,
        device_fields_json: JSON.stringify(deviceFields),
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json();
      setError(j.error ?? "Failed to save");
      return;
    }
    const device = await res.json();
    router.push(`/devices/${device.id}`);
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <button onClick={() => router.back()} className="text-sm text-slate-500 hover:text-slate-700">← Back</button>
        <h1 className="text-xl font-semibold text-slate-900">Link Relay</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Section title="KKS Code">
          <KKSBuilder value={kks} onChange={handleKksChange} />
        </Section>

        <Section title="Device Details">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Part Number" required>
              <select
                required
                value={partNumber}
                onChange={(e) => handlePartChange(e.target.value)}
                className={input}
              >
                <option value="">Select part number…</option>
                {parts.map((p) => (
                  <option key={p.id} value={p.part_number}>{p.part_number} — {p.device_type}</option>
                ))}
              </select>
            </Field>
            <Field label="Device Type">
              <input
                type="text"
                value={deviceType}
                readOnly
                className={`${input} bg-slate-50 text-slate-500 cursor-default`}
                placeholder="Auto-filled from part selection"
              />
            </Field>
            <Field label="Firmware">
              <input type="text" value={firmware} onChange={(e) => setFirmware(e.target.value)} className={input} placeholder="Pre-filled from part" />
            </Field>
            <Field label="Serial Number">
              <input type="text" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} className={input} />
            </Field>
            <Field label="Commissioning Date" required>
              <input required type="date" value={commDate} onChange={(e) => setCommDate(e.target.value)} className={input} />
            </Field>
            <Field label="Device Location" required>
              <input type="text" required value={location} onChange={(e) => setLocation(e.target.value)} className={input} placeholder="e.g. Unit 1 MCC Room" />
            </Field>
            <Field label="Circuit" required>
              <input type="text" required value={circuit} onChange={(e) => setCircuit(e.target.value)} className={input} placeholder="e.g. 11kV Feeder F1" />
            </Field>
            <Field label="Linked Report">
              <select value={reportId} onChange={(e) => setReportId(e.target.value)} className={input}>
                <option value="">None</option>
                {reports.map((r) => (
                  <option key={r.id} value={r.id}>{r.title} (Rev {r.revision})</option>
                ))}
              </select>
            </Field>
            <Field label="Maintenance Period (years)">
              <input
                type="number"
                min="0"
                step="0.5"
                value={maintenancePeriod}
                onChange={(e) => setMaintenancePeriod(e.target.value)}
                className={input}
                placeholder="e.g. 2"
              />
            </Field>
            <Field label="EIPC Compliance">
              <label className="flex items-center gap-2 cursor-pointer mt-1">
                <input
                  type="checkbox"
                  checked={eipc}
                  onChange={(e) => setEipc(e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-slate-300 rounded"
                />
                <span className="text-sm text-slate-700">EIPC testing required</span>
              </label>
            </Field>
          </div>
        </Section>

        {extraFields.length > 0 && (
          <Section title="Device-Specific Fields">
            <DynamicFormFields fields={extraFields} values={deviceFields} onChange={setField} />
          </Section>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Device"}
          </button>
          <button type="button" onClick={() => router.back()} className="px-4 py-2 border border-slate-300 text-slate-700 text-sm rounded-md hover:bg-slate-50">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

const input = "w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-5">
      <h2 className="text-sm font-semibold text-slate-700 mb-4 pb-2 border-b border-slate-100">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}
