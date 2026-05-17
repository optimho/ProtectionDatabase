"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import DeviceTree from "@/components/DeviceTree";
import type { DeviceTree as DeviceTreeType } from "@/lib/devices";

export default function DashboardPage() {
  const [tree, setTree] = useState<DeviceTreeType>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/devices")
      .then((r) => r.json())
      .then((devices: Parameters<typeof buildTree>[0]) => {
        setTree(buildTree(devices));
        setLoading(false);
      });
  }, []);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold text-slate-900 mb-5">Dashboard</h1>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Link href="/devices/new" className="flex flex-col gap-1 p-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <span className="text-lg font-medium">+ Link Relay</span>
          <span className="text-xs text-blue-100">Register a relay to a KKS location</span>
        </Link>
        <Link href="/parts/new" className="flex flex-col gap-1 p-4 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
          <span className="text-lg font-medium text-slate-800">+ New Relay Type</span>
          <span className="text-xs text-slate-500">Add a relay type to the catalog</span>
        </Link>
        <Link href="/reports" className="flex flex-col gap-1 p-4 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
          <span className="text-lg font-medium text-slate-800">Protection Report</span>
          <span className="text-xs text-slate-500">Upload or view protection reports</span>
        </Link>
        <Link href="/upload/master-settings" className="flex flex-col gap-1 p-4 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
          <span className="text-lg font-medium text-slate-800">Master Settings</span>
          <span className="text-xs text-slate-500">Upload electronic settings file</span>
        </Link>
      </div>

      {/* Device Tree */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-slate-700">Devices</h2>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by KKS, type, location, circuit…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <DeviceTree tree={tree} search={search} />
      )}
    </div>
  );
}

type RawDevice = {
  id: string;
  kks_station: string;
  kks_unit: string;
  kks_system_code: string;
  kks_full: string;
  device_type: string;
  device_location: string;
  circuit: string;
  part_number: string;
  firmware: string | null;
  serial_number: string | null;
  commissioning_date: string | null;
  kks_system_number: string;
  kks_equipment_unit_code: string;
  kks_equipment_number: string;
  kks_component_code: string;
  kks_component_number: string;
  report_id: string | null;
  device_fields_json: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

function buildTree(devices: RawDevice[]): DeviceTreeType {
  const tree: DeviceTreeType = {};
  for (const d of devices) {
    const s = d.kks_station;
    const u = d.kks_unit;
    const sys = d.kks_system_code;
    tree[s] ??= {};
    tree[s][u] ??= {};
    tree[s][u][sys] ??= [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tree[s][u][sys].push(d as any);
  }
  return tree;
}
