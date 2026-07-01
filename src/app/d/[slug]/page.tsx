import { headers } from "next/headers";
import Link from "next/link";
import QRCode from "qrcode";
import { baseUrlFromHeaders } from "@/lib/config";
import { getActiveBuild } from "@/lib/db";
import InstallPanel from "@/components/InstallPanel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function SharePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const build = getActiveBuild(slug);
  const baseUrl = baseUrlFromHeaders(await headers());

  if (!build) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-5 py-20 text-center">
        <div className="text-5xl">🔗</div>
        <h1 className="text-2xl font-bold">Link không tồn tại hoặc đã hết hạn</h1>
        <p className="text-sm text-muted">
          Build này đã bị xoá hoặc link đã quá hạn cài đặt.
        </p>
        <Link
          href="/"
          className="mt-2 rounded-xl bg-gradient-to-r from-accent to-accent-2 px-5 py-2.5 text-sm font-semibold text-white"
        >
          Upload build mới
        </Link>
      </main>
    );
  }

  const shareUrl = `${baseUrl}/d/${slug}`;
  const manifestUrl = `${baseUrl}/api/manifest/${slug}`;
  const itmsUrl = `itms-services://?action=download-manifest&url=${encodeURIComponent(
    manifestUrl,
  )}`;
  const downloadUrl = `${baseUrl}/api/download/${slug}`;
  const qrDataUrl = await QRCode.toDataURL(shareUrl, {
    margin: 1,
    width: 320,
    color: { dark: "#0b0c10", light: "#ffffff" },
  });

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-5 py-12 sm:py-16">
      <Link
        href="/"
        className="flex items-center gap-2 self-center text-sm font-medium text-muted hover:text-foreground"
      >
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-accent to-accent-2 text-sm">
          🚀
        </span>
        AppDrop
      </Link>

      <InstallPanel
        slug={slug}
        platform={build.platform}
        appName={build.app_name}
        bundleId={build.bundle_id}
        version={build.version}
        buildNumber={build.build_number}
        minOs={build.min_os}
        sizeBytes={build.size_bytes}
        comment={build.comment}
        createdAt={build.created_at}
        expiresAt={build.expires_at}
        downloadCount={build.download_count}
        hasIcon={Boolean(build.icon_name)}
        shareUrl={shareUrl}
        itmsUrl={itmsUrl}
        downloadUrl={downloadUrl}
        qrDataUrl={qrDataUrl}
      />
    </main>
  );
}
