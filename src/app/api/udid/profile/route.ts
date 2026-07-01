import { getBaseUrl } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Serves an Apple "Profile Service" .mobileconfig. When the iPhone installs it,
 * iOS immediately POSTs a signed plist with the device's UDID (+ product/version)
 * to the URL below. This is Apple's Over-the-Air Profile Delivery protocol —
 * the same trick getudid.com / Diawi use to capture UDIDs.
 *
 * Requires the server to be reached over HTTPS the device already trusts
 * (public cert, or the internal CA installed on the phone).
 */
export async function GET(req: Request) {
  const baseUrl = getBaseUrl(req);
  const collectUrl = `${baseUrl}/api/udid/collect`;
  const uuid = crypto.randomUUID();

  const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>PayloadContent</key>
  <dict>
    <key>URL</key>
    <string>${collectUrl}</string>
    <key>DeviceAttributes</key>
    <array>
      <string>UDID</string>
      <string>PRODUCT</string>
      <string>VERSION</string>
      <string>SERIAL</string>
      <string>DEVICE_NAME</string>
    </array>
  </dict>
  <key>PayloadOrganization</key>
  <string>AppDrop</string>
  <key>PayloadDisplayName</key>
  <string>AppDrop — Lấy UDID</string>
  <key>PayloadVersion</key>
  <integer>1</integer>
  <key>PayloadUUID</key>
  <string>${uuid}</string>
  <key>PayloadIdentifier</key>
  <string>com.appdrop.udid</string>
  <key>PayloadDescription</key>
  <string>Gửi UDID thiết bị cho AppDrop để đăng ký cài đặt ứng dụng.</string>
  <key>PayloadType</key>
  <string>Profile Service</string>
</dict>
</plist>
`;

  return new Response(plist, {
    headers: {
      "Content-Type": "application/x-apple-aspen-config; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
