/**
 * NSK OS v0.3 - Phase 3 Desktop UI & Window Manager Demo
 * Exact Reference Match:
 * Window 1: Modern "File Manager" with sidebar, breadcrumb bar and folder grid
 * Window 2: "NSK Terminal" with neofetch ASCII art and system specs
 */
#include "phase3.h"
#include "wm.h"
#include "mouse.h"
#include "keyboard.h"
#include "gfx.h"
#include "font.h"
#include "pit.h"
#include "rtc.h"
#include "sysinfo.h"
#include "printf.h"
#include "string.h"
#include "dock_icons.h"


static void render_file_icon(int x, int y, int size) {
    /* Reuse the existing file.jpeg-derived artwork; only scale it for folder cells. */
    uint32_t* bb = gfx_get_backbuffer();
    uint32_t pitch = gfx_get_pitch(); if (!pitch) pitch = gfx_get_width();
    if (!bb) return;
    for (int py = 0; py < size; py++) {
        int sy = (py * DOCK_ICON_CELL) / size;
        for (int px = 0; px < size; px++) {
            int sx = (px * DOCK_ICON_CELL) / size;
            uint32_t p = dock_icon_pm[DOCK_ICON_FILES][sy * DOCK_ICON_CELL + sx];
            uint32_t a = p >> 24;
            if (!a) continue;
            int dx=x+px, dy=y+py;
            if (dx < 0 || dy < 0 || dx >= (int)gfx_get_width() || dy >= (int)gfx_get_height()) continue;
            uint32_t* d=&bb[(uint32_t)dy*pitch+(uint32_t)dx];
            if (a==255) *d=p;
            else {
                uint32_t inv=255-a, old=*d;
                uint32_t r=((p>>16)&255)+((((old>>16)&255)*inv+127)/255);
                uint32_t g=((p>>8)&255)+((((old>>8)&255)*inv+127)/255);
                uint32_t b=(p&255)+(((old&255)*inv+127)/255);
                *d=0xFF000000|((r>255?255:r)<<16)|((g>255?255:g)<<8)|(b>255?255:b);
            }
        }
    }
}

// -----------------------------------------------------------------------------
// Window 1: File Manager Client Area (Exact Reference Replica)
// -----------------------------------------------------------------------------

static void render_file_manager_client(window_t* win, int cx, int cy, int cw, int ch) {
    (void)win; (void)ch;

    // 1. Toolbar Row (Navigation, Breadcrumb path, Search box)
    int tb_y = cy + 4;
    // Navigation arrows: <- ->
    gfx_fill_rounded_rect_aa(cx + 8, tb_y, 22, 22, 6, 0xFFF1F5F9);
    font_draw_string(cx + 14, tb_y + 4, "<", 0xFF64748B, 1);

    gfx_fill_rounded_rect_aa(cx + 34, tb_y, 22, 22, 6, 0xFFF1F5F9);
    font_draw_string(cx + 40, tb_y + 4, ">", 0xFF64748B, 1);

    // Breadcrumb path box: [ 🏠  /home ]
    int path_w = 170;
    gfx_fill_rounded_rect_aa(cx + 62, tb_y, path_w, 24, 8, 0xFFF8FAFC);
    gfx_draw_rounded_rect_aa(cx + 62, tb_y, path_w, 24, 8, 0xFFE2E8F0);
    font_draw_string(cx + 72, tb_y + 5, "[#] /home", 0xFF1E293B, 1);

    // Search Box: [ 🔍 Search files... ]
    int search_w = cw - 250;
    if (search_w > 120) {
        int search_x = cx + cw - search_w - 8;
        gfx_fill_rounded_rect_aa(search_x, tb_y, search_w, 24, 8, 0xFFF8FAFC);
        gfx_draw_rounded_rect_aa(search_x, tb_y, search_w, 24, 8, 0xFFE2E8F0);
        font_draw_string(search_x + 10, tb_y + 5, "Search files...", 0xFF94A3B8, 1);
    }

    gfx_draw_line(cx + 6, cy + 34, cx + cw - 6, cy + 34, 0x20CBD5E1);

    // 2. Left Sidebar (w = 105)
    int sb_x = cx + 8;
    int sb_y = cy + 42;
    int sb_w = 100;

    const char* nav_items[] = {
        "[*] Home",
        "[-] Documents",
        "[-] Pictures",
        "[-] Music",
        "[-] Videos",
        "[-] Downloads",
        "[@] Settings"
    };

    for (int i = 0; i < 7; i++) {
        int item_y = sb_y + (i * 26);
        if (i == 0) {
            // Active item: vibrant blue pill
            gfx_fill_rounded_rect_aa(sb_x, item_y, sb_w, 24, 6, 0xFF3B82F6);
            font_draw_string(sb_x + 8, item_y + 5, nav_items[i], 0xFFFFFFFF, 1);
        } else {
            font_draw_string(sb_x + 8, item_y + 5, nav_items[i], 0xFF475569, 1);
        }
    }

    // Sidebar vertical separator line
    gfx_draw_line(cx + 116, cy + 36, cx + 116, cy + ch - 8, 0x20CBD5E1);

    // 3. Main Folder Grid Area (Right of sidebar)
    int grid_x = cx + 128;
    int grid_y = cy + 44;

    // Row 1: Documents, Pictures, Music, Videos
    const char* folders_r1[] = { "Documents", "Pictures", "Music", "Videos" };
    for (int col = 0; col < 4; col++) {
        int fx = grid_x + (col * 84);
        int fy = grid_y;

        render_file_icon(fx, fy - 4, 52);

        // Label below
        font_draw_string(fx - 4, fy + 42, folders_r1[col], 0xFF1E293B, 1);
    }

    // Row 2: Downloads (with arrow), Trash (recycle bin)
    int r2_y = grid_y + 68;

    // Downloads: same existing File Manager artwork, with text identifying the folder.
    int dx = grid_x;
    render_file_icon(dx, r2_y - 4, 52);
    font_draw_string(dx - 4, r2_y + 42, "Downloads", 0xFF1E293B, 1);

    // Trash
    int tx = grid_x + 84;
    gfx_fill_rounded_rect_aa(tx + 4, r2_y, 38, 36, 8, 0xFFE2E8F0);
    gfx_draw_rounded_rect_aa(tx + 4, r2_y, 38, 36, 8, 0xFFCBD5E1);
    font_draw_string(tx + 14, r2_y + 11, "[x]", 0xFF3B82F6, 1);
    font_draw_string(tx + 8, r2_y + 42, "Trash", 0xFF1E293B, 1);
}

// -----------------------------------------------------------------------------
// Window 2: NSK Terminal Client Area (Exact Reference Replica with Neofetch)
// -----------------------------------------------------------------------------

static void render_terminal_client(window_t* win, int cx, int cy, int cw, int ch) {
    (void)win; (void)ch;

    // Command Prompt line: nsk@nskos:~$ neofetch
    int line_y = cy + 4;
    font_draw_string(cx + 8, line_y, "nsk@nskos", 0xFF10B981, 1); // Green user
    font_draw_string(cx + 78, line_y, ":", 0xFF94A3B8, 1);
    font_draw_string(cx + 86, line_y, "~$", 0xFF3B82F6, 1); // Blue path
    font_draw_string(cx + 104, line_y, "neofetch", 0xFF0F172A, 1);
    line_y += 18;

    // Neofetch Section:
    // Left: ASCII Art ribbon (in blue/cyan)
    // Right: System Information specs

    int ascii_x = cx + 8;
    int specs_x = cx + 186;

    // ASCII Art lines (NSK OS Ribbon fold)
    const char* ascii_art[] = {
        "       .-/+oossssoo+/-.       ",
        "    `:+ssssssssssssssss+:     ",
        "  -+ssssssssssssssssss+`      ",
        "`:+sssssssssssssssssssss+:    ",
        " `:sssssss:          :ssssss+:",
        " `.osysssss-          -sssyyo.",
        " :osssssss/            /sssssso:",
        " +sssssso.              .ossssso+",
        " `osysss/                /ssyssso",
        " :osssss-                -ssssss:",
        " `+ssssss+              +ssssss+`",
        "   :osssss-            -osssss:` ",
        "     :osssss+        +ssssss:    ",
        "       `oyyyyyy/--/+yyyyyyyo`    ",
        "          `/osssssssssssooo/`    ",
        "             `:oosssssssso02.    ",
        "                `.-/+o6sssssoo+-"
    };

    for (int i = 0; i < 17; i++) {
        font_draw_string(ascii_x, line_y + (i * 12), ascii_art[i], 0xFF0284C7, 1);
    }

    // Right Side: System Specs table
    int sy = line_y + 4;
    font_draw_string(specs_x, sy, "NSK OS v0.3", 0xFF0284C7, 1);
    sy += 16;
    font_draw_string(specs_x, sy, "-------------------", 0xFFCBD5E1, 1);
    sy += 14;

    uint32_t uptime_sec = pit_get_uptime_seconds();
    uint32_t mins = (uptime_sec / 60) + 3; // +3m baseline

    char uptime_buf[32];
    snprintf(uptime_buf, sizeof(uptime_buf), "Uptime    : %um", mins);

    uint32_t sw = gfx_get_width();
    uint32_t sh = gfx_get_height();
    char res_buf[32];
    snprintf(res_buf, sizeof(res_buf), "Resolution: %ux%u", sw, sh);

    font_draw_string(specs_x, sy, "Host      : NSK-PC", 0xFF334155, 1); sy += 13;
    font_draw_string(specs_x, sy, "Kernel    : 0.3.0", 0xFF334155, 1); sy += 13;
    font_draw_string(specs_x, sy, uptime_buf, 0xFF334155, 1); sy += 13;
    font_draw_string(specs_x, sy, "Shell     : bash", 0xFF334155, 1); sy += 13;
    font_draw_string(specs_x, sy, res_buf, 0xFF334155, 1); sy += 13;

    sysinfo_metrics_t sys;
    sysinfo_get_metrics(&sys);
    char mem_buf[32];
    snprintf(mem_buf, sizeof(mem_buf), "Memory    : %uMB / %uMB", sys.ram_used_mb, sys.ram_total_mb);
    font_draw_string(specs_x, sy, mem_buf, 0xFF334155, 1); sy += 13;

    font_draw_string(specs_x, sy, "DE        : NSK Desktop", 0xFF334155, 1); sy += 13;
    font_draw_string(specs_x, sy, "WM        : Window Manager", 0xFF334155, 1); sy += 13;
    font_draw_string(specs_x, sy, "Theme     : Light", 0xFF334155, 1); sy += 13;
    font_draw_string(specs_x, sy, "Icons     : Fluent", 0xFF334155, 1); sy += 16;

    // Color Swatches Palette row (Red, Green, Yellow, Blue, Purple, Cyan, White)
    uint32_t swatches[] = {
        0xFFFCA5A5, 0xFF86EFAC, 0xFFFDE047, 0xFF93C5FD, 0xFFC4B5FD, 0xFF67E8F9, 0xFFE2E8F0
    };
    for (int c = 0; c < 7; c++) {
        gfx_fill_rounded_rect_aa(specs_x + (c * 18), sy, 14, 10, 2, swatches[c]);
    }
    sy += 18;

    // Active Bottom Prompt: nsk@nskos:~$ █
    int py = line_y + 210;
    font_draw_string(cx + 8, py, "nsk@nskos", 0xFF10B981, 1);
    font_draw_string(cx + 78, py, ":", 0xFF94A3B8, 1);
    font_draw_string(cx + 86, py, "~$", 0xFF3B82F6, 1);
    // Cursor block
    gfx_fill_rounded_rect_aa(cx + 104, py + 1, 7, 12, 1, 0xFF1E293B);
}

void phase3_desktop_init(void) {
    kprintf("\n[NSK WM] Initializing Phase 3 Desktop UI (Bloom Light Theme)...\n");

    uint32_t width = gfx_get_width();
    uint32_t height = gfx_get_height();

    // 1. Initialize PS/2 Mouse & Keyboard Drivers
    mouse_init(width, height);
    keyboard_init();

    // 2. Initialize Window Manager & Light Bloom Wallpaper Cache
    wm_init();

    // 3. Create 2 Windows matching reference image exactly:
    // Window 1: File Manager (Left side, light theme)
    int win1_w = (width > 600) ? 510 : (width - 60);
    int win1_h = 360;
    int win1_x = 90;
    int win1_y = 52;

    window_t* win1 = wm_create_window("File Manager", win1_x, win1_y, win1_w, win1_h,
                                      render_file_manager_client, NULL);
    if (win1) wm_close_window(win1); /* Dock launches/restores it; desktop starts clean. */

    // Window 2: NSK Terminal (available from Dock, not opened at boot)
    int win2_w = (width > 600) ? 480 : (width - 60);
    int win2_h = 330;
    int win2_x = (width > 600) ? ((int)width - win2_w - 40) : 120;
    int win2_y = 230;

    window_t* win2 = wm_create_window("NSK Terminal", win2_x, win2_y, win2_w, win2_h,
                                      render_terminal_client, NULL);

    // Focus Terminal window so it's overlapping in front, exactly like the reference screenshot!
    wm_focus_window(win2);

    kprintf("[NSK WM] Created Window 1: \"File Manager\" [Left]\n");
    kprintf("[NSK WM] Created Window 2: \"NSK Terminal\" [Overlapping Right]\n");
    kprintf("[NSK WM] ==============================================================\n");
    kprintf("[NSK WM]       >>> PHASE 3 DESKTOP UI & WINDOW MANAGER ACTIVE <<<       \n");
    kprintf("[NSK WM] Reference UI + Dock + Top Menu Bar + High-Contrast Cursor [OK] \n");
    kprintf("[NSK WM] ==============================================================\n\n");

    // 4. Initial Render Pass
    wm_render();

    // 5. Interactive Event Loop
    uint32_t last_tick = pit_get_ticks();

    while (1) {
        // Atomic "check, then sleep": interrupts stay masked while we decide, and `sti; hlt`
        // re-enables them only on the very instruction before halting. Without this, a mouse
        // packet arriving between the check and the hlt left the CPU asleep until the next
        // 10 ms timer tick, which showed up as irregular pointer motion.
        __asm__ volatile ("cli" : : : "memory");
        uint32_t cur_tick = pit_get_ticks();

        if (cur_tick == last_tick && !mouse_has_pending_event()) {
            __asm__ volatile ("sti; hlt" : : : "memory");
            continue;
        }
        __asm__ volatile ("sti" : : : "memory");

        last_tick = cur_tick;

        // Process mouse events, window drag, buttons
        wm_process_events();

        // Render updated desktop / fast cursor blit
        wm_render();
    }
}
