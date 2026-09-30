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
   1024x768x32 preferred; GRUB may choose a compatible mode. */
.long 0
.long 1024
.long 768
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
