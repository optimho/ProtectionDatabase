"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import FileUploader, { type UploadedFile } from "@/components/FileUploader";

const CHECKBOXES = [
  { key: "settings_checked_to_master", label: "Settings checked to master" },
  { key: "onload_check", label: "Onload check" },
  { key: "trip_function_proved", label: "Trip function proved" },
  { key: "ct_secondary_insulation_check", label: "CT secondary insulation check" },
  { key: "vt_secondary_insulation_check", label: "VT secondary insulation check" },
  { key: "ct_loop_check", label: "CT loop check" },
  { key: "vt_loop_check", label: "VT loop check" },
];

const FILE_TYPES = [
  { value: "asleft_settings", label: "As-Left Settings" },
  { value: "electronic_test", label: "Electronic Test File" },
  { value: "test_report", label: "Test Report" },
  { value: "misc", label: "Miscellaneous" },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MaintenanceRecord = Record<string, any>;

export default function MaintenanceDetailPage() {
  const { id, mid } = useParams<{ id: string; mid: string }>();
  const [record, setRecord] = useState<MaintenanceRecord | null>(null);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [formData, setFormData] = useState<Record<string, unknown>>({});

  const fetchRecord = useCallback(async () => {
    const r = await fetch(`/api/devices/${id}/maintenance/${mid}`);
    if (r.ok) {
      const data = await r.json();
      setRecord(data);
      setFiles(data.files ?? []);
      setFormData(JSON.parse(data.form_data_json ?? "{}"));
    }
  }, [id, mid]);

  useEffect(() => { fetchRecord(); }, [fetchRecord]);

  if (!record) return <div className="p-6 text-sm text-slate-500">Loading…</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Link href={`/devices/${id}`} className="text-sm text-slate-500 hover:text-slate-700">← Device</Link>
        <h1 className="text-xl font-semibold text-slate-900">Maintenance — {record.date}</h1>
      </div>

      <div className="space-y-5">
        <Card title="Checks Performed">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {CHECKBOXES.map(({ key, label }) => (
              <div key={key} className="flex items-center gap-2">
                <span className={`h-4 w-4 flex-shrink-0 rounded flex items-center justify-center text-xs ${record[key] ? "bg-green-500 text-white" : "bg-slate-200 text-slate-400"}`}>
                  {record[key] ? "✓" : "✗"}
                </span>
                <span className={`text-sm ${record[key] ? "text-slate-900" : "text-slate-400"}`}>{label}</span>
              </div>
            ))}
          </div>
        </Card>

        {Object.keys(formData).length > 0 && (
          <Card title="Device-Specific Data">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {Object.entries(formData).map(([k, v]) => (
                <div key={k}>
                  <dt className="text-slate-500 text-xs">{k}</dt>
                  <dd className="font-medium text-slate-900">{String(v)}</dd>
                </div>
              ))}
            </dl>
          </Card>
        )}

        {record.notes && (
          <Card title="Notes">
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{record.notes}</p>
          </Card>
        )}

        <Card title="Test Result Files">
          <FileUploader
            files={files}
            uploadUrl={`/api/devices/${id}/maintenance/${mid}/files`}
            downloadUrlFn={(f) => `/api/devices/${id}/maintenance/${mid}/files/${f.id}`}
            deleteUrlFn={(f) => `/api/devices/${id}/maintenance/${mid}/files/${f.id}`}
            onRefresh={fetchRecord}
            showFileType
            fileTypeOptions={FILE_TYPES}
          />
        </Card>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <h2 className="text-sm font-semibold text-slate-700 mb-3 pb-2 border-b border-slate-100">{title}</h2>
      {children}
    </div>
  );
}
