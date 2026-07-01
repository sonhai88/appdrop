"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();
  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.replace("/login");
  }
  return (
    <button
      onClick={logout}
      className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted transition hover:text-foreground"
    >
      Đăng xuất
    </button>
  );
}
