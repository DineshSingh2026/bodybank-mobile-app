#!/usr/bin/env bash
#
# iOS code signing for Codemagic — force a FRESH App Store provisioning profile.
#
# WHY THIS EXISTS
# Apple marks a provisioning profile "Invalid" when the App ID's capabilities
# change (e.g. enabling Sign In with Apple); it does NOT regenerate it. The
# Developer portal hides invalid profiles, so they look deleted while still
# existing via the API. `fetch-signing-files --create` then finds that stale
# profile, reuses it, and the archive fails with:
#   "App" requires a provisioning profile with the Sign In with Apple feature.
#
# So: delete every App Store profile for this bundle id via the API first, then
# create a new one that reflects the CURRENT capabilities.
#
# iOS only. Nothing here touches the Android workflow.

set -uo pipefail

BUNDLE_ID="${BUNDLE_ID:-com.bodybank.app}"

echo "=== [1/5] keychain initialize"
keychain initialize

echo "=== [2/5] existing App Store profiles for ${BUNDLE_ID} (via API, incl. invalid ones)"
if app-store-connect list-profiles --bundle-id-identifier "$BUNDLE_ID" --profile-type IOS_APP_STORE --json > /tmp/profiles.json 2>/tmp/profiles.err; then
  head -c 4000 /tmp/profiles.json
  echo
else
  echo "list-profiles failed (continuing anyway):"
  cat /tmp/profiles.err || true
  echo "[]" > /tmp/profiles.json
fi

python3 - <<'PY' > /tmp/profile_ids.txt 2>/dev/null || : > /tmp/profile_ids.txt
import json
try:
    data = json.load(open('/tmp/profiles.json'))
except Exception:
    data = []
if isinstance(data, dict):
    data = data.get('data', [])
for p in data if isinstance(data, list) else []:
    if isinstance(p, dict) and p.get('id'):
        print(p['id'])
PY

echo "=== [3/5] deleting stale profiles"
if [ -s /tmp/profile_ids.txt ]; then
  while read -r pid; do
    [ -z "$pid" ] && continue
    echo "    deleting $pid"
    app-store-connect delete-profile "$pid" || echo "    (delete failed for $pid, continuing)"
  done < /tmp/profile_ids.txt
else
  echo "    none found"
fi

echo "=== [4/5] creating a fresh certificate + profile"
app-store-connect fetch-signing-files "$BUNDLE_ID" --type IOS_APP_STORE --create
keychain add-certificates
xcode-project use-profiles

echo "=== [5/5] DIAGNOSTIC — entitlements Apple actually granted"
found=0
for f in "$HOME/Library/MobileDevice/Provisioning Profiles/"*.mobileprovision; do
  [ -e "$f" ] || continue
  found=1
  echo "--- $f"
  security cms -D -i "$f" 2>/dev/null | plutil -p - 2>/dev/null | grep -i -A3 "applesignin" \
    || echo "    !! NO applesignin entitlement in this profile"
done
[ "$found" = "1" ] || echo "    !! no .mobileprovision files found on disk"
echo "=== signing done"
