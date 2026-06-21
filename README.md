# S4WN — Siedler 4 Web-Native

> **Read [BASE.md](BASE.md) first** — it contains the foundational knowledge this project is built on.

Web-native reimplementation of the classic *The Settlers IV* (2001). Fully open-source, runs in any modern browser, no original game files required.

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
| **Tests** | 519 passing (BDD/TDD) |
| **License** | MIT |

---

## Architecture

See [BASE.md §3](BASE.md#3-architecture) and [TECHNOLOGY_CHOICE.md](TECHNOLOGY_CHOICE.md) for full details.

```
Browser → index.html (single-page app)
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
- ✅ Map editor, marquee selection, minimap, tutorial

See [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) for roadmap and next steps.

---

## Development

```bash
# Build WASM
cd engine && wasm-pack build --target web --release

# Run tests
cargo test --lib

# Serve locally
cd engine && python3 -m http.server 8000
# Open http://localhost:8000/index.html
```

### For AI Agents

Read in order: **BASE.md → AGENTS.md → IMPLEMENTATION_PLAN.md**

---

## Project Files

| File | Purpose |
|------|---------|
| [BASE.md](BASE.md) | **Foundational truth — read first** |
| [AGENTS.md](AGENTS.md) | AI agent operational rules |
| [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) | Roadmap + session log |
| [TECHNOLOGY_CHOICE.md](TECHNOLOGY_CHOICE.md) | Tech stack decisions |
| `engine/src/lib.rs` | WASM engine (~5300 lines) |
| `engine/index.html` | Single-page UI (~6500 lines) |

---

*Part of the S4WN project. See BASE.md for foundational knowledge.*
