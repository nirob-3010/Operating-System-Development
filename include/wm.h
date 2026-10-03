/**
 * NSK OS v0.3 - Window Manager & Desktop UI Engine (Phase 3)
 * Signature Frosted Glass Acrylic design, Z-Ordering, Draggable Windows, Taskbar & Start Menu
 */
#ifndef NSK_WM_H
#define NSK_WM_H

#include "types.h"
#include "mouse.h"

#define WM_MAX_WINDOWS      16
#define WM_TITLEBAR_HEIGHT  34
#define WM_TOPBAR_HEIGHT    28
#define WM_TASKBAR_HEIGHT   46
#define WM_MIN_WINDOW_W     220
#define WM_MIN_WINDOW_H     150

struct window;
typedef struct window window_t;

typedef void (*window_render_fn)(window_t* win, int client_x, int client_y, int client_w, int client_h);
typedef void (*window_click_fn)(window_t* win, int rel_x, int rel_y);

struct window {
    int  id;
    char title[48];
    int  x;
    int  y;
    int  w;
    int  h;
    int  orig_x;
    int  orig_y;
    int  orig_w;
    int  orig_h;
    int  drag_offset_x;
    int  drag_offset_y;
    bool is_maximized;
    bool is_minimized;
    bool is_closed;
    bool is_focused;
    bool is_dragging;
    bool is_resizing;
    int  resize_edges;
    int  z_index;
    window_render_fn render_client;
    window_click_fn  on_click;
    void* user_data;
};

// Window Manager Lifecycle
void      wm_init(void);
window_t* wm_create_window(const char* title, int x, int y, int w, int h, window_render_fn render_fn, window_click_fn click_fn);
void      wm_bring_to_front(window_t* win);
void      wm_focus_window(window_t* win);
void      wm_close_window(window_t* win);
void      wm_minimize_window(window_t* win);
void      wm_restore_window(window_t* win);

// Interaction & Rendering
void      wm_process_events(void);
void      wm_render(void);
bool      wm_is_start_menu_open(void);
void      wm_toggle_start_menu(void);

#endif /* NSK_WM_H */
