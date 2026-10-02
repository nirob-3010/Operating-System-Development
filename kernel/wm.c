/**
 * NSK OS v0.3 - Window Manager & Desktop UI Engine (Phase 3)
 * Exact Reference Match: Windows 11 Bloom Silk Theme (HOME.PNG)
 * Features:
 * 1. Ultra-Smooth iOS-Style Cursor Engine (Dirty rect cursor blitting at 60+ FPS)
 * 2. Real Hardware RTC Live Date & Time from Motherboard CMOS
 * 3. Real Dynamic Metrics: CPU Load, Physical RAM, Storage, and Battery
 */
#include "wm.h"
#include "gfx.h"
#include "font.h"
#include "mouse.h"
#include "keyboard.h"
#include "wallpaper.h"
#include "kheap.h"
#include "pit.h"
#include "rtc.h"
#include "sysinfo.h"
#include "printf.h"
#include "string.h"
#include "dock_icons.h"
#include "phase3.h"

static window_t  windows[WM_MAX_WINDOWS];
static window_t* z_order[WM_MAX_WINDOWS];
static int       num_windows = 0;

static uint32_t* wallpaper_cache = NULL;
static uint32_t* desktop_buffer = NULL; // Pre-rendered desktop composition
static uint32_t  screen_w = 0;
static uint32_t  screen_h = 0;

static bool      desktop_dirty = true;
static int       last_cursor_x = -1;
static int       last_cursor_y = -1;
static uint32_t  last_rtc_sec = 0xFFFFFFFF;
static uint32_t  last_dynamic_sig = 0;

static bool      start_menu_open = false;
static window_t* dragging_window = NULL;
static window_t* resizing_window = NULL;

void wm_init(void) {
    screen_w = gfx_get_width();
    screen_h = gfx_get_height();

    num_windows = 0;
    dragging_window = NULL;
    start_menu_open = false;
    desktop_dirty = true;
    last_cursor_x = -1;
    last_cursor_y = -1;

    size_t cache_bytes = screen_w * screen_h * sizeof(uint32_t);

    // 1. Wallpaper Cache Buffer (rendered once from HOME.PNG bloom engine)
    wallpaper_cache = (uint32_t*)kmalloc_aligned(cache_bytes, 16);
    if (wallpaper_cache) {
        kprintf("[NSK WM] Generating Bloom Silk Wallpaper cache (%ux%u)...\n", screen_w, screen_h);
        wallpaper_generate(wallpaper_cache, screen_w, screen_h);
    }

    // 2. Desktop Buffer (pre-rendered composition of windows & dock for instant cursor response)
    desktop_buffer = (uint32_t*)kmalloc_aligned(cache_bytes, 16);

    // 3. Initialize Real Hardware RTC and Live System Metrics
    rtc_init();
    sysinfo_init();

    kprintf("[NSK WM] Window Manager initialized successfully (Ultra-Smooth iOS-Style Cursor Active)\n");
}

window_t* wm_create_window(const char* title, int x, int y, int w, int h,
                           window_render_fn render_fn, window_click_fn click_fn) {
    if (num_windows >= WM_MAX_WINDOWS) return NULL;

    window_t* win = &windows[num_windows];
    win->id = num_windows + 1;
    strncpy(win->title, title ? title : "Untitled", sizeof(win->title) - 1);
    win->title[sizeof(win->title) - 1] = '\0';

    win->x = x;
    win->y = y;
    win->w = w;
    win->h = h;
    win->orig_x = x;
    win->orig_y = y;
    win->orig_w = w;
    win->orig_h = h;
    win->drag_offset_x = 0;
    win->drag_offset_y = 0;
    win->is_maximized = false;
    win->is_minimized = false;
    win->is_closed = false;
    win->is_focused = false;
    win->is_dragging = false;
    win->render_client = render_fn;
    win->on_click = click_fn;
    win->user_data = NULL;

    z_order[num_windows] = win;
    num_windows++;

    wm_focus_window(win);
    desktop_dirty = true;

    kprintf("[NSK WM] Created Window %d: \"%s\" [%d,%d %dx%d]\n", win->id, win->title, x, y, w, h);
    return win;
}

void wm_bring_to_front(window_t* win) {
    if (!win) return;

    int idx = -1;
    for (int i = 0; i < num_windows; i++) {
        if (z_order[i] == win) {
            idx = i;
            break;
        }
    }

    if (idx != -1 && idx < num_windows - 1) {
        for (int i = idx; i < num_windows - 1; i++) {
            z_order[i] = z_order[i + 1];
        }
        z_order[num_windows - 1] = win;
        desktop_dirty = true;
    }
}

void wm_focus_window(window_t* win) {
    for (int i = 0; i < num_windows; i++) {
        windows[i].is_focused = false;
    }
    if (win) {
        win->is_focused = true;
        win->is_minimized = false;
        wm_bring_to_front(win);
        desktop_dirty = true;
    }
}

void wm_close_window(window_t* win) {
    if (win) {
        win->is_closed = true;
        win->is_focused = false;
        if (dragging_window == win) dragging_window = NULL;
        desktop_dirty = true;
    }
}

void wm_minimize_window(window_t* win) {
    if (win) {
        win->is_minimized = true;
        win->is_focused = false;
        if (dragging_window == win) dragging_window = NULL;
        desktop_dirty = true;
    }
}

void wm_restore_window(window_t* win) {
    if (win) {
        win->is_minimized = false;
        wm_focus_window(win);
        desktop_dirty = true;
    }
}

bool wm_is_start_menu_open(void) {
    return start_menu_open;
}

void wm_toggle_start_menu(void) {
    start_menu_open = !start_menu_open;
    desktop_dirty = true;
}

// -----------------------------------------------------------------------------
// Real Dynamic Desktop Rendering
// -----------------------------------------------------------------------------

static void wm_render_topbar(void) {
    int bar_h = 26;
    gfx_fill_rect(0, 0, screen_w, bar_h, 0xC4F8FAFC);
    gfx_draw_line(0, bar_h - 1, screen_w, bar_h - 1, 0x30CBD5E1);

    // Left: Apple / OS Brand Icon & Text
    gfx_fill_rounded_rect_aa(12, 6, 14, 14, 7, 0xFF1E293B);
    font_draw_string(32, 6, "NSK OS", 0xFF0F172A, 1);

    // Center: REAL LIVE DATE & TIME from Motherboard CMOS RTC
    char date_time_buf[64];
    rtc_format_date_time(date_time_buf, sizeof(date_time_buf));
    int center_x = ((int)screen_w - 220) / 2;
    font_draw_string(center_x, 6, date_time_buf, 0xFF1E293B, 1);

    // Right: REAL HARDWARE STATUS (WiFi, Audio, Real Battery)
    sysinfo_metrics_t sys;
    sysinfo_get_metrics(&sys);

    int rx = (int)screen_w - 140;
    font_draw_string(rx, 6, "(.)", 0xFF475569, 1); // WiFi
    font_draw_string(rx + 24, 6, "<)", 0xFF475569, 1); // Audio

    // Real Battery Level Pill
    gfx_draw_rounded_rect_aa(rx + 48, 6, 24, 12, 3, 0xFF475569);
    int fill_w = (20 * sys.battery_pct) / 100;
    if (fill_w < 2) fill_w = 2;
    uint32_t bat_color = (sys.battery_pct > 20) ? 0xFF10B981 : 0xFFEF4444;
    gfx_fill_rounded_rect_aa(rx + 50, 8, fill_w, 8, 2, bat_color);

    char bat_str[16];
    snprintf(bat_str, sizeof(bat_str), "%u%%", sys.battery_pct);
    font_draw_string(rx + 78, 6, bat_str, 0xFF334155, 1);
}

static void wm_render_desktop_icons(void) {
    const char* names[] = { "Home", "Documents", "Pictures", "Music", "Trash" };
    int start_y = 44;
    int spacing_y = 68;

    for (int i = 0; i < 5; i++) {
        int ix = 24;
        int iy = start_y + (i * spacing_y);

        if (i == 4) {
            gfx_fill_rounded_rect_aa(ix + 2, iy, 34, 30, 8, 0xFFE2E8F0);
            gfx_draw_rounded_rect_aa(ix + 2, iy, 34, 30, 8, 0xFF94A3B8);
            font_draw_string(ix + 14, iy + 7, "[x]", 0xFF3B82F6, 1);
        } else {
            gfx_fill_rounded_rect_aa(ix, iy, 38, 30, 8, 0xFF38BDF8);
            gfx_fill_rounded_rect_aa(ix + 2, iy + 4, 34, 24, 6, 0xFF0284C7);
            gfx_fill_rounded_rect_aa(ix + 6, iy + 2, 14, 6, 3, 0xFF38BDF8);
        }

        font_draw_string_shadow(ix - 2, iy + 34, names[i], 0xFF0F172A, 0x40FFFFFF, 1);
    }
}

static void wm_render_system_widget(void) {
    int ww = 152;
    int wh = 186;
    int wx = (int)screen_w - ww - 18;
    int wy = 42;
    int r = 16;

    gfx_draw_drop_shadow(wx, wy, ww, wh, r, 12, 0x1A000000);
    gfx_box_blur_rect(wx, wy, ww, wh, 8);
    gfx_fill_rounded_rect_aa(wx, wy, ww, wh, r, 0xC8FFFFFF);
    gfx_draw_rounded_rect_aa(wx, wy, ww, wh, r, 0x60FFFFFF);

    // 1. Real Digital Time from RTC
    char clock_str[16];
    rtc_format_time_short(clock_str, sizeof(clock_str));
    font_draw_string(wx + 14, wy + 10, clock_str, 0xFF0F172A, 2);

    rtc_time_t t;
    rtc_get_time(&t);
    const char* d_names[] = { "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat" };
    const char* m_names[] = { "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec" };
    int di = (t.day_of_week >= 1 && t.day_of_week <= 7) ? (t.day_of_week - 1) : 4;
    int mi = (t.month >= 1 && t.month <= 12) ? (t.month - 1) : 9;

    char date_str[32];
    snprintf(date_str, sizeof(date_str), "%s, %02u %s %u", d_names[di], t.day, m_names[mi], t.year);
    font_draw_string(wx + 14, wy + 36, date_str, 0xFF64748B, 1);

    gfx_draw_line(wx + 12, wy + 52, wx + ww - 12, wy + 52, 0x25CBD5E1);

    // 2. REAL HARDWARE METRICS
    sysinfo_metrics_t sys;
    sysinfo_get_metrics(&sys);

    int meter_y = wy + 62;

    // Real CPU Load
    font_draw_string(wx + 14, meter_y, "CPU", 0xFF334155, 1);
    char cpu_str[16];
    snprintf(cpu_str, sizeof(cpu_str), "%u%%", sys.cpu_usage_pct);
    font_draw_string(wx + ww - 36, meter_y, cpu_str, 0xFF64748B, 1);
    gfx_fill_rounded_rect_aa(wx + 14, meter_y + 14, ww - 28, 6, 3, 0xFFE2E8F0);
    gfx_fill_rounded_rect_aa(wx + 14, meter_y + 14, ((ww - 28) * sys.cpu_usage_pct) / 100, 6, 3, 0xFF3B82F6);
    meter_y += 32;

    // Real Physical RAM (from PMM)
    font_draw_string(wx + 14, meter_y, "RAM", 0xFF334155, 1);
    char ram_str[16];
    snprintf(ram_str, sizeof(ram_str), "%u%%", sys.ram_usage_pct);
    font_draw_string(wx + ww - 36, meter_y, ram_str, 0xFF64748B, 1);
    gfx_fill_rounded_rect_aa(wx + 14, meter_y + 14, ww - 28, 6, 3, 0xFFE2E8F0);
    gfx_fill_rounded_rect_aa(wx + 14, meter_y + 14, ((ww - 28) * sys.ram_usage_pct) / 100, 6, 3, 0xFF2563EB);
    meter_y += 32;

    // Real Storage Capacity
    font_draw_string(wx + 14, meter_y, "Disk", 0xFF334155, 1);
    char disk_str[16];
    snprintf(disk_str, sizeof(disk_str), "%u%%", sys.disk_usage_pct);
    font_draw_string(wx + ww - 36, meter_y, disk_str, 0xFF64748B, 1);
    gfx_fill_rounded_rect_aa(wx + 14, meter_y + 14, ww - 28, 6, 3, 0xFFE2E8F0);
    gfx_fill_rounded_rect_aa(wx + 14, meter_y + 14, ((ww - 28) * sys.disk_usage_pct) / 100, 6, 3, 0xFF0284C7);
}

// -----------------------------------------------------------------------------
// Floating Dock (macOS-inspired)
//   - the 8 app icons are the user's own artwork (include/dock_icons.h, generated from
//     assets/dock_icons/*.jpeg by tools/gen_dock_icons.py) and are blitted 1:1, never recoloured
//   - each item is bound to a window BY TITLE, so any window created with that title
//     (e.g. wm_create_window("Notes", ...)) automatically gets a running dot, minimize-to-Dock
//     and click-to-restore - no change to the window manager itself
// -----------------------------------------------------------------------------

enum { DOCK_KIND_APP = 0, DOCK_KIND_SEPARATOR, DOCK_KIND_TERMINAL, DOCK_KIND_TRASH };

typedef struct {
    int         kind;
    int         icon;          // DOCK_ICON_* sprite index (DOCK_KIND_APP only)
    const char* window_title;  // window this item launches / restores / shows state for
} dock_item_t;

static const dock_item_t dock_items[] = {
    { DOCK_KIND_APP,       DOCK_ICON_FILES,      "File Manager" },
    { DOCK_KIND_APP,       DOCK_ICON_BROWSER,    "Browser"      },
    { DOCK_KIND_APP,       DOCK_ICON_PHOTOS,     "Photos"       },
    { DOCK_KIND_APP,       DOCK_ICON_CALENDAR,   "Calendar"     },
    { DOCK_KIND_APP,       DOCK_ICON_NOTES,      "Notes"        },
    { DOCK_KIND_APP,       DOCK_ICON_CLOCK,      "Clock"        },
    { DOCK_KIND_APP,       DOCK_ICON_CALCULATOR, "Calculator"   },
    { DOCK_KIND_APP,       DOCK_ICON_SETTINGS,   "Settings"     },
    { DOCK_KIND_SEPARATOR, 0,                    NULL           },
    // Existing apps that are not part of the 8 icons keep their place right of the separator,
    // so a minimized / closed Terminal can always be brought back from the Dock.
    { DOCK_KIND_TERMINAL,  0,                    "NSK Terminal" },
    { DOCK_KIND_TRASH,     0,                    NULL           },
};
#define DOCK_ITEM_COUNT ((int)(sizeof(dock_items) / sizeof(dock_items[0])))

#define DOCK_PAD_X          12
#define DOCK_PAD_TOP         6
#define DOCK_PAD_BOTTOM     10   // room under the icon cell for the running dot
#define DOCK_GAP             6
#define DOCK_SEP_W          13
#define DOCK_BOTTOM_MARGIN   8
#define DOCK_RADIUS         24

typedef struct {
    int x, y, w, h;
    int item_x[DOCK_ITEM_COUNT];
} dock_layout_t;

// One source of truth for geometry: used by both the renderer and the click hit-test
static void wm_dock_layout(dock_layout_t* L) {
    int total = DOCK_PAD_X * 2;
    for (int i = 0; i < DOCK_ITEM_COUNT; i++) {
        total += (dock_items[i].kind == DOCK_KIND_SEPARATOR) ? DOCK_SEP_W : DOCK_ICON_CELL;
        if (i < DOCK_ITEM_COUNT - 1) total += DOCK_GAP;
    }
    L->w = total;
    L->h = DOCK_PAD_TOP + DOCK_ICON_CELL + DOCK_PAD_BOTTOM;
    L->x = ((int)screen_w - L->w) / 2;
    if (L->x < 0) L->x = 0;
    L->y = (int)screen_h - L->h - DOCK_BOTTOM_MARGIN;

    int x = L->x + DOCK_PAD_X;
    for (int i = 0; i < DOCK_ITEM_COUNT; i++) {
        L->item_x[i] = x;
        x += ((dock_items[i].kind == DOCK_KIND_SEPARATOR) ? DOCK_SEP_W : DOCK_ICON_CELL) + DOCK_GAP;
    }
}

static window_t* wm_find_window_by_title(const char* title) {
    if (!title) return NULL;
    for (int i = 0; i < num_windows; i++) {
        if (strcmp(windows[i].title, title) == 0) return &windows[i];
    }
    return NULL;
}

// Premultiplied-alpha sprite blit (the dock icon header stores premultiplied ARGB)
static void wm_blit_premul(int dx, int dy, const uint32_t* src, int w, int h) {
    uint32_t* bb = gfx_get_backbuffer();
    if (!bb) return;
    uint32_t pitch = gfx_get_pitch();
    if (!pitch) pitch = screen_w;

    for (int r = 0; r < h; r++) {
        int py = dy + r;
        if (py < 0 || py >= (int)screen_h) continue;
        uint32_t* dst = &bb[(uint32_t)py * pitch];

        for (int c = 0; c < w; c++) {
            int px = dx + c;
            if (px < 0 || px >= (int)screen_w) continue;

            uint32_t p = src[r * w + c];
            uint32_t a = p >> 24;
            if (a == 0) continue;
            if (a == 255) { dst[px] = p; continue; }

            uint32_t d = dst[px];
            uint32_t inv = 255 - a;
            uint32_t rr = ((p >> 16) & 0xFF) + ((((d >> 16) & 0xFF) * inv + 127) / 255);
            uint32_t gg = ((p >> 8)  & 0xFF) + ((((d >> 8)  & 0xFF) * inv + 127) / 255);
            uint32_t bl = (p & 0xFF)         + (((d & 0xFF) * inv + 127) / 255);
            if (rr > 255) rr = 255;
            if (gg > 255) gg = 255;
            if (bl > 255) bl = 255;
            dst[px] = 0xFF000000 | (rr << 16) | (gg << 8) | bl;
        }
    }
}

// Existing Terminal tile (dark rounded square with ">_"), sized to match the new icon bodies
static void wm_dock_draw_terminal(int cell_x, int cell_y) {
    int pad = (DOCK_ICON_CELL - DOCK_ICON_BODY) / 2;
    int bx = cell_x + pad, by = cell_y + pad;
    gfx_fill_rounded_rect_aa(bx, by, DOCK_ICON_BODY, DOCK_ICON_BODY, 11, 0xFF1E293B);
    gfx_draw_rounded_rect_aa(bx, by, DOCK_ICON_BODY, DOCK_ICON_BODY, 11, 0x30FFFFFF);
    int tw = font_string_width(">_", 2);
    int th = font_char_height(2);
    font_draw_string(bx + (DOCK_ICON_BODY - tw) / 2, by + (DOCK_ICON_BODY - th) / 2, ">_", 0xFFFFFFFF, 2);
}

// Existing Trash tile (light rounded square) with a small bin glyph instead of the "[x]" text
static void wm_dock_draw_trash(int cell_x, int cell_y) {
    int pad = (DOCK_ICON_CELL - DOCK_ICON_BODY) / 2;
    int bx = cell_x + pad, by = cell_y + pad;
    gfx_fill_rounded_rect_aa(bx, by, DOCK_ICON_BODY, DOCK_ICON_BODY, 11, 0xFFF1F5F9);
    gfx_draw_rounded_rect_aa(bx, by, DOCK_ICON_BODY, DOCK_ICON_BODY, 11, 0xFFCBD5E1);

    uint32_t ink = 0xFF64748B;
    int cx = bx + DOCK_ICON_BODY / 2;
    gfx_fill_rounded_rect_aa(cx - 4, by + 11, 8, 3, 1, ink);          // handle
    gfx_fill_rounded_rect_aa(cx - 11, by + 14, 22, 3, 1, ink);        // lid
    gfx_fill_rounded_rect_aa(cx - 8, by + 18, 16, 15, 3, ink);        // bin body
    gfx_fill_rect(cx - 4, by + 21, 1, 9, 0xFFF1F5F9);                 // ribs
    gfx_fill_rect(cx,     by + 21, 1, 9, 0xFFF1F5F9);
    gfx_fill_rect(cx + 4, by + 21, 1, 9, 0xFFF1F5F9);
}

static void wm_render_dock(void) {
    dock_layout_t L;
    wm_dock_layout(&L);

    // Floating glass container: soft shadow, blur, translucent fill, crisp edge
    gfx_draw_drop_shadow(L.x, L.y, L.w, L.h, DOCK_RADIUS, 18, 0x26000000);
    gfx_box_blur_rect(L.x, L.y, L.w, L.h, 10);
    gfx_fill_rounded_rect_aa(L.x, L.y, L.w, L.h, DOCK_RADIUS, 0xB4FFFFFF);
    gfx_draw_rounded_rect_aa(L.x - 1, L.y - 1, L.w + 2, L.h + 2, DOCK_RADIUS + 1, 0x14000000); // outer hairline
    gfx_draw_rounded_rect_aa(L.x, L.y, L.w, L.h, DOCK_RADIUS, 0xA0FFFFFF);                    // inner highlight

    int cell_y = L.y + DOCK_PAD_TOP;

    for (int i = 0; i < DOCK_ITEM_COUNT; i++) {
        const dock_item_t* it = &dock_items[i];
        int x = L.item_x[i];

        if (it->kind == DOCK_KIND_SEPARATOR) {
            gfx_fill_rect(x + DOCK_SEP_W / 2, cell_y + 8, 1, DOCK_ICON_CELL - 16, 0x30334155);
            continue;
        }

        if (it->kind == DOCK_KIND_APP) {
            wm_blit_premul(x, cell_y, dock_icon_pm[it->icon], DOCK_ICON_CELL, DOCK_ICON_CELL);
        } else if (it->kind == DOCK_KIND_TERMINAL) {
            wm_dock_draw_terminal(x, cell_y);
        } else {
            wm_dock_draw_trash(x, cell_y);
        }

        // Running / minimized indicator under the icon:
        //   solid dark dot = running, faded dot = minimized into the Dock, none = not running
        window_t* win = wm_find_window_by_title(it->window_title);
        if (win && !win->is_closed) {
            uint32_t dot = win->is_minimized ? 0x80475569 : 0xFF1E293B;
            gfx_fill_rounded_rect_aa(x + DOCK_ICON_CELL / 2 - 3, cell_y + DOCK_ICON_CELL + 1, 6, 6, 3, dot);
        }
    }
}

// Click on the Dock. Returns true when the click landed on the Dock (so it must not fall
// through to a window behind it).
//   running window  -> focus / bring to front
//   minimized       -> restore from the Dock
//   closed          -> reopen
//   no window       -> nothing happens (app has no window yet)
static bool wm_dock_handle_click(int mx, int my) {
    dock_layout_t L;
    wm_dock_layout(&L);

    if (mx < L.x || mx >= L.x + L.w || my < L.y || my >= L.y + L.h) return false;

    int cell_y = L.y + DOCK_PAD_TOP;
    for (int i = 0; i < DOCK_ITEM_COUNT; i++) {
        const dock_item_t* it = &dock_items[i];
        if (it->kind == DOCK_KIND_SEPARATOR) continue;

        int x = L.item_x[i];
        // generous hit area: the whole cell plus the dot strip underneath
        if (mx >= x - DOCK_GAP / 2 && mx < x + DOCK_ICON_CELL + DOCK_GAP / 2 &&
            my >= cell_y && my < L.y + L.h) {
            window_t* win = wm_find_window_by_title(it->window_title);
            if (win) {
                win->is_closed = false;
                wm_restore_window(win);   // un-minimizes, focuses, raises, marks desktop dirty
            } else if (it->window_title) {
                if (strcmp(it->window_title, "File Manager") == 0) {
                    phase3_open_file_manager();
                } else if (strcmp(it->window_title, "NSK Terminal") == 0) {
                    phase3_open_terminal();
                }
            }
            break;
        }
    }
    return true;
}

static void wm_render_window(window_t* win) {
    if (!win || win->is_closed || win->is_minimized) return;

    int wx = win->x;
    int wy = win->y;
    int ww = win->w;
    int wh = win->h;
    int radius = 16;

    int shadow_size = win->is_focused ? 18 : 12;
    uint32_t shadow_col = win->is_focused ? 0x2A000000 : 0x18000000;
    gfx_draw_drop_shadow(wx, wy, ww, wh, radius, shadow_size, shadow_col);

    gfx_box_blur_rect(wx, wy, ww, wh, 6);
    gfx_fill_rounded_rect_aa(wx, wy, ww, wh, radius, 0xF8FFFFFF);

    uint32_t border_col = win->is_focused ? 0x6094A3B8 : 0x30CBD5E1;
    gfx_draw_rounded_rect_aa(wx, wy, ww, wh, radius, border_col);

    gfx_draw_line(wx + 8, wy + WM_TITLEBAR_HEIGHT, wx + ww - 8, wy + WM_TITLEBAR_HEIGHT, 0x20CBD5E1);

    int btn_y = wy + 11;
    int btn_r = 6;
    gfx_fill_rounded_rect_aa(wx + 14, btn_y, 12, 12, btn_r, 0xFFEF4444);
    gfx_draw_rounded_rect_aa(wx + 14, btn_y, 12, 12, btn_r, 0x40000000);
    gfx_fill_rounded_rect_aa(wx + 32, btn_y, 12, 12, btn_r, 0xFFF59E0B);
    gfx_draw_rounded_rect_aa(wx + 32, btn_y, 12, 12, btn_r, 0x40000000);
    gfx_fill_rounded_rect_aa(wx + 50, btn_y, 12, 12, btn_r, 0xFF10B981);
    gfx_draw_rounded_rect_aa(wx + 50, btn_y, 12, 12, btn_r, 0x40000000);

    font_draw_string(wx + 72, wy + 9, win->title, 0xFF1E293B, 1);
    font_draw_string(wx + ww - 58, wy + 9, "_  []  x", 0xFF94A3B8, 1);

    int client_x = wx + 8;
    int client_y = wy + WM_TITLEBAR_HEIGHT + 2;
    int client_w = ww - 16;
    int client_h = wh - WM_TITLEBAR_HEIGHT - 10;

    if (win->render_client) {
        win->render_client(win, client_x, client_y, client_w, client_h);
    }

    // Bottom-right resize handle grip
    int rx = wx + ww - 14;
    int ry = wy + wh - 14;
    gfx_fill_rect(rx + 6, ry + 6, 2, 2, 0xFF94A3B8);
    gfx_fill_rect(rx + 2, ry + 6, 2, 2, 0xFF94A3B8);
    gfx_fill_rect(rx + 6, ry + 2, 2, 2, 0xFF94A3B8);
}

// -----------------------------------------------------------------------------
// Ultra-Smooth iOS-Style Cursor & Desktop Composition Pipeline
// -----------------------------------------------------------------------------

// Fingerprint of everything on the desktop that changes by itself over time
// (clock minute, battery, CPU/RAM/disk meters). The desktop is only recomposed when this
// really changes, instead of unconditionally every second - a full recompose (wallpaper copy,
// blur, windows, dock) is heavy enough to make the pointer visibly hitch once per second.
static uint32_t wm_dynamic_signature(void) {
    rtc_time_t t;
    rtc_get_time(&t);

    sysinfo_metrics_t sys;
    sysinfo_get_metrics(&sys);

    uint32_t sig = (uint32_t)t.minute;
    sig = sig * 61 + (uint32_t)t.hour;
    sig = sig * 61 + (uint32_t)t.day;
    sig = sig * 61 + (uint32_t)t.month;
    sig = sig * 61 + (uint32_t)t.year;
    sig = sig * 101 + sys.battery_pct;
    sig = sig * 101 + sys.cpu_usage_pct;
    sig = sig * 101 + sys.ram_usage_pct;
    sig = sig * 101 + sys.disk_usage_pct;
    return sig;
}

// Copy a rectangle of the pristine (cursor-free) desktop back into the back buffer
static void wm_restore_from_desktop(int x, int y, int w, int h, uint32_t pitch) {
    if (!desktop_buffer) return;
    if (x < 0) { w += x; x = 0; }
    if (y < 0) { h += y; y = 0; }
    if (x + w > (int)screen_w) w = (int)screen_w - x;
    if (y + h > (int)screen_h) h = (int)screen_h - y;
    if (w <= 0 || h <= 0) return;

    uint32_t* backbuffer = gfx_get_backbuffer();
    for (int row = 0; row < h; row++) {
        uint32_t offset = (uint32_t)(y + row) * pitch + (uint32_t)x;
        memcpy(&backbuffer[offset], &desktop_buffer[offset], (size_t)w * sizeof(uint32_t));
    }
}

void wm_render(void) {
    uint32_t* backbuffer = gfx_get_backbuffer();
    uint32_t* frontbuffer = gfx_get_frontbuffer();
    if (!backbuffer || !frontbuffer) return;

    mouse_state_t ms;
    mouse_get_state(&ms);

    uint32_t pitch = gfx_get_pitch();
    if (!pitch) pitch = screen_w;

    // Once per second (PIT ticks - avoids slow CMOS I/O port traps on mouse moves!) check whether
    // anything on the desktop changed by itself. Recompose only if it did.
    uint32_t cur_ticks = pit_get_ticks();
    if (cur_ticks - last_rtc_sec >= 100) { // 100 PIT ticks = 1.0 second
        last_rtc_sec = cur_ticks;
        uint32_t sig = wm_dynamic_signature();
        if (sig != last_dynamic_sig) {
            last_dynamic_sig = sig;
            desktop_dirty = true;
        }
    }

    // 1. Full Desktop Recomposition (ONLY when windows, clock, or widgets change!)
    if (desktop_dirty || !desktop_buffer) {
        if (wallpaper_cache) {
            memcpy(backbuffer, wallpaper_cache, pitch * screen_h * sizeof(uint32_t));
        } else {
            gfx_clear(0xFFB7C7D8);
        }

        wm_render_topbar();
        wm_render_desktop_icons();
        wm_render_system_widget();

        for (int i = 0; i < num_windows; i++) {
            window_t* win = z_order[i];
            if (win && !win->is_closed && !win->is_minimized) {
                wm_render_window(win);
            }
        }

        wm_render_dock();

        // Save pristine desktop composite without cursor for zero-latency restores
        if (desktop_buffer) {
            memcpy(desktop_buffer, backbuffer, pitch * screen_h * sizeof(uint32_t));
        }

        // Draw cursor and swap
        mouse_draw_cursor(ms.x, ms.y);
        gfx_swap();

        last_cursor_x = ms.x;
        last_cursor_y = ms.y;
        desktop_dirty = false;
        return;
    }

    // 2. Cursor-only update (ONLY the mouse moved - no window re-rendering, no full-screen copies)
    if (ms.x != last_cursor_x || ms.y != last_cursor_y) {
        const int cw = MOUSE_CURSOR_W;
        const int ch = MOUSE_CURSOR_H;
        bool had_old = (last_cursor_x >= 0 && last_cursor_y >= 0);

        int old_x = last_cursor_x - MOUSE_CURSOR_HOT_X;
        int old_y = last_cursor_y - MOUSE_CURSOR_HOT_Y;
        int new_x = ms.x - MOUSE_CURSOR_HOT_X;
        int new_y = ms.y - MOUSE_CURSOR_HOT_Y;

        // Build the new frame completely in the back buffer first:
        // erase the old cursor from the pristine desktop copy, then draw the new one.
        if (had_old) wm_restore_from_desktop(old_x, old_y, cw, ch, pitch);
        mouse_draw_cursor(ms.x, ms.y);

        // Then present it in ONE blit. The old code blitted "cursor erased" and "cursor drawn"
        // as two separate steps, so the screen briefly showed no pointer = flicker.
        if (had_old) {
            int ux0 = (old_x < new_x) ? old_x : new_x;
            int uy0 = (old_y < new_y) ? old_y : new_y;
            int ux1 = ((old_x > new_x) ? old_x : new_x) + cw;
            int uy1 = ((old_y > new_y) ? old_y : new_y) + ch;

            if ((ux1 - ux0) * (uy1 - uy0) <= 24000) {
                gfx_swap_rect(ux0, uy0, ux1 - ux0, uy1 - uy0);
            } else {
                // Big jump: two small rects. New position first so a pointer is always visible.
                gfx_swap_rect(new_x, new_y, cw, ch);
                gfx_swap_rect(old_x, old_y, cw, ch);
            }
        } else {
            gfx_swap_rect(new_x, new_y, cw, ch);
        }

        last_cursor_x = ms.x;
        last_cursor_y = ms.y;
    }
}

void wm_process_events(void) {
    mouse_state_t ms;
    mouse_get_state(&ms);

    if (resizing_window) {
        if (ms.buttons & MOUSE_BTN_LEFT) {
            int new_w = ms.x - resizing_window->x;
            int new_h = ms.y - resizing_window->y;
            if (new_w < 260) new_w = 260;
            if (new_h < 180) new_h = 180;
            if (resizing_window->x + new_w > (int)screen_w)
                new_w = (int)screen_w - resizing_window->x;
            if (resizing_window->y + new_h > (int)screen_h - 70)
                new_h = (int)screen_h - 70 - resizing_window->y;

            if (new_w != resizing_window->w || new_h != resizing_window->h) {
                resizing_window->w = new_w;
                resizing_window->h = new_h;
                desktop_dirty = true;
            }
        } else {
            resizing_window = NULL;
            desktop_dirty = true;
        }
    }

    if (dragging_window) {
        if (ms.buttons & MOUSE_BTN_LEFT) {
            int new_x = ms.x - dragging_window->drag_offset_x;
            int new_y = ms.y - dragging_window->drag_offset_y;

            if (new_x < 0) new_x = 0;
            if (new_y < 26) new_y = 26;
            if (new_x + dragging_window->w > (int)screen_w)
                new_x = (int)screen_w - dragging_window->w;
            if (new_y + dragging_window->h > (int)screen_h - 70)
                new_y = (int)screen_h - 70 - dragging_window->h;

            if (new_x != dragging_window->x || new_y != dragging_window->y) {
                dragging_window->x = new_x;
                dragging_window->y = new_y;
                desktop_dirty = true;
            }
        } else {
            dragging_window->is_dragging = false;
            dragging_window = NULL;
            desktop_dirty = true;
        }
    }

    if (ms.clicked) {
        int mx = ms.x;
        int my = ms.y;

        if (wm_dock_handle_click(mx, my)) return;

        // Desktop icons click test: Left column shortcuts (Home, Documents, Pictures, Music, Trash)
        if (mx >= 16 && mx <= 76 && my >= 40 && my <= 380) {
            phase3_open_file_manager();
            return;
        }

        for (int i = num_windows - 1; i >= 0; i--) {
            window_t* win = z_order[i];
            if (!win || win->is_closed || win->is_minimized) continue;

            if (mx >= win->x && mx <= win->x + win->w &&
                my >= win->y && my <= win->y + win->h) {

                wm_focus_window(win);
                desktop_dirty = true;

                // Window control buttons (Close, Minimize, Maximize)
                if (my >= win->y + 8 && my <= win->y + 24) {
                    if (mx >= win->x + 12 && mx <= win->x + 28) {
                        wm_close_window(win);
                        return;
                    }
                    if (mx >= win->x + 30 && mx <= win->x + 46) {
                        wm_minimize_window(win);
                        return;
                    }
                    if (mx >= win->x + 48 && mx <= win->x + 64) {
                        if (win->is_maximized) {
                            win->x = win->orig_x;
                            win->y = win->orig_y;
                            win->w = win->orig_w;
                            win->h = win->orig_h;
                            win->is_maximized = false;
                        } else {
                            win->orig_x = win->x;
                            win->orig_y = win->y;
                            win->orig_w = win->w;
                            win->orig_h = win->h;
                            win->x = 20;
                            win->y = 36;
                            win->w = (int)screen_w - 40;
                            win->h = (int)screen_h - 110;
                            win->is_maximized = true;
                        }
                        desktop_dirty = true;
                        return;
                    }
                }

                // Bottom-right corner resize handle hit test
                if (!win->is_maximized &&
                    mx >= win->x + win->w - 20 && mx <= win->x + win->w &&
                    my >= win->y + win->h - 20 && my <= win->y + win->h) {
                    resizing_window = win;
                    desktop_dirty = true;
                    return;
                }

                // Title bar drag
                if (my < win->y + WM_TITLEBAR_HEIGHT) {
                    win->is_dragging = true;
                    win->drag_offset_x = mx - win->x;
                    win->drag_offset_y = my - win->y;
                    dragging_window = win;
                    desktop_dirty = true;
                    return;
                }

                if (win->on_click) {
                    win->on_click(win, mx - win->x, my - win->y);
                    desktop_dirty = true;
                }
                return;
            }
        }
    }
}
