#!/usr/bin/env python3
"""
NSK OS v0.3 - Phase 1 QEMU Smoke Test
Verifies kernel boots, displays banner, initializes GDT/IDT/PIC/PIT/PMM/Heap, and prints memory map.
Handles raw binary serial streams with resilient UTF-8 decoding (errors='replace').
"""

import os
import subprocess
import sys
import time

def run_test_with_cmd(cmd_desc, cmd):
    print(f"\n[TEST] Testing: {cmd_desc}")
    print(f"[TEST] Command: {' '.join(cmd)}")

    try:
        proc = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )

        time.sleep(3)
        proc.terminate()
        try:
            stdout_bytes, stderr_bytes = proc.communicate(timeout=4)
        except subprocess.TimeoutExpired:
            proc.kill()
            stdout_bytes, stderr_bytes = proc.communicate()

        # Safely decode raw binary serial bytes from QEMU UART/BIOS
        stdout = stdout_bytes.decode('utf-8', errors='replace') if stdout_bytes else ""
        stderr = stderr_bytes.decode('utf-8', errors='replace') if stderr_bytes else ""

        print("[TEST] Captured Serial Output:")
        print(stdout if stdout.strip() else "(none)")

        if stderr and stderr.strip():
            print("[TEST] QEMU Stderr:")
            print(stderr)

        required_strings = [
            "NSK OS booting",
            "MULTIBOOT2 MEMORY MAP",
            "[NSK GDT] Global Descriptor Table initialized",
            "[NSK IDT] Interrupt Descriptor Table loaded",
            "[NSK PIC] 8259 PIC remapped",
            "[NSK PIT] 8254 Timer configured at 100 Hz",
            "[NSK PMM] Memory Manager Initialized",
            "[NSK HEAP] Kernel heap initialized",
            "PHASE 1 CORE KERNEL INITIALIZATION COMPLETE"
        ]

        missing = [s for s in required_strings if s not in stdout]

        if not missing:
            print(f">>> [TEST PASSED] {cmd_desc} successfully verified! <<<\n")
            return True, stdout
        else:
            print(f"[TEST FAILED] Missing expected kernel strings: {missing}")
            return False, stdout

    except FileNotFoundError as e:
        print(f"[TEST NOTICE] QEMU binary not found: {e}")
        return False, ""
    except Exception as e:
        print(f"[TEST ERROR] {e}")
        return False, ""

def main():
    has_iso = os.path.isfile("nsk-os-0.3-x86_64.iso")

    if not has_iso:
        print("[TEST ERROR] nsk-os-0.3-x86_64.iso not found. Run 'make iso' first.")
        sys.exit(1)

    if has_iso:
        cmd_iso = [
            "qemu-system-x86_64",
            "-m", "256",
            "-cdrom", "nsk-os-0.3-x86_64.iso",
            "-serial", "stdio",
            "-display", "none",
            "-no-reboot"
        ]
        success, _ = run_test_with_cmd("QEMU x86-64 GRUB/Multiboot2 ISO Boot", cmd_iso)
        if success:
            sys.exit(0)

    print("\n[CRITICAL] Phase 1 QEMU Smoke Test failed verification.")
    sys.exit(1)

if __name__ == "__main__":
    main()
