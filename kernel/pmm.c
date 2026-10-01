/**
 * NSK OS v0.3 - Physical Memory Manager (PMM)
 * Page Frame Allocator using Bitmap
 */
#include "pmm.h"
#include "printf.h"
#include "string.h"

static uint32_t* pmm_bitmap = NULL;
static uint32_t  pmm_max_blocks = 0;
static uint32_t  pmm_used_blocks = 0;
static uint32_t  pmm_total_memory = 0;

static inline void bitmap_set(uint32_t bit) {
    pmm_bitmap[bit / 32] |= (1 << (bit % 32));
}

static inline void bitmap_unset(uint32_t bit) {
    pmm_bitmap[bit / 32] &= ~(1 << (bit % 32));
}

static inline bool bitmap_test(uint32_t bit) {
    return (pmm_bitmap[bit / 32] & (1 << (bit % 32))) != 0;
}

static int bitmap_first_free(void) {
    for (uint32_t i = 0; i < pmm_max_blocks / 32; i++) {
        if (pmm_bitmap[i] != 0xFFFFFFFF) {
            for (int j = 0; j < 32; j++) {
                int bit = 1 << j;
                if (!(pmm_bitmap[i] & bit)) {
                    return (i * 32) + j;
                }
            }
        }
    }
    return -1;
}

void pmm_init(struct multiboot_tag_mmap* mmap, uint32_t kernel_start, uint32_t kernel_end) {
    uint64_t highest_address = 0;

    kprintf("\n[NSK PMM] ==================== MULTIBOOT2 MEMORY MAP ====================\n");

    if (mmap == NULL) {
        kprintf("[NSK PMM] WARNING: No memory map provided by bootloader! Defaulting to 128MB.\n");
        highest_address = 128 * 1024 * 1024;
    } else {
        uint32_t num_entries = (mmap->size - sizeof(struct multiboot_tag_mmap)) / mmap->entry_size;
        for (uint32_t i = 0; i < num_entries; i++) {
            struct multiboot_mmap_entry* entry = (struct multiboot_mmap_entry*)
                ((uint8_t*)mmap->entries + (i * mmap->entry_size));

            const char* type_str = "RESERVED";
            if (entry->type == MULTIBOOT_MEMORY_AVAILABLE) {
                type_str = "AVAILABLE";
                uint64_t end = entry->addr + entry->len;
                if (end > highest_address) {
                    highest_address = end;
                }
            } else if (entry->type == MULTIBOOT_MEMORY_ACPI_RECLAIMABLE) {
                type_str = "ACPI RECLAIM";
            } else if (entry->type == MULTIBOOT_MEMORY_NVS) {
                type_str = "ACPI NVS";
            } else if (entry->type == MULTIBOOT_MEMORY_BADRAM) {
                type_str = "BAD RAM";
            }

            uint32_t base_low = (uint32_t)(entry->addr & 0xFFFFFFFF);
            uint32_t len_low = (uint32_t)(entry->len & 0xFFFFFFFF);
            uint32_t len_kb = len_low / 1024;

            kprintf("  Region %2u: [0x%p - 0x%p] %7u KB | Type: %s\n",
                    i, base_low, base_low + len_low - 1, len_kb, type_str);
        }
    }
    kprintf("[NSK PMM] ==============================================================\n");

    // Clamp highest address to 32-bit addressable range (up to 4 GB)
    if (highest_address > 0xFFFFFFFF) highest_address = 0xFFFFFFFF;
    if (highest_address == 0) highest_address = 256 * 1024 * 1024; // 256 MB fallback

    pmm_total_memory = (uint32_t)highest_address;
    pmm_max_blocks = pmm_total_memory / PMM_BLOCK_SIZE;
    pmm_used_blocks = pmm_max_blocks; // Initially mark all as used (safe default)

    // Place the bitmap immediately after kernel_end (aligned to 4KB)
    uint32_t bitmap_addr = (kernel_end + 0xFFF) & ~0xFFF;
    pmm_bitmap = (uint32_t*)bitmap_addr;
    uint32_t bitmap_size_bytes = pmm_max_blocks / 8;
    uint32_t bitmap_end = bitmap_addr + bitmap_size_bytes;

    // Fill bitmap with 1s (all memory reserved)
    memset(pmm_bitmap, 0xFF, bitmap_size_bytes);

    // Free all available memory chunks reported by Multiboot2
    if (mmap != NULL) {
        uint32_t num_entries = (mmap->size - sizeof(struct multiboot_tag_mmap)) / mmap->entry_size;
        for (uint32_t i = 0; i < num_entries; i++) {
            struct multiboot_mmap_entry* entry = (struct multiboot_mmap_entry*)
                ((uint8_t*)mmap->entries + (i * mmap->entry_size));

            if (entry->type == MULTIBOOT_MEMORY_AVAILABLE) {
                uint32_t start_block = (uint32_t)(entry->addr / PMM_BLOCK_SIZE);
                uint32_t count = (uint32_t)(entry->len / PMM_BLOCK_SIZE);

                for (uint32_t b = 0; b < count; b++) {
                    uint32_t block = start_block + b;
                    if (block < pmm_max_blocks) {
                        bitmap_unset(block);
                        pmm_used_blocks--;
                    }
                }
            }
        }
    }

    // Now re-reserve critical zones:
    // 1. Lower 1MB (BIOS IVT, BDA, EBDA, Video memory VGA/VBE)
    uint32_t lower_1mb_blocks = (1024 * 1024) / PMM_BLOCK_SIZE;
    for (uint32_t b = 0; b < lower_1mb_blocks; b++) {
        if (!bitmap_test(b)) {
            bitmap_set(b);
            pmm_used_blocks++;
        }
    }

    // 2. Kernel code, data, and BSS (kernel_start to kernel_end)
    uint32_t kstart_block = kernel_start / PMM_BLOCK_SIZE;
    uint32_t kend_block = (kernel_end + PMM_BLOCK_SIZE - 1) / PMM_BLOCK_SIZE;
    for (uint32_t b = kstart_block; b <= kend_block; b++) {
        if (!bitmap_test(b)) {
            bitmap_set(b);
            pmm_used_blocks++;
        }
    }

    // 3. PMM Bitmap itself
    uint32_t bm_start_block = bitmap_addr / PMM_BLOCK_SIZE;
    uint32_t bm_end_block = (bitmap_end + PMM_BLOCK_SIZE - 1) / PMM_BLOCK_SIZE;
    for (uint32_t b = bm_start_block; b <= bm_end_block; b++) {
        if (!bitmap_test(b)) {
            bitmap_set(b);
            pmm_used_blocks++;
        }
    }

    kprintf("[NSK PMM] Memory Manager Initialized:\n");
    kprintf("  Total RAM  : %u MB (%u blocks of 4KB)\n", pmm_total_memory / (1024 * 1024), pmm_max_blocks);
    kprintf("  Used Blocks: %u (%u KB)\n", pmm_used_blocks, (pmm_used_blocks * 4));
    kprintf("  Free Blocks: %u (%u MB)\n", (pmm_max_blocks - pmm_used_blocks),
            ((pmm_max_blocks - pmm_used_blocks) * 4) / 1024);
    kprintf("  Bitmap Loc : 0x%p - 0x%p (%u KB)\n", bitmap_addr, bitmap_end, bitmap_size_bytes / 1024);
}

void* pmm_alloc_block(void) {
    if (pmm_max_blocks - pmm_used_blocks <= 0) {
        return NULL; // Out of physical memory
    }

    int frame = bitmap_first_free();
    if (frame == -1) {
        return NULL;
    }

    bitmap_set(frame);
    pmm_used_blocks++;

    uint32_t addr = frame * PMM_BLOCK_SIZE;
    return (void*)addr;
}

void pmm_free_block(void* ptr) {
    uint32_t addr = (uint32_t)ptr;
    uint32_t frame = addr / PMM_BLOCK_SIZE;

    if (frame < pmm_max_blocks && bitmap_test(frame)) {
        bitmap_unset(frame);
        pmm_used_blocks--;
    }
}

uint32_t pmm_get_total_memory(void) {
    return pmm_total_memory;
}

uint32_t pmm_get_used_memory(void) {
    return pmm_used_blocks * PMM_BLOCK_SIZE;
}

uint32_t pmm_get_free_memory(void) {
    return (pmm_max_blocks - pmm_used_blocks) * PMM_BLOCK_SIZE;
}

uint32_t pmm_get_total_blocks(void) {
    return pmm_max_blocks;
}

uint32_t pmm_get_used_blocks(void) {
    return pmm_used_blocks;
}
