/* Multiboot v1 entry. GRUB supplies the framebuffer and multiboot info. */
.set ALIGN,    1<<0
.set MEMINFO,  1<<1
.set FLAGS,    ALIGN | MEMINFO
.set MAGIC,    0x1BADB002
.set CHECKSUM, -(MAGIC + FLAGS)

.section .multiboot
.align 4
.long MAGIC
.long FLAGS
.long CHECKSUM

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
