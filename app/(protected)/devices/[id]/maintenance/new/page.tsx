"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import DynamicFormFields from "@/components/DynamicFormFields";
import type { FieldSchema, FormTemplate } from "@/lib/form-templates";

const CHECKBOXES = [
  { key: "settings_checked_to_master", label: "Settings checked to master" },
  { key: "onload_check", label: "Onload check" },
  { key: "trip_function_proved", label: "Trip function proved" },
  { key: "ct_secondary_insulation_check", label: "CT secondary insulation check" },
  { key: "vt_secondary_insulation_check", label: "VT secondary insulation check" },
  { key: "ct_loop_check", label: "CT loop check" },
  { key: "vt_loop_check", label: "VT loop check" },
  { key: "relay_tested_analogues", label: "Relay tested — Analogues, Inputs and Outputs" },
  { key: "relay_tested_comprehensive", label: "Relay tested — Comprehensive all elements" },
];

type Checks = Record<string, boolean>;

export default function NewMaintenancePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [checks, setChecks] = useState<Checks>(Object.fromEntries(CHECKBOXES.map((c) => [c.key, false])));
  const [notes, setNotes] = useState("");
  const [deviceFields, setDeviceFields] = useState<Record<string, string>>({});
  const [template, setTemplate] = useState<FormTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Fetch device to get part_number then fetch its template
    fetch(`/api/devices/${id}`)
      .then((r) => r.json())
      .then((device) => {
        if (device.part_number) {
          return fetch("/api/form-templates")
            .then((r) => r.json())
            .then((templates: FormTemplate[]) => {
              const t = templates.find((t) => t.part_number === device.part_number);
              if (t) setTemplate(t);
            });
        }
      });
  }, [id]);

  const extraFields: FieldSchema[] = template ? JSON.parse(template.maintenance_fields_json) : [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const body = {
      date,
      ...Object.fromEntries(CHECKBOXES.map((c) => [c.key, checks[c.key] ? 1 : 0])),
      notes,
      form_data_json: JSON.stringify(deviceFields),
    };
    const res = await fetch(`/api/devices/${id}/maintenance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json();
      setError(j.error ?? "Failed to save");
      return;
    }
    const record = await res.json();
    router.push(`/devices/${id}/maintenance/${record.id}`);
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Link href={`/devices/${id}`} className="text-sm text-slate-500 hover:text-slate-700">← Device</Link>
        <h1 className="text-xl font-semibold text-slate-900">New Maintenance Record</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Section title="Date">
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </Section>

        <Section title="Checks Performed">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {CHECKBOXES.map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checks[key]}
                  onChange={(e) => setChecks((prev) => ({ ...prev, [key]: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 border-slate-300 rounded"
                />
                <span className="text-sm text-slate-700">{label}</span>
              </label>
            ))}
          </div>
        </Section>


        <Section title="Notes">
          <textarea
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Findings, observations, any other notes…"
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </Section>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50">
            {saving ? "Saving…" : "Save Record"}
          </button>
          <Link href={`/devices/${id}`} className="px-4 py-2 border border-slate-300 text-slate-700 text-sm rounded-md hover:bg-slate-50 inline-flex items-center">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-5">
      <h2 className="text-sm font-semibold text-slate-700 mb-3 pb-2 border-b border-slate-100">{title}</h2>
      {children}
    </div>
  );
}
