#!/usr/bin/env python3
"""
NSK OS - Dock icon asset generator.

Takes the original dock icon JPEGs in assets/dock_icons/ and prepares them for the Dock
WITHOUT touching the artwork:

  * the white JPEG backdrop outside each icon becomes transparent (alpha matte only -
    the icon pixels themselves are never recoloured, redrawn or filtered)
  * soft drop shadows that are baked into the white backdrop become real alpha
  * every icon is scaled/padded to the same cell: squircle icons get an identical body
    size (the macOS-style ones carry ~10% built-in margin, the full-bleed ones carry none,
    so they are normalised to match); the folder glyph is fitted by width

Outputs
  include/dock_icons.h            premultiplied ARGB, CELL x CELL, used by kernel/wm.c
  src/assets/dock-icons/*.png     transparent PNGs for the React preview Dock
  --preview FILE                  contact sheet (light + dark backgrounds) for checking

Usage:  python3 tools/gen_dock_icons.py [--preview /tmp/dock_icons_preview.png]
Needs:  pillow, numpy, scipy
"""
import argparse
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

SRC_DIR = "assets/dock_icons"

# (c-name, file, kind)
#   squircle_mac  : macOS Big Sur style, squircle inset 100/1024 inside the canvas, baked shadow
#   squircle_full : iOS style full-bleed squircle, white corners
#   glyph         : free-standing shape on white (the folder)
ICONS = [
    ("FILES",      "file.jpeg",       "glyph"),
    ("BROWSER",    "browser.jpeg",    "squircle_full"),
    ("PHOTOS",     "Photos.jpeg",     "squircle_mac"),
    ("CALENDAR",   "calender.jpeg",   "squircle_mac"),
    ("NOTES",      "note_pad.jpeg",   "squircle_full"),
    ("CLOCK",      "clock.jpeg",      "squircle_full"),
    ("CALCULATOR", "Calculator.jpeg", "squircle_full"),
    ("SETTINGS",   "settings.jpeg",   "squircle_mac"),
]

KERNEL_CELL = 52     # px, square cell the kernel blits 1:1 (mouse-free, no runtime scaling)
KERNEL_BODY = 44     # px, visible squircle body inside the cell (4 px left for shadow)
WEB_CELL = 128
WEB_BODY = 108       # same 44/52 ratio

MAC_INSET = 100 / 1024.0     # macOS icon grid: 824 px body in a 1024 px canvas


def load_rgb(path):
    return np.asarray(Image.open(path).convert("RGB")).astype(np.float32)


def border_connected(mask):
    """Connected components of `mask` that touch the image border."""
    lab, _ = ndi.label(mask)
    edge = np.unique(np.concatenate([lab[0, :], lab[-1, :], lab[:, 0], lab[:, -1]]))
    edge = edge[edge != 0]
    return np.isin(lab, edge)


def canonical_squircle(path):
    """Apple's continuous-corner squircle, measured from the black Calculator icon."""
    a = load_rgb(path)
    minc = a.min(axis=2)
    bg = border_connected(minc > 235)
    band = ndi.binary_dilation(bg, iterations=2) & ~bg
    rim = float(np.percentile(minc[band], 3))
    s = np.ones_like(minc)
    s[bg] = 0.0
    s[band] = np.clip((255.0 - minc[band]) / (255.0 - rim), 0.0, 1.0)
    return s


def resize_f(arr, size):
    return np.asarray(Image.fromarray(arr.astype(np.float32), "F").resize((size, size), Image.LANCZOS))


def erode_soft(m, px=1):
    """Pull the matte ~px inside the true edge so no white from the JPEG backdrop survives."""
    m = ndi.minimum_filter(m, size=2 * px + 1)
    return np.clip(ndi.gaussian_filter(m, 0.6), 0, 1)


def body_matte(kind, rgb, squircle):
    """Return (alpha_body float HxW, body_box (x0,y0,x1,y1))."""
    h, w, _ = rgb.shape
    if kind == "glyph":
        d = (255.0 - rgb).max(axis=2)
        bg = border_connected(d <= 40)                 # enclosed white details stay part of the art
        m = erode_soft((~bg).astype(np.float32))
        ys, xs = np.where(m > 0.5)
        return m, (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)

    if kind == "squircle_mac":
        inset = int(round(w * MAC_INSET))
        box = (inset, inset, w - inset, h - inset)
    else:
        box = (0, 0, w, h)
    bw, bh = box[2] - box[0], box[3] - box[1]
    m = np.zeros((h, w), np.float32)
    m[box[1]:box[3], box[0]:box[2]] = resize_f(np.clip(squircle, 0, 1), bw) if bw == bh else 0
    return erode_soft(np.clip(m, 0, 1)), box


def shadow_alpha(rgb, body):
    """Neutral drop shadow baked into the white backdrop -> black with alpha."""
    minc = rgb.min(axis=2)
    a = np.clip((255.0 - minc) / 255.0, 0, 1)
    keep = ~ndi.binary_dilation(body > 0.02, iterations=2)       # never double-count the rim
    a = np.where(keep, a, 0.0)
    a[a < 8 / 255.0] = 0.0                                        # JPEG noise
    return np.clip(ndi.gaussian_filter(a, 0.8), 0, 1)


def build_icon(path, kind, squircle, cell, body_px):
    """Return premultiplied float planes (R, G, B, A) in 0..255, each cell x cell."""
    rgb = load_rgb(path)
    h, w, _ = rgb.shape
    body, (x0, y0, x1, y1) = body_matte(kind, rgb, squircle)

    sh = shadow_alpha(rgb, body) if kind == "squircle_mac" else np.zeros_like(body)

    alpha = body + sh * (1.0 - body)
    pm = [rgb[..., c] * body for c in range(3)] + [alpha * 255.0]    # premultiplied planes

    # scale: squircles -> body is body_px wide; folder glyph -> fitted by width
    f = body_px / float(x1 - x0)
    sz = int(round(w * f))
    planes = [resize_f(p, sz) for p in pm]

    # centre the body box in the cell (optical centre for the folder: lift 1px)
    cx = (x0 + x1) / 2.0 * f
    cy = (y0 + y1) / 2.0 * f
    ox = int(round(cell / 2.0 - cx))
    oy = int(round(cell / 2.0 - cy))

    out = [np.zeros((cell, cell), np.float32) for _ in range(4)]
    sx0, sy0 = max(0, -ox), max(0, -oy)
    dx0, dy0 = max(0, ox), max(0, oy)
    n_w = min(sz - sx0, cell - dx0)
    n_h = min(sz - sy0, cell - dy0)
    for i in range(4):
        out[i][dy0:dy0 + n_h, dx0:dx0 + n_w] = planes[i][sy0:sy0 + n_h, sx0:sx0 + n_w]

    a = np.clip(out[3], 0, 255)
    rgb_pm = [np.clip(out[i], 0, a) for i in range(3)]
    return rgb_pm + [a]


def to_argb_pm(planes):
    r, g, b, a = [np.rint(p).astype(np.uint32) for p in planes]
    return (a << 24) | (r << 16) | (g << 8) | b


def to_straight_png(planes):
    r, g, b, a = planes
    safe = np.maximum(a, 1e-3)
    rgb = [np.clip(p / safe * 255.0, 0, 255) for p in (r, g, b)]
    arr = np.stack(rgb + [a], axis=-1)
    arr[a < 0.5] = 0
    return Image.fromarray(np.rint(arr).astype(np.uint8), "RGBA")


def write_header(path, icons_argb, cell, body):
    with open(path, "w") as f:
        f.write("// Auto-generated by tools/gen_dock_icons.py - do not edit by hand.\n")
        f.write("// Source artwork: assets/dock_icons/*.jpeg (unmodified). The generator only cuts the white\n")
        f.write("// backdrop to alpha and normalises size/padding.\n")
        f.write("// Pixel format: PREMULTIPLIED ARGB (0xAARRGGBB, rgb already multiplied by alpha).\n")
        f.write("#ifndef NSK_DOCK_ICONS_H\n#define NSK_DOCK_ICONS_H\n\n")
        f.write("#define DOCK_ICON_CELL %d   /* sprite is CELL x CELL px */\n" % cell)
        f.write("#define DOCK_ICON_BODY %d   /* visible body inside the cell */\n\n" % body)
        for i, (name, _, _) in enumerate(ICONS):
            f.write("#define DOCK_ICON_%s %d\n" % (name, i))
        f.write("#define DOCK_ICON_COUNT %d\n\n" % len(ICONS))
        f.write("static const uint32_t dock_icon_pm[DOCK_ICON_COUNT][DOCK_ICON_CELL * DOCK_ICON_CELL] = {\n")
        for (name, _, _), px in zip(ICONS, icons_argb):
            f.write("    { /* %s */\n" % name)
            flat = px.reshape(-1)
            for i in range(0, len(flat), 13):
                f.write("        " + ",".join("0x%08X" % v for v in flat[i:i + 13]) + ",\n")
            f.write("    },\n")
        f.write("};\n\n#endif /* NSK_DOCK_ICONS_H */\n")
    print("[ok] %s (%d KB)" % (path, os.path.getsize(path) // 1024))


def contact_sheet(imgs, path, zoom=4):
    cell = imgs[0].size[0]
    bgs = [(226, 233, 243), (30, 41, 59), (166, 183, 205)]
    sheet = Image.new("RGB", (cell * zoom * len(imgs) + 8 * (len(imgs) + 1),
                              cell * zoom * len(bgs) + 8 * (len(bgs) + 1)), (255, 0, 255))
    for r, bg in enumerate(bgs):
        for c, im in enumerate(imgs):
            tile = Image.new("RGBA", im.size, bg + (255,))
            tile.alpha_composite(im)
            tile = tile.convert("RGB").resize((cell * zoom, cell * zoom), Image.NEAREST)
            sheet.paste(tile, (8 + c * (cell * zoom + 8), 8 + r * (cell * zoom + 8)))
    sheet.save(path)
    print("[ok] preview", path)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", default=SRC_DIR)
    ap.add_argument("--header", default="include/dock_icons.h")
    ap.add_argument("--web-dir", default="src/assets/dock-icons")
    ap.add_argument("--preview")
    args = ap.parse_args()

    squircle = canonical_squircle(os.path.join(args.src, "Calculator.jpeg"))

    kernel_px, kernel_img = [], []
    for name, fn, kind in ICONS:
        planes = build_icon(os.path.join(args.src, fn), kind, squircle, KERNEL_CELL, KERNEL_BODY)
        kernel_px.append(to_argb_pm(planes))
        kernel_img.append(to_straight_png(planes))
    write_header(args.header, kernel_px, KERNEL_CELL, KERNEL_BODY)

    os.makedirs(args.web_dir, exist_ok=True)
    for name, fn, kind in ICONS:
        planes = build_icon(os.path.join(args.src, fn), kind, squircle, WEB_CELL, WEB_BODY)
        out = os.path.join(args.web_dir, name.lower() + ".png")
        to_straight_png(planes).save(out, optimize=True)
        print("[ok]", out)

    if args.preview:
        contact_sheet(kernel_img, args.preview)


if __name__ == "__main__":
    sys.exit(main())
