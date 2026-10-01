#!/bin/sh
set -eu
ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
cd "$ROOT"

WITH_INSTALLER="${WITH_INSTALLER:-false}"
if [ "$WITH_INSTALLER" = "true" ]; then
  printf '%s\n' calamares calamares-settings-debian > config/package-lists/installer.list.chroot
else
  rm -f config/package-lists/installer.list.chroot
fi

./auto/clean || true
./auto/config
sudo env MKSQUASHFS_OPTIONS="-comp xz -Xbcj x86 -b 1M" lb build

ISO="$(find "$ROOT" -maxdepth 1 -type f \( -name '*.hybrid.iso' -o -name '*.iso' \) | head -n 1)"
test -n "$ISO"
if [ "$WITH_INSTALLER" = "true" ]; then
  OUT="$ROOT/nsk-os-0.3-amd64-installer.iso"
else
  OUT="$ROOT/nsk-os-0.3-amd64.iso"
fi
mv -f "$ISO" "$OUT"
sha256sum "$OUT" > "$OUT.sha256"
SIZE="$(stat -c '%s' "$OUT")"
echo "ISO: $OUT"
echo "Bytes: $SIZE"
if [ "$WITH_INSTALLER" != "true" ] && [ "$SIZE" -gt 524288000 ]; then
  echo "ERROR: ISO exceeds 500 MiB hard limit." >&2
  exit 2
fi
