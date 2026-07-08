#!/usr/bin/env bash
# Install the AppDrop launchd agents (app + tunnel + no-sleep) so they auto-start
# on login and auto-restart on crash. Reversible with uninstall.sh.
set -e
LA="$HOME/Library/LaunchAgents"
SRC="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$LA"

for f in com.appdrop.app com.appdrop.tunnel com.appdrop.caffeinate; do
  cp "$SRC/$f.plist" "$LA/$f.plist"
  launchctl unload "$LA/$f.plist" 2>/dev/null || true
  launchctl load -w "$LA/$f.plist"
  echo "loaded $f"
done

echo "Waiting for the tunnel URL…"
sleep 9
URL=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' /tmp/appdrop-tunnel.log | tail -1)
echo "PUBLIC URL: ${URL:-<not ready — run ./url.sh in a few seconds>}"
