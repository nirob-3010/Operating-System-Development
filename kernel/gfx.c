/**
 * NSK OS v0.3 - Graphics Engine (Phase 2)
 * High-performance 32-bit linear framebuffer rendering pipeline
 */
#include "gfx.h"
#include "bga.h"
#include "kheap.h"
#include "printf.h"
#include "string.h"

static uint32_t* front_buffer = NULL;
static uint32_t* back_buffer = NULL;
static uint32_t* blur_scratch = NULL;

static uint32_t  screen_w = 0;
static uint32_t  screen_h = 0;
static uint32_t  screen_pitch = 0; // Pitch in pixels
static bool      gfx_ready = false;

// Fast integer square root for AA distance calculations
static inline uint32_t isqrt(uint32_t val) {
    uint32_t temp, g = 0;
    if (val >= 0x40000000) { g = 0x8000; val -= 0x40000000; }
    #define STEP(shift) \
        temp = (((g << 1) + (1 << shift)) << shift); \
        if (val >= temp) { g += (1 << shift); val -= temp; }
    STEP(14); STEP(13); STEP(12); STEP(11); STEP(10);
    STEP(9);  STEP(8);  STEP(7);  STEP(6);  STEP(5);
    STEP(4);  STEP(3);  STEP(2);  STEP(1);  STEP(0);
    #undef STEP
    return g;
}

bool gfx_init(multiboot_info_parsed_t* mbi) {
    uint64_t raw_addr = 0;
    bool found_valid_fb = false;

    if (mbi && mbi->fb_tag && mbi->fb_tag->framebuffer_addr &&
        mbi->fb_tag->framebuffer_addr != (uint64_t)-1 &&
        (uint32_t)(mbi->fb_tag->framebuffer_addr & 0xFFFFFFFF) != 0xFFFFFFFF &&
        mbi->fb_tag->framebuffer_width >= 320 && mbi->fb_tag->framebuffer_width <= 3840 &&
        mbi->fb_tag->framebuffer_height >= 200 && mbi->fb_tag->framebuffer_height <= 2160 &&
        mbi->fb_tag->framebuffer_pitch >= mbi->fb_tag->framebuffer_width * 4) {

        raw_addr = mbi->fb_tag->framebuffer_addr;
        screen_w = mbi->fb_tag->framebuffer_width;
        screen_h = mbi->fb_tag->framebuffer_height;
        screen_pitch = mbi->fb_tag->framebuffer_pitch / 4;
        front_buffer = (uint32_t*)((uint32_t)(raw_addr & 0xFFFFFFFF));
        found_valid_fb = true;
    } else if (mbi && mbi->protocol_version == 1 && mbi->mb1_info && (mbi->mb1_info->flags & (1 << 12)) &&
               mbi->mb1_info->framebuffer_addr && mbi->mb1_info->framebuffer_addr != (uint64_t)-1 &&
               (uint32_t)(mbi->mb1_info->framebuffer_addr & 0xFFFFFFFF) != 0xFFFFFFFF &&
               mbi->mb1_info->framebuffer_width >= 320 && mbi->mb1_info->framebuffer_width <= 3840 &&
               mbi->mb1_info->framebuffer_height >= 200 && mbi->mb1_info->framebuffer_height <= 2160 &&
               mbi->mb1_info->framebuffer_pitch >= mbi->mb1_info->framebuffer_width * 4) {

        raw_addr = mbi->mb1_info->framebuffer_addr;
        screen_w = mbi->mb1_info->framebuffer_width;
        screen_h = mbi->mb1_info->framebuffer_height;
        screen_pitch = mbi->mb1_info->framebuffer_pitch / 4;
        front_buffer = (uint32_t*)((uint32_t)(raw_addr & 0xFFFFFFFF));
        found_valid_fb = true;
    }

    if (!found_valid_fb) {
        if (bga_is_available()) {
            kprintf("[NSK GFX] No valid bootloader video tag; configuring via hardware BGA controller...\n");
            screen_w = 1024;
            screen_h = 768;
            screen_pitch = 1024;
            bga_set_video_mode(screen_w, screen_h, 32);
            raw_addr = bga_get_framebuffer_addr();
            front_buffer = (uint32_t*)raw_addr;
        } else {
            kprintf("[NSK GFX] NOTICE: Direct kernel boot without VBE tag; using 1024x768 display buffer\n");
            screen_w = 1024;
            screen_h = 768;
            screen_pitch = 1024;
            front_buffer = (uint32_t*)kmalloc_aligned(screen_w * screen_h * sizeof(uint32_t), 16);
        }
    }

    if (!front_buffer || screen_w == 0 || screen_h == 0) {
        kprintf("[NSK GFX] ERROR: Invalid framebuffer parameters: %ux%u at %p\n",
                screen_w, screen_h, front_buffer);
        return false;
    }

    size_t buffer_size_bytes = screen_pitch * screen_h * sizeof(uint32_t);

    // Allocate back buffer from kernel heap
    back_buffer = (uint32_t*)kmalloc_aligned(buffer_size_bytes, 16);
    if (!back_buffer) {
        kprintf("[NSK GFX] ERROR: Failed to allocate back buffer (%u KB)!\n",
                (uint32_t)(buffer_size_bytes / 1024));
        return false;
    }

    // Allocate blur scratch buffer (up to 1024x1024 pixels)
    blur_scratch = (uint32_t*)kmalloc_aligned(1024 * 1024 * sizeof(uint32_t), 16);
    if (!blur_scratch) {
        kprintf("[NSK GFX] WARNING: Blur scratch buffer allocation failed; large blur may be limited\n");
    }

    // Initial clear of back buffer
    memset(back_buffer, 0, buffer_size_bytes);
    gfx_ready = true;

    kprintf("[NSK GFX] Framebuffer initialized: %ux%u@32bpp (Pitch: %u)\n", screen_w, screen_h, screen_pitch);
    kprintf("[NSK GFX] Front Buffer: %p | Back Buffer: %p (%u MB)\n",
            front_buffer, back_buffer, (uint32_t)(buffer_size_bytes / (1024 * 1024)));

    return true;
}

bool     gfx_is_available(void)      { return gfx_ready; }
uint32_t gfx_get_width(void)         { return screen_w; }
uint32_t gfx_get_height(void)        { return screen_h; }
uint32_t gfx_get_pitch(void)         { return screen_pitch; }
uint32_t* gfx_get_frontbuffer(void)  { return front_buffer; }
uint32_t* gfx_get_backbuffer(void)   { return back_buffer; }

void gfx_swap(void) {
    if (!gfx_ready || !front_buffer || !back_buffer) return;
    memcpy(front_buffer, back_buffer, screen_pitch * screen_h * sizeof(uint32_t));
}

void gfx_swap_rect(int x, int y, int w, int h) {
    if (!gfx_ready || !front_buffer || !back_buffer) return;
    if (x < 0) { w += x; x = 0; }
    if (y < 0) { h += y; y = 0; }
    if (x + w > (int)screen_w) w = (int)screen_w - x;
    if (y + h > (int)screen_h) h = (int)screen_h - y;
    if (w <= 0 || h <= 0) return;

    for (int row = y; row < y + h; row++) {
        uint32_t* src = &back_buffer[row * screen_pitch + x];
        uint32_t* dst = &front_buffer[row * screen_pitch + x];
        memcpy(dst, src, w * sizeof(uint32_t));
    }
}

void gfx_clear(uint32_t color) {
    if (!gfx_ready || !back_buffer) return;
    for (uint32_t i = 0; i < screen_pitch * screen_h; i++) {
        back_buffer[i] = color;
    }
}

void gfx_put_pixel(int x, int y, uint32_t color) {
    if (x < 0 || x >= (int)screen_w || y < 0 || y >= (int)screen_h) return;
    back_buffer[y * screen_pitch + x] = color;
}

uint32_t gfx_get_pixel(int x, int y) {
    if (x < 0 || x >= (int)screen_w || y < 0 || y >= (int)screen_h) return 0;
    return back_buffer[y * screen_pitch + x];
}

uint32_t gfx_alpha_blend(uint32_t bg, uint32_t fg) {
    uint32_t a = (fg >> 24) & 0xFF;
    if (a == 0) return bg;
    if (a == 255) return fg;

    uint32_t inv_a = 255 - a;

    uint32_t r_fg = (fg >> 16) & 0xFF;
    uint32_t g_fg = (fg >> 8) & 0xFF;
    uint32_t b_fg = fg & 0xFF;

    uint32_t r_bg = (bg >> 16) & 0xFF;
    uint32_t g_bg = (bg >> 8) & 0xFF;
    uint32_t b_bg = bg & 0xFF;

    uint32_t r = ((r_fg * a) + (r_bg * inv_a) + 127) / 255;
    uint32_t g = ((g_fg * a) + (g_bg * inv_a) + 127) / 255;
    uint32_t b = ((b_fg * a) + (b_bg * inv_a) + 127) / 255;

    return 0xFF000000 | (r << 16) | (g << 8) | b;
}

void gfx_blend_pixel(int x, int y, uint32_t color) {
    if (x < 0 || x >= (int)screen_w || y < 0 || y >= (int)screen_h) return;
    uint32_t* dst = &back_buffer[y * screen_pitch + x];
    *dst = gfx_alpha_blend(*dst, color);
}

void gfx_draw_line(int x0, int y0, int x1, int y1, uint32_t color) {
    int dx = (x1 > x0) ? (x1 - x0) : (x0 - x1);
    int dy = (y1 > y0) ? (y1 - y0) : (y0 - y1);
    int sx = (x0 < x1) ? 1 : -1;
    int sy = (y0 < y1) ? 1 : -1;
    int err = dx - dy;

    while (1) {
        gfx_blend_pixel(x0, y0, color);
        if (x0 == x1 && y0 == y1) break;
        int e2 = 2 * err;
        if (e2 > -dy) { err -= dy; x0 += sx; }
        if (e2 < dx)  { err += dx; y0 += sy; }
    }
}

void gfx_draw_rect(int x, int y, int w, int h, uint32_t color) {
    for (int cx = x; cx < x + w; cx++) {
        gfx_blend_pixel(cx, y, color);
        gfx_blend_pixel(cx, y + h - 1, color);
    }
    for (int cy = y + 1; cy < y + h - 1; cy++) {
        gfx_blend_pixel(x, cy, color);
        gfx_blend_pixel(x + w - 1, cy, color);
    }
}

void gfx_fill_rect(int x, int y, int w, int h, uint32_t color) {
    if (x < 0) { w += x; x = 0; }
    if (y < 0) { h += y; y = 0; }
    if (x + w > (int)screen_w) w = (int)screen_w - x;
    if (y + h > (int)screen_h) h = (int)screen_h - y;
    if (w <= 0 || h <= 0) return;

    uint32_t a = (color >> 24) & 0xFF;

    if (a == 255) {
        for (int cy = y; cy < y + h; cy++) {
            uint32_t* row = &back_buffer[cy * screen_pitch + x];
            for (int cx = 0; cx < w; cx++) {
                row[cx] = color;
            }
        }
    } else if (a > 0) {
        for (int cy = y; cy < y + h; cy++) {
            uint32_t* row = &back_buffer[cy * screen_pitch + x];
            for (int cx = 0; cx < w; cx++) {
                row[cx] = gfx_alpha_blend(row[cx], color);
            }
        }
    }
}

/**
 * Anti-Aliased Filled Rounded Rectangle
 * Uses signed distance calculation for subpixel anti-aliasing around corner arcs.
 */
void gfx_fill_rounded_rect_aa(int x, int y, int w, int h, int radius, uint32_t color) {
    if (w <= 0 || h <= 0) return;
    if (radius <= 0) {
        gfx_fill_rect(x, y, w, h, color);
        return;
    }

    if (radius > w / 2) radius = w / 2;
    if (radius > h / 2) radius = h / 2;

    uint32_t base_alpha = (color >> 24) & 0xFF;
    if (base_alpha == 0) return;

    int r2 = radius * radius;
    int r_fixed = radius * 256;

    for (int cy = y; cy < y + h; cy++) {
        if (cy < 0 || cy >= (int)screen_h) continue;

        int dy = 0;
        if (cy < y + radius) {
            dy = (y + radius) - cy;
        } else if (cy >= y + h - radius) {
            dy = cy - (y + h - radius - 1);
        }

        int dy2 = dy * dy;

        for (int cx = x; cx < x + w; cx++) {
            if (cx < 0 || cx >= (int)screen_w) continue;

            int dx = 0;
            if (cx < x + radius) {
                dx = (x + radius) - cx;
            } else if (cx >= x + w - radius) {
                dx = cx - (x + w - radius - 1);
            }

            if (dx == 0 || dy == 0) {
                // Inside central cross (fully opaque relative to color alpha)
                gfx_blend_pixel(cx, cy, color);
            } else {
                int dist_sq = dx * dx + dy2;
                if (dist_sq <= (radius - 1) * (radius - 1)) {
                    // Fully inside corner arc
                    gfx_blend_pixel(cx, cy, color);
                } else if (dist_sq <= (radius + 1) * (radius + 1)) {
                    // Subpixel anti-aliased edge
                    uint32_t dist_fixed = isqrt((uint32_t)dist_sq * 65536);
                    int delta = (int)dist_fixed - r_fixed; // -256 to +256
                    int coverage = 128 - (delta / 2);
                    if (coverage < 0) coverage = 0;
                    if (coverage > 255) coverage = 255;

                    uint32_t pixel_alpha = (base_alpha * coverage) / 255;
                    if (pixel_alpha > 0) {
                        uint32_t blend_col = (color & 0x00FFFFFF) | (pixel_alpha << 24);
                        gfx_blend_pixel(cx, cy, blend_col);
                    }
                }
            }
        }
    }
}

/**
 * Anti-Aliased Outline for Rounded Rectangle
 */
void gfx_draw_rounded_rect_aa(int x, int y, int w, int h, int radius, uint32_t color) {
    if (w <= 0 || h <= 0) return;
    if (radius <= 0) {
        gfx_draw_rect(x, y, w, h, color);
        return;
    }

    if (radius > w / 2) radius = w / 2;
    if (radius > h / 2) radius = h / 2;

    uint32_t base_alpha = (color >> 24) & 0xFF;
    if (base_alpha == 0) return;

    // Draw straight line segments
    for (int cx = x + radius; cx < x + w - radius; cx++) {
        gfx_blend_pixel(cx, y, color);
        gfx_blend_pixel(cx, y + h - 1, color);
    }
    for (int cy = y + radius; cy < y + h - radius; cy++) {
        gfx_blend_pixel(x, cy, color);
        gfx_blend_pixel(x + w - 1, cy, color);
    }

    // Draw corner arcs with anti-aliasing
    int centers[4][2] = {
        {x + radius, y + radius},
        {x + w - radius - 1, y + radius},
        {x + radius, y + h - radius - 1},
        {x + w - radius - 1, y + h - radius - 1}
    };

    int r_fixed = radius * 256;

    for (int c = 0; c < 4; c++) {
        int cx = centers[c][0];
        int cy = centers[c][1];

        for (int dy = -radius; dy <= radius; dy++) {
            for (int dx = -radius; dx <= radius; dx++) {
                int px = cx + dx;
                int py = cy + dy;

                // Check correct quadrant
                if (c == 0 && (dx > 0 || dy > 0)) continue;
                if (c == 1 && (dx < 0 || dy > 0)) continue;
                if (c == 2 && (dx > 0 || dy < 0)) continue;
                if (c == 3 && (dx < 0 || dy < 0)) continue;

                int dist_sq = dx * dx + dy * dy;
                uint32_t dist_fixed = isqrt((uint32_t)dist_sq * 65536);
                int diff = (int)dist_fixed - r_fixed;
                if (diff < 0) diff = -diff;

                if (diff < 256) {
                    int coverage = 255 - diff;
                    uint32_t alpha = (base_alpha * coverage) / 255;
                    if (alpha > 0) {
                        gfx_blend_pixel(px, py, (color & 0x00FFFFFF) | (alpha << 24));
                    }
                }
            }
        }
    }
}

/**
 * Soft Drop Shadow around Rounded Rectangles
 */
void gfx_draw_drop_shadow(int x, int y, int w, int h, int radius, int shadow_size, uint32_t shadow_color) {
    if (shadow_size <= 0) return;

    int sx = x - shadow_size;
    int sy = y - shadow_size + 4; // Slight downward offset for natural depth
    int sw = w + (shadow_size * 2);
    int sh = h + (shadow_size * 2);

    uint32_t max_alpha = (shadow_color >> 24) & 0xFF;

    for (int cy = sy; cy < sy + sh; cy++) {
        if (cy < 0 || cy >= (int)screen_h) continue;

        for (int cx = sx; cx < sx + sw; cx++) {
            if (cx < 0 || cx >= (int)screen_w) continue;

            // Compute distance to the inner rectangle
            int dx = 0;
            if (cx < x + radius) {
                dx = (x + radius) - cx;
            } else if (cx >= x + w - radius) {
                dx = cx - (x + w - radius - 1);
            }

            int dy = 0;
            if (cy < y + radius) {
                dy = (y + radius) - cy;
            } else if (cy >= y + h - radius) {
                dy = cy - (y + h - radius - 1);
            }

            int dist = 0;
            if (dx > 0 && dy > 0) {
                dist = isqrt(dx * dx + dy * dy) - radius;
            } else if (dx > 0) {
                dist = dx - radius;
            } else if (dy > 0) {
                dist = dy - radius;
            } else {
                dist = -1; // Inside
            }

            if (dist >= 0 && dist < shadow_size) {
                // Soft cubic/quadratic falloff
                int falloff = (shadow_size - dist) * 255 / shadow_size;
                int alpha = (max_alpha * falloff * falloff) / (255 * 255);
                if (alpha > 0) {
                    uint32_t col = (shadow_color & 0x00FFFFFF) | ((uint32_t)alpha << 24);
                    gfx_blend_pixel(cx, cy, col);
                }
            }
        }
    }
}

/**
 * Fast Separable Box Blur (2-Pass Sliding Window Accumulator)
 * O(1) per pixel running sum accumulator!
 */
void gfx_box_blur_rect(int x, int y, int w, int h, int radius) {
    if (!gfx_ready || !back_buffer || radius <= 0) return;
    if (x < 0) { w += x; x = 0; }
    if (y < 0) { h += y; y = 0; }
    if (x + w > (int)screen_w) w = (int)screen_w - x;
    if (y + h > (int)screen_h) h = (int)screen_h - y;
    if (w <= 0 || h <= 0) return;

    if (!blur_scratch || w * h > 1024 * 1024) return;

    int div = radius * 2 + 1;

    // Pass 1: Horizontal Blur from back_buffer into blur_scratch
    for (int cy = 0; cy < h; cy++) {
        int src_y = y + cy;
        uint32_t* src_row = &back_buffer[src_y * screen_pitch];
        uint32_t* dst_row = &blur_scratch[cy * w];

        uint32_t sum_r = 0, sum_g = 0, sum_b = 0;

        // Initialize window
        for (int i = -radius; i <= radius; i++) {
            int px = x + i;
            if (px < 0) px = 0;
            if (px >= (int)screen_w) px = (int)screen_w - 1;
            uint32_t c = src_row[px];
            sum_r += (c >> 16) & 0xFF;
            sum_g += (c >> 8) & 0xFF;
            sum_b += c & 0xFF;
        }

        for (int cx = 0; cx < w; cx++) {
            dst_row[cx] = 0xFF000000 |
                          ((sum_r / div) << 16) |
                          ((sum_g / div) << 8) |
                          (sum_b / div);

            // Slide window
            int left_x = x + cx - radius;
            int right_x = x + cx + radius + 1;
            if (left_x < 0) left_x = 0;
            if (left_x >= (int)screen_w) left_x = (int)screen_w - 1;
            if (right_x < 0) right_x = 0;
            if (right_x >= (int)screen_w) right_x = (int)screen_w - 1;

            uint32_t c_sub = src_row[left_x];
            uint32_t c_add = src_row[right_x];

            sum_r = sum_r - ((c_sub >> 16) & 0xFF) + ((c_add >> 16) & 0xFF);
            sum_g = sum_g - ((c_sub >> 8) & 0xFF) + ((c_add >> 8) & 0xFF);
            sum_b = sum_b - (c_sub & 0xFF) + (c_add & 0xFF);
        }
    }

    // Pass 2: Vertical Blur from blur_scratch back into back_buffer
    for (int cx = 0; cx < w; cx++) {
        uint32_t sum_r = 0, sum_g = 0, sum_b = 0;

        for (int i = -radius; i <= radius; i++) {
            int py = i;
            if (py < 0) py = 0;
            if (py >= h) py = h - 1;
            uint32_t c = blur_scratch[py * w + cx];
            sum_r += (c >> 16) & 0xFF;
            sum_g += (c >> 8) & 0xFF;
            sum_b += c & 0xFF;
        }

        for (int cy = 0; cy < h; cy++) {
            int dst_x = x + cx;
            int dst_y = y + cy;

            back_buffer[dst_y * screen_pitch + dst_x] = 0xFF000000 |
                                                        ((sum_r / div) << 16) |
                                                        ((sum_g / div) << 8) |
                                                        (sum_b / div);

            int top_y = cy - radius;
            int bottom_y = cy + radius + 1;
            if (top_y < 0) top_y = 0;
            if (top_y >= h) top_y = h - 1;
            if (bottom_y < 0) bottom_y = 0;
            if (bottom_y >= h) bottom_y = h - 1;

            uint32_t c_sub = blur_scratch[top_y * w + cx];
            uint32_t c_add = blur_scratch[bottom_y * w + cx];

            sum_r = sum_r - ((c_sub >> 16) & 0xFF) + ((c_add >> 16) & 0xFF);
            sum_g = sum_g - ((c_sub >> 8) & 0xFF) + ((c_add >> 8) & 0xFF);
            sum_b = sum_b - (c_sub & 0xFF) + (c_add & 0xFF);
        }
    }
}

/**
 * Translucent Frosted Glass Panel
 * 1. Soft Drop Shadow
 * 2. Background box blur
 * 3. Tint overlay
 * 4. Crisp 1px highlight border
 */
void gfx_draw_glass_panel(int x, int y, int w, int h, int radius, uint32_t tint_color, uint32_t border_color) {
    // 1. Draw soft drop shadow behind panel
    gfx_draw_drop_shadow(x, y, w, h, radius, 18, 0x48000000);

    // 2. Blur background region under panel
    gfx_box_blur_rect(x, y, w, h, 14);

    // 3. Fill with translucent glass tint
    gfx_fill_rounded_rect_aa(x, y, w, h, radius, tint_color);

    // 4. Subtle top glass shine gradient (slight highlight on upper third)
    gfx_fill_rounded_rect_aa(x + 1, y + 1, w - 2, h / 3, radius, 0x14FFFFFF);

    // 5. Crisp anti-aliased glass border
    gfx_draw_rounded_rect_aa(x, y, w, h, radius, border_color);
}

/**
 * Alpha Image Blit
 */
void gfx_blit_alpha(int dst_x, int dst_y, const uint32_t* src_pixels, int src_w, int src_h) {
    if (!src_pixels || src_w <= 0 || src_h <= 0) return;

    for (int r = 0; r < src_h; r++) {
        int py = dst_y + r;
        if (py < 0 || py >= (int)screen_h) continue;

        for (int c = 0; c < src_w; c++) {
            int px = dst_x + c;
            if (px < 0 || px >= (int)screen_w) continue;

            uint32_t color = src_pixels[r * src_w + c];
            gfx_blend_pixel(px, py, color);
        }
    }
}
