/**
 * NSK OS v0.3 - Freestanding String and Memory Manipulation Functions
 */
#ifndef NSK_STRING_H
#define NSK_STRING_H

#include "types.h"

void* memset(void* dest, int val, size_t len);
void* memcpy(void* dest, const void* src, size_t len);
void* memmove(void* dest, const void* src, size_t len);
int   memcmp(const void* s1, const void* s2, size_t len);

size_t strlen(const char* str);
int    strcmp(const char* s1, const char* s2);
int    strncmp(const char* s1, const char* s2, size_t n);
char*  strcpy(char* dest, const char* src);
char*  strncpy(char* dest, const char* src, size_t n);

#endif /* NSK_STRING_H */
