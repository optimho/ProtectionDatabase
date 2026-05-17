"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import FileInput from "@/components/FileInput";

type Device = {
  id: string;
  kks_full: string;
  device_type: string;
  part_number: string;
  device_location: string;
};

export default function UploadMasterSettingsPage() {
  const router = useRouter();
  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceId, setDeviceId] = useState("");
  const [revision, setRevision] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/devices").then((r) => r.json()).then(setDevices);
  }, []);

  const selectedDevice = devices.find((d) => d.id === deviceId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !deviceId) return;
    setError(""); setUploading(true);

    const fd = new FormData();
    fd.append("file", file);
    fd.append("revision", revision);
    fd.append("date", date);
    fd.append("description", description);

    const res = await fetch(`/api/devices/${deviceId}/settings`, {
      method: "POST",
      body: fd,
    });
    setUploading(false);

    if (!res.ok) {
      const j = await res.json();
      setError(j.error ?? "Upload failed");
      return;
    }
    router.push(`/devices/${deviceId}/settings`);
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-700">← Dashboard</Link>
        <h1 className="text-xl font-semibold text-slate-900">Upload Master Settings</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4 pb-2 border-b border-slate-100">Select Device</h2>
          <select required value={deviceId} onChange={(e) => setDeviceId(e.target.value)} className={inp}>
            <option value="">Select a device…</option>
            {devices.map((d) => (
              <option key={d.id} value={d.id}>
                {d.kks_full} — {d.device_type} ({d.device_location})
              </option>
            ))}
          </select>
          {selectedDevice && (
            <p className="mt-2 text-xs text-slate-500">Part: {selectedDevice.part_number}</p>
          )}
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4 pb-2 border-b border-slate-100">Settings Revision Details</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Revision" required>
              <input required type="text" value={revision} onChange={(e) => setRevision(e.target.value)} className={inp} placeholder="e.g. Rev A" />
            </Field>
            <Field label="Date" required>
              <input required type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inp} />
            </Field>
            <Field label="Description" required>
              <input required type="text" value={description} onChange={(e) => setDescription(e.target.value)} className={inp} placeholder="Brief description" />
            </Field>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4 pb-2 border-b border-slate-100">Settings File</h2>
          <FileInput required file={file} onChange={setFile} />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={uploading || !file || !deviceId}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {uploading ? "Uploading…" : "Upload Settings"}
          </button>
          <Link href="/dashboard" className="px-4 py-2 border border-slate-300 text-slate-700 text-sm rounded-md hover:bg-slate-50 inline-flex items-center">
            Cancel
          </Link>
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
