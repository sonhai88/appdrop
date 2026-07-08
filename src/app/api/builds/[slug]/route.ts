import { NextResponse } from "next/server";
import { deleteBuild, getBuild } from "@/lib/db";
import { deleteBuildBlobs } from "@/lib/blob";
import { isAdmin } from "@/lib/authServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Auth enforced here too (not just middleware) — defense in depth.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { slug } = await params;
  const build = getBuild(slug);
  if (!build) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await deleteBuildBlobs(build);
  deleteBuild(slug);
  return NextResponse.json({ ok: true });
}
