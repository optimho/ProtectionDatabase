"use client";

import { useState, useEffect, useCallback } from "react";
import type { LogEntry } from "@/lib/log";

const typeLabel: Record<string, string> = {
  general: "Note",
  maintenance: "Maintenance",
  settings_change: "Settings",
};

const typeBadge: Record<string, string> = {
  general: "bg-slate-100 text-slate-700",
  maintenance: "bg-green-100 text-green-700",
  settings_change: "bg-blue-100 text-blue-700",
};

export default function LogPanel({ deviceId }: { deviceId: string }) {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchLog = useCallback(async () => {
    const r = await fetch(`/api/devices/${deviceId}/log`);
    if (r.ok) setEntries(await r.json());
  }, [deviceId]);

  useEffect(() => { fetchLog(); }, [fetchLog]);

  async function addEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!notes.trim()) return;
    setSaving(true);
    await fetch(`/api/devices/${deviceId}/log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes, entry_type: "general" }),
    });
    setNotes("");
    setSaving(false);
    fetchLog();
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-700">Device Journal</h3>

      <form onSubmit={addEntry} className="flex gap-2">
        <input
          type="text"
          placeholder="Add a note…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="flex-1 px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={saving || !notes.trim()}
          className="px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          Add
        </button>
      </form>

      <div className="space-y-2 max-h-80 overflow-y-auto">
        {entries.length === 0 && (
          <p className="text-sm text-slate-400 py-4 text-center">No log entries yet.</p>
        )}
        {entries.map((entry) => (
          <div key={entry.id} className="flex gap-3 py-2 border-b border-slate-100">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${typeBadge[entry.entry_type] ?? typeBadge.general}`}>
                  {typeLabel[entry.entry_type] ?? entry.entry_type}
                </span>
                <span className="text-xs text-slate-400">{entry.created_at.slice(0, 16)}</span>
              </div>
              <p className="text-sm text-slate-700">{entry.notes}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
