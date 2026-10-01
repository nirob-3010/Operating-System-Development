#!/usr/bin/env python3
"""
NSK OS v0.3 - Phase 1 QEMU Smoke Test
Verifies kernel boots, displays banner, initializes GDT/IDT/PIC/PIT/PMM/Heap, and prints memory map.
Supports both direct kernel binary boot (-kernel) and bootable ISO (-cdrom).
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
            stderr=subprocess.PIPE,
            text=True
        )

        # Allow sufficient time for QEMU and kernel to boot and print logs
        time.sleep(3)
        proc.terminate()
        try:
            stdout, stderr = proc.communicate(timeout=4)
        except subprocess.TimeoutExpired:
            proc.kill()
            stdout, stderr = proc.communicate()

        print("[TEST] Captured Serial Output:")
        print(stdout if stdout else "(none)")

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
    has_kernel = os.path.isfile("build/kernel.bin")
    has_iso = os.path.isfile("nsk-os-0.3.iso")

    if not has_kernel and not has_iso:
        print("[TEST ERROR] Neither build/kernel.bin nor nsk-os-0.3.iso found. Run 'make' first.")
        sys.exit(1)

    # Test 1: Direct kernel boot (-kernel build/kernel.bin)
    if has_kernel:
        cmd_kernel = [
            "qemu-system-i386",
            "-m", "256",
            "-kernel", "build/kernel.bin",
            "-serial", "stdio",
            "-display", "none",
            "-no-reboot"
        ]
        success, _ = run_test_with_cmd("QEMU Direct Kernel Boot (-kernel)", cmd_kernel)
        if success:
            sys.exit(0)

    # Test 2: CDROM ISO boot (-cdrom nsk-os-0.3.iso)
    if has_iso:
        cmd_iso = [
            "qemu-system-i386",
            "-m", "256",
            "-cdrom", "nsk-os-0.3.iso",
            "-serial", "stdio",
            "-display", "none",
            "-no-reboot"
        ]
        success, _ = run_test_with_cmd("QEMU Bootable ISO Boot (-cdrom)", cmd_iso)
        if success:
            sys.exit(0)

    print("\n[CRITICAL] Phase 1 QEMU Smoke Test failed verification.")
    sys.exit(1)

if __name__ == "__main__":
    main()
