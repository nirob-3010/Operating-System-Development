/* ==============================================================================
 * NSK OS v0.3 - Linker Script for x86 32-bit ELF Kernel
 * Loads at 1MB (0x00100000)
 * ============================================================================== */

ENTRY(_start)
OUTPUT_FORMAT(elf32-i386)

SECTIONS
{
    /* Load kernel at 1 MB physical address */
    . = 0x00100000;

    _kernel_start = .;

    /* Multiboot headers MUST come first within first 8 KB of the binary */
    .multiboot ALIGN(8) :
    {
        KEEP(*(.multiboot1))
        KEEP(*(.multiboot2))
    }

    /* Code section */
    .text ALIGN(4K) :
    {
        *(.text*)
    }

    /* Read-only data section */
    .rodata ALIGN(4K) :
    {
        *(.rodata*)
    }

    /* Read-write initialized data section */
    .data ALIGN(4K) :
    {
        *(.data*)
    }

    /* Read-write uninitialized data section (BSS) */
    .bss ALIGN(4K) :
    {
        *(COMMON)
        *(.bss*)
    }

    . = ALIGN(4K);
    _kernel_end = .;

    /DISCARD/ :
    {
        *(.comment)
        *(.eh_frame)
    }
}
