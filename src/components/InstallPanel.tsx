"use client";

import { useEffect, useState } from "react";
import { formatBytes, formatDate } from "@/lib/format";

type DeviceOS = "ios" | "android" | "desktop" | "unknown";

interface Props {
  slug: string;
  platform: "ios" | "android";
  appName: string;
  bundleId: string;
  version: string;
  buildNumber: string;
  minOs: string | null;
  sizeBytes: number;
  comment: string;
  createdAt: number;
  expiresAt: number | null;
  downloadCount: number;
  hasIcon: boolean;
  shareUrl: string;
  itmsUrl: string;
  downloadUrl: string;
  qrDataUrl: string;
}

function detectOS(): DeviceOS {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent || "";
  if (/android/i.test(ua)) return "android";
  // iPadOS 13+ masquerades as Mac — distinguish by touch support.
  if (
    /iphone|ipad|ipod/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  ) {
    return "ios";
  }
  if (/macintosh|windows|linux/i.test(ua)) return "desktop";
  return "unknown";
}

export default function InstallPanel(props: Props) {
  const { platform, slug, hasIcon } = props;
  const [device, setDevice] = useState<DeviceOS>("unknown");
  const [copied, setCopied] = useState(false);

  useEffect(() => setDevice(detectOS()), []);

  const isIos = platform === "ios";
  const matches =
    (isIos && device === "ios") || (!isIos && device === "android");
  const wrongDevice =
    (device === "ios" || device === "android") && !matches;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(props.shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — user can copy manually */
    }
  }

  const meta: Array<[string, string]> = [
    ["Phiên bản", props.buildNumber ? `${props.version} (${props.buildNumber})` : props.version],
    ["Bundle ID", props.bundleId],
    ["Kích thước", formatBytes(props.sizeBytes)],
    ["Min OS", props.minOs ?? "—"],
    ["Lượt tải", String(props.downloadCount)],
    ["Tạo lúc", formatDate(props.createdAt)],
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* App header */}
      <section className="flex items-center gap-4 rounded-2xl border border-border bg-surface/60 p-5 backdrop-blur">
        <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-surface-2 text-3xl">
          {hasIcon ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/icon/${slug}`}
              alt={props.appName}
              className="h-full w-full object-cover"
            />
          ) : isIos ? (
            "📱"
          ) : (
            "🤖"
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="truncate text-xl font-bold">{props.appName}</h1>
          <span
            className={`w-fit rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              isIos
                ? "bg-blue-500/15 text-blue-300"
                : "bg-green-500/15 text-green-300"
            }`}
          >
            {isIos ? "iOS · .ipa" : "Android · .apk"}
          </span>
          {props.comment && (
            <p className="mt-1 line-clamp-2 text-sm text-muted">{props.comment}</p>
          )}
        </div>
      </section>

      {/* Install action */}
      <section className="flex flex-col gap-3 rounded-2xl border border-border bg-surface/60 p-5 backdrop-blur">
        {wrongDevice ? (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            Build này dành cho <strong>{isIos ? "iOS" : "Android"}</strong>. Mở link
            trên thiết bị {isIos ? "iPhone/iPad" : "Android"} để cài, hoặc quét QR bên dưới.
          </div>
        ) : null}

        {isIos ? (
          <a
            href={props.itmsUrl}
            className="grid place-items-center rounded-xl bg-gradient-to-r from-accent to-accent-2 px-5 py-3.5 text-base font-semibold text-white transition hover:opacity-90"
          >
            Cài đặt lên iPhone / iPad
          </a>
        ) : (
          <a
            href={props.downloadUrl}
            className="grid place-items-center rounded-xl bg-gradient-to-r from-accent to-accent-2 px-5 py-3.5 text-base font-semibold text-white transition hover:opacity-90"
          >
            Tải &amp; cài APK
          </a>
        )}

        <p className="text-xs text-muted">
          {isIos
            ? "Sau khi cài: Cài đặt → Cài đặt chung → VPN & Quản lý thiết bị → Tin cậy chứng chỉ nhà phát triển. App phải được ký ad-hoc/enterprise với UDID của máy này."
            : "Nếu báo chặn: bật \"Cài đặt ứng dụng không xác định\" cho trình duyệt khi được hỏi."}
        </p>
      </section>

      {/* QR + share link */}
      <section className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-surface/60 p-5 backdrop-blur">
        <p className="text-sm font-medium text-muted">Quét bằng camera điện thoại</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={props.qrDataUrl}
          alt="QR code"
          className="h-44 w-44 rounded-xl bg-white p-2"
        />
        <div className="flex w-full items-center gap-2">
          <input
            readOnly
            value={props.shareUrl}
            className="min-w-0 flex-1 truncate rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-muted"
          />
          <button
            onClick={copyLink}
            className="shrink-0 rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm font-semibold text-foreground transition hover:border-accent/60"
          >
            {copied ? "Đã chép ✓" : "Chép link"}
          </button>
        </div>
      </section>

      {/* Metadata */}
      <section className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border">
        {meta.map(([label, value]) => (
          <div key={label} className="flex flex-col gap-1 bg-surface p-4">
            <span className="text-xs text-muted">{label}</span>
            <span className="truncate text-sm font-medium text-foreground" title={value}>
              {value}
            </span>
          </div>
        ))}
      </section>

      {props.expiresAt && (
        <p className="text-center text-xs text-muted">
          Link hết hạn lúc {formatDate(props.expiresAt)}
        </p>
      )}
    </div>
  );
}
