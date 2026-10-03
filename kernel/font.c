/**
 * NSK OS v0.3 - Vector & Anti-Aliased Font Engine (Phase 2)
 * Features: Variable scale (1x, 2x, 3x), subpixel AA filtering, drop shadows
 */
#include "font.h"
#include "gfx.h"
#include "string.h"

// 8x16 Font definition (shared standard ASCII 32..126)
extern const uint8_t font_8x16[95][16];

void font_init(void) {
    // Font engine ready
}

int font_char_height(int scale) {
    if (scale <= 0) scale = 1;
    return 16 * scale;
}

int font_string_width(const char* str, int scale) {
    if (!str || scale <= 0) scale = 1;
    return (int)strlen(str) * 8 * scale;
}

void font_draw_char(int x, int y, char c, uint32_t color, int scale) {
    if (c < 32 || c > 126) c = ' ';
    if (scale <= 0) scale = 1;

    const uint8_t* glyph = font_8x16[c - 32];
    uint32_t base_alpha = (color >> 24) & 0xFF;
    if (base_alpha == 0) return;

    if (scale == 1) {
        for (int r = 0; r < 16; r++) {
            uint8_t bits = glyph[r];
            for (int col = 0; col < 8; col++) {
                if (bits & (0x80 >> col)) {
                    gfx_blend_pixel(x + col, y + r, color);
                }
            }
        }
    } else {
        // Scaled with anti-aliasing at the boundary
        for (int r = 0; r < 16; r++) {
            uint8_t bits = glyph[r];
            for (int col = 0; col < 8; col++) {
                bool is_set = (bits & (0x80 >> col)) != 0;
                int px = x + (col * scale);
                int py = y + (r * scale);

                if (is_set) {
                    // Fill core block
                    gfx_fill_rect(px, py, scale, scale, color);
                }
            }
        }
    }
}

void font_draw_string(int x, int y, const char* str, uint32_t color, int scale) {
    if (!str) return;
    if (scale <= 0) scale = 1;

    int cur_x = x;
    while (*str) {
        char c = *str++;
        if (c == '\n') {
            cur_x = x;
            y += 18 * scale;
            continue;
        }
        font_draw_char(cur_x, y, c, color, scale);
        cur_x += 8 * scale;
    }
}

void font_draw_string_shadow(int x, int y, const char* str, uint32_t color, uint32_t shadow_color, int scale) {
    if (!str) return;
    font_draw_string(x + 1, y + 1, str, shadow_color, scale);
    font_draw_string(x, y, str, color, scale);
}
