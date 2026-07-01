import Database from "better-sqlite3";
import fs from "node:fs";
import { DATA_DIR, DB_PATH } from "./config";

/**
 * Single shared SQLite connection. better-sqlite3 is synchronous, which is
 * exactly what we want for cheap metadata reads on each request.
 *
 * We keep one connection on the module scope so Next.js route handlers reuse
 * it across requests instead of re-opening the file every time.
 */

let db: Database.Database | null = null;

export type Platform = "ios" | "android";

export interface BuildRow {
  slug: string;
  platform: Platform;
  app_name: string;
  bundle_id: string;
  version: string;
  build_number: string;
  /** Original uploaded filename, e.g. MyApp-staging.ipa */
  original_filename: string;
  /** Path on disk to the stored .ipa/.apk, relative to UPLOADS_DIR. */
  file_name: string;
  /** Stored icon filename (png) relative to the build's folder, or null. */
  icon_name: string | null;
  /** Minimum OS version the build requires, if parsed. */
  min_os: string | null;
  size_bytes: number;
  /** Optional uploader note shown on the install page. */
  comment: string;
  created_at: number;
  /** Unix ms when the link expires. null = never. */
  expires_at: number | null;
  download_count: number;
}

function init(): Database.Database {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const database = new Database(DB_PATH);
  database.pragma("journal_mode = WAL");
  database.exec(`
    CREATE TABLE IF NOT EXISTS builds (
      slug              TEXT PRIMARY KEY,
      platform          TEXT NOT NULL,
      app_name          TEXT NOT NULL,
      bundle_id         TEXT NOT NULL,
      version           TEXT NOT NULL,
      build_number      TEXT NOT NULL DEFAULT '',
      original_filename TEXT NOT NULL,
      file_name         TEXT NOT NULL,
      icon_name         TEXT,
      min_os            TEXT,
      size_bytes        INTEGER NOT NULL,
      comment           TEXT NOT NULL DEFAULT '',
      created_at        INTEGER NOT NULL,
      expires_at        INTEGER,
      download_count    INTEGER NOT NULL DEFAULT 0
    );
  `);
  return database;
}

export function getDb(): Database.Database {
  if (!db) db = init();
  return db;
}

export function insertBuild(row: BuildRow): void {
  getDb()
    .prepare(
      `INSERT INTO builds
        (slug, platform, app_name, bundle_id, version, build_number,
         original_filename, file_name, icon_name, min_os, size_bytes,
         comment, created_at, expires_at, download_count)
       VALUES
        (@slug, @platform, @app_name, @bundle_id, @version, @build_number,
         @original_filename, @file_name, @icon_name, @min_os, @size_bytes,
         @comment, @created_at, @expires_at, @download_count)`,
    )
    .run(row);
}

export function getBuild(slug: string): BuildRow | undefined {
  return getDb()
    .prepare("SELECT * FROM builds WHERE slug = ?")
    .get(slug) as BuildRow | undefined;
}

/** Returns the build only if it exists AND has not expired. */
export function getActiveBuild(slug: string): BuildRow | undefined {
  const row = getBuild(slug);
  if (!row) return undefined;
  if (row.expires_at !== null && row.expires_at < Date.now()) return undefined;
  return row;
}

export function incrementDownloadCount(slug: string): void {
  getDb()
    .prepare("UPDATE builds SET download_count = download_count + 1 WHERE slug = ?")
    .run(slug);
}
