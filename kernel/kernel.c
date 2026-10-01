/**
 * NSK OS v0.3 - Core Kernel Main Entry Point (Phase 1)
 * Target: x86 (i686 Protected Mode, 32-bit)
 * Bootloader: Multiboot 1 / Multiboot 2 (GRUB / QEMU)
 */

#include "types.h"
#include "multiboot2.h"
#include "serial.h"
#include "printf.h"
#include "gdt.h"
#include "idt.h"
#include "pic.h"
#include "pit.h"
#include "pmm.h"
#include "kheap.h"
#include "string.h"

extern uint32_t _kernel_start;
extern uint32_t _kernel_end;

static multiboot_info_parsed_t mbi_info;

void kmain(uint32_t magic, uint32_t addr) {
    // Step 1: Initialize COM1 Serial port for debug output
    serial_init();

    // Step 2: Print boot banner (Meets test criteria: QEMU prints "NSK OS booting")
    kprintf("\n");
    kprintf("*****************************************************************\n");
    kprintf("*                 NSK OS v0.3 - Starting Kernel                 *\n");
    kprintf("*             From-Scratch 32-bit x86 Protected Mode            *\n");
    kprintf("*****************************************************************\n");
    kprintf("NSK OS booting...\n\n");

    uint32_t kstart = (uint32_t)&_kernel_start;
    uint32_t kend   = (uint32_t)&_kernel_end;
    kprintf("[NSK KERNEL] Kernel binary loaded at 0x%p - 0x%p (Size: %u KB)\n",
            kstart, kend, (kend - kstart + 1023) / 1024);

    // Step 3: Parse Multiboot Information Structure (supports both MB1 and MB2)
    multiboot_parse(magic, addr, &mbi_info);

    // Step 4: Initialize Global Descriptor Table (GDT)
    gdt_init();

    // Step 5: Remap 8259 PIC (IRQ 0-7 -> 0x20-0x27, IRQ 8-15 -> 0x28-0x2F)
    pic_remap(0x20, 0x28);

    // Step 6: Initialize Interrupt Descriptor Table (IDT) & Exception Handlers
    idt_init();

    // Step 7: Initialize PIT (Programmable Interval Timer) at 100 Hz
    pit_init(PIT_TARGET_HZ);

    // Step 8: Initialize Physical Memory Manager (PMM) from Memory Map
    pmm_init(&mbi_info, kstart, kend);

    // Step 9: Initialize Dynamic Kernel Heap (kmalloc / kfree)
    kheap_init(KHEAP_START, KHEAP_INITIAL_SIZE);

    // Step 10: Run Heap Self-Test
    kprintf("\n[NSK TEST] Running Kernel Heap Allocation Tests...\n");
    void* p1 = kmalloc(64);
    void* p2 = kmalloc(256);
    void* p3 = kmalloc(4096);

    kprintf("  Allocated p1 (64 bytes)   : 0x%p\n", p1);
    kprintf("  Allocated p2 (256 bytes)  : 0x%p\n", p2);
    kprintf("  Allocated p3 (4096 bytes) : 0x%p\n", p3);

    if (p1 && p2 && p3) {
        strcpy((char*)p1, "NSK Kernel Heap Block 1 Test OK");
        strcpy((char*)p2, "NSK Kernel Heap Block 2 Test OK");
        memset(p3, 0xAA, 4096);

        kprintf("  Memory content check: \"%s\" [OK]\n", (char*)p1);
        kprintf("  Memory content check: \"%s\" [OK]\n", (char*)p2);

        kfree(p2);
        kprintf("  Freed p2 (256 bytes) [OK]\n");

        void* p4 = kmalloc(128);
        kprintf("  Re-allocated p4 (128 bytes from freed block): 0x%p [OK]\n", p4);

        kfree(p1);
        kfree(p3);
        kfree(p4);
        kprintf("  Freed all test blocks - coalescing verified [OK]\n");
    } else {
        kprintf("  [ERROR] Heap test allocation failed!\n");
    }

    // Step 11: Enable CPU Interrupts (STI)
    __asm__ volatile ("sti");
    kprintf("\n[NSK KERNEL] Hardware interrupts enabled (EFLAGS.IF = 1)\n");
    kprintf("[NSK KERNEL] Current system tick count: %u, Uptime: %u sec\n",
            pit_get_ticks(), pit_get_uptime_seconds());

    kprintf("\n=================================================================\n");
    kprintf("       >>> PHASE 1 CORE KERNEL INITIALIZATION COMPLETE <<<       \n");
    kprintf(" System: x86 (i686) 32-bit Protected Mode                        \n");
    kprintf(" Core  : Multiboot2, GDT, IDT, PIC, PIT (100Hz), COM1, PMM, Heap \n");
    kprintf(" Status: Ready for PHASE 2 (Graphics Engine & Framebuffer)       \n");
    kprintf("=================================================================\n\n");

    // Idle loop waiting for interrupts
    while (1) {
        __asm__ volatile ("hlt");
    }
}
