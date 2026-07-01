import { NextResponse } from "next/server";
import { getBaseUrl } from "@/lib/config";
import { getActiveBuild } from "@/lib/db";
import { buildManifestPlist } from "@/lib/manifest";
import { r2Enabled, r2PublicUrl, manifestKey } from "@/lib/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const build = getActiveBuild(slug);
  if (!build || build.platform !== "ios") {
    return new Response("Manifest not found.", { status: 404 });
  }

  // R2 mode: the manifest lives as a public object (uploaded at build time).
  if (r2Enabled()) {
    return NextResponse.redirect(r2PublicUrl(manifestKey(slug)), { status: 302 });
  }

  const baseUrl = getBaseUrl(req);
  const plist = buildManifestPlist({
    ipaUrl: `${baseUrl}/api/download/${slug}`,
    iconUrl: `${baseUrl}/api/icon/${slug}`,
    bundleId: build.bundle_id,
    version: build.version,
    title: build.app_name,
    hasIcon: Boolean(build.icon_name),
  });

  return new Response(plist, {
    headers: {
      // iOS keys off the content-type, not the URL extension.
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
