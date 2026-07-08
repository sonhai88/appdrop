import Link from "next/link";
import { redirect } from "next/navigation";
import { listUdids } from "@/lib/db";
import { isAdmin } from "@/lib/authServer";
import { formatDate } from "@/lib/format";
import CopyField from "@/components/CopyField";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function UdidAdmin() {
  if (!(await isAdmin())) redirect("/login");
  const udids = listUdids();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-5 py-10">
      <Link href="/builds" className="text-sm font-medium text-muted hover:text-foreground">
        ‹ Quản lý builds
      </Link>

      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">UDID đã thu thập</h1>
        <p className="text-sm text-muted">
          Gửi tester link <code className="text-accent-2">/udid</code> để lấy mã. Add các UDID
          này vào Apple Developer → Devices, rồi build lại .ipa ad-hoc.
        </p>
      </header>

      {udids.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface/60 py-16 text-center">
          <span className="text-4xl">📭</span>
          <p className="text-sm text-muted">
            Chưa có UDID nào. Gửi tester mở <code className="text-accent-2">/udid</code>.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {udids.map((d) => (
            <div
              key={d.udid}
              className="flex flex-col gap-2 rounded-2xl border border-border bg-surface/60 p-4"
            >
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="font-semibold">
                  {d.device_name || d.product || "iPhone"}
                </span>
                <span className="text-xs text-muted">{formatDate(d.created_at)}</span>
              </div>
              {(d.product || d.version) && (
                <span className="text-xs text-muted">
                  {d.product}
                  {d.version ? ` · iOS ${d.version}` : ""}
                </span>
              )}
              <CopyField value={d.udid} />
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
