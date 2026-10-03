/**
 * NSK OS v0.3 - Real-Time Clock (RTC) & CMOS Driver Implementation
 * Reads real-time hardware clock directly from PC CMOS registers (Ports 0x70 / 0x71)
 */
#include "rtc.h"
#include "io.h"
#include "printf.h"

#define CMOS_ADDRESS 0x70
#define CMOS_DATA    0x71

static inline uint8_t cmos_read(uint8_t reg) {
    outb(CMOS_ADDRESS, reg);
    return inb(CMOS_DATA);
}

static inline bool rtc_is_updating(void) {
    outb(CMOS_ADDRESS, 0x0A);
    return (inb(CMOS_DATA) & 0x80) != 0;
}

static inline uint8_t bcd_to_bin(uint8_t val) {
    return ((val >> 4) * 10) + (val & 0x0F);
}

static const char* day_names[] = {
    "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"
};

static const char* month_names[] = {
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
};

void rtc_init(void) {
    rtc_time_t t;
    rtc_get_time(&t);
    char buf[48];
    rtc_format_date_time(buf, sizeof(buf));
    kprintf("[NSK RTC] CMOS Real-Time Clock initialized (Current Time: %s)\n", buf);
}

void rtc_get_time(rtc_time_t* out_time) {
    if (!out_time) return;

    // Wait until RTC is not busy updating
    uint32_t timeout = 100000;
    while (rtc_is_updating() && --timeout);

    uint8_t sec   = cmos_read(0x00);
    uint8_t min   = cmos_read(0x02);
    uint8_t hour  = cmos_read(0x04);
    uint8_t day   = cmos_read(0x07);
    uint8_t month = cmos_read(0x08);
    uint8_t year  = cmos_read(0x09);
    uint8_t dow   = cmos_read(0x06); // 1 = Sun, 7 = Sat

    uint8_t register_b = cmos_read(0x0B);

    // Convert BCD to binary if register B bit 2 is 0
    if (!(register_b & 0x04)) {
        sec   = bcd_to_bin(sec);
        min   = bcd_to_bin(min);
        hour  = ((hour & 0x7F) ? bcd_to_bin(hour & 0x7F) : 0) | (hour & 0x80);
        day   = bcd_to_bin(day);
        month = bcd_to_bin(month);
        year  = bcd_to_bin(year);
        dow   = bcd_to_bin(dow);
    }

    // Convert 12 hour to 24 hour if needed
    if (!(register_b & 0x02) && (hour & 0x80)) {
        hour = ((hour & 0x7F) + 12) % 24;
    }

    // Default sanity fallback if CMOS returns 0s
    if (day == 0 || day > 31) day = 1;
    if (month == 0 || month > 12) month = 10;
    if (dow == 0 || dow > 7) dow = 5; // Default Thursday

    out_time->second = sec % 60;
    out_time->minute = min % 60;
    out_time->hour   = hour % 24;
    out_time->day    = day;
    out_time->month  = month;
    out_time->year   = (year < 70) ? (2000 + year) : (1900 + year);
    out_time->day_of_week = dow;
}

void rtc_format_date_time(char* buf, size_t buf_size) {
    if (!buf || buf_size == 0) return;

    rtc_time_t t;
    rtc_get_time(&t);

    int dow_idx = (t.day_of_week >= 1 && t.day_of_week <= 7) ? (t.day_of_week - 1) : 4;
    int mon_idx = (t.month >= 1 && t.month <= 12) ? (t.month - 1) : 9;

    snprintf(buf, buf_size, "%s, %02u %s %u   %02u:%02u",
             day_names[dow_idx], t.day, month_names[mon_idx], t.year, t.hour, t.minute);
}

void rtc_format_time_short(char* buf, size_t buf_size) {
    if (!buf || buf_size == 0) return;

    rtc_time_t t;
    rtc_get_time(&t);

    snprintf(buf, buf_size, "%02u:%02u", t.hour, t.minute);
}
