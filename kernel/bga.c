/**
 * NSK OS v0.3 - Bochs Graphics Adapter (BGA) & PCI Hardware Video Driver
 * Enables direct hardware linear framebuffer on QEMU, Limbo, Bochs, VirtualBox
 */
#include "bga.h"
#include "io.h"
#include "printf.h"

#define BGA_INDEX_PORT          0x01CE
#define BGA_DATA_PORT           0x01CF

#define BGA_REG_ID              0x00
#define BGA_REG_XRES            0x01
#define BGA_REG_YRES            0x02
#define BGA_REG_BPP             0x03
#define BGA_REG_ENABLE          0x04
#define BGA_REG_BANK            0x05
#define BGA_REG_VIRT_WIDTH      0x06
#define BGA_REG_VIRT_HEIGHT     0x07
#define BGA_REG_X_OFFSET        0x08
#define BGA_REG_Y_OFFSET        0x09

#define BGA_DISABLED            0x00
#define BGA_ENABLED             0x01
#define BGA_LFB_ENABLED         0x40
#define BGA_NOCLEARMEM          0x80

// PCI Configuration Ports
#define PCI_CONFIG_ADDRESS      0x0CF8
#define PCI_CONFIG_DATA         0x0CFC

static void bga_write(uint16_t index, uint16_t data) {
    outw(BGA_INDEX_PORT, index);
    outw(BGA_DATA_PORT, data);
}

static uint16_t bga_read(uint16_t index) {
    outw(BGA_INDEX_PORT, index);
    return inw(BGA_DATA_PORT);
}

static uint32_t pci_read_dword(uint8_t bus, uint8_t slot, uint8_t func, uint8_t offset) {
    uint32_t address = (uint32_t)((1U << 31) | ((uint32_t)bus << 16) |
                                  ((uint32_t)slot << 11) | ((uint32_t)func << 8) |
                                  (offset & 0xFC));
    outl(PCI_CONFIG_ADDRESS, address);
    return inl(PCI_CONFIG_DATA);
}

static uint16_t pci_read_word(uint8_t bus, uint8_t slot, uint8_t func, uint8_t offset) {
    uint32_t val = pci_read_dword(bus, slot, func, offset);
    return (uint16_t)((val >> ((offset & 2) * 8)) & 0xFFFF);
}

static uint32_t bga_lfb_address = 0;

uint32_t bga_get_framebuffer_addr(void) {
    if (bga_lfb_address != 0) return bga_lfb_address;

    // Search PCI bus 0 and 1 for VGA / BGA Display Controller
    for (uint16_t bus = 0; bus < 2; bus++) {
        for (uint8_t slot = 0; slot < 32; slot++) {
            for (uint8_t func = 0; func < 8; func++) {
                uint16_t vendor = pci_read_word((uint8_t)bus, slot, func, 0x00);
                if (vendor == 0xFFFF) continue; // No device

                uint16_t device = pci_read_word((uint8_t)bus, slot, func, 0x02);
                uint8_t base_class = (uint8_t)(pci_read_dword((uint8_t)bus, slot, func, 0x08) >> 24);

                // Check for Display Controller (Class 0x03) or known BGA IDs (0x1234:0x1111)
                if (base_class == 0x03 || (vendor == 0x1234 && device == 0x1111) || vendor == 0x80EE) {
                    uint32_t bar0 = pci_read_dword((uint8_t)bus, slot, func, 0x10) & 0xFFFFFFF0;
                    if (bar0 != 0) {
                        bga_lfb_address = bar0;
                        kprintf("[NSK BGA] Found PCI Display Adapter [%x:%x] at %u:%u:%u -> BAR0: %p\n",
                                vendor, device, bus, slot, func, (void*)bar0);
                        return bga_lfb_address;
                    }
                }
            }
        }
    }

    // Default QEMU / Bochs / Limbo linear framebuffer physical address fallback
    bga_lfb_address = 0xE0000000;
    return bga_lfb_address;
}

bool bga_is_available(void) {
    bga_write(BGA_REG_ID, 0xB0C5);
    uint16_t id = bga_read(BGA_REG_ID);
    return (id >= 0xB0C0 && id <= 0xB0C6);
}

bool bga_set_video_mode(uint32_t width, uint32_t height, uint32_t bpp) {
    if (!bga_is_available()) {
        kprintf("[NSK BGA] Hardware BGA not detected\n");
        return false;
    }

    uint16_t id = bga_read(BGA_REG_ID);
    kprintf("[NSK BGA] Bochs Graphics Adapter detected (Version: 0x%x)\n", id);

    bga_write(BGA_REG_ENABLE, BGA_DISABLED);
    bga_write(BGA_REG_XRES, (uint16_t)width);
    bga_write(BGA_REG_YRES, (uint16_t)height);
    bga_write(BGA_REG_BPP,  (uint16_t)bpp);
    bga_write(BGA_REG_ENABLE, BGA_ENABLED | BGA_LFB_ENABLED);

    uint32_t lfb = bga_get_framebuffer_addr();
    kprintf("[NSK BGA] Switched hardware video mode to %ux%u@%ubpp (LFB: %p)\n",
            width, height, bpp, (void*)lfb);

    return true;
}
