# NSK OS v0.3

NSK OS is a compact Debian 12 (Bookworm) live Linux desktop built with
`live-build`, XFCE 4.18, picom, Plank and a custom lightweight Python/WebKit
browser. The desktop is named **NSK Desktop**.

The visual target is the supplied NSK OS mockup: light Fluent surfaces,
blue/lavender wallpaper, macOS-style traffic lights on the left, compact
top panel, Conky system card and centered Plank dock.

## Features

- Debian 12 Bookworm, amd64
- Hybrid BIOS + UEFI live ISO
- XFCE 4.18 / NSK Desktop
- LightDM autologin user `nsk`
- Hostname `nskos`
- 1024x768-oriented layout
- Supplied wallpaper installed as `/usr/share/backgrounds/nsk-wallpaper.jpg`
- Inter UI font, JetBrains Mono terminal font, Noto Sans Bengali
- Custom NSK-Fluent SVG icons
- Custom XFWM traffic-light buttons
- picom transparency, shadows and rounded corners
- Plank dock
- Conky CPU/RAM/Disk card
- Thunar, Ristretto, Audacious and XFCE Settings
- Custom `NSK Browser` using Python 3 + GTK3 + WebKit2GTK
- Simple host-list ad blocking, tabs, private tabs, bookmarks, history,
  downloads, dark mode, desktop-site toggle and HTML5 fullscreen
- Aggressive live-image cleanup
- Default ISO build has a hard 500 MiB size gate in CI

## Repository

```text
auto/
config/
scripts/
screenshots/
.github/workflows/
README.md
CHECKLIST.md
```

## GitHub Actions build

Push this repository to GitHub and open **Actions → Build NSK OS**.

The workflow runs on `ubuntu-latest`, installs live-build/debootstrap/xorriso/
squashfs tooling, frees runner disk space, builds the ISO, calculates SHA-256,
prints its size and fails the normal build if it exceeds 500 MiB.

A tag such as `v0.3` additionally publishes the generated ISO and checksum as
GitHub Release assets.

### Optional installer build

Run the workflow manually and set:

```text
with_installer = true
```

This creates a second, larger ISO named:

```text
nsk-os-0.3-amd64-installer.iso
```

The installer variant adds Calamares. The 500 MiB gate applies only to the
default live-only image.

## Local build

Requirements:

- Debian/Ubuntu build host
- sudo access
- internet connection
- at least 10 GiB free working space

Commands:

```bash
sudo apt-get update
sudo apt-get install -y live-build debootstrap xorriso squashfs-tools \
  grub-pc-bin grub-efi-amd64-bin syslinux isolinux
git clone <your-repository-url> nsk-os
cd nsk-os
./auto/config
sudo lb build
```

Or use the helper:

```bash
WITH_INSTALLER=false ./scripts/build.sh
```

For the installer:

```bash
WITH_INSTALLER=true ./scripts/build.sh
```

The build hooks download the three requested UI fonts during the chroot stage,
so a network connection is required.

## Test in QEMU

```bash
qemu-system-x86_64 \
  -m 2048 \
  -smp 2 \
  -cdrom nsk-os-0.3-amd64.iso \
  -boot d \
  -display gtk
```

For a BIOS/UEFI-capable VM such as VirtualBox, create an x86_64 Linux VM,
attach the ISO as the optical disk, enable EFI when testing the UEFI path, and
use 2 GiB RAM / 2 virtual CPUs for a comfortable visual test.

## Development notes

The build deliberately does not ship Firefox or Chromium. The browser is a
single Python source file installed as `/usr/local/bin/nsk-browser`.

The default account is:

```text
user: nsk
password: nsk
```

This is a live-session convenience account. Do not reuse this password on an
installed or persistent system.

## Debian attribution

NSK OS is based on Debian GNU/Linux 12 (Bookworm). Debian trademarks and
copyrights remain with their respective holders. Debian components are
redistributed under their applicable licenses.

XFCE, LightDM, Plank, picom, Conky, WebKitGTK, GStreamer, Ristretto,
Audacious and the other included projects retain their upstream licenses.

The Inter, JetBrains Mono and Noto Sans Bengali fonts are distributed under
their respective open-font licenses.

NSK OS-specific configuration, scripts and artwork in this repository are
provided under the MIT License unless a file states otherwise.

## Size caveat

The repository contains an explicit CI size gate, but an ISO size cannot be
truthfully guaranteed before the actual Debian mirror/package set is built.
Package revisions, compression ratios and dependency metadata can change.
The workflow therefore measures the resulting ISO and fails the default build
when it is above 500 MiB.

## Visual fidelity caveat

The mockup is a raster reference. GTK/XFWM/picom rendering varies with the
graphics driver, display scale, font rasterizer and compositor. This source
uses custom CSS, XFWM assets, SVG icons, Conky geometry and the supplied
wallpaper to reproduce the layout closely, but it cannot mathematically
guarantee identical pixels on every GPU/VM.
