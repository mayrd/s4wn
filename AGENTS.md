# AGENTS.md — S4WN Project Reference

> **⚠️ BASE.md is the priority source of truth.** Read BASE.md first. Never modify BASE.md unless explicitly asked.

---

## 1. Agent Rules

### Asset Policy (Non-Negotiable)
- **NO original Siedler 4 assets** (sprites, textures, sounds, music) are ever extracted or committed.
- All visuals and audio must be **generated from scratch** in `assets/`.
- Standard web formats: PNG, WebP, OGG, JSON — never proprietary containers.
- **Exception:** parse original `*.map` / `*.sav` for scenario data only, map to our own asset IDs.

### Base Knowledge
- **[siedlercommunity.de/siedler4](https://www.siedlercommunity.de/siedler4/)** — authoritative source for buildings, units, production chains, and game mechanics.
- **BASE.md** contains building reference data — always consult it before implementing building-related features.

### Session Protocol
**Start:** Read BASE.md → fetch open GitHub issues (token in `/opt/data/.env`) → read Next Session below.

**During:** Resolve open issues FIRST → one small atomic task per run → `cargo test` after every Rust change.

**End (MANDATORY):** `cargo test` green → `git add -A && git commit` → `git push` (if fails, `git pull --rebase`) → update Session Log below with 3-5 next steps.

### WASM Export Checklist
1. `#[wasm_bindgen]` in `lib.rs`
2. `wasm-pack build --target web --release`
3. Verify: `grep "export function $fn" pkg/s4wn_engine.js`
4. Bump cache: `?v=N` → `?v=N+1` in `index.html`
5. Never add JS imports without rebuilding pkg/

### Critical Pitfalls
- `parent.clientHeight` on `position:fixed` canvas → ~19px on mobile → use `window.innerHeight`
- `spawn_rubble_effect` is internal-only → no `#[wasm_bindgen]` → never import in JS
- `map.width`/`map.height` are fields, not methods
- Adding enum variants → update ALL match arms → `cargo test --lib` finds missed ones
- `pkg/` is gitignored → `git add -f engine/pkg/`
- L3 maps are compressed → do NOT implement decompression

### Communication
- Keep responses concise — short direct answers on Telegram
- Daniel prefers fewer, longer messages over many short ones

---

## 2. Technology Choices

### Engine: Rust → WASM (Native Re-Implementation)
**Chosen over:** x86 Emulation (performance), Hybrid RE (legal grey area), JS Engine (too slow).
Full control, modern toolchain, clean legal foundation.

### Graphics: Raw WebGL2 via web-sys
**Chosen over:** three.js (600KB overhead), wgpu (narrower support), Bevy (experimental WASM).
Direct GPU access, ~200KB WASM binary. WebGPU planned when browser share >90%.
**Phase 7:** Redo rendering pipeline to match original S4 visual fidelity — lighting, shading, terrain rendering, building materials, water, shadows.

### Camera: Orbital (Azimuth/Elevation/Distance)
Default: classic isometric (az=45°, el=35.264°). Smooth interpolation `dt * 8.0`.

### Models: Procedural OBJ/JSON → glTF 2.0
84 procedurally-generated JSON models currently. Future: glTF 2.0 (.glb) with PBR.

### Textures: Procedural → WebP Atlases (Phase 7: Original-Faithful)
Terrain 2048×2048. All procedurally generated. **Phase 7 goal:** regenerate all textures to closely match the original Siedler 4 art style — same color palette, terrain texel density, biome transitions, building material appearance — while keeping everything procedurally generated from scratch (no original assets).

### Server: Caddy 2.x
Auto-HTTPS via Let's Encrypt. Multi-arch Docker (amd64 + arm64).

### Build Toolchain
| Tool | Purpose |
|------|---------|
| Rust (stable) | Game engine |
| wasm-pack | Rust → WASM + JS bindings |
| Caddy 2.x | Production web server |
| Docker Buildx | Multi-arch images |

### Performance Targets
- 60 FPS desktop (1080p), 30 FPS Raspberry Pi 5 (720p)
- <200 draw calls per frame, WASM <300KB

---

## 3. Implementation Plan

**Status:** Phase 7.0 — Rendering Overhaul (redo rendering + textures to match original S4) — 519 tests passing
**Methodology:** BDD/TDD — Objective → Test Cases → Implementation → Verify → Commit

### Roadmap

| Phase | Status | Description |
|-------|--------|-------------|
| 0 — Foundation | ✅ | WASM/WebGL2 POC, CI/CD pipeline |
| 1 — Core Engine | ✅ | Map, camera, game loop, ARA+LZH decoder |
| 2 — Economy | ✅ | Production chains, buildings, tools |
| 3 — Units | ✅ | Spawning, pathfinding, commands |
| 4 — UI Overhaul | ✅ | Viewport, HUD, splash, panels |
| 5 — 3D Pipeline | ✅ | Orbital camera, terrain, GPU models |
| 6 — Polish | ✅ | Particles, sound, mobile, stances, tutorial |
| 7 — Rendering Overhaul | 🔄 | Redo rendering to match original S4 as closely as possible; regenerate all textures to closely match original art style |

### Session Log (recent)

| Session | Date | Summary |
|---------|------|---------|
| 143 | 2026-06-21 | Fix #54: canvas CSS stretching on mobile |
| 142 | 2026-06-21 | Building Auto-Repair + Bugfix #52 |
| 141 | 2026-06-21 | Attack-move formation preservation |
| 140 | 2026-06-20 | Minimap building dots |
| 139 | 2026-06-20 | Building rubble particle effect |
| 138 | 2026-06-20 | Building combat |
| 137 | 2026-06-20 | Building HP system |
| 136 | 2026-06-19 | Unit stance JS/UI complete |
| 135 | 2026-06-19 | Unit stance engine implementation |
| 133 | 2026-06-18 | Unit formation movement |

### Next Session — Concrete Steps
1. **Phase 7 kickoff:** Audit current rendering pipeline — catalog all shaders, draw calls, and texture generation code; identify gaps vs original S4 visual fidelity
2. Study original S4 screenshots/captures for art style reference (color palette, lighting, terrain texel density, building proportions)
3. Redo terrain texture generation — match original S4 terrain colors, biome transitions, and tile patterns as closely as possible
4. Redo building/structure textures — regenerate to closely match original S4 art style (no original assets, but match the look)
5. Improve model geometry to better match original S4 building shapes and proportions

---

*All building data must match BASE.md. Never modify BASE.md.*
