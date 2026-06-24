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

**Status:** Phase 7.1 — Rendering Overhaul — terrain atlas regenerated, 84 models with hipped roofs, stepped temple bases + spires, day-phase hemisphere ambient lighting, cloud layer with parallax, building destruction animation, sun/moon discs, rain particle system, lightning flashes, water reflection FBO + Fresnel blend, dead uniform cleanup, console_error_panic_hook removed, shared day_light GLSL macro, terrain LOD (3 levels), wee_alloc global allocator, codegen-units=1, fine-tuned horizon_y computation — 654 tests passing | WASM 365KB (was 377KB, -12KB)
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
| 190 | 2026-06-24 | Step 43: WASM size investigation. Profiled with twiggy — top functions: render(11.4%), .rodata(6.8%), serde_json deser(4.3%), flt2dec(2.9%). Added wee_alloc (-6.5KB), codegen-units=1 (-5.7KB). 377KB → 365KB. Remaining: ~82KB .rodata (model data, shaders), ~17KB render, ~14KB serde. 645 tests pass. -- 645 tests |
|| 192 | 2026-06-24 | Step 46: Soft rain particle ground fade-out — rain droplets cap remaining life at 0.15s on terrain impact instead of bouncing. Added test_rain_ground_fade_out. Updated RENDERING_AUDIT.md: mark Step 33 horizon_y done, bump tests 645→654. 655 tests pass. -- 655 tests |
|| 193 | 2026-06-24 | Step 44: Draw-call counter + FPS meter — Added draw_call_count field to App struct, incremented at all 8 WebGL draw call sites, exported get_fps()/get_draw_calls() via wasm_bindgen, displayed DC alongside FPS in debug panel. Investigated wasm-opt -Oz (no ARM64 binary available; wasm-pack uses wasm-opt by default). 655 tests pass. WASM 365KB. -- 655 tests |
|| 191 | 2026-06-24 | Step 33: Fine-tuned horizon_y computation — use precomputed f=1/tan(fov/2) from projection instead of duplicating hardcoded 45° FOV. Added -0.02 NDC bias to prevent horizon edge artifacts. Proper fwd_horiz clamping with max(0.01). horizon_ndc clamped to [-1,1], screen_y to [0.01,0.99]. 9 new horizon_tests (iso/steep/shallow/zero elevation, narrow/wide FOV, clamping, monotonic). 654 tests pass. -- 654 tests |
| 189 | 2026-06-24 | Step 32: Code-reviewed water tile exclusion from reflection FBO — confirmed u_reflection_pass=1 → discard water tiles in shader during FBO render, reset to 0 for main pass. Logic verified correct. Step 42: Ran cargo clippy, fixed 4 errors (3x approx_constant TAU float literals, 1x boolean logic bug overlay_dirty||true). Applied 39 auto-fixes (unnecessary_cast, or_default, len_zero, etc.). 645 tests pass. -- 645 tests |
| 188 | 2026-06-23 | Phase 7: Rendering pipeline audit checklist — RENDERING_AUDIT.md covering all 7 passes (FBO→terrain→shadows→clouds→sun/moon→models→overlay). Tracks 38 features done, 3 visual verification items (Steps 32-34), performance targets, shader uniforms audit. 645 tests pass. -- 645 tests
| 187 | 2026-06-23 | Phase 7: Half-resolution reflection FBO — render at 50% resolution (canvas.width/2, canvas.height/2) to save 75% fill rate on water tiles. reflection_w/reflection_h fields on App struct. LINEAR filter upscales. 645 tests pass, WASM 377KB. -- 645 tests
| 185 | 2026-06-23 | Fix #69: Add missing `uniform vec2 u_resolution;` to terrain fragment shader — was used but not declared, causing shader compile error. 644 tests pass. -- 644 tests
| 184 | 2026-06-23 | Phase 7: Terrain LOD — multi-resolution mesh with 3 levels (LOD 0: 1×1, LOD 1: 2×2, LOD 2: 4×4 tiles per quad). Chebyshev distance from camera center. build_map_mesh() delegates to build_map_mesh_lod(). 6 new tests. -- 640 tests |
| 177 | 2026-06-23 | WASM size audit: 364KB (unchanged). Removed dead u_sun_color/u_moon_color shader uniforms + Rust plumbing. Added panic=abort to Cargo.toml. -- 624 tests |
| 178 | 2026-06-23 | Removed console_error_panic_hook dependency (Cargo.toml + lib.rs). Saved ~3.5KB (364KB → 360.5KB). 624 tests pass. -- 624 tests |
| 179 | 2026-06-23 | Consolidated duplicated day_light GLSL fragment across 4 shaders (terrain/model/cloud/sun_moon). Used macro_rules! + concat! for zero-overhead code sharing. 624 tests pass. -- 624 tests |
| 180 | 2026-06-23 | Audited web-sys features: removed 8 unused (WebSocket, MessageEvent, ErrorEvent, CloseEvent, BinaryType, MouseEvent, WheelEvent, Node). No WASM size change — features only affect JS glue. 624 tests pass. -- 624 tests |
| 181 | 2026-06-23 | Phase 7: Rain particle system — spawn_rain_particle/spawn_rain_burst with blue-white streaks, gravity fall, drift. Hooked into game loop every ~4 ticks across visible camera area. 6 new tests. -- 630 tests |
| 183 | 2026-06-23 | Phase 7: Water reflections — FBO + reflection pass + shader sampling. Render terrain to FBO with camera Y flipped. Fragment shader samples u_reflection_tex with screen-space Y-flip, blends with Fresnel. Added WebGlFramebuffer + WebGlTexture features. -- 634 tests |
| 182 | 2026-06-23 | Phase 7: Lightning flashes — periodic sky brightening with rapid 0.15s fade. u_lightning uniform in terrain shader boosts ambient + sky clear color during flashes. 20-90s interval, 30% double-flash chance. -- 630 tests |
| 176 | 2026-06-23 | Phase 7: Cloud instanced rendering — draw_arrays_instanced, static unit-quad corner buffer, per-instance pos/size/alpha (divisor=1). 6× less vertex upload. -- 624 tests |
| 175 | 2026-06-23 | WASM size audit: 364KB (64KB over target). wasm-opt no help. Clean build confirms 364KB baseline. -- 624 tests |
| 174 | 2026-06-23 | Phase 7: Sun/Moon disc rendering — celestial body discs with glow, day/night visibility, positioned via VP projection — 624 tests |
| 173 | 2026-06-23 | Phase 7: Building destruction animation — scale-to-zero with ease-in curve during destruction — 618 tests |
| 172 | 2026-06-23 | Phase 7: Cloud layer rendering — semi-transparent quads at high elevation with parallax + day-phase coloring — 612 tests |
| 171 | 2026-06-23 | Phase 7: Day-phase-aware hemisphere ambient lighting for model instances — 607 tests |
| 169 | 2026-06-22 | Phase 7: Dynamic sky color ramp (dawn→noon→dusk→night) — Fixed #66 #67 — 605 tests |
| 170 | 2026-06-22 | Phase 7: Smooth shadow penumbra via multi-layer falloff + noise dither — 605 tests |
| 168 | 2026-06-22 | Fix #68: Object Explorer silent-return path now shows toast notification — 605 tests |
| 167 | 2026-06-22 | Phase 7: Ambient occlusion at cliff/elevation boundaries — 605 tests |
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
12. ~~Add ambient occlusion to terrain tiles at cliff/height boundaries~~ ✅ (session 167)
13. ~~Add dynamic sky color ramp~~ ✅ (session 169)
14. ~~Add smooth shadow penumbra (soft edges) using multi-layer falloff + noise dither~~ ✅ (session 170)
15. ~~Add unit idle animations (subtle breathing/bob cycle) visible on model instances~~ ✅ (already implemented)
16. ~~Add day-phase-aware ambient light multiplier that scales hemisphere+directional lighting~~ ✅ (session 171)
17. ~~Add cloud layer rendering (semi-transparent quads at high elevation with parallax)~~ ✅ (session 172)
18. Validate WASM <300KB -- currently 364KB (session 177). panic=abort added (no size change). Shader dead uniforms removed. Next: remove console_error_panic_hook dep, audit web-sys features, consolidate shader day_light function.
19. Add weather effects (rain particles, lightning flashes during storms)
20. ~~Add building destruction animation (collapse particles, debris)~~ ✅ (session 173)
21. ~~Optimize cloud rendering: use instanced draw calls instead of per-vertex expansion~~ ✅ (session 176)
22. Add sun/moon disc rendering in the sky -- done (session 174)
23. Validate WASM <300KB — 364KB after cleanup + panic=abort (session 177). Try: remove panic_hook dep, audit web-sys features, consolidate shader day_light
24. ~~Implement cloud instanced rendering (draw_arrays_instanced) to reduce vertex upload~~ ✅ (session 176)

---

25. ~~WASM size audit: 364KB after cloud instancing~~ ✅ (session 177)
26. ~~Shader cleanup: removed dead u_sun_color/u_moon_color uniforms + Rust plumbing~~ 🔄 (session 177 — more needed)
27. ~~Add weather effects: rain particle system~~ ✅ (session 181 — rain done, lightning flashes remain)
27a. ~~Remove console_error_panic_hook dependency~~ ✅ (session 178, saved 3.5KB → 360.5KB)
27b. ~~Audit unused web-sys features in Cargo.toml~~ ✅ (session 180 — removed 8 unused features)
27c. ~~Consolidate duplicated day_light GLSL fragment (3 copies in model/cloud/sun_moon shaders)~~ ✅ (session 179)
27d. ~~Add lightning flashes: periodic sky brightening with rapid fade (0.1-0.2s)~~ ✅
28. ~~Water reflections: mirror terrain/buildings on water surface with Fresnel effect~~ ✅ (session 183 — FBO + reflection pass + shader sampling)
29. ~~Terrain LOD: reduce vertex count for distant tiles~~ ✅ (session 184)
30. ~~Reflection pass optimization: render only solid objects (exclude water from FBO), clamp reflection to below horizon~~ ✅
30a. ~~Half-resolution reflection FBO (50% → 75% fill rate savings)~~ ✅ (session 187)
31. ~~WASM size: measure new baseline~~ ✅ 377KB (session 187)
32. Verify reflection optimization visually: ensure water tiles don't appear in reflection FBO
33. Fine-tune horizon_y computation for different camera elevations and zoom levels
34. Consider adding a depth attachment to the reflection FBO for better sorting
35. ~~Add rendering pipeline audit checklist document~~ ✅ (session 188)

---

### Next Session — Updated Steps (Session 193+)
---
43. WASM size: 365KB → 300KB — remaining 65KB gap. wasm-opt -Oz not available on ARM64 (wasm-pack uses default wasm-opt). Next targets: (a) reduce .rodata — shaders are ~22KB, model JSONs loaded at runtime (not compiled in). Check for other large const arrays. (b) ryu for flt2dec float formatting (~10KB). (c) miniserde audit. [MUST — 65KB remains]
44. FPS/draw-call benchmarking: engine now exports get_fps() and get_draw_calls(). Next: add 1080p/720p FPS display toggle, record baseline numbers in RENDERING_AUDIT.md [SHOULD]
45. Investigate if building model JSON definitions can be lazy-loaded from assets/ to reduce .rodata [NICE]
32. Verify reflection optimization visually: ensure water tiles excluded from reflection FBO [visual confirmation pending]
34. Add depth attachment to reflection FBO for better sorting [NICE]

*All building data must match BASE.md. Never modify BASE.md.*
