"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Report {
  id: string;
  title: string;
  report_number: string;
  revision: string;
  date: string;
}

interface Props {
  deviceId: string;
  currentReportId: string | null;
}

export default function LinkReportButton({ deviceId, currentReportId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch("/api/reports").then((r) => r.json()).then(setReports);
  }, [open]);

  async function link(reportId: string | null) {
    setSaving(true);
    await fetch(`/api/devices/${deviceId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ report_id: reportId }),
    });
    setSaving(false);
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-2 text-xs text-blue-600 hover:underline"
      >
        {currentReportId ? "Change linked report" : "Link a report →"}
      </button>
    );
  }

  return (
    <div className="mt-2 space-y-2">
      <p className="text-xs font-medium text-slate-600">Select a report to link:</p>
      <div className="max-h-48 overflow-y-auto space-y-1 border border-slate-200 rounded-md p-1 bg-white">
        {reports.length === 0 && (
          <p className="text-xs text-slate-400 px-2 py-1">No reports available.</p>
        )}
        {reports.map((r) => (
          <button
            key={r.id}
            onClick={() => link(r.id)}
            disabled={saving}
            className={`w-full text-left px-2 py-1.5 rounded text-xs hover:bg-blue-50 hover:text-blue-700 transition-colors ${r.id === currentReportId ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-700"}`}
          >
            <span className="font-medium">{r.title}</span>
            <span className="text-slate-400 ml-1">· {r.report_number} · Rev {r.revision} · {r.date}</span>
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        {currentReportId && (
          <button
            onClick={() => link(null)}
            disabled={saving}
            className="text-xs text-red-500 hover:underline"
          >
            Remove link
          </button>
        )}
        <button
          onClick={() => setOpen(false)}
          className="text-xs text-slate-400 hover:underline"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
