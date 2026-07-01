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
  /** SHA-256 hex of the per-link password, or null if the link is public. */
  password_hash: string | null;
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
      download_count    INTEGER NOT NULL DEFAULT 0,
      password_hash     TEXT
    );
  `);
  database.exec(`
    CREATE TABLE IF NOT EXISTS udids (
      udid        TEXT PRIMARY KEY,
      product     TEXT NOT NULL DEFAULT '',
      version     TEXT NOT NULL DEFAULT '',
      serial      TEXT NOT NULL DEFAULT '',
      device_name TEXT NOT NULL DEFAULT '',
      created_at  INTEGER NOT NULL
    );
  `);
  migrate(database);
  return database;
}

/**
 * Add columns introduced after the first release to older DB files.
 * SQLite has no "ADD COLUMN IF NOT EXISTS", so we diff against table_info.
 */
function migrate(database: Database.Database): void {
  const cols = new Set(
    (database.prepare("PRAGMA table_info(builds)").all() as Array<{ name: string }>).map(
      (c) => c.name,
    ),
  );
  const addColumns: Record<string, string> = {
    password_hash: "TEXT",
  };
  for (const [name, type] of Object.entries(addColumns)) {
    if (!cols.has(name)) {
      database.exec(`ALTER TABLE builds ADD COLUMN ${name} ${type}`);
    }
  }
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
         comment, created_at, expires_at, download_count, password_hash)
       VALUES
        (@slug, @platform, @app_name, @bundle_id, @version, @build_number,
         @original_filename, @file_name, @icon_name, @min_os, @size_bytes,
         @comment, @created_at, @expires_at, @download_count, @password_hash)`,
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

export function deleteBuild(slug: string): void {
  getDb().prepare("DELETE FROM builds WHERE slug = ?").run(slug);
}

/** All builds, newest first, optionally filtered by name/bundle id. */
export function listBuilds(search?: string): BuildRow[] {
  const db = getDb();
  if (search && search.trim()) {
    const like = `%${search.trim()}%`;
    return db
      .prepare(
        `SELECT * FROM builds
         WHERE app_name LIKE ? OR bundle_id LIKE ?
         ORDER BY created_at DESC`,
      )
      .all(like, like) as BuildRow[];
  }
  return db.prepare("SELECT * FROM builds ORDER BY created_at DESC").all() as BuildRow[];
}

export interface AppGroup {
  bundle_id: string;
  platform: Platform;
  app_name: string;
  latest_version: string;
  latest_build_number: string;
  latest_slug: string;
  icon_slug: string | null; // slug of the latest build that has an icon
  build_count: number;
  last_updated: number;
}

/**
 * Group builds by (bundle_id, platform) so the same app across versions shows
 * as one entry with its newest build surfaced.
 */
export function listApps(): AppGroup[] {
  const rows = getDb()
    .prepare("SELECT * FROM builds ORDER BY created_at DESC")
    .all() as BuildRow[];

  const groups = new Map<string, AppGroup>();
  for (const b of rows) {
    const key = `${b.platform}:${b.bundle_id}`;
    const existing = groups.get(key);
    if (!existing) {
      // rows are newest-first, so the first one we see is the latest.
      groups.set(key, {
        bundle_id: b.bundle_id,
        platform: b.platform,
        app_name: b.app_name,
        latest_version: b.version,
        latest_build_number: b.build_number,
        latest_slug: b.slug,
        icon_slug: b.icon_name ? b.slug : null,
        build_count: 1,
        last_updated: b.created_at,
      });
    } else {
      existing.build_count += 1;
      if (!existing.icon_slug && b.icon_name) existing.icon_slug = b.slug;
    }
  }
  return Array.from(groups.values());
}

/** All builds for one app (bundle_id + platform), newest first. */
export function listBuildsForApp(platform: Platform, bundleId: string): BuildRow[] {
  return getDb()
    .prepare(
      "SELECT * FROM builds WHERE platform = ? AND bundle_id = ? ORDER BY created_at DESC",
    )
    .all(platform, bundleId) as BuildRow[];
}

export interface UdidRow {
  udid: string;
  product: string;
  version: string;
  serial: string;
  device_name: string;
  created_at: number;
}

/** Upsert a collected UDID (re-enrolling the same device just refreshes it). */
export function upsertUdid(row: UdidRow): void {
  getDb()
    .prepare(
      `INSERT INTO udids (udid, product, version, serial, device_name, created_at)
       VALUES (@udid, @product, @version, @serial, @device_name, @created_at)
       ON CONFLICT(udid) DO UPDATE SET
         product = excluded.product,
         version = excluded.version,
         serial = excluded.serial,
         device_name = excluded.device_name,
         created_at = excluded.created_at`,
    )
    .run(row);
}

export function listUdids(): UdidRow[] {
  return getDb()
    .prepare("SELECT * FROM udids ORDER BY created_at DESC")
    .all() as UdidRow[];
}
