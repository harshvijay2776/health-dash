#!/usr/bin/env python3
"""Generate the PWA icons (icon-192.png, icon-512.png).

A rounded dark square with a green heartbeat/pulse line — matching the
dashboard theme. Run once: `python3 make-icons.py`. Requires Pillow.
"""
from PIL import Image, ImageDraw

BG = (15, 17, 23, 255)      # --bg
PANEL = (24, 27, 36, 255)   # --card
PULSE = (46, 204, 113, 255) # --up green


def rounded_mask(size, radius):
    mask = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(mask)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    return mask


def make(size):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    radius = int(size * 0.22)
    draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=BG)

    # Heartbeat / ECG pulse line across the middle.
    w = max(2, int(size * 0.045))
    cy = size * 0.52
    a = size * 0.18  # amplitude
    # Points expressed as fractions of width.
    pts_x = [0.10, 0.32, 0.40, 0.48, 0.56, 0.64, 0.90]
    pts_y = [0.52, 0.52, 0.30, 0.74, 0.40, 0.52, 0.52]
    pts = []
    for fx, fy in zip(pts_x, pts_y):
        pts.append((fx * size, fy * size))
    draw.line(pts, fill=PULSE, width=w, joint="curve")

    # A small dot at the end of the line.
    r = w * 0.9
    ex, ey = pts[-1]
    draw.ellipse([ex - r, ey - r, ex + r, ey + r], fill=PULSE)

    img.putalpha(rounded_mask(size, radius))
    return img


for s in (192, 512):
    make(s).save(f"icon-{s}.png")
    print(f"wrote icon-{s}.png")
