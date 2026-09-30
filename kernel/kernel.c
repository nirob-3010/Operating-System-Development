#include <stdint.h>
#include "wallpaper.h"

/*
 * NSK OS v0.4 framebuffer desktop
 *
 * GRUB Multiboot v1 supplies the framebuffer information.
 * The kernel explicitly requests a linear graphics mode in boot.s.
 */

typedef struct {
    uint32_t flags;
    uint32_t mem_lower, mem_upper;
    uint32_t boot_device, cmdline, mods_count, mods_addr;
    uint32_t syms[4];
    uint32_t mmap_length, mmap_addr, drives_length, drives_addr;
    uint32_t config_table, boot_loader_name, apm_table;
    uint32_t vbe_control_info, vbe_mode_info;
    uint16_t vbe_mode, vbe_interface_seg, vbe_interface_off, vbe_interface_len;
    uint64_t framebuffer_addr;
    uint32_t framebuffer_pitch, framebuffer_width, framebuffer_height;
    uint8_t framebuffer_bpp, framebuffer_type;
    uint16_t reserved;
} __attribute__((packed)) multiboot_info_t;

typedef struct {
    uint32_t addr;
    uint32_t pitch;
    uint32_t width;
    uint32_t height;
    uint8_t bpp;
    uint8_t type;
} framebuffer_t;

static framebuffer_t fb;
static uint32_t mouse_x, mouse_y;
static int mouse_left, mouse_prev_left;
static uint8_t mp[3];
static int mi;

#define RGB(r,g,b) ((uint32_t)(b) | ((uint32_t)(g)<<8) | ((uint32_t)(r)<<16))

static inline void outb(uint16_t p, uint8_t v) {
    __asm__ volatile ("outb %0,%1" :: "a"(v), "Nd"(p));
}

static inline uint8_t inb(uint16_t p) {
    uint8_t v;
    __asm__ volatile ("inb %1,%0" : "=a"(v) : "Nd"(p));
    return v;
}

static void halt_forever(void) {
    for (;;) __asm__ volatile ("cli; hlt");
}

static void putpixel(int x, int y, uint32_t c) {
    if (x < 0 || y < 0 || x >= (int)fb.width || y >= (int)fb.height)
        return;

    volatile uint8_t *p =
        (volatile uint8_t *)(fb.addr + (uint32_t)y * fb.pitch);

    if (fb.bpp == 32) {
        p += (uint32_t)x * 4;
        *(volatile uint32_t *)p = c;
    } else if (fb.bpp == 24) {
        p += (uint32_t)x * 3;
        p[0] = (uint8_t)(c);
        p[1] = (uint8_t)(c >> 8);
        p[2] = (uint8_t)(c >> 16);
    } else if (fb.bpp == 16) {
        p += (uint32_t)x * 2;
        *(volatile uint16_t *)p =
            (uint16_t)((((c >> 19) & 31) << 11) |
                       (((c >> 10) & 63) << 5) |
                       ((c >> 3) & 31));
    }
}

static void rect(int x, int y, int w, int h, uint32_t c) {
    if (w <= 0 || h <= 0) return;

    if (x < 0) { w += x; x = 0; }
    if (y < 0) { h += y; y = 0; }
    if (x + w > (int)fb.width)  w = (int)fb.width - x;
    if (y + h > (int)fb.height) h = (int)fb.height - y;
    if (w <= 0 || h <= 0) return;

    for (int yy = y; yy < y + h; ++yy)
        for (int xx = x; xx < x + w; ++xx)
            putpixel(xx, yy, c);
}

static void frame(int x, int y, int w, int h, uint32_t c) {
    if (w <= 0 || h <= 0) return;
    rect(x, y, w, 1, c);
    rect(x, y + h - 1, w, 1, c);
    rect(x, y, 1, h, c);
    rect(x + w - 1, y, 1, h, c);
}

/* 5x7 uppercase font: A-Z plus space. */
static const uint8_t font[27][7] = {
    {0,0,0,0,0,0,0}, /* space */
    {14,17,17,31,17,17,17}, /* A */
    {30,17,17,30,17,17,30}, /* B */
    {14,17,16,16,16,17,14}, /* C */
    {30,17,17,17,17,17,30}, /* D */
    {31,16,16,30,16,16,31}, /* E */
    {31,16,16,30,16,16,16}, /* F */
    {14,17,16,23,17,17,14}, /* G */
    {17,17,17,31,17,17,17}, /* H */
    {31,4,4,4,4,4,31}, /* I */
    {7,2,2,2,2,18,12}, /* J */
    {17,18,20,24,20,18,17}, /* K */
    {16,16,16,16,16,16,31}, /* L */
    {17,27,21,17,17,17,17}, /* M */
    {17,25,21,19,17,17,17}, /* N */
    {14,17,17,17,17,17,14}, /* O */
    {30,17,17,30,16,16,16}, /* P */
    {14,17,17,17,21,18,13}, /* Q */
    {30,17,17,30,20,18,17}, /* R */
    {15,16,16,14,1,1,30}, /* S */
    {31,4,4,4,4,4,4}, /* T */
    {17,17,17,17,17,17,14}, /* U */
    {17,17,17,17,17,10,4}, /* V */
    {17,17,17,21,21,21,10}, /* W */
    {17,17,10,4,10,17,17}, /* X */
    {17,17,10,4,4,4,4}, /* Y */
    {31,1,2,4,8,16,31} /* Z */
};

static int glyph_index(char c) {
    if (c == ' ') return 0;
    if (c >= 'A' && c <= 'Z') return (c - 'A') + 1;
    return 0;
}

static void text(int x, int y, const char *s, uint32_t c, int scale) {
    while (*s) {
        int gi = glyph_index(*s++);
        for (int gy = 0; gy < 7; ++gy)
            for (int gx = 0; gx < 5; ++gx)
                if (font[gi][gy] & (1 << (4 - gx)))
                    rect(x + gx * scale, y + gy * scale,
                         scale, scale, c);
        x += 6 * scale;
    }
}

/* ---------- Keyboard ---------- */

static const char keymap[128] = {
    0,27,'1','2','3','4','5','6','7','8','9','0','-','=',8,9,
    'q','w','e','r','t','y','u','i','o','p','[',']','\n',0,'a','s',
    'd','f','g','h','j','k','l',';','\'','`',0,'\\','z','x','c','v',
    'b','n','m',',','.','/',0,'*',0,' ',0
};

static char typed[64];
static int typed_len;

static void keyboard_poll(void) {
    if (!(inb(0x64) & 1)) return;

    uint8_t sc = inb(0x60);
    if (sc & 0x80 || sc >= 128) return;

    char ch = keymap[sc];
    if (!ch) return;

    if (ch == 8) {
        if (typed_len > 0) typed[--typed_len] = 0;
    } else if (ch >= 32 && ch < 127 && typed_len < 62) {
        typed[typed_len++] = ch;
        typed[typed_len] = 0;
    }
}

/* ---------- PS/2 mouse ---------- */

static int mouse_wait(int type) {
    for (uint32_t i = 0; i < 100000; ++i) {
        uint8_t s = inb(0x64);
        if (type == 0 && !(s & 2)) return 1; /* input buffer empty */
        if (type == 1 && (s & 1)) return 1;  /* output buffer full */
    }
    return 0;
}

static void mouse_write(uint8_t d) {
    if (!mouse_wait(0)) return;
    outb(0x64, 0xD4);
    if (!mouse_wait(0)) return;
    outb(0x60, d);
}

static uint8_t mouse_read(void) {
    if (!mouse_wait(1)) return 0;
    return inb(0x60);
}

static void mouse_init(void) {
    if (!mouse_wait(0)) return;
    outb(0x64, 0xA8);

    if (!mouse_wait(0)) return;
    outb(0x64, 0x20);
    uint8_t status = mouse_read();
    status |= 2;
    status &= (uint8_t)~0x20;

    if (!mouse_wait(0)) return;
    outb(0x64, 0x60);
    if (!mouse_wait(0)) return;
    outb(0x60, status);

    mouse_write(0xF6);
    (void)mouse_read();

    mouse_write(0xF4);
    (void)mouse_read();

    mouse_x = fb.width / 2;
    mouse_y = fb.height / 2;
}

typedef struct {
    int x, y, w, h;
    int open, minimized, dragging;
    const char *title;
} window_t;

static window_t wins[2] = {
    {150, 130, 640, 390, 1, 0, 0, "FILES"},
    {250, 190, 430, 260, 1, 0, 0, "TERMINAL"}
};

static int focused = 0;
static int drag_off_x, drag_off_y;

static int hit(window_t *w, int x, int y) {
    return w->open && !w->minimized &&
           x >= w->x && x < w->x + w->w &&
           y >= w->y && y < w->y + w->h;
}

static void window_click(int x, int y) {
    for (int i = 0; i < 2; ++i) {
        if (!hit(&wins[i], x, y)) continue;

        focused = i;
        window_t *w = &wins[i];

        if (y < w->y + 32) {
            if (x < w->x + 58) {
                w->open = 0;
                w->dragging = 0;
                return;
            }
            if (x < w->x + 76) {
                w->minimized = 1;
                w->dragging = 0;
                return;
            }

            w->dragging = 1;
            drag_off_x = x - w->x;
            drag_off_y = y - w->y;
        }
        return;
    }

    /* Desktop shortcuts. */
    if (x >= 20 && x < 105 && y >= 65 && y < 145) {
        wins[0].open = 1;
        wins[0].minimized = 0;
        focused = 0;
        return;
    }
    if (x >= 20 && x < 105 && y >= 145 && y < 225) {
        wins[0].open = 1;
        wins[0].minimized = 0;
        focused = 0;
        return;
    }

    /* Dock launchers. */
    if (y >= (int)fb.height - 100 && y <= (int)fb.height - 8) {
        int dx = ((int)fb.width - 390) / 2;

        if (x >= dx + 12 && x < dx + 60) {
            wins[0].open = 1;
            wins[0].minimized = 0;
            focused = 0;
        } else if (x >= dx + 70 && x < dx + 118) {
            wins[1].open = 1;
            wins[1].minimized = 0;
            focused = 1;
        }
    }
}

static void mouse_poll(void) {
    while (inb(0x64) & 1) {
        uint8_t d = inb(0x60);

        if (mi == 0) {
            if (!(d & 0x08)) continue;
            mp[0] = d;
            mi = 1;
        } else if (mi == 1) {
            mp[1] = d;
            mi = 2;
        } else {
            mp[2] = d;
            mi = 0;

            int dx = (int8_t)mp[1];
            int dy = (int8_t)mp[2];

            if (!(mp[0] & 0x40) && !(mp[0] & 0x80)) {
                int nx = (int)mouse_x + dx;
                int ny = (int)mouse_y - dy;

                if (nx < 0) nx = 0;
                if (ny < 0) ny = 0;
                if (nx >= (int)fb.width) nx = (int)fb.width - 1;
                if (ny >= (int)fb.height) ny = (int)fb.height - 1;

                mouse_x = (uint32_t)nx;
                mouse_y = (uint32_t)ny;
            }

            mouse_prev_left = mouse_left;
            mouse_left = (mp[0] & 1) != 0;

            if (mouse_left && !mouse_prev_left)
                window_click((int)mouse_x, (int)mouse_y);

            if (!mouse_left) {
                for (int i = 0; i < 2; ++i)
                    wins[i].dragging = 0;
            } else if (focused >= 0 && focused < 2 &&
                       wins[focused].dragging) {
                window_t *w = &wins[focused];
                w->x = (int)mouse_x - drag_off_x;
                w->y = (int)mouse_y - drag_off_y;

                if (w->x < 0) w->x = 0;
                if (w->y < 34) w->y = 34;
            }
        }
    }
}

/* ---------- Desktop ---------- */

static void wallpaper_draw(void) {
    const uint16_t *src = (const uint16_t *)wallpaper_rgb565_start;
    for (uint32_t y = 0; y < fb.height; ++y) {
        uint32_t sy = (y * WALL_H) / fb.height;
        for (uint32_t x = 0; x < fb.width; ++x) {
            uint32_t sx = (x * WALL_W) / fb.width;
            uint16_t v = src[sy * WALL_W + sx];
            uint32_t r = ((v >> 11) & 31) << 3;
            uint32_t g = ((v >> 5) & 63) << 2;
            uint32_t b = (v & 31) << 3;
            putpixel((int)x, (int)y, RGB(r,g,b));
        }
    }
}

static void panel(int x, int y, int w, int h, uint32_t c) {
    rect(x, y, w, h, c);
    frame(x, y, w, h, RGB(205,215,230));
}

static void desktop_icon(int x, int y, const char *label, uint32_t c, char letter) {
    rect(x+10, y, 42, 36, c);
    rect(x+16, y+36, 30, 4, c);
    text(x+23, y+10, &letter, RGB(255,255,255), 2);
    text(x, y+50, label, RGB(30,45,65), 1);
}

static void cursor_draw(void) {
    int x = (int)mouse_x;
    int y = (int)mouse_y;
    /* simple high-contrast arrow */
    for (int i = 0; i < 15; ++i) {
        rect(x, y+i, 2, 2, RGB(255,255,255));
        if (i < 9) rect(x+i, y+i, 2, 2, RGB(255,255,255));
    }
    for (int i = 0; i < 7; ++i)
        rect(x+i, y+10, 2, 2, RGB(35,45,60));
}

static void dock_icon(int x, int y, uint32_t c, char letter) {
    rect(x, y, 48, 48, c);
    frame(x, y, 48, 48, RGB(255,255,255));
    text(x+15, y+14, &letter, RGB(255,255,255), 2);
}

static void dock(void) {
    int dw = 390, dh = 68;
    int dx = ((int)fb.width - dw) / 2;
    int dy = (int)fb.height - 86;

    panel(dx, dy, dw, dh, RGB(241,245,252));
    dock_icon(dx+12,  dy+10, RGB(50,130,235), 'F');
    dock_icon(dx+70,  dy+10, RGB(55,185,115), 'T');
    dock_icon(dx+128, dy+10, RGB(70,80,100), 'S');
    dock_icon(dx+186, dy+10, RGB(120,135,160), 'A');
    dock_icon(dx+244, dy+10, RGB(235,170,65), 'N');
    dock_icon(dx+302, dy+10, RGB(90,105,125), 'P');
}

static void topbar(void) {
    rect(0, 0, fb.width, 36, RGB(245,248,253));
    rect(0, 35, fb.width, 1, RGB(205,214,228));
    text(15, 10, "NSK OS", RGB(28,38,55), 2);
    text(110, 10, "FILES", RGB(65,75,90), 1);
    text(155, 10, "EDIT", RGB(65,75,90), 1);
    text(198, 10, "VIEW", RGB(65,75,90), 1);
    text((int)fb.width - 150, 10, "WIFI", RGB(55,70,90), 1);
    text((int)fb.width - 95, 10, "BATTERY", RGB(55,70,90), 1);
    text((int)fb.width - 42, 10, "100", RGB(35,45,60), 1);
}

static void draw_window(window_t *w) {
    if (!w->open || w->minimized) return;

    rect(w->x+6, w->y+8, w->w, w->h, RGB(95,110,130));
    panel(w->x, w->y, w->w, w->h, RGB(248,250,253));

    rect(w->x, w->y, w->w, 34, RGB(238,243,250));
    rect(w->x, w->y+33, w->w, 1, RGB(210,218,230));

    rect(w->x+12, w->y+12, 10, 10, RGB(235,85,85));
    rect(w->x+30, w->y+12, 10, 10, RGB(242,190,70));
    rect(w->x+48, w->y+12, 10, 10, RGB(75,195,105));
    text(w->x+78, w->y+10, w->title, RGB(40,50,65), 2);
}

static void file_manager_content(void) {
    if (!wins[0].open || wins[0].minimized) return;
    window_t *w = &wins[0];
    rect(w->x+1, w->y+34, 145, w->h-35, RGB(240,244,249));
    text(w->x+18, w->y+58, "HOME", RGB(40,75,125), 2);
    text(w->x+18, w->y+88, "DOCUMENTS", RGB(65,75,90), 1);
    text(w->x+18, w->y+112, "PICTURES", RGB(65,75,90), 1);
    text(w->x+18, w->y+136, "DOWNLOADS", RGB(65,75,90), 1);
    text(w->x+18, w->y+160, "SETTINGS", RGB(65,75,90), 1);

    int sx = w->x + 185, sy = w->y + 70;
    const char *names[] = {"DESKTOP", "FILES", "APPS", "SYSTEM"};
    uint32_t colors[] = {RGB(65,145,235), RGB(75,175,110), RGB(235,175,65), RGB(125,135,155)};
    for (int i=0; i<4; ++i) {
        int xx = sx + (i%2)*110, yy = sy + (i/2)*105;
        rect(xx, yy, 58, 48, colors[i]);
        text(xx+18, yy+14, "F", RGB(255,255,255), 2);
        text(xx-2, yy+58, names[i], RGB(45,55,70), 1);
    }
}

static void terminal_content(void) {
    if (!wins[1].open || wins[1].minimized) return;
    window_t *w = &wins[1];
    rect(w->x+14, w->y+50, w->w-28, w->h-64, RGB(245,248,252));
    text(w->x+28, w->y+68, "NSK OS TERMINAL", RGB(35,95,180), 2);
    text(w->x+28, w->y+96, "NSK@OS:~$", RGB(40,145,90), 1);
    if (typed_len)
        text(w->x+95, w->y+96, typed, RGB(40,45,55), 1);
    text(w->x+28, w->y+122, "READY", RGB(65,75,90), 1);
}

static void desktop(void) {
    wallpaper_draw();
    topbar();

    desktop_icon(25, 75, "HOME", RGB(60,145,235), 'H');
    desktop_icon(25, 155, "FILES", RGB(75,175,110), 'F');
    desktop_icon(25, 235, "TRASH", RGB(120,130,145), 'T');

    /* Draw back window first, focused window last. */
    if (focused == 0) {
        draw_window(&wins[1]);
        draw_window(&wins[0]);
    } else {
        draw_window(&wins[0]);
        draw_window(&wins[1]);
    }
    file_manager_content();
    terminal_content();

    dock();
    cursor_draw();
}

void kmain(uint32_t magic, uint32_t info_addr) {
    if (magic != 0x2BADB002)
        halt_forever();

    multiboot_info_t *mb = (multiboot_info_t *)info_addr;

    /* Multiboot framebuffer information is bit 12. */
    if (!(mb->flags & (1u << 12)))
        halt_forever();

    /* BIOS/GRUB framebuffer addresses used by 32-bit x86 are below 4 GiB. */
    if (mb->framebuffer_addr > 0xFFFFFFFFULL)
        halt_forever();

    fb.addr   = (uint32_t)mb->framebuffer_addr;
    fb.pitch  = mb->framebuffer_pitch;
    fb.width  = mb->framebuffer_width;
    fb.height = mb->framebuffer_height;
    fb.bpp    = mb->framebuffer_bpp;
    fb.type   = mb->framebuffer_type;

    if (!fb.addr || !fb.pitch || !fb.width || !fb.height)
        halt_forever();

    if (fb.bpp != 16 && fb.bpp != 24 && fb.bpp != 32)
        halt_forever();

    mouse_init();
    desktop();

    for (;;) {
        keyboard_poll();
        mouse_poll();
        desktop();
        __asm__ volatile ("hlt");
    }
}
