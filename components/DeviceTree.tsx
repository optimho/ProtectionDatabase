"use client";

import { useState } from "react";
import Link from "next/link";
import type { Device, DeviceTree } from "@/lib/devices";

function DeviceRow({ device }: { device: Device }) {
  const decommissioned = !!device.decommissioned_at;
  return (
    <Link
      href={`/devices/${device.id}`}
      className={`flex items-center justify-between px-4 py-2 rounded-md group ${decommissioned ? "opacity-50 hover:opacity-75" : "hover:bg-blue-50"}`}
    >
      <div className="flex items-center gap-3">
        <span className={`font-mono text-xs px-2 py-0.5 rounded ${decommissioned ? "bg-slate-100 text-slate-400 line-through" : "bg-slate-100 text-slate-700"}`}>
          {device.kks_full}
        </span>
        <span className={`text-sm ${decommissioned ? "text-slate-400" : "text-slate-700"}`}>{device.device_type}</span>
        <span className="text-xs text-slate-400">{device.device_location}</span>
        {decommissioned && (
          <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">Decommissioned</span>
        )}
      </div>
      <span className="text-xs text-slate-400 group-hover:text-blue-600">View →</span>
    </Link>
  );
}

function SystemGroup({
  systemCode,
  devices,
}: {
  systemCode: string;
  devices: Device[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="ml-4 border-l border-slate-200 pl-3">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 py-1 text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        <span className={`text-xs transition-transform ${open ? "rotate-90" : ""}`}>▶</span>
        <span className="font-mono">{systemCode}</span>
        <span className="text-xs text-slate-400">({devices.length})</span>
      </button>
      {open && (
        <div className="mt-1 space-y-0.5">
          {devices.map((d) => (
            <DeviceRow key={d.id} device={d} />
          ))}
        </div>
      )}
    </div>
  );
}

function UnitGroup({
  unit,
  systems,
}: {
  unit: string;
  systems: Record<string, Device[]>;
}) {
  const [open, setOpen] = useState(false);
  const total = Object.values(systems).reduce((n, arr) => n + arr.length, 0);
  return (
    <div className="ml-2 border-l border-slate-200 pl-3">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 py-1 text-sm font-semibold text-slate-700 hover:text-slate-900"
      >
        <span className={`text-xs transition-transform ${open ? "rotate-90" : ""}`}>▶</span>
        Unit {unit}
        <span className="text-xs font-normal text-slate-400">({total} devices)</span>
      </button>
      {open && (
        <div className="mt-1 space-y-2">
          {Object.entries(systems).map(([sys, devs]) => (
            <SystemGroup key={sys} systemCode={sys} devices={devs} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function DeviceTree({
  tree,
  search,
}: {
  tree: DeviceTree;
  search: string;
}) {
  const q = search.toLowerCase();

  const filtered: DeviceTree = {};
  for (const [station, units] of Object.entries(tree)) {
    for (const [unit, systems] of Object.entries(units)) {
      for (const [sys, devices] of Object.entries(systems)) {
        const matching = q
          ? devices.filter(
              (d) =>
                d.kks_full.toLowerCase().includes(q) ||
                d.device_type.toLowerCase().includes(q) ||
                d.device_location.toLowerCase().includes(q) ||
                d.circuit.toLowerCase().includes(q)
            )
          : devices;
        if (matching.length === 0) continue;
        filtered[station] ??= {};
        filtered[station][unit] ??= {};
        filtered[station][unit][sys] = matching;
      }
    }
  }

  if (Object.keys(filtered).length === 0) {
    return <p className="text-sm text-slate-500 py-8 text-center">No devices found.</p>;
  }

  return (
    <div className="space-y-4">
      {Object.entries(filtered).map(([station, units]) => (
        <div key={station} className="bg-white rounded-lg border border-slate-200 p-4">
          <h2 className="text-base font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <span className="font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-sm">
              {station}
            </span>
            Station
          </h2>
          <div className="space-y-2">
            {Object.entries(units).map(([unit, systems]) => (
              <UnitGroup key={unit} unit={unit} systems={systems} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
