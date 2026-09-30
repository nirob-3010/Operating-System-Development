# NSK OS v0.4

NSK OS is a from-scratch 32-bit x86 graphical operating-system project.

## Current features
- GRUB Multiboot v1
- Explicit linear framebuffer request
- 1024x768x32 preferred graphics mode
- 2D software framebuffer renderer
- PS/2 mouse
- PS/2 keyboard
- macOS-inspired menu bar and dock
- Multiple windows
- Dragging
- Close/minimize controls
- Basic File Manager UI
- Basic Terminal UI
- GitHub Actions ISO build

## Build
GitHub Actions installs `mtools` because `grub-mkrescue` requires `mformat`.

The generated artifact is:

`build/NSK-OS.iso`

Test it in Limbo/QEMU/VirtualBox using a 32-bit x86 BIOS machine.
