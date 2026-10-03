/**
 * NSK OS v0.3 - PS/2 Keyboard Driver (Phase 3)
 * Decodes Scan Code Set 1 with circular input buffer
 */
#include "keyboard.h"
#include "idt.h"
#include "pic.h"
#include "io.h"
#include "printf.h"

#define KBD_BUFFER_SIZE 64

static char kbd_buffer[KBD_BUFFER_SIZE];
static int  kbd_head = 0;
static int  kbd_tail = 0;
static bool shift_pressed = false;

static const char kbd_us_lower[128] = {
    0,  27, '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', '\b',
    '\t', 'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']', '\n',
    0, // Control
    'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', '\'', '`',
    0, // Left Shift
    '\\', 'z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/',
    0, // Right Shift
    '*',
    0, // Alt
    ' ', // Space
    0, // Caps Lock
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, // F1-F10
    0, 0, // Num Lock, Scroll Lock
    0, 0, 0, '-', 0, 0, 0, '+', 0, 0, 0, 0, 0, 0, 0, 0, // Keypad
    0, 0, 0, // F11, F12
};

static const char kbd_us_upper[128] = {
    0,  27, '!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '_', '+', '\b',
    '\t', 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '{', '}', '\n',
    0, // Control
    'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ':', '"', '~',
    0, // Left Shift
    '|', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '<', '>', '?',
    0, // Right Shift
    '*',
    0, // Alt
    ' ', // Space
    0, // Caps Lock
};

static void keyboard_interrupt_handler(registers_t* regs) {
    (void)regs;
    uint8_t scancode = inb(0x60);

    // Track Shift key
    if (scancode == 0x2A || scancode == 0x36) {
        shift_pressed = true;
        return;
    } else if (scancode == 0xAA || scancode == 0xB6) {
        shift_pressed = false;
        return;
    }

    // Ignore key releases (high bit set)
    if (scancode & 0x80) return;

    char c = shift_pressed ? kbd_us_upper[scancode] : kbd_us_lower[scancode];
    if (c != 0) {
        int next = (kbd_head + 1) % KBD_BUFFER_SIZE;
        if (next != kbd_tail) {
            kbd_buffer[kbd_head] = c;
            kbd_head = next;
        }
    }
}

void keyboard_init(void) {
    kbd_head = 0;
    kbd_tail = 0;
    shift_pressed = false;

    // Register IRQ 1 handler (Interrupt 33 = 32 + 1)
    register_interrupt_handler(33, keyboard_interrupt_handler);

    // Unmask IRQ 1 in PIC
    pic_unmask_irq(1);

    kprintf("[NSK KBD] PS/2 Keyboard driver initialized (IRQ 1 active)\n");
}

bool keyboard_has_char(void) {
    return (kbd_head != kbd_tail);
}

char keyboard_get_char(void) {
    if (kbd_head == kbd_tail) return 0;
    char c = kbd_buffer[kbd_tail];
    kbd_tail = (kbd_tail + 1) % KBD_BUFFER_SIZE;
    return c;
}
