/**
 * NSK OS - Interrupt Descriptor Table (x86-64 Long Mode)
 */
#ifndef NSK_IDT_H
#define NSK_IDT_H

#include "types.h"

struct idt_entry {
    uint16_t base_low;
    uint16_t selector;
    uint8_t  ist;
    uint8_t  flags;
    uint16_t base_middle;
    uint32_t base_high;
    uint32_t reserved;
} __attribute__((packed));

struct idt_ptr {
    uint16_t limit;
    uint64_t base;
} __attribute__((packed));

typedef struct registers {
    uint64_t rax, rbx, rcx, rdx, rbp, rdi, rsi;
    uint64_t r8, r9, r10, r11, r12, r13, r14, r15;
    uint64_t int_no, err_code;
    uint64_t rip, cs, rflags, rsp, ss;
} registers_t;

typedef void (*isr_handler_t)(registers_t* regs);

void idt_init(void);
void idt_set_gate(uint8_t num, uint64_t base, uint16_t sel, uint8_t flags);
void register_interrupt_handler(uint8_t n, isr_handler_t handler);

#endif /* NSK_IDT_H */
