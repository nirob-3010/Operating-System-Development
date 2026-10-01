/**
 * NSK OS v0.3 - Kernel kprintf Engine
 */
#include "printf.h"
#include "serial.h"
#include "string.h"

static void utoa_internal(uint32_t value, char* str, int base) {
    char buf[36];
    int i = 0;
    const char* digits = "0123456789ABCDEF";

    if (value == 0) {
        str[0] = '0';
        str[1] = '\0';
        return;
    }

    while (value != 0) {
        buf[i++] = digits[value % base];
        value /= base;
    }

    int j = 0;
    while (i > 0) {
        str[j++] = buf[--i];
    }
    str[j] = '\0';
}

static void itoa_internal(int32_t value, char* str, int base) {
    if (base == 10 && value < 0) {
        *str++ = '-';
        utoa_internal((uint32_t)(-value), str, 10);
    } else {
        utoa_internal((uint32_t)value, str, base);
    }
}

int kvprintf(const char* fmt, va_list args) {
    char num_buf[36];
    int written = 0;

    for (size_t i = 0; fmt[i] != '\0'; i++) {
        if (fmt[i] == '%') {
            i++;
            switch (fmt[i]) {
                case 'c': {
                    char c = (char)va_arg(args, int);
                    serial_putc(c);
                    written++;
                    break;
                }
                case 's': {
                    const char* s = va_arg(args, const char*);
                    if (!s) s = "(null)";
                    while (*s) {
                        serial_putc(*s++);
                        written++;
                    }
                    break;
                }
                case 'd':
                case 'i': {
                    int32_t d = va_arg(args, int32_t);
                    itoa_internal(d, num_buf, 10);
                    for (int j = 0; num_buf[j] != '\0'; j++) {
                        serial_putc(num_buf[j]);
                        written++;
                    }
                    break;
                }
                case 'u': {
                    uint32_t u = va_arg(args, uint32_t);
                    utoa_internal(u, num_buf, 10);
                    for (int j = 0; num_buf[j] != '\0'; j++) {
                        serial_putc(num_buf[j]);
                        written++;
                    }
                    break;
                }
                case 'x':
                case 'X': {
                    uint32_t x = va_arg(args, uint32_t);
                    utoa_internal(x, num_buf, 16);
                    for (int j = 0; num_buf[j] != '\0'; j++) {
                        char ch = num_buf[j];
                        if (fmt[i] == 'x' && ch >= 'A' && ch <= 'F') {
                            ch += 32; // to lowercase
                        }
                        serial_putc(ch);
                        written++;
                    }
                    break;
                }
                case 'p': {
                    uint32_t p = (uint32_t)va_arg(args, void*);
                    serial_putc('0');
                    serial_putc('x');
                    written += 2;
                    utoa_internal(p, num_buf, 16);
                    // Pad with leading zeros up to 8 chars
                    int len = (int)strlen(num_buf);
                    for (int k = 0; k < 8 - len; k++) {
                        serial_putc('0');
                        written++;
                    }
                    for (int j = 0; num_buf[j] != '\0'; j++) {
                        char ch = num_buf[j];
                        if (ch >= 'A' && ch <= 'F') ch += 32;
                        serial_putc(ch);
                        written++;
                    }
                    break;
                }
                case '%': {
                    serial_putc('%');
                    written++;
                    break;
                }
                default:
                    serial_putc('%');
                    serial_putc(fmt[i]);
                    written += 2;
                    break;
            }
        } else {
            if (fmt[i] == '\n') {
                serial_putc('\r');
            }
            serial_putc(fmt[i]);
            written++;
        }
    }

    return written;
}

int kprintf(const char* fmt, ...) {
    va_list args;
    va_start(args, fmt);
    int written = kvprintf(fmt, args);
    va_end(args);
    return written;
}
