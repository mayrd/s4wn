#!/usr/bin/env python3
"""
Regenerate S4WN terrain atlas - enhanced version with better detail.
Generates 8 terrain tiles and assembles them into a 2048×256 atlas PNG.

Usage: python3 scripts/generators/generate_terrain_atlas.py
"""

import os, struct, zlib
import numpy as np

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
TEXTURES_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "..", "assets", "textures"))
TILES_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "..", "assets", "tiles"))
ATLAS_PATH = os.path.join(TEXTURES_DIR, "terrain_atlas.png")

TILE_SIZE = 256
TERRAIN_ORDER = ["Grass", "Forest", "Mountain", "Water", "DeepWater", "Desert", "Snow", "Swamp"]

# S4-Authentic color palette (vibrant, saturated like original game)
S4_COLORS = {
    "Grass":     (0x3d, 0x7a, 0x35),  # Saturated grass green
    "Forest":    (0x26, 0x59, 0x1a),  # Darker green with forest feel
    "Mountain":  (0x66, 0x60, 0x5a),  # Grey-brown rocky
    "Water":     (0x26, 0x59, 0xb3),  # Bright blue water
    "DeepWater": (0x14, 0x33, 0x80),  # Deep navy
    "Desert":    (0xd9, 0xbf, 0x66),  # Sandy yellow-beige
    "Snow":      (0xe6, 0xeb, 0xf2),  # White with subtle blue
    "Swamp":     (0x4d, 0x66, 0x40),  # Murky green-brown
}

def make_tile(terrain):
    """Generate a 256x256 RGBA tile with rich detail for S4 aesthetics."""
    color = np.array(S4_COLORS.get(terrain, (128, 128, 128)), dtype=np.float32)
    ys, xs = np.mgrid[0:TILE_SIZE, 0:TILE_SIZE]
    
    # Multi-scale noise via sine-based pseudo-Perlin (fast, no loops)
    noise = np.zeros((TILE_SIZE, TILE_SIZE), dtype=np.float32)
    detail_noise = np.zeros((TILE_SIZE, TILE_SIZE), dtype=np.float32)
    freq, amp = 1.0, 1.0
    seed = int(hash(terrain) & 0xFFFFFFFF)
    
    for octave in range(6):
        nx = (xs.astype(np.float32) / 16.0 * freq + seed * 0.1)
        ny = (ys.astype(np.float32) / 16.0 * freq + seed * 0.2 + octave * 1.7)
        # Rich noise with more harmonics
        n = (np.sin(nx * 2.3 + ny * 1.7) * np.cos(ny * 3.1 - nx * 1.1) +
             np.sin(nx * 5.7 - ny * 2.3) * 0.5 +
             np.cos(nx * 7.1 + ny * 4.3) * 0.3 +
             np.sin(nx * 11.3 + ny * 8.7) * 0.2) * amp
        noise += n
        detail_noise += n * 0.5  # Smaller amplitude for fine detail
        freq *= 2.0
        amp *= 0.5
    
    # Normalize to 0..1
    noise = (noise - noise.min()) / (noise.max() - noise.min() + 1e-8)
    detail_noise = (detail_noise - detail_noise.min()) / (detail_noise.max() - detail_noise.min() + 1e-8)
    
    # Terrain-specific rich patterns (S4 aesthetic)
    if terrain == "Grass":
        # Wildflower dots (yellow-white speckles) and clover clusters
        flower = np.sin(xs / 8.0) * np.cos(ys / 7.0) * np.sin((xs + ys) / 5.0)
        flower = np.clip((flower - flower.min()) / (flower.max() - flower.min() + 1e-8), 0, 1)
        # Sparse flower coverage
        flowers = (flower > 0.85).astype(np.float32) * detail_noise
        # Clover patches (small green clusters)
        clover = np.sin(xs / 4.0) * np.cos(ys / 4.0)
        clover_mask = (clover > 0.7).astype(np.float32)
        noise = noise * 0.9 + flowers * 0.08 + clover_mask * 0.02
    elif terrain == "Forest":
        # Fallen leaves and pine needle coverage
        leaves = np.sin(xs / 6.0) * np.cos(ys / 5.0) + np.sin((xs + ys) / 8.0) * 0.5
        leaves = np.clip((leaves - leaves.min()) / (leaves.max() - leaves.min() + 1e-8), 0, 1)
        # Patchy coverage like forest floor
        leaf_cover = np.sin(xs / 10.0 + ys / 8.0) * 0.5 + 0.5
        noise = noise * 0.7 + leaves * 0.25 + leaf_cover * 0.05
    elif terrain == "Mountain":
        # Stratified rock layers and cracks
        strata = np.sin(ys / 12.0 * np.pi) * 0.4
        crack_x = (xs / 6.0).astype(np.int32)
        crack_y = (ys / 6.0).astype(np.int32)
        cracks = (np.sin(crack_x * 7.3 + crack_y * 3.1) * 0.3 + 0.7)
        # Mineral veins (lighter streaks)
        veins = np.sin(xs / 3.0 + ys / 4.0) * np.cos(xs / 5.0 - ys / 3.0) * 0.3 + 0.7
        noise = noise * 0.6 + strata + cracks * 0.3 + veins * 0.1
    elif terrain == "Water":
        # Gentle ripples and caustics
        ripple1 = np.sin(xs / 12.0 * 3.0) * np.cos(ys / 12.0 * 2.5) * 0.3
        ripple2 = np.sin(xs / 8.0 * 5.0 + ys / 8.0 * 3.0) * 0.15
        caustic = np.sin((xs + ys) / 6.0) * np.cos((xs - ys) / 7.0) * 0.2
        noise = noise * 0.7 + (ripple1 + ripple2 + caustic) * 0.15
    elif terrain == "DeepWater":
        # Dark mysterious depths with subtle light rays
        ripple = np.sin(xs / 10.0 * 2.0) * np.cos(ys / 10.0 * 1.8) * 0.2
        ray = np.sin(xs / 5.0 + ys / 4.0) * 0.3 + 0.7
        noise = noise * 0.4 + ray * 0.25 + ripple * 0.15
    elif terrain == "Desert":
        # Wind-rippled dunes with pebbles
        dune = np.sin(ys / 18.0 * 4.0 + xs / 18.0 * 1.5) * 0.15
        pebble = np.sin(xs / 4.0) * np.cos(ys / 4.0)
        pebble_mask = np.abs(pebble) > 0.8
        sand_var = np.sin((xs + ys) / 6.0) * 0.1 + np.cos((xs - ys) / 5.0) * 0.08
        noise = noise * 0.85 + dune + sand_var + pebble_mask.astype(np.float32) * 0.1
    elif terrain == "Snow":
        # Snow drifts with ice sparkles
        drift = np.sin(xs / 22.0 * 3.0) * np.cos(ys / 22.0 * 2.5) * 0.12
        sparkle = np.sin(xs * 13.7) * np.cos(ys * 11.3) * np.sin((xs + ys) * 8.5)
        sparkle = np.clip((sparkle - sparkle.min()) / (sparkle.max() - sparkle.min() + 1e-8), 0, 1)
        # Subtle shadows in depressions
        shadow = np.sin(xs / 15.0) * np.cos(ys / 15.0) * 0.08
        noise = noise * 0.8 + drift + shadow + sparkle * 0.05
    elif terrain == "Swamp":
        # Murky water with algae patches and lily pads
        algae = np.sin(xs / 7.0) * np.cos(ys / 6.0) * 0.4
        lily_pad = np.sin(xs / 5.0 + ys / 4.0) * np.cos(xs / 6.0 - ys / 5.0) * 0.3
        root = np.sin(xs / 3.0) * np.cos(ys / 4.0) * np.sin((xs - ys) / 5.0) * 0.2
        fog = np.sin((xs + ys) / 8.0) * 0.1
        noise = noise * 0.6 + algae + lily_pad * 0.1 + root + fog
    
    # Apply color with noise variation
    noise_3d = np.stack([noise] * 3, axis=-1)
    variation = (noise_3d - 0.5) * 50  # Larger variation for richer colors
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
        print(f"{tile.shape[0]}?{tile.shape[1]}")
    
    # Assemble atlas: horizontal strip
    atlas = np.concatenate(tiles, axis=1)
    write_png(ATLAS_PATH, atlas)
    
    size = os.path.getsize(ATLAS_PATH)
    print(f"\nAtlas: {ATLAS_PATH}")
    print(f"  {atlas.shape[1]}?{atlas.shape[0]}, {size:,} bytes")

if __name__ == "__main__":
    main()
