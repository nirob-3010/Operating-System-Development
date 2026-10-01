/**
 * NSK OS v0.3 - 8259 Programmable Interrupt Controller (PIC) Driver
 */
#include "pic.h"
#include "io.h"
#include "printf.h"

#define ICW1_INIT       0x10
#define ICW1_ICW4       0x01
#define ICW4_8086       0x01

void pic_remap(uint8_t offset1, uint8_t offset2) {
    uint8_t mask1, mask2;

    // Save existing masks
    mask1 = inb(PIC1_DATA);
    mask2 = inb(PIC2_DATA);

    // ICW1: Start initialization sequence in cascade mode
    outb(PIC1_COMMAND, ICW1_INIT | ICW1_ICW4);
    io_wait();
    outb(PIC2_COMMAND, ICW1_INIT | ICW1_ICW4);
    io_wait();

    // ICW2: Remap Master PIC vector offset (0x20) and Slave PIC vector offset (0x28)
    outb(PIC1_DATA, offset1);
    io_wait();
    outb(PIC2_DATA, offset2);
    io_wait();

    // ICW3: Tell Master PIC there is a slave PIC at IRQ2 (0000 0100)
    outb(PIC1_DATA, 0x04);
    io_wait();
    // Tell Slave PIC its cascade identity (0000 0010)
    outb(PIC2_DATA, 0x02);
    io_wait();

    // ICW4: Set 8086/88 mode
    outb(PIC1_DATA, ICW4_8086);
    io_wait();
    outb(PIC2_DATA, ICW4_8086);
    io_wait();

    // Restore saved masks
    outb(PIC1_DATA, mask1);
    outb(PIC2_DATA, mask2);

    kprintf("[NSK PIC] 8259 PIC remapped: Master->0x%x..0x%x, Slave->0x%x..0x%x\n",
            offset1, offset1 + 7, offset2, offset2 + 7);
}

void pic_send_eoi(uint8_t irq) {
    if (irq >= 8) {
        outb(PIC2_COMMAND, PIC_EOI);
    }
    outb(PIC1_COMMAND, PIC_EOI);
}

void pic_mask_irq(uint8_t irq_line) {
    uint16_t port;
    uint8_t value;

    if (irq_line < 8) {
        port = PIC1_DATA;
    } else {
        port = PIC2_DATA;
        irq_line -= 8;
    }
    value = inb(port) | (1 << irq_line);
    outb(port, value);
}

void pic_unmask_irq(uint8_t irq_line) {
    uint16_t port;
    uint8_t value;

    if (irq_line < 8) {
        port = PIC1_DATA;
    } else {
        port = PIC2_DATA;
        irq_line -= 8;
    }
    value = inb(port) & ~(1 << irq_line);
    outb(port, value);
}
