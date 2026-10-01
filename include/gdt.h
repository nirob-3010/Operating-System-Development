/**
 * NSK OS v0.3 - Global Descriptor Table (GDT)
 */
#ifndef NSK_GDT_H
#define NSK_GDT_H

#include "types.h"

#define GDT_KERNEL_CODE_SEG 0x08
#define GDT_KERNEL_DATA_SEG 0x10
#define GDT_USER_CODE_SEG   0x18
#define GDT_USER_DATA_SEG   0x20
#define GDT_TSS_SEG         0x28

struct gdt_entry {
    uint16_t limit_low;
    uint16_t base_low;
    uint8_t  base_middle;
    uint8_t  access;
    uint8_t  granularity;
    uint8_t  base_high;
} __attribute__((packed));

struct gdt_ptr {
    uint16_t limit;
    uint32_t base;
} __attribute__((packed));

void gdt_init(void);
void gdt_set_gate(int num, uint32_t base, uint32_t limit, uint8_t access, uint8_t gran);

#endif /* NSK_GDT_H */
