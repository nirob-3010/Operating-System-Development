# NSK OS
Debian (live-build) + custom NSK Desktop (Chromium kiosk UI + Python backend).

1. Push this repo to GitHub.
2. Actions -> "Build NSK OS ISO" -> Run workflow.
3. Download `NSK-OS-ISO` artifact -> `live-image-amd64.hybrid.iso`.
4. Test: `qemu-system-x86_64 -m 2048 -enable-kvm -cdrom live-image-amd64.hybrid.iso`

Login is automatic (user `nsk`, password `live`).
