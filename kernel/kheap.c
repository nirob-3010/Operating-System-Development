/**
 * NSK OS v0.3 - Kernel Heap Allocator (kmalloc / kfree)
 * Doubly-linked explicit free list with boundary tags and coalescing
 */
#include "kheap.h"
#include "printf.h"
#include "string.h"

#define KHEAP_MAGIC 0x4E534B48 // "NSKH" in ASCII

typedef struct heap_block_header {
    uint32_t magic;
    size_t   size;       // Size of data payload
    bool     is_free;
    struct heap_block_header* next;
    struct heap_block_header* prev;
} heap_block_header_t;

static heap_block_header_t* heap_start_block = NULL;
static uintptr_t heap_base_addr = 0;
static size_t   heap_total_size = 0;
static size_t   heap_allocated_bytes = 0;

void kheap_init(uintptr_t start_addr, size_t size) {
    heap_base_addr = start_addr;
    heap_total_size = size;
    heap_allocated_bytes = 0;

    heap_start_block = (heap_block_header_t*)start_addr;
    heap_start_block->magic = KHEAP_MAGIC;
    heap_start_block->size = size - sizeof(heap_block_header_t);
    heap_start_block->is_free = true;
    heap_start_block->next = NULL;
    heap_start_block->prev = NULL;

    kprintf("[NSK HEAP] Kernel heap initialized at %p (Size: %u MB)\n",
            (void*)start_addr, (uint32_t)(size / (1024 * 1024)));
}

void* kmalloc(size_t size) {
    if (size == 0) return NULL;

    // Align size to 8-byte boundary
    size = (size + 7) & ~7;

    heap_block_header_t* curr = heap_start_block;
    while (curr != NULL) {
        if (curr->magic != KHEAP_MAGIC) {
            kprintf("[NSK HEAP] PANIC: Corrupted heap block magic at 0x%p!\n", curr);
            return NULL;
        }

        if (curr->is_free && curr->size >= size) {
            // Check if we can split this block
            if (curr->size >= size + sizeof(heap_block_header_t) + 16) {
                heap_block_header_t* next_block = (heap_block_header_t*)((uint8_t*)curr + sizeof(heap_block_header_t) + size);
                next_block->magic = KHEAP_MAGIC;
                next_block->size = curr->size - size - sizeof(heap_block_header_t);
                next_block->is_free = true;
                next_block->next = curr->next;
                next_block->prev = curr;

                if (curr->next != NULL) {
                    curr->next->prev = next_block;
                }
                curr->next = next_block;
                curr->size = size;
            }

            curr->is_free = false;
            heap_allocated_bytes += curr->size;
            return (void*)((uint8_t*)curr + sizeof(heap_block_header_t));
        }

        curr = curr->next;
    }

    kprintf("[NSK HEAP] ERROR: Out of heap memory! (Requested %u bytes)\n", (uint32_t)size);
    return NULL;
}

void* kmalloc_aligned(size_t size, size_t alignment) {
    // Basic aligned allocation: over-allocate and align
    size_t total_size = size + alignment + sizeof(void*);
    void* raw_ptr = kmalloc(total_size);
    if (!raw_ptr) return NULL;

    uintptr_t raw_addr = (uintptr_t)raw_ptr + sizeof(void*);
    uintptr_t aligned_addr = (raw_addr + (alignment - 1)) & ~(alignment - 1);

    // Store raw pointer immediately before aligned pointer
    *((void**)(aligned_addr - sizeof(void*))) = raw_ptr;

    return (void*)aligned_addr;
}

void* kcalloc(size_t num, size_t size) {
    size_t total = num * size;
    void* ptr = kmalloc(total);
    if (ptr) {
        memset(ptr, 0, total);
    }
    return ptr;
}

void* krealloc(void* ptr, size_t new_size) {
    if (!ptr) return kmalloc(new_size);
    if (new_size == 0) {
        kfree(ptr);
        return NULL;
    }

    heap_block_header_t* header = (heap_block_header_t*)((uint8_t*)ptr - sizeof(heap_block_header_t));
    if (header->magic != KHEAP_MAGIC) {
        kprintf("[NSK HEAP] ERROR: Invalid pointer passed to krealloc: 0x%p\n", ptr);
        return NULL;
    }

    if (header->size >= new_size) {
        return ptr;
    }

    void* new_ptr = kmalloc(new_size);
    if (new_ptr) {
        memcpy(new_ptr, ptr, header->size);
        kfree(ptr);
    }
    return new_ptr;
}

void kfree(void* ptr) {
    if (!ptr) return;

    heap_block_header_t* header = (heap_block_header_t*)((uint8_t*)ptr - sizeof(heap_block_header_t));
    if (header->magic != KHEAP_MAGIC) {
        kprintf("[NSK HEAP] ERROR: Attempted to kfree invalid block at 0x%p (magic: 0x%x)\n",
                ptr, header->magic);
        return;
    }

    header->is_free = true;
    if (heap_allocated_bytes >= header->size) {
        heap_allocated_bytes -= header->size;
    }

    // Coalesce with next block if free
    if (header->next != NULL && header->next->is_free) {
        header->size += sizeof(heap_block_header_t) + header->next->size;
        header->next = header->next->next;
        if (header->next != NULL) {
            header->next->prev = header;
        }
    }

    // Coalesce with prev block if free
    if (header->prev != NULL && header->prev->is_free) {
        header->prev->size += sizeof(heap_block_header_t) + header->size;
        header->prev->next = header->next;
        if (header->next != NULL) {
            header->next->prev = header->prev;
        }
    }
}

size_t kheap_get_used_bytes(void) {
    return heap_allocated_bytes;
}

size_t kheap_get_free_bytes(void) {
    if (heap_allocated_bytes > heap_total_size) return 0;
    return heap_total_size - heap_allocated_bytes;
}
