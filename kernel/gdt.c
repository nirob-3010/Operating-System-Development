/**
 * NSK OS - Global Descriptor Table for x86-64 Long Mode.
 */
#include "gdt.h"
#include "printf.h"

static struct gdt_entry gdt[5];
static struct gdt_ptr gp;

extern void gdt_flush(const struct gdt_ptr*);

void gdt_set_gate(int num, uint32_t base, uint32_t limit, uint8_t access, uint8_t gran) {
    gdt[num].base_low = (uint16_t)(base & 0xFFFF);
    gdt[num].base_middle = (uint8_t)((base >> 16) & 0xFF);
    gdt[num].base_high = (uint8_t)((base >> 24) & 0xFF);
    gdt[num].limit_low = (uint16_t)(limit & 0xFFFF);
    gdt[num].granularity = (uint8_t)((limit >> 16) & 0x0F);
    gdt[num].granularity |= (uint8_t)(gran & 0xF0);
    gdt[num].access = access;
}

void gdt_init(void) {
    /*
     * Long-mode code descriptors use L=1 and D=0. Segment bases/limits are
     * ignored for normal 64-bit code/data accesses, but the descriptors remain
     * valid for the CPU's segment checks and future privilege-level work.
     */
    gdt_set_gate(0, 0, 0, 0, 0);
    gdt_set_gate(1, 0, 0xFFFFF, 0x9A, 0xA0); // 0x08: 64-bit kernel code
    gdt_set_gate(2, 0, 0xFFFFF, 0x92, 0xC0); // 0x10: kernel data
    gdt_set_gate(3, 0, 0xFFFFF, 0xFA, 0xA0); // 0x18: 64-bit user code
    gdt_set_gate(4, 0, 0xFFFFF, 0xF2, 0xC0); // 0x20: user data

    gp.limit = (uint16_t)(sizeof(gdt) - 1);
    gp.base = (uint64_t)(uintptr_t)&gdt;

    gdt_flush(&gp);
    kprintf("[NSK GDT] Global Descriptor Table initialized (5 entries, Base=%p)\n",
            (void*)(uintptr_t)gp.base);
}
