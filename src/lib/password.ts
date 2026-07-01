import crypto from "node:crypto";

/** SHA-256 hex of a per-link password. Empty/absent → null (public link). */
export function hashPassword(password: string | null | undefined): string | null {
  if (!password) return null;
  return crypto.createHash("sha256").update(password).digest("hex");
}

export function verifyPassword(password: string, hash: string): boolean {
  const candidate = crypto.createHash("sha256").update(password).digest("hex");
  // constant-time compare to avoid leaking via timing
  const a = Buffer.from(candidate);
  const b = Buffer.from(hash);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Token stored in the unlock cookie once a password-gated link is opened. */
export function unlockToken(slug: string, passwordHash: string): string {
  return crypto
    .createHash("sha256")
    .update(`${slug}:${passwordHash}:unlock`)
    .digest("hex");
}
