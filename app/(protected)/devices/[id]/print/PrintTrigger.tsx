"use client";

import { useEffect } from "react";

export default function PrintTrigger() {
  useEffect(() => {
    window.print();
  }, []);

  return (
    <div className="flex gap-3 mb-6 print:hidden">
      <button
        onClick={() => window.print()}
        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
      >
        Print / Save as PDF
      </button>
      <button
        onClick={() => window.close()}
        className="px-4 py-2 border border-slate-300 text-slate-700 text-sm rounded-md hover:bg-slate-50"
      >
        Close
      </button>
    </div>
  );
}
