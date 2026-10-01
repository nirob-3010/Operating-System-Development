# NSK OS

**NSK OS 1.0** — a lightweight, offline-first desktop operating system built as a Tiny Core Linux remaster.

The design follows the supplied NSK OS UI screenshot: a bright light desktop with the supplied abstract wallpaper, top system panel, left-side desktop shortcuts, lightweight application windows, a right-side system-info feel, and a bottom centered dock. The reference is recreated as real desktop components rather than embedded as a screenshot.

## What this repository builds

- Bootable `NSK-OS.iso`
- x86_64 primary target (`TinyCorePure64 17.1`)
- BIOS + UEFI boot via GRUB when the GitHub runner has the required GRUB modules
- Tiny Core initramfs remaster with a JWM-based desktop
- ROX-Filer pinboard for real desktop icons and file browsing
- tint2 top panel with clock/task area and a small live status executor
- wbar bottom dock
- Xorg graphics stack plus lightweight desktop utilities
- Offline wallpaper, launcher, settings, monitor, power controls, file manager and terminal
- `SHA256SUMS.txt` and `build-info.txt`
- GitHub Actions build artifact

## Visual direction

The supplied wallpaper is installed as `/usr/local/share/backgrounds/nsk-wallpaper.png`. The UI intentionally uses pale blue/white surfaces, small rounded window decorations, blue accent controls, minimal motion, and a centered bottom dock.

## Repository layout

```text
NSK-OS/
├── .github/workflows/build.yml
├── assets/
│   ├── reference-ui.png
│   ├── wallpaper.webp
│   ├── wallpaper.png
│   └── icons/
├── config/
│   ├── boot/
│   ├── packages/base.list
│   └── startup/
├── rootfs/
│   ├── etc/
│   └── usr/
├── scripts/
│   ├── download-base.sh
│   ├── customize.sh
│   ├── configure-ui.sh
│   ├── build-rootfs.sh
│   ├── build-iso.sh
│   └── verify-iso.sh
├── ui/
└── README.md
```

## Local build (Ubuntu/Debian)

Install the required host tools, then run:

```bash
sudo apt-get update
sudo apt-get install -y \
  cpio gzip xz-utils squashfs-tools xorriso \
  grub-pc-bin grub-efi-amd64-bin grub2-common \
  qemu-system-x86 ovmf file rsync curl ca-certificates

chmod +x scripts/*.sh
./scripts/download-base.sh
./scripts/build-rootfs.sh
./scripts/customize.sh
./scripts/configure-ui.sh
./scripts/build-iso.sh
./scripts/verify-iso.sh
```

The scripts print `[INFO]`, `[OK]`, `[WARN]`, and `[ERROR]` statuses. The build exits non-zero when a critical step fails or the resulting ISO exceeds 300 MB.

## GitHub Actions

Push the repository and the workflow builds the ISO on Ubuntu, verifies the boot files and critical NSK OS assets, calculates SHA-256, and uploads:

- `NSK-OS.iso`
- `SHA256SUMS.txt`
- `build-info.txt`

The CI job also attempts a short QEMU boot smoke test. The smoke test is designed as a boot-path check, not a full UI integration test.

## Size policy

Hard ceiling: **300 MB**.

The current design avoids a browser and heavy desktop environment on purpose. The CI job reports:

```text
ISO SIZE: ...
RAM TARGET: 512 MB–1 GB
INSTALLED COMPONENTS: ...
```

and fails the build if the ISO is larger than the ceiling.

## Notes on Tiny Core remastering

The build keeps Tiny Core's kernel and boot payload intact and rebuilds the compressed initramfs with the custom root filesystem layered on top. This follows Tiny Core's documented remastering model. See the official Tiny Core remastering documentation and core book for details.

## License

Project-specific files are licensed under the repository `LICENSE`. Tiny Core Linux components remain under their original upstream licenses and notices.
