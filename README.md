# NSK OS v0.3 — Desktop Input & Window System

NSK OS is a from-scratch x86 operating-system project.

## v0.3
- GRUB Multiboot framebuffer
- 2D software graphics
- PS/2 mouse
- PS/2 keyboard input
- Basic event handling
- Multiple desktop windows
- Window focus
- Dragging
- Close/minimize controls
- Dock launcher
- File Manager window
- Virtual in-memory filesystem
- GitHub Actions ISO build

### Current filesystem limitation
The file manager is still backed by an in-memory virtual filesystem. It does not yet persist files to the ISO/HDD.

## GitHub build

Push the repository to GitHub, then:

**Actions → Build NSK OS → Run workflow**

Download the `NSK-OS-v0.3` artifact.

Test the resulting ISO with QEMU, VirtualBox, or Limbo.
