import { MAX_APPS } from "./config";
import { deleteBuild, listApps, listBuildsForApp } from "./db";
import { deleteBuildBlobs } from "./blob";

/**
 * Keep at most MAX_APPS distinct apps (platform + bundle id). Call this right
 * after inserting a new build: if the app count exceeds the cap, evict the
 * least-recently-updated app(s) entirely (every version + its stored files).
 *
 * A new version of an existing app doesn't grow the count, and the app just
 * uploaded is the newest, so it's never the one evicted.
 *
 * Returns the number of builds removed.
 */
export async function enforceAppLimit(): Promise<number> {
  const apps = listApps().sort((a, b) => b.last_updated - a.last_updated);
  if (apps.length <= MAX_APPS) return 0;

  const evict = apps.slice(MAX_APPS); // oldest apps beyond the cap
  let removed = 0;
  for (const app of evict) {
    for (const build of listBuildsForApp(app.platform, app.bundle_id)) {
      await deleteBuildBlobs(build);
      deleteBuild(build.slug);
      removed++;
    }
  }
  return removed;
}
