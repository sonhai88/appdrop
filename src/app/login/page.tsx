"use client";

import { Suspense, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/";

  const inputRef = useRef<HTMLInputElement>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    // Read straight from the DOM too — survives browser autofill that doesn't
    // fire onChange (state would otherwise be empty).
    const pw = inputRef.current?.value || password;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pw }),
    });
    if (res.ok) {
      router.replace(next);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Đăng nhập thất bại.");
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-border bg-surface/60 p-6 backdrop-blur"
    >
      <div className="flex flex-col gap-1 text-center">
        <span className="mx-auto mb-1 grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-accent to-accent-2 text-lg">
          🔒
        </span>
        <h1 className="text-xl font-bold">AppDrop</h1>
        <p className="text-sm text-muted">Nhập mật khẩu để tiếp tục</p>
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
        {busy ? "Đang vào…" : "Đăng nhập"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-5 py-20">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
