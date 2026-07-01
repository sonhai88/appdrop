import { NextResponse } from "next/server";
import { SESSION_COOKIE, authEnabled, sessionToken } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!authEnabled()) return NextResponse.json({ ok: true });

  const { password } = await req.json().catch(() => ({ password: "" }));
  if (password !== process.env.APP_PASSWORD) {
    return NextResponse.json({ error: "Sai mật khẩu." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, await sessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return res;
}
