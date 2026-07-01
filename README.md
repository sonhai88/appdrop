# AppDrop

Self-hosted [Diawi](https://www.diawi.com/) clone — upload an `.ipa` / `.apk`, get a
shareable link, install over-the-air on iOS & Android.

## What it does

- **Upload** a build (drag-drop, streamed to disk — handles 200MB+ files).
- **Auto-parses** app name, bundle id, version, icon from the `.ipa`/`.apk` (no Xcode/aapt needed).
- **Share page** `/d/<slug>` with QR code + OS-aware install button.
- **iOS**: generates the `itms-services://` manifest.plist for OTA install.
- **Android**: serves the `.apk` directly with the right content-type.
- Optional note + link expiry; download counter.

## Stack

| Concern | Choice |
|---|---|
| App | Next.js 16 (App Router) + React 19 + TS |
| Styling | Tailwind v4 |
| DB | SQLite (`better-sqlite3`) — single file, zero config |
| Storage | local disk (`DATA_DIR`) |
| Parsing | `app-info-parser` |
| HTTPS/proxy | Caddy (auto Let's Encrypt) |

## Run locally

```bash
npm ci
npm run dev    # http://localhost:3000
```

Android installs work over LAN immediately. **iOS OTA needs a real HTTPS domain** —
see [DEPLOY.md](./DEPLOY.md).

## Deploy

Full VPS guide (domain → Caddy → systemd → iOS signing notes): **[DEPLOY.md](./DEPLOY.md)**.

## Project layout

```
src/
├── app/
│   ├── page.tsx                     # landing + upload
│   ├── d/[slug]/page.tsx            # share / install page (QR + buttons)
│   └── api/
│       ├── upload/route.ts          # POST: stream file to disk + parse
│       ├── download/[slug]/route.ts # GET: serve .ipa/.apk
│       ├── icon/[slug]/route.ts     # GET: app icon png
│       └── manifest/[slug]/route.ts # GET: iOS manifest.plist
├── components/
│   ├── UploadForm.tsx               # drag-drop + XHR progress
│   └── InstallPanel.tsx             # OS detection + install action
└── lib/
    ├── config.ts  db.ts  storage.ts  parse.ts  manifest.ts  slug.ts  format.ts
```

> **iOS limitation:** this only hosts + builds the manifest. The `.ipa` must already be
> signed (ad-hoc with the device UDID in the profile, or enterprise). Apple's rule, same
> as Diawi.
