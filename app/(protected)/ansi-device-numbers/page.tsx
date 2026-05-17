"use client";

import { useState, useEffect, useCallback } from "react";

interface AnsiCode {
  id: string;
  device_number: string;
  common_name: string;
  description: string;
}

interface EditState {
  device_number: string;
  common_name: string;
  description: string;
}

export default function AnsiDeviceNumbersPage() {
  const [codes, setCodes] = useState<AnsiCode[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({ device_number: "", common_name: "", description: "" });
  const [newCode, setNewCode] = useState<EditState>({ device_number: "", common_name: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchCodes = useCallback(async () => {
    const r = await fetch("/api/ansi-device-numbers");
    if (r.ok) setCodes(await r.json());
  }, []);

  useEffect(() => {
    fetchCodes();
    // Detect admin role from session
    fetch("/api/auth/get-session").then(async (r) => {
      if (r.ok) {
        const s = await r.json();
        setIsAdmin(s?.user?.role === "admin");
      }
    });
  }, [fetchCodes]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSaving(true);
    const r = await fetch("/api/ansi-device-numbers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newCode),
    });
    setSaving(false);
    if (!r.ok) { const j = await r.json(); setError(j.error ?? "Failed"); return; }
    setNewCode({ device_number: "", common_name: "", description: "" });
    setShowAdd(false);
    fetchCodes();
  }

  function startEdit(code: AnsiCode) {
    setEditingId(code.id);
    setEditState({ device_number: code.device_number, common_name: code.common_name, description: code.description });
  }

  async function handleSaveEdit(id: string) {
    setSaving(true);
    const r = await fetch(`/api/ansi-device-numbers/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editState),
    });
    setSaving(false);
    if (r.ok) { setEditingId(null); fetchCodes(); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this ANSI device number?")) return;
    await fetch(`/api/ansi-device-numbers/${id}`, { method: "DELETE" });
    fetchCodes();
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">ANSI Device Numbers</h1>
          <p className="text-sm text-slate-500 mt-0.5">IEEE C37.2 standard device function numbers for protection elements</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowAdd((v) => !v)}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
          >
            {showAdd ? "Cancel" : "+ Add Code"}
          </button>
        )}
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="bg-white rounded-lg border border-slate-200 p-5 mb-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700">New ANSI Device Code</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Device Number *</label>
              <input required type="text" value={newCode.device_number}
                onChange={(e) => setNewCode((p) => ({ ...p, device_number: e.target.value }))}
                placeholder="e.g. 51N" className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Common Name *</label>
              <input required type="text" value={newCode.common_name}
                onChange={(e) => setNewCode((p) => ({ ...p, common_name: e.target.value }))}
                placeholder="e.g. AC Time Ground Overcurrent" className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
              <input type="text" value={newCode.description}
                onChange={(e) => setNewCode((p) => ({ ...p, description: e.target.value }))}
                className={inp} />
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={saving}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50">
            {saving ? "Saving…" : "Add"}
          </button>
        </form>
      )}

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        {codes.length === 0 ? (
          <p className="p-6 text-sm text-slate-400">No ANSI codes loaded.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-600 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 w-24">Device No.</th>
                <th className="text-left px-4 py-3 w-64">Common Name</th>
                <th className="text-left px-4 py-3">Description</th>
                {isAdmin && <th className="px-4 py-3 w-28"></th>}
              </tr>
            </thead>
            <tbody>
              {codes.map((code) =>
                editingId === code.id ? (
                  <tr key={code.id} className="border-t border-slate-100 bg-blue-50">
                    <td className="px-4 py-2">
                      <input value={editState.device_number}
                        onChange={(e) => setEditState((p) => ({ ...p, device_number: e.target.value }))}
                        className={`${inp} w-20`} />
                    </td>
                    <td className="px-4 py-2">
                      <input value={editState.common_name}
                        onChange={(e) => setEditState((p) => ({ ...p, common_name: e.target.value }))}
                        className={inp} />
                    </td>
                    <td className="px-4 py-2">
                      <input value={editState.description}
                        onChange={(e) => setEditState((p) => ({ ...p, description: e.target.value }))}
                        className={inp} />
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex gap-2">
                        <button onClick={() => handleSaveEdit(code.id)} disabled={saving}
                          className="text-xs text-blue-600 hover:underline disabled:opacity-50">Save</button>
                        <button onClick={() => setEditingId(null)}
                          className="text-xs text-slate-500 hover:underline">Cancel</button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={code.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono font-semibold text-slate-800">{code.device_number}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{code.common_name}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{code.description}</td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <div className="flex gap-3 justify-end">
                          <button onClick={() => startEdit(code)} className="text-xs text-blue-600 hover:underline">Edit</button>
                          <button onClick={() => handleDelete(code.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                        </div>
                      </td>
                    )}
                  </tr>
                )
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const inp = "w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
