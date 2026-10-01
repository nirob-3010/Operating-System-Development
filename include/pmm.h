/**
 * NSK OS v0.3 - Physical Memory Manager (Bitmap-based Page Frame Allocator)
 */
#ifndef NSK_PMM_H
#define NSK_PMM_H

#include "types.h"
#include "multiboot2.h"

#define PMM_BLOCK_SIZE     4096 // 4 KB page frames
#define PMM_BLOCKS_PER_BYTE 8

void pmm_init(multiboot_info_parsed_t* mbi, uint32_t kernel_start, uint32_t kernel_end);
void* pmm_alloc_block(void);
void  pmm_free_block(void* ptr);

uint32_t pmm_get_total_memory(void);
uint32_t pmm_get_used_memory(void);
uint32_t pmm_get_free_memory(void);
uint32_t pmm_get_total_blocks(void);
uint32_t pmm_get_used_blocks(void);
static inline uint32_t pmm_get_total_frames(void) { return pmm_get_total_blocks(); }
static inline uint32_t pmm_get_used_frames(void)  { return pmm_get_used_blocks(); }

#endif /* NSK_PMM_H */
