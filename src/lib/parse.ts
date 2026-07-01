import type { Platform } from "./db";

/**
 * Normalized metadata we extract from an uploaded build, regardless of
 * platform. Everything here feeds the install page and (for iOS) the manifest.
 */
export interface ParsedApp {
  platform: Platform;
  appName: string;
  bundleId: string;
  version: string;
  buildNumber: string;
  minOs: string | null;
  /** Decoded app icon as PNG bytes, or null if the build had none. */
  iconBuffer: Buffer | null;
}

/** Pick the first value that is a non-empty string. */
function firstString(...values: unknown[]): string {
  for (const v of values) {
    if (typeof v === "string" && v.trim()) return v.trim();
    // app-info-parser sometimes returns label as an array of resource strings.
    if (Array.isArray(v) && typeof v[0] === "string" && v[0].trim()) {
      return v[0].trim();
    }
  }
  return "";
}

/** Convert app-info-parser's `data:image/...;base64,XXXX` icon into a Buffer. */
function decodeIcon(icon: unknown): Buffer | null {
  if (typeof icon !== "string" || !icon) return null;
  const comma = icon.indexOf(",");
  const base64 = comma >= 0 ? icon.slice(comma + 1) : icon;
  try {
    const buf = Buffer.from(base64, "base64");
    return buf.length > 0 ? buf : null;
  } catch {
    return null;
  }
}

export function platformFromFilename(filename: string): Platform | null {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".ipa")) return "ios";
  if (lower.endsWith(".apk")) return "android";
  return null;
}

/**
 * Parse an .ipa or .apk on disk into normalized metadata.
 * Uses app-info-parser (no Xcode / aapt needed).
 */
export async function parseBuild(
  filePath: string,
  platform: Platform,
): Promise<ParsedApp> {
  // Loaded at runtime (serverExternalPackages) — it pulls in native-ish zip code.
  const { default: AppInfoParser } = await import("app-info-parser");

  const result = await new AppInfoParser(filePath).parse();
  const iconBuffer = decodeIcon(result.icon);

  if (platform === "android") {
    const usesSdk = result.usesSdk as Record<string, unknown> | undefined;
    const application = result.application as Record<string, unknown> | undefined;
    return {
      platform,
      // app-info-parser exposes the label on application.label (often an array
      // of resolved resource strings); fall back to top-level label / package.
      appName: firstString(application?.label, result.label, result.package, "App"),
      bundleId: firstString(result.package, "unknown.bundle.id"),
      version: firstString(result.versionName, "1.0.0"),
      buildNumber: firstString(
        result.versionCode != null ? String(result.versionCode) : "",
      ),
      minOs: firstString(
        usesSdk?.minSdkVersion != null ? String(usesSdk.minSdkVersion) : "",
        result.minSdkVersion != null ? String(result.minSdkVersion) : "",
      ) || null,
      iconBuffer,
    };
  }

  // iOS — result is the app's Info.plist as a plain object.
  return {
    platform,
    appName: firstString(
      result.CFBundleDisplayName,
      result.CFBundleName,
      result.CFBundleExecutable,
      "App",
    ),
    bundleId: firstString(result.CFBundleIdentifier, "unknown.bundle.id"),
    version: firstString(result.CFBundleShortVersionString, "1.0.0"),
    buildNumber: firstString(
      result.CFBundleVersion != null ? String(result.CFBundleVersion) : "",
    ),
    minOs: firstString(
      result.MinimumOSVersion != null ? String(result.MinimumOSVersion) : "",
    ) || null,
    iconBuffer,
  };
}
