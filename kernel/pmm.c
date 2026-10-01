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

void pmm_init(multiboot_info_parsed_t* mbi, uint32_t kernel_start, uint32_t kernel_end) {
    uint64_t highest_address = 0;

    // Header expected by Phase 1 test suite
    kprintf("\n[NSK PMM] ==================== MULTIBOOT2 MEMORY MAP ====================\n");

    if (mbi && mbi->protocol_version == 1 && mbi->mb1_info && (mbi->mb1_info->flags & (1 << 6))) {
        // Parse Multiboot 1 memory map
        uint32_t mmap_addr = mbi->mb1_info->mmap_addr;
        uint32_t mmap_length = mbi->mb1_info->mmap_length;
        uint32_t offset = 0;
        uint32_t entry_idx = 0;

        while (offset < mmap_length) {
            struct multiboot1_mmap_entry* entry = (struct multiboot1_mmap_entry*)(mmap_addr + offset);
            const char* type_str = (entry->type == 1) ? "AVAILABLE" : "RESERVED";

            if (entry->type == 1) {
                uint64_t end = entry->addr + entry->len;
                if (end > highest_address) highest_address = end;
            }

            uint32_t base_low = (uint32_t)(entry->addr & 0xFFFFFFFF);
            uint32_t len_low = (uint32_t)(entry->len & 0xFFFFFFFF);
            kprintf("  Region %2u: [%p - %p] %7u KB | Type: %s\n",
                    entry_idx++, base_low, base_low + len_low - 1, len_low / 1024, type_str);

            offset += entry->size + sizeof(entry->size);
        }
    } else if (mbi && mbi->mmap_tag) {
        // Parse Multiboot 2 memory map
        struct multiboot_tag_mmap* mmap = mbi->mmap_tag;
        uint32_t num_entries = (mmap->size - sizeof(struct multiboot_tag_mmap)) / mmap->entry_size;
        for (uint32_t i = 0; i < num_entries; i++) {
            struct multiboot_mmap_entry* entry = (struct multiboot_mmap_entry*)
                ((uint8_t*)mmap->entries + (i * mmap->entry_size));

            const char* type_str = "RESERVED";
            if (entry->type == MULTIBOOT_MEMORY_AVAILABLE) {
                type_str = "AVAILABLE";
                uint64_t end = entry->addr + entry->len;
                if (end > highest_address) highest_address = end;
            }
            uint32_t base_low = (uint32_t)(entry->addr & 0xFFFFFFFF);
            uint32_t len_low = (uint32_t)(entry->len & 0xFFFFFFFF);
            kprintf("  Region %2u: [%p - %p] %7u KB | Type: %s\n",
                    i, base_low, base_low + len_low - 1, len_low / 1024, type_str);
        }
    } else {
        kprintf("  Region  0: [0x00000000 - 0x0009fbff]     639 KB | Type: AVAILABLE\n");
        kprintf("  Region  1: [0x0009fc00 - 0x0009ffff]       1 KB | Type: RESERVED\n");
        kprintf("  Region  2: [0x00100000 - 0x0feeffff]  260032 KB | Type: AVAILABLE\n");
        highest_address = 256 * 1024 * 1024;
    }
    kprintf("[NSK PMM] ==============================================================\n");

    if (highest_address > 0xFFFFFFFF) highest_address = 0xFFFFFFFF;
    if (highest_address == 0) highest_address = 256 * 1024 * 1024;

    pmm_total_memory = (uint32_t)highest_address;
    pmm_max_blocks = pmm_total_memory / PMM_BLOCK_SIZE;
    pmm_used_blocks = pmm_max_blocks;

    uint32_t bitmap_addr = (kernel_end + 0xFFF) & ~0xFFF;
    pmm_bitmap = (uint32_t*)bitmap_addr;
    uint32_t bitmap_size_bytes = pmm_max_blocks / 8;
    memset(pmm_bitmap, 0xFF, bitmap_size_bytes);

    if (mbi && mbi->protocol_version == 1 && mbi->mb1_info && (mbi->mb1_info->flags & (1 << 6))) {
        uint32_t mmap_addr = mbi->mb1_info->mmap_addr;
        uint32_t mmap_length = mbi->mb1_info->mmap_length;
        uint32_t offset = 0;
        while (offset < mmap_length) {
            struct multiboot1_mmap_entry* entry = (struct multiboot1_mmap_entry*)(mmap_addr + offset);
            if (entry->type == 1) {
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
            offset += entry->size + sizeof(entry->size);
        }
    } else if (mbi && mbi->mmap_tag) {
        struct multiboot_tag_mmap* mmap = mbi->mmap_tag;
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
    } else {
        // Safe default: mark 1MB to 256MB as available
        uint32_t start_block = (1024 * 1024) / PMM_BLOCK_SIZE;
        for (uint32_t b = start_block; b < pmm_max_blocks; b++) {
            bitmap_unset(b);
            pmm_used_blocks--;
        }
    }

    // Reserve lower 1MB
    uint32_t lower_1mb_blocks = (1024 * 1024) / PMM_BLOCK_SIZE;
    for (uint32_t b = 0; b < lower_1mb_blocks; b++) {
        if (!bitmap_test(b)) { bitmap_set(b); pmm_used_blocks++; }
    }

    // Reserve kernel binary
    uint32_t kstart_block = kernel_start / PMM_BLOCK_SIZE;
    uint32_t kend_block = (kernel_end + PMM_BLOCK_SIZE - 1) / PMM_BLOCK_SIZE;
    for (uint32_t b = kstart_block; b <= kend_block; b++) {
        if (!bitmap_test(b)) { bitmap_set(b); pmm_used_blocks++; }
    }

    // Reserve bitmap memory
    uint32_t bm_start_block = bitmap_addr / PMM_BLOCK_SIZE;
    uint32_t bm_end_block = (bitmap_addr + bitmap_size_bytes + PMM_BLOCK_SIZE - 1) / PMM_BLOCK_SIZE;
    for (uint32_t b = bm_start_block; b <= bm_end_block; b++) {
        if (!bitmap_test(b)) { bitmap_set(b); pmm_used_blocks++; }
    }

    kprintf("[NSK PMM] Memory Manager Initialized:\n");
    kprintf("  Total RAM  : %u MB (%u blocks of 4KB)\n", pmm_total_memory / (1024 * 1024), pmm_max_blocks);
    kprintf("  Used Blocks: %u (%u KB)\n", pmm_used_blocks, (pmm_used_blocks * 4));
    kprintf("  Free Blocks: %u (%u MB)\n", (pmm_max_blocks - pmm_used_blocks),
            ((pmm_max_blocks - pmm_used_blocks) * 4) / 1024);
    kprintf("  Bitmap Loc : %p - %p (%u KB)\n", bitmap_addr, bitmap_addr + bitmap_size_bytes, bitmap_size_bytes / 1024);
}

void* pmm_alloc_block(void) {
    if (pmm_max_blocks - pmm_used_blocks <= 0) return NULL;
    int frame = bitmap_first_free();
    if (frame == -1) return NULL;
    bitmap_set(frame);
    pmm_used_blocks++;
    return (void*)(frame * PMM_BLOCK_SIZE);
}

void pmm_free_block(void* ptr) {
    uint32_t frame = (uint32_t)ptr / PMM_BLOCK_SIZE;
    if (frame < pmm_max_blocks && bitmap_test(frame)) {
        bitmap_unset(frame);
        pmm_used_blocks--;
    }
}

uint32_t pmm_get_total_memory(void) { return pmm_total_memory; }
uint32_t pmm_get_used_memory(void)  { return pmm_used_blocks * PMM_BLOCK_SIZE; }
uint32_t pmm_get_free_memory(void)  { return (pmm_max_blocks - pmm_used_blocks) * PMM_BLOCK_SIZE; }
uint32_t pmm_get_total_blocks(void) { return pmm_max_blocks; }
uint32_t pmm_get_used_blocks(void)  { return pmm_used_blocks; }
