#!/usr/bin/env bash
#
# iOS code signing for Codemagic — create (not just fetch) the certificate and
# the App Store provisioning profile, then prove what they contain.
#
# BACKGROUND — why this script exists at all
#   * Codemagic's `ios_signing:` block only FETCHES existing signing files. On an
#     Apple account with no certificate and no profile it fails outright with
#     "No matching profiles found for bundle identifier ... app_store".
#   * `fetch-signing-files --create` CAN create them, but needs a certificate
#     private key to build the signing request. Without one it prints
#     "Cannot save Signing Certificates without certificate private key",
#     silently saves nothing, and the archive then runs with NO profile — which
#     Xcode misreports as a missing Sign In with Apple capability.
#
# So we supply our own stable key via the secure Codemagic variable
# CERTIFICATE_PRIVATE_KEY (group `ios_signing`). The CLI picks it up from the
# environment. First build mints the certificate + profile; later builds reuse
# them, because the same key maps to the same certificate.
#
# iOS only. Nothing here touches the Android workflow.

set -uo pipefail

BUNDLE_ID="${BUNDLE_ID:-com.bodybank.app}"

echo "=== [1/4] preflight"
if [ -z "${CERTIFICATE_PRIVATE_KEY:-}" ]; then
  echo "    !! CERTIFICATE_PRIVATE_KEY is not set."
  echo "    !! Add it as a SECURE variable in the Codemagic group 'ios_signing'."
  exit 1
fi
echo "    CERTIFICATE_PRIVATE_KEY is present ($(printf '%s' "$CERTIFICATE_PRIVATE_KEY" | wc -c | tr -d ' ') bytes)"
keychain initialize

echo "=== [2/4] create or fetch the certificate + App Store profile"
app-store-connect fetch-signing-files "$BUNDLE_ID" --type IOS_APP_STORE --create
keychain add-certificates

echo "=== [3/4] map profiles onto the Xcode project"
xcode-project use-profiles

echo "=== [4/4] DIAGNOSTIC — what Apple actually granted"
security find-identity -v -p codesigning 2>/dev/null || echo "    !! no code signing identities in the keychain"
found=0
for dir in "$HOME/Library/MobileDevice/Provisioning Profiles" \
           "$HOME/Library/Developer/Xcode/UserData/Provisioning Profiles"; do
  for f in "$dir"/*.mobileprovision; do
    [ -e "$f" ] || continue
    found=1
    echo "--- $f"
    security cms -D -i "$f" 2>/dev/null | plutil -p - 2>/dev/null \
      | grep -i -E "applesignin|\"Name\"|application-identifier" -A2 \
      || echo "    !! could not read this profile"
  done
done
if [ "$found" = "1" ]; then
  echo "    (no 'applesignin' line above means Apple did not grant the capability)"
else
  echo "    !! NO .mobileprovision files on disk — signing produced nothing"
fi
echo "=== signing done"
