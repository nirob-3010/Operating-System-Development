/**
 * NSK OS v0.3 - 8254 Programmable Interval Timer (PIT) Driver
 */
#ifndef NSK_PIT_H
#define NSK_PIT_H

#include "types.h"

#define PIT_TARGET_HZ 100

void pit_init(uint32_t frequency);
uint32_t pit_get_ticks(void);
uint32_t pit_get_uptime_seconds(void);
void pit_sleep(uint32_t ticks);

#endif /* NSK_PIT_H */
