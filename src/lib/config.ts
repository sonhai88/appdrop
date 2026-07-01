import path from "node:path";

/**
 * Root directory for all persisted data (SQLite DB + uploaded builds).
 * Override with env DATA_DIR in production (e.g. a mounted volume on the VPS).
 * Defaults to <project>/data so local dev works with zero config.
 */
export const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(process.cwd(), "data");

export const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
export const DB_PATH = path.join(DATA_DIR, "app.db");

/** Max upload size in bytes. iOS/Android builds rarely exceed 500MB. */
export const MAX_UPLOAD_BYTES = Number(
  process.env.MAX_UPLOAD_BYTES ?? 500 * 1024 * 1024,
);

/** Default link lifetime in days (Diawi default is 30). 0 = never expires. */
export const DEFAULT_EXPIRY_DAYS = Number(process.env.DEFAULT_EXPIRY_DAYS ?? 30);

/**
 * Max number of distinct apps (by platform + bundle id) kept at once. Uploading
 * a build that creates a 21st app evicts the least-recently-updated app (all its
 * versions) — FIFO. Multiple versions of the same app count as one.
 */
export const MAX_APPS = Number(process.env.MAX_APPS ?? 20);

/**
 * Absolute public base URL (https://apps.example.com), no trailing slash.
 * REQUIRED for iOS OTA: the manifest.plist and .ipa URLs inside it must be
 * absolute HTTPS. If unset we fall back to the incoming request's headers
 * (works behind Caddy which sets x-forwarded-proto/host).
 */
export function getBaseUrl(req?: Request): string {
  const fromEnv = process.env.PUBLIC_BASE_URL;
  if (fromEnv) return fromEnv.replace(/\/+$/, "");

  if (req) return baseUrlFromHeaders(req.headers);
  return "http://localhost:3000";
}

/** Same as getBaseUrl but from a bare Headers object (server components). */
export function baseUrlFromHeaders(h: Headers): string {
  const fromEnv = process.env.PUBLIC_BASE_URL;
  if (fromEnv) return fromEnv.replace(/\/+$/, "");
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host) return `${proto}://${host}`;
  return "http://localhost:3000";
}
