"use client";

import { useState, useEffect, useCallback } from "react";
import FileInput from "@/components/FileInput";

interface Report {
  id: string;
  title: string;
  report_number: string;
  description: string;
  revision: string;
  date: string;
  created_at: string;
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [reportNumber, setReportNumber] = useState("");
  const [description, setDescription] = useState("");
  const [revision, setRevision] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const fetchReports = useCallback(async () => {
    const r = await fetch("/api/reports");
    if (r.ok) setReports(await r.json());
  }, []);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setError(""); setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("originalName", file.name);
    fd.append("title", title);
    fd.append("report_number", reportNumber);
    fd.append("description", description);
    fd.append("revision", revision);
    fd.append("date", date);
    const r = await fetch("/api/reports", { method: "POST", body: fd });
    setUploading(false);
    if (!r.ok) { const j = await r.json(); setError(j.error ?? "Upload failed"); return; }
    setTitle(""); setReportNumber(""); setDescription(""); setRevision(""); setFile(null); setShowForm(false);
    fetchReports();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this report?")) return;
    await fetch(`/api/reports/${id}`, { method: "DELETE" });
    fetchReports();
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Protection Reports</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
        >
          {showForm ? "Cancel" : "+ Upload Report"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleUpload} className="bg-white rounded-lg border border-slate-200 p-5 mb-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700">Upload New Report</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Title *</label>
              <input required type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Report Number *</label>
              <input required type="text" value={reportNumber} onChange={(e) => setReportNumber(e.target.value)} className={inp} placeholder="e.g. PRO-2024-001" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Revision *</label>
              <input required type="text" value={revision} onChange={(e) => setRevision(e.target.value)} className={inp} placeholder="e.g. Rev A" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Date *</label>
              <input required type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">File *</label>
              <FileInput required file={file} onChange={setFile} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Description *</label>
              <textarea required rows={2} value={description} onChange={(e) => setDescription(e.target.value)} className={inp} />
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={uploading} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50">
            {uploading ? "Uploading…" : "Upload"}
          </button>
        </form>
      )}

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        {reports.length === 0 ? (
          <p className="p-6 text-sm text-slate-400">No reports uploaded yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-600 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3">Title</th>
                <th className="text-left px-4 py-3">Report No.</th>
                <th className="text-left px-4 py-3">Revision</th>
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-left px-4 py-3">Description</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">
                    <a href={`/api/reports/${r.id}/download`} className="hover:text-blue-600 hover:underline">{r.title}</a>
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-slate-600">{r.report_number}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{r.revision}</td>
                  <td className="px-4 py-3 font-mono text-xs">{r.date}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs max-w-xs truncate">{r.description}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3 justify-end">
                      <a href={`/api/reports/${r.id}/download`} className="text-xs text-blue-600 hover:underline">Download</a>
                      <button onClick={() => handleDelete(r.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                    </div>
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
