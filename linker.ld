/* ==============================================================================
 * NSK OS - x86-64 kernel linker script
 * Loaded by GRUB at 1 MiB and entered in Long Mode.
 * ============================================================================== */

ENTRY(_start)
OUTPUT_FORMAT(elf64-x86-64)
OUTPUT_ARCH(i386:x86-64)

SECTIONS
{
    . = 0x00100000;
    _kernel_start = .;

    .multiboot ALIGN(8) :
    {
        KEEP(*(.multiboot1))
        KEEP(*(.multiboot2))
    }

    .text ALIGN(4K) :
    {
        *(.text*)
    }

    .rodata ALIGN(4K) :
    {
        *(.rodata*)
    }

    .data ALIGN(4K) :
    {
        *(.data*)
    }

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
        *(.note.GNU-stack)
    }
}
