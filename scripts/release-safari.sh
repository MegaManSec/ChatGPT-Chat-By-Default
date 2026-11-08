#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-}"
if [[ "$MODE" != "app-store" && "$MODE" != "developer-id" ]]; then
  echo "Usage: $0 <app-store|developer-id>" >&2
  exit 1
fi

: "${APPLE_TEAM_ID:?}" "${ASC_KEY_ID:?}" "${ASC_ISSUER_ID:?}" "${ASC_KEY_PATH:?}" "${BUILD_NUMBER:?}"
VERSION="${VERSION:-$(node -p "require('./package.json').version")}"
OUT="${OUT:-$PWD/artifacts/safari}"
PROJECT="safari/Chat by Default/Chat by Default.xcodeproj"
WORK="$(mktemp -d)"
KEYCHAIN=""

cleanup() {
  if [[ -n "$KEYCHAIN" ]]; then
    security delete-keychain "$KEYCHAIN" 2>/dev/null || true
  fi
  rm -rf "$WORK"
}
trap cleanup EXIT

archive() {
  local scheme="$1" destination="$2" path="$3"
  shift 3
  xcodebuild clean archive -project "$PROJECT" -scheme "$scheme" -configuration Release \
    -destination "$destination" -archivePath "$path" \
    DEVELOPMENT_TEAM="$APPLE_TEAM_ID" MARKETING_VERSION="$VERSION" CURRENT_PROJECT_VERSION="$BUILD_NUMBER" \
    "$@"
}

app_store() {
  cp safari/ExportOptions-AppStore.plist "$WORK/app-store.plist"
  plutil -replace teamID -string "$APPLE_TEAM_ID" "$WORK/app-store.plist"

  archive "Chat by Default (iOS)" "generic/platform=iOS" "$WORK/ios.xcarchive" CODE_SIGNING_ALLOWED=NO
  archive "Chat by Default (macOS)" "generic/platform=macOS" "$WORK/macos.xcarchive" \
    CODE_SIGN_STYLE=Manual CODE_SIGN_IDENTITY=-

  local name
  for name in ios macos; do
    xcodebuild -exportArchive -archivePath "$WORK/$name.xcarchive" \
      -exportOptionsPlist "$WORK/app-store.plist" -exportPath "$WORK/$name-export" \
      -allowProvisioningUpdates \
      -authenticationKeyPath "$ASC_KEY_PATH" \
      -authenticationKeyID "$ASC_KEY_ID" \
      -authenticationKeyIssuerID "$ASC_ISSUER_ID"
  done
}

import_developer_id() {
  : "${DEVELOPER_ID_P12:?}" "${DEVELOPER_ID_P12_PASSWORD:?}"
  KEYCHAIN="$WORK/signing.keychain-db"
  local password
  password="$(openssl rand -base64 32)"
  printf '%s' "$DEVELOPER_ID_P12" | base64 --decode > "$WORK/developer-id.p12"
  security create-keychain -p "$password" "$KEYCHAIN"
  security set-keychain-settings -lut 21600 "$KEYCHAIN"
  security unlock-keychain -p "$password" "$KEYCHAIN"
  security import "$WORK/developer-id.p12" -k "$KEYCHAIN" -P "$DEVELOPER_ID_P12_PASSWORD" -T /usr/bin/codesign
  security set-key-partition-list -S apple-tool:,apple: -s -k "$password" "$KEYCHAIN" >/dev/null
  security list-keychains -d user -s "$KEYCHAIN" $(security list-keychains -d user | tr -d '"')
  rm -f "$WORK/developer-id.p12"
  security find-identity -v -p codesigning "$KEYCHAIN"
}

verify_signature() {
  local target="$1" details
  codesign --verify --deep --strict --verbose=2 "$target"
  details="$(codesign -dvv "$target" 2>&1)"
  grep -q "^Authority=Developer ID Application: .*($APPLE_TEAM_ID)\$" <<<"$details"
  grep -q "^TeamIdentifier=$APPLE_TEAM_ID\$" <<<"$details"
  grep -q '^Timestamp=' <<<"$details"
}

notarize() {
  local app="$1" result status submission_id
  local auth=(--key "$ASC_KEY_PATH" --key-id "$ASC_KEY_ID" --issuer "$ASC_ISSUER_ID")
  ditto -c -k --sequesterRsrc --keepParent "$app" "$WORK/notarize.zip"
  result="$(xcrun notarytool submit "$WORK/notarize.zip" "${auth[@]}" --wait --timeout 2h --output-format json || true)"
  echo "$result"
  status="$(plutil -extract status raw -o - - <<<"$result" 2>/dev/null || true)"
  submission_id="$(plutil -extract id raw -o - - <<<"$result" 2>/dev/null || true)"
  if [[ "$status" != "Accepted" ]]; then
    if [[ -n "$submission_id" ]]; then
      xcrun notarytool log "$submission_id" "${auth[@]}" || true
    fi
    exit 1
  fi
  xcrun stapler staple "$app"
  xcrun stapler validate "$app"
  spctl -a -vvv -t exec "$app"
}

developer_id() {
  import_developer_id
  archive "Chat by Default (macOS)" "generic/platform=macOS" "$WORK/macos.xcarchive" \
    CODE_SIGN_STYLE=Manual CODE_SIGN_IDENTITY="Developer ID Application" OTHER_CODE_SIGN_FLAGS="--timestamp"

  local app="$WORK/macos.xcarchive/Products/Applications/Chat by Default.app"
  verify_signature "$app/Contents/PlugIns/Chat by Default Extension.appex"
  verify_signature "$app"
  notarize "$app"

  mkdir -p "$OUT"
  rm -f "$OUT/chat-by-default-macos.zip"
  ditto -c -k --sequesterRsrc --keepParent "$app" "$OUT/chat-by-default-macos.zip"
  echo "Wrote $OUT/chat-by-default-macos.zip"
}

if [[ "$MODE" == "app-store" ]]; then
  app_store
else
  developer_id
fi
