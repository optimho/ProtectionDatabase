"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import type { Part, PartManual } from "@/lib/parts";
import FileInput from "@/components/FileInput";

export default function EditPartPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [part, setPart] = useState<Part | null>(null);
  const [manuals, setManuals] = useState<PartManual[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Manual upload state
  const [manualFile, setManualFile] = useState<File | null>(null);
  const [manualDesc, setManualDesc] = useState("");
  const [uploading, setUploading] = useState(false);

  const fetchManuals = useCallback(async () => {
    const r = await fetch(`/api/parts/${id}/manuals`);
    if (r.ok) setManuals(await r.json());
  }, [id]);

  useEffect(() => {
    fetch(`/api/parts/${id}`).then((r) => r.json()).then(setPart);
    fetchManuals();
  }, [id, fetchManuals]);

  function update(field: keyof Part, value: string) {
    setPart((p) => p ? { ...p, [field]: value } : p);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!part) return;
    setError(""); setSaving(true);
    const res = await fetch(`/api/parts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        part_number: part.part_number,
        device_type: part.device_type,
        relay_type: part.relay_type,
        description: part.description,
        firmware: part.firmware,
        nominal_supply_voltage: part.nominal_supply_voltage,
        nominal_ct_input: part.nominal_ct_input,
        nominal_vt_input: part.nominal_vt_input,
        stock_number: part.stock_number,
      }),
    });
    setSaving(false);
    if (!res.ok) { const j = await res.json(); setError(j.error ?? "Failed"); return; }
    router.push("/parts");
  }

  async function handleManualUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!manualFile) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", manualFile);
    fd.append("description", manualDesc);
    await fetch(`/api/parts/${id}/manuals`, { method: "POST", body: fd });
    setManualFile(null);
    setManualDesc("");
    setUploading(false);
    fetchManuals();
  }

  async function handleDeleteManual(mid: string) {
    if (!confirm("Delete this manual?")) return;
    await fetch(`/api/parts/${id}/manuals/${mid}`, { method: "DELETE" });
    fetchManuals();
  }

  if (!part) return <div className="p-6 text-sm text-slate-500">Loading…</div>;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/parts" className="text-sm text-slate-500 hover:text-slate-700">← Relay Types</Link>
        <h1 className="text-xl font-semibold text-slate-900">Edit Relay Type — {part.part_number}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4 pb-2 border-b border-slate-100">Part Identity</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Part Number" required>
              <input required type="text" value={part.part_number} onChange={(e) => update("part_number", e.target.value)} className={inp} />
            </Field>
            <Field label="Device Type" required>
              <input required type="text" value={part.device_type} onChange={(e) => update("device_type", e.target.value)} className={inp} />
            </Field>
            <Field label="Relay Type" required>
              <select required value={part.relay_type ?? "Microprocessor"} onChange={(e) => update("relay_type", e.target.value)} className={inp}>
                <option value="Microprocessor">Microprocessor</option>
                <option value="Electronic">Electronic</option>
                <option value="Electromechanical">Electromechanical</option>
              </select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Description">
                <textarea rows={3} value={part.description} onChange={(e) => update("description", e.target.value)} className={inp} placeholder="Describe this part — purpose, key features, application…" />
              </Field>
            </div>
            <Field label="Typical Firmware Version">
              <input type="text" value={part.firmware} onChange={(e) => update("firmware", e.target.value)} className={inp} placeholder="e.g. R311-V0-Z004004" />
            </Field>
            <Field label="Stock Number">
              <input type="text" value={part.stock_number} onChange={(e) => update("stock_number", e.target.value)} className={inp} />
            </Field>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4 pb-2 border-b border-slate-100">Electrical Ratings</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Nominal Supply Voltage">
              <input type="text" value={part.nominal_supply_voltage} onChange={(e) => update("nominal_supply_voltage", e.target.value)} className={inp} placeholder="e.g. 125 VDC" />
            </Field>
            <Field label="Nominal CT Input">
              <input type="text" value={part.nominal_ct_input} onChange={(e) => update("nominal_ct_input", e.target.value)} className={inp} placeholder="e.g. 5 A" />
            </Field>
            <Field label="Nominal VT Input">
              <input type="text" value={part.nominal_vt_input} onChange={(e) => update("nominal_vt_input", e.target.value)} className={inp} placeholder="e.g. 110 VAC" />
            </Field>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50">
            {saving ? "Saving…" : "Save Changes"}
          </button>
          <Link href="/parts" className="px-4 py-2 border border-slate-300 text-slate-700 text-sm rounded-md hover:bg-slate-50 inline-flex items-center">Cancel</Link>
        </div>
      </form>

      {/* Manuals section */}
      <div className="mt-6 bg-white rounded-lg border border-slate-200 p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-4 pb-2 border-b border-slate-100">
          Manuals & Documents ({manuals.length})
        </h2>

        {manuals.length > 0 && (
          <ul className="mb-4 space-y-2">
            {manuals.map((m) => (
              <li key={m.id} className="flex items-center justify-between text-sm border border-slate-100 rounded px-3 py-2 bg-slate-50">
                <div className="min-w-0">
                  <a
                    href={`/api/parts/${id}/manuals/${m.id}`}
                    className="text-blue-600 hover:underline font-medium truncate block"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {m.original_name}
                  </a>
                  {m.description && <p className="text-xs text-slate-500 mt-0.5">{m.description}</p>}
                  <p className="text-xs text-slate-400">{m.created_at.slice(0, 10)}</p>
                </div>
                <button
                  onClick={() => handleDeleteManual(m.id)}
                  className="ml-4 text-xs text-red-500 hover:underline flex-shrink-0"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={handleManualUpload} className="space-y-3 border-t border-slate-100 pt-4">
          <p className="text-xs font-medium text-slate-600">Upload Manual / Document</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">File (PDF or document) *</label>
              <FileInput required file={manualFile} onChange={setManualFile} accept=".pdf,.doc,.docx,.txt" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
              <input type="text" value={manualDesc} onChange={(e) => setManualDesc(e.target.value)} className={inp} placeholder="e.g. Instruction Manual Rev 5" />
            </div>
          </div>
          <button
            type="submit"
            disabled={uploading || !manualFile}
            className="px-3 py-1.5 bg-slate-700 text-white text-sm rounded-md hover:bg-slate-800 disabled:opacity-50"
          >
            {uploading ? "Uploading…" : "Upload Manual"}
          </button>
        </form>
      </div>
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
