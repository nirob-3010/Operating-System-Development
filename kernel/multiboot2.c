/**
 * NSK OS v0.3 - Multiboot2 Information Parser
 */
#include "multiboot2.h"
#include "printf.h"
#include "string.h"

void multiboot2_parse(uint32_t magic, uint32_t addr, multiboot_info_parsed_t* parsed) {
    memset(parsed, 0, sizeof(multiboot_info_parsed_t));

    if (magic != MULTIBOOT2_BOOTLOADER_MAGIC) {
        kprintf("[NSK MULTIBOOT2] ERROR: Invalid magic 0x%x (expected 0x%x)\n",
                magic, MULTIBOOT2_BOOTLOADER_MAGIC);
        return;
    }

    kprintf("[NSK MULTIBOOT2] Valid Multiboot2 header detected at 0x%p\n", addr);

    struct multiboot_tag* tag;
    for (tag = (struct multiboot_tag*)(addr + 8);
         tag->type != MULTIBOOT_TAG_TYPE_END;
         tag = (struct multiboot_tag*)((uint8_t*)tag + ((tag->size + 7) & ~7))) {

        switch (tag->type) {
            case MULTIBOOT_TAG_TYPE_BOOT_LOADER_NAME: {
                struct multiboot_tag_string* str_tag = (struct multiboot_tag_string*)tag;
                strncpy(parsed->bootloader_name, str_tag->string, sizeof(parsed->bootloader_name) - 1);
                kprintf("[NSK MULTIBOOT2] Bootloader: %s\n", parsed->bootloader_name);
                break;
            }
            case MULTIBOOT_TAG_TYPE_MMAP: {
                parsed->mmap_tag = (struct multiboot_tag_mmap*)tag;
                break;
            }
            case MULTIBOOT_TAG_TYPE_FRAMEBUFFER: {
                parsed->fb_tag = (struct multiboot_tag_framebuffer*)tag;
                kprintf("[NSK MULTIBOOT2] Framebuffer: %ux%u@%ubpp (Addr: 0x%x%08x, Pitch: %u)\n",
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
}
