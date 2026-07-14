/**
 * S4WN - Enhanced Terrain Texture Generator (Node.js)
 * 
 * Generates 8 tileable terrain textures at 256x256 with rich detail
 * matching the Siedler 4 aesthetic (vibrant, saturated, hand-painted look).
 * 
 * Usage: node scripts/generate_terrain_textures.js
 */

'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// PNG encoder
function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function encodePNG(w, h, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    Buffer.concat([Buffer.alloc(4), Buffer.from('IHDR'), ihdr, Buffer.alloc(4)]),
    Buffer.concat([Buffer.from('IDAT'), idat]),
    Buffer.from('IEND')
  ]);
}

// S4 color palette (vibrant, saturated)
const S4_COLORS = {
  Grass:     [61, 122, 53],
  Forest:    [38, 89, 30],
  Mountain:  [102, 96, 90],
  Water:     [38, 89, 179],
  DeepWater: [20, 51, 128],
  Desert:    [217, 175, 96],
  Snow:      [230, 235, 242],
  Swamp:     [77, 102, 64],
};

const TILE_SIZE = 256;
const TERRAIN_ORDER = ["Grass", "Forest", "Mountain", "Water", "DeepWater", "Desert", "Snow", "Swamp"];

function makeTile(terrain) {
  const color = S4_COLORS[terrain] || [128, 128, 128];
  const tile = Buffer.alloc(TILE_SIZE * TILE_SIZE * 4);
  const seed = terrain.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  
  for (let y = 0; y < TILE_SIZE; y++) {
    for (let x = 0; x < TILE_SIZE; x++) {
      // Multi-octave noise
      let n = 0;
      let f = 1;
      let a = 1;
      for (let o = 0; o < 6; o++) {
        const nx = (x / 16.0 * f + seed * 0.1) | 0;
        const ny = (y / 16.0 * f + seed * 0.2 + o * 1.7) | 0;
        n += (Math.sin(nx * 2.3 + ny * 1.7) * Math.cos(ny * 3.1 - nx * 1.1) +
              Math.sin(nx * 5.7 - ny * 2.3) * 0.5 +
              Math.cos(nx * 7.1 + ny * 4.3) * 0.3 +
              Math.sin(nx * 11.3 + ny * 8.7) * 0.2) * a;
        f *= 2;
        a *= 0.5;
      }
      
      // Normalize (approximate)
      n = (n + 2.5) / 5;
      
      // Terrain-specific detail
      if (terrain === "Grass") {
        const flower = Math.sin(x / 8.0) * Math.cos(y / 7.0) * Math.sin((x + y) / 5.0);
        const flowers = flower > 0.7 ? 0.1 : 0;
        const clover = Math.sin(x / 4.0) * Math.cos(y / 4.0);
        const clover_m = clover > 0.7 ? 0.05 : 0;
        n = n * 0.9 + flowers + clover_m;
      } else if (terrain === "Forest") {
        const leaf = Math.sin(x / 6.0) * Math.cos(y / 5.0) + Math.sin((x + y) / 8.0) * 0.5;
        const leaf_c = Math.sin(x / 10.0 + y / 8.0) * 0.5 + 0.5;
        n = n * 0.7 + Math.abs(leaf) * 0.25 + leaf_c * 0.05;
      } else if (terrain === "Mountain") {
        const strata = Math.sin(y / 12.0 * Math.PI) * 0.4;
        const crack = Math.sin((x / 6 | 0) * 7.3 + (y / 6 | 0) * 3.1) * 0.3 + 0.7;
        const vein = Math.sin(x / 3.0 + y / 4.0) * Math.cos(x / 5.0 - y / 3.0) * 0.3 + 0.7;
        n = n * 0.6 + strata + crack * 0.3 + vein * 0.1;
      } else if (terrain === "Water") {
        const r1 = Math.sin(x / 12.0 * 3.0) * Math.cos(y / 12.0 * 2.5) * 0.3;
        const r2 = Math.sin(x / 8.0 * 5.0 + y / 8.0 * 3.0) * 0.15;
        const caustic = Math.sin((x + y) / 6.0) * Math.cos((x - y) / 7.0) * 0.2;
        n = n * 0.7 + (r1 + r2 + caustic) * 0.15;
      } else if (terrain === "DeepWater") {
        const ray = Math.sin(x / 5.0 + y / 4.0) * 0.3 + 0.7;
        const ripple = Math.sin(x / 10.0 * 2.0) * Math.cos(y / 10.0 * 1.8) * 0.2;
        n = n * 0.4 + ray * 0.25 + ripple * 0.15;
      } else if (terrain === "Desert") {
        const dune = Math.sin(y / 18.0 * 4.0 + x / 18.0 * 1.5) * 0.15;
        const peb = Math.sin(x / 4.0) * Math.cos(y / 4.0);
        const sand = Math.sin((x + y) / 6.0) * 0.1 + Math.cos((x - y) / 5.0) * 0.08;
        n = n * 0.85 + dune + sand + (Math.abs(peb) > 0.8 ? 0.1 : 0);
      } else if (terrain === "Snow") {
        const drift = Math.sin(x / 22.0 * 3.0) * Math.cos(y / 22.0 * 2.5) * 0.12;
        const spark = Math.sin(x * 13.7) * Math.cos(y * 11.3) * Math.sin((x + y) * 8.5);
        const shadow = Math.sin(x / 15.0) * Math.cos(y / 15.0) * 0.08;
        n = n * 0.8 + drift + shadow + spark * 0.05;
      } else if (terrain === "Swamp") {
        const algae = Math.sin(x / 7.0) * Math.cos(y / 6.0) * 0.4;
        const lily = Math.sin(x / 5.0 + y / 4.0) * Math.cos(x / 6.0 - y / 5.0) * 0.3;
        const root = Math.sin(x / 3.0) * Math.cos(y / 4.0) * Math.sin((x - y) / 5.0) * 0.2;
        const fog = Math.sin((x + y) / 8.0) * 0.1;
        n = n * 0.6 + algae + lily * 0.1 + root + fog;
      }
      
      n = Math.max(0, Math.min(1, n));
      
      const i = (y * TILE_SIZE + x) * 4;
      tile[i] = Math.max(0, Math.min(255, color[0] + (n - 0.5) * 50));
      tile[i + 1] = Math.max(0, Math.min(255, color[1] + (n - 0.5) * 50));
      tile[i + 2] = Math.max(0, Math.min(255, color[2] + (n - 0.5) * 50));
      tile[i + 3] = 255;
    }
  }
  
  return tile;
}

// Main
const OUT_DIR = path.join(__dirname, '..', 'assets', 'textures');
const TILES_DIR = path.join(__dirname, '..', 'assets', 'tiles');

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(TILES_DIR, { recursive: true });

for (const terrain of TERRAIN_ORDER) {
  const tile = makeTile(terrain);
  const png = encodePNG(TILE_SIZE, TILE_SIZE, tile);
  
  // Individual tile
  fs.writeFileSync(path.join(TILES_DIR, `${terrain.toLowerCase()}.png`), png);
  
  // Also to textures dir (for TerrainRenderer)
  fs.writeFileSync(path.join(OUT_DIR, `terrain_${terrain.toLowerCase()}.png`), png);
  
  console.log(`✔ ${terrain} (${TILE_SIZE}×${TILE_SIZE}, ${png.length} bytes)`);
}

// Assemble atlas
const atlasTiles = TERRAIN_ORDER.map(t => makeTile(t));
const atlasWidth = TILE_SIZE * TERRAIN_ORDER.length;
const atlas = Buffer.alloc(atlasWidth * TILE_SIZE * 4);
for (let t = 0; t < TERRAIN_ORDER.length; t++) {
  const tile = atlasTiles[t];
  tile.copy(atlas, t * TILE_SIZE * TILE_SIZE * 4, 0, tile.length);
}
const atlasPng = encodePNG(atlasWidth, TILE_SIZE, atlas);
fs.writeFileSync(path.join(OUT_DIR, 'terrain_atlas.png'), atlasPng);
console.log(`✔ terrain_atlas.png (${atlasWidth}×${TILE_SIZE}, ${atlasPng.length} bytes)`);