import { cookies } from "next/headers";
import { SESSION_COOKIE, authEnabled, sessionToken } from "./auth";

/**
 * Server-side admin check for pages + route handlers. Kept separate from auth.ts
 * (which the edge proxy imports) because it pulls in next/headers.
 *
 * Defense in depth: sensitive pages/routes call this directly instead of
 * trusting the middleware alone — so a middleware bypass (à la CVE-2025-29927)
 * still can't reach the dashboard or mutate data.
 */
export async function isAdmin(): Promise<boolean> {
  if (!authEnabled()) return true;
  const cookie = (await cookies()).get(SESSION_COOKIE)?.value;
  return Boolean(cookie) && cookie === (await sessionToken());
}
