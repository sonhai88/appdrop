import { Readable } from "node:stream";
import { getActiveBuild, incrementDownloadCount } from "@/lib/db";
import { fileExists, openReadStream } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const build = getActiveBuild(slug);
  if (!build || !fileExists(slug, build.file_name)) {
    return new Response("Build not found or expired.", { status: 404 });
  }

  incrementDownloadCount(slug);

  const contentType =
    build.platform === "android"
      ? "application/vnd.android.package-archive"
      : "application/octet-stream";

  const nodeStream = openReadStream(slug, build.file_name);
  // Node Readable → web ReadableStream so the Next runtime can stream it out.
  const webStream = Readable.toWeb(nodeStream) as unknown as ReadableStream<Uint8Array>;

  return new Response(webStream, {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(build.size_bytes),
      "Content-Disposition": `attachment; filename="${encodeURIComponent(
        build.original_filename,
      )}"`,
      "Cache-Control": "no-store",
    },
  });
}
