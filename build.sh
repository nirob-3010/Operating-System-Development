#!/usr/bin/env bash
set -euo pipefail

BR_VERSION="${BR_VERSION:-2026.08}"
BR_TARBALL="buildroot-${BR_VERSION}.tar.xz"
BR_URL="https://buildroot.org/downloads/${BR_TARBALL}"
WORK="${PWD}/.build"
BR="${WORK}/buildroot-${BR_VERSION}"

mkdir -p "$WORK"
if [ ! -d "$BR" ]; then
  if [ ! -f "$WORK/$BR_TARBALL" ]; then
    curl -L --fail --retry 3 -o "$WORK/$BR_TARBALL" "$BR_URL"
  fi
  tar -xf "$WORK/$BR_TARBALL" -C "$WORK"
fi

cd "$BR"

# Start from Buildroot's QEMU x86_64 baseline.
make BR2_EXTERNAL="$(cd ../.. && pwd)" qemu_x86_64_defconfig

# Configure the lightweight NSK desktop and a bootable GRUB2 ISO.
cat > .nsk-fragment <<EOF
BR2_PACKAGE_NSKDESKTOP=y
BR2_TOOLCHAIN_BUILDROOT_WCHAR=y

# Live ISO: compressed initramfs keeps the root filesystem writable in RAM.
BR2_TARGET_ROOTFS_ISO9660=y
BR2_TARGET_ROOTFS_ISO9660_GRUB2=y
BR2_TARGET_ROOTFS_ISO9660_INITRD=y
BR2_TARGET_ROOTFS_CPIO=y
BR2_TARGET_ROOTFS_CPIO_GZIP=y
# BR2_TARGET_ROOTFS_TAR is not set

# GRUB2 legacy BIOS boot for broad VM/PC compatibility.
BR2_TARGET_GRUB2=y
BR2_TARGET_GRUB2_I386_PC=y
BR2_TARGET_GRUB2_BOOT_PARTITION="cd"
BR2_TARGET_GRUB2_BUILTIN_MODULES_PC="boot linux iso9660 part_msdos part_gpt normal biosdisk"

# Keep the baseline's ext2 image out of the final build products.
# BR2_TARGET_ROOTFS_EXT2 is not set
# BR2_PACKAGE_HOST_QEMU is not set
# BR2_PACKAGE_HOST_QEMU_SYSTEM_MODE is not set

BR2_ROOTFS_POST_BUILD_SCRIPT=""
BR2_ROOTFS_POST_IMAGE_SCRIPT=""
BR2_ROOTFS_POST_SCRIPT_ARGS=""
BR2_TARGET_GENERIC_HOSTNAME="nskos"
BR2_TARGET_GENERIC_ISSUE="Welcome to NSK OS"
BR2_LINUX_KERNEL_CONFIG_FRAGMENT_FILES="$(cd ../.. && pwd)/board/nsko/linux.fragment"
EOF

# Merge the fragment with the QEMU baseline and external package tree.
cat .nsk-fragment >> .config
make BR2_EXTERNAL="$(cd ../.. && pwd)" olddefconfig
make BR2_EXTERNAL="$(cd ../.. && pwd)" -j"$(nproc)"

ISO="$PWD/output/images/rootfs.iso9660"
if [ ! -f "$ISO" ]; then
  echo "ISO was not produced."
  exit 1
fi

mkdir -p "$(cd ../.. && pwd)/dist"
cp "$ISO" "$(cd ../.. && pwd)/dist/nsko-x86_64.iso"

BYTES=$(stat -c '%s' "$ISO")
MAX=300000000
echo "ISO size: $BYTES bytes"
if [ "$BYTES" -gt "$MAX" ]; then
  echo "ERROR: ISO exceeds 300 MiB."
  exit 2
fi

echo "Built: $(cd ../.. && pwd)/dist/nsko-x86_64.iso"
