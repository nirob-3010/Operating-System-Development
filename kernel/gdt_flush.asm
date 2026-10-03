.intel_syntax noprefix
.code64

/* ==============================================================================
 * NSK OS - GDT loader for x86-64 Long Mode
 * ============================================================================== */

.global gdt_flush
.type gdt_flush, @function
gdt_flush:
    mov rax, rdi
    lgdt [rax]

    mov ax, 0x10
    mov ds, ax
    mov es, ax
    mov ss, ax

    push 0x08
    lea rax, [rip + .flush]
    push rax
    retfq

.flush:
    ret
.size gdt_flush, .-gdt_flush
