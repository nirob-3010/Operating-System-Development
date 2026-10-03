/**
 * NSK OS v0.3 - Real-Time Clock (RTC) & CMOS Driver
 * Reads real-world date and time from the motherboard CMOS RTC (Ports 0x70, 0x71)
 */
#ifndef NSK_RTC_H
#define NSK_RTC_H

#include "types.h"

typedef struct {
    uint8_t  second;
    uint8_t  minute;
    uint8_t  hour;
    uint8_t  day;
    uint8_t  month;
    uint32_t year;
    uint8_t  day_of_week; // 1 = Sunday, 2 = Monday, ..., 7 = Saturday
} rtc_time_t;

void rtc_init(void);
void rtc_get_time(rtc_time_t* out_time);
void rtc_format_date_time(char* buf, size_t buf_size);
void rtc_format_time_short(char* buf, size_t buf_size);

#endif /* NSK_RTC_H */
