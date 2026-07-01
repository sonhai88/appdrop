function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

interface ManifestInput {
  /** Absolute https base, no trailing slash. */
  baseUrl: string;
  slug: string;
  bundleId: string;
  version: string;
  title: string;
  hasIcon: boolean;
}

/**
 * Build the iOS OTA manifest.plist. iOS reads this after the user taps an
 * `itms-services://?action=download-manifest&url=...` link, then downloads
 * the `software-package` (the .ipa). Every URL inside MUST be HTTPS or iOS
 * silently refuses to install.
 */
export function buildManifestPlist({
  baseUrl,
  slug,
  bundleId,
  version,
  title,
  hasIcon,
}: ManifestInput): string {
  const ipaUrl = `${baseUrl}/api/download/${slug}`;
  const iconUrl = `${baseUrl}/api/icon/${slug}`;

  const iconAssets = hasIcon
    ? `
        <dict>
          <key>kind</key>
          <string>display-image</string>
          <key>url</key>
          <string>${escapeXml(iconUrl)}</string>
        </dict>
        <dict>
          <key>kind</key>
          <string>full-size-image</string>
          <key>url</key>
          <string>${escapeXml(iconUrl)}</string>
        </dict>`
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>items</key>
  <array>
    <dict>
      <key>assets</key>
      <array>
        <dict>
          <key>kind</key>
          <string>software-package</string>
          <key>url</key>
          <string>${escapeXml(ipaUrl)}</string>
        </dict>${iconAssets}
      </array>
      <key>metadata</key>
      <dict>
        <key>bundle-identifier</key>
        <string>${escapeXml(bundleId)}</string>
        <key>bundle-version</key>
        <string>${escapeXml(version)}</string>
        <key>kind</key>
        <string>software</string>
        <key>title</key>
        <string>${escapeXml(title)}</string>
      </dict>
    </dict>
  </array>
</dict>
</plist>
`;
}
