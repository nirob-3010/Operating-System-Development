; ==============================================================================
; NSK OS v0.3 - Dual Multiboot1 & Multiboot2 Bootloader Entry
; Architecture: x86 (IA-32, i686 Protected Mode)
; Supports: GRUB Multiboot2, GRUB Multiboot1, and QEMU direct -kernel loader
; ==============================================================================

[BITS 32]

; ------------------------------------------------------------------------------
; 1. Multiboot 1 Header (Enables direct QEMU -kernel execution)
; ------------------------------------------------------------------------------
MB1_MAGIC       equ 0x1BADB002
MB1_FLAGS       equ 0x00000007          ; Align 4KB pages + Memory info + Video mode
MB1_CHECKSUM    equ -(MB1_MAGIC + MB1_FLAGS)

section .multiboot1
align 4
mb1_header:
    dd MB1_MAGIC
    dd MB1_FLAGS
    dd MB1_CHECKSUM
    dd 0, 0, 0, 0, 0                    ; AOUT kludge fields (unused for ELF)
    dd 0                                ; Mode type: 0 for linear framebuffer
    dd 1536                             ; Preferred width: 1536
    dd 1024                             ; Preferred height: 1024
    dd 32                               ; Preferred depth: 32 bpp

; ------------------------------------------------------------------------------
; 2. Multiboot 2 Header (GRUB Multiboot2 specification)
; ------------------------------------------------------------------------------
MULTIBOOT2_MAGIC        equ 0xE85250D6
MULTIBOOT2_ARCH_I386    equ 0

section .multiboot2
align 8
mb2_header_start:
    dd MULTIBOOT2_MAGIC
    dd MULTIBOOT2_ARCH_I386
    dd mb2_header_end - mb2_header_start
    ; Checksum: -(magic + arch + length)
    dd -(MULTIBOOT2_MAGIC + MULTIBOOT2_ARCH_I386 + (mb2_header_end - mb2_header_start))

    ; Tag: Information request tag
    align 8
tag_information_request_start:
    dw 1                                ; Type: Information Request
    dw 0                                ; Flags
    dd tag_information_request_end - tag_information_request_start
    dd 4                                ; Basic memory info
    dd 6                                ; Memory map
    dd 8                                ; Framebuffer info
tag_information_request_end:

    ; Tag: Framebuffer request (1536x1024x32 bpp linear framebuffer)
    align 8
tag_framebuffer_start:
    dw 5                                ; Type: Framebuffer
    dw 1                                ; Flags: Optional
    dd tag_framebuffer_end - tag_framebuffer_start
    dd 1536                             ; Preferred Width: 1536
    dd 1024                             ; Preferred Height: 1024
    dd 32                               ; Preferred Depth: 32 bpp
tag_framebuffer_end:

    ; Tag: End of tags
    align 8
    dw 0                                ; Type 0 = End
    dw 0                                ; Flags
    dd 8                                ; Size = 8
mb2_header_end:

; ------------------------------------------------------------------------------
; Kernel Stack Allocation (16 KB)
; ------------------------------------------------------------------------------
section .bss
align 16
stack_bottom:
    resb 16384                          ; 16 KB kernel stack
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

    ; Multiboot passes:
    ;   EAX = Magic number (0x36D76289 for MB2, 0x2BADB002 for MB1)
    ;   EBX = Physical address of Information Structure
    push ebx                            ; Argument 2: Info structure pointer
    push eax                            ; Argument 1: Magic number

    ; Jump to Kernel C entry
    call kmain

    ; If kmain returns, halt processor in infinite loop
.halt:
    cli
    hlt
    jmp .halt
