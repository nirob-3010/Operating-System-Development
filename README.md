# NSK OS v0.6

NSK OS is a from-scratch 32-bit x86 graphical operating-system project designed for BIOS/QEMU/Limbo.

## Desktop
- Light theme
- Windows 11 + macOS-inspired desktop layout
- User-supplied NSK wallpaper built into the OS
- Top menu/status bar
- Desktop shortcuts
- Centered dock
- File Manager window
- Terminal window
- Window close/minimize controls
- Window dragging
- PS/2 mouse and keyboard input

## Graphics
- GRUB Multiboot v1
- Linear framebuffer
- 16:9 wallpaper source (1024x576)
- RGB565 embedded wallpaper asset
- Software-rendered GUI

## Build
GitHub Actions installs `mtools` because `grub-mkrescue` uses `mformat`.

The generated artifact is:

`build/NSK-OS.iso`

## Limbo
Use an x86 BIOS machine, 2 CPU cores, 256 MB RAM, `std` VGA, and boot from the ISO/CDROM. The OS requests 1920x1080x32 first; if Limbo cannot expose Full HD, GRUB/Multiboot falls back to a supported framebuffer mode.
