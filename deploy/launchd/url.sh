#!/usr/bin/env bash
# Print the current public tunnel URL (quick tunnels change on restart).
grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' /tmp/appdrop-tunnel.log | tail -1
