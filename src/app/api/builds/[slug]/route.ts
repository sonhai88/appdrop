import { NextResponse } from "next/server";
import { deleteBuild, getBuild } from "@/lib/db";
import { removeBuildDir } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Protected by middleware (auth) when APP_PASSWORD is set.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const build = getBuild(slug);
  if (!build) return NextResponse.json({ error: "Not found" }, { status: 404 });

  removeBuildDir(slug);
  deleteBuild(slug);
  return NextResponse.json({ ok: true });
}
