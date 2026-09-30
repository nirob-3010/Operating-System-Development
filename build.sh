#!/bin/bash
set -e
cd "$(dirname "$0")"
lb clean --purge 2>/dev/null || true
lb config --distribution bookworm --architectures amd64 \
  --binary-images iso-hybrid --bootloaders "syslinux,grub-efi" \
  --debian-installer none --archive-areas "main contrib non-free-firmware" \
  --iso-volume NSK_OS --iso-application "NSK OS" \
  --bootappend-live "boot=live components quiet splash username=nsk hostname=nskos"
cp -a overlay/. config/
lb build
