#!/usr/bin/env python3
"""Generate test .map files for S4WN engine testing.

Creates valid binary .map files in the Siedler 4 format:
- Magic: "WRLD" (4 bytes)
- Version: u32 LE (always 1)
- Width: u32 LE
- Height: u32 LE
- Tiles: width*height entries, 6 bytes each:
  Byte 0: terrain ID (0=Grass, 1=Forest, 2=Mountain, 3=Water, 4=DeepWater, 5=Desert, 6=Swamp, 7=Snow)
  Byte 1: elevation raw (0-255)
  Byte 2: flags (0 = buildable, 1 = water flag, etc.)
  Byte 3: resource ID (0=None, 1=Iron, 2=Coal, 3=Gold, 4=Stone, 5=Sulfur, 6=Fish, 7=Game, 8=Grain)
  Bytes 4-5: micro-position (sub-tile offset for objects, 0 for most tiles)
"""

import struct
import random
import os
import sys
from pathlib import Path

TERRAIN = {
    "grass":     0,
    "forest":    1,
    "mountain":  2,
    "water":     3,
    "deep_water": 4,
    "desert":    5,
    "swamp":     6,
    "snow":      7,
}

RESOURCE = {
    "none":   0,
    "iron":   1,
    "coal":   2,
    "gold":   3,
    "stone":  4,
    "sulfur": 5,
    "fish":   6,
    "game":   7,
    "grain":  8,
}


def write_map(path, width, height, tiles):
    """Write a .map binary file."""
    path = Path(path)
    with open(path, "wb") as f:
        # Magic: "WRLD"
        f.write(b"WRLD")
        # Version: u32 LE
        f.write(struct.pack("<I", 1))
        # Width, Height: u32 LE
        f.write(struct.pack("<I", width))
        f.write(struct.pack("<I", height))
        # Tiles: 6 bytes each
        for tile in tiles:
            f.write(bytes(tile))
    size = os.path.getsize(path)
    expected = 16 + width * height * 6
    assert size == expected, f"Size mismatch: {size} != {expected}"
    print(f"  Wrote {path.name}: {width}×{height}, {size} bytes ({len(tiles)} tiles)")


def generate_island(width, height):
    """Generate an island map: grass center, water border, some forest/mountains."""
    tiles = []
    cx, cy = width // 2, height // 2
    max_dist = min(cx, cy) * 0.85
    rng = random.Random(42)

    for y in range(height):
        for x in range(width):
            dist = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
            ratio = dist / max_dist if max_dist > 0 else 0

            # Terrain
            if ratio > 1.0:
                terrain = TERRAIN["deep_water"]
                elev = 0
                flags = 1  # water flag
            elif ratio > 0.90:
                terrain = TERRAIN["water"]
                elev = 0
                flags = 1
            elif ratio > 0.85:
                # Beach ring
                terrain = TERRAIN["desert"] if rng.random() < 0.5 else TERRAIN["grass"]
                elev = int(10 + rng.random() * 20)
                flags = 0
            elif rng.random() < 0.08:
                terrain = TERRAIN["forest"]
                elev = int(30 + rng.random() * 50)
                flags = 0
            elif rng.random() < 0.03:
                terrain = TERRAIN["mountain"]
                elev = int(120 + rng.random() * 100)
                flags = 0
            else:
                terrain = TERRAIN["grass"]
                elev = int(20 + rng.random() * 40)
                flags = 0

            # Resource
            resource = RESOURCE["none"]
            if terrain == TERRAIN["mountain"] and rng.random() < 0.15:
                resource = rng.choice([RESOURCE["iron"], RESOURCE["coal"], RESOURCE["gold"]])
            elif terrain == TERRAIN["grass"] and rng.random() < 0.03:
                resource = rng.choice([RESOURCE["stone"], RESOURCE["game"], RESOURCE["grain"]])
            elif terrain == TERRAIN["water"] and rng.random() < 0.05:
                resource = RESOURCE["fish"]

            mx, my = 0, 0  # micro-position
            tiles.append((terrain, elev, flags, resource, mx, my))

    return tiles


def generate_river_valley(width, height):
    """Generate a river valley: river through middle, mountains on sides."""
    tiles = []
    rng = random.Random(1337)
    # River path: sine wave from left to right
    river_ys = []
    for x in range(width):
        base_y = height // 2 + int(15 * __import__('math').sin(x * 0.1))
        river_ys.append(max(2, min(height - 3, base_y)))

    for y in range(height):
        for x in range(width):
            ry = river_ys[x]
            dist_to_river = abs(y - ry)

            if dist_to_river == 0:
                terrain = TERRAIN["water"]
                elev = 0
                flags = 1
            elif dist_to_river <= 1:
                terrain = TERRAIN["swamp"] if rng.random() < 0.6 else TERRAIN["grass"]
                elev = int(5 + rng.random() * 15)
                flags = 0
            elif x < 4 or x >= width - 4:
                terrain = TERRAIN["mountain"]
                elev = int(150 + rng.random() * 80)
                flags = 0
            elif y < 3 or y >= height - 3:
                terrain = TERRAIN["mountain"]
                elev = int(140 + rng.random() * 90)
                flags = 0
            elif rng.random() < 0.06:
                terrain = TERRAIN["forest"]
                elev = int(25 + rng.random() * 45)
                flags = 0
            else:
                terrain = TERRAIN["grass"]
                elev = int(15 + rng.random() * 30 + dist_to_river * 2)
                flags = 0

            resource = RESOURCE["none"]
            if terrain == TERRAIN["mountain"] and rng.random() < 0.12:
                resource = rng.choice([RESOURCE["iron"], RESOURCE["stone"], RESOURCE["coal"]])
            elif terrain == TERRAIN["grass"] and rng.random() < 0.02:
                resource = rng.choice([RESOURCE["game"], RESOURCE["grain"]])
            elif terrain == TERRAIN["water"] and rng.random() < 0.08:
                resource = RESOURCE["fish"]
            elif terrain == TERRAIN["swamp"] and rng.random() < 0.04:
                resource = RESOURCE["sulfur"]

            mx, my = 0, 0
            tiles.append((terrain, elev, flags, resource, mx, my))

    return tiles


def generate_continents(width, height):
    """Generate continents: land masses separated by water."""
    tiles = []
    rng = random.Random(777)
    # Use noise-like continent placement
    continent_centers = [
        (width // 4, height // 4),
        (3 * width // 4, height // 2),
        (width // 2, 3 * height // 4),
        (width // 3, 3 * height // 4),
    ]
    radii = [width * 0.18, width * 0.22, width * 0.15, width * 0.12]

    for y in range(height):
        for x in range(width):
            # Find minimum normalized distance to any continent center
            min_dist = float("inf")
            for (cx, cy), radius in zip(continent_centers, radii):
                dist = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
                norm = dist / radius
                min_dist = min(min_dist, norm)

            if min_dist > 1.05:
                terrain = TERRAIN["deep_water"]
                elev = 0
                flags = 1
            elif min_dist > 0.95:
                terrain = TERRAIN["water"]
                elev = 0
                flags = 1
            elif min_dist > 0.85:
                terrain = TERRAIN["desert"] if rng.random() < 0.4 else TERRAIN["grass"]
                elev = int(10 + rng.random() * 25)
                flags = 0
            elif rng.random() < 0.05:
                terrain = TERRAIN["mountain"]
                elev = int(100 + rng.random() * 120)
                flags = 0
            elif rng.random() < 0.08:
                terrain = TERRAIN["forest"]
                elev = int(25 + rng.random() * 50)
                flags = 0
            else:
                terrain = TERRAIN["grass"]
                elev = int(15 + rng.random() * 35)
                flags = 0

            resource = RESOURCE["none"]
            if terrain == TERRAIN["mountain"] and rng.random() < 0.14:
                resource = rng.choice([RESOURCE["iron"], RESOURCE["coal"], RESOURCE["gold"], RESOURCE["stone"]])
            elif terrain == TERRAIN["grass"] and rng.random() < 0.03:
                resource = rng.choice([RESOURCE["game"], RESOURCE["grain"], RESOURCE["stone"]])
            elif terrain == TERRAIN["water"] and rng.random() < 0.06:
                resource = RESOURCE["fish"]
            elif terrain == TERRAIN["desert"] and rng.random() < 0.02:
                resource = RESOURCE["sulfur"]

            mx, my = 0, 0
            tiles.append((terrain, elev, flags, resource, mx, my))

    return tiles


def main():
    if len(sys.argv) > 1:
        out_dir = Path(sys.argv[1])
    else:
        out_dir = Path(__file__).resolve().parent.parent.parent / "assets" / "maps" / "test"
    
    out_dir.mkdir(parents=True, exist_ok=True)

    print("Generating test .map corpus...")

    # 32×32 small island
    write_map(out_dir / "test_island_32x32.map",
              32, 32, generate_island(32, 32))

    # 64×64 river valley
    write_map(out_dir / "test_rivervalley_64x64.map",
              64, 64, generate_river_valley(64, 64))

    # 128×128 continents
    write_map(out_dir / "test_continents_128x128.map",
              128, 128, generate_continents(128, 128))

    print(f"\nDone! Generated 3 test .map files in '{out_dir}'")


if __name__ == "__main__":
    main()
