# NSK OS targeted update

This patch keeps the existing NSK OS kernel, Phase 3 renderer, React desktop and asset set. It does not replace the OS architecture.

## Fixed

- File Manager and NSK Terminal are registered at boot but start closed, so the desktop is clean.
- Dock can reopen those registered windows.
- Kernel window manager now supports drag, edge resize, corner resize, minimize, close, maximize/restore, focus and z-order.
- Closing a focused window transfers focus to the next visible window.
- Maximized windows respect the top menu bar and Dock area.
- Frontend File Manager and Terminal use the same move/resize/maximize/minimize/close model.
- Dock running state is separate from visibility in the React desktop, so minimizing keeps the running indicator.
- Frontend menu bar uses the focused application name and a live clock.
- Folder cells use the existing `assets/dock_icons/file.jpeg` artwork without recolouring.
- The web desktop File Manager now uses a real Node filesystem backend rather than hard-coded demo directory data.
- First run creates the requested factory folders under the configured NSK user filesystem root.
- Filesystem listing, navigation, create folder/file, rename, copy, cut/move, paste, delete, refresh and raw file opening are backed by actual filesystem operations.
- Paths are constrained to the configured user root to prevent path traversal.

## Important architecture boundary

The uploaded project contains a bare-metal i686 kernel, but it does not contain an ATA/AHCI disk driver or a filesystem implementation. Therefore a genuinely booted ISO cannot yet expose a POSIX-like real filesystem. The real filesystem integration in this patch applies to the existing React/Node desktop environment (`server.js`), where Node provides actual host filesystem I/O.

Adding a real filesystem to the bare-metal kernel would require a new storage driver, block-device layer, filesystem implementation, buffering/error handling and persistence path. That would be a new subsystem rather than a targeted UI/window-manager modification, so it is deliberately not faked or claimed as complete.
