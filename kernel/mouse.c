/**
 * NSK OS v0.3 - PS/2 Mouse Driver (Phase 3)
 * Full 8042 controller auxiliary device driver, IRQ 12 packet handler, 200 Hz sampling.
 *
 * Smoothness design:
 *   - Sub-pixel position: the pointer lives in 24.8 fixed point, so no motion is ever
 *     rounded away (the old integer maths dropped fractions on slow, precise moves).
 *   - Continuous acceleration curve instead of 4 hard speed steps (no sudden jumps in gain).
 *   - Correct 9-bit packet decoding; overflow packets are clamped, not dropped.
 *   - IRQ handler drains every queued byte so input never builds up latency.
 *   - Anti-aliased sprite with soft shadow (include/cursor_sprite.h).
 */
#include "mouse.h"
#include "idt.h"
#include "pic.h"
#include "io.h"
#include "gfx.h"
#include "printf.h"
#include "cursor_sprite.h"

_Static_assert(CURSOR_SPRITE_W == MOUSE_CURSOR_W && CURSOR_SPRITE_H == MOUSE_CURSOR_H &&
               CURSOR_SPRITE_HOT_X == MOUSE_CURSOR_HOT_X && CURSOR_SPRITE_HOT_Y == MOUSE_CURSOR_HOT_Y,
               "include/cursor_sprite.h is out of sync with MOUSE_CURSOR_* in include/mouse.h");

// Pointer position in 1/256 pixel units
#define POS_FRAC_BITS 8

// Acceleration: gain is 8.8 fixed point, rising linearly with speed (counts per packet)
// and then holding steady. Slow motion ~1.1x, medium ~1.6x, fast flicks ~3.2x.
#define ACCEL_BASE   256
#define ACCEL_SLOPE  28
#define ACCEL_CAP    20

static mouse_state_t mouse_state;
static volatile bool mouse_pending = false;
static uint32_t bound_width = 1024;
static uint32_t bound_height = 768;

static int pos_fx = 0;   // 24.8 fixed-point X
static int pos_fy = 0;   // 24.8 fixed-point Y

static uint8_t mouse_cycle = 0;
static uint8_t mouse_bytes[3];

static inline void mouse_wait_write(void) {
    uint32_t timeout = 100000;
    while ((inb(0x64) & 0x02) && --timeout);
}

static inline void mouse_wait_read(void) {
    uint32_t timeout = 100000;
    while (!(inb(0x64) & 0x01) && --timeout);
}

static void mouse_write(uint8_t write) {
    mouse_wait_write();
    outb(0x64, 0xD4); // Tell 8042 to route to auxiliary mouse
    mouse_wait_write();
    outb(0x60, write);
}

static uint8_t mouse_read(void) {
    mouse_wait_read();
    return inb(0x60);
}

// Smooth, continuous pointer gain (8.8 fixed point) for one packet's movement
static inline int mouse_accel_gain(int dx, int dy) {
    int ax = (dx < 0) ? -dx : dx;
    int ay = (dy < 0) ? -dy : dy;
    int hi = (ax > ay) ? ax : ay;
    int lo = (ax > ay) ? ay : ax;
    int speed = hi + (lo >> 1);               // cheap vector-length estimate
    if (speed > ACCEL_CAP) speed = ACCEL_CAP;
    return ACCEL_BASE + speed * ACCEL_SLOPE;
}

static void mouse_apply_packet(uint8_t flags, uint8_t raw_dx, uint8_t raw_dy) {
    // Movement is a 9-bit two's complement value: data byte + sign bit from the flags byte.
    // (On overflow the hardware already saturates it, so we keep the packet instead of
    // dropping it - dropping made fast flicks stall.)
    int dx = (int)raw_dx - ((flags & 0x10) ? 256 : 0);
    int dy = (int)raw_dy - ((flags & 0x20) ? 256 : 0);

    int gain = mouse_accel_gain(dx, dy);

    int max_fx = ((int)bound_width  - 1) << POS_FRAC_BITS;
    int max_fy = ((int)bound_height - 1) << POS_FRAC_BITS;

    pos_fx += dx * gain;
    pos_fy -= dy * gain;                      // PS/2 Y axis points up
    if (pos_fx < 0) pos_fx = 0;
    if (pos_fy < 0) pos_fy = 0;
    if (pos_fx > max_fx) pos_fx = max_fx;
    if (pos_fy > max_fy) pos_fy = max_fy;

    uint8_t buttons = flags & 0x07;

    mouse_state.prev_x = mouse_state.x;
    mouse_state.prev_y = mouse_state.y;
    mouse_state.prev_buttons = mouse_state.buttons;

    mouse_state.x = pos_fx >> POS_FRAC_BITS;
    mouse_state.y = pos_fy >> POS_FRAC_BITS;
    mouse_state.buttons = buttons;

    bool did_move = (mouse_state.x != mouse_state.prev_x || mouse_state.y != mouse_state.prev_y);
    bool left_now  = (buttons & MOUSE_BTN_LEFT) != 0;
    bool left_prev = (mouse_state.prev_buttons & MOUSE_BTN_LEFT) != 0;

    // Event flags are sticky until read, so a fast press+release between two polls is not lost
    if (did_move) mouse_state.moved = true;
    if (left_now && !left_prev) mouse_state.clicked = true;
    if (!left_now && left_prev) mouse_state.released = true;

    if (did_move || buttons != mouse_state.prev_buttons) {
        mouse_pending = true;
    }
}

static void mouse_feed_byte(uint8_t b) {
    if (mouse_cycle == 0) {
        // Byte 0 of every packet has bit 3 set - use it to stay in sync
        if ((b & 0x08) == 0) return;
        mouse_bytes[0] = b;
        mouse_cycle = 1;
    } else if (mouse_cycle == 1) {
        mouse_bytes[1] = b;
        mouse_cycle = 2;
    } else {
        mouse_bytes[2] = b;
        mouse_cycle = 0;
        mouse_apply_packet(mouse_bytes[0], mouse_bytes[1], mouse_bytes[2]);
    }
}

static void mouse_interrupt_handler(registers_t* regs) {
    (void)regs;
    uint8_t status = inb(0x64);
    if (!(status & 0x01)) return; // No data

    // Drain every byte the controller has queued (bit 0 = output full, bit 5 = from mouse)
    int budget = 16;
    do {
        mouse_feed_byte(inb(0x60));
        status = inb(0x64);
    } while (((status & 0x21) == 0x21) && --budget > 0);
}

void mouse_init(uint32_t screen_width, uint32_t screen_height) {
    bound_width = screen_width ? screen_width : 1024;
    bound_height = screen_height ? screen_height : 768;

    mouse_state.x = (int)bound_width * 46 / 100;
    mouse_state.y = (int)bound_height * 42 / 100;
    pos_fx = mouse_state.x << POS_FRAC_BITS;
    pos_fy = mouse_state.y << POS_FRAC_BITS;
    mouse_state.prev_x = mouse_state.x;
    mouse_state.prev_y = mouse_state.y;
    mouse_state.buttons = 0;
    mouse_state.prev_buttons = 0;
    mouse_state.moved = false;
    mouse_state.clicked = false;
    mouse_state.released = false;
    mouse_cycle = 0;
    mouse_pending = true;

    // Enable auxiliary mouse device on 8042 controller
    mouse_wait_write();
    outb(0x64, 0xA8);

    // Read controller command byte
    mouse_wait_write();
    outb(0x64, 0x20);
    uint8_t status = mouse_read();

    // Enable mouse interrupt (bit 1) and disable clock inhibit (bit 5)
    status |= 0x02;
    status &= ~0x20;

    mouse_wait_write();
    outb(0x64, 0x60);
    mouse_wait_write();
    outb(0x60, status);

    // 1. Tell mouse to use default settings
    mouse_write(0xF6);
    mouse_read(); // ACK

    // 2. Set Sample Rate to 200 Hz for ultra-smooth buttery motion
    mouse_write(0xF3);
    mouse_read();
    mouse_write(200);
    mouse_read();

    // 3. Set Resolution to 8 counts/mm for high sensitivity
    mouse_write(0xE8);
    mouse_read();
    mouse_write(3);
    mouse_read();

    // 4. Enable data packet streaming
    mouse_write(0xF4);
    mouse_read(); // ACK

    // Register IRQ 12 handler (Interrupt 44 = 32 + 12)
    register_interrupt_handler(44, mouse_interrupt_handler);

    // Unmask IRQ 2 (cascade) and IRQ 12 (PS/2 mouse) in PIC
    pic_unmask_irq(2);
    pic_unmask_irq(12);

    kprintf("[NSK MOUSE] PS/2 Mouse driver initialized (200 Hz Sampling, IRQ 12 active, Pos: [%d, %d])\n",
            mouse_state.x, mouse_state.y);
}

void mouse_get_state(mouse_state_t* out_state) {
    if (!out_state) return;

    // The IRQ 12 handler updates mouse_state asynchronously. Copy it with interrupts
    // masked so we never read a half-updated position, and so a packet that lands right
    // after the copy is not wiped out by the flag reset below.
    uint32_t eflags;
    __asm__ volatile ("pushfl; popl %0; cli" : "=r"(eflags) : : "memory");

    *out_state = mouse_state;
    mouse_state.moved = false;
    mouse_state.clicked = false;    // click / release are one-shot events
    mouse_state.released = false;
    mouse_pending = false;

    if (eflags & 0x200) {
        __asm__ volatile ("sti" : : : "memory");
    }
}

bool mouse_has_pending_event(void) {
    return mouse_pending;
}

// Draws the anti-aliased sprite into the back buffer. (x, y) is the pointer position;
// the sprite is offset so its arrow tip sits exactly on it.
void mouse_draw_cursor(int x, int y) {
    uint32_t* bb = gfx_get_backbuffer();
    if (!bb) return;

    int sw = (int)gfx_get_width();
    int sh = (int)gfx_get_height();
    uint32_t pitch = gfx_get_pitch();
    if (!pitch) pitch = (uint32_t)sw;

    int ox = x - CURSOR_SPRITE_HOT_X;
    int oy = y - CURSOR_SPRITE_HOT_Y;

    for (int r = 0; r < CURSOR_SPRITE_H; r++) {
        int py = oy + r;
        if (py < 0 || py >= sh) continue;

        const uint32_t* src = &cursor_sprite_argb[r * CURSOR_SPRITE_W];
        uint32_t* dst = &bb[(uint32_t)py * pitch];

        for (int c = 0; c < CURSOR_SPRITE_W; c++) {
            int px = ox + c;
            if (px < 0 || px >= sw) continue;

            uint32_t p = src[c];
            uint32_t a = p >> 24;
            if (a == 0) continue;
            dst[px] = (a == 255) ? p : gfx_alpha_blend(dst[px], p);
        }
    }
}
