import { listFormTemplates } from "@/lib/form-templates";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import DeleteTemplateButton from "./DeleteTemplateButton";

export const dynamic = "force-dynamic";

export default async function FormTemplatesPage() {
  const session = await getSession();
  if (!session || session.user.role !== "admin") redirect("/dashboard");

  const templates = await listFormTemplates();

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Form Templates</h1>
        <Link href="/form-templates/new" className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700">
          + New Template
        </Link>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        {templates.length === 0 ? (
          <p className="p-6 text-sm text-slate-400">No form templates yet. Create one to define device-specific fields.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-600 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3">Part Number</th>
                <th className="text-left px-4 py-3">Device Type</th>
                <th className="text-left px-4 py-3">Maintenance Fields</th>
                <th className="text-left px-4 py-3">Settings Fields</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => {
                const mFields = JSON.parse(t.maintenance_fields_json).length;
                const sFields = JSON.parse(t.settings_fields_json).length;
                return (
                  <tr key={t.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono font-medium">{t.part_number}</td>
                    <td className="px-4 py-3 text-slate-700">{t.device_type_label}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{mFields} field{mFields !== 1 ? "s" : ""}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{sFields} field{sFields !== 1 ? "s" : ""}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3 justify-end">
                        <Link href={`/form-templates/${t.id}/edit`} className="text-xs text-blue-600 hover:underline">Edit</Link>
                        <DeleteTemplateButton id={t.id} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
