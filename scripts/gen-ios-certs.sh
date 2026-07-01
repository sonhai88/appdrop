#!/usr/bin/env bash
#
# Generate a self-signed TLS setup for iOS OTA install inside a LAN (no domain).
#
#   ./scripts/gen-ios-certs.sh <server-ip-or-hostname> [out-dir]
#   ./scripts/gen-ios-certs.sh 192.168.1.50
#   ./scripts/gen-ios-certs.sh appdrop.lan certs
#
# Produces (in ./certs by default):
#   ca.crt / ca.key            internal Certificate Authority
#   server.crt / server.key    TLS cert for Caddy (SAN + EKU tuned for iOS)
#   appdrop-ca.mobileconfig    install THIS on every iPhone, then enable Full Trust
#
# NOTE: this only makes the HTTPS *transport* trusted. The .ipa itself still must
# be signed ad-hoc/enterprise with the device UDID — that's separate.
set -euo pipefail

HOST="${1:-}"
OUT="${2:-certs}"

if [[ -z "$HOST" ]]; then
  echo "Usage: $0 <server-ip-or-hostname> [out-dir]" >&2
  echo "  e.g. $0 192.168.1.50   or   $0 appdrop.lan" >&2
  exit 1
fi

DAYS_CA=3650
DAYS_LEAF=820   # iOS rejects server certs valid longer than 825 days

# iOS wants the host in subjectAltName — as IP: for an address, DNS: for a name.
if [[ "$HOST" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  SAN="IP:$HOST"
else
  SAN="DNS:$HOST"
fi

gen_uuid() { uuidgen 2>/dev/null || cat /proc/sys/kernel/random/uuid; }

mkdir -p "$OUT"
cd "$OUT"

echo "==> Host=$HOST  SAN=$SAN  (out: $OUT/)"

# 1) Internal Root CA
openssl genrsa -out ca.key 4096 2>/dev/null
openssl req -x509 -new -nodes -key ca.key -sha256 -days "$DAYS_CA" \
  -subj "/CN=AppDrop Internal CA/O=AppDrop" -out ca.crt

# 2) Server key + CSR
openssl genrsa -out server.key 2048 2>/dev/null
openssl req -new -key server.key -subj "/CN=$HOST/O=AppDrop" -out server.csr

# 3) Sign leaf cert with the extensions iOS requires
cat > leaf.ext <<EOF
basicConstraints=CA:FALSE
keyUsage=digitalSignature,keyEncipherment
extendedKeyUsage=serverAuth
subjectAltName=$SAN
EOF
openssl x509 -req -in server.csr -CA ca.crt -CAkey ca.key -CAcreateserial \
  -out server.crt -days "$DAYS_LEAF" -sha256 -extfile leaf.ext 2>/dev/null
rm -f server.csr leaf.ext ca.srl

# 4) .mobileconfig that installs the CA root on an iPhone
CA_B64=$(openssl x509 -in ca.crt -outform DER | base64 | tr -d '\n')
UUID_CERT=$(gen_uuid)
UUID_PROFILE=$(gen_uuid)
cat > appdrop-ca.mobileconfig <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>PayloadContent</key>
  <array>
    <dict>
      <key>PayloadType</key>
      <string>com.apple.security.root</string>
      <key>PayloadVersion</key>
      <integer>1</integer>
      <key>PayloadIdentifier</key>
      <string>com.appdrop.ca</string>
      <key>PayloadUUID</key>
      <string>${UUID_CERT}</string>
      <key>PayloadDisplayName</key>
      <string>AppDrop Internal CA</string>
      <key>PayloadCertificateFileName</key>
      <string>appdrop-ca.crt</string>
      <key>PayloadContent</key>
      <data>${CA_B64}</data>
    </dict>
  </array>
  <key>PayloadDisplayName</key>
  <string>AppDrop Internal CA</string>
  <key>PayloadIdentifier</key>
  <string>com.appdrop.profile</string>
  <key>PayloadType</key>
  <string>Configuration</string>
  <key>PayloadUUID</key>
  <string>${UUID_PROFILE}</string>
  <key>PayloadVersion</key>
  <integer>1</integer>
</dict>
</plist>
EOF

cat <<DONE

==> Done. Files in $(pwd):
    server.crt / server.key    -> point Caddy at these (Caddyfile.lan)
    appdrop-ca.mobileconfig    -> install on each iPhone

Next:
  1) Set in .env:   PUBLIC_BASE_URL=https://${HOST}
  2) Caddy:         use Caddyfile.lan (tls with server.crt/server.key)
  3) Each iPhone:   open https://${HOST}/appdrop-ca  (or AirDrop appdrop-ca.mobileconfig)
                    Settings > Profile Downloaded > Install
                    Settings > General > About > Certificate Trust Settings
                       > enable Full Trust for "AppDrop Internal CA"
  4) Now itms-services OTA install works over the LAN.
DONE
