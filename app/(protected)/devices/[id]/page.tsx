import Link from "next/link";
import { notFound } from "next/navigation";
import { getDevice } from "@/lib/devices";
import { listSettings } from "@/lib/settings";
import { listMaintenance } from "@/lib/maintenance";
import { getReport } from "@/lib/reports";
import { getPartByNumber, listManuals } from "@/lib/parts";
import { getFormTemplateByPartNumber, type FieldSchema } from "@/lib/form-templates";
import LogPanel from "@/components/LogPanel";

export const dynamic = "force-dynamic";

export default async function DeviceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const device = await getDevice(id);
  if (!device) notFound();

  const part = await getPartByNumber(device.part_number);

  const [settings, maintenance, report, manuals, formTemplate] = await Promise.all([
    listSettings(id),
    listMaintenance(id),
    device.report_id ? getReport(device.report_id) : null,
    part ? listManuals(part.id) : Promise.resolve([]),
    getFormTemplateByPartNumber(device.part_number),
  ]);

  const templateFields: FieldSchema[] = formTemplate
    ? JSON.parse(formTemplate.maintenance_fields_json ?? "[]")
    : [];
  const deviceFields: Record<string, string> = JSON.parse(device.device_fields_json ?? "{}");

  const latestSetting = settings[0];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-700">← Dashboard</Link>
          <h1 className="text-2xl font-semibold text-slate-900 mt-1 font-mono">{device.kks_full}</h1>
          <p className="text-slate-500 text-sm mt-0.5">{device.device_type} — {device.device_location}</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Link href={`/devices/${id}/edit`} className="px-3 py-1.5 border border-slate-300 text-slate-700 text-sm rounded-md hover:bg-slate-50">Edit</Link>
          <Link href={`/devices/${id}/maintenance/new`} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">New Maintenance</Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Device info */}
        <div className="lg:col-span-2 space-y-4">
          <Card title="Device Information">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <Detail label="Part Number" value={device.part_number} />
              <Detail label="Device Type" value={device.device_type} />
              <Detail label="Serial Number" value={device.serial_number ?? "—"} />
              <Detail label="Firmware" value={device.firmware ?? "—"} />
              <Detail label="Commissioning Date" value={device.commissioning_date ?? "—"} />
              <Detail label="Location" value={device.device_location} />
              <Detail label="Circuit" value={device.circuit} />
              <Detail label="EIPC" value={device.eipc ? "Yes" : "No"} />
              <Detail
                label="Maintenance Period"
                value={device.maintenance_period_years ? `${device.maintenance_period_years} year${device.maintenance_period_years === 1 ? "" : "s"}` : "Not set"}
              />
              {templateFields.map((field) => {
                const raw = deviceFields[field.key] ?? "";
                let display = raw || "—";
                if (field.type === "checkbox") display = raw === "true" ? "Yes" : "No";
                return <Detail key={field.key} label={field.label} value={display} />;
              })}
            </dl>
          </Card>

{/* Links to sub-pages */}
          <div className="grid grid-cols-2 gap-3">
            <NavCard href={`/devices/${id}/elements`} label="Protection Elements" />
            <NavCard href={`/devices/${id}/maintenance/new`} label="New Maintenance" />
          </div>

          {/* Maintenance history */}
          <Card title="Maintenance History">
            {maintenance.length === 0 ? (
              <p className="text-sm text-slate-400">No maintenance records yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-xs text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="text-left py-2">Date</th>
                    <th className="text-left py-2">Notes</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {maintenance.map((m) => (
                    <tr key={m.id} className="border-b border-slate-50">
                      <td className="py-2 font-mono text-xs">{m.date}</td>
                      <td className="py-2 text-slate-600 truncate max-w-xs">{m.notes || "—"}</td>
                      <td className="py-2 text-right">
                        <Link href={`/devices/${id}/maintenance/${m.id}`} className="text-blue-600 hover:underline text-xs">View</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Latest settings */}
          <Card title="Master Settings">
            {latestSetting ? (
              <div className="space-y-1 text-sm">
                <p><span className="text-slate-500">Revision:</span> <span className="font-medium">{latestSetting.revision}</span></p>
                <p><span className="text-slate-500">Date:</span> {latestSetting.date}</p>
                <p className="text-slate-600 text-xs">{latestSetting.description}</p>
                <a
                  href={`/api/devices/${id}/settings/${latestSetting.id}/download`}
                  className="inline-block mt-1 text-xs text-blue-600 hover:underline"
                >
                  Download
                </a>
              </div>
            ) : (
              <p className="text-sm text-slate-400">No settings uploaded.</p>
            )}
            <Link href={`/devices/${id}/settings`} className="mt-2 block text-xs text-blue-600 hover:underline">
              View all revisions →
            </Link>
          </Card>

          {/* Linked report */}
          <Card title="Protection Report">
            {report ? (
              <div className="space-y-1 text-sm">
                <p className="font-medium">{report.title}</p>
                <p className="text-xs text-slate-500">{report.report_number} · Rev {report.revision} · {report.date}</p>
                <p className="text-xs text-slate-600">{report.description}</p>
                <a href={`/api/reports/${report.id}/download`} className="inline-block mt-1 text-xs text-blue-600 hover:underline">Download</a>
              </div>
            ) : (
              <p className="text-sm text-slate-400">No report linked.</p>
            )}
          </Card>

          {/* Relay type manuals */}
          <Card title="Manuals">
            {manuals.length === 0 ? (
              <p className="text-sm text-slate-400">No manuals uploaded for this relay type.</p>
            ) : (
              <ul className="space-y-2">
                {manuals.map((m) => (
                  <li key={m.id}>
                    <a
                      href={`/api/parts/${part!.id}/manuals/${m.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-blue-600 hover:underline block"
                    >
                      {m.original_name}
                    </a>
                    {m.description && (
                      <p className="text-xs text-slate-400 mt-0.5">{m.description}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Log */}
          <Card title="Journal">
            <LogPanel deviceId={id} />
          </Card>
        </div>
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

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <>
      <dt className="text-slate-500">{label}</dt>
      <dd className={`font-medium text-slate-900 ${mono ? "font-mono" : ""}`}>{value}</dd>
    </>
  );
}

function NavCard({ href, label, count }: { href: string; label: string; count?: number }) {
  return (
    <Link href={href} className="bg-white rounded-lg border border-slate-200 p-3 hover:border-blue-300 hover:bg-blue-50 transition-colors block text-center">
      <p className="text-sm font-medium text-slate-700">{label}</p>
      {count !== undefined && <p className="text-xs text-slate-400 mt-0.5">{count} records</p>}
    </Link>
  );
}
