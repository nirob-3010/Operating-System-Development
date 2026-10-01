#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK="$ROOT/.build"
INITRD_DIR="$WORK/custom-initrd"

info(){ echo "[INFO] $*"; }
ok(){ echo "[OK] $*"; }
err(){ echo "[ERROR] $*" >&2; exit 1; }

[ -d "$INITRD_DIR" ] || err "Run build-rootfs.sh first"

info "Applying NSK OS branding and boot-time settings"
mkdir -p "$INITRD_DIR/etc/sysconfig" "$INITRD_DIR/etc/profile.d" "$INITRD_DIR/opt"
printf '%s\n' jwm > "$INITRD_DIR/etc/sysconfig/desktop"
printf '%s\n' 'NSK OS' > "$INITRD_DIR/etc/hostname"

cat > "$INITRD_DIR/opt/bootlocal.sh" <<'BOOT'
#!/bin/sh
[ -x /usr/local/bin/nks-firstboot ] && /usr/local/bin/nks-firstboot &
exit 0
BOOT
chmod +x "$INITRD_DIR/opt/bootlocal.sh"

cat > "$INITRD_DIR/etc/profile.d/nsk-brand.sh" <<'SH'
export NSK_OS_NAME="NSK OS"
export NSK_OS_VERSION="1.0"
export EDITOR="vi"
export BROWSER=""
alias nsk-info='/usr/local/bin/nks-info'
alias nsk-settings='/usr/local/bin/nks-settings'
alias nsk-power='/usr/local/bin/nks-power'
SH
chmod +x "$INITRD_DIR/etc/profile.d/nsk-brand.sh"

cat > "$INITRD_DIR/etc/nsk-release" <<'REL'
NSK OS 1.0
Lightweight Desktop Operating System
Developer: NSK Nirob Sarkar
Base: Tiny Core Linux
REL

ok "Branding and boot settings applied"
