import { getBaseUrl } from "@/lib/config";
import { getActiveBuild } from "@/lib/db";
import { buildManifestPlist } from "@/lib/manifest";

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

  const plist = buildManifestPlist({
    baseUrl: getBaseUrl(req),
    slug,
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
