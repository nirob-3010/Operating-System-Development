/**
 * NSK OS v0.3 - COM1 Serial Port Driver (UART 16550)
 */
#ifndef NSK_SERIAL_H
#define NSK_SERIAL_H

#include "types.h"

#define COM1_PORT 0x3F8

int  serial_init(void);
void serial_putc(char c);
void serial_write(const char* str);
char serial_read(void);
int  serial_received(void);

#endif /* NSK_SERIAL_H */
