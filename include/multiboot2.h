/**
 * NSK OS v0.3 - Multiboot2 Specification Headers & Structures
 */
#ifndef NSK_MULTIBOOT2_H
#define NSK_MULTIBOOT2_H

#include "types.h"

#define MULTIBOOT2_BOOTLOADER_MAGIC       0x36D76289

#define MULTIBOOT_TAG_TYPE_END            0
#define MULTIBOOT_TAG_TYPE_CMDLINE        1
#define MULTIBOOT_TAG_TYPE_BOOT_LOADER_NAME 2
#define MULTIBOOT_TAG_TYPE_MODULE         3
#define MULTIBOOT_TAG_TYPE_BASIC_MEMINFO  4
#define MULTIBOOT_TAG_TYPE_BOOTDEV        5
#define MULTIBOOT_TAG_TYPE_MMAP           6
#define MULTIBOOT_TAG_TYPE_VBE            7
#define MULTIBOOT_TAG_TYPE_FRAMEBUFFER    8
#define MULTIBOOT_TAG_TYPE_ELF_SECTIONS   9
#define MULTIBOOT_TAG_TYPE_APM            10
#define MULTIBOOT_TAG_TYPE_EFI32          11
#define MULTIBOOT_TAG_TYPE_EFI64          12
#define MULTIBOOT_TAG_TYPE_SMBIOS         13
#define MULTIBOOT_TAG_TYPE_ACPI_OLD       14
#define MULTIBOOT_TAG_TYPE_ACPI_NEW       15
#define MULTIBOOT_TAG_TYPE_NETWORK        16
#define MULTIBOOT_TAG_TYPE_EFI_MMAP       17
#define MULTIBOOT_TAG_TYPE_EFI_BS         18

#define MULTIBOOT_MEMORY_AVAILABLE        1
#define MULTIBOOT_MEMORY_RESERVED         2
#define MULTIBOOT_MEMORY_ACPI_RECLAIMABLE 3
#define MULTIBOOT_MEMORY_NVS              4
#define MULTIBOOT_MEMORY_BADRAM           5

struct multiboot_tag {
    uint32_t type;
    uint32_t size;
} __attribute__((packed));

struct multiboot_mmap_entry {
    uint64_t addr;
    uint64_t len;
    uint32_t type;
    uint32_t zero;
} __attribute__((packed));

struct multiboot_tag_mmap {
    uint32_t type;
    uint32_t size;
    uint32_t entry_size;
    uint32_t entry_version;
    struct multiboot_mmap_entry entries[];
} __attribute__((packed));

struct multiboot_tag_string {
    uint32_t type;
    uint32_t size;
    char string[];
} __attribute__((packed));

struct multiboot_tag_framebuffer {
    uint32_t type;
    uint32_t size;
    uint64_t framebuffer_addr;
    uint32_t framebuffer_pitch;
    uint32_t framebuffer_width;
    uint32_t framebuffer_height;
    uint8_t  framebuffer_bpp;
    uint8_t  framebuffer_type;
    uint16_t reserved;
} __attribute__((packed));

typedef struct {
    char bootloader_name[64];
    struct multiboot_tag_mmap* mmap_tag;
    struct multiboot_tag_framebuffer* fb_tag;
    uint32_t total_memory_kb;
} multiboot_info_parsed_t;

void multiboot2_parse(uint32_t magic, uint32_t addr, multiboot_info_parsed_t* parsed);

#endif /* NSK_MULTIBOOT2_H */
