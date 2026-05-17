"use client";

import { useRef } from "react";

interface Props {
  onChange: (file: File | null) => void;
  file: File | null;
  accept?: string;
  required?: boolean;
}

export default function FileInput({ onChange, file, accept, required }: Props) {
  const ref = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-center gap-3">
      <input
        ref={ref}
        type="file"
        accept={accept}
        required={required}
        className="sr-only"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="px-3 py-2 border border-slate-300 bg-white rounded-md text-sm text-slate-700 font-medium hover:bg-slate-50 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors cursor-pointer"
      >
        Choose file…
      </button>
      <span className="text-sm text-slate-500 truncate max-w-xs">
        {file ? file.name : "No file chosen"}
      </span>
    </div>
  );
}
