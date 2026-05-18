"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import FileUploader, { type UploadedFile } from "@/components/FileUploader";
import FileInput from "@/components/FileInput";

interface Setting extends UploadedFile {
  revision: string;
  date: string;
  description: string;
}

export default function SettingsPage() {
  const { id } = useParams<{ id: string }>();
  const [settings, setSettings] = useState<Setting[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [revision, setRevision] = useState("");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const fetchSettings = useCallback(async () => {
    const r = await fetch(`/api/devices/${id}/settings`);
    if (r.ok) setSettings(await r.json());
  }, [id]);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("originalName", file.name);
    fd.append("revision", revision);
    fd.append("date", date);
    fd.append("description", description);
    await fetch(`/api/devices/${id}/settings`, { method: "POST", body: fd });
    setRevision(""); setDate(""); setDescription(""); setFile(null);
    setShowUpload(false);
    setUploading(false);
    fetchSettings();
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Link href={`/devices/${id}`} className="text-sm text-slate-500 hover:text-slate-700">← Device</Link>
        <h1 className="text-xl font-semibold text-slate-900">Master Settings History</h1>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-slate-600">{settings.length} revision{settings.length !== 1 ? "s" : ""} stored</p>
          <button
            onClick={() => setShowUpload((v) => !v)}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
          >
            {showUpload ? "Cancel" : "+ Upload Revision"}
          </button>
        </div>

        {showUpload && (
          <form onSubmit={handleUpload} className="border border-slate-200 rounded-md p-4 space-y-3 bg-slate-50">
            <h3 className="text-sm font-medium text-slate-700">Upload New Setting File</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Revision *</label>
                <input required type="text" value={revision} onChange={(e) => setRevision(e.target.value)} className={inp} placeholder="e.g. Rev A" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Date *</label>
                <input required type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inp} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Description *</label>
                <input required type="text" value={description} onChange={(e) => setDescription(e.target.value)} className={inp} placeholder="Brief description" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">File *</label>
              <FileInput required file={file} onChange={setFile} />
            </div>
            <button type="submit" disabled={uploading} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50">
              {uploading ? "Uploading…" : "Upload"}
            </button>
          </form>
        )}

        {settings.length === 0 ? (
          <p className="text-sm text-slate-400">No settings uploaded yet.</p>
        ) : (
          <table className="w-full text-sm border border-slate-100 rounded-md overflow-hidden">
            <thead className="bg-slate-50 text-xs text-slate-600">
              <tr>
                <th className="text-left px-3 py-2">Revision</th>
                <th className="text-left px-3 py-2">Date</th>
                <th className="text-left px-3 py-2">Description</th>
                <th className="text-left px-3 py-2">Uploaded</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {settings.map((s, i) => (
                <tr key={s.id} className={`border-t border-slate-100 ${i === 0 ? "bg-blue-50" : ""}`}>
                  <td className="px-3 py-2 font-medium">
                    {s.revision}
                    {i === 0 && <span className="ml-2 text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded">Latest</span>}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{s.date}</td>
                  <td className="px-3 py-2 text-slate-600">{s.description}</td>
                  <td className="px-3 py-2 text-xs text-slate-400">{s.created_at?.slice(0, 10)}</td>
                  <td className="px-3 py-2 text-right">
                    <a href={`/api/devices/${id}/settings/${s.id}/download`} className="text-xs text-blue-600 hover:underline">Download</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const inp = "w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
