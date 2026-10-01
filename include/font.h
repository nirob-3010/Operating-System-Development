/**
 * NSK OS v0.3 - Vector & Anti-Aliased Font Engine (Phase 2)
 */
#ifndef NSK_FONT_H
#define NSK_FONT_H

#include "types.h"

void font_init(void);
void font_draw_char(int x, int y, char c, uint32_t color, int scale);
void font_draw_string(int x, int y, const char* str, uint32_t color, int scale);
void font_draw_string_shadow(int x, int y, const char* str, uint32_t color, uint32_t shadow_color, int scale);
int  font_string_width(const char* str, int scale);
int  font_char_height(int scale);

#endif /* NSK_FONT_H */
