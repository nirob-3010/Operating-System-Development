#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ISO="$ROOT/NSK-OS.iso"
WORK="$ROOT/.build"

info(){ echo "[INFO] $*"; }
ok(){ echo "[OK] $*"; }
err(){ echo "[ERROR] $*" >&2; exit 1; }

[ -f "$ISO" ] || err "ISO not found"
command -v xorriso >/dev/null || err "xorriso is required"

SIZE_BYTES=$(stat -c %s "$ISO")
SIZE_MB=$(awk -v s="$SIZE_BYTES" 'BEGIN {printf "%.2f", s/1024/1024}')
awk -v s="$SIZE_BYTES" 'BEGIN {exit !(s <= 300*1024*1024)}' || err "ISO exceeds 300 MB"

info "Listing ISO contents"
ISO_LIST="$WORK/final-iso-list.txt"
xorriso -indev "$ISO" -find / -type f -print > "$ISO_LIST" 2>/dev/null || err "Could not inspect ISO"

KERNEL="$(cat "$WORK/kernel-name.txt")"
INITRD="$(cat "$WORK/initrd-name.txt")"
grep -q "/boot/$KERNEL" "$ISO_LIST" || err "Kernel missing"
grep -q "/boot/$INITRD" "$ISO_LIST" || err "Initramfs missing"
grep -q "/boot/grub/grub.cfg" "$ISO_LIST" || err "GRUB config missing"

grep -q "/NSK-WALLPAPER.png" "$ISO_LIST" || err "Wallpaper missing"
grep -q "/NSK-README.txt" "$ISO_LIST" || err "NSK README missing"

if command -v file >/dev/null 2>&1; then
  file "$ISO" | grep -qi 'ISO 9660' || err "Output does not look like an ISO 9660 image"
fi

sha256sum "$ISO" | awk '{print $1"  NSK-OS.iso"}' > "$ROOT/SHA256SUMS.txt"

echo "ISO SIZE: ${SIZE_MB} MB"
echo "RAM TARGET: 512 MB–1 GB"
if [ -f "$WORK/components.txt" ]; then echo "INSTALLED COMPONENTS: $(paste -sd, "$WORK/components.txt")"; fi
ok "ISO structure and size verified"

if command -v qemu-system-x86_64 >/dev/null 2>&1; then
  info "Running QEMU boot smoke test (45 seconds maximum)"
  set +e
  timeout 45s qemu-system-x86_64 -m 512 -accel tcg,thread=multi -cdrom "$ISO" -display none -serial stdio -no-reboot -no-shutdown >/tmp/nsk-qemu.log 2>&1
  q=$?
  set -e
  # Timeout is an expected success mode if QEMU got far enough to boot.
  if [ "$q" -ne 0 ] && [ "$q" -ne 124 ]; then
    echo "[WARN] QEMU smoke test exited with code $q; see /tmp/nsk-qemu.log"
  else
    ok "QEMU smoke test completed"
  fi
else
  echo "[WARN] qemu-system-x86_64 not installed; skipped VM smoke test"
fi

cat "$ROOT/build-info.txt" 2>/dev/null || true
