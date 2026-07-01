import type { BuildRow } from "./db";
import { removeBuildDir } from "./storage";
import {
  r2Enabled,
  r2Delete,
  r2PublicUrl,
  buildKey,
  iconKey,
  manifestKey,
} from "./r2";

/** Remove every stored artifact for a build (R2 objects + local staging). */
export async function deleteBuildBlobs(build: {
  slug: string;
  file_name: string;
  icon_name: string | null;
  platform: BuildRow["platform"];
}): Promise<void> {
  if (r2Enabled()) {
    const keys = [buildKey(build.slug, build.file_name)];
    if (build.icon_name) keys.push(iconKey(build.slug));
    if (build.platform === "ios") keys.push(manifestKey(build.slug));
    await r2Delete(keys).catch(() => {});
  }
  removeBuildDir(build.slug);
}

/**
 * URL iOS should be pointed at for the OTA manifest.
 * R2 mode: the manifest is a public R2 object (direct HTTPS — no redirect,
 * which iOS itms-services requires). Disk mode: the dynamic server route.
 */
export function manifestUrlFor(slug: string, baseUrl: string): string {
  return r2Enabled()
    ? r2PublicUrl(manifestKey(slug))
    : `${baseUrl}/api/manifest/${slug}`;
}
