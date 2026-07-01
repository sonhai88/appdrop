import { NextResponse } from "next/server";
import { getActiveBuild } from "@/lib/db";
import { unlockToken, verifyPassword } from "@/lib/password";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const build = getActiveBuild(slug);
  if (!build) return NextResponse.json({ error: "Link không tồn tại." }, { status: 404 });
  if (!build.password_hash) return NextResponse.json({ ok: true });

  const { password } = await req.json().catch(() => ({ password: "" }));
  if (!verifyPassword(password ?? "", build.password_hash)) {
    return NextResponse.json({ error: "Sai mật khẩu." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(`unlock_${slug}`, unlockToken(slug, build.password_hash), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 6, // 6h
  });
  return res;
}
