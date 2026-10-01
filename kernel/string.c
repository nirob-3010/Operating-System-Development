/**
 * NSK OS v0.3 - Freestanding String Implementation
 */
#include "string.h"

void* memset(void* dest, int val, size_t len) {
    uint8_t* ptr = (uint8_t*)dest;
    uint8_t v = (uint8_t)val;
    for (size_t i = 0; i < len; i++) {
        ptr[i] = v;
    }
    return dest;
}

void* memcpy(void* dest, const void* src, size_t len) {
    // Word-at-a-time copy: this is the hot path for every framebuffer blit
    // (wallpaper cache, desktop buffer, back-to-front swaps), so avoid a byte loop.
    void* ret = dest;
    size_t dwords = len >> 2;
    size_t tail = len & 3;
    __asm__ volatile ("cld; rep movsl" : "+D"(dest), "+S"(src), "+c"(dwords) : : "memory");
    __asm__ volatile ("rep movsb"      : "+D"(dest), "+S"(src), "+c"(tail)   : : "memory");
    return ret;
}

void* memmove(void* dest, const void* src, size_t len) {
    uint8_t* d = (uint8_t*)dest;
    const uint8_t* s = (const uint8_t*)src;
    if (d < s) {
        for (size_t i = 0; i < len; i++) {
            d[i] = s[i];
        }
    } else {
        for (size_t i = len; i > 0; i--) {
            d[i - 1] = s[i - 1];
        }
    }
    return dest;
}

int memcmp(const void* s1, const void* s2, size_t len) {
    const uint8_t* p1 = (const uint8_t*)s1;
    const uint8_t* p2 = (const uint8_t*)s2;
    for (size_t i = 0; i < len; i++) {
        if (p1[i] != p2[i]) {
            return p1[i] - p2[i];
        }
    }
    return 0;
}

size_t strlen(const char* str) {
    size_t len = 0;
    while (str[len] != '\0') {
        len++;
    }
    return len;
}

int strcmp(const char* s1, const char* s2) {
    while (*s1 && (*s1 == *s2)) {
        s1++;
        s2++;
    }
    return *(const unsigned char*)s1 - *(const unsigned char*)s2;
}

int strncmp(const char* s1, const char* s2, size_t n) {
    while (n && *s1 && (*s1 == *s2)) {
        s1++;
        s2++;
        n--;
    }
    if (n == 0) return 0;
    return *(const unsigned char*)s1 - *(const unsigned char*)s2;
}

char* strcpy(char* dest, const char* src) {
    char* orig = dest;
    while ((*dest++ = *src++) != '\0') {}
    return orig;
}

char* strncpy(char* dest, const char* src, size_t n) {
    char* orig = dest;
    size_t i = 0;
    for (; i < n && src[i] != '\0'; i++) {
        dest[i] = src[i];
    }
    for (; i < n; i++) {
        dest[i] = '\0';
    }
    return orig;
}
