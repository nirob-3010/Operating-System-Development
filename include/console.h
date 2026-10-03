/**
 * NSK OS v0.3 - Unified Screen Console Driver
 * Supports both Linear Framebuffer (32bpp) and VGA Text Mode (0xB8000)
 */
#ifndef NSK_CONSOLE_H
#define NSK_CONSOLE_H

#include "types.h"
#include "multiboot2.h"

void console_init(multiboot_info_parsed_t* mbi);
void console_putc(char c);
void console_write(const char* str);
void console_clear(uint32_t color);

#endif /* NSK_CONSOLE_H */
