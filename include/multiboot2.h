/**
 * NSK OS v0.3 - Multiboot 1 & Multiboot 2 Specification Headers & Structures
 */
#ifndef NSK_MULTIBOOT_H
#define NSK_MULTIBOOT_H

#include "types.h"

// Magic numbers passed by bootloader in EAX
#define MULTIBOOT1_BOOTLOADER_MAGIC       0x2BADB002
#define MULTIBOOT2_BOOTLOADER_MAGIC       0x36D76289

// -----------------------------------------------------------------------------
// Multiboot 1 Definitions (used by direct QEMU -kernel)
// -----------------------------------------------------------------------------
struct multiboot1_mmap_entry {
    uint32_t size;
    uint64_t addr;
    uint64_t len;
    uint32_t type;
} __attribute__((packed));

struct multiboot1_info {
    uint32_t flags;
    uint32_t mem_lower;
    uint32_t mem_upper;
    uint32_t boot_device;
    uint32_t cmdline;
    uint32_t mods_count;
    uint32_t mods_addr;
    uint32_t num;
    uint32_t size;
    uint32_t addr;
    uint32_t shndx;
    uint32_t mmap_length;
    uint32_t mmap_addr;
    uint32_t drives_length;
    uint32_t drives_addr;
    uint32_t config_table;
    uint32_t boot_loader_name;
    uint32_t apm_table;
    uint32_t vbe_control_info;
    uint32_t vbe_mode_info;
    uint16_t vbe_mode;
    uint16_t vbe_interface_seg;
    uint16_t vbe_interface_off;
    uint16_t vbe_interface_len;
    uint64_t framebuffer_addr;
    uint32_t framebuffer_pitch;
    uint32_t framebuffer_width;
    uint32_t framebuffer_height;
    uint8_t  framebuffer_bpp;
    uint8_t  framebuffer_type;
} __attribute__((packed));

// -----------------------------------------------------------------------------
// Multiboot 2 Definitions (used by GRUB 2 ISO boot)
// -----------------------------------------------------------------------------
#define MULTIBOOT_TAG_TYPE_END            0
#define MULTIBOOT_TAG_TYPE_CMDLINE        1
#define MULTIBOOT_TAG_TYPE_BOOT_LOADER_NAME 2
#define MULTIBOOT_TAG_TYPE_MODULE         3
#define MULTIBOOT_TAG_TYPE_BASIC_MEMINFO  4
#define MULTIBOOT_TAG_TYPE_BOOTDEV        5
#define MULTIBOOT_TAG_TYPE_MMAP           6
#define MULTIBOOT_TAG_TYPE_VBE            7
#define MULTIBOOT_TAG_TYPE_FRAMEBUFFER    8

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
    int protocol_version; // 1 = Multiboot1, 2 = Multiboot2
    char bootloader_name[64];
    struct multiboot_tag_mmap* mmap_tag;
    struct multiboot1_info* mb1_info;
    struct multiboot_tag_framebuffer* fb_tag;
    uint32_t total_memory_kb;
} multiboot_info_parsed_t;

void multiboot_parse(uint32_t magic, uint32_t addr, multiboot_info_parsed_t* parsed);

#endif /* NSK_MULTIBOOT_H */
