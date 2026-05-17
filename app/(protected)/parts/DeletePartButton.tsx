"use client";

import { useRouter } from "next/navigation";

export default function DeletePartButton({ id }: { id: string }) {
  const router = useRouter();

  async function handleDelete() {
    if (!confirm("Delete this part?")) return;
    await fetch(`/api/parts/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <button onClick={handleDelete} className="text-xs text-red-500 hover:underline">
      Delete
    </button>
  );
}
