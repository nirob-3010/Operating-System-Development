/**
 * NSK OS v0.3 - PS/2 Keyboard Driver (Phase 3)
 */
#ifndef NSK_KEYBOARD_H
#define NSK_KEYBOARD_H

#include "types.h"

void keyboard_init(void);
char keyboard_get_char(void);
bool keyboard_has_char(void);

#endif /* NSK_KEYBOARD_H */
