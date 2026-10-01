# NSK OS

A small x86_64 desktop OS project designed for low-end PCs and VMs, with a custom framebuffer desktop shell.

## What this repository contains

- A custom framebuffer desktop shell (`nskdesktop`) written in C.
- A Buildroot-based Linux kernel + BusyBox userspace underneath.
- The supplied NSK wallpaper, preprocessed to RGB565 at 1024x768.
- File Manager, Terminal, Browser shell, Settings and dock interactions.
- GitHub Actions workflow that builds a bootable ISO.
- No GUI framework is required; the desktop is drawn directly to `/dev/fb0`.

> "Scratch" here means the NSK OS desktop/userspace layer is implemented in this repository rather than being a prebuilt desktop environment. The kernel and BusyBox are fetched and built by Buildroot so the ISO stays small and practical.

## Target

- x86_64 BIOS/VM
- 300 MB ISO target
- QEMU / VirtualBox / VMware / physical x86_64 PCs
- 512 MB RAM or more recommended; 256 MB may boot depending on VM configuration

## Build locally

The build is pinned to Buildroot 2026.08 and starts from its QEMU x86_64 baseline; the NSK desktop is then added as a br2-external package. Buildroot documents this external-tree workflow and the ISO9660/GRUB2 image flow.


```bash
./build.sh
```

The script downloads a pinned Buildroot release, applies the NSK package and kernel fragment, then produces:

`output/images/nsko-x86_64.iso`

## Run with QEMU

```bash
qemu-system-x86_64 -m 768 -cdrom output/images/nsko-x86_64.iso -boot d -vga std
```

If your VM exposes a different framebuffer, try a VESA-compatible display mode.

## GitHub Actions

Push this repository to GitHub and run **Build NSK OS ISO** from Actions. The ISO is uploaded as an artifact.

## Keyboard

- Type in Terminal normally.
- Enter: run command
- Backspace: delete
- F1: focus Home
- Terminal supports real `/bin/sh` commands such as `ls`, `pwd`, `uname`, `date`, `echo`, `clear`, `help`, `neofetch`, `reboot`, and `poweroff`.

## Size

The build script checks the resulting ISO and fails the build if it exceeds 300,000,000 bytes (~286 MiB).

## Important scope

This is a real bootable Linux-based OS image with a custom NSK desktop, not a fake HTML mockup. The kernel and BusyBox userspace are built from source by Buildroot. The desktop itself is written from scratch in C and draws directly to the Linux framebuffer. It is intentionally not a full Windows/macOS clone: the included Browser is a lightweight shell, while the Terminal exposes the real BusyBox/Linux command environment.
