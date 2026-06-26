#!/usr/bin/env python3
"""
Regenerate S4WN terrain atlas — fast version using numpy.
Generates 8 terrain tiles and assembles them into a 2048×256 atlas PNG.

Usage: python3 scripts/regen_terrain_atlas.py
"""

import os, struct, zlib
import numpy as np

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
TEXTURES_DIR = os.path.join(SCRIPT_DIR, "..", "assets", "textures")
TILES_DIR = os.path.join(SCRIPT_DIR, "..", "assets", "tiles")
ATLAS_PATH = os.path.join(TEXTURES_DIR, "terrain_atlas.png")

TILE_SIZE = 256
TERRAIN_ORDER = ["Grass", "Forest", "Mountain", "Water", "DeepWater", "Desert", "Snow", "Swamp"]

S4_COLORS = {
    "Grass":     (0x3d, 0x7a, 0x35),
    "Forest":    (0x2d, 0x5a, 0x1e),
    "Mountain":  (0x7a, 0x80, 0x90),
    "Water":     (0x3a, 0x8f, 0xbf),
    "DeepWater": (0x1a, 0x3a, 0x6e),
    "Desert":    (0xc8, 0xa8, 0x50),
    "Snow":      (0xd0, 0xd8, 0xe8),
    "Swamp":     (0x4a, 0x5e, 0x2a),
}

def make_tile(terrain):
    """Generate a 256×256 RGBA tile using numpy noise."""
    color = np.array(S4_COLORS.get(terrain, (128, 128, 128)), dtype=np.float32)
    ys, xs = np.mgrid[0:TILE_SIZE, 0:TILE_SIZE]
    
    # Multi-scale noise via sine-based pseudo-Perlin (fast, no loops)
    noise = np.zeros((TILE_SIZE, TILE_SIZE), dtype=np.float32)
    freq, amp = 1.0, 1.0
    seed = hash(terrain) & 0xFFFFFFFF
    
    for octave in range(5):
        nx = (xs.astype(np.float32) / 16.0 * freq + seed * 0.1)
        ny = (ys.astype(np.float32) / 16.0 * freq + seed * 0.2 + octave * 1.7)
        # Simple gradient noise approximation using sin combinations
        n = (np.sin(nx * 2.3 + ny * 1.7) * np.cos(ny * 3.1 - nx * 1.1) +
             np.sin(nx * 5.7 - ny * 2.3) * 0.5 +
             np.cos(nx * 7.1 + ny * 4.3) * 0.3) * amp
        noise += n
        freq *= 2.0
        amp *= 0.5
    
    # Normalize to 0..1
    noise = (noise - noise.min()) / (noise.max() - noise.min() + 1e-8)
    
    # Terrain-specific patterns
    if terrain == "Water" or terrain == "DeepWater":
        ripple = (np.sin(xs / 12.0 * 3.0) * np.cos(ys / 12.0 * 2.5) * 0.3 +
                  np.sin(xs / 8.0 * 5.0 + ys / 8.0 * 3.0) * 0.15)
        noise = noise * 0.7 + (ripple - ripple.min()) / (ripple.max() - ripple.min() + 1e-8) * 0.3
        if terrain == "DeepWater":
            noise = noise * 0.5  # Darker
    elif terrain == "Mountain":
        crack_x = (xs / 8.0).astype(np.int32)
        crack_y = (ys / 8.0).astype(np.int32)
        crack = (np.sin(crack_x * 7.3 + crack_y * 3.1) * 0.5 + 0.5)
        noise = noise * 0.8 + crack * 0.2 * (1.0 - np.abs(noise - 0.5) * 2)
    elif terrain == "Desert":
        dune = np.sin(ys / 18.0 * 4.0 + xs / 18.0 * 1.5) * 0.15
        noise = np.clip(noise + dune, 0, 1)
    elif terrain == "Snow":
        drift = np.sin(xs / 22.0 * 3.0) * np.cos(ys / 22.0 * 2.5) * 0.12
        noise = np.clip(noise + drift, 0, 1)
    elif terrain == "Swamp":
        patch = (np.sin(xs / 20.0 * 2.0 + ys / 20.0 * 1.3) * 0.5 + 0.5)
        noise = noise * 0.6 + patch * 0.4
    
    # Apply color with noise variation
    noise_3d = np.stack([noise] * 3, axis=-1)
    variation = (noise_3d - 0.5) * 40  # ±20 color variation
    tile = np.clip(color + variation, 0, 255).astype(np.uint8)
    
    # Add alpha channel
    alpha = np.full((TILE_SIZE, TILE_SIZE, 1), 255, dtype=np.uint8)
    tile = np.concatenate([tile, alpha], axis=-1)
    
    return tile

def write_png(path, pixels):
    """Write RGBA numpy array as PNG."""
    h, w = pixels.shape[:2]
    sig = b'\x89PNG\r\n\x1a\n'
    ihdr_data = struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0)
    ihdr_crc = zlib.crc32(b'IHDR' + ihdr_data)
    ihdr = struct.pack('>I', 13) + b'IHDR' + ihdr_data + struct.pack('>I', ihdr_crc)
    
    raw = b''
    for row in range(h):
        raw += b'\x00' + pixels[row].tobytes()
    
    compressed = zlib.compress(raw)
    idat_crc = zlib.crc32(b'IDAT' + compressed)
    idat = struct.pack('>I', len(compressed)) + b'IDAT' + compressed + struct.pack('>I', idat_crc)
    iend_crc = zlib.crc32(b'IEND')
    iend = struct.pack('>I', 0) + b'IEND' + struct.pack('>I', iend_crc)
    
    with open(path, 'wb') as f:
        f.write(sig + ihdr + idat + iend)

def main():
    print("S4WN Terrain Atlas (numpy)")
    os.makedirs(TILES_DIR, exist_ok=True)
    os.makedirs(TEXTURES_DIR, exist_ok=True)
    
    tiles = []
    for terrain in TERRAIN_ORDER:
        print(f"  {terrain}...", end=" ", flush=True)
        tile = make_tile(terrain)
        tiles.append(tile)
        # Save individual tile
        write_png(os.path.join(TILES_DIR, f"{terrain.lower()}.png"), tile)
        print(f"{tile.shape[0]}×{tile.shape[1]}")
    
    # Assemble atlas: horizontal strip
    atlas = np.concatenate(tiles, axis=1)
    write_png(ATLAS_PATH, atlas)
    
    size = os.path.getsize(ATLAS_PATH)
    print(f"\nAtlas: {ATLAS_PATH}")
    print(f"  {atlas.shape[1]}×{atlas.shape[0]}, {size:,} bytes")

if __name__ == "__main__":
    main()
