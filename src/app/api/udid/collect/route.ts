import { NextResponse } from "next/server";
import { getBaseUrl } from "@/lib/config";
import { upsertUdid } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Pull a <key>NAME</key><string>VALUE</string> pair out of a plist string. */
function plistValue(plist: string, key: string): string {
  const re = new RegExp(
    `<key>${key}</key>\\s*<string>([^<]*)</string>`,
    "i",
  );
  return plist.match(re)?.[1]?.trim() ?? "";
}

/**
 * iOS POSTs a PKCS#7-signed plist here after installing the enrollment profile.
 * We don't need to verify the signature — the enclosed plist bytes sit verbatim
 * inside the signed blob, so we just scan the body for <plist>…</plist> and read
 * the device attributes out of it. No openssl dependency.
 */
export async function POST(req: Request) {
  const buf = Buffer.from(await req.arrayBuffer());
  // latin1 keeps every byte 1:1 so the XML substring survives binary framing.
  const raw = buf.toString("latin1");
  const match = raw.match(/<\?xml[\s\S]*?<\/plist>/i) ?? raw.match(/<plist[\s\S]*?<\/plist>/i);

  if (!match) {
    return new Response("Không đọc được thông tin thiết bị.", { status: 400 });
  }
  const plist = match[0];
  const udid = plistValue(plist, "UDID");
  if (!udid) {
    return new Response("Thiếu UDID.", { status: 400 });
  }

  upsertUdid({
    udid,
    product: plistValue(plist, "PRODUCT"),
    version: plistValue(plist, "VERSION"),
    serial: plistValue(plist, "SERIAL"),
    device_name: plistValue(plist, "DEVICE_NAME"),
    created_at: Date.now(),
  });

  // iOS opens this redirect in Safari so the tester sees their UDID.
  const baseUrl = getBaseUrl(req);
  return NextResponse.redirect(
    `${baseUrl}/udid/done?udid=${encodeURIComponent(udid)}`,
    { status: 302 },
  );
}
