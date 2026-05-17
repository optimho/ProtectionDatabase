"use client";

import { assembleKKS, type KKSParts } from "@/lib/kks";

interface Props {
  value: KKSParts;
  onChange: (parts: KKSParts) => void;
}

const fields: Array<{
  key: keyof KKSParts;
  label: string;
  hint: string;
  maxLen: number;
  width: string;
}> = [
  { key: "kks_station",              label: "Station",      hint: "e.g. THI",  maxLen: 3, width: "w-20" },
  { key: "kks_unit",                 label: "Unit",         hint: "e.g. 1",    maxLen: 1, width: "w-14" },
  { key: "kks_system_code",          label: "System",       hint: "e.g. BBA",  maxLen: 3, width: "w-20" },
  { key: "kks_system_number",        label: "Sys No.",      hint: "e.g. 01",   maxLen: 2, width: "w-16" },
  { key: "kks_equipment_unit_code",  label: "Equip. Code",  hint: "e.g. AP",   maxLen: 2, width: "w-20" },
  { key: "kks_equipment_number",     label: "Equip. No.",   hint: "e.g. 001",  maxLen: 3, width: "w-20" },
  { key: "kks_component_code",       label: "Comp. Code",   hint: "e.g. EY",   maxLen: 2, width: "w-20" },
  { key: "kks_component_number",     label: "Comp. No.",    hint: "e.g. 01",   maxLen: 2, width: "w-16" },
];

export default function KKSBuilder({ value, onChange }: Props) {
  const assembled = isComplete(value) ? assembleKKS(value) : "";

  function set(key: keyof KKSParts, val: string) {
    onChange({ ...value, [key]: val.toUpperCase() });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {fields.map(({ key, label, hint, maxLen, width }) => (
          <div key={key} className={`${width} flex-shrink-0`}>
            <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
            <input
              type="text"
              maxLength={maxLen}
              placeholder={hint}
              value={value[key]}
              onChange={(e) => set(key, e.target.value)}
              className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        ))}
      </div>
      {assembled && (
        <p className="text-xs text-slate-500">
          Assembled: <span className="font-mono font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">{assembled}</span>
        </p>
      )}
    </div>
  );
}

function isComplete(p: KKSParts): boolean {
  return Object.values(p).every((v) => v.length > 0);
}
