import Link from "next/link";
import { redirect } from "next/navigation";
import { listApps } from "@/lib/db";
import { authEnabled } from "@/lib/auth";
import { isAdmin } from "@/lib/authServer";
import { MAX_APPS } from "@/lib/config";
import { formatDate } from "@/lib/format";
import LogoutButton from "@/components/LogoutButton";
import Logo from "@/components/Logo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function BuildsDashboard({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  if (!(await isAdmin())) redirect("/login");
  const { q } = await searchParams;
  const query = (q ?? "").trim().toLowerCase();
  const allApps = listApps();
  const apps = allApps.filter(
    (a) =>
      !query ||
      a.app_name.toLowerCase().includes(query) ||
      a.bundle_id.toLowerCase().includes(query),
  );

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-5 py-10">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Logo />
          <div className="flex flex-col">
            <span className="text-base font-bold leading-tight">AppDrop</span>
            <span className="nums text-xs text-muted">
              {allApps.length}/{MAX_APPS} app
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/builds/udids"
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted transition hover:text-foreground"
          >
            UDID
          </Link>
          <Link
            href="/"
            className="rounded-lg bg-gradient-to-r from-accent to-accent-2 px-3 py-1.5 text-xs font-semibold text-white"
          >
            ＋ Upload
          </Link>
          {authEnabled() && <LogoutButton />}
        </div>
      </header>

      <form className="flex gap-2">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Tìm theo tên app hoặc bundle id…"
          className="min-w-0 flex-1 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-foreground outline-none placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/30"
        />
        <button className="rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm font-semibold text-foreground">
          Tìm
        </button>
      </form>

      {apps.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface/60 py-16 text-center">
          <span className="text-4xl">📭</span>
          <p className="text-sm text-muted">
            {query ? "Không tìm thấy app nào." : "Chưa có build nào. Upload cái đầu tiên đi."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {apps.map((app) => (
            <Link
              key={`${app.platform}:${app.bundle_id}`}
              href={`/builds/${app.platform}/${encodeURIComponent(app.bundle_id)}`}
              className="flex items-center gap-4 rounded-2xl border border-border bg-surface/60 p-4 transition hover:border-accent/60"
            >
              <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-surface-2 text-2xl">
                {app.icon_slug ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/icon/${app.icon_slug}`}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : app.platform === "ios" ? (
                  "📱"
                ) : (
                  "🤖"
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="truncate font-semibold">{app.app_name}</span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      app.platform === "ios"
                        ? "bg-blue-500/15 text-blue-300"
                        : "bg-green-500/15 text-green-300"
                    }`}
                  >
                    {app.platform === "ios" ? "iOS" : "Android"}
                  </span>
                </div>
                <span className="truncate text-xs text-muted">{app.bundle_id}</span>
                <span className="text-xs text-muted">
                  Mới nhất: {app.latest_version}
                  {app.latest_build_number ? ` (${app.latest_build_number})` : ""} ·{" "}
                  {app.build_count} bản · {formatDate(app.last_updated)}
                </span>
              </div>
              <span className="shrink-0 text-muted">›</span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
