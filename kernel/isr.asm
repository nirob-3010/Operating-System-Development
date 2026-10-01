; ==============================================================================
; NSK OS v0.3 - Interrupt Service Routines (ISRs) & Hardware IRQ Stubs
; ==============================================================================

[BITS 32]

extern isr_handler
extern irq_handler

%macro ISR_NOERRCODE 1
global isr%1
isr%1:
    cli
    push dword 0                ; Push dummy error code
    push dword %1               ; Push interrupt number
    jmp isr_common_stub
%endmacro

%macro ISR_ERRCODE 1
global isr%1
isr%1:
    cli
    push dword %1               ; Error code already pushed by CPU, push int number
    jmp isr_common_stub
%endmacro

%macro IRQ 2
global irq%1
irq%1:
    cli
    push dword 0                ; Push dummy error code
    push dword %2               ; Push mapped interrupt number
    jmp irq_common_stub
%endmacro

; ------------------------------------------------------------------------------
; Standard x86 CPU Exception Vectors (0 - 31)
; ------------------------------------------------------------------------------
ISR_NOERRCODE 0     ; 0: Divide by Zero
ISR_NOERRCODE 1     ; 1: Debug Exception
ISR_NOERRCODE 2     ; 2: Non-Maskable Interrupt (NMI)
ISR_NOERRCODE 3     ; 3: Breakpoint
ISR_NOERRCODE 4     ; 4: Overflow (INTO instruction)
ISR_NOERRCODE 5     ; 5: Out of Bounds
ISR_NOERRCODE 6     ; 6: Invalid Opcode
ISR_NOERRCODE 7     ; 7: Device Not Available (No Math Coprocessor)
ISR_ERRCODE   8     ; 8: Double Fault
ISR_NOERRCODE 9     ; 9: Coprocessor Segment Overrun
ISR_ERRCODE   10    ; 10: Invalid TSS
ISR_ERRCODE   11    ; 11: Segment Not Present
ISR_ERRCODE   12    ; 12: Stack-Segment Fault
ISR_ERRCODE   13    ; 13: General Protection Fault
ISR_ERRCODE   14    ; 14: Page Fault
ISR_NOERRCODE 15    ; 15: Reserved by Intel
ISR_NOERRCODE 16    ; 16: x87 FPU Floating-Point Error
ISR_ERRCODE   17    ; 17: Alignment Check
ISR_NOERRCODE 18    ; 18: Machine Check
ISR_NOERRCODE 19    ; 19: SIMD Floating-Point Exception
ISR_NOERRCODE 20    ; 20: Virtualization Exception
ISR_ERRCODE   21    ; 21: Control Protection Exception
ISR_NOERRCODE 22    ; 22: Reserved
ISR_NOERRCODE 23    ; 23: Reserved
ISR_NOERRCODE 24    ; 24: Reserved
ISR_NOERRCODE 25    ; 25: Reserved
ISR_NOERRCODE 26    ; 26: Reserved
ISR_NOERRCODE 27    ; 27: Reserved
ISR_NOERRCODE 28    ; 28: Hypervisor Injection Exception
ISR_ERRCODE   29    ; 29: VMM Communication Exception
ISR_ERRCODE   30    ; 30: Security Exception
ISR_NOERRCODE 31    ; 31: Reserved

; ------------------------------------------------------------------------------
; Master & Slave PIC Hardware IRQ Vectors (32 - 47)
; ------------------------------------------------------------------------------
IRQ 0,  32          ; IRQ0: Programmable Interval Timer (PIT)
IRQ 1,  33          ; IRQ1: PS/2 Keyboard
IRQ 2,  34          ; IRQ2: Cascade for 8259A Slave
IRQ 3,  35          ; IRQ3: COM2 / COM4
IRQ 4,  36          ; IRQ4: COM1 / COM3
IRQ 5,  37          ; IRQ5: LPT2 / Sound Card
IRQ 6,  38          ; IRQ6: Floppy Disk Controller
IRQ 7,  39          ; IRQ7: LPT1 / Spurious
IRQ 8,  40          ; IRQ8: CMOS Real Time Clock
IRQ 9,  41          ; IRQ9: ACPI / Free
IRQ 10, 42          ; IRQ10: Free / Network
IRQ 11, 43          ; IRQ11: Free / USB
IRQ 12, 44          ; IRQ12: PS/2 Mouse
IRQ 13, 45          ; IRQ13: FPU / Math Coprocessor
IRQ 14, 46          ; IRQ14: Primary ATA Hard Disk
IRQ 15, 47          ; IRQ15: Secondary ATA Hard Disk

; ------------------------------------------------------------------------------
; Common ISR Handler Stub
; ------------------------------------------------------------------------------
isr_common_stub:
    pusha                       ; Push EDI, ESI, EBP, ESP, EBX, EDX, ECX, EAX

    mov ax, ds                  ; Save Data Segment
    push eax

    mov ax, 0x10                ; Load Kernel Data Segment (0x10)
    mov ds, ax
    mov es, ax
    mov fs, ax
    mov gs, ax

    push esp                    ; Push pointer to registers struct
    call isr_handler
    add esp, 4                  ; Cleanup pointer

    pop eax                     ; Restore Data Segment
    mov ds, ax
    mov es, ax
    mov fs, ax
    mov gs, ax

    popa                        ; Restore general registers
    add esp, 8                  ; Cleans up pushed error code and ISR number
    sti
    iret                        ; Interrupt return

; ------------------------------------------------------------------------------
; Common IRQ Handler Stub
; ------------------------------------------------------------------------------
irq_common_stub:
    pusha                       ; Push EDI, ESI, EBP, ESP, EBX, EDX, ECX, EAX

    mov ax, ds                  ; Save Data Segment
    push eax

    mov ax, 0x10                ; Load Kernel Data Segment (0x10)
    mov ds, ax
    mov es, ax
    mov fs, ax
    mov gs, ax

    push esp                    ; Push pointer to registers struct
    call irq_handler
    add esp, 4                  ; Cleanup pointer

    pop eax                     ; Restore Data Segment
    mov ds, ax
    mov es, ax
    mov fs, ax
    mov gs, ax

    popa                        ; Restore general registers
    add esp, 8                  ; Cleans up pushed error code and IRQ number
    iret                        ; Interrupt return
