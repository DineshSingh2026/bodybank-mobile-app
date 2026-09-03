#!/usr/bin/env bash
#
# iOS code signing for Codemagic — apply the fetched profiles, then prove what
# they contain.
#
# The `ios_signing:` block in codemagic.yaml already ran before this script:
# Codemagic generated the certificate private key, created/fetched the Apple
# Distribution certificate and the App Store provisioning profile, and put them
# on disk. This script only maps them onto the Xcode project and then PRINTS the
# entitlements Apple actually granted.
#
# Why the printing matters: when signing silently produces nothing, Xcode
# archives with no profile at all and reports it as
#   "App" requires a provisioning profile with the Sign In with Apple feature.
# which looks like an App ID capability problem and is not one. The dump below
# distinguishes the two in one glance.
#
# iOS only. Nothing here touches the Android workflow.

set -uo pipefail

echo "=== [1/3] certificates in the build keychain"
security find-identity -v -p codesigning 2>/dev/null || echo "    !! no code signing identities found"

echo "=== [2/3] mapping provisioning profiles onto the Xcode project"
xcode-project use-profiles

echo "=== [3/3] DIAGNOSTIC — entitlements Apple actually granted"
found=0
for dir in "$HOME/Library/MobileDevice/Provisioning Profiles" \
           "$HOME/Library/Developer/Xcode/UserData/Provisioning Profiles"; do
  for f in "$dir"/*.mobileprovision; do
    [ -e "$f" ] || continue
    found=1
    echo "--- $f"
    security cms -D -i "$f" 2>/dev/null | plutil -p - 2>/dev/null \
      | grep -i -E "applesignin|\"Name\"|\"TeamIdentifier\"|application-identifier" -A2 \
      || echo "    !! could not read this profile"
  done
done
[ "$found" = "1" ] && echo "    (if no 'applesignin' line appears above, Apple did not grant it)" \
                   || echo "    !! NO .mobileprovision files on disk — signing produced nothing"
echo "=== signing done"
