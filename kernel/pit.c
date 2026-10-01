/**
 * NSK OS v0.3 - 8254 PIT (Programmable Interval Timer) Driver
 */
#include "pit.h"
#include "io.h"
#include "idt.h"
#include "pic.h"
#include "printf.h"

#define PIT_CHANNEL0_DATA_PORT 0x40
#define PIT_COMMAND_PORT       0x43
#define PIT_BASE_FREQUENCY     1193182

static volatile uint32_t pit_ticks = 0;
static uint32_t current_frequency = 100;

static void pit_callback(registers_t* regs) {
    (void)regs;
    pit_ticks++;
}

void pit_init(uint32_t frequency) {
    current_frequency = frequency;
    register_interrupt_handler(32, pit_callback); // IRQ0 = 32

    // Compute 16-bit divisor for target frequency
    uint32_t divisor = PIT_BASE_FREQUENCY / frequency;
    if (divisor > 65535) divisor = 65535;
    if (divisor == 0) divisor = 1;

    // Send control word: Channel 0, lobyte/hibyte access, Mode 3 (square wave), binary
    outb(PIT_COMMAND_PORT, 0x36);

    // Send divisor low byte then high byte
    outb(PIT_CHANNEL0_DATA_PORT, (uint8_t)(divisor & 0xFF));
    outb(PIT_CHANNEL0_DATA_PORT, (uint8_t)((divisor >> 8) & 0xFF));

    // Unmask IRQ0 on Master PIC
    pic_unmask_irq(0);

    kprintf("[NSK PIT] 8254 Timer configured at %u Hz (Divisor: %u)\n", frequency, divisor);
}

uint32_t pit_get_ticks(void) {
    return pit_ticks;
}

uint32_t pit_get_uptime_seconds(void) {
    if (current_frequency == 0) return 0;
    return pit_ticks / current_frequency;
}

void pit_sleep(uint32_t ms) {
    uint32_t target_ticks = pit_ticks + (ms * current_frequency / 1000);
    while (pit_ticks < target_ticks) {
        __asm__ volatile ("hlt");
    }
}
