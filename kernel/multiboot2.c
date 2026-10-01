/**
 * NSK OS v0.3 - Multiboot 1 and Multiboot 2 Information Parser
 */
#include "multiboot2.h"
#include "printf.h"
#include "string.h"

void multiboot_parse(uint32_t magic, uint32_t addr, multiboot_info_parsed_t* parsed) {
    memset(parsed, 0, sizeof(multiboot_info_parsed_t));

    if (magic == MULTIBOOT1_BOOTLOADER_MAGIC) {
        parsed->protocol_version = 1;
        parsed->mb1_info = (struct multiboot1_info*)addr;
        strcpy(parsed->bootloader_name, "QEMU/Multiboot1");

        kprintf("[NSK MULTIBOOT] Multiboot 1 header detected at 0x%p (Magic: 0x%x)\n", addr, magic);

        if (parsed->mb1_info->flags & 0x01) {
            parsed->total_memory_kb = parsed->mb1_info->mem_upper + 1024;
            kprintf("[NSK MULTIBOOT] Memory reported: lower=%u KB, upper=%u KB (Total ~%u MB)\n",
                    parsed->mb1_info->mem_lower, parsed->mb1_info->mem_upper,
                    parsed->total_memory_kb / 1024);
        }

        if (parsed->mb1_info->flags & (1 << 9)) {
            char* name = (char*)parsed->mb1_info->boot_loader_name;
            if (name) {
                strncpy(parsed->bootloader_name, name, sizeof(parsed->bootloader_name) - 1);
            }
        }
        kprintf("[NSK MULTIBOOT] Bootloader: %s\n", parsed->bootloader_name);

        if (parsed->mb1_info->flags & (1 << 12)) {
            kprintf("[NSK MULTIBOOT] MB1 Framebuffer: %ux%u@%ubpp (Addr: %p, Pitch: %u)\n",
                    parsed->mb1_info->framebuffer_width,
                    parsed->mb1_info->framebuffer_height,
                    parsed->mb1_info->framebuffer_bpp,
                    (void*)(uint32_t)(parsed->mb1_info->framebuffer_addr & 0xFFFFFFFF),
                    parsed->mb1_info->framebuffer_pitch);
        }
        return;
    }

    if (magic == MULTIBOOT2_BOOTLOADER_MAGIC) {
        parsed->protocol_version = 2;
        strcpy(parsed->bootloader_name, "GRUB/Multiboot2");

        kprintf("[NSK MULTIBOOT] Multiboot 2 header detected at 0x%p (Magic: 0x%x)\n", addr, magic);

        struct multiboot_tag* tag;
        for (tag = (struct multiboot_tag*)(addr + 8);
             tag->type != MULTIBOOT_TAG_TYPE_END;
             tag = (struct multiboot_tag*)((uint8_t*)tag + ((tag->size + 7) & ~7))) {

            switch (tag->type) {
                case MULTIBOOT_TAG_TYPE_BOOT_LOADER_NAME: {
                    struct multiboot_tag_string* str_tag = (struct multiboot_tag_string*)tag;
                    strncpy(parsed->bootloader_name, str_tag->string, sizeof(parsed->bootloader_name) - 1);
                    kprintf("[NSK MULTIBOOT] Bootloader: %s\n", parsed->bootloader_name);
                    break;
                }
                case MULTIBOOT_TAG_TYPE_MMAP: {
                    parsed->mmap_tag = (struct multiboot_tag_mmap*)tag;
                    break;
                }
                case MULTIBOOT_TAG_TYPE_FRAMEBUFFER: {
                    parsed->fb_tag = (struct multiboot_tag_framebuffer*)tag;
                    kprintf("[NSK MULTIBOOT] Framebuffer: %ux%u@%ubpp (Addr: 0x%x%08x, Pitch: %u)\n",
                            parsed->fb_tag->framebuffer_width,
                            parsed->fb_tag->framebuffer_height,
                            parsed->fb_tag->framebuffer_bpp,
                            (uint32_t)(parsed->fb_tag->framebuffer_addr >> 32),
                            (uint32_t)(parsed->fb_tag->framebuffer_addr & 0xFFFFFFFF),
                            parsed->fb_tag->framebuffer_pitch);
                    break;
                }
                default:
                    break;
            }
        }
        return;
    }

    kprintf("[NSK MULTIBOOT] Notice: Unknown boot magic 0x%x (proceeding with safe defaults)\n", magic);
}
