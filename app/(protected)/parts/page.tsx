import { listParts } from "@/lib/parts";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import DeletePartButton from "./DeletePartButton";

export const dynamic = "force-dynamic";

export default async function PartsPage() {
  const session = await getSession();
  if (!session || session.user.role !== "admin") redirect("/dashboard");

  const parts = await listParts();

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Relay Types</h1>
        <Link href="/parts/new" className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700">
          + New Relay Type
        </Link>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        {parts.length === 0 ? (
          <p className="p-6 text-sm text-slate-400">No parts yet. Create one to start adding devices.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-600 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3">Part Number</th>
                <th className="text-left px-4 py-3">Device Type</th>
                <th className="text-left px-4 py-3">Supply Voltage</th>
                <th className="text-left px-4 py-3">CT Input</th>
                <th className="text-left px-4 py-3">VT Input</th>
                <th className="text-left px-4 py-3">Stock Number</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {parts.map((p) => (
                <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono font-medium">{p.part_number}</td>
                  <td className="px-4 py-3 text-slate-700">{p.device_type}</td>
                  <td className="px-4 py-3 text-slate-500">{p.nominal_supply_voltage || "—"}</td>
                  <td className="px-4 py-3 text-slate-500">{p.nominal_ct_input || "—"}</td>
                  <td className="px-4 py-3 text-slate-500">{p.nominal_vt_input || "—"}</td>
                  <td className="px-4 py-3 text-slate-500">{p.stock_number || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3 justify-end">
                      <Link href={`/parts/${p.id}/edit`} className="text-xs text-blue-600 hover:underline">Edit</Link>
                      <DeletePartButton id={p.id} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
