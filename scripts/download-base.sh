#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CACHE="$ROOT/.cache"
mkdir -p "$CACHE"
source "$ROOT/ui/theme/build-vars.sh" 2>/dev/null || true
TC_VERSION="${TC_VERSION:-17.0}"
TC_ARCH="${TC_ARCH:-x86_64}"
BASE_URL="https://www.tinycorelinux.net/17.x/x86_64/release"
BASE_ISO="$CACHE/TinyCorePure64-${TC_VERSION}.iso"
BASE_MD5="$CACHE/TinyCorePure64-${TC_VERSION}.iso.md5.txt"

info(){ echo "[INFO] $*"; }
ok(){ echo "[OK] $*"; }
err(){ echo "[ERROR] $*" >&2; exit 1; }

info "Downloading Tiny Core ${TC_VERSION} x86_64 base..."
curl -fL --retry 4 --retry-all-errors -o "$BASE_ISO" "$BASE_URL/TinyCorePure64-${TC_VERSION}.iso"
curl -fL --retry 4 --retry-all-errors -o "$BASE_MD5" "$BASE_URL/TinyCorePure64-${TC_VERSION}.iso.md5.txt"

cd "$CACHE"
if command -v md5sum >/dev/null 2>&1; then
  if ! md5sum -c "$BASE_MD5"; then
    err "Base ISO MD5 verification failed"
  fi
fi
ok "Base ISO downloaded and verified"
