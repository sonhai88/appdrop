import fs from "node:fs";
import { getDb } from "./db";
import { buildDir } from "./storage";

/**
 * Delete builds whose link has expired: remove both the DB row and the
 * on-disk folder (the .ipa/.apk + icon). Keeps the data dir from filling up.
 * Returns how many builds were removed.
 */
export function sweepExpired(): number {
  const now = Date.now();
  const db = getDb();
  const rows = db
    .prepare("SELECT slug FROM builds WHERE expires_at IS NOT NULL AND expires_at < ?")
    .all(now) as Array<{ slug: string }>;

  const del = db.prepare("DELETE FROM builds WHERE slug = ?");
  let removed = 0;
  for (const { slug } of rows) {
    fs.rmSync(buildDir(slug), { recursive: true, force: true });
    del.run(slug);
    removed++;
  }
  return removed;
}
