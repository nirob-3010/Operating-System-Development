/* Multiboot v1 entry with an explicit linear framebuffer request. */
.set ALIGN,      1<<0
.set MEMINFO,    1<<1
.set VIDEO_MODE, 1<<2
.set FLAGS,      ALIGN | MEMINFO | VIDEO_MODE
.set MAGIC,      0x1BADB002
.set CHECKSUM,   -(MAGIC + FLAGS)

.section .multiboot
.align 4
.long MAGIC
.long FLAGS
.long CHECKSUM

/* Multiboot video mode request:
   mode_type = 0 -> linear graphics
   Prefer Full HD 1920x1080x32. GRUB/emulator may fall back
   to another compatible linear framebuffer mode. */
.long 0
.long 1920
.long 1080
.long 32

.section .text
.global _start
.type _start, @function
_start:
    cli
    mov $stack_top, %esp

    /* cdecl: kmain(multiboot_magic, multiboot_info_addr) */
    push %ebx
    push %eax
    call kmain

.hang:
    cli
    hlt
    jmp .hang

.section .bss
.align 16
stack_bottom:
.skip 16384
stack_top:
