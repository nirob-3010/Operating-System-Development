/**
 * NSK OS v0.3 - Wallpaper Engine
 * Scales the embedded HOME.PNG Bloom wallpaper (kernel/wallpaper_home.h, 768x512, 24-bit)
 * to any screen resolution:
 *   - "cover" fit: uniform scale, centre-cropped, so the artwork is never stretched
 *     (1536x1024 matches the 3:2 source exactly; 1024x768 etc. just crop the sides)
 *   - bilinear filtering with 16-bit weights for banding-free gradients
 * Regenerate the asset with: python3 tools/gen_wallpaper.py HOME.PNG
 */
#include "wallpaper.h"
#include "wallpaper_home.h"
#include "gfx.h"

void wallpaper_generate(uint32_t* buffer, int width, int height) {
    if (!buffer || width <= 0 || height <= 0) return;

    // 16.16 fixed-point source step per screen pixel. Taking the SMALLER of the two
    // steps gives one uniform scale that covers the whole screen.
    uint32_t step_x = ((uint32_t)WALLPAPER_W << 16) / (uint32_t)width;
    uint32_t step_y = ((uint32_t)WALLPAPER_H << 16) / (uint32_t)height;
    uint32_t step   = (step_x < step_y) ? step_x : step_y;

    // Centre the visible window inside the source image
    int32_t off_x = (int32_t)((((uint32_t)WALLPAPER_W << 16) - step * (uint32_t)width)  / 2);
    int32_t off_y = (int32_t)((((uint32_t)WALLPAPER_H << 16) - step * (uint32_t)height) / 2);

    const int32_t max_x = (WALLPAPER_W - 1) << 16;
    const int32_t max_y = (WALLPAPER_H - 1) << 16;
    const int32_t half  = (int32_t)(step >> 1) - 0x8000; // sample at pixel centres

    for (int y = 0; y < height; y++) {
        int32_t sy = off_y + (int32_t)((uint32_t)y * step) + half;
        if (sy < 0) sy = 0;
        if (sy > max_y) sy = max_y;

        int y0 = sy >> 16;
        int y1 = (y0 + 1 < WALLPAPER_H) ? y0 + 1 : y0;
        int fy = (sy >> 8) & 0xFF;

        const uint32_t* row0 = &home_wallpaper_rgb[y0 * WALLPAPER_W];
        const uint32_t* row1 = &home_wallpaper_rgb[y1 * WALLPAPER_W];
        uint32_t* dst_row = &buffer[y * width];

        for (int x = 0; x < width; x++) {
            int32_t sx = off_x + (int32_t)((uint32_t)x * step) + half;
            if (sx < 0) sx = 0;
            if (sx > max_x) sx = max_x;

            int x0 = sx >> 16;
            int x1 = (x0 + 1 < WALLPAPER_W) ? x0 + 1 : x0;
            int fx = (sx >> 8) & 0xFF;

            // Four weights, 8.8 x 8.8 -> they always sum to exactly 65536
            uint32_t w00 = (uint32_t)((256 - fx) * (256 - fy));
            uint32_t w10 = (uint32_t)(fx * (256 - fy));
            uint32_t w01 = (uint32_t)((256 - fx) * fy);
            uint32_t w11 = (uint32_t)(fx * fy);

            uint32_t c00 = row0[x0], c10 = row0[x1];
            uint32_t c01 = row1[x0], c11 = row1[x1];

            uint32_t r = (((c00 >> 16) & 0xFF) * w00 + ((c10 >> 16) & 0xFF) * w10 +
                          ((c01 >> 16) & 0xFF) * w01 + ((c11 >> 16) & 0xFF) * w11 + 0x8000) >> 16;
            uint32_t g = (((c00 >> 8) & 0xFF) * w00 + ((c10 >> 8) & 0xFF) * w10 +
                          ((c01 >> 8) & 0xFF) * w01 + ((c11 >> 8) & 0xFF) * w11 + 0x8000) >> 16;
            uint32_t b = ((c00 & 0xFF) * w00 + (c10 & 0xFF) * w10 +
                          (c01 & 0xFF) * w01 + (c11 & 0xFF) * w11 + 0x8000) >> 16;

            dst_row[x] = 0xFF000000 | (r << 16) | (g << 8) | b;
        }
    }
}
