export const SESSION_COOKIE = "appdrop_session";

/**
 * Auth is OFF unless APP_PASSWORD is set. That keeps local dev + "open on the
 * LAN, everyone can upload" working with zero config; set APP_PASSWORD to lock
 * the upload page + dashboard behind one shared team password.
 */
export function authEnabled(): boolean {
  return Boolean(process.env.APP_PASSWORD);
}

/**
 * Stateless session token = SHA-256(password + salt). Someone without the
 * password can't produce it (preimage resistance), so we can verify the cookie
 * without a session store. Uses Web Crypto so it runs in both the edge
 * middleware and Node route handlers.
 */
export async function sessionToken(): Promise<string> {
  const secret = process.env.APP_PASSWORD ?? "";
  const data = new TextEncoder().encode(`${secret}::appdrop-session-v1`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
