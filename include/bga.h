/**
 * NSK OS v0.3 - Bochs Graphics Adapter (BGA) Driver
 * Direct hardware video mode switching for QEMU, Limbo, VirtualBox, Bochs
 */
#ifndef NSK_BGA_H
#define NSK_BGA_H

#include "types.h"

// BGA Detection and Setup
bool     bga_is_available(void);
uint32_t bga_get_framebuffer_addr(void);
bool     bga_set_video_mode(uint32_t width, uint32_t height, uint32_t bpp);

#endif /* NSK_BGA_H */
