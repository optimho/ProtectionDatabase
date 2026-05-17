"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function DatabaseAdminPage() {
  const router = useRouter();

  // Restore state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [restoreMsg, setRestoreMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Clear state
  const [clearConfirm, setClearConfirm] = useState("");
  const [clearing, setClearing] = useState(false);
  const [clearMsg, setClearMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Backup
  function handleBackup() {
    window.location.href = "/api/admin/db/backup";
  }

  // Restore
  async function handleRestore(e: React.FormEvent) {
    e.preventDefault();
    if (!restoreFile) return;
    setRestoring(true);
    setRestoreMsg(null);

    const fd = new FormData();
    fd.append("file", restoreFile);

    const r = await fetch("/api/admin/db/restore", { method: "POST", body: fd });
    const json = await r.json();
    setRestoring(false);

    if (r.ok) {
      setRestoreMsg({ ok: true, text: "Database restored. Reloading…" });
      setRestoreFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setTimeout(() => router.push("/dashboard"), 1500);
    } else {
      setRestoreMsg({ ok: false, text: json.error ?? "Restore failed" });
    }
  }

  // Clear
  async function handleClear(e: React.FormEvent) {
    e.preventDefault();
    if (clearConfirm !== "CLEAR") return;
    setClearing(true);
    setClearMsg(null);

    const r = await fetch("/api/admin/db/clear", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confirm: "CLEAR" }),
    });
    const json = await r.json();
    setClearing(false);

    if (r.ok) {
      setClearMsg({ ok: true, text: "Database cleared successfully." });
      setClearConfirm("");
      router.refresh();
    } else {
      setClearMsg({ ok: false, text: json.error ?? "Clear failed" });
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Database Administration</h1>
        <p className="text-sm text-slate-500 mt-0.5">Admin-only — backup, restore, or clear the database</p>
      </div>

      {/* ── How backups work ── */}
      <section className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900 space-y-2">
        <p className="font-semibold">How backup and restore works</p>
        <ul className="list-disc list-inside space-y-1 text-blue-800">
          <li><span className="font-medium">Download Backup</span> — creates a single <code className="bg-blue-100 px-1 rounded">.zip</code> file containing the database and all uploaded files (reports, master settings, test results, manuals). This is your complete recovery point.</li>
          <li><span className="font-medium">Restore from Backup</span> — upload a <code className="bg-blue-100 px-1 rounded">.zip</code> created by Download Backup. Both the database and all uploaded files are restored. All current data is overwritten.</li>
          <li><span className="font-medium">Recommended schedule</span> — take a backup before any major changes and store the zip on a network drive or USB stick off the Raspberry Pi.</li>
        </ul>
      </section>

      {/* ── Backup ── */}
      <section className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-base font-semibold text-slate-800 mb-1">Download Backup</h2>
        <p className="text-sm text-slate-500 mb-1">
          Downloads a <code className="bg-slate-100 px-1 rounded">.zip</code> containing the database <em>and</em> all
          uploaded files (reports, settings, test results, manuals).
        </p>
        <p className="text-sm text-slate-500 mb-4">
          Store it somewhere safe — this zip is your complete recovery point.
        </p>
        <button
          onClick={handleBackup}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
        >
          Download Backup
        </button>
      </section>

      {/* ── Restore ── */}
      <section className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-base font-semibold text-slate-800 mb-1">Restore from Backup</h2>
        <p className="text-sm text-slate-500 mb-4">
          Upload a <code className="bg-slate-100 px-1 rounded">.zip</code> backup file created by the Download Backup
          button above. Both the database and all uploaded files will be restored.{" "}
          <span className="text-amber-600 font-medium">This overwrites all existing data.</span>
        </p>
        <form onSubmit={handleRestore} className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip,application/zip"
            onChange={(e) => setRestoreFile(e.target.files?.[0] ?? null)}
            className="block text-sm text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
          />
          {restoreMsg && (
            <p className={`text-sm font-medium ${restoreMsg.ok ? "text-green-600" : "text-red-600"}`}>
              {restoreMsg.text}
            </p>
          )}
          <button
            type="submit"
            disabled={!restoreFile || restoring}
            className="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-md hover:bg-amber-700 disabled:opacity-40"
          >
            {restoring ? "Restoring…" : "Restore from Backup"}
          </button>
        </form>
      </section>

      {/* ── Clear ── */}
      <section className="bg-white rounded-lg border border-red-200 p-6">
        <h2 className="text-base font-semibold text-red-700 mb-1">Clear Database</h2>
        <p className="text-sm text-slate-500 mb-1">
          Permanently deletes all devices, relays, maintenance records, reports, elements, settings, and form templates.
        </p>
        <p className="text-sm text-slate-500 mb-4">
          <span className="font-medium text-slate-700">Preserved:</span> user accounts, ANSI device number catalog.
        </p>
        <form onSubmit={handleClear} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Type <span className="font-mono font-bold text-red-600">CLEAR</span> to confirm
            </label>
            <input
              type="text"
              value={clearConfirm}
              onChange={(e) => setClearConfirm(e.target.value)}
              placeholder="CLEAR"
              className="px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-400 w-48"
            />
          </div>
          {clearMsg && (
            <p className={`text-sm font-medium ${clearMsg.ok ? "text-green-600" : "text-red-600"}`}>
              {clearMsg.text}
            </p>
          )}
          <button
            type="submit"
            disabled={clearConfirm !== "CLEAR" || clearing}
            className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 disabled:opacity-40"
          >
            {clearing ? "Clearing…" : "Clear All Data"}
          </button>
        </form>
      </section>
    </div>
  );
}
