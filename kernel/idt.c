/**
 * NSK OS - 64-bit IDT implementation and interrupt dispatcher.
 */
#include "idt.h"
#include "gdt.h"
#include "pic.h"
#include "printf.h"
#include "string.h"

static struct idt_entry idt[256];
static struct idt_ptr idtp;
static isr_handler_t interrupt_handlers[256];

static const char* exception_messages[32] = {
    "Division By Zero", "Debug", "Non Maskable Interrupt", "Breakpoint",
    "Into Detected Overflow", "Out of Bounds", "Invalid Opcode", "No Coprocessor",
    "Double Fault", "Coprocessor Segment Overrun", "Bad TSS", "Segment Not Present",
    "Stack Fault", "General Protection Fault", "Page Fault", "Unknown Interrupt",
    "Coprocessor Fault", "Alignment Check", "Machine Check", "SIMD Floating-Point Exception",
    "Virtualization Exception", "Control Protection Exception", "Reserved", "Reserved",
    "Reserved", "Reserved", "Reserved", "Reserved", "Hypervisor Injection",
    "VMM Communication", "Security Exception", "Reserved"
};

extern void idt_load(const struct idt_ptr*);

#define ISR_DECL(n) extern void isr##n(void);
ISR_DECL(0) ISR_DECL(1) ISR_DECL(2) ISR_DECL(3) ISR_DECL(4) ISR_DECL(5) ISR_DECL(6) ISR_DECL(7)
ISR_DECL(8) ISR_DECL(9) ISR_DECL(10) ISR_DECL(11) ISR_DECL(12) ISR_DECL(13) ISR_DECL(14) ISR_DECL(15)
ISR_DECL(16) ISR_DECL(17) ISR_DECL(18) ISR_DECL(19) ISR_DECL(20) ISR_DECL(21) ISR_DECL(22) ISR_DECL(23)
ISR_DECL(24) ISR_DECL(25) ISR_DECL(26) ISR_DECL(27) ISR_DECL(28) ISR_DECL(29) ISR_DECL(30) ISR_DECL(31)
#define IRQ_DECL(n) extern void irq##n(void);
IRQ_DECL(0) IRQ_DECL(1) IRQ_DECL(2) IRQ_DECL(3) IRQ_DECL(4) IRQ_DECL(5) IRQ_DECL(6) IRQ_DECL(7)
IRQ_DECL(8) IRQ_DECL(9) IRQ_DECL(10) IRQ_DECL(11) IRQ_DECL(12) IRQ_DECL(13) IRQ_DECL(14) IRQ_DECL(15)

void idt_set_gate(uint8_t num, uint64_t base, uint16_t sel, uint8_t flags) {
    struct idt_entry* e = &idt[num];
    e->base_low = (uint16_t)(base & 0xFFFF);
    e->selector = sel;
    e->ist = 0;
    e->flags = flags;
    e->base_middle = (uint16_t)((base >> 16) & 0xFFFF);
    e->base_high = (uint32_t)((base >> 32) & 0xFFFFFFFF);
    e->reserved = 0;
}

void register_interrupt_handler(uint8_t n, isr_handler_t handler) {
    interrupt_handlers[n] = handler;
}

#define SET_ISR(n) idt_set_gate((n), (uint64_t)(uintptr_t)isr##n, GDT_KERNEL_CODE_SEG, 0x8E)
#define SET_IRQ(n) idt_set_gate((32 + (n)), (uint64_t)(uintptr_t)irq##n, GDT_KERNEL_CODE_SEG, 0x8E)

void idt_init(void) {
    memset(idt, 0, sizeof(idt));
    memset(interrupt_handlers, 0, sizeof(interrupt_handlers));

    SET_ISR(0);  SET_ISR(1);  SET_ISR(2);  SET_ISR(3);  SET_ISR(4);  SET_ISR(5);  SET_ISR(6);  SET_ISR(7);
    SET_ISR(8);  SET_ISR(9);  SET_ISR(10); SET_ISR(11); SET_ISR(12); SET_ISR(13); SET_ISR(14); SET_ISR(15);
    SET_ISR(16); SET_ISR(17); SET_ISR(18); SET_ISR(19); SET_ISR(20); SET_ISR(21); SET_ISR(22); SET_ISR(23);
    SET_ISR(24); SET_ISR(25); SET_ISR(26); SET_ISR(27); SET_ISR(28); SET_ISR(29); SET_ISR(30); SET_ISR(31);

    SET_IRQ(0);  SET_IRQ(1);  SET_IRQ(2);  SET_IRQ(3);  SET_IRQ(4);  SET_IRQ(5);  SET_IRQ(6);  SET_IRQ(7);
    SET_IRQ(8);  SET_IRQ(9);  SET_IRQ(10); SET_IRQ(11); SET_IRQ(12); SET_IRQ(13); SET_IRQ(14); SET_IRQ(15);

    idtp.limit = (uint16_t)(sizeof(idt) - 1);
    idtp.base = (uint64_t)(uintptr_t)&idt;
    idt_load(&idtp);

    kprintf("[NSK IDT] Interrupt Descriptor Table loaded (256 gates, Base=%p)\n",
            (void*)(uintptr_t)idtp.base);
}

void isr_handler(registers_t* regs) {
    if (regs->int_no >= 256) {
        for (;;) __asm__ volatile ("cli; hlt");
    }
    if (regs->int_no < 32) {
        kprintf("\n================ [KERNEL PANIC: CPU EXCEPTION] ================\n");
        kprintf("Exception [%u]: %s\n", (uint32_t)regs->int_no, exception_messages[regs->int_no]);
        kprintf("Error Code : %p\n", (void*)(uintptr_t)regs->err_code);
        kprintf("RIP        : %p, CS: 0x%x, RFLAGS: 0x%x\n",
                (void*)(uintptr_t)regs->rip, (uint32_t)regs->cs, (uint32_t)regs->rflags);
        kprintf("RAX: %p  RBX: %p  RCX: %p  RDX: %p\n",
                (void*)(uintptr_t)regs->rax, (void*)(uintptr_t)regs->rbx,
                (void*)(uintptr_t)regs->rcx, (void*)(uintptr_t)regs->rdx);
        kprintf("RSP: %p  RBP: %p  RSI: %p  RDI: %p\n",
                (void*)(uintptr_t)regs->rsp, (void*)(uintptr_t)regs->rbp,
                (void*)(uintptr_t)regs->rsi, (void*)(uintptr_t)regs->rdi);
        kprintf("================================================================\n");
        for (;;) __asm__ volatile ("cli; hlt");
    }

    if (interrupt_handlers[regs->int_no]) {
        interrupt_handlers[regs->int_no](regs);
    }
}

void irq_handler(registers_t* regs) {
    if (regs->int_no >= 256) {
        for (;;) __asm__ volatile ("cli; hlt");
    }
    if (interrupt_handlers[regs->int_no]) {
        interrupt_handlers[regs->int_no](regs);
    }
    pic_send_eoi((uint8_t)(regs->int_no - 32));
}
