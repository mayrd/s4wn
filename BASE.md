# BASE.md — S4WN Foundational Knowledge

> **This file is the single source of truth for the S4WN project.**
> All other documentation (AGENTS.md, IMPLEMENTATION_PLAN.md, TECHNOLOGY_CHOICE.md, README.md) MUST derive from and be consistent with this file.
> When information conflicts, BASE.md wins. Do not override or contradict this file.

---

## 1. Project Identity

**S4WN** (Siedler 4 Web-Native) preserves the spirit of the classic *The Settlers IV* (2001) as a fully open-source, web-based game. All game logic, assets, and tools are self-contained in this repository — no external dependencies on original game binaries or extracted proprietary files.

**Mission:** Make Siedler 4 playable in any modern browser, on any device, forever.

**Reference for game mechanics:** [siedlercommunity.de/siedler4](https://www.siedlercommunity.de/siedler4/) — authoritative source for buildings, units, production chains, and formulas.

---

## 2. Non-Negotiable Constraints

### Asset Policy
- **NO original Siedler 4 assets** (sprites, textures, sounds, music) are ever extracted or committed.
- All visuals and audio are **generated from scratch** and placed in `assets/`.
- Standard web formats only: PNG, WebP, OGG, JSON — never proprietary containers.
- **Exception:** Original `*.map` and `*.sav` files are parsed for scenario data only, mapped to our own asset IDs. The parser reads layout, resources, objectives — never extracts sprites or textures.

### Legal
- The project is 100% open-source (MIT license).
- It is NOT dependent on the user owning a copy of the original game.
- Reverse-engineering is limited to publicly documented map/save formats; no disassembly of original binaries.

### Language
- **Rust** for the game engine (compiled to WASM via `wasm-bindgen`).
- **JavaScript (vanilla, ES modules)** for UI glue — no frameworks (React, Vue, Svelte).
- **GLSL 300 es** for shaders (WebGL2).
- **Python** for procedural asset generation and build scripts only.

---

## 3. Architecture

```
Browser
  └─ index.html (single-page app, ~6500 lines)
       ├─ <script type="module"> imports WASM
       │    ├─ engine/src/lib.rs → pkg/s4wn_engine.js + .wasm
       │    ├─ engine/src/economy.rs, combat.rs, units.rs, map.rs, ...
       │    └─ engine/src/camera.rs (orbital: azimuth/elevation/distance)
       ├─ <canvas id="game-canvas"> — WebGL2 rendering
       ├─ <canvas id="minimap"> — 2D overview
       ├─ <canvas id="selection-overlay"> — UI indicators
       └─ Procedural Web Audio API (Sfx module)

Server (optional, for multiplayer):
  Caddy 2.x — static files + WebSocket proxy
  Docker — single container, multi-arch (amd64 + arm64)
```

### Key Design Decisions
- **Graphics:** Raw WebGL2 via `web-sys`, NOT three.js/wgpu/bevy. Custom shaders, direct GPU access. Tiny WASM binary (~200KB).
- **Camera:** Orbital (azimuth/elevation/distance). Default is classic isometric (az=45°, el=35.264°). Full 3D terrain with heightmap displacement.
- **Models:** Procedurally generated OBJ/JSON, later glTF 2.0. No original S4 sprites.
- **Audio:** Procedural Web Audio API oscillators + noise buffers — no audio files.
- **Server:** Caddy (auto-HTTPS, simple Caddyfile, small binary). Docker for deployment.
- **Build:** `wasm-pack build --target web --release` produces `engine/pkg/`.

### WASM Export Checklist (NEVER SKIP)
1. Add `#[wasm_bindgen]` function in `engine/src/lib.rs`
2. `cd engine && wasm-pack build --target web --release`
3. Verify: `grep "export function $fn" pkg/s4wn_engine.js`
4. Bump cache buster in `index.html`: `?v=N` → `?v=N+1`
5. Adding imports without rebuilding `pkg/` causes splash-screen stalls (#1 bug)

---

## 4. Development Principles

### BDD/TDD — Tests First, Always
- Every feature follows: **Objective → Test Cases → Implementation → Verify → Commit**
- Tests are written BEFORE code. `cargo test` must be green.
- Every bugfix adds a regression test.
- Current: **519 tests** (engine + server), all passing.

### Session Workflow (for AI agents)
1. **Read BASE.md first.** Then AGENTS.md.
2. Fetch open GitHub issues — resolve them FIRST (stability > features).
3. Advance the next incomplete item in IMPLEMENTATION_PLAN.md.
4. One small atomic task per session (10-20 minutes).
5. End EVERY session with: `cargo test` green → `git commit` → `git push` → update IMPLEMENTATION_PLAN.md.

### Critical Pitfalls
- `parent.clientHeight` on `position:fixed` canvas returns ~19px on mobile. Use `window.innerHeight`.
- `spawn_rubble_effect` is an internal Rust fn — no `#[wasm_bindgen]`. Never import in JS.
- `map.width` / `map.height` are fields, not methods.
- Adding enum variants: update ALL match arms. `cargo test --lib` finds missed ones.
- `engine/pkg/` is gitignored. Force-add: `git add -f engine/pkg/`.
- L3 maps are S4ME compressed format — do NOT implement decompression. Direct users to re-save as WRLD.

---

## 5. Current Implementation State

**Status:** Phase 6.20 — 519 tests passing

### Completed (highlights)
- ✅ Full Rust WASM engine with isometric/3D rendering
- ✅ Economy simulation (buildings, resources, production chains, 5 nations)
- ✅ Combat AI (Aggressive/StandGround/Passive stances, building attacks)
- ✅ Orbital camera, terrain heightmap, GPU model rendering
- ✅ Unit commands (move, attack-move, patrol, formation-move)
- ✅ Building destruction, auto-repair, rally points
- ✅ Mobile responsive CSS, touch gestures, swipe navigation
- ✅ Procedural sound effects, particle system
- ✅ Map editor, marquee selection, health bars, minimap
- ✅ Tutorial engine, .sav campaign parser

### In Progress / Next
- See IMPLEMENTATION_PLAN.md "Next Session" section for 3-5 concrete steps.

---

## 6. Project Files

| File | Purpose |
|------|---------|
| `BASE.md` | **This file** — foundational truth, highest priority |
| `AGENTS.md` | Operational rules for AI coding agents (derived from BASE.md) |
| `IMPLEMENTATION_PLAN.md` | Roadmap, session log, next steps |
| `TECHNOLOGY_CHOICE.md` | Tech stack decisions and rationale |
| `README.md` | Project overview, status, quick start |
| `engine/src/lib.rs` | Main WASM engine (~5300 lines) |
| `engine/index.html` | Single-page UI (~6500 lines) |
| `engine/config/data.js` | Building/resource/unit/nation definitions |

---

*Last updated: 2026-06-21 — 519 tests*
*This file takes precedence over all other project documentation.*
