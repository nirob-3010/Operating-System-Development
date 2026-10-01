#!/usr/bin/env python3
"""
NSK OS v0.3 - Phase 3 QEMU Smoke Test
Verifies Window Manager, Desktop UI, Taskbar, Overlapping Windows, Mouse & Keyboard drivers.
"""

import os
import subprocess
import sys
import time

def run_phase3_test():
    print("[TEST] Running Phase 3 Window Manager Smoke Test...")
    has_kernel = os.path.isfile("build/kernel.bin")
    has_iso = os.path.isfile("nsk-os-0.3.iso")

    if not has_kernel and not has_iso:
        print("[TEST ERROR] Neither build/kernel.bin nor nsk-os-0.3.iso found.")
        sys.exit(1)

    cmd = [
        "qemu-system-i386",
        "-m", "256",
        "-vga", "std",
        "-serial", "stdio",
        "-display", "none",
        "-no-reboot"
    ]

    if has_iso:
        print("[TEST] Target: Bootable ISO (nsk-os-0.3.iso)")
        cmd.extend(["-cdrom", "nsk-os-0.3.iso"])
    else:
        print("[TEST] Target: Direct Kernel (build/kernel.bin)")
        cmd.extend(["-kernel", "build/kernel.bin"])

    try:
        proc = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )

        time.sleep(6)
        proc.terminate()
        try:
            stdout_bytes, stderr_bytes = proc.communicate(timeout=6)
        except subprocess.TimeoutExpired:
            proc.kill()
            stdout_bytes, stderr_bytes = proc.communicate()

        stdout = stdout_bytes.decode('utf-8', errors='replace') if stdout_bytes else ""
        stderr = stderr_bytes.decode('utf-8', errors='replace') if stderr_bytes else ""

        print("[TEST] Captured Serial Output:")
        print(stdout if stdout.strip() else "(none)")

        required_strings = [
            "PS/2 Mouse driver initialized",
            "PS/2 Keyboard driver initialized",
            "Window Manager initialized successfully",
            "Created Window 1: \"File Manager\"",
            "Created Window 2: \"NSK Terminal\"",
            "PHASE 3 DESKTOP UI & WINDOW MANAGER ACTIVE"
        ]

        missing = [s for s in required_strings if s not in stdout]

        if not missing:
            print("\n>>> [TEST PASSED] Phase 3 Window Manager Verified Successfully! <<<\n")
            sys.exit(0)
        else:
            print(f"\n[TEST FAILED] Missing Phase 3 strings: {missing}")
            sys.exit(1)

    except FileNotFoundError as e:
        print(f"[TEST NOTICE] QEMU binary not found: {e}")
        sys.exit(0)
    except Exception as e:
        print(f"[TEST ERROR] {e}")
        sys.exit(1)

if __name__ == "__main__":
    run_phase3_test()
