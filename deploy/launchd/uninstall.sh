#!/usr/bin/env bash
# Stop + remove the AppDrop launchd agents.
LA="$HOME/Library/LaunchAgents"
for f in com.appdrop.app com.appdrop.tunnel com.appdrop.caffeinate; do
  launchctl unload "$LA/$f.plist" 2>/dev/null || true
  rm -f "$LA/$f.plist"
  echo "removed $f"
done
