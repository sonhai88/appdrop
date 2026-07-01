# AppDrop

Self-hosted [Diawi](https://www.diawi.com/) clone — upload an `.ipa` / `.apk`, get a
shareable link, install over-the-air on iOS & Android.

## What it does

- **Upload** a build (drag-drop + progress; streamed, handles 200MB+ files).
- **Auto-parses** app name, bundle id, version, icon from the `.ipa`/`.apk` (no Xcode/aapt).
- **Share page** `/d/<slug>` with QR code + OS-aware install button.
- **iOS**: generates the `itms-services://` manifest.plist for OTA install.
- **Android**: serves the `.apk` directly with the right content-type.
- Optional note, link expiry, **per-link password**; download counter.
- **Dashboard** `/builds`: uploads grouped by app + version history, search, manual delete.
- **Login**: one shared team password (`APP_PASSWORD`) gates upload + dashboard; install links stay public.
- **UDID collector** `/udid`: testers tap once, their iPhone posts its UDID back (Apple OTA enrollment) → listed in the dashboard for ad-hoc registration.
- **Storage cap**: keeps at most `MAX_APPS` distinct apps (FIFO — oldest app evicted).
- **Auto-cleanup**: expired builds (files/objects + rows) swept on boot + hourly.

## Stack

| Concern | Choice |
|---|---|
| App | Next.js 16 (App Router) + React 19 + TS |
| Styling | Tailwind v4 |
| Metadata DB | SQLite (`better-sqlite3`) — single file, zero config |
| File storage | local disk (`DATA_DIR`) **or** Cloudflare R2 (auto-detected) |
| Parsing | `app-info-parser` |
| HTTPS | Caddy (VPS) / platform HTTPS (Railway) / Cloudflare (tunnel or R2) |

## Run

```bash
npm ci
npm run dev              # dev  → http://localhost:3000
# or production:
npm run build && npm start
```

Android installs work over plain HTTP/LAN. **iOS OTA needs trusted HTTPS** — any of:
Railway domain, Cloudflare Tunnel, R2 public URL, or a real domain + Caddy.

## Configuration (env — put in `.env`, all optional)

| Var | Default | What |
|---|---|---|
| `APP_PASSWORD` | *(empty)* | Shared password for upload + dashboard. Empty = open. Install links always public. |
| `DATA_DIR` | `./data` | Where SQLite + (disk-mode) files live. Point at a persistent volume/NAS. |
| `MAX_APPS` | `20` | Max distinct apps (by bundle id); a new app past this evicts the oldest (FIFO). |
| `DEFAULT_EXPIRY_DAYS` | `30` | Default link lifetime; `0` = never. |
| `MAX_UPLOAD_BYTES` | `524288000` | Upload size cap (500MB). |
| `PUBLIC_BASE_URL` | *(from request)* | Absolute HTTPS base for manifest/iOS. Leave empty to derive from headers. |
| `R2_ACCOUNT_ID` `R2_ACCESS_KEY_ID` `R2_SECRET_ACCESS_KEY` `R2_BUCKET` `R2_PUBLIC_BASE_URL` | *(empty)* | Set **all five** → store files on R2. See [R2.md](./R2.md). |

Copy `env.sample` → `.env` to start. `.env` is gitignored (never committed).

## Deploy — pick one

| Goal | How | Guide |
|---|---|---|
| **Public, anyone installs, ~10 min** | Railway (container + HTTPS domain) | [RAILWAY.md](./RAILWAY.md) |
| **Public for free, from your own machine** | Cloudflare Tunnel | [TUNNEL.md](./TUNNEL.md) |
| **Company LAN (no domain)** | self-signed cert on the box | [SETUP.md](./SETUP.md) / [DEPLOY.md](./DEPLOY.md) |
| **Own VPS + domain** | Caddy auto-HTTPS + systemd | [DEPLOY.md](./DEPLOY.md) |
| **Offload file storage** | Cloudflare R2 (egress-free) | [R2.md](./R2.md) |

All modes keep the same app; only HTTPS + storage location differ. iOS OTA works on
Railway / Tunnel / R2 / real-domain out of the box; LAN-without-domain needs the
self-signed CA installed on each iPhone (SETUP.md).

> **iOS limitation (unavoidable, same as Diawi):** AppDrop only hosts + builds the
> manifest. The `.ipa` must already be signed (ad-hoc with the device UDID in the
> profile, or enterprise). That's Apple's rule, separate from the HTTPS transport.

## Project layout

```
src/
├── app/
│   ├── page.tsx                       # landing + upload
│   ├── login/page.tsx                 # shared-password login
│   ├── d/[slug]/page.tsx              # share / install page (QR + buttons, password gate)
│   ├── builds/                        # dashboard: apps, version history, UDID list
│   ├── udid/                          # tester UDID enrollment + result
│   └── api/
│       ├── upload/route.ts            # POST: stream → parse → disk or R2
│       ├── download|icon|manifest/    # serve or 302-redirect to R2
│       ├── login|logout|unlock/       # auth + per-link unlock
│       ├── builds/[slug]/route.ts     # DELETE a build
│       └── udid/{profile,collect}/    # Apple OTA-enrollment UDID capture
├── components/                        # UploadForm, InstallPanel, forms, buttons
├── lib/                               # config, db, storage, r2, blob, parse, manifest,
│                                      #   auth, password, limits, cleanup, slug, format
├── proxy.ts                           # auth gate (Next 16 middleware)
└── instrumentation.ts                 # hourly cleanup job
```
```
Dockerfile · railway.json     # container deploy
Caddyfile · Caddyfile.lan     # VPS / LAN reverse proxy
scripts/gen-ios-certs.sh      # self-signed CA + iOS profile (LAN mode)
```
