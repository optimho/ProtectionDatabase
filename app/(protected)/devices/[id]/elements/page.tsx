"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface AnsiCode {
  id: string;
  device_number: string;
  common_name: string;
}

interface ElementSetting {
  id: string;
  element_id: string;
  setting_name: string;
  custom_name: string;
  description: string;
  value: string;
  unit: string;
  sort_order: number;
}

interface ProtectionElement {
  id: string;
  device_id: string;
  ansi_id: string | null;
  ansi_device_number: string | null;
  ansi_common_name: string | null;
  custom_name: string;
  description: string;
  enabled: number;
  sort_order: number;
  settings?: ElementSetting[];
}

const emptyNewSetting = { setting_name: "", custom_name: "", description: "", value: "", unit: "" };

export default function ElementsPage() {
  const { id } = useParams<{ id: string }>();
  const [ansiCodes, setAnsiCodes] = useState<AnsiCode[]>([]);
  const [elements, setElements] = useState<ProtectionElement[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Add element form
  const [newAnsiId, setNewAnsiId] = useState("");
  const [newCustomName, setNewCustomName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [addingElement, setAddingElement] = useState(false);

  // Elements document
  const [docName, setDocName] = useState<string | null>(null);
  const [docUploading, setDocUploading] = useState(false);
  const [docDeleting, setDocDeleting] = useState(false);

  const fetchDoc = useCallback(async () => {
    const r = await fetch(`/api/devices/${id}`);
    if (r.ok) {
      const d = await r.json();
      setDocName(d.elements_doc_original_name ?? null);
    }
  }, [id]);

  // Inline element edit
  const [editingElement, setEditingElement] = useState<string | null>(null);
  const [editEl, setEditEl] = useState({ custom_name: "", description: "" });

  // New setting per element
  const [newSetting, setNewSetting] = useState<Record<string, typeof emptyNewSetting>>({});
  const [addingSettingFor, setAddingSettingFor] = useState<string | null>(null);

  // Inline setting edit
  const [editingSetting, setEditingSetting] = useState<string | null>(null);
  const [editSetting, setEditSetting] = useState({ setting_name: "", custom_name: "", description: "", value: "", unit: "" });

  const fetchElements = useCallback(async () => {
    const r = await fetch(`/api/devices/${id}/elements`);
    if (!r.ok) return;
    const els: ProtectionElement[] = await r.json();
    const withSettings = await Promise.all(
      els.map(async (el) => {
        const sr = await fetch(`/api/devices/${id}/elements/${el.id}/settings`);
        const settings: ElementSetting[] = sr.ok ? await sr.json() : [];
        return { ...el, settings };
      })
    );
    setElements(withSettings);
  }, [id]);

  useEffect(() => {
    fetch("/api/ansi-device-numbers").then((r) => r.json()).then(setAnsiCodes);
    fetchElements();
    fetchDoc();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleDocUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setDocUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("originalName", file.name);
    await fetch(`/api/devices/${id}/elements-document`, { method: "POST", body: fd });
    setDocUploading(false);
    e.target.value = "";
    fetchDoc();
  }

  async function handleDocDelete() {
    if (!confirm("Remove the elements document?")) return;
    setDocDeleting(true);
    await fetch(`/api/devices/${id}/elements-document`, { method: "DELETE" });
    setDocDeleting(false);
    setDocName(null);
  }

  function displayName(el: ProtectionElement) {
    if (el.custom_name) return el.custom_name;
    if (el.ansi_common_name) return el.ansi_common_name;
    return "Unnamed Element";
  }

  function toggleExpanded(elId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(elId) ? next.delete(elId) : next.add(elId);
      return next;
    });
  }

  async function addElement(e: React.FormEvent) {
    e.preventDefault();
    if (!newAnsiId && !newCustomName.trim()) return;
    setAddingElement(true);
    await fetch(`/api/devices/${id}/elements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ansi_id: newAnsiId || undefined, custom_name: newCustomName, description: newDescription }),
    });
    setAddingElement(false);
    setNewAnsiId(""); setNewCustomName(""); setNewDescription("");
    fetchElements();
  }

  async function toggleEnabled(el: ProtectionElement) {
    await fetch(`/api/devices/${id}/elements/${el.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !el.enabled }),
    });
    fetchElements();
  }

  async function deleteElement(elId: string) {
    if (!confirm("Delete this protection element and all its settings?")) return;
    await fetch(`/api/devices/${id}/elements/${elId}`, { method: "DELETE" });
    fetchElements();
  }

  function startEditElement(el: ProtectionElement) {
    setEditingElement(el.id);
    setEditEl({ custom_name: el.custom_name, description: el.description });
  }

  async function saveEditElement(elId: string) {
    await fetch(`/api/devices/${id}/elements/${elId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editEl),
    });
    setEditingElement(null);
    fetchElements();
  }

  async function addSetting(e: React.FormEvent, elId: string) {
    e.preventDefault();
    const s = newSetting[elId] ?? emptyNewSetting;
    if (!s.setting_name.trim()) return;
    setAddingSettingFor(elId);
    await fetch(`/api/devices/${id}/elements/${elId}/settings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(s),
    });
    setAddingSettingFor(null);
    setNewSetting((prev) => ({ ...prev, [elId]: emptyNewSetting }));
    fetchElements();
  }

  function startEditSetting(s: ElementSetting) {
    setEditingSetting(s.id);
    setEditSetting({ setting_name: s.setting_name, custom_name: s.custom_name, description: s.description, value: s.value, unit: s.unit });
  }

  async function saveEditSetting(elId: string, sid: string) {
    await fetch(`/api/devices/${id}/elements/${elId}/settings/${sid}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editSetting),
    });
    setEditingSetting(null);
    fetchElements();
  }

  async function deleteSetting(elId: string, sid: string) {
    if (!confirm("Delete this setting?")) return;
    await fetch(`/api/devices/${id}/elements/${elId}/settings/${sid}`, { method: "DELETE" });
    fetchElements();
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/devices/${id}`} className="text-sm text-slate-500 hover:text-slate-700">← Device</Link>
        <h1 className="text-xl font-semibold text-slate-900">Protection Elements</h1>
      </div>

      {/* Elements Document */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-700">Elements Document</p>
          {docName ? (
            <p className="text-xs text-slate-500 mt-0.5">
              <span className="font-mono">{docName}</span>
            </p>
          ) : (
            <p className="text-xs text-slate-400 mt-0.5">No document uploaded yet.</p>
          )}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {docName && (
            <>
              <a
                href={`/api/devices/${id}/elements-document`}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700"
              >
                Open
              </a>
              <button
                onClick={handleDocDelete}
                disabled={docDeleting}
                className="text-xs text-red-500 hover:underline disabled:opacity-50"
              >
                {docDeleting ? "Removing…" : "Remove"}
              </button>
            </>
          )}
          <label className={`px-3 py-1.5 border border-slate-300 text-slate-700 text-xs rounded-md hover:bg-slate-50 cursor-pointer ${docUploading ? "opacity-50 pointer-events-none" : ""}`}>
            {docUploading ? "Uploading…" : docName ? "Replace" : "Upload Document"}
            <input type="file" className="sr-only" onChange={handleDocUpload} disabled={docUploading} />
          </label>
        </div>
      </div>

      {/* Add Element */}
      <form onSubmit={addElement} className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Add Protection Element</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">ANSI Device Number</label>
            <select value={newAnsiId} onChange={(e) => setNewAnsiId(e.target.value)} className={inp}>
              <option value="">— Select ANSI code —</option>
              {ansiCodes.map((a) => (
                <option key={a.id} value={a.id}>{a.device_number} — {a.common_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Custom Name <span className="text-slate-400">(optional override)</span></label>
            <input type="text" value={newCustomName} onChange={(e) => setNewCustomName(e.target.value)}
              placeholder="e.g. Phase OC Zone 1" className={inp} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
            <input type="text" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} className={inp} />
          </div>
        </div>
        <button type="submit" disabled={addingElement || (!newAnsiId && !newCustomName.trim())}
          className="mt-3 px-3 py-1.5 bg-slate-700 text-white text-sm rounded-md hover:bg-slate-800 disabled:opacity-40">
          {addingElement ? "Adding…" : "Add Element"}
        </button>
      </form>

      {/* Element list */}
      {elements.length === 0 ? (
        <p className="text-sm text-slate-400">No protection elements defined yet.</p>
      ) : (
        <div className="space-y-3">
          {elements.map((el) => {
            const isExpanded = expanded.has(el.id);
            const isEditingEl = editingElement === el.id;
            const ns = newSetting[el.id] ?? emptyNewSetting;

            return (
              <div key={el.id} className={`bg-white rounded-lg border ${el.enabled ? "border-slate-200" : "border-slate-100"} overflow-hidden`}>
                {/* Element header */}
                <div className="flex items-start justify-between p-4">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => toggleEnabled(el)}
                      title={el.enabled ? "Enabled — click to disable" : "Disabled — click to enable"}
                      className={`mt-0.5 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                        el.enabled ? "bg-blue-600 border-blue-600" : "bg-white border-slate-300"
                      }`}
                    >
                      {el.enabled ? <span className="text-white text-[10px] leading-none">✓</span> : null}
                    </button>
                    <div>
                      {el.ansi_device_number && (
                        <span className="inline-block font-mono text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded mr-2">
                          {el.ansi_device_number}
                        </span>
                      )}
                      <span className={`font-medium text-sm ${el.enabled ? "text-slate-900" : "text-slate-400 line-through"}`}>
                        {displayName(el)}
                      </span>
                      {el.description && <p className="text-xs text-slate-500 mt-0.5">{el.description}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                    <span className="text-xs text-slate-400">{el.settings?.length ?? 0} setting{el.settings?.length !== 1 ? "s" : ""}</span>
                    <button onClick={() => startEditElement(el)} className="text-xs text-blue-600 hover:underline">Edit</button>
                    <button onClick={() => toggleExpanded(el.id)} className="text-xs text-slate-500 hover:underline">
                      {isExpanded ? "Collapse ↑" : "Settings ↓"}
                    </button>
                    <button onClick={() => deleteElement(el.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                  </div>
                </div>

                {/* Inline element edit */}
                {isEditingEl && (
                  <div className="px-4 pb-4 pt-0 border-t border-slate-100 bg-slate-50">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 mt-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Custom Name</label>
                        <input type="text" value={editEl.custom_name}
                          onChange={(e) => setEditEl((p) => ({ ...p, custom_name: e.target.value }))}
                          className={inp} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
                        <input type="text" value={editEl.description}
                          onChange={(e) => setEditEl((p) => ({ ...p, description: e.target.value }))}
                          className={inp} />
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => saveEditElement(el.id)}
                        className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700">Save</button>
                      <button onClick={() => setEditingElement(null)}
                        className="px-3 py-1.5 border border-slate-300 text-slate-600 text-xs rounded hover:bg-slate-50">Cancel</button>
                    </div>
                  </div>
                )}

                {/* Settings panel */}
                {isExpanded && (
                  <div className="border-t border-slate-100">
                    {(el.settings?.length ?? 0) > 0 && (
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
                          <tr>
                            <th className="text-left px-4 py-2">Setting Name</th>
                            <th className="text-left px-4 py-2">Value</th>
                            <th className="text-left px-4 py-2">Unit</th>
                            <th className="text-left px-4 py-2">Description</th>
                            <th className="px-4 py-2"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {el.settings!.map((s) =>
                            editingSetting === s.id ? (
                              <tr key={s.id} className="border-b border-slate-100 bg-blue-50">
                                <td className="px-3 py-2"><input value={editSetting.setting_name} onChange={(e) => setEditSetting((p) => ({ ...p, setting_name: e.target.value }))} className={inpSm} /></td>
                                <td className="px-3 py-2"><input value={editSetting.value} onChange={(e) => setEditSetting((p) => ({ ...p, value: e.target.value }))} className={inpSm} /></td>
                                <td className="px-3 py-2"><input value={editSetting.unit} onChange={(e) => setEditSetting((p) => ({ ...p, unit: e.target.value }))} className={inpSm} /></td>
                                <td className="px-3 py-2"><input value={editSetting.description} onChange={(e) => setEditSetting((p) => ({ ...p, description: e.target.value }))} className={inpSm} /></td>
                                <td className="px-3 py-2 whitespace-nowrap">
                                  <button onClick={() => saveEditSetting(el.id, s.id)} className="text-blue-600 hover:underline mr-2">Save</button>
                                  <button onClick={() => setEditingSetting(null)} className="text-slate-400 hover:underline">Cancel</button>
                                </td>
                              </tr>
                            ) : (
                              <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50">
                                <td className="px-4 py-2 font-medium text-slate-800">{s.setting_name}</td>
                                <td className="px-4 py-2 font-mono text-slate-900">{s.value || "—"}</td>
                                <td className="px-4 py-2 text-slate-500">{s.unit || "—"}</td>
                                <td className="px-4 py-2 text-slate-400 max-w-xs truncate">{s.description || "—"}</td>
                                <td className="px-4 py-2 whitespace-nowrap">
                                  <button onClick={() => startEditSetting(s)} className="text-blue-600 hover:underline mr-2">Edit</button>
                                  <button onClick={() => deleteSetting(el.id, s.id)} className="text-red-500 hover:underline">Delete</button>
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    )}

                    {/* Add setting row */}
                    <form onSubmit={(e) => addSetting(e, el.id)} className="flex flex-wrap gap-2 px-4 py-3 bg-slate-50 border-t border-slate-100 items-end">
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Setting name *</label>
                        <input placeholder="e.g. Pickup" required value={ns.setting_name}
                          onChange={(e) => setNewSetting((p) => ({ ...p, [el.id]: { ...(p[el.id] ?? emptyNewSetting), setting_name: e.target.value } }))}
                          className={`${inpSm} w-32`} />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Value</label>
                        <input placeholder="e.g. 1.2" value={ns.value}
                          onChange={(e) => setNewSetting((p) => ({ ...p, [el.id]: { ...(p[el.id] ?? emptyNewSetting), value: e.target.value } }))}
                          className={`${inpSm} w-20`} />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Unit</label>
                        <input placeholder="e.g. A" value={ns.unit}
                          onChange={(e) => setNewSetting((p) => ({ ...p, [el.id]: { ...(p[el.id] ?? emptyNewSetting), unit: e.target.value } }))}
                          className={`${inpSm} w-16`} />
                      </div>
                      <div className="flex-1 min-w-28">
                        <label className="block text-xs text-slate-500 mb-1">Description</label>
                        <input placeholder="Optional" value={ns.description}
                          onChange={(e) => setNewSetting((p) => ({ ...p, [el.id]: { ...(p[el.id] ?? emptyNewSetting), description: e.target.value } }))}
                          className={`${inpSm} w-full`} />
                      </div>
                      <button type="submit" disabled={addingSettingFor === el.id}
                        className="px-3 py-1.5 bg-slate-700 text-white text-xs rounded hover:bg-slate-800 disabled:opacity-50 flex-shrink-0">
                        + Add Setting
                      </button>
                    </form>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const inp = "w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
const inpSm = "px-2 py-1.5 border border-slate-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 w-full";
