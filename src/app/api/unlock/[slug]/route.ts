import { NextResponse } from "next/server";
import { getActiveBuild } from "@/lib/db";
import { unlockToken, verifyPassword } from "@/lib/password";
import { clientIp, rateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  // Guard against guessing a link's password: 12 tries / 10 min per IP+link.
  const rl = rateLimit(`unlock:${clientIp(req)}:${slug}`, 12, 10 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Thử quá nhiều lần. Đợi ${rl.retryAfter}s.` },
      { status: 429 },
    );
  }

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
