/**
 * S4WN — Procedural UI texture generator (stand-in assets)
 *
 * Produces the medieval "panel & gold" UI textures described in PROMPTS.md
 * (§UI / Interface Textures) as real PNG files in assets/textures/.
 *
 * These are lightweight procedural stand-ins so the game has proper graphic
 * assets immediately. They can later be replaced by AI-generated art using the
 * exact prompts in PROMPTS.md (run scripts/generate_art.py with an API key).
 *
 * No external dependencies — uses Node's built-in zlib for PNG encoding.
 */

'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// ── Tiny PNG encoder (RGBA, 8-bit, no filtering) ──────────────
function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const body = Buffer.concat([t, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
function encodePNG(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  // scanlines with filter byte 0
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Helpers ─────────────────────────────────────────────────────────
function makeCanvas(w, h) {
  return { w, h, data: Buffer.alloc(w * h * 4) };
}
function setPx(c, x, y, r, g, b, a = 255) {
  if (x < 0 || y < 0 || x >= c.w || y >= c.h) return;
  const i = (y * c.w + x) * 4;
  c.data[i] = r; c.data[i + 1] = g; c.data[i + 2] = b; c.data[i + 3] = a;
}
function getPx(c, x, y) {
  const i = (y * c.w + x) * 4;
  return [c.data[i], c.data[i + 1], c.data[i + 2], c.data[i + 3]];
}
// deterministic pseudo-random
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function clamp(v) { return Math.max(0, Math.min(255, v | 0)); }
function lerp(a, b, t) { return a + (b - a) * t; }

// ── Texture builders ────────────────────────────────────────────────
function woodPanel(w, h, baseRGB, seed) {
  const c = makeCanvas(w, h);
  const rnd = mulberry32(seed);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // vertical plank bands
      const plank = Math.floor(x / 32);
      const grain = Math.sin((x * 0.35) + plank * 1.7) * 8 + (rnd() - 0.5) * 26;
      const v = grain + (rnd() - 0.5) * 10;
      const [br, bg, bb] = baseRGB;
      setPx(c, x, y, clamp(br + v), clamp(bg + v * 0.8), clamp(bb + v * 0.6));
    }
  }
  // subtle plank seams
  for (let x = 0; x < w; x += 32) {
    for (let y = 0; y < h; y++) {
      const [, , , a] = getPx(c, x, y);
      const [r, g, b] = getPx(c, x, y);
      setPx(c, x, y, clamp(r - 30), clamp(g - 30), clamp(b - 30), a);
    }
  }
  return c;
}

function uiPanel() {
  const c = woodPanel(256, 256, [70, 45, 30], 1337);
  // vignette to darken edges
  for (let y = 0; y < c.h; y++) {
    for (let x = 0; x < c.w; x++) {
      const dx = (x / c.w - 0.5), dy = (y / c.h - 0.5);
      const d = Math.sqrt(dx * dx + dy * dy) * 1.4;
      const [r, g, b, a] = getPx(c, x, y);
      setPx(c, x, y, clamp(r * (1 - d * 0.5)), clamp(g * (1 - d * 0.5)), clamp(b * (1 - d * 0.5)), a);
    }
  }
  return c;
}

function uiHeader() {
  const c = makeCanvas(400, 40);
  // dark wood base
  const wood = woodPanel(400, 40, [60, 40, 26], 99);
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    const [r, g, b] = getPx(wood, x, y); setPx(c, x, y, r, g, b);
  }
  // gold top & bottom borders
  for (let x = 0; x < c.w; x++) {
    for (let i = 0; i < 3; i++) {
      setPx(c, x, i, 200, 160, 70);
      setPx(c, x, c.h - 1 - i, 200, 160, 70);
    }
  }
  // lighter center band
  for (let y = 8; y < c.h - 8; y++) for (let x = 0; x < c.w; x++) {
    const [r, g, b] = getPx(c, x, y);
    setPx(c, x, y, clamp(r + 22), clamp(g + 18), clamp(b + 10));
  }
  return c;
}

function uiButton(state) {
  const c = makeCanvas(200, 60);
  let base, rim, center;
  if (state === 'normal') { base = [93, 64, 55]; rim = [210, 170, 80]; center = [244, 228, 188]; }
  else if (state === 'hover') { base = [110, 78, 66]; rim = [255, 210, 110]; center = [255, 240, 205]; }
  else { base = [70, 48, 42]; rim = [170, 130, 60]; center = [200, 186, 150]; } // pressed
  // fill
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) setPx(c, x, y, base[0], base[1], base[2]);
  // parchment center (inset rectangle)
  const pad = 6;
  for (let y = pad; y < c.h - pad; y++) for (let x = pad; x < c.w - pad; x++) {
    const cx = (x - c.w / 2) / (c.w / 2), cy = (y - c.h / 2) / (c.h / 2);
    const edge = Math.max(Math.abs(cx), Math.abs(cy));
    const t = state === 'pressed' ? edge * 0.6 : (1 - edge) * 0.5;
    setPx(c, x, y, clamp(lerp(base[0], center[0], t)), clamp(lerp(base[1], center[1], t)), clamp(lerp(base[2], center[2], t)));
  }
  // gold carved border
  for (let x = 0; x < c.w; x++) for (let y = 0; y < c.h; y++) {
    const border = x < 4 || y < 4 || x >= c.w - 4 || y >= c.h - 4;
    if (border) setPx(c, x, y, rim[0], rim[1], rim[2]);
  }
  // corner rivets
  const riv = [[8, 8], [c.w - 9, 8], [8, c.h - 9], [c.w - 9, c.h - 9]];
  for (const [rx, ry] of riv) for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
    if (dx * dx + dy * dy <= 4) setPx(c, rx + dx, ry + dy, 235, 200, 120);
  }
  return c;
}

function uiCorner() {
  const c = makeCanvas(64, 64);
  // transparent base
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) setPx(c, x, y, 0, 0, 0, 0);
  // gold filigree in top-left corner
  const rnd = mulberry32(7);
  for (let i = 0; i < 240; i++) {
    const t = i / 240;
    const x = Math.floor(4 + t * 52 + Math.sin(t * 9) * 6);
    const y = Math.floor(4 + (1 - t) * 52 + Math.cos(t * 7) * 6);
    setPx(c, x, y, 220, 175, 80, 230);
    setPx(c, x + 1, y, 235, 195, 100, 200);
  }
  // outer gold tip rivet
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
    if (dx * dx + dy * dy <= 4) setPx(c, 4 + dx, 4 + dy, 245, 210, 120, 255);
  }
  return c;
}

function uiDivider() {
  const c = makeCanvas(400, 8);
  for (let x = 0; x < c.w; x++) for (let y = 0; y < c.h; y++) setPx(c, x, y, 210, 170, 80, 220);
  // diamond gem in center
  const cx = 200, cy = 4;
  for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
    if (Math.abs(dx) + Math.abs(dy) <= 3) setPx(c, cx + dx, cy + dy, 245, 220, 140, 255);
    if (Math.abs(dx) + Math.abs(dy) <= 1) setPx(c, cx + dx, cy + dy, 255, 255, 220, 255);
  }
  return c;
}

function uiResources() {
  const c = makeCanvas(224, 64);
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) setPx(c, x, y, 0, 0, 0, 0);
  const colors = [
    [150, 100, 60], // wood
    [150, 150, 155], // iron
    [40, 40, 45], // coal
    [220, 190, 70], // gold
    [150, 150, 150], // stone
    [210, 210, 70], // sulfur
    [120, 170, 200], // fish
    [200, 180, 90], // grain
    [180, 110, 80], // meat
    [90, 150, 200], // water
    [220, 180, 70], // honey
    [170, 120, 70], // planks
    [170, 170, 175], // tools
    [180, 180, 185], // weapons
  ];
  for (let i = 0; i < 14; i++) {
    const col = i % 7, row = Math.floor(i / 7);
    const mx = col * 32 + 16, my = row * 32 + 16;
    const [r, g, b] = colors[i];
    for (let dy = -14; dy <= 14; dy++) for (let dx = -14; dx <= 14; dx++) {
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d <= 14) {
        // gold rim
        if (d > 11) setPx(c, mx + dx, my + dy, 215, 175, 85, 255);
        else setPx(c, mx + dx, my + dy, clamp(r * (1 - d / 16) + 30), clamp(g * (1 - d / 16) + 30), clamp(b * (1 - d / 16) + 30), 255);
      }
    }
  }
  return c;
}

// ── Decorative UI Textures ────────────────────────────────────────────

function uiMenuBg() {
  const c = makeCanvas(256, 256);
  const rnd = mulberry32(888);
  // Base parchment color
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    setPx(c, x, y, 240, 220, 180);
  }
  // Add aging variations and wear marks
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    const v = (rnd() - 0.5) * 30;
    const [r, g, b] = getPx(c, x, y);
    setPx(c, x, y, clamp(r + v), clamp(g + v * 0.9), clamp(b + v * 0.7));
  }
  // Subtle corner motifs (very faint)
  for (let i = 0; i < 100; i++) {
    const t = i / 100;
    const cx = 28 + Math.sin(t * 7) * 16;
    const cy = 28 + Math.cos(t * 5) * 16;
    const alpha = 40 + rnd() * 30;
    setPx(c, cx, cy, 200, 160, 90, alpha);
  }
  // Edge wear (darker edges)
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    const dx = Math.min(x, c.w - 1 - x) / 64;
    const dy = Math.min(y, c.h - 1 - y) / 64;
    const edge = Math.min(dx, dy);
    const e = Math.max(0, 1 - edge * 2);
    const [r, g, b, a] = getPx(c, x, y);
    setPx(c, x, y, clamp(r * (0.8 + 0.2 * e)), clamp(g * (0.8 + 0.2 * e)), clamp(b * (0.75 + 0.25 * e)), a);
  }
  return c;
}

function uiFrame() {
  const c = makeCanvas(256, 256);
  // Transparent center (32px transparent border area)
  const borderWidth = 32;
  // Fill transparent
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    setPx(c, x, y, 0, 0, 0, 0);
  }
  // Draw ornate gold border
  const rnd = mulberry32(99);
  // Top edge
  for (let y = 0; y < borderWidth; y++) for (let x = 0; x < c.w; x++) {
    const t = y / borderWidth;
    setPx(c, x, y, 220 - t * 30, 180 - t * 20, 90 + t * 20, 220);
  }
  // Bottom edge
  for (let y = c.h - borderWidth; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    const t = (c.h - 1 - y) / borderWidth;
    setPx(c, x, y, 220 - t * 30, 180 - t * 20, 90 + t * 20, 220);
  }
  // Left edge
  for (let y = 0; y < c.h; y++) for (let x = 0; x < borderWidth; x++) {
    const t = x / borderWidth;
    setPx(c, x, y, 220 - t * 30, 180 - t * 20, 90 + t * 20, 220);
  }
  // Right edge
  for (let y = 0; y < c.h; y++) for (let x = c.w - borderWidth; x < c.w; x++) {
    const t = (c.w - 1 - x) / borderWidth;
    setPx(c, x, y, 220 - t * 30, 180 - t * 20, 90 + t * 20, 220);
  }
  // Add decorative scrollwork on corners
  for (let i = 0; i < 180; i++) {
    const t = i / 180;
    const x = 12 + Math.sin(t * 12) * 14;
    const y = 12 + Math.cos(t * 12) * 14;
    setPx(c, x, y, 245, 210, 120, 200);
  }
  return c;
}

function uiTabOrnament() {
  const c = makeCanvas(200, 32);
  const wood = woodPanel(200, 32, [60, 40, 26], 101);
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    const [r, g, b] = getPx(wood, x, y);
    setPx(c, x, y, r, g, b);
  }
  // Gold borders
  for (let x = 0; x < c.w; x++) {
    for (let i = 0; i < 3; i++) {
      setPx(c, x, i, 200, 160, 70);
      setPx(c, x, c.h - 1 - i, 200, 160, 70);
    }
  }
  // Lighter center
  for (let y = 8; y < c.h - 8; y++) for (let x = 0; x < c.w; x++) {
    const [r, g, b] = getPx(c, x, y);
    setPx(c, x, y, clamp(r + 18), clamp(g + 14), clamp(b + 8));
  }
  return c;
}

function uiMedals() {
  const c = makeCanvas(384, 64); // 6 icons × 64px
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) setPx(c, x, y, 0, 0, 0, 0);
  const medalColors = [
    [150, 80, 50],   // basic - axe (wood/metal)
    [180, 160, 70],  // food - wheat (golden)
    [170, 170, 180], // mining - ore (silver)
    [120, 180, 100], // military - green/steel
    [200, 180, 80],  // logistics - gold/amber
    [160, 100, 200], // specialists - mystic purple
  ];
  const symbols = ['🪓', '🌾', '⛏️', '🛡️', '🏠', '🧙'];
  for (let i = 0; i < 6; i++) {
    const mx = i * 64 + 32;
    const my = 32;
    const [r, g, b] = medalColors[i];
    // Draw circular medallion
    for (let dy = -26; dy <= 26; dy++) for (let dx = -26; dx <= 26; dx++) {
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d <= 26) {
        // Gold rim
        if (d > 20) setPx(c, mx + dx, my + dy, 215, 175, 85, 255);
        else setPx(c, mx + dx, my + dy, clamp(r * (1 - (d - 20) / 20)), clamp(g * (1 - (d - 20) / 20)), clamp(b * (1 - (d - 20) / 20)), 255);
      }
    }
    // Center highlight
    for (let dy = -8; dy <= 8; dy++) for (let dx = -8; dx <= 8; dx++) {
      if (dx * dx + dy * dy <= 64) {
        setPx(c, mx + dx, my + dy, clamp(r + 40), clamp(g + 40), clamp(b + 40), 255);
      }
    }
  }
  return c;
}

function uiProgressBg() {
  const c = makeCanvas(200, 20);
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    const v = (Math.random() - 0.5) * 20;
    setPx(c, x, y, clamp(90 + v), clamp(70 + v), clamp(55 + v));
  }
  return c;
}

function uiProgressFill() {
  const c = makeCanvas(200, 16);
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    const t = x / c.w;
    setPx(c, x, y,
      clamp(180 + t * 20),
      clamp(140 + t * 20),
      clamp(60 + t * 20)
    );
  }
  return c;
}

function uiSeparatorDecor() {
  const c = makeCanvas(400, 16);
  for (let x = 0; x < c.w; x++) for (let y = 0; y < c.h; y++) setPx(c, x, y, 210, 170, 80, 200);
  // Decorative elements - repeating pattern
  for (let x = 0; x < c.w; x += 40) {
    for (let dy = -6; dy <= 6; dy++) for (let dx = -2; dx <= 2; dx++) {
      if (Math.abs(dx) + Math.abs(dy) <= 6) {
        setPx(c, x + dx, 8 + dy, 240, 210, 120, 255);
      }
    }
  }
  return c;
}

// ── Emit ────────────────────────────────────────────────────────────────
const OUT = path.join(__dirname, '..', 'assets', 'textures');
fs.mkdirSync(OUT, { recursive: true });

const jobs = [
  ['ui_panel.png', uiPanel()],
  ['ui_header.png', uiHeader()],
  ['ui_button.png', uiButton('normal')],
  ['ui_button_hover.png', uiButton('hover')],
  ['ui_button_pressed.png', uiButton('pressed')],
  ['ui_corner.png', uiCorner()],
  ['ui_divider.png', uiDivider()],
  ['ui_resources.png', uiResources()],
  // New decorative textures
  ['ui_menu_bg.png', uiMenuBg()],
  ['ui_frame.png', uiFrame()],
  ['ui_tab_ornament.png', uiTabOrnament()],
  ['ui_medals.png', uiMedals()],
  ['ui_progress_bg.png', uiProgressBg()],
  ['ui_progress_fill.png', uiProgressFill()],
  ['ui_separator_decor.png', uiSeparatorDecor()],
];

for (const [name, canvas] of jobs) {
  const png = encodePNG(canvas.w, canvas.h, canvas.data);
  fs.writeFileSync(path.join(OUT, name), png);
  console.log(`✔ ${name} (${canvas.w}×${canvas.h}, ${png.length} bytes)`);
}
console.log(`Generated ${jobs.length} UI textures in ${OUT}`);
