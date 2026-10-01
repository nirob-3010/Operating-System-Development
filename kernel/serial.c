/**
 * NSK OS v0.3 - COM1 UART Serial Port Implementation (Port 0x3F8)
 * Standard 16550 UART driver
 */
#include "serial.h"
#include "io.h"

int serial_init(void) {
    outb(COM1_PORT + 1, 0x00);    // Disable all interrupts
    outb(COM1_PORT + 3, 0x80);    // Enable DLAB (set baud rate divisor)
    outb(COM1_PORT + 0, 0x03);    // Set divisor to 3 (lo byte) -> 38,400 baud
    outb(COM1_PORT + 1, 0x00);    //                  (hi byte)
    outb(COM1_PORT + 3, 0x03);    // 8 bits, no parity, one stop bit (8N1)
    outb(COM1_PORT + 2, 0xC7);    // Enable FIFO, clear TX/RX queues, 14-byte threshold
    outb(COM1_PORT + 4, 0x0B);    // Normal mode: RTS/DSR set, OUT2 enabled (interrupt line active)
    return 0;
}

int serial_received(void) {
    return inb(COM1_PORT + 5) & 1;
}

char serial_read(void) {
    while (serial_received() == 0);
    return (char)inb(COM1_PORT);
}

static int is_transmit_empty(void) {
    return inb(COM1_PORT + 5) & 0x20;
}

void serial_putc(char c) {
    // Wait for transmit buffer to empty, with timeout guard to prevent locking
    int timeout = 100000;
    while (!is_transmit_empty() && --timeout > 0) {
        io_wait();
    }
    outb(COM1_PORT, (uint8_t)c);
}

void serial_write(const char* str) {
    while (*str) {
        if (*str == '\n') {
            serial_putc('\r');
        }
        serial_putc(*str++);
    }
}
