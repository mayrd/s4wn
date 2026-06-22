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

**Status:** Phase 7.1 — Rendering Overhaul — terrain atlas regenerated, 84 models with hipped roofs, stepped temple bases + spires — 601 tests passing
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
| 166 | 2026-06-22 | Fix #63 #64 #65: DebugSnapshot field name mismatches (camera + map data) — 601 tests |
| 165 | 2026-06-22 | UI: Speed button with pause (1×→2×→4×→⏸), translated bottom bar tooltips — 601 tests |
| 164 | 2026-06-22 | Phase 7: Construction particles with per-nation color blending — 601 tests |
| 163 | 2026-06-22 | Phase 7: Procedural detail normals for building walls — 598 tests |
| 162 | 2026-06-22 | Phase 7.1: Wire terrain atlas into model fragment shader — 597 tests |
| 161 | 2026-06-22 | Phase 7.1: Water normal map for animated surface ripples — 597 tests |
| 160 | 2026-06-22 | Phase 7: Soft ground-plane shadows for buildings/units — 596 tests |
| 159 | 2026-06-22 | Improve building model geometry: hipped roofs, temple spires, better proportions for 38 models |
| 158 | 2026-06-22 | Per-building material colors + texture UVs for all 84 models |
| 157 | 2026-06-22 | Compute proper per-vertex normals for all 84 building 3D models |
| 156 | 2026-06-22 | Fix #58 #59 #60: Move Editor to Main Menu, add Object Explorer |
| 155 | 2026-06-22 | Regenerate terrain_atlas.png with S4-authentic procedural textures |
| 144 | 2026-06-22 | Fix #55 #56 #57: Resource icons, construction category order + building counts, hover tooltips |
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
1. ~~Phase 7 kickoff: Audit rendering pipeline~~ ✅ (session 154)
2. ~~Update terrain color palette to match S4~~ ✅ (session 154)
3. ~~Add smooth biome transition splat-map blending~~ ✅ (session 154)
4. ~~Regenerate terrain_atlas.png (2048×512) with higher-quality procedural textures~~ ✅ (session 155)
5. ~~Building normals — proper per-vertex normals~~ ✅ (session 157) — ~~per-building material colors + texture UVs~~ ✅ (session 158)
6. ~~Improve model geometry to better match original S4 building shapes and proportions~~ ✅ (session 159)
7. ~~Add soft shadow rendering for buildings/units~~ ✅ (session 160)
8. ~~Add water surface animation (waves, reflections) with normals + specular~~ ✅ (session 161)
9. ~~Wire terrain atlas texture into model fragment shader (use UVs + u_model_color)~~ ✅ (session 162)
10. ~~Add normal-mapped detail textures to building walls~~ ✅ (session 163)
11. ~~Add building construction animation particles with per-nation colors~~ ✅ (session 164)
12. Add ambient occlusion to terrain tiles at cliff/height boundaries — darken lower tiles at elevation transitions for depth/readability
13. Add dynamic sky color ramp that changes with day phase (warm dawn → blue noon → orange dusk → dark night)
14. Add smooth shadow penumbra (soft edges) using percentage-closer filtering or blur pass
15. Add unit idle animations (subtle breathing/bob cycle) visible on model instances

---

*All building data must match BASE.md. Never modify BASE.md.*
