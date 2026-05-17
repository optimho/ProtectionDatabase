"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "@/lib/auth-client";
import { REPORT_TYPES, type ReportType } from "@/lib/report-types";

interface SavedReport {
  id: string;
  name: string;
  description: string;
  report_type: ReportType;
  parameters_json: string;
  created_by: string;
  created_at: string;
}

interface ReportResult {
  columns: { key: string; label: string }[];
  rows: Record<string, string | number | null>[];
  summary?: string;
}

const emptyNew = { name: "", description: "", report_type: "device_inventory" as ReportType, date_from: "", date_to: "", station: "", device_kks: "", months_ahead: "3", firmware_filter: "" };

export default function AnalyticsPage() {
  const { data: session } = useSession();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isAdmin = (session?.user as any)?.role === "admin";

  const [reports, setReports] = useState<SavedReport[]>([]);
  const [devices, setDevices] = useState<{ id: string; kks_full: string; kks_station: string; device_type: string }[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState(emptyNew);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Results state: reportId → result (or "loading")
  const [results, setResults] = useState<Record<string, ReportResult | "loading" | "error">>({});

  const fetchReports = useCallback(async () => {
    const r = await fetch("/api/analytics");
    if (r.ok) setReports(await r.json());
  }, []);

  useEffect(() => { fetchReports(); }, [fetchReports]);
  useEffect(() => {
    fetch("/api/devices").then((r) => r.ok ? r.json() : []).then(setDevices);
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(""); setCreating(true);
    const needsDates = newForm.report_type === "maintenance_history";
    const r = await fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newForm.name,
        description: newForm.description,
        report_type: newForm.report_type,
        parameters: {
          ...(needsDates && newForm.date_from ? { date_from: newForm.date_from } : {}),
          ...(needsDates && newForm.date_to   ? { date_to:   newForm.date_to   } : {}),
          ...(newForm.device_kks ? { device_kks: newForm.device_kks } : newForm.station ? { station: newForm.station } : {}),
          ...(newForm.report_type === "maintenance_upcoming" ? { months_ahead: parseInt(newForm.months_ahead) || 3 } : {}),
          ...(newForm.report_type === "firmware_search" && newForm.firmware_filter ? { firmware_filter: newForm.firmware_filter } : {}),
        },
      }),
    });
    setCreating(false);
    if (!r.ok) { const j = await r.json(); setCreateError(j.error ?? "Failed"); return; }
    setNewForm(emptyNew);
    setShowNew(false);
    fetchReports();
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete report "${name}"?`)) return;
    await fetch(`/api/analytics/${id}`, { method: "DELETE" });
    setResults((prev) => { const n = { ...prev }; delete n[id]; return n; });
    fetchReports();
  }

  async function handleRun(id: string) {
    setResults((prev) => ({ ...prev, [id]: "loading" }));
    const r = await fetch(`/api/analytics/${id}/run`);
    if (!r.ok) { setResults((prev) => ({ ...prev, [id]: "error" })); return; }
    const data = await r.json();
    setResults((prev) => ({ ...prev, [id]: data }));
  }

  function handleExportCsv(report: SavedReport, result: ReportResult) {
    const header = result.columns.map((c) => `"${c.label}"`).join(",");
    const body = result.rows.map((row) =>
      result.columns.map((c) => {
        const v = row[c.key];
        return v == null ? "" : `"${String(v).replace(/"/g, '""')}"`;
      }).join(",")
    ).join("\n");
    const csv = `${header}\n${body}`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${report.name.replace(/[^a-z0-9]/gi, "_")}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const selectedTypeInfo = REPORT_TYPES.find((t) => t.value === newForm.report_type);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Analytics</h1>
          <p className="text-sm text-slate-500 mt-0.5">Run reports across the device fleet</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowNew((v) => !v)}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
          >
            {showNew ? "Cancel" : "+ New Report"}
          </button>
        )}
      </div>

      {/* ── Create form (admin only) ── */}
      {showNew && (
        <form onSubmit={handleCreate} className="bg-white rounded-lg border border-slate-200 p-5 mb-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-700">New Report Definition</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Report Name *</label>
              <input required type="text" value={newForm.name}
                onChange={(e) => setNewForm((p) => ({ ...p, name: e.target.value }))}
                className={inp} placeholder="e.g. Q2 Device Inventory" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Report Type *</label>
              <select value={newForm.report_type}
                onChange={(e) => setNewForm((p) => ({ ...p, report_type: e.target.value as ReportType }))}
                className={inp}>
                {REPORT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
              <input type="text" value={newForm.description}
                onChange={(e) => setNewForm((p) => ({ ...p, description: e.target.value }))}
                className={inp} placeholder="Optional notes about this report" />
            </div>
            {selectedTypeInfo && (
              <div className="sm:col-span-2 text-xs text-slate-500 bg-slate-50 rounded px-3 py-2">
                {selectedTypeInfo.description}
              </div>
            )}
            {/* Station filter (device_inventory) */}
            {newForm.report_type === "device_inventory" && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Station filter (optional)</label>
                <input type="text" value={newForm.station}
                  onChange={(e) => setNewForm((p) => ({ ...p, station: e.target.value }))}
                  className={inp} placeholder="e.g. OKI (leave blank for all)" />
              </div>
            )}
            {/* Station filter (maintenance_due) */}
            {newForm.report_type === "maintenance_due" && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Station</label>
                <select value={newForm.station}
                  onChange={(e) => setNewForm((p) => ({ ...p, station: e.target.value }))}
                  className={inp}>
                  <option value="">All stations</option>
                  {[...new Set(devices.map((d) => d.kks_station))].sort().map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            )}
            {/* Device or station filter (elements_per_relay) */}
            {newForm.report_type === "elements_per_relay" && (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Single device (optional)</label>
                  <select value={newForm.device_kks}
                    onChange={(e) => setNewForm((p) => ({ ...p, device_kks: e.target.value, station: "" }))}
                    className={inp}>
                    <option value="">All devices (or filter by station below)</option>
                    {devices.map((d) => (
                      <option key={d.id} value={d.kks_full}>{d.kks_full} — {d.device_type}</option>
                    ))}
                  </select>
                </div>
                {!newForm.device_kks && (
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Station filter (optional)</label>
                    <input type="text" value={newForm.station}
                      onChange={(e) => setNewForm((p) => ({ ...p, station: e.target.value }))}
                      className={inp} placeholder="e.g. OKI (leave blank for all)" />
                  </div>
                )}
              </>
            )}
            {/* Firmware filter (firmware_search) */}
            {newForm.report_type === "firmware_search" && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Firmware string *</label>
                <input type="text" value={newForm.firmware_filter}
                  onChange={(e) => setNewForm((p) => ({ ...p, firmware_filter: e.target.value }))}
                  className={inp} placeholder="e.g. R31 — matches R311, R312, R313…" />
                <p className="text-xs text-slate-400 mt-1">Partial match — any device whose firmware contains this string will appear.</p>
              </div>
            )}
            {/* Look-ahead window (maintenance_upcoming) */}
            {newForm.report_type === "maintenance_upcoming" && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Look-ahead window (months)</label>
                <select value={newForm.months_ahead}
                  onChange={(e) => setNewForm((p) => ({ ...p, months_ahead: e.target.value }))}
                  className={inp}>
                  <option value="1">1 month</option>
                  <option value="2">2 months</option>
                  <option value="3">3 months</option>
                  <option value="6">6 months</option>
                  <option value="9">9 months</option>
                  <option value="12">12 months</option>
                  <option value="18">18 months</option>
                  <option value="24">24 months</option>
                </select>
              </div>
            )}
            {/* Date range (maintenance_history) */}
            {newForm.report_type === "maintenance_history" && (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">From date</label>
                  <input type="date" value={newForm.date_from}
                    onChange={(e) => setNewForm((p) => ({ ...p, date_from: e.target.value }))}
                    className={inp} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">To date</label>
                  <input type="date" value={newForm.date_to}
                    onChange={(e) => setNewForm((p) => ({ ...p, date_to: e.target.value }))}
                    className={inp} />
                </div>
              </>
            )}
          </div>
          {createError && <p className="text-sm text-red-600">{createError}</p>}
          <button type="submit" disabled={creating}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50">
            {creating ? "Creating…" : "Create Report"}
          </button>
        </form>
      )}

      {/* ── Report list ── */}
      {reports.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-8 text-center text-sm text-slate-400">
          {isAdmin ? 'No reports yet — click "+ New Report" to create one.' : "No reports have been created yet."}
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => {
            const typeInfo = REPORT_TYPES.find((t) => t.value === report.report_type);
            const params: Record<string, string> = JSON.parse(report.parameters_json ?? "{}");
            const result = results[report.id];

            return (
              <div key={report.id} className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                {/* Report header */}
                <div className="flex items-start justify-between px-5 py-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-slate-900">{report.name}</h3>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                        {typeInfo?.label ?? report.report_type}
                      </span>
                      {params.device_kks && (
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-mono">
                          {params.device_kks}
                        </span>
                      )}
                      {!params.device_kks && params.station && (
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                          Station: {params.station}
                        </span>
                      )}
                      {params.months_ahead && (
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                          Next {params.months_ahead} month{Number(params.months_ahead) !== 1 ? "s" : ""}
                        </span>
                      )}
                      {params.firmware_filter && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-mono">
                          fw: {params.firmware_filter}
                        </span>
                      )}
                      {params.date_from && (
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                          {params.date_from} → {params.date_to || "now"}
                        </span>
                      )}
                    </div>
                    {report.description && (
                      <p className="text-xs text-slate-500 mt-0.5">{report.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                    <button
                      onClick={() => handleRun(report.id)}
                      disabled={result === "loading"}
                      className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-md hover:bg-green-700 disabled:opacity-50"
                    >
                      {result === "loading" ? "Running…" : "Run"}
                    </button>
                    {result && result !== "loading" && result !== "error" && (
                      <button
                        onClick={() => handleExportCsv(report, result)}
                        className="px-3 py-1.5 border border-slate-300 text-slate-700 text-xs rounded-md hover:bg-slate-50"
                      >
                        Export CSV
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(report.id, report.name)}
                        className="px-3 py-1.5 text-red-500 text-xs hover:underline"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>

                {/* Results */}
                {result === "error" && (
                  <div className="px-5 pb-4 text-sm text-red-600">Failed to run report.</div>
                )}
                {result && result !== "loading" && result !== "error" && (
                  <div className="border-t border-slate-100">
                    {/* Summary bar */}
                    <div className="px-5 py-2 bg-slate-50 text-xs text-slate-600 font-medium border-b border-slate-100">
                      {result.summary}
                    </div>
                    {result.rows.length === 0 ? (
                      <p className="px-5 py-4 text-sm text-slate-400">No data matched the report criteria.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50 text-xs text-slate-600 border-b border-slate-200">
                            <tr>
                              {result.columns.map((col) => (
                                <th key={col.key} className="text-left px-4 py-2 whitespace-nowrap font-medium">
                                  {col.label}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {result.rows.map((row, i) => (
                              <tr key={i} className={`border-t border-slate-50 ${i % 2 === 0 ? "" : "bg-slate-50/50"}`}>
                                {result.columns.map((col) => {
                                  const val = row[col.key];
                                  const isStatus = col.key === "Status";
                                  const isOverdue = isStatus && String(val).startsWith("OVERDUE");
                                  return (
                                    <td key={col.key}
                                      className={`px-4 py-2 ${isOverdue ? "text-red-600 font-semibold" : "text-slate-700"}`}>
                                      {val == null ? "—" : String(val)}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
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
