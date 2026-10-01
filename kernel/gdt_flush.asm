; ==============================================================================
; NSK OS v0.3 - GDT Flush (Segment Reloading in Protected Mode)
; ==============================================================================

[BITS 32]
global gdt_flush

gdt_flush:
    mov eax, [esp + 4]          ; Pointer to GDT structure passed as parameter
    lgdt [eax]                  ; Load new GDT pointer

    ; Reload segment registers with Kernel Data Segment (0x10)
    mov ax, 0x10
    mov ds, ax
    mov es, ax
    mov fs, ax
    mov gs, ax
    mov ss, ax

    ; Far jump to flush CPU prefetch queue and reload CS with Kernel Code Segment (0x08)
    jmp 0x08:.flush
.flush:
    ret
