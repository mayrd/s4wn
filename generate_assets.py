#!/usr/bin/env python3
"""Generate procedural game assets for S4WN."""

import struct
import zlib
import os
import math
import random

random.seed(42)
ASSETS_DIR = "/tmp/s4wn/assets"

def ensure_dirs():
    for sub in ["tiles", "buildings", "units", "ui"]:
        os.makedirs(os.path.join(ASSETS_DIR, sub), exist_ok=True)

def create_png(width, height, pixels):
    """Create a PNG file from RGBA pixel data."""
    def chunk(chunk_type, data):
        c = chunk_type + data
        crc = struct.pack('>I', zlib.crc32(c) & 0xffffffff)
        return struct.pack('>I', len(data)) + c + crc

    raw = b''
    for y in range(height):
        raw += b'\x00'  # filter: none
        for x in range(width):
            idx = (y * width + x) * 4
            raw += bytes(pixels[idx:idx+4])

    compressed = zlib.compress(raw)

    png = b'\x89PNG\r\n\x1a\n'
    png += chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0))
    png += chunk(b'IDAT', compressed)
    png += chunk(b'IEND', b'')
    return png

def lerp_color(c1, c2, t):
    return [int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3)]

def noise(x, y, seed=0):
    """Simple value noise."""
    n = int(x * 374761393 + y * 668265263 + seed * 1274126177) & 0x7fffffff
    return (n % 1000) / 1000.0

def smooth_noise(x, y, seed=0):
    ix, iy = int(x), int(y)
    fx, fy = x - ix, y - iy
    # Smoothstep
    fx = fx * fx * (3 - 2 * fx)
    fy = fy * fy * (3 - 2 * fy)
    n00 = noise(ix, iy, seed)
    n10 = noise(ix + 1, iy, seed)
    n01 = noise(ix, iy + 1, seed)
    n11 = noise(ix + 1, iy + 1, seed)
    nx0 = n00 + (n10 - n00) * fx
    nx1 = n01 + (n11 - n01) * fx
    return nx0 + (nx1 - nx0) * fy

def fbm(x, y, octaves=4, seed=0):
    val = 0.0
    amp = 0.5
    freq = 1.0
    for i in range(octaves):
        val += smooth_noise(x * freq, y * freq, seed + i * 100) * amp
        amp *= 0.5
        freq *= 2.0
    return val

# ── Terrain Tiles ────────────────────────────────────────────────────────────

def gen_grass_tile(size=64):
    pixels = [0] * (size * size * 4)
    for y in range(size):
        for x in range(size):
            idx = (y * size + x) * 4
            n = fbm(x / 16, y / 16, 4, 1)
            base = lerp_color([80, 140, 60], [100, 170, 70], n)
            # Add subtle variation
            variation = noise(x * 3, y * 7, 42) * 15 - 7
            pixels[idx] = max(0, min(255, int(base[0] + variation)))
            pixels[idx+1] = max(0, min(255, int(base[1] + variation * 1.5)))
            pixels[idx+2] = max(0, min(255, int(base[2] + variation * 0.5)))
            pixels[idx+3] = 255
    return create_png(size, size, pixels)

def gen_water_tile(size=64):
    pixels = [0] * (size * size * 4)
    for y in range(size):
        for x in range(size):
            idx = (y * size + x) * 4
            n = fbm(x / 12, y / 12, 4, 50)
            wave = math.sin(x * 0.3 + y * 0.2 + n * 6) * 0.5 + 0.5
            base = lerp_color([30, 70, 140], [50, 100, 180], wave)
            pixels[idx] = int(base[0])
            pixels[idx+1] = int(base[1])
            pixels[idx+2] = int(base[2])
            pixels[idx+3] = 255
    return create_png(size, size, pixels)

def gen_sand_tile(size=64):
    pixels = [0] * (size * size * 4)
    for y in range(size):
        for x in range(size):
            idx = (y * size + x) * 4
            n = fbm(x / 10, y / 10, 3, 80)
            base = lerp_color([200, 180, 120], [220, 200, 140], n)
            variation = noise(x * 5, y * 5, 99) * 10 - 5
            pixels[idx] = max(0, min(255, int(base[0] + variation)))
            pixels[idx+1] = max(0, min(255, int(base[1] + variation)))
            pixels[idx+2] = max(0, min(255, int(base[2] + variation * 0.5)))
            pixels[idx+3] = 255
    return create_png(size, size, pixels)

def gen_snow_tile(size=64):
    pixels = [0] * (size * size * 4)
    for y in range(size):
        for x in range(size):
            idx = (y * size + x) * 4
            n = fbm(x / 14, y / 14, 3, 120)
            base = lerp_color([220, 225, 235], [240, 245, 255], n)
            pixels[idx] = int(base[0])
            pixels[idx+1] = int(base[1])
            pixels[idx+2] = int(base[2])
            pixels[idx+3] = 255
    return create_png(size, size, pixels)

def gen_forest_tile(size=64):
    pixels = [0] * (size * size * 4)
    for y in range(size):
        for x in range(size):
            idx = (y * size + x) * 4
            n = fbm(x / 12, y / 12, 4, 200)
            base = lerp_color([30, 80, 30], [50, 110, 40], n)
            # Tree-like dots
            tree_noise = noise(x * 2, y * 2, 201)
            if tree_noise > 0.6:
                base = lerp_color(base, [20, 60, 20], 0.5)
            pixels[idx] = max(0, min(255, int(base[0])))
            pixels[idx+1] = max(0, min(255, int(base[1])))
            pixels[idx+2] = max(0, min(255, int(base[2])))
            pixels[idx+3] = 255
    return create_png(size, size, pixels)

def gen_mountain_tile(size=64):
    pixels = [0] * (size * size * 4)
    for y in range(size):
        for x in range(size):
            idx = (y * size + x) * 4
            n = fbm(x / 10, y / 10, 5, 300)
            base = lerp_color([120, 110, 100], [160, 150, 140], n)
            # Rocky lines
            if abs(math.sin(x * 0.5 + n * 8)) < 0.1:
                base = lerp_color(base, [90, 85, 80], 0.5)
            pixels[idx] = int(base[0])
            pixels[idx+1] = int(base[1])
            pixels[idx+2] = int(base[2])
            pixels[idx+3] = 255
    return create_png(size, size, pixels)

def gen_desert_tile(size=64):
    pixels = [0] * (size * size * 4)
    for y in range(size):
        for x in range(size):
            idx = (y * size + x) * 4
            n = fbm(x / 8, y / 8, 3, 400)
            base = lerp_color([210, 190, 130], [230, 210, 150], n)
            # Dune lines
            dune = math.sin(y * 0.15 + fbm(x / 20, y / 20, 2, 401) * 4) * 0.5 + 0.5
            base = lerp_color(base, [225, 205, 140], dune * 0.3)
            pixels[idx] = int(base[0])
            pixels[idx+1] = int(base[1])
            pixels[idx+2] = int(base[2])
            pixels[idx+3] = 255
    return create_png(size, size, pixels)

def gen_swamp_tile(size=64):
    pixels = [0] * (size * size * 4)
    for y in range(size):
        for x in range(size):
            idx = (y * size + x) * 4
            n = fbm(x / 10, y / 10, 4, 500)
            base = lerp_color([60, 80, 50], [80, 100, 60], n)
            # Murky spots
            if noise(x * 3, y * 3, 501) > 0.7:
                base = lerp_color(base, [40, 60, 30], 0.4)
            pixels[idx] = int(base[0])
            pixels[idx+1] = int(base[1])
            pixels[idx+2] = int(base[2])
            pixels[idx+3] = 255
    return create_png(size, size, pixels)

# ── Building Sprites ─────────────────────────────────────────────────────────

def draw_rect(pixels, w, h, x1, y1, x2, y2, color):
    for y in range(max(0, y1), min(h, y2 + 1)):
        for x in range(max(0, x1), min(w, x2 + 1)):
            idx = (y * w + x) * 4
            pixels[idx] = color[0]
            pixels[idx+1] = color[1]
            pixels[idx+2] = color[2]
            pixels[idx+3] = 255

def draw_circle(pixels, w, h, cx, cy, r, color):
    for y in range(max(0, cy - r), min(h, cy + r + 1)):
        for x in range(max(0, cx - r), min(w, cx + r + 1)):
            dx, dy = x - cx, y - cy
            if dx * dx + dy * dy <= r * r:
                idx = (y * w + x) * 4
                pixels[idx] = color[0]
                pixels[idx+1] = color[1]
                pixels[idx+2] = color[2]
                pixels[idx+3] = 255

def gen_building_sprite(name, size=64):
    """Generate a simple building sprite."""
    pixels = [0] * (size * size * 4)
    # Transparent background
    for i in range(0, len(pixels), 4):
        pixels[i+3] = 0

    if name == "headquarters":
        # Gold castle-like shape
        draw_rect(pixels, size, size, 12, 20, 52, 50, [180, 150, 60])  # main
        draw_rect(pixels, size, size, 8, 15, 16, 50, [200, 170, 70])   # left tower
        draw_rect(pixels, size, size, 48, 15, 56, 50, [200, 170, 70])  # right tower
        draw_rect(pixels, size, size, 24, 30, 40, 50, [160, 130, 50])  # center
        draw_rect(pixels, size, size, 28, 35, 36, 50, [100, 80, 30])   # door
        # Flag
        draw_rect(pixels, size, size, 30, 4, 32, 14, [200, 50, 50])
    elif name == "farm":
        # Green farm with fields
        draw_rect(pixels, size, size, 10, 25, 54, 50, [100, 140, 60])  # grass
        draw_rect(pixels, size, size, 14, 30, 28, 45, [180, 160, 80])  # field 1
        draw_rect(pixels, size, size, 32, 30, 46, 45, [160, 140, 70])  # field 2
        draw_rect(pixels, size, size, 20, 12, 44, 28, [140, 100, 50])  # barn
        draw_rect(pixels, size, size, 30, 8, 34, 20, [120, 80, 40])    # roof
    elif name == "sawmill":
        draw_rect(pixels, size, size, 10, 20, 54, 50, [130, 90, 50])   # main
        draw_rect(pixels, size, size, 20, 10, 44, 25, [100, 70, 35])   # roof
        draw_rect(pixels, size, size, 28, 30, 36, 50, [80, 60, 30])    # door
        # Saw blade
        draw_circle(pixels, size, size, 45, 35, 8, [180, 180, 180])
        draw_circle(pixels, size, size, 45, 35, 3, [80, 80, 80])
    elif name == "lumberjack":
        draw_rect(pixels, size, size, 12, 20, 52, 50, [90, 120, 50])   # cabin
        draw_rect(pixels, size, size, 20, 10, 44, 22, [70, 100, 40])   # roof
        draw_rect(pixels, size, size, 28, 30, 36, 50, [60, 80, 30])    # door
        # Axe
        draw_rect(pixels, size, size, 48, 25, 52, 40, [130, 90, 50])
        draw_rect(pixels, size, size, 46, 22, 50, 28, [180, 180, 180])
    elif name == "warehouse":
        draw_rect(pixels, size, size, 8, 18, 56, 50, [150, 130, 100])  # main
        draw_rect(pixels, size, size, 6, 12, 58, 22, [120, 100, 70])   # roof
        draw_rect(pixels, size, size, 24, 28, 40, 50, [100, 80, 50])   # door
        # Crates
        draw_rect(pixels, size, size, 12, 35, 20, 43, [160, 120, 70])
        draw_rect(pixels, size, size, 44, 35, 52, 43, [140, 110, 60])
    else:
        # Generic building
        draw_rect(pixels, size, size, 12, 16, 52, 50, [150, 140, 130])
        draw_rect(pixels, size, size, 10, 10, 54, 20, [120, 110, 100])
        draw_rect(pixels, size, size, 26, 28, 38, 50, [90, 80, 70])

    return create_png(size, size, pixels)

# ── Unit Sprites ─────────────────────────────────────────────────────────────

def gen_unit_sprite(name, size=32):
    """Generate a simple unit sprite."""
    pixels = [0] * (size * size * 4)
    for i in range(0, len(pixels), 4):
        pixels[i+3] = 0

    if name == "worker":
        # Blue worker
        draw_circle(pixels, size, size, 16, 12, 6, [60, 100, 200])    # head
        draw_rect(pixels, size, size, 12, 18, 20, 26, [60, 100, 200])  # body
        draw_rect(pixels, size, size, 10, 26, 12, 30, [40, 70, 150])   # left leg
        draw_rect(pixels, size, size, 20, 26, 22, 30, [40, 70, 150])   # right leg
        # Tool
        draw_rect(pixels, size, size, 22, 14, 24, 22, [130, 90, 50])
    elif name == "soldier":
        # Red soldier
        draw_circle(pixels, size, size, 16, 10, 5, [200, 60, 60])     # head
        draw_rect(pixels, size, size, 12, 15, 20, 24, [200, 50, 50])   # body (armor)
        draw_rect(pixels, size, size, 10, 24, 12, 30, [150, 40, 40])   # left leg
        draw_rect(pixels, size, size, 20, 24, 22, 30, [150, 40, 40])   # right leg
        # Sword
        draw_rect(pixels, size, size, 22, 8, 23, 22, [200, 200, 200])
        draw_rect(pixels, size, size, 21, 6, 24, 8, [180, 160, 60])    # hilt
    elif name == "archer":
        # Green archer
        draw_circle(pixels, size, size, 16, 10, 5, [60, 180, 60])     # head
        draw_rect(pixels, size, size, 12, 15, 20, 24, [50, 150, 50])   # body
        draw_rect(pixels, size, size, 10, 24, 12, 30, [40, 120, 40])   # left leg
        draw_rect(pixels, size, size, 20, 24, 22, 30, [40, 120, 40])   # right leg
        # Bow
        for i in range(16):
            angle = (i / 16.0) * math.pi
            bx = int(24 + math.cos(angle) * 8)
            by = int(16 - math.sin(angle) * 8)
            if 0 <= bx < size and 0 <= by < size:
                idx = (by * size + bx) * 4
                pixels[idx] = 130
                pixels[idx+1] = 90
                pixels[idx+2] = 50
                pixels[idx+3] = 255
        # String
        draw_rect(pixels, size, size, 24, 8, 24, 24, [200, 180, 140])

    return create_png(size, size, pixels)

# ── UI Elements ──────────────────────────────────────────────────────────────

def gen_ui_panel(size=256):
    """Generate a UI panel background."""
    pixels = [0] * (size * size * 4)
    for y in range(size):
        for x in range(size):
            idx = (y * size + x) * 4
            # Dark semi-transparent panel with border
            border = 4
            if x < border or x >= size - border or y < border or y >= size - border:
                pixels[idx] = 180
                pixels[idx+1] = 160
                pixels[idx+2] = 100
                pixels[idx+3] = 230
            else:
                pixels[idx] = 20
                pixels[idx+1] = 25
                pixels[idx+2] = 40
                pixels[idx+3] = 200
    return create_png(size, size, pixels)

def gen_button(size=64):
    """Generate a button sprite."""
    pixels = [0] * (size * size * 4)
    for y in range(size):
        for x in range(size):
            idx = (y * size + x) * 4
            # Rounded button
            cx, cy = size // 2, size // 2
            dx, dy = x - cx, y - cy
            dist = math.sqrt(dx * dx + dy * dy)
            if dist < size // 2 - 2:
                # Gradient
                t = y / size
                base = lerp_color([60, 120, 180], [80, 140, 200], t)
                # Highlight at top
                if y < size // 3:
                    base = lerp_color(base, [120, 180, 240], 0.3)
                pixels[idx] = int(base[0])
                pixels[idx+1] = int(base[1])
                pixels[idx+2] = int(base[2])
                pixels[idx+3] = 255
            elif dist < size // 2:
                pixels[idx] = 40
                pixels[idx+1] = 80
                pixels[idx+2] = 120
                pixels[idx+3] = 255
    return create_png(size, size, pixels)

# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    ensure_dirs()

    # Terrain tiles
    tiles = {
        "grass": gen_grass_tile,
        "water": gen_water_tile,
        "sand": gen_sand_tile,
        "snow": gen_snow_tile,
        "forest": gen_forest_tile,
        "mountain": gen_mountain_tile,
        "desert": gen_desert_tile,
        "swamp": gen_swamp_tile,
    }
    for name, gen in tiles.items():
        png = gen()
        path = os.path.join(ASSETS_DIR, "tiles", f"{name}.png")
        with open(path, "wb") as f:
            f.write(png)
        print(f"  tiles/{name}.png ({len(png)} bytes)")

    # Building sprites
    buildings = ["headquarters", "farm", "sawmill", "lumberjack", "warehouse"]
    for name in buildings:
        png = gen_building_sprite(name)
        path = os.path.join(ASSETS_DIR, "buildings", f"{name}.png")
        with open(path, "wb") as f:
            f.write(png)
        print(f"  buildings/{name}.png ({len(png)} bytes)")

    # Unit sprites
    units = ["worker", "soldier", "archer"]
    for name in units:
        png = gen_unit_sprite(name)
        path = os.path.join(ASSETS_DIR, "units", f"{name}.png")
        with open(path, "wb") as f:
            f.write(png)
        print(f"  units/{name}.png ({len(png)} bytes)")

    # UI elements
    png = gen_ui_panel()
    path = os.path.join(ASSETS_DIR, "ui", "panel.png")
    with open(path, "wb") as f:
        f.write(png)
    print(f"  ui/panel.png ({len(png)} bytes)")

    png = gen_button()
    path = os.path.join(ASSETS_DIR, "ui", "button.png")
    with open(path, "wb") as f:
        f.write(png)
    print(f"  ui/button.png ({len(png)} bytes)")

    # Generate a manifest
    manifest = {
        "version": "0.1.0",
        "tiles": list(tiles.keys()),
        "buildings": buildings,
        "units": units,
        "ui": ["panel", "button"],
    }
    import json
    manifest_path = os.path.join(ASSETS_DIR, "manifest.json")
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)
    print(f"  manifest.json")

    print(f"\nAll assets generated in {ASSETS_DIR}/")

if __name__ == "__main__":
    main()
