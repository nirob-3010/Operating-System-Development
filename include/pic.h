/**
 * NSK OS v0.3 - 8259 Programmable Interrupt Controller (PIC)
 */
#ifndef NSK_PIC_H
#define NSK_PIC_H

#include "types.h"

#define PIC1_COMMAND 0x20
#define PIC1_DATA    0x21
#define PIC2_COMMAND 0xA0
#define PIC2_DATA    0xA1

#define PIC_EOI      0x20

#define IRQ_OFFSET_MASTER 0x20
#define IRQ_OFFSET_SLAVE  0x28

void pic_remap(uint8_t offset1, uint8_t offset2);
void pic_send_eoi(uint8_t irq);
void pic_mask_irq(uint8_t irq_line);
void pic_unmask_irq(uint8_t irq_line);

#endif /* NSK_PIC_H */
