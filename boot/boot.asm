; ==============================================================================
; NSK OS v0.3 - Multiboot2 Bootloader Entry (i686 32-bit Protected Mode)
; Architecture: x86 (IA-32)
; Target: GRUB Multiboot2, QEMU, VirtualBox
; ==============================================================================

[BITS 32]

; Multiboot2 Magic Numbers & Architecture
MULTIBOOT2_MAGIC        equ 0xE85250D6
MULTIBOOT2_ARCH_I386    equ 0

; Multiboot2 Header Section (Must be 64-bit aligned and within first 32KB of ELF)
section .multiboot2
align 8
header_start:
    dd MULTIBOOT2_MAGIC
    dd MULTIBOOT2_ARCH_I386
    dd header_end - header_start
    ; Checksum: -(magic + arch + length)
    dd -(MULTIBOOT2_MAGIC + MULTIBOOT2_ARCH_I386 + (header_end - header_start))

    ; Tag: Information request tag
    align 8
tag_information_request_start:
    dw 1                        ; Type: Information Request
    dw 0                        ; Flags
    dd tag_information_request_end - tag_information_request_start
    dd 4                        ; Basic memory info
    dd 6                        ; Memory map
    dd 8                        ; Framebuffer info
tag_information_request_end:

    ; Tag: Framebuffer request (1536x1024x32 bpp linear framebuffer)
    align 8
tag_framebuffer_start:
    dw 5                        ; Type: Framebuffer
    dw 1                        ; Flags: Optional (1 = optional for Phase 1 text/serial mode fallback)
    dd tag_framebuffer_end - tag_framebuffer_start
    dd 1536                     ; Preferred Width: 1536
    dd 1024                     ; Preferred Height: 1024
    dd 32                       ; Preferred Depth: 32 bpp
tag_framebuffer_end:

    ; Tag: End of tags
    align 8
    dw 0                        ; Type 0 = End
    dw 0                        ; Flags
    dd 8                        ; Size = 8
header_end:

; ------------------------------------------------------------------------------
; Kernel Stack Allocation (16 KB)
; ------------------------------------------------------------------------------
section .bss
align 16
stack_bottom:
    resb 16384                  ; 16 KB kernel stack
stack_top:

; ------------------------------------------------------------------------------
; Kernel Entry Point
; ------------------------------------------------------------------------------
section .text
global _start
extern kmain

_start:
    ; Disable interrupts immediately
    cli

    ; Initialize stack pointer
    mov esp, stack_top

    ; Reset EFLAGS (clear direction flag, interrupts off)
    push dword 0
    popf

    ; Multiboot2 passes:
    ;   EAX = Magic number (0x36D76289)
    ;   EBX = Physical address of Multiboot2 Information Structure (MBI)
    push ebx                    ; Argument 2: Multiboot2 info pointer
    push eax                    ; Argument 1: Magic number

    ; Jump to Kernel C entry
    call kmain

    ; If kmain returns, halt processor in infinite loop
.halt:
    cli
    hlt
    jmp .halt
