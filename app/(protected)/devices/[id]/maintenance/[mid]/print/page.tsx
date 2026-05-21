import { notFound } from "next/navigation";
import { getDevice } from "@/lib/devices";
import { getMaintenance, listMaintenanceFiles } from "@/lib/maintenance";
import { getFormTemplateByPartNumber, type FieldSchema } from "@/lib/form-templates";
import { getLog } from "@/lib/log";
import PrintTrigger from "@/app/(protected)/devices/[id]/print/PrintTrigger";

export const dynamic = "force-dynamic";

const CHECK_LABELS: { key: string; label: string }[] = [
  { key: "settings_checked_to_master", label: "Settings checked to master" },
  { key: "onload_check", label: "Onload check" },
  { key: "trip_function_proved", label: "Trip function proved" },
  { key: "ct_secondary_insulation_check", label: "CT secondary insulation check" },
  { key: "vt_secondary_insulation_check", label: "VT secondary insulation check" },
  { key: "ct_loop_check", label: "CT loop check" },
  { key: "vt_loop_check", label: "VT loop check" },
  { key: "relay_tested_analogues", label: "Relay tested — Analogues, Inputs and Outputs" },
  { key: "relay_tested_comprehensive", label: "Relay tested — Comprehensive all elements" },
];

const FILE_TYPE_LABELS: Record<string, string> = {
  asleft_settings: "As-Left Settings",
  electronic_test: "Electronic Test File",
  test_report: "Test Report",
  misc: "Miscellaneous",
};

export default async function MaintenancePrintPage({
  params,
}: {
  params: Promise<{ id: string; mid: string }>;
}) {
  const { id, mid } = await params;

  const [device, record] = await Promise.all([getDevice(id), getMaintenance(mid)]);
  if (!device || !record) notFound();

  const [files, formTemplate, log] = await Promise.all([
    listMaintenanceFiles(mid),
    getFormTemplateByPartNumber(device.part_number),
    getLog(id),
  ]);

  const templateFields: FieldSchema[] = formTemplate
    ? JSON.parse(formTemplate.maintenance_fields_json ?? "[]")
    : [];
  const formData: Record<string, string> = JSON.parse(record.form_data_json ?? "{}");

  const printedAt = new Date().toLocaleDateString("en-NZ", {
    year: "numeric", month: "long", day: "numeric",
  });

  const checkedCount = CHECK_LABELS.filter(
    (c) => (record as unknown as Record<string, number>)[c.key] === 1
  ).length;

  return (
    <>
      <style>{`
        @media print {
          aside { display: none !important; }
          main { overflow: visible !important; }
          @page { margin: 15mm 15mm 15mm 15mm; }
        }
      `}</style>

      <div className="p-8 max-w-4xl mx-auto text-slate-900">
        <PrintTrigger />

        {/* Header */}
        <div className="border-b-2 border-slate-800 pb-4 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide mb-0.5">Maintenance Record</p>
              <h1 className="text-2xl font-bold font-mono">{device.kks_full}</h1>
              <p className="text-slate-600 mt-0.5">{device.device_type} — {device.device_location} — Circuit: {device.circuit}</p>
            </div>
            <div className="text-right text-sm text-slate-500">
              <p>Protection Device Database</p>
              <p>Printed: {printedAt}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-6 text-sm">
            <span><span className="text-slate-500">Date:</span> <span className="font-semibold">{record.date}</span></span>
            <span><span className="text-slate-500">Checks passed:</span> <span className="font-semibold">{checkedCount}/{CHECK_LABELS.length}</span></span>
          </div>
        </div>

        {/* Device summary */}
        <section className="mb-6">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200 pb-1 mb-3">Device Information</h2>
          <dl className="grid grid-cols-3 gap-x-8 gap-y-2 text-sm">
            <InfoRow label="Part Number" value={device.part_number} />
            <InfoRow label="Serial Number" value={device.serial_number ?? "—"} />
            <InfoRow label="Firmware" value={device.firmware ?? "—"} />
            <InfoRow label="Commissioning Date" value={device.commissioning_date ?? "—"} />
            <InfoRow label="Location" value={device.device_location} />
            <InfoRow label="Circuit" value={device.circuit} />
          </dl>
        </section>

        {/* Checks */}
        <section className="mb-6">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200 pb-1 mb-3">Checks Performed</h2>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
            {CHECK_LABELS.map((c) => {
              const passed = (record as unknown as Record<string, number>)[c.key] === 1;
              return (
                <div key={c.key} className="flex items-center gap-2 text-sm">
                  <span className={`w-4 h-4 flex items-center justify-center rounded text-[10px] font-bold flex-shrink-0 border ${passed ? "bg-green-100 border-green-400 text-green-700" : "bg-slate-50 border-slate-300 text-slate-400"}`}>
                    {passed ? "✓" : "✗"}
                  </span>
                  <span className={passed ? "text-slate-800" : "text-slate-400"}>{c.label}</span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Device-specific fields */}
        {templateFields.length > 0 && (
          <section className="mb-6">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200 pb-1 mb-3">Device-Specific Data</h2>
            <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
              {templateFields.map((field) => {
                const raw = formData[field.key] ?? "";
                let display = raw || "—";
                if (field.type === "checkbox") display = raw === "true" ? "Yes" : "No";
                return <InfoRow key={field.key} label={field.label} value={display} />;
              })}
            </dl>
          </section>
        )}

        {/* Notes */}
        {record.notes && (
          <section className="mb-6">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200 pb-1 mb-3">Notes</h2>
            <p className="text-sm whitespace-pre-wrap text-slate-700">{record.notes}</p>
          </section>
        )}

        {/* Journal */}
        <section className="mb-6">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200 pb-1 mb-3">
            Device Journal ({log.length} entr{log.length !== 1 ? "ies" : "y"})
          </h2>
          {log.length === 0 ? (
            <p className="text-sm text-slate-400">No journal entries.</p>
          ) : (
            <div className="space-y-1">
              {log.map((entry) => (
                <div key={entry.id} className="flex gap-3 py-1.5 border-b border-slate-100 text-sm">
                  <span className="text-xs text-slate-400 w-32 flex-shrink-0 pt-0.5">{entry.created_at.slice(0, 16)}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium h-fit flex-shrink-0 ${
                    entry.entry_type === "maintenance" ? "bg-green-100 text-green-700" :
                    entry.entry_type === "settings_change" ? "bg-blue-100 text-blue-700" :
                    "bg-slate-100 text-slate-700"
                  }`}>
                    {entry.entry_type === "maintenance" ? "Maintenance" : entry.entry_type === "settings_change" ? "Settings" : "Note"}
                  </span>
                  <span className="text-slate-700">{entry.notes}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Attached files */}
        {files.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200 pb-1 mb-3">Attached Files</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 border-b border-slate-100">
                  <th className="text-left py-1.5">File</th>
                  <th className="text-left py-1.5">Type</th>
                  <th className="text-left py-1.5">Description</th>
                  <th className="text-left py-1.5">Date</th>
                </tr>
              </thead>
              <tbody>
                {files.map((f) => (
                  <tr key={f.id} className="border-b border-slate-50">
                    <td className="py-1.5 text-slate-700">{f.original_name}</td>
                    <td className="py-1.5 text-slate-500">{FILE_TYPE_LABELS[f.file_type] ?? f.file_type}</td>
                    <td className="py-1.5 text-slate-500">{f.description || "—"}</td>
                    <td className="py-1.5 text-slate-500">{f.created_at.slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </div>
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </>
  );
}
