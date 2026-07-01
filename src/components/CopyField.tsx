"use client";

import { useState } from "react";

export default function CopyField({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  }

  return (
    <div className="flex w-full items-center gap-2">
      <input
        readOnly
        value={value}
        onFocus={(e) => e.currentTarget.select()}
        className="min-w-0 flex-1 rounded-xl border border-border bg-surface px-3 py-2.5 font-mono text-xs text-foreground"
      />
      <button
        onClick={copy}
        className="shrink-0 rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm font-semibold text-foreground transition hover:border-accent/60"
      >
        {copied ? "Đã chép ✓" : "Chép"}
      </button>
    </div>
  );
}
