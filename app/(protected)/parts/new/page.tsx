"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewPartPage() {
  const router = useRouter();
  const [partNumber, setPartNumber] = useState("");
  const [deviceType, setDeviceType] = useState("");
  const [description, setDescription] = useState("");
  const [firmware, setFirmware] = useState("");
  const [supplyVoltage, setSupplyVoltage] = useState("");
  const [ctInput, setCtInput] = useState("");
  const [vtInput, setVtInput] = useState("");
  const [stockNumber, setStockNumber] = useState("");
  const [relayType, setRelayType] = useState("Microprocessor");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const res = await fetch("/api/parts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        part_number: partNumber,
        device_type: deviceType,
        relay_type: relayType,
        description,
        firmware,
        nominal_supply_voltage: supplyVoltage,
        nominal_ct_input: ctInput,
        nominal_vt_input: vtInput,
        stock_number: stockNumber,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json();
      setError(j.error ?? "Failed to save");
      return;
    }
    const part = await res.json();
    // Go to edit page so admin can immediately upload manuals
    router.push(`/parts/${part.id}/edit`);
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/parts" className="text-sm text-slate-500 hover:text-slate-700">← Relay Types</Link>
        <h1 className="text-xl font-semibold text-slate-900">New Relay Type</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4 pb-2 border-b border-slate-100">Part Identity</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Part Number" required>
              <input required type="text" value={partNumber} onChange={(e) => setPartNumber(e.target.value)} className={inp} placeholder="e.g. SEL-311C-1" />
            </Field>
            <Field label="Device Type" required>
              <input required type="text" value={deviceType} onChange={(e) => setDeviceType(e.target.value)} className={inp} placeholder="e.g. Line Distance Relay" />
            </Field>
            <Field label="Relay Type" required>
              <select required value={relayType} onChange={(e) => setRelayType(e.target.value)} className={inp}>
                <option value="Microprocessor">Microprocessor</option>
                <option value="Electronic">Electronic</option>
                <option value="Electromechanical">Electromechanical</option>
              </select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Description">
                <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className={inp} placeholder="Describe this part — purpose, key features, application…" />
              </Field>
            </div>
            <Field label="Typical Firmware Version">
              <input type="text" value={firmware} onChange={(e) => setFirmware(e.target.value)} className={inp} placeholder="e.g. R311-V0-Z004004" />
            </Field>
            <Field label="Stock Number">
              <input type="text" value={stockNumber} onChange={(e) => setStockNumber(e.target.value)} className={inp} placeholder="e.g. WH-4821" />
            </Field>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4 pb-2 border-b border-slate-100">Electrical Ratings</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Nominal Supply Voltage">
              <input type="text" value={supplyVoltage} onChange={(e) => setSupplyVoltage(e.target.value)} className={inp} placeholder="e.g. 125 VDC" />
            </Field>
            <Field label="Nominal CT Input">
              <input type="text" value={ctInput} onChange={(e) => setCtInput(e.target.value)} className={inp} placeholder="e.g. 5 A" />
            </Field>
            <Field label="Nominal VT Input">
              <input type="text" value={vtInput} onChange={(e) => setVtInput(e.target.value)} className={inp} placeholder="e.g. 110 VAC" />
            </Field>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50">
            {saving ? "Saving…" : "Save & Add Manuals"}
          </button>
          <Link href="/parts" className="px-4 py-2 border border-slate-300 text-slate-700 text-sm rounded-md hover:bg-slate-50 inline-flex items-center">Cancel</Link>
        </div>
      </form>
    </div>
  );
}

const inp = "w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

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
