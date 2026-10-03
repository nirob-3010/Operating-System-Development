/**
 * NSK OS v0.3 - Kernel Formatted Printing Engine
 */
#ifndef NSK_PRINTF_H
#define NSK_PRINTF_H

#include "types.h"
#include <stdarg.h>

int kprintf(const char* fmt, ...);
int ksprintf(char* buf, const char* fmt, ...);
int kvprintf(const char* fmt, va_list args);
int vsnprintf(char* buf, size_t size, const char* fmt, va_list args);
int snprintf(char* buf, size_t size, const char* fmt, ...);

#endif /* NSK_PRINTF_H */
