#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK="$ROOT/.build"
ISO_ROOT="$WORK/iso-root"
OUT="$ROOT/NSK-OS.iso"
KERNEL="$(cat "$WORK/kernel-name.txt")"
INITRD="$(cat "$WORK/initrd-name.txt")"

info(){ echo "[INFO] $*"; }
ok(){ echo "[OK] $*"; }
err(){ echo "[ERROR] $*" >&2; exit 1; }

[ -d "$ISO_ROOT/boot" ] || err "ISO root is missing"
[ -f "$ISO_ROOT/boot/$KERNEL" ] || err "Kernel missing from ISO root"
[ -f "$ISO_ROOT/boot/$INITRD" ] || err "Initramfs missing from ISO root"

[ -d "$WORK/custom-initrd" ] || err "Custom initrd staging directory is missing"

info "Repacking customized Tiny Core initramfs"
rm -f "$ISO_ROOT/boot/$INITRD"
(cd "$WORK/custom-initrd" && find . -print0 | cpio --null -o -H newc 2>/dev/null | gzip -9 > "$ISO_ROOT/boot/$INITRD")
mkdir -p "$ISO_ROOT/boot/grub"
sed -e "s/__KERNEL__/$KERNEL/g" -e "s/__INITRD__/$INITRD/g" \
  "$ROOT/config/boot/grub.cfg.in" > "$ISO_ROOT/boot/grub/grub.cfg"

# Optional branding files visible on the ISO filesystem.
cp "$ROOT/assets/wallpaper.png" "$ISO_ROOT/NSK-WALLPAPER.png"
cp "$ROOT/README.md" "$ISO_ROOT/NSK-README.txt"

rm -f "$OUT"

if command -v grub-mkrescue >/dev/null 2>&1; then
  info "Creating BIOS + UEFI bootable ISO with GRUB2"
  grub-mkrescue -o "$OUT" "$ISO_ROOT" >/tmp/nsk-grub-mkrescue.log 2>&1 || {
    cat /tmp/nsk-grub-mkrescue.log >&2
    err "grub-mkrescue failed"
  }
else
  err "grub-mkrescue is required for the CI build"
fi

SIZE_BYTES=$(stat -c %s "$OUT")
SIZE_MB=$(awk -v s="$SIZE_BYTES" 'BEGIN {printf "%.2f", s/1024/1024}')
COMPONENTS="$(paste -sd, "$WORK/components.txt" 2>/dev/null || echo "Tiny Core base + NSK rootfs")"

if awk -v s="$SIZE_BYTES" 'BEGIN {exit !(s > 300*1024*1024)}'; then
  err "ISO exceeds 300 MB: ${SIZE_MB} MB"
fi

printf 'OS: NSK OS\nVersion: 1.0\nBase: Tiny Core Linux\nArchitecture: x86_64\nISO Size: %s MB\nBuild Date: %s\n' \
  "$SIZE_MB" "$(date -u +%F)" > "$ROOT/build-info.txt"
cat > "$ROOT/SHA256SUMS.txt" <<EOF2
$(sha256sum "$OUT" | awk '{print $1"  NSK-OS.iso"}')
EOF2

cat "$ROOT/build-info.txt"
echo "ISO SIZE: ${SIZE_MB} MB"
echo "RAM TARGET: 512 MB–1 GB"
echo "INSTALLED COMPONENTS: $COMPONENTS"
ok "Bootable ISO created: $OUT"
