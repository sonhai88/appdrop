"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteBuildButton({
  slug,
  label,
}: {
  slug: string;
  label: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!confirm(`Xoá "${label}"? Không khôi phục được.`)) return;
    setBusy(true);
    const res = await fetch(`/api/builds/${slug}`, { method: "DELETE" });
    if (res.ok) {
      router.refresh();
    } else {
      setBusy(false);
      alert("Xoá thất bại.");
    }
  }

  return (
    <button
      onClick={remove}
      disabled={busy}
      className="shrink-0 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-300 transition hover:bg-red-500/20 disabled:opacity-40"
    >
      {busy ? "Đang xoá…" : "Xoá"}
    </button>
  );
}
