# AppDrop

Self-hosted [Diawi](https://www.diawi.com/) clone — upload an `.ipa` / `.apk`, get a
shareable link, install over-the-air on iOS & Android.

## What it does

- **Upload** a build (drag-drop, streamed to disk — handles 200MB+ files).
- **Auto-parses** app name, bundle id, version, icon from the `.ipa`/`.apk` (no Xcode/aapt needed).
- **Share page** `/d/<slug>` with QR code + OS-aware install button.
- **iOS**: generates the `itms-services://` manifest.plist for OTA install.
- **Android**: serves the `.apk` directly with the right content-type.
- Optional note, link expiry, per-link password; download counter.
- **Dashboard** `/builds`: all uploads grouped by app + version history, search, manual delete.
- **Login**: one shared team password (`APP_PASSWORD`) gates upload + dashboard; install links stay public.
- **UDID collector** `/udid`: testers tap once, their iPhone posts its UDID back (Apple OTA enrollment) → listed in the dashboard for ad-hoc registration.
- **Auto-cleanup**: expired builds (files + rows) are swept on boot + hourly.

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

- **Public in ~10 min (anyone can install via the link): [RAILWAY.md](./RAILWAY.md)** — container host, public HTTPS, iOS OTA works out of the box.
- LAN / VPS quick setup (copy-paste): [SETUP.md](./SETUP.md)
- Full guide (domain vs LAN, Caddy, systemd, storage, iOS signing): [DEPLOY.md](./DEPLOY.md)
- Cloudflare R2 storage (egress-free; also makes iOS OTA work without a domain): [R2.md](./R2.md)

## Storage

Builds are stored on local disk (`DATA_DIR`) by default. Set the five `R2_*` vars
(see [R2.md](./R2.md)) to switch to Cloudflare R2 — no code change, and iOS OTA then
works over R2's HTTPS with no domain/cert on the server.

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
