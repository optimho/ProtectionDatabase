import { notFound } from "next/navigation";
import { getDevice } from "@/lib/devices";
import { listMaintenance } from "@/lib/maintenance";
import { getFormTemplateByPartNumber, type FieldSchema } from "@/lib/form-templates";
import { getReport } from "@/lib/reports";
import { getLog } from "@/lib/log";
import PrintTrigger from "./PrintTrigger";

export const dynamic = "force-dynamic";

const CHECK_LABELS: { key: string; label: string }[] = [
  { key: "settings_checked_to_master", label: "Settings checked to master" },
  { key: "onload_check", label: "On-load check" },
  { key: "trip_function_proved", label: "Trip function proved" },
  { key: "ct_secondary_insulation_check", label: "CT secondary insulation check" },
  { key: "vt_secondary_insulation_check", label: "VT secondary insulation check" },
  { key: "ct_loop_check", label: "CT loop check" },
  { key: "vt_loop_check", label: "VT loop check" },
  { key: "relay_tested_analogues", label: "Relay tested — analogues" },
  { key: "relay_tested_comprehensive", label: "Relay tested — comprehensive" },
];

export default async function PrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const device = await getDevice(id);
  if (!device) notFound();

  const [maintenance, formTemplate, report, log] = await Promise.all([
    listMaintenance(id),
    getFormTemplateByPartNumber(device.part_number),
    device.report_id ? getReport(device.report_id) : null,
    getLog(id),
  ]);

  const templateFields: FieldSchema[] = formTemplate
    ? JSON.parse(formTemplate.maintenance_fields_json ?? "[]")
    : [];
  const deviceFields: Record<string, string> = JSON.parse(device.device_fields_json ?? "{}");

  const printedAt = new Date().toLocaleDateString("en-NZ", {
    year: "numeric", month: "long", day: "numeric",
  });

  return (
    <>
      {/* Hide the nav sidebar and overflow constraints during print */}
      <style>{`
        @media print {
          aside { display: none !important; }
          main { overflow: visible !important; }
          @page { margin: 15mm 15mm 15mm 15mm; }
        }
      `}</style>

      <div className="p-8 max-w-4xl mx-auto text-slate-900">
        <PrintTrigger />

        {/* Report header */}
        <div className="border-b-2 border-slate-800 pb-4 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold font-mono">{device.kks_full}</h1>
              <p className="text-slate-600 mt-0.5">{device.device_type} — {device.device_location}</p>
            </div>
            <div className="text-right text-sm text-slate-500">
              <p>Protection Device Database</p>
              <p>Printed: {printedAt}</p>
            </div>
          </div>
          {device.decommissioned_at && (
            <div className="mt-3 px-3 py-2 border border-red-400 bg-red-50 rounded text-sm text-red-700 font-medium">
              DECOMMISSIONED — by {device.decommissioned_by_name} on {device.decommissioned_at.slice(0, 10)}
              {device.decommission_reason && ` · Reason: ${device.decommission_reason}`}
            </div>
          )}
        </div>

        {/* Device information */}
        <section className="mb-8">
          <h2 className="text-base font-semibold text-slate-800 mb-3 uppercase tracking-wide text-xs border-b border-slate-200 pb-1">
            Device Information
          </h2>
          <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <InfoRow label="Part Number" value={device.part_number} />
            <InfoRow label="Device Type" value={device.device_type} />
            <InfoRow label="Serial Number" value={device.serial_number ?? "—"} />
            <InfoRow label="Firmware" value={device.firmware ?? "—"} />
            <InfoRow label="Commissioning Date" value={device.commissioning_date ?? "—"} />
            <InfoRow label="Location" value={device.device_location} />
            <InfoRow label="Circuit" value={device.circuit} />
            <InfoRow label="EIPC" value={device.eipc ? "Yes" : "No"} />
            <InfoRow
              label="Maintenance Period"
              value={device.maintenance_period_years ? `${device.maintenance_period_years} year${device.maintenance_period_years === 1 ? "" : "s"}` : "Not set"}
            />
            <InfoRow label="KKS Code" value={device.kks_full} mono />
            {templateFields.map((field) => {
              const raw = deviceFields[field.key] ?? "";
              let display = raw || "—";
              if (field.type === "checkbox") display = raw === "true" ? "Yes" : "No";
              return <InfoRow key={field.key} label={field.label} value={display} />;
            })}
          </dl>

          {report && (
            <div className="mt-4 pt-3 border-t border-slate-100">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Linked Protection Report</p>
              <p className="text-sm font-medium">{report.title}</p>
              <p className="text-xs text-slate-500">{report.report_number} · Rev {report.revision} · {report.date}</p>
              {report.description && <p className="text-xs text-slate-500 mt-0.5">{report.description}</p>}
            </div>
          )}
        </section>

        {/* Journal */}
        <section className="mb-8">
          <h2 className="text-base font-semibold text-slate-800 mb-3 uppercase tracking-wide text-xs border-b border-slate-200 pb-1">
            Device Journal ({log.length} entr{log.length !== 1 ? "ies" : "y"})
          </h2>
          {log.length === 0 ? (
            <p className="text-sm text-slate-400">No journal entries.</p>
          ) : (
            <div className="space-y-1">
              {log.map((entry) => (
                <div key={entry.id} className="flex gap-3 py-2 border-b border-slate-100 text-sm">
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

        {/* Maintenance records */}
        <section>
          <h2 className="text-base font-semibold text-slate-800 mb-3 uppercase tracking-wide text-xs border-b border-slate-200 pb-1">
            Maintenance History ({maintenance.length} record{maintenance.length !== 1 ? "s" : ""})
          </h2>

          {maintenance.length === 0 ? (
            <p className="text-sm text-slate-400">No maintenance records.</p>
          ) : (
            <div className="space-y-6">
              {maintenance.map((m, i) => {
                const formData: Record<string, string> = JSON.parse(m.form_data_json ?? "{}");
                const checkedCount = CHECK_LABELS.filter(
                  (c) => (m as unknown as Record<string, number>)[c.key] === 1
                ).length;

                return (
                  <div key={m.id} className="border border-slate-200 rounded-lg p-4 break-inside-avoid">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-sm">
                        Record {maintenance.length - i} — {m.date}
                      </h3>
                      <span className="text-xs text-slate-500">
                        {checkedCount}/{CHECK_LABELS.length} checks passed
                      </span>
                    </div>

                    {/* Standard checks */}
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 mb-3">
                      {CHECK_LABELS.map((c) => {
                        const passed = (m as unknown as Record<string, number>)[c.key] === 1;
                        return (
                          <div key={c.key} className="flex items-center gap-2 text-xs">
                            <span className={`w-3.5 h-3.5 flex items-center justify-center rounded border text-[9px] font-bold flex-shrink-0 ${passed ? "bg-green-100 border-green-400 text-green-700" : "bg-slate-50 border-slate-300 text-slate-400"}`}>
                              {passed ? "✓" : ""}
                            </span>
                            <span className={passed ? "text-slate-700" : "text-slate-400"}>{c.label}</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Device-specific fields */}
                    {templateFields.length > 0 && (
                      <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs mb-3 pt-2 border-t border-slate-100">
                        {templateFields.map((field) => {
                          const raw = formData[field.key] ?? "";
                          let display = raw || "—";
                          if (field.type === "checkbox") display = raw === "true" ? "Yes" : "No";
                          return (
                            <div key={field.key} className="flex gap-2">
                              <span className="text-slate-500 flex-shrink-0">{field.label}:</span>
                              <span className="font-medium">{display}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Notes */}
                    {m.notes && (
                      <div className="pt-2 border-t border-slate-100">
                        <p className="text-xs text-slate-500 mb-0.5">Notes</p>
                        <p className="text-sm whitespace-pre-wrap">{m.notes}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <>
      <dt className="text-slate-500">{label}</dt>
      <dd className={`font-medium ${mono ? "font-mono text-xs" : ""}`}>{value}</dd>
    </>
  );
}
