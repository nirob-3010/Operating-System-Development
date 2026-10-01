/**
 * NSK OS v0.3 - Graphics Engine (Phase 2)
 * High-performance 32-bit linear framebuffer rendering pipeline
 * Features: Double buffering, AA rounded rects, alpha blending, fast box blur, drop shadows, image blitting
 */
#ifndef NSK_GFX_H
#define NSK_GFX_H

#include "types.h"
#include "multiboot2.h"

// 32-bit ARGB Color Macros
#define COLOR_ARGB(a, r, g, b) (((uint32_t)(a) << 24) | ((uint32_t)(r) << 16) | ((uint32_t)(g) << 8) | (uint32_t)(b))
#define COLOR_RGB(r, g, b)     COLOR_ARGB(255, r, g, b)
#define COLOR_A(c)             (((uint32_t)(c) >> 24) & 0xFF)
#define COLOR_R(c)             (((uint32_t)(c) >> 16) & 0xFF)
#define COLOR_G(c)             (((uint32_t)(c) >> 8) & 0xFF)
#define COLOR_B(c)             ((uint32_t)(c) & 0xFF)

// Common Theme Palette Colors
#define GFX_COLOR_TRANSPARENT  0x00000000
#define GFX_COLOR_WHITE        0xFFFFFFFF
#define GFX_COLOR_BLACK        0xFF000000
#define GFX_COLOR_BG_DARK      0xFF0A0F1D // Deep midnight navy
#define GFX_COLOR_ACCENT_BLUE  0xFF3B82F6 // Vibrant blue
#define GFX_COLOR_ACCENT_CYAN  0xFF06B6D4 // Electric cyan
#define GFX_COLOR_GLASS_TINT   0x30FFFFFF // Translucent frosted white (19% opacity)
#define GFX_COLOR_GLASS_BORDER 0x60FFFFFF // Crisp glass highlight border
#define GFX_COLOR_SHADOW       0x40000000 // Soft dark drop shadow

// Rect Structure
typedef struct {
    int x;
    int y;
    int w;
    int h;
} gfx_rect_t;

// Graphics Engine Initialization & Lifecycle
bool     gfx_init(multiboot_info_parsed_t* mbi);
bool     gfx_is_available(void);
uint32_t gfx_get_width(void);
uint32_t gfx_get_height(void);
uint32_t gfx_get_pitch(void);
uint32_t* gfx_get_frontbuffer(void);
uint32_t* gfx_get_backbuffer(void);

// Buffer Presentation (Double Buffering)
void     gfx_swap(void);
void     gfx_swap_rect(int x, int y, int w, int h);

// Drawing Primitives
void     gfx_clear(uint32_t color);
void     gfx_put_pixel(int x, int y, uint32_t color);
uint32_t gfx_get_pixel(int x, int y);
void     gfx_blend_pixel(int x, int y, uint32_t color);
uint32_t gfx_alpha_blend(uint32_t bg, uint32_t fg);

void     gfx_draw_line(int x0, int y0, int x1, int y1, uint32_t color);
void     gfx_draw_rect(int x, int y, int w, int h, uint32_t color);
void     gfx_fill_rect(int x, int y, int w, int h, uint32_t color);

// Anti-Aliased Rounded Rectangles
void     gfx_fill_rounded_rect_aa(int x, int y, int w, int h, int radius, uint32_t color);
void     gfx_draw_rounded_rect_aa(int x, int y, int w, int h, int radius, uint32_t color);

// Soft Drop Shadow
void     gfx_draw_drop_shadow(int x, int y, int w, int h, int radius, int shadow_size, uint32_t shadow_color);

// Fast Box Blur (Separable 2-Pass Blur for Translucent Glass)
void     gfx_box_blur_rect(int x, int y, int w, int h, int radius);

// Translucent Frosted Glass Panel
void     gfx_draw_glass_panel(int x, int y, int w, int h, int radius, uint32_t tint_color, uint32_t border_color);

// Alpha Image Blitting
void     gfx_blit_alpha(int dst_x, int dst_y, const uint32_t* src_pixels, int src_w, int src_h);

#endif /* NSK_GFX_H */
