/**
 * NSK OS v0.3 - Real Dynamic System Information & Hardware Metrics
 */
#ifndef NSK_SYSINFO_H
#define NSK_SYSINFO_H

#include "types.h"

typedef struct {
    uint32_t cpu_usage_pct;
    uint32_t ram_usage_pct;
    uint32_t ram_used_mb;
    uint32_t ram_total_mb;
    uint32_t disk_usage_pct;
    uint32_t disk_used_mb;
    uint32_t disk_total_mb;
    uint32_t battery_pct;
    bool     battery_charging;
    bool     battery_ac_present;
} sysinfo_metrics_t;

void sysinfo_init(void);
void sysinfo_update(void);
void sysinfo_get_metrics(sysinfo_metrics_t* out_metrics);

#endif /* NSK_SYSINFO_H */
