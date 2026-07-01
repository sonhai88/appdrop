"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function UnlockForm({ slug }: { slug: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const pw = inputRef.current?.value || password;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/unlock/${slug}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pw }),
    });
    if (res.ok) {
      router.refresh(); // re-render the server page, now unlocked
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Sai mật khẩu.");
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-4 rounded-2xl border border-border bg-surface/60 p-6 backdrop-blur"
    >
      <div className="flex flex-col gap-1 text-center">
        <span className="mx-auto mb-1 grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-accent to-accent-2 text-lg">
          🔒
        </span>
        <h1 className="text-lg font-bold">Link này có mật khẩu</h1>
        <p className="text-sm text-muted">Nhập mật khẩu để xem và cài đặt</p>
      </div>
      <input
        ref={inputRef}
        type="password"
        autoFocus
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Mật khẩu"
        className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-foreground outline-none placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/30"
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="h-11 rounded-xl bg-gradient-to-r from-accent to-accent-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
      >
        {busy ? "Đang mở…" : "Mở khoá"}
      </button>
    </form>
  );
}
