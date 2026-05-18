"use client";

import { useState, useRef } from "react";

export interface UploadedFile {
  id: string;
  filename: string;
  original_name?: string;
  description?: string;
  file_type?: string;
  created_at: string;
}

interface Props {
  files: UploadedFile[];
  uploadUrl: string;
  downloadUrlFn: (file: UploadedFile) => string;
  deleteUrlFn?: (file: UploadedFile) => string;
  onRefresh: () => void;
  fileTypeOptions?: Array<{ value: string; label: string }>;
  showFileType?: boolean;
}

export default function FileUploader({
  files,
  uploadUrl,
  downloadUrlFn,
  deleteUrlFn,
  onRefresh,
  fileTypeOptions,
  showFileType = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [desc, setDesc] = useState("");
  const [fileType, setFileType] = useState(fileTypeOptions?.[0]?.value ?? "");

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("originalName", file.name);
    fd.append("description", desc);
    if (showFileType) fd.append("file_type", fileType);
    await fetch(uploadUrl, { method: "POST", body: fd });
    setDesc("");
    if (inputRef.current) inputRef.current.value = "";
    setUploading(false);
    onRefresh();
  }

  async function handleDelete(file: UploadedFile) {
    if (!deleteUrlFn) return;
    if (!confirm("Delete this file?")) return;
    await fetch(deleteUrlFn(file), { method: "DELETE" });
    onRefresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-end">
        {showFileType && fileTypeOptions && (
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">File type</label>
            <select
              value={fileType}
              onChange={(e) => setFileType(e.target.value)}
              className="px-2 py-1.5 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {fileTypeOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        )}
        <div className="flex-1 min-w-40">
          <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
          <input
            type="text"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Optional description"
            className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">File</label>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="px-3 py-1.5 border border-slate-300 bg-white rounded text-sm text-slate-700 font-medium hover:bg-slate-50 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {uploading ? "Uploading…" : "Choose file…"}
          </button>
          <input ref={inputRef} type="file" onChange={handleUpload} disabled={uploading} className="sr-only" />
        </div>
        {uploading && <p className="text-xs text-slate-500">Uploading…</p>}
      </div>

      {files.length > 0 && (
        <table className="w-full text-sm border border-slate-200 rounded-md overflow-hidden">
          <thead className="bg-slate-50 text-xs text-slate-600">
            <tr>
              <th className="text-left px-3 py-2">File</th>
              {showFileType && <th className="text-left px-3 py-2">Type</th>}
              <th className="text-left px-3 py-2">Description</th>
              <th className="text-left px-3 py-2">Date</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {files.map((f) => (
              <tr key={f.id} className="border-t border-slate-100">
                <td className="px-3 py-2 font-mono text-xs text-slate-700">{f.original_name ?? f.filename}</td>
                {showFileType && <td className="px-3 py-2 text-xs text-slate-500">{f.file_type}</td>}
                <td className="px-3 py-2 text-xs text-slate-500">{f.description}</td>
                <td className="px-3 py-2 text-xs text-slate-400">{f.created_at.slice(0, 10)}</td>
                <td className="px-3 py-2 flex gap-2 justify-end">
                  <a
                    href={downloadUrlFn(f)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Download
                  </a>
                  {deleteUrlFn && (
                    <button
                      onClick={() => handleDelete(f)}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {files.length === 0 && <p className="text-xs text-slate-400">No files uploaded yet.</p>}
    </div>
  );
}
