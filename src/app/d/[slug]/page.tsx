import { cookies, headers } from "next/headers";
import Link from "next/link";
import QRCode from "qrcode";
import { baseUrlFromHeaders } from "@/lib/config";
import { isAdmin } from "@/lib/authServer";
import { getActiveBuild } from "@/lib/db";
import { manifestUrlFor } from "@/lib/blob";
import { unlockToken } from "@/lib/password";
import InstallPanel from "@/components/InstallPanel";
import UnlockForm from "@/components/UnlockForm";
import Logo from "@/components/Logo";

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

  // Only admins (logged in, or auth disabled) see upload/manage affordances —
  // a public visitor opening a share link shouldn't see a way "back to upload".
  const canUpload = await isAdmin();

  // Brand header: clickable back to home only when the viewer can upload.
  const brand = (
    <div className="flex items-center gap-2 self-center text-sm font-medium text-muted">
      <Logo className="h-7 w-7" icon="h-4 w-4" />
      AppDrop
    </div>
  );
  const header = canUpload ? (
    <Link href="/" className="self-center transition hover:opacity-80">
      {brand}
    </Link>
  ) : (
    brand
  );

  if (!build) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-5 py-20 text-center">
        <div className="text-5xl">🔗</div>
        <h1 className="text-2xl font-bold">Link không tồn tại hoặc đã hết hạn</h1>
        <p className="text-sm text-muted">
          Build này đã bị xoá hoặc link đã quá hạn cài đặt.
        </p>
        {canUpload && (
          <Link
            href="/"
            className="mt-2 rounded-xl bg-gradient-to-r from-accent to-accent-2 px-5 py-2.5 text-sm font-semibold text-white transition active:translate-y-px"
          >
            Upload build mới
          </Link>
        )}
      </main>
    );
  }

  // Password gate: if the link has a password, require the unlock cookie before
  // revealing the install links.
  if (build.password_hash) {
    const cookie = (await cookies()).get(`unlock_${slug}`)?.value;
    if (cookie !== unlockToken(slug, build.password_hash)) {
      return (
        <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-5 py-16">
          {header}
          <UnlockForm slug={slug} />
        </main>
      );
    }
  }

  const shareUrl = `${baseUrl}/d/${slug}`;
  const manifestUrl = manifestUrlFor(slug, baseUrl);
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
      {header}

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

      {canUpload && (
        <Link
          href="/"
          className="flex h-12 items-center justify-center gap-2 rounded-xl border border-border bg-surface text-sm font-semibold text-foreground transition hover:border-accent/60 hover:bg-surface-2 active:translate-y-px"
        >
          ＋ Upload build khác
        </Link>
      )}
    </main>
  );
}
