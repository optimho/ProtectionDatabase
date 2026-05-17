"use client";

import { useRouter } from "next/navigation";

export default function DeleteTemplateButton({ id }: { id: string }) {
  const router = useRouter();

  async function handleDelete() {
    if (!confirm("Delete this template?")) return;
    await fetch(`/api/form-templates/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <button onClick={handleDelete} className="text-xs text-red-500 hover:underline">
      Delete
    </button>
  );
}
