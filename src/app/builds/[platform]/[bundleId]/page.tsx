import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { listBuildsForApp, type Platform } from "@/lib/db";
import { isAdmin } from "@/lib/authServer";
import { formatBytes, formatDate } from "@/lib/format";
import DeleteBuildButton from "@/components/DeleteBuildButton";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AppHistory({
  params,
}: {
  params: Promise<{ platform: string; bundleId: string }>;
}) {
  if (!(await isAdmin())) redirect("/login");
  const { platform, bundleId: rawBundleId } = await params;
  if (platform !== "ios" && platform !== "android") notFound();
  const bundleId = decodeURIComponent(rawBundleId);

  const builds = listBuildsForApp(platform as Platform, bundleId);
  if (builds.length === 0) notFound();

  const appName = builds[0].app_name;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-5 py-10">
      <Link href="/builds" className="text-sm font-medium text-muted hover:text-foreground">
        ‹ Tất cả apps
      </Link>

      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">{appName}</h1>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              platform === "ios"
                ? "bg-blue-500/15 text-blue-300"
                : "bg-green-500/15 text-green-300"
            }`}
          >
            {platform === "ios" ? "iOS" : "Android"}
          </span>
        </div>
        <span className="text-sm text-muted">{bundleId}</span>
        <span className="text-xs text-muted">{builds.length} bản build</span>
      </header>

      <div className="flex flex-col gap-3">
        {builds.map((b, i) => (
          <div
            key={b.slug}
            className="flex items-center gap-4 rounded-2xl border border-border bg-surface/60 p-4"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">
                  {b.version}
                  {b.build_number ? ` (${b.build_number})` : ""}
                </span>
                {i === 0 && (
                  <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent-2">
                    MỚI NHẤT
                  </span>
                )}
                {b.password_hash && (
                  <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-semibold text-muted">
                    🔒 có mật khẩu
                  </span>
                )}
              </div>
              <span className="text-xs text-muted">
                {formatBytes(b.size_bytes)} · {b.download_count} lượt tải ·{" "}
                {formatDate(b.created_at)}
                {b.expires_at ? ` · hết hạn ${formatDate(b.expires_at)}` : " · không hết hạn"}
              </span>
              {b.comment && <span className="truncate text-xs text-muted">“{b.comment}”</span>}
            </div>
            <Link
              href={`/d/${b.slug}`}
              className="shrink-0 rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-xs font-semibold text-foreground transition hover:border-accent/60"
            >
              Mở link
            </Link>
            <DeleteBuildButton slug={b.slug} label={`${appName} ${b.version}`} />
          </div>
        ))}
      </div>
    </main>
  );
}
