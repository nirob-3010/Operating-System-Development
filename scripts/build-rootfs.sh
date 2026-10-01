#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK="$ROOT/.build"
CACHE="$ROOT/.cache"
ISO="$CACHE/TinyCorePure64-17.0.iso"
ISO_ROOT="$WORK/iso-root"
BASE_INITRD="$WORK/base-initrd.gz"
INITRD_DIR="$WORK/custom-initrd"
PKGDIR="$WORK/tcz"

info(){ echo "[INFO] $*"; }
ok(){ echo "[OK] $*"; }
err(){ echo "[ERROR] $*" >&2; exit 1; }

command -v xorriso >/dev/null || err "xorriso is required"
command -v cpio >/dev/null || err "cpio is required"
command -v gzip >/dev/null || err "gzip is required"
command -v unsquashfs >/dev/null || err "squashfs-tools is required"
command -v rsync >/dev/null || err "rsync is required"
[ -f "$ISO" ] || err "Base ISO missing; run scripts/download-base.sh first"

rm -rf "$WORK"
mkdir -p "$ISO_ROOT" "$INITRD_DIR" "$PKGDIR"

info "Extracting Tiny Core ISO"
xorriso -osirrox on -indev "$ISO" -extract / "$ISO_ROOT" >/dev/null 2>&1
KERNEL="$(find "$ISO_ROOT/boot" -maxdepth 1 -type f -name 'vmlinuz*' | head -n1)"
INITRD="$(find "$ISO_ROOT/boot" -maxdepth 1 -type f \( -name '*.gz' -o -name '*.img' \) | grep -E 'core|tinycore' | head -n1 || true)"
[ -n "$KERNEL" ] || err "Could not find Tiny Core kernel"
[ -n "$INITRD" ] || err "Could not find Tiny Core initramfs"
KERNEL_NAME="$(basename "$KERNEL")"
INITRD_NAME="$(basename "$INITRD")"
cp "$KERNEL" "$WORK/vmlinuz"
cp "$INITRD" "$BASE_INITRD"

info "Unpacking Tiny Core initramfs: $INITRD_NAME"
gzip -dc "$BASE_INITRD" | (cd "$INITRD_DIR" && cpio -idm --quiet)

# Resolve Tiny Core .tcz dependencies recursively and scatter-install them.
BASE_URL="https://www.tinycorelinux.net/17.x/x86_64/tcz"
QUEUE="$WORK/pkg-queue.txt"
DONE="$WORK/pkg-done.txt"
: > "$QUEUE"
: > "$DONE"
sed 's/[[:space:]]*#.*$//' "$ROOT/config/packages/base.list" | sed '/^[[:space:]]*$/d' > "$QUEUE"

has_done(){ grep -Fxq "$1" "$DONE" 2>/dev/null; }
has_queued(){ grep -Fxq "$1" "$QUEUE" 2>/dev/null; }

download_pkg(){
  local p="$1"
  [ -f "$PKGDIR/$p" ] && return 0
  curl -fL --retry 4 --retry-all-errors -o "$PKGDIR/$p" "$BASE_URL/$p"
}

index=1
while :; do
  line="$(sed -n "${index}p" "$QUEUE")"
  [ -z "$line" ] && break
  index=$((index+1))
  pkg="$line"
  has_done "$pkg" && continue

  info "Fetching extension $pkg"
  download_pkg "$pkg" || err "Missing Tiny Core extension: $pkg"

  if curl -fsSL "$BASE_URL/$pkg.dep" -o "$WORK/dep.tmp"; then
    while IFS= read -r dep || [ -n "$dep" ]; do
      dep="${dep%%#*}"
      dep="$(echo "$dep" | xargs || true)"
      [ -z "$dep" ] && continue
      has_done "$dep" || has_queued "$dep" || echo "$dep" >> "$QUEUE"
    done < "$WORK/dep.tmp"
  fi
  echo "$pkg" >> "$DONE"
done

COMPONENTS="$(paste -sd, "$DONE")"
printf '%s\n' "$COMPONENTS" > "$WORK/components.txt"

info "Installing resolved extensions into the remaster"
while IFS= read -r pkg || [ -n "$pkg" ]; do
  [ -z "$pkg" ] && continue
  unsquashfs -f -d "$INITRD_DIR" "$PKGDIR/$pkg" >/dev/null
done < "$DONE"

info "Applying NSK OS rootfs"
rsync -aHAX "$ROOT/rootfs/" "$INITRD_DIR/"

# Ensure home files are ready for the default Tiny Core user.
mkdir -p "$INITRD_DIR/home/tc"
chown -R 1001:50 "$INITRD_DIR/home/tc" 2>/dev/null || true
chmod +x "$INITRD_DIR"/usr/local/bin/* 2>/dev/null || true
chmod +x "$INITRD_DIR"/home/tc/.xsession 2>/dev/null || true
chmod +x "$INITRD_DIR"/home/tc/.X.d/*.sh 2>/dev/null || true

printf '%s\n' "$INITRD_NAME" > "$WORK/initrd-name.txt"
printf '%s\n' "$KERNEL_NAME" > "$WORK/kernel-name.txt"
ok "Root filesystem staging complete"
