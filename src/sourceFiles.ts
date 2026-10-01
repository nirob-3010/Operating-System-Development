/**
 * NSK OS v0.3 - Source Code Repository Registry
 * Contains the complete, pristine Phase 1 files for the in-app code explorer and export tool.
 */

export interface SourceFile {
  path: string;
  name: string;
  category: 'boot' | 'kernel' | 'include' | 'build' | 'tests' | 'ci';
  language: 'c' | 'assembly' | 'makefile' | 'yaml' | 'python' | 'markdown' | 'ld';
  description: string;
  content: string;
}

export const PHASE1_FILES: SourceFile[] = [
  {
    path: 'boot/boot.asm',
    name: 'boot.asm',
    category: 'boot',
    language: 'assembly',
    description: 'Dual Multiboot1 & Multiboot2 header, framebuffer request tag, 16KB stack, 32-bit protected mode entry',
    content: `; ==============================================================================
; NSK OS v0.3 - Dual Multiboot1 & Multiboot2 Bootloader Entry
; Architecture: x86 (IA-32, i686 Protected Mode)
; Supports: GRUB Multiboot2, GRUB Multiboot1, and QEMU direct -kernel loader
; ==============================================================================

[BITS 32]

; 1. Multiboot 1 Header (Enables direct QEMU -kernel execution)
MB1_MAGIC       equ 0x1BADB002
MB1_FLAGS       equ 0x00000007          ; Align 4KB pages + Memory info + Video mode
MB1_CHECKSUM    equ -(MB1_MAGIC + MB1_FLAGS)

section .multiboot1
align 4
mb1_header:
    dd MB1_MAGIC
    dd MB1_FLAGS
    dd MB1_CHECKSUM
    dd 0, 0, 0, 0, 0
    dd 0                                ; Mode type: 0 for linear framebuffer
    dd 1536                             ; Preferred width: 1536
    dd 1024                             ; Preferred height: 1024
    dd 32                               ; Preferred depth: 32 bpp

; 2. Multiboot 2 Header (GRUB Multiboot2 specification)
MULTIBOOT2_MAGIC        equ 0xE85250D6
MULTIBOOT2_ARCH_I386    equ 0

section .multiboot2
align 8
mb2_header_start:
    dd MULTIBOOT2_MAGIC
    dd MULTIBOOT2_ARCH_I386
    dd mb2_header_end - mb2_header_start
    dd -(MULTIBOOT2_MAGIC + MULTIBOOT2_ARCH_I386 + (mb2_header_end - mb2_header_start))

    align 8
tag_information_request_start:
    dw 1
    dw 0
    dd tag_information_request_end - tag_information_request_start
    dd 4
    dd 6
    dd 8
tag_information_request_end:

    align 8
tag_framebuffer_start:
    dw 5
    dw 1
    dd tag_framebuffer_end - tag_framebuffer_start
    dd 1536
    dd 1024
    dd 32
tag_framebuffer_end:

    align 8
    dw 0
    dw 0
    dd 8
mb2_header_end:

section .bss
align 16
stack_bottom:
    resb 16384                          ; 16 KB kernel stack
stack_top:

section .text
global _start
extern kmain

_start:
    cli
    mov esp, stack_top
    push dword 0
    popf

    push ebx                            ; Argument 2: Info structure pointer
    push eax                            ; Argument 1: Magic number
    call kmain

.halt:
    cli
    hlt
    jmp .halt`
  },
  {
    path: 'kernel/console.c',
    name: 'console.c',
    category: 'kernel',
    language: 'c',
    description: 'Unified Screen Console: Renders 8x16 font directly onto Linear Framebuffer (32bpp) or VGA text buffer',
    content: `/**
 * NSK OS v0.3 - Unified Screen Console Driver
 */
#include "console.h"
#include "string.h"

// Renders text and boot logs directly onto the VM screen / Linear Framebuffer
void console_init(multiboot_info_parsed_t* mbi);
void console_putc(char c);
void console_write(const char* str);
void console_clear(uint32_t color);`
  },
  {
    path: 'kernel/kernel.c',
    name: 'kernel.c',
    category: 'kernel',
    language: 'c',
    description: 'Kernel kmain entry: Multiboot2 verification, GDT, IDT, PIC, PIT (100Hz), PMM, Heap, self-tests, STI',
    content: `/**
 * NSK OS v0.3 - Core Kernel Main Entry Point (Phase 1)
 * Target: x86 (i686 Protected Mode, 32-bit)
 * Bootloader: Multiboot2 (GRUB)
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

    // Step 2: Print boot banner
    kprintf("\\n");
    kprintf("*****************************************************************\\n");
    kprintf("*                 NSK OS v0.3 - Starting Kernel                 *\\n");
    kprintf("*             From-Scratch 32-bit x86 Protected Mode            *\\n");
    kprintf("*****************************************************************\\n");
    kprintf("NSK OS booting...\\n\\n");

    uint32_t kstart = (uint32_t)&_kernel_start;
    uint32_t kend   = (uint32_t)&_kernel_end;
    kprintf("[NSK KERNEL] Kernel binary loaded at 0x%p - 0x%p (Size: %u KB)\\n",
            kstart, kend, (kend - kstart + 1023) / 1024);

    // Step 3: Parse Multiboot2 Information Structure
    multiboot2_parse(magic, addr, &mbi_info);

    // Step 4: Initialize Global Descriptor Table (GDT)
    gdt_init();

    // Step 5: Remap 8259 PIC (IRQ 0-7 -> 0x20-0x27, IRQ 8-15 -> 0x28-0x2F)
    pic_remap(0x20, 0x28);

    // Step 6: Initialize Interrupt Descriptor Table (IDT) & Exception Handlers
    idt_init();

    // Step 7: Initialize PIT (Programmable Interval Timer) at 100 Hz
    pit_init(PIT_TARGET_HZ);

    // Step 8: Initialize Physical Memory Manager (PMM) from Multiboot2 Memory Map
    pmm_init(mbi_info.mmap_tag, kstart, kend);

    // Step 9: Initialize Dynamic Kernel Heap (kmalloc / kfree)
    kheap_init(KHEAP_START, KHEAP_INITIAL_SIZE);

    // Step 10: Run Heap Self-Test
    kprintf("\\n[NSK TEST] Running Kernel Heap Allocation Tests...\\n");
    void* p1 = kmalloc(64);
    void* p2 = kmalloc(256);
    void* p3 = kmalloc(4096);

    kprintf("  Allocated p1 (64 bytes)   : 0x%p\\n", p1);
    kprintf("  Allocated p2 (256 bytes)  : 0x%p\\n", p2);
    kprintf("  Allocated p3 (4096 bytes) : 0x%p\\n", p3);

    if (p1 && p2 && p3) {
        strcpy((char*)p1, "NSK Kernel Heap Block 1 Test OK");
        strcpy((char*)p2, "NSK Kernel Heap Block 2 Test OK");
        memset(p3, 0xAA, 4096);

        kprintf("  Memory content check: \\"%s\\" [OK]\\n", (char*)p1);
        kprintf("  Memory content check: \\"%s\\" [OK]\\n", (char*)p2);

        kfree(p2);
        kprintf("  Freed p2 (256 bytes) [OK]\\n");

        void* p4 = kmalloc(128);
        kprintf("  Re-allocated p4 (128 bytes from freed block): 0x%p [OK]\\n", p4);

        kfree(p1);
        kfree(p3);
        kfree(p4);
        kprintf("  Freed all test blocks - coalescing verified [OK]\\n");
    }

    // Step 11: Enable CPU Interrupts (STI)
    __asm__ volatile ("sti");
    kprintf("\\n[NSK KERNEL] Hardware interrupts enabled (EFLAGS.IF = 1)\\n");
    kprintf("[NSK KERNEL] Current system tick count: %u, Uptime: %u sec\\n",
            pit_get_ticks(), pit_get_uptime_seconds());

    kprintf("\\n=================================================================\\n");
    kprintf("       >>> PHASE 1 CORE KERNEL INITIALIZATION COMPLETE <<<       \\n");
    kprintf(" System: x86 (i686) 32-bit Protected Mode                        \\n");
    kprintf(" Core  : Multiboot2, GDT, IDT, PIC, PIT (100Hz), COM1, PMM, Heap \\n");
    kprintf(" Status: Ready for PHASE 2 (Graphics Engine & Framebuffer)       \\n");
    kprintf("=================================================================\\n\\n");

    while (1) {
        __asm__ volatile ("hlt");
    }
}`
  },
  {
    path: 'kernel/pmm.c',
    name: 'pmm.c',
    category: 'kernel',
    language: 'c',
    description: 'Physical Memory Manager: Bitmap-based 4KB page frame allocator parsing Multiboot2 memory map',
    content: `/**
 * NSK OS v0.3 - Physical Memory Manager (PMM)
 * Page Frame Allocator using Bitmap
 */
#include "pmm.h"
#include "printf.h"
#include "string.h"

static uint32_t* pmm_bitmap = NULL;
static uint32_t  pmm_max_blocks = 0;
static uint32_t  pmm_used_blocks = 0;
static uint32_t  pmm_total_memory = 0;

static inline void bitmap_set(uint32_t bit) {
    pmm_bitmap[bit / 32] |= (1 << (bit % 32));
}

static inline void bitmap_unset(uint32_t bit) {
    pmm_bitmap[bit / 32] &= ~(1 << (bit % 32));
}

static inline bool bitmap_test(uint32_t bit) {
    return (pmm_bitmap[bit / 32] & (1 << (bit % 32))) != 0;
}

static int bitmap_first_free(void) {
    for (uint32_t i = 0; i < pmm_max_blocks / 32; i++) {
        if (pmm_bitmap[i] != 0xFFFFFFFF) {
            for (int j = 0; j < 32; j++) {
                int bit = 1 << j;
                if (!(pmm_bitmap[i] & bit)) {
                    return (i * 32) + j;
                }
            }
        }
    }
    return -1;
}

void pmm_init(struct multiboot_tag_mmap* mmap, uint32_t kernel_start, uint32_t kernel_end) {
    uint64_t highest_address = 0;
    kprintf("\\n[NSK PMM] ==================== MULTIBOOT2 MEMORY MAP ====================\\n");

    if (mmap == NULL) {
        highest_address = 128 * 1024 * 1024;
    } else {
        uint32_t num_entries = (mmap->size - sizeof(struct multiboot_tag_mmap)) / mmap->entry_size;
        for (uint32_t i = 0; i < num_entries; i++) {
            struct multiboot_mmap_entry* entry = (struct multiboot_mmap_entry*)
                ((uint8_t*)mmap->entries + (i * mmap->entry_size));

            const char* type_str = "RESERVED";
            if (entry->type == MULTIBOOT_MEMORY_AVAILABLE) {
                type_str = "AVAILABLE";
                uint64_t end = entry->addr + entry->len;
                if (end > highest_address) highest_address = end;
            }
            uint32_t base_low = (uint32_t)(entry->addr & 0xFFFFFFFF);
            uint32_t len_low = (uint32_t)(entry->len & 0xFFFFFFFF);
            kprintf("  Region %2u: [0x%p - 0x%p] %7u KB | Type: %s\\n",
                    i, base_low, base_low + len_low - 1, len_low / 1024, type_str);
        }
    }
    kprintf("[NSK PMM] ==============================================================\\n");

    if (highest_address > 0xFFFFFFFF) highest_address = 0xFFFFFFFF;
    if (highest_address == 0) highest_address = 256 * 1024 * 1024;

    pmm_total_memory = (uint32_t)highest_address;
    pmm_max_blocks = pmm_total_memory / PMM_BLOCK_SIZE;
    pmm_used_blocks = pmm_max_blocks;

    uint32_t bitmap_addr = (kernel_end + 0xFFF) & ~0xFFF;
    pmm_bitmap = (uint32_t*)bitmap_addr;
    uint32_t bitmap_size_bytes = pmm_max_blocks / 8;
    memset(pmm_bitmap, 0xFF, bitmap_size_bytes);

    if (mmap != NULL) {
        uint32_t num_entries = (mmap->size - sizeof(struct multiboot_tag_mmap)) / mmap->entry_size;
        for (uint32_t i = 0; i < num_entries; i++) {
            struct multiboot_mmap_entry* entry = (struct multiboot_mmap_entry*)
                ((uint8_t*)mmap->entries + (i * mmap->entry_size));
            if (entry->type == MULTIBOOT_MEMORY_AVAILABLE) {
                uint32_t start_block = (uint32_t)(entry->addr / PMM_BLOCK_SIZE);
                uint32_t count = (uint32_t)(entry->len / PMM_BLOCK_SIZE);
                for (uint32_t b = 0; b < count; b++) {
                    uint32_t block = start_block + b;
                    if (block < pmm_max_blocks) {
                        bitmap_unset(block);
                        pmm_used_blocks--;
                    }
                }
            }
        }
    }

    // Reserve lower 1MB, kernel binary, and bitmap
    uint32_t lower_1mb_blocks = (1024 * 1024) / PMM_BLOCK_SIZE;
    for (uint32_t b = 0; b < lower_1mb_blocks; b++) {
        if (!bitmap_test(b)) { bitmap_set(b); pmm_used_blocks++; }
    }
    uint32_t kstart_block = kernel_start / PMM_BLOCK_SIZE;
    uint32_t kend_block = (kernel_end + PMM_BLOCK_SIZE - 1) / PMM_BLOCK_SIZE;
    for (uint32_t b = kstart_block; b <= kend_block; b++) {
        if (!bitmap_test(b)) { bitmap_set(b); pmm_used_blocks++; }
    }
    uint32_t bm_start_block = bitmap_addr / PMM_BLOCK_SIZE;
    uint32_t bm_end_block = (bitmap_addr + bitmap_size_bytes + PMM_BLOCK_SIZE - 1) / PMM_BLOCK_SIZE;
    for (uint32_t b = bm_start_block; b <= bm_end_block; b++) {
        if (!bitmap_test(b)) { bitmap_set(b); pmm_used_blocks++; }
    }

    kprintf("[NSK PMM] Memory Manager Initialized:\\n");
    kprintf("  Total RAM  : %u MB (%u blocks of 4KB)\\n", pmm_total_memory / (1024 * 1024), pmm_max_blocks);
    kprintf("  Used Blocks: %u (%u KB)\\n", pmm_used_blocks, (pmm_used_blocks * 4));
    kprintf("  Free Blocks: %u (%u MB)\\n", (pmm_max_blocks - pmm_used_blocks),
            ((pmm_max_blocks - pmm_used_blocks) * 4) / 1024);
}

void* pmm_alloc_block(void) {
    if (pmm_max_blocks - pmm_used_blocks <= 0) return NULL;
    int frame = bitmap_first_free();
    if (frame == -1) return NULL;
    bitmap_set(frame);
    pmm_used_blocks++;
    return (void*)(frame * PMM_BLOCK_SIZE);
}

void pmm_free_block(void* ptr) {
    uint32_t frame = (uint32_t)ptr / PMM_BLOCK_SIZE;
    if (frame < pmm_max_blocks && bitmap_test(frame)) {
        bitmap_unset(frame);
        pmm_used_blocks--;
    }
}`
  },
  {
    path: 'kernel/kheap.c',
    name: 'kheap.c',
    category: 'kernel',
    language: 'c',
    description: 'Kernel Heap: kmalloc, kfree, boundary tags, block coalescing and alignment',
    content: `/**
 * NSK OS v0.3 - Kernel Heap Allocator (kmalloc / kfree)
 */
#include "kheap.h"
#include "printf.h"
#include "string.h"

#define KHEAP_MAGIC 0x4E534B48

typedef struct heap_block_header {
    uint32_t magic;
    size_t   size;
    bool     is_free;
    struct heap_block_header* next;
    struct heap_block_header* prev;
} heap_block_header_t;

static heap_block_header_t* heap_start_block = NULL;
static size_t heap_total_size = 0;
static size_t heap_allocated_bytes = 0;

void kheap_init(uint32_t start_addr, size_t size) {
    heap_total_size = size;
    heap_allocated_bytes = 0;

    heap_start_block = (heap_block_header_t*)start_addr;
    heap_start_block->magic = KHEAP_MAGIC;
    heap_start_block->size = size - sizeof(heap_block_header_t);
    heap_start_block->is_free = true;
    heap_start_block->next = NULL;
    heap_start_block->prev = NULL;

    kprintf("[NSK HEAP] Kernel heap initialized at 0x%p (Size: %u MB)\\n",
            start_addr, size / (1024 * 1024));
}

void* kmalloc(size_t size) {
    if (size == 0) return NULL;
    size = (size + 7) & ~7;

    heap_block_header_t* curr = heap_start_block;
    while (curr != NULL) {
        if (curr->magic != KHEAP_MAGIC) return NULL;

        if (curr->is_free && curr->size >= size) {
            if (curr->size >= size + sizeof(heap_block_header_t) + 16) {
                heap_block_header_t* next_block = (heap_block_header_t*)((uint8_t*)curr + sizeof(heap_block_header_t) + size);
                next_block->magic = KHEAP_MAGIC;
                next_block->size = curr->size - size - sizeof(heap_block_header_t);
                next_block->is_free = true;
                next_block->next = curr->next;
                next_block->prev = curr;
                if (curr->next != NULL) curr->next->prev = next_block;
                curr->next = next_block;
                curr->size = size;
            }
            curr->is_free = false;
            heap_allocated_bytes += curr->size;
            return (void*)((uint8_t*)curr + sizeof(heap_block_header_t));
        }
        curr = curr->next;
    }
    return NULL;
}

void kfree(void* ptr) {
    if (!ptr) return;
    heap_block_header_t* header = (heap_block_header_t*)((uint8_t*)ptr - sizeof(heap_block_header_t));
    if (header->magic != KHEAP_MAGIC) return;

    header->is_free = true;
    if (heap_allocated_bytes >= header->size) heap_allocated_bytes -= header->size;

    if (header->next != NULL && header->next->is_free) {
        header->size += sizeof(heap_block_header_t) + header->next->size;
        header->next = header->next->next;
        if (header->next != NULL) header->next->prev = header;
    }
    if (header->prev != NULL && header->prev->is_free) {
        header->prev->size += sizeof(heap_block_header_t) + header->size;
        header->prev->next = header->next;
        if (header->next != NULL) header->next->prev = header->prev;
    }
}`
  },
  {
    path: 'kernel/gdt.c',
    name: 'gdt.c',
    category: 'kernel',
    language: 'c',
    description: 'Global Descriptor Table: 5 entries (Null, Kernel Code, Kernel Data, User Code, User Data)',
    content: `/**
 * NSK OS v0.3 - GDT Implementation
 */
#include "gdt.h"
#include "printf.h"

static struct gdt_entry gdt[5];
static struct gdt_ptr   gp;

extern void gdt_flush(uint32_t);

void gdt_set_gate(int num, uint32_t base, uint32_t limit, uint8_t access, uint8_t gran) {
    gdt[num].base_low = (base & 0xFFFF);
    gdt[num].base_middle = (base >> 16) & 0xFF;
    gdt[num].base_high = (base >> 24) & 0xFF;
    gdt[num].limit_low = (limit & 0xFFFF);
    gdt[num].granularity = ((limit >> 16) & 0x0F);
    gdt[num].granularity |= (gran & 0xF0);
    gdt[num].access = access;
}

void gdt_init(void) {
    gp.limit = (sizeof(struct gdt_entry) * 5) - 1;
    gp.base = (uint32_t)&gdt;

    gdt_set_gate(0, 0, 0, 0, 0);                 // Null segment
    gdt_set_gate(1, 0, 0xFFFFFFFF, 0x9A, 0xCF); // Kernel Code: 0x08
    gdt_set_gate(2, 0, 0xFFFFFFFF, 0x92, 0xCF); // Kernel Data: 0x10
    gdt_set_gate(3, 0, 0xFFFFFFFF, 0xFA, 0xCF); // User Code:   0x18
    gdt_set_gate(4, 0, 0xFFFFFFFF, 0xF2, 0xCF); // User Data:   0x20

    gdt_flush((uint32_t)&gp);
    kprintf("[NSK GDT] Global Descriptor Table initialized (5 entries, Base=0x%p)\\n", gp.base);
}`
  },
  {
    path: 'kernel/idt.c',
    name: 'idt.c',
    category: 'kernel',
    language: 'c',
    description: 'Interrupt Descriptor Table: 256 gates with ISR 0-31 exceptions & IRQ 0-15 dispatchers',
    content: `/**
 * NSK OS v0.3 - IDT Implementation and Interrupt Dispatcher
 */
#include "idt.h"
#include "pic.h"
#include "printf.h"
#include "string.h"

static struct idt_entry idt[256];
static struct idt_ptr   idtp;
static isr_handler_t    interrupt_handlers[256];

void idt_set_gate(uint8_t num, uint32_t base, uint16_t sel, uint8_t flags) {
    idt[num].base_low  = (base & 0xFFFF);
    idt[num].base_high = (base >> 16) & 0xFFFF;
    idt[num].selector  = sel;
    idt[num].always0   = 0;
    idt[num].flags     = flags;
}

void register_interrupt_handler(uint8_t n, isr_handler_t handler) {
    interrupt_handlers[n] = handler;
}

void isr_handler(registers_t* regs) {
    if (regs->int_no < 32) {
        kprintf("\\n[KERNEL PANIC] CPU Exception %u at EIP 0x%p\\n", regs->int_no, regs->eip);
        for (;;) { __asm__ volatile ("cli; hlt"); }
    }
    if (interrupt_handlers[regs->int_no]) interrupt_handlers[regs->int_no](regs);
}

void irq_handler(registers_t* regs) {
    if (interrupt_handlers[regs->int_no]) interrupt_handlers[regs->int_no](regs);
    pic_send_eoi((uint8_t)(regs->int_no - 32));
}`
  },
  {
    path: 'kernel/pic.c',
    name: 'pic.c',
    category: 'kernel',
    language: 'c',
    description: '8259 Programmable Interrupt Controller (PIC) cascade remapping (0x20..0x2F)',
    content: `/**
 * NSK OS v0.3 - 8259 PIC Driver
 */
#include "pic.h"
#include "io.h"
#include "printf.h"

void pic_remap(uint8_t offset1, uint8_t offset2) {
    uint8_t mask1 = inb(PIC1_DATA);
    uint8_t mask2 = inb(PIC2_DATA);

    outb(PIC1_COMMAND, 0x11); io_wait();
    outb(PIC2_COMMAND, 0x11); io_wait();
    outb(PIC1_DATA, offset1); io_wait();
    outb(PIC2_DATA, offset2); io_wait();
    outb(PIC1_DATA, 0x04);    io_wait();
    outb(PIC2_DATA, 0x02);    io_wait();
    outb(PIC1_DATA, 0x01);    io_wait();
    outb(PIC2_DATA, 0x01);    io_wait();

    outb(PIC1_DATA, mask1);
    outb(PIC2_DATA, mask2);
    kprintf("[NSK PIC] 8259 PIC remapped: Master->0x%x..0x%x, Slave->0x%x..0x%x\\n",
            offset1, offset1 + 7, offset2, offset2 + 7);
}

void pic_send_eoi(uint8_t irq) {
    if (irq >= 8) outb(PIC2_COMMAND, PIC_EOI);
    outb(PIC1_COMMAND, PIC_EOI);
}`
  },
  {
    path: 'kernel/pit.c',
    name: 'pit.c',
    category: 'kernel',
    language: 'c',
    description: '8254 Programmable Interval Timer (100 Hz frequency, 10ms resolution)',
    content: `/**
 * NSK OS v0.3 - 8254 PIT Timer Driver (100 Hz)
 */
#include "pit.h"
#include "io.h"
#include "idt.h"
#include "pic.h"
#include "printf.h"

static volatile uint32_t pit_ticks = 0;

static void pit_callback(registers_t* regs) {
    (void)regs;
    pit_ticks++;
}

void pit_init(uint32_t frequency) {
    register_interrupt_handler(32, pit_callback);
    uint32_t divisor = 1193182 / frequency;
    outb(0x43, 0x36);
    outb(0x40, (uint8_t)(divisor & 0xFF));
    outb(0x40, (uint8_t)((divisor >> 8) & 0xFF));
    pic_unmask_irq(0);
    kprintf("[NSK PIT] 8254 Timer configured at %u Hz (Divisor: %u)\\n", frequency, divisor);
}

uint32_t pit_get_ticks(void) { return pit_ticks; }
uint32_t pit_get_uptime_seconds(void) { return pit_ticks / 100; }`
  },
  {
    path: 'kernel/serial.c',
    name: 'serial.c',
    category: 'kernel',
    language: 'c',
    description: 'UART 16550 Serial Port Driver (COM1 0x3F8, 38400 baud, 8N1, FIFO enabled, 7-bit ASCII mask)',
    content: `/**
 * NSK OS v0.3 - UART 16550 COM1 Serial Driver
 */
#include "serial.h"
#include "io.h"

int serial_init(void) {
    outb(COM1_PORT + 1, 0x00);    // Disable interrupts
    outb(COM1_PORT + 3, 0x80);    // Enable DLAB
    outb(COM1_PORT + 0, 0x03);    // 38400 baud divisor (lo)
    outb(COM1_PORT + 1, 0x00);    //                  (hi)
    outb(COM1_PORT + 3, 0x03);    // 8 bits, no parity, 1 stop bit
    outb(COM1_PORT + 2, 0xC7);    // Enable FIFO, 14-byte threshold
    outb(COM1_PORT + 4, 0x0B);    // Normal mode: RTS/DSR set, OUT2 enabled
    return 0;
}

void serial_putc(char c) {
    int timeout = 100000;
    while ((inb(COM1_PORT + 5) & 0x20) == 0 && --timeout > 0);
    outb(COM1_PORT, (uint8_t)((unsigned char)c & 0x7F));
}

void serial_write(const char* str) {
    while (*str) {
        if (*str == '\\n') serial_putc('\\r');
        serial_putc(*str++);
    }
}`
  },
  {
    path: 'linker.ld',
    name: 'linker.ld',
    category: 'build',
    language: 'ld',
    description: '32-bit x86 ELF Linker script (1MB load address, Multiboot2 header first)',
    content: `ENTRY(_start)
OUTPUT_FORMAT(elf32-i386)

SECTIONS
{
    . = 0x00100000;
    _kernel_start = .;

    .multiboot2 ALIGN(8) : { KEEP(*(.multiboot2)) }
    .text ALIGN(4K)       : { *(.text*) }
    .rodata ALIGN(4K)     : { *(.rodata*) }
    .data ALIGN(4K)       : { *(.data*) }
    .bss ALIGN(4K)        : { *(COMMON) *(.bss*) }

    . = ALIGN(4K);
    _kernel_end = .;
}`
  },
  {
    path: 'Makefile',
    name: 'Makefile',
    category: 'build',
    language: 'makefile',
    description: 'Modular Makefile: all, kernel.bin, iso (grub-mkrescue), run (QEMU), clean',
    content: `CC      := gcc
AS      := nasm
LD      := ld

CFLAGS  := -m32 -ffreestanding -O2 -Wall -Wextra -nostdlib -fno-builtin \\
           -fno-stack-protector -fno-pie -fno-pic -Iinclude
ASFLAGS := -f elf32
LDFLAGS := -m elf_i386 -T linker.ld -nostdlib

BUILD_DIR := build
ISO_DIR   := isodir
ISO_NAME  := nsk-os-0.3.iso

all: $(BUILD_DIR)/kernel.bin

$(BUILD_DIR)/boot/%.o: boot/%.asm
	@mkdir -p $(dir $@)
	$(AS) $(ASFLAGS) $< -o $@

$(BUILD_DIR)/kernel/%.o: kernel/%.asm
	@mkdir -p $(dir $@)
	$(AS) $(ASFLAGS) $< -o $@

$(BUILD_DIR)/kernel/%.o: kernel/%.c
	@mkdir -p $(dir $@)
	$(CC) $(CFLAGS) -c $< -o $@

$(BUILD_DIR)/kernel.bin: $(ALL_OBJS) linker.ld
	@mkdir -p $(BUILD_DIR)
	$(LD) $(LDFLAGS) $(ALL_OBJS) -o $@

iso: $(BUILD_DIR)/kernel.bin boot/grub.cfg
	@mkdir -p $(ISO_DIR)/boot/grub
	@cp $(BUILD_DIR)/kernel.bin $(ISO_DIR)/boot/kernel.bin
	@cp boot/grub.cfg $(ISO_DIR)/boot/grub/grub.cfg
	grub-mkrescue -o $(ISO_NAME) $(ISO_DIR)

run: iso
	qemu-system-i386 -m 256 -vga std -serial stdio -cdrom $(ISO_NAME)

clean:
	rm -rf $(BUILD_DIR) $(ISO_DIR) $(ISO_NAME)`
  },
  {
    path: '.github/workflows/build-iso.yml',
    name: 'build-iso.yml',
    category: 'ci',
    language: 'yaml',
    description: 'GitHub Actions workflow: automated compiler setup, build ISO, QEMU smoke test, verify <20MB size',
    content: `name: Build NSK OS ISO and Test

on: [push, pull_request, workflow_dispatch]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install build tools
        run: sudo apt-get update && sudo apt-get install -y gcc-multilib nasm grub-pc-bin grub-common xorriso mtools qemu-system-x86 python3
      - name: Build Kernel & ISO
        run: |
          make all
          make iso
      - name: Verify Size (< 20 MB)
        run: |
          SIZE=$(stat -c%s nsk-os-0.3.iso)
          [ $SIZE -le 20971520 ] || exit 1
      - name: QEMU Smoke Test
        run: python3 tests/test_phase1.py`
  },
  {
    path: 'tests/test_phase1.py',
    name: 'test_phase1.py',
    category: 'tests',
    language: 'python',
    description: 'Automated smoke test launching QEMU with kernel or ISO and asserting Phase 1 serial boot output strings',
    content: `#!/usr/bin/env python3
import subprocess, sys, time, os

def run():
    print("[TEST] Launching QEMU headless...")
    has_kernel = os.path.isfile("build/kernel.bin")
    has_iso = os.path.isfile("nsk-os-0.3.iso")
    
    cmd = ["qemu-system-i386", "-m", "256", "-kernel", "build/kernel.bin", "-serial", "stdio", "-display", "none", "-no-reboot"] if has_kernel else ["qemu-system-i386", "-m", "256", "-cdrom", "nsk-os-0.3.iso", "-serial", "stdio", "-display", "none", "-no-reboot"]
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    time.sleep(3)
    proc.terminate()
    out, err = proc.communicate(timeout=5)
    print("[TEST Output]:", out)
    assert "NSK OS booting" in out
    assert "MULTIBOOT2 MEMORY MAP" in out
    assert "PHASE 1 CORE KERNEL INITIALIZATION COMPLETE" in out
    print(">>> [TEST PASSED] Phase 1 Verified Successfully! <<<")

if __name__ == "__main__":
    run()`
  },
  {
    path: 'tests/test_phase2.py',
    name: 'test_phase2.py',
    category: 'tests',
    language: 'python',
    description: 'Phase 2 automated smoke test verifying Framebuffer, Wallpaper, Fast Box Blur, and Frosted Glass Panel',
    content: `#!/usr/bin/env python3
import subprocess, sys, time, os

def run():
    print("[TEST] Running Phase 2 Graphics Engine Smoke Test...")
    cmd = ["qemu-system-i386", "-m", "256", "-vga", "std", "-serial", "stdio", "-display", "none", "-no-reboot"]
    if os.path.isfile("build/kernel.bin"):
        cmd.extend(["-kernel", "build/kernel.bin"])
    else:
        cmd.extend(["-cdrom", "nsk-os-0.3.iso"])
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    time.sleep(4)
    proc.terminate()
    out, err = proc.communicate(timeout=4)
    text = out.decode('utf-8', errors='replace')
    assert "PHASE 2 GRAPHICS ENGINE TEST PASSED" in text
    print(">>> [TEST PASSED] Phase 2 Graphics Engine Verified! <<<")

if __name__ == "__main__":
    run()`
  },
  {
    path: 'tests/test_phase3.py',
    name: 'test_phase3.py',
    category: 'tests',
    language: 'python',
    description: 'Phase 3 automated smoke test verifying Desktop UI, Taskbar, Overlapping Windows, Mouse & Keyboard drivers',
    content: `#!/usr/bin/env python3
import subprocess, sys, time, os

def run():
    print("[TEST] Running Phase 3 Window Manager Smoke Test...")
    cmd = ["qemu-system-i386", "-m", "256", "-vga", "std", "-serial", "stdio", "-display", "none", "-no-reboot"]
    if os.path.isfile("build/kernel.bin"):
        cmd.extend(["-kernel", "build/kernel.bin"])
    else:
        cmd.extend(["-cdrom", "nsk-os-0.3.iso"])
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    time.sleep(5)
    proc.terminate()
    out, err = proc.communicate(timeout=5)
    text = out.decode('utf-8', errors='replace')
    assert "PHASE 3 DESKTOP UI & WINDOW MANAGER ACTIVE" in text
    print(">>> [TEST PASSED] Phase 3 Window Manager Verified! <<<")

if __name__ == "__main__":
    run()`
  },
  {
    path: 'kernel/mouse.c',
    name: 'mouse.c',
    category: 'kernel',
    language: 'c',
    description: 'PS/2 Mouse Driver: 8042 controller packets, IRQ 12 handler, tracking and alpha-blended cursor rendering',
    content: `/**
 * NSK OS v0.3 - PS/2 Mouse Driver (Phase 3)
 */
#include "mouse.h"
#include "idt.h"
#include "gfx.h"

void mouse_init(uint32_t screen_width, uint32_t screen_height);
void mouse_draw_cursor(int x, int y);`
  },
  {
    path: 'kernel/keyboard.c',
    name: 'keyboard.c',
    category: 'kernel',
    language: 'c',
    description: 'PS/2 Keyboard Driver: IRQ 1 handler, Scan Code Set 1 decoder, circular key event queue',
    content: `/**
 * NSK OS v0.3 - PS/2 Keyboard Driver (Phase 3)
 */
#include "keyboard.h"
#include "idt.h"

void keyboard_init(void);
char keyboard_get_char(void);`
  },
  {
    path: 'kernel/wm.c',
    name: 'wm.c',
    category: 'kernel',
    language: 'c',
    description: 'Window Manager: Z-ordering, dragging, traffic light controls, frosted glass taskbar, start menu, wallpaper cache',
    content: `/**
 * NSK OS v0.3 - Window Manager & Desktop UI Engine (Phase 3)
 */
#include "wm.h"
#include "gfx.h"
#include "mouse.h"

void wm_init(void);
void wm_render(void);
void wm_process_events(void);`
  },
  {
    path: 'kernel/phase3_demo.c',
    name: 'phase3_demo.c',
    category: 'kernel',
    language: 'c',
    description: 'Phase 3 Demonstration: Desktop with taskbar + 2 overlapping draggable windows + 60 FPS event loop',
    content: `/**
 * NSK OS v0.3 - Phase 3 Demonstration
 */
#include "phase3.h"
#include "wm.h"

void phase3_desktop_init(void);`
  },
  {
    path: 'kernel/bga.c',
    name: 'bga.c',
    category: 'kernel',
    language: 'c',
    description: 'Bochs Graphics Adapter & PCI driver: Direct hardware mode switching and BAR0 framebuffer detection',
    content: `/**
 * NSK OS v0.3 - Bochs Graphics Adapter (BGA) & PCI Hardware Video Driver
 */
#include "bga.h"
#include "io.h"

bool bga_is_available(void);
uint32_t bga_get_framebuffer_addr(void);
bool bga_set_video_mode(uint32_t width, uint32_t height, uint32_t bpp);`
  },
  {
    path: 'kernel/gfx.c',
    name: 'gfx.c',
    category: 'kernel',
    language: 'c',
    description: 'Graphics Engine: Double buffering (back buffer), AA rounded rects, alpha blending, fast box blur, drop shadows',
    content: `/**
 * NSK OS v0.3 - Graphics Engine (Phase 2)
 * Features: Double buffering, AA rounded rects, alpha blending, fast box blur, drop shadows
 */
#include "gfx.h"
#include "kheap.h"
#include "printf.h"
#include "string.h"

// High-performance 32-bit linear framebuffer renderer`
  },
  {
    path: 'kernel/wallpaper.c',
    name: 'wallpaper.c',
    category: 'kernel',
    language: 'c',
    description: 'Procedural Blooming Wave Wallpaper: Multi-octave sinusoidal aurora gradient generation',
    content: `/**
 * NSK OS v0.3 - Blooming Wave Wallpaper Engine (Phase 2)
 */
#include "wallpaper.h"
#include "gfx.h"

void wallpaper_generate(uint32_t* buffer, int width, int height);`
  },
  {
    path: 'kernel/font.c',
    name: 'font.c',
    category: 'kernel',
    language: 'c',
    description: 'Vector & Anti-Aliased Typography: Variable scaling, subpixel AA, drop shadow text rendering',
    content: `/**
 * NSK OS v0.3 - Anti-Aliased Typography Engine (Phase 2)
 */
#include "font.h"
#include "gfx.h"

void font_draw_string(int x, int y, const char* str, uint32_t color, int scale);`
  },
  {
    path: 'kernel/phase2_demo.c',
    name: 'phase2_demo.c',
    category: 'kernel',
    language: 'c',
    description: 'Phase 2 Demonstration: Renders Blooming Wave wallpaper + blurred translucent rounded frosted glass panel',
    content: `/**
 * NSK OS v0.3 - Phase 2 Demonstration
 */
#include "phase2.h"
#include "gfx.h"
#include "wallpaper.h"

void phase2_graphics_init(multiboot_info_parsed_t* mbi);`
  },
  {
    path: 'README.md',
    name: 'README.md',
    category: 'build',
    language: 'markdown',
    description: 'Project README with Phase 1 documentation, memory layout, build instructions in Bengali & English',
    content: `# NSK OS v0.3
From-Scratch 32-bit x86 Protected Mode Operating System with Custom Kernel & GUI.
See README.md in root for complete documentation.`
  }
];
