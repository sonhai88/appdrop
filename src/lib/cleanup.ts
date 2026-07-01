import { getDb } from "./db";
import { deleteBuildBlobs } from "./blob";

/**
 * Delete builds whose link has expired: remove the stored artifacts (R2 objects
 * and/or local files) and the DB row. Returns how many builds were removed.
 */
export async function sweepExpired(): Promise<number> {
  const now = Date.now();
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT slug, file_name, icon_name, platform
       FROM builds WHERE expires_at IS NOT NULL AND expires_at < ?`,
    )
    .all(now) as Array<{
    slug: string;
    file_name: string;
    icon_name: string | null;
    platform: "ios" | "android";
  }>;

  const del = db.prepare("DELETE FROM builds WHERE slug = ?");
  let removed = 0;
  for (const b of rows) {
    await deleteBuildBlobs(b);
    del.run(b.slug);
    removed++;
  }
  return removed;
}
