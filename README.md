# S4WN — Siedler 4 Web-Native

> **⚠️ Priority: [BASE.md](BASE.md)** contains game knowledge (building data, production chains). Never modify BASE.md.

Web-native reimplementation of *The Settlers IV* (2001). Open-source, runs in any browser, no original game files required.

---

## Quick Reference

| | |
|---|---|
| **Engine** | Rust → WASM (wasm-bindgen + web-sys) |
| **Graphics** | Raw WebGL2, custom shaders |
| **UI** | Vanilla JS ES modules, single `index.html` |
| **Audio** | Procedural Web Audio API |
| **Server** | Caddy (static files + WebSocket) |
| **Deploy** | Docker, multi-arch (amd64 + arm64) |
| **Tests** | 519 passing |
| **License** | MIT |

---

## Architecture

```
Browser → index.html
  ├─ WASM engine (Rust, ~200KB)
  │   ├─ Economy, Combat, Units, Map, Pathfinding
  │   ├─ Orbital camera (azimuth/elevation/distance)
  │   └─ GPU model rendering (instanced draw calls)
  ├─ WebGL2 canvas — terrain, buildings, units, particles
  ├─ 2D overlay canvas — selection, health bars, UI
  └─ Web Audio API — procedural sound effects
```

---

## Current Status

**Phase 6.20 — 519 tests passing**

- ✅ Full WASM engine with economy, combat, 5 nations
- ✅ Orbital camera, terrain heightmap, GPU models
- ✅ Unit commands, stances, building destruction
- ✅ Mobile responsive, touch gestures, particles, sound

---

## Development

```bash
cd engine && wasm-pack build --target web --release   # Build WASM
cargo test --lib                                      # Run tests (519 pass)
python3 -m http.server 8000                           # Serve locally
```

### For AI Agents
Read in order: **BASE.md → AGENTS.md**

---

## Key Reference

- **[siedlercommunity.de/siedler4](https://www.siedlercommunity.de/siedler4/)** — building/unit/production chain mechanics
- **[BASE.md](BASE.md)** — building reference data (do not modify)
- **[AGENTS.md](AGENTS.md)** — agent rules, tech choices, implementation plan
