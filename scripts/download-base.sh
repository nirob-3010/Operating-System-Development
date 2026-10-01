#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CACHE="$ROOT/.cache"
mkdir -p "$CACHE"
source "$ROOT/ui/theme/build-vars.sh" 2>/dev/null || true
TC_VERSION="${TC_VERSION:-17.1}"
TC_ARCH="${TC_ARCH:-x86_64}"
BASE_ISO="$CACHE/TinyCorePure64-${TC_VERSION}.iso"
BASE_MD5="$CACHE/TinyCorePure64-${TC_VERSION}.iso.md5.txt"

# The upstream tinycorelinux.net host can occasionally be unreachable from CI.
# Keep it as a fallback, but use public mirrors first and fail over automatically.
MIRRORS=(
  "https://mirror.nju.edu.cn/tinycorelinux/17.x/x86_64/release"
  "https://distro.ibiblio.org/tinycorelinux/17.x/x86_64/release"
  "https://mirrors.aliyun.com/tinycorelinux/17.x/x86_64/release"
  "https://www.tinycorelinux.net/17.x/x86_64/release"
)

info(){ echo "[INFO] $*"; }
ok(){ echo "[OK] $*"; }
err(){ echo "[ERROR] $*" >&2; exit 1; }

if [ -f "$BASE_ISO" ] && [ -f "$BASE_MD5" ]; then
  info "Using cached Tiny Core ${TC_VERSION} base"
else
  rm -f "$BASE_ISO" "$BASE_MD5"
  info "Downloading Tiny Core ${TC_VERSION} x86_64 base with mirror failover..."
  downloaded=0
  for base in "${MIRRORS[@]}"; do
    info "Trying mirror: $base"
    if curl -fL --connect-timeout 15 --max-time 180 --retry 2 --retry-all-errors \
        -o "$BASE_ISO" "$base/TinyCorePure64-${TC_VERSION}.iso" && \
       curl -fL --connect-timeout 15 --max-time 30 --retry 2 --retry-all-errors \
        -o "$BASE_MD5" "$base/TinyCorePure64-${TC_VERSION}.iso.md5.txt"; then
      downloaded=1
      ok "Base downloaded from $base"
      break
    fi
    rm -f "$BASE_ISO" "$BASE_MD5"
    echo "[WARN] Mirror unavailable: $base" >&2
  done
  [ "$downloaded" -eq 1 ] || err "Could not download TinyCorePure64-${TC_VERSION}.iso from any configured mirror"
fi

cd "$CACHE"
if command -v md5sum >/dev/null 2>&1; then
  md5sum -c "$BASE_MD5" || err "Base ISO MD5 verification failed"
fi
ok "Base ISO downloaded and verified"
