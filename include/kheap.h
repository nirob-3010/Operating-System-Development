/**
 * NSK OS v0.3 - Dynamic Kernel Heap Allocator (kmalloc / kfree)
 */
#ifndef NSK_KHEAP_H
#define NSK_KHEAP_H

#include "types.h"

#define KHEAP_START        0x00400000 // 4 MB mark (well above kernel binary and PMM bitmap)
#define KHEAP_INITIAL_SIZE (32 * 1024 * 1024) // 32 MB heap pool for graphics & backbuffer

void  kheap_init(uintptr_t start_addr, size_t size);
void* kmalloc(size_t size);
void* kmalloc_aligned(size_t size, size_t alignment);
void* kcalloc(size_t num, size_t size);
void* krealloc(void* ptr, size_t new_size);
void  kfree(void* ptr);

size_t kheap_get_used_bytes(void);
size_t kheap_get_free_bytes(void);

#endif /* NSK_KHEAP_H */
