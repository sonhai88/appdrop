import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, authEnabled, sessionToken } from "@/lib/auth";

// Paths testers must reach WITHOUT logging in (install flow) + the login itself.
const PUBLIC_PREFIXES = [
  "/d/", // share / install page
  "/login",
  "/api/login",
  "/api/logout",
  "/api/download/",
  "/api/icon/",
  "/api/manifest/",
  "/api/unlock/", // testers unlock password links without logging in
  "/udid", // tester UDID enrollment pages (public)
  "/api/udid", // iOS posts UDID here (device, no cookie)
];

function isPublic(pathname: string): boolean {
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p));
}

export async function proxy(req: NextRequest) {
  if (!authEnabled()) return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();

  const cookie = req.cookies.get(SESSION_COOKIE)?.value;
  const expected = await sessionToken();
  if (cookie && cookie === expected) return NextResponse.next();

  // API → 401; pages → redirect to login (remember where they were going).
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  // Run on everything except Next internals + static assets.
  // IMPORTANT: exclude /api/upload — the proxy caps request bodies at 10MB,
  // which would truncate large .ipa/.apk uploads. That route checks auth itself.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/upload).*)"],
};
