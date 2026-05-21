"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DecommissionButton({ deviceId }: { deviceId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [byName, setByName] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const res = await fetch(`/api/devices/${deviceId}/decommission`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decommissioned_by_name: byName, decommission_reason: reason }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to decommission device");
      setSubmitting(false);
      return;
    }

    router.push("/dashboard");
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 border border-red-300 text-red-600 text-sm rounded-md hover:bg-red-50"
      >
        Decommission
      </button>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={() => !submitting && setOpen(false)}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg border border-slate-200 shadow-xl w-full max-w-md p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-1">Decommission Relay</h2>
          <p className="text-sm text-slate-500 mb-4">
            This relay will be marked as decommissioned. All historical data is preserved.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Decommissioned by <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={byName}
                onChange={(e) => setByName(e.target.value)}
                placeholder="Engineer's name"
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Reason for decommissioning <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Relay failed, replaced with upgraded unit"
                required
                rows={3}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
              />
            </div>

            {error && <p className="text-xs text-red-600">{error}</p>}

            <div className="flex gap-2 justify-end pt-1">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={submitting}
                className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-1.5 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {submitting ? "Decommissioning…" : "Confirm Decommission"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
