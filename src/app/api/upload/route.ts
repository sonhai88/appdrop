import { createReadStream } from "node:fs";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, authEnabled, sessionToken } from "@/lib/auth";
import { DEFAULT_EXPIRY_DAYS, MAX_UPLOAD_BYTES } from "@/lib/config";
import { insertBuild, type BuildRow } from "@/lib/db";
import { parseBuild, platformFromFilename } from "@/lib/parse";
import { newSlug } from "@/lib/slug";
import { hashPassword } from "@/lib/password";
import { buildManifestPlist } from "@/lib/manifest";
import {
  r2Enabled,
  r2PutStream,
  r2PutBuffer,
  r2PublicUrl,
  buildKey,
  iconKey,
  manifestKey,
} from "@/lib/r2";
import {
  buildFilePath,
  removeBuildDir,
  saveIcon,
  streamToFile,
} from "@/lib/storage";

// Needs Node APIs (fs, native modules) and must never be statically cached.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;

function computeExpiry(expiryParam: string | null): number | null {
  // expiry is in days; "0" means never. Missing → project default.
  const days = expiryParam === null ? DEFAULT_EXPIRY_DAYS : Number(expiryParam);
  if (!Number.isFinite(days) || days <= 0) return null;
  return Date.now() + days * DAY_MS;
}

export async function POST(req: Request) {
  // Auth is enforced here (not in the proxy) because the proxy is excluded from
  // this route to avoid its 10MB request-body cap truncating large builds.
  if (authEnabled()) {
    const cookie = (await cookies()).get(SESSION_COOKIE)?.value;
    if (cookie !== (await sessionToken())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const { searchParams } = new URL(req.url);
  const filename = searchParams.get("filename") ?? "";
  const comment = (searchParams.get("comment") ?? "").slice(0, 500);

  const platform = platformFromFilename(filename);
  if (!platform) {
    return NextResponse.json(
      { error: "Chỉ chấp nhận file .ipa (iOS) hoặc .apk (Android)." },
      { status: 400 },
    );
  }
  if (!req.body) {
    return NextResponse.json({ error: "Không có dữ liệu file." }, { status: 400 });
  }

  const slug = newSlug();
  const storedName = platform === "ios" ? "build.ipa" : "build.apk";
  const destPath = buildFilePath(slug, storedName);

  try {
    const sizeBytes = await streamToFile(req.body, destPath, MAX_UPLOAD_BYTES);

    const parsed = await parseBuild(destPath, platform);

    let iconName: string | null = null;
    if (parsed.iconBuffer) {
      saveIcon(slug, parsed.iconBuffer, "icon.png");
      iconName = "icon.png";
    }

    // If R2 is configured, ship the artifacts up (build + icon + iOS manifest)
    // and drop the local staging copy — R2 becomes the store of record.
    if (r2Enabled()) {
      const contentType =
        platform === "ios"
          ? "application/octet-stream"
          : "application/vnd.android.package-archive";
      await r2PutStream(
        buildKey(slug, storedName),
        createReadStream(destPath),
        contentType,
      );
      if (parsed.iconBuffer) {
        await r2PutBuffer(iconKey(slug), parsed.iconBuffer, "image/png");
      }
      if (platform === "ios") {
        const plist = buildManifestPlist({
          ipaUrl: r2PublicUrl(buildKey(slug, storedName)),
          iconUrl: r2PublicUrl(iconKey(slug)),
          bundleId: parsed.bundleId,
          version: parsed.version,
          title: parsed.appName,
          hasIcon: Boolean(parsed.iconBuffer),
        });
        await r2PutBuffer(
          manifestKey(slug),
          Buffer.from(plist, "utf8"),
          "application/xml",
        );
      }
      removeBuildDir(slug);
    }

    const row: BuildRow = {
      slug,
      platform,
      app_name: parsed.appName,
      bundle_id: parsed.bundleId,
      version: parsed.version,
      build_number: parsed.buildNumber,
      original_filename: filename,
      file_name: storedName,
      icon_name: iconName,
      min_os: parsed.minOs,
      size_bytes: sizeBytes,
      comment,
      created_at: Date.now(),
      expires_at: computeExpiry(searchParams.get("expiry")),
      download_count: 0,
      password_hash: hashPassword(searchParams.get("password")),
    };
    insertBuild(row);

    return NextResponse.json({ slug, platform, appName: parsed.appName });
  } catch (err) {
    removeBuildDir(slug);
    if (err instanceof Error && err.message === "FILE_TOO_LARGE") {
      return NextResponse.json(
        {
          error: `File vượt quá giới hạn ${Math.round(
            MAX_UPLOAD_BYTES / 1024 / 1024,
          )}MB.`,
        },
        { status: 413 },
      );
    }
    console.error("upload failed", err);
    return NextResponse.json(
      { error: "Không đọc được file build. File .ipa/.apk có hợp lệ không?" },
      { status: 422 },
    );
  }
}
