#ifndef NSK_WALLPAPER_H
#define NSK_WALLPAPER_H
#include <stdint.h>
#define WALL_W 1024
#define WALL_H 576
extern const uint8_t _binary_kernel_wallpaper_rgb565_bin_start[];
extern const uint8_t _binary_kernel_wallpaper_rgb565_bin_end[];
#define wallpaper_rgb565_start _binary_kernel_wallpaper_rgb565_bin_start
#define wallpaper_rgb565_end   _binary_kernel_wallpaper_rgb565_bin_end
#endif
