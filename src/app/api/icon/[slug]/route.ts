import fs from "node:fs";
import { getBuild } from "@/lib/db";
import { buildFilePath } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const build = getBuild(slug);
  if (!build || !build.icon_name) {
    return new Response("No icon.", { status: 404 });
  }

  const iconPath = buildFilePath(slug, build.icon_name);
  if (!fs.existsSync(iconPath)) {
    return new Response("No icon.", { status: 404 });
  }

  const bytes = fs.readFileSync(iconPath);
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
