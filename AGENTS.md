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

**Status:** S254 · 769 tests · Clippy: 0 errors, 0 warnings. 0 open issues. Removed UnitKind::name() thin wrapper — all callers already used UNIT_KIND_NAMES[discriminant as usize] directly. Added UNIT_STATE_NAMES const array (8 slots, indexed by UnitState discriminant) — replaced inline 8-arm match in military_in_rect(). Pure Rust. Next: audit remaining name() methods (WorkerKind) and convert to integer-only consumers.**
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

| 254 | 2026-06-27 | Add UNIT_STATE_NAMES const array + remove UnitKind::name() thin wrapper: Added UNIT_STATE_NAMES [&str; 8] const array indexed by UnitState discriminant. Replaced inline 8-arm UnitState→name match in military_in_rect() with UNIT_STATE_NAMES[u.state as usize] direct access. Removed UnitKind::name() thin wrapper — all 0 remaining callers already used UNIT_KIND_NAMES[discriminant as usize] directly. Added test_unit_state_names (count, 8 name assertions, non-empty validation). 768→769 tests. Clippy clean. Pure Rust — no WASM rebuild needed. -- 769 tests |
| 250 | 2026-06-27 | Remove ResourceType.name() method: replaced all 8 remaining callers (3 in restore_game_state backward-compat, 5 test assertions, 1 discriminant consistency test) with direct ResourceType::RESOURCE_NAMES[discriminant as usize] access. Removed name() fn from ResourceType impl. WASM 301.7KB (minimal delta — strings still live in RESOURCE_NAMES const). 765 tests pass, clippy clean. -- 765 tests |
| 252 | 2026-06-27 | Remove NationType.name() method: replaced 2 non-test callers (lib.rs get_player_nation, economy.rs BalanceResult) + 3 test functions with NationType::NAMES[discriminant as usize] access. Added NATION_NAMES const array (5 elements, no gaps). Added test_nation_names_const (count, round-trip, non-empty). 767→768 tests. Clippy clean. No WASM rebuild needed (pure Rust). -- 768 tests |
| 251 | 2026-06-27 | Remove BuildingType.name() method: replaced 9 callers with BuildingType::BUILDING_NAMES[discriminant as usize] access (2 test assertions, 3 production assertion messages, 2 discriminant tests, 1 WASM error, 1 model_id_for_building). Added BUILDING_NAMES const array (87 slots, COUNT=87, 77 names + 10 gaps). Changed model_id_for_building from &str to BuildingType (discriminant match, no string lookups). 765→767 tests. WASM 301.7KB→300.6KB (-1.1KB: removed 77-arm match code). Clippy clean. -- 767 tests |
| 249 | 2026-06-27 | Refactor ResourceType.name() from 19-arm match to RESOURCE_NAMES const array (29 elements, indexed by discriminant). Centralizes all name strings for future removal. Add BUILDING_ICONS_BY_ID (77 entries, u8→emoji) in data.js alongside BUILDING_NAMES_BY_ID. WASM 301.8KB. 765 tests pass, clippy clean. -- 765 tests |
| 248 | 2026-06-27 | Remove dead get_resource_counts() WASM export: All JS consumers migrated to get_resource_counts_by_id() in S247. Removed the old string-key-based export from lib.rs, removed imports from index.html (2 places), bumped cache v60→v61. WASM 301.8KB (baseline 300.1KB, variance ~1.7KB from build non-determinism). 765 tests pass, clippy clean. No open issues. -- 765 tests |
| 247 | 2026-06-27 | Migrate JS resource consumers to get_resource_counts_by_id(): Fixed canAffordAll() (was broken — get_build_cost() returns integer keys since S246), migrated updateResourceBar() (uses RESOURCE_ICONS_BY_ID + ELEMENTARY_DISCS), migrated renderResources() (uses RESOURCE_DISCRIMINANT_BY_CONFIG_ID mapping). Added RESOURCE_DISCRIMINANT_BY_CONFIG_ID (17 entries) in data.js bridging UI config resource IDs → Rust ResourceType discriminants. 765 tests pass. -- 765 tests |
| 246 | 2026-06-27 | Replace ResourceType.name() with .discriminant() in get_game_state()/get_building_info()/get_build_cost() JSON output — all resource keys now integers. Added ResourceType::discriminant() method + test (765 tests). Added get_resource_counts_by_id() WASM export (integer keys, validated discriminants only) + RESOURCE_ICONS_BY_ID (19 entries, u8→emoji). restore_game_state() backward-compat: tries integer keys first, falls back to name keys; building kind parsing handles both formats. get_resource_counts() preserved with old format. Clippy clean. 765 tests pass. -- 765 tests |
| 245 | 2026-06-27 | Add ResourceType::from_discriminant() following the BuildingType/NationType binary_search + transmute pattern. 3 new tests: round-trip all 19 discriminants, gap rejection (13 gaps), consistency check with from_u8(). 761→764 tests. Clippy clean. No WASM rebuild needed (pure Rust). -- 764 tests |
| 244 | 2026-06-27 | Add ResourceType::VALID_RESOURCE_DISCRIMINANTS (19 sorted discriminants) + 4 new tests: count validation, round-trip through from_u8, gap rejection (13 gaps), name uniqueness/consistency. Add RESOURCE_NAMES_BY_ID mapping (19 entries, u8→string) in engine/config/data.js for JS-side discriminant→name lookup. Foundation for ResourceType.name()→discriminant() migration in get_resource_counts() JSON output. 757→761 tests, clippy clean. No WASM rebuild needed (pure Rust + JS data). -- 761 tests |
| 241 | 2026-06-26 | Add BuildingType::discriminant() + from_discriminant() + VALID_DISCRIMINANTS (77 sorted discriminants) — integer accessor foundation for WASM name-string removal. Refactored test to use shared const. 3 new discriminant tests: full round-trip (77), gap rejection (12 gaps), name consistency. 739→742 tests. Clippy clean. WASM 300.1KB. -- 742 tests |
| 242 | 2026-06-26 | Add NationType::discriminant() + from_discriminant() (5 variants, no gaps). 3 new tests: round-trip, reject invalid (5/255), name consistency. Added name_id field to get_player_nation() JSON for JS migration path. Added BUILDING_NAMES_BY_ID mapping (77 entries, u8→string) in engine/config/data.js — JS-side lookup table for integer discriminant consumption. 742→745 tests, clippy clean, WASM 300.1KB. -- 745 tests |
| 243 | 2026-06-27 | Add butterfly particle effect for Forest/Grass tiles during daytime: spawn_butterfly_particle() with colorful palette (orange/yellow/purple/blue hue variation via seeded randomness), gentle floating motion (slow horizontal wander, slight rise, 3-5s life). Daytime gating (day_phase 0.25-0.75). 5 tests: color dominance, gentle drift, hover height, lifetime, burst bounds/capacity. Wired into game loop: spawns near Forest+Grass tiles every 8 ticks, max 2/tick. 745→750 tests, clippy clean. No WASM rebuild needed (pure Rust). -- 750 tests |
| 240 | 2026-06-26 | Add FNV-1a hash lookup regression tests: BuildingType round-trip (all 77 valid discriminants via explicit const array), all 77 name keys resolve, garbage-input rejection. NationType round-trip (all 5 discriminants), all 9 lookup keys (5 base + 4 aliases). Added engine/core to .gitignore. 734→739 tests. Clippy clean. No WASM rebuild needed (pure Rust test additions). -- 739 tests |
| 239 | 2026-06-26 | Remove dead all_names() functions: BuildingType::all_names() (77 strings) + NationType::all_names() (5 strings). Zero WASM savings — LTO deduplicates with name() strings. Clean build confirms 300.1KB. Rewrote 3 test functions. Fixed 2 clippy warnings (empty_line_after_doc_comments + needless_range_loop). Clippy: 0 errors, 0 warnings. 736→734 tests. -- 734 tests |
| 238 | 2026-06-26 | Convert from_name() to FNV-1a hash discriminant lookup: replaced 78 string-match arms in BuildingType::from_name() and 9 in NationType::from_name() (incl. aliases) with sorted const FNV-1a hash lookup tables and binary_search_by_key. Eliminates match-arm branch explosion. Removed 4 alias strings (Romans/Vikings/Trojans/Dark Tribe) only used in from_name(). WASM 307.3KB (unchanged — name()/all_names() retain strings; full 19.4KB savings requires removing name()/all_names() + JS-side name tables). 736 tests pass, clippy clean. -- 736 tests |
| 237 | 2026-06-26 | Render() code bloat profiling: twiggy dominators confirms render() retains 49.8KB (16.24% of WASM). The bulk is code[267] at 39.7KB — the main render function with ~40 sub-calls to WebGL2 uniform/buffer setters. No single dominant sub-function: top 10 sub-calls range 96–408 bytes each (uniformMatrix4fv, bindRenderbuffer, uniform2f, etc.). The 39.7KB body is the unavoidable draw-call orchestration (FBO binds, shader program switches, viewport sets, draw calls per layer). Extraction into smaller functions would add call overhead without size savings. WASM after cargo clean: 307.3KB (300.1KB in AGENTS.md — environmental variance from wasm-opt/LTO). 736 tests pass, clippy clean. -- 736 tests |
| 236 | 2026-06-26 | Replace serde_json in model.rs with manual JSON parser: wrote lightweight JsonParser struct that walks the fixed JSON schema byte-by-byte. Eliminated serde_json::from_str::<JsonMesh> monomorphization — the key source of the data[87]+[118] duplicate (94.7% identical serde_json flt2dec tables from 2 call sites). Removed serde::Deserialize from Material and JsonMesh structs. WASM 308.0KB → 300.1KB (-7.9KB), hitting the 300KB target. 736 tests pass, clippy clean. -- 736 tests |
| 235 | 2026-06-26 | Investigated data[87]+[118] WASM duplicate root cause: Byte-by-byte comparison confirms 4559 identical bytes (94.7%) — serde_json flt2dec internal tables. data[118] differs at tail: Rust std error strings vs data[87]'s flt2dec extension bytes (460 extra in 118). Multiple serde_json::from_str monomorphizations (JsonMesh in model.rs, Value+Vec<u32> in lib.rs) each pull serde data tables. LTO/codegen-units=1 already set — linker can't fully dedup different monomorphized paths. Fix: replace model.rs serde_json usage with manual parser (JSON format is simple arrays). wasm-opt not available for post-link dedup. 736 tests pass. -- 736 tests |
| 234 | 2026-06-26 | WASM size investigation: data[87]+[118] confirmed 94.7% identical (4559/4815 bytes shared). data[118] = data[87] + standard library error messages + debug paths. from_name→integer discriminant re-evaluated — blocked because name() still needs all strings for JSON serialization (get_game_state). All 56 WASM exports verified as used by JS. WASM 308KB (8KB gap to 300KB). Verified twiggy garbage: 67KB potential false-positive data segments. Clippy: 0 errors, 0 warnings. 736 tests pass. -- 736 tests |
| 233 | 2026-06-26 | Fix: Re-enabled 2 dead test functions missing #[test] (test_fragment_shader_water_depth_animation, test_balance_simulation_deterministic). Removed duplicate #[test] attributes on test_water_normal_uniforms and test_resource_group_categories. Removed dead promote_to_squad_leader() function (never called). Added #[allow(dead_code)] to BalanceResult struct for debug-only fields. Fixed unused variable b2 → _b2. 736 tests pass (net unchanged: 2 enabled + 2 dup removed). Clippy: 0 errors, 0 warnings. -- 736 tests |
| 232 | 2026-06-26 | Added 2 fog_color/sky_color sync validation tests: test_fog_color_matches_sky_ramp_at_horizon validates fog_color equals sky_color() at 7 key day phases (midnight→night fall), day/night contrast >5x, dynamic fog not constant. test_fog_color_shader_uniform_consistency verifies u_fog_color uniform and mix() blending in fragment shader. Updated outdated comment in test_edge_fog_fog_color_matches_clear (fog color is dynamic, not hardcoded). 734→736 tests pass. Clippy: 0 errors, 0 warnings. WASM 304.9KB. -- 736 tests |
| 231 | 2026-06-26 | Added 8 day_light uniform regression tests: compute_day_light() Rust function mirrors GLSL sin+smoothstep formula used in day_light_glsl_u/day_light_glsl_v shader macros. Validates midnight darkness, noon brightness, dawn/dusk midpoint, output range [0,1], day/night contrast (>100x), monotonic dawn→noon and noon→dusk, phase continuity at cycle wrap. Reverted uncommitted BUILDING_DATA consolidation in economy.rs (static array of &str fat pointers would increase WASM per skill warning). 726→734 tests pass. Clippy: 0 errors, 0 warnings. -- 734 tests |
| 218 | 2026-06-25 | Removed 3 dead WASM exports: compute_mvp_json (4.6KB code, 0 JS refs), clear_model_instances (0 JS refs), model_instance_count (0 JS refs). Removed 2 corresponding tests. WASM 326KB→319KB (-7KB). 697 tests pass. Clippy 0 errors/21 warnings. 81 exports remaining (was 84). -- 697 tests |
| 220 | 2026-06-25 | Added 4 particle edge-case tests: bounce velocity reversal (vz inversion after ground impact), alpha at full life (=1.0 above 0.7 threshold), alpha fade at 50% life (~0.71), alpha zero when dead. 697→701 tests pass. Clippy 0 errors/15 warnings. -- 701 tests |
| 222 | 2026-06-25 | Refactored particle spawn functions to use config structs: ParticleConfig (11-field) and BurstConfig (10-field). Removed all 3 #[allow(clippy::too_many_arguments)] workarounds from session 221. Converted 39 .spawn() + 15 .spawn_burst() call sites. Clippy auto-fixed 76 redundant_field_names. Clippy: 0 errors, 0 warnings. 701 tests pass. -- 701 tests |
| 223 | 2026-06-25 | Rebuilt WASM after particle config refactor: 316.1→316.9KB (+0.8KB). Investigated lazy-load model JSON — already done (load_model_json WASM export). Analyzed twiggy data segments: data[5]=19.4KB building/unit names, data[0]=5.8KB game state JSON, data[94]=10.5KB minified shaders. 701 tests pass. Clippy 0 errors/0 warnings. 0 open issues. -- 701 tests |
| 229 | 2026-06-26 | Added 6 regression tests for Phase 7 sky_color() day-phase sky color ramp: night darkness (<0.15), noon blue dominance, dawn warmth (red>blue), dusk warmth (red>blue), output range validation (0-1), day-night contrast (>5x). 714→720 tests pass. Clippy clean. 0 open issues. -- 720 tests |
| 230 | 2026-06-26 | Added 6 camera frustum culling regression tests for LOD system: visible_bounds map boundary clamping, zoom scaling, non-empty range, center shift, LOD vertex count bounded by visible area, map edge mesh validation. 720→726 tests pass. Clippy clean. 0 open issues. -- 726 tests |
| 228 | 2026-06-26 | Added 4 camera perspective projection regression tests: center→NDC origin, aspect ratio X scaling, Y-offset validity, FOV NDC magnitude. 710→714 tests pass. Clippy 0 errors/0 warnings. 0 open issues. Camera math validated for Phase 7 orbital rendering. -- 714 tests |
| 226 | 2026-06-26 | Added regression tests for game_state JSON template keys — asserts all expected field names (kind, x, y, construction, active, production_counter, assigned_settlers, max_settlers, input_buffer, output_buffer, id, hp, max_hp, state, stance, assigned_building, target, version, game_time, map_json, resources, buildings, units) exist in get_game_state output. Prevents silent key removal. 701→710 tests pass. Clippy 0 errors/0 warnings. -- 710 tests |
| 225 | 2026-06-26 | Removed 12 dead WASM exports (0 JS refs, 0 Rust callers): list_nations, get_fps, is_building_available_for_nation, move_units_to_tile, set_unit_stance, list_building_types, get_game_speed, populate_model_instances_from_game, get_building_destruction_progress, damage_building, get_building_hp, get_building_max_hp. Cleaned up orphaned doc comments + blank lines from removal. WASM 316.9KB→311.8KB (-5.1KB). Exports 68→56. 701 tests pass. Clippy 0 errors/0 warnings. -- 701 tests |
| 224 | 2026-06-25 | Audited 4 unknown WASM data segments (#238): data[118]=5.3KB, data[87]=4.8KB (94.7% identical — likely 2 copies of same model JSON structure), data[63]=4.7KB (compressed/encoded binary), data[61]=3.9KB (flt2dec float formatting table). Total 18.7KB. Key finding: data[87]+[118] share 4559/4815 bytes identical → deduplication could save ~4.8KB. 701 tests pass. Clippy 0 errors/0 warnings. -- 701 tests |
| 221 | 2026-06-25 | Fixed all 15 clippy warnings: 12 static_mut_refs in lib.rs (replaced APP.as_mut()/APP.as_ref() with raw pointer deref: (*std::ptr::addr_of_mut!(APP)).as_mut() / (*std::ptr::addr_of!(APP)).as_ref()), 3 too_many_arguments in particle.rs (added #[allow(clippy::too_many_arguments)]). Clippy: 0 errors, 0 warnings. 701 tests pass. -- 701 tests |
| 219 | 2026-06-25 | Removed 13 dead WASM exports: set_azimuth, set_elevation, set_distance (camera -- JS uses orbital pan/zoom), set_paused (JS uses toggle_pause), spawn_construction_effect, spawn_combat_effect, spawn_smoke_effect, spawn_leaf_effect (game loop spawns these automatically), particle_count, clear_particles, set_building_rally_point, clear_building_rally_point, get_building_rally_point. Internal Rust functions preserved (used by game loop + tests). WASM 319KB->316KB (-3KB). 81->68 exports. 697 tests pass. Clippy 0 errors/15 warnings. -- 697 tests |
| 217 | 2026-06-25 | Fix #75: Unbind reflection texture from TEXTURE2 before FBO pass to prevent feedback loop — FBO color attachment (reflection_tex) was still bound to TEXTURE2 sampler from previous frame, causing GL_INVALID_OPERATION (feedback loop + sampler type mismatch). Added gl.active_texture(TEXTURE2) + bind_texture(None) before FBO bind. 699 tests pass. Clippy 0 errors/23 warnings. WASM rebuilt. -- 699 tests |
| 211 | 2026-06-25 | Fix #73: Replace GLSL uniform bool with int for mobile GPU compat — uniform bool causes blank tiles on ANGLE/Mali-G710 (Android/WebKit) due to driver issues evaluating bool conditionals. Changed u_use_vp, u_use_textures, u_reflection_pass from bool to int (0/1) in all 3 shader pairs (vertex/fragment/model). Updated condition checks to `== 1`. Added test_no_uniform_bool_in_shaders regression test. 683 tests pass. Clippy 0 errors. -- 683 tests |
| 210 | 2026-06-25 | Autumn leaf particle effect: spawn_autumn_leaf_particle/burst with warm amber/orange/red-brown colors, gentle eastward wind drift, slow swaying descent (3-6s life). Wired into game loop — spawns near Forest tiles every 12 ticks (max 3/tick). 4 new tests. 682 tests pass. Clippy 0 errors/23 warnings. -- 682 tests |
| 209 | 2026-06-25 | Firefly particle effect: spawn_firefly_effect with warm yellow-green glow, slow drift, 2.5-5.5s life. Wired into game loop — spawns near Forest/Grass tiles every 10 ticks at dusk/night (day_phase < 0.2 or > 0.8, max 2/tick). 2 new tests. 678 tests pass. Clippy 0 errors/23 warnings. -- 678 tests |
| 208 | 2026-06-25 | Fog/mist particle system: spawn_fog_particle/spawn_fog_burst with pale grey-white color, gentle horizontal drift, slight upward rise. Wired into game loop — spawns near Water/Swamp tiles every 8 ticks (max 2/tick). 6 new tests. 676 tests pass. Clippy 0 errors. -- 676 tests |
| 207 | 2026-06-25 | Clippy warning cleanup: fixed 12 warnings (empty_line_after_outer_attr, empty_line_after_doc_comments, matches! macro, needless_range_loop, hex digit grouping). 35→23 warnings. 670 tests pass. -- 670 tests |
| 206 | 2026-06-25 | Dust storm particle system: spawn_dust_storm_particle/spawn_dust_storm_burst with sandy brown color, strong eastward wind drift, suspended fall. Wired into game loop — spawns near Desert tiles every 5 ticks (max 3/tick). 6 new tests. 670 tests pass. Clippy 0 errors. -- 670 tests |
| 205 | 2026-06-25 | Snow particle system: spawn_snow_particle/spawn_snow_burst with slow-fall, wind drift, white color. Wired into game loop — spawns near Snow/Mountain tiles every 6 ticks (max 4/tick). 5 new tests. 664 tests pass. Clippy 0 errors. -- 664 tests |
| 203 | 2026-06-24 | Session audit: 0 open GitHub issues, 659 tests pass, WASM 331KB (31KB over 300KB target), Clippy 0 errors/35 warnings. Analyzed remaining WASM optimization paths: (a) building/unit names 27.9KB → phf/const hash (b) shader source 28.5KB → minify GLSL (c) game state JSON 5.9KB → const encoding (d) ryu float formatting ~10KB. Verified all App struct fields active. FPS/draw-call exports unused by JS but kept for debugging. -- 659 tests |
| Session | Date | Summary |
|---------|------|---------|
| 216 | 2026-06-25 | Fix #74: Restore main VP matrix after reflection FBO pass. Root cause: reflection pass overwrote u_vp with Y-flipped reflection VP, then main terrain draw_elements used flipped matrix. On ANGLE/Vulkan, terrain fell outside clip space (blank, only edge stripes visible). Fix: re-upload compute_vp() + reset u_use_vp=1 after reflection pass. WASM +0.9KB (318KB). 699 tests pass. Clippy 0 errors/23 warnings. -- 699 tests |
| 215 | 2026-06-25 | Pollen/drifting seed particle effect: spawn_pollen_particle/burst with warm white-yellow color, gentle upward float, eastward drift, short 1-2.5s life. Wired into game loop — spawns near Grass tiles every 6 ticks during daytime (day_phase 0.2-0.8, max 4/tick). 7 new tests. 699 tests pass. Clippy 0 errors/23 warnings. -- 699 tests |
| 214 | 2026-06-25 | .rodata investigation (Item 213): Analyzed all data segments in WASM binary. data[5]=19.5KB building/unit names (from_name match), data[95]=10.5KB minified shaders, data[0]=5.9KB JSON format templates. Top savings path: replace string-based from_name with integer discriminant lookup (est. -15KB). JSON templates could save ~2KB via shorter keys. 692 tests pass. Clippy 0 errors. -- 692 tests
| 212 | 2026-06-25 | GLSL minification: strip comments + whitespace from all 12 shader strings. Source -8KB (21818→13661 chars), WASM 330KB→318KB (-12KB). Added test_shaders_have_no_comment_only_lines regression test. Fixed 2 tests that checked for comment strings. Added scripts/minify_shaders.py. 684 tests pass. Clippy 0 errors/23 warnings. -- 684 tests
| 202 | 2026-06-24 | Fix #72: Splash display:none after fade-out — splash retained display:flex post-fade, causing layout tree pollution on mobile (WebKit/Mali-G710). Added setTimeout display:none 850ms after 0.8s CSS opacity transition. 659 tests pass. Clippy 0 errors. -- 659 tests |
| 201 | 2026-06-24 | WASM dead code removal: removed 8 dead exports (ws_connect/receive/send/state, parse_obj_info, editor_grid_enabled, get_territory_border_tiles_json, spawn_particle/burst). Fixed clippy approx_constant (3.14 to PI). 659 tests pass. Clippy 0 errors. WASM 331KB. -- 659 tests |
| 200 | 2026-06-24 | WASM data section audit: parsed 127 data segments (78KB total). Top items: data[5]=27.9KB (building/unit names), data[94]=10.5KB shader src, data[63]=7.8KB shader, data[0]=5.9KB game state JSON. Identified dead export compute_mvp_json (0 JS uses). Updated RENDERING_AUDIT.md: draw-call baseline (7-20 DC/frame at 8 sites), WASM analysis. 659 tests pass. WASM 338KB. -- 659 tests |
|| 199 | 2026-06-24 | RENDERING_AUDIT.md updated: test count 645→659, WASM 338→330KB, depth attachment (Step 34) marked DONE, clippy auto-fixes applied. Clippy: 0 errors, 34 warnings. 659 tests pass. WASM 330KB. -- 659 tests |
|| 198 | 2026-06-24 | Step 34: Add depth attachment to reflection FBO — DEPTH_COMPONENT24 renderbuffer attached, clear DEPTH_BUFFER_BIT in reflection pass. Removed unused AngleInstancedArrays web-sys feature. 659 tests pass. WASM 338KB. -- 659 tests |
| 190 | 2026-06-24 | Step 43: WASM size investigation. Profiled with twiggy — top functions: render(11.4%), .rodata(6.8%), serde_json deser(4.3%), flt2dec(2.9%). Added wee_alloc (-6.5KB), codegen-units=1 (-5.7KB). 377KB → 365KB. Remaining: ~82KB .rodata (model data, shaders), ~17KB render, ~14KB serde. 645 tests pass. -- 645 tests |
|| 192 | 2026-06-24 | Step 46: Soft rain particle ground fade-out — rain droplets cap remaining life at 0.15s on terrain impact instead of bouncing. Added test_rain_ground_fade_out. Updated RENDERING_AUDIT.md: mark Step 33 horizon_y done, bump tests 645→654. 655 tests pass. -- 655 tests |
|| 194 | 2026-06-24 | Step 43 (cont): WASM size — opt-level=z reduces 365KB→338KB (-27KB, 7.4%). Clean build with cargo clean confirmed. 655 tests pass. RENDERING_AUDIT.md updated. 38KB remains to 300KB target. -- 655 tests |
|| 197 | 2026-06-24 | Step 43(d): Remove dead App struct fields — shadow_quad_buffer, cloud_corner_buffer, cloud_instance_count, sun_moon_vp_loc. All stored but never read from struct. WASM 329KB (-9KB from ~338KB). 658 tests pass. -- 658 tests |
|| 196 | 2026-06-24 | Refactor: extract VP matrix computation helpers in model.rs — compute_vp(), compute_reflection_vp(), compute_horizon_y() replace 5 duplicated inline VP blocks in lib.rs (-105/+93 lines). WASM 337.9KB (-0.8KB). 658 tests pass. -- 658 tests |
|| 195 | 2026-06-24 | Fix #71: Screenshot mechanism broken — WebGL2 context created without preserveDrawingBuffer, causing canvas.toBlob() to return blank frames. Added WebGlContextAttributes feature, set preserveDrawingBuffer:true via get_context_with_context_options. WASM +0.2KB (339KB). 655 tests pass. -- 655 tests |
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

### Next Session — Updated Steps (Session 211+)
---
43. WASM size: 318KB → 300KB — remaining 18KB gap. Session 204: hash-based from_name (FNV-1a) attempted, no savings — strings deduplicated with name()/all_names(). Top remaining targets: (a) 28.5KB shader source — minify GLSL in r#"..."# literals (est. 10-14KB savings) (b) 5.9KB game state JSON template — const encoding (c) ryu float formatting ~10KB (d) building model JSON lazy-loaded from assets/ (27.9KB). [MUST — 18KB remains]
44. FPS/draw-call benchmarking: add 1080p/720p FPS display toggle, record baseline in RENDERING_AUDIT.md [SHOULD]
45. Lazy-load building model JSON from assets/ to reduce .rodata [NICE — may be largest single win]
32. Verify reflection optimization visually: ensure water tiles excluded from reflection FBO [visual confirmation pending]
209. ~~Add leaf particle effect for Forest tiles (seasonal/autumn aesthetic)~~ ✅ (session 210)
210. ~~Add firefly particle effect for Grass/Forest tiles at dusk (subtle glow, slow drift)~~ ✅ (session 209)
211. ~~Add leaf particle effect for Forest tiles (seasonal/autumn aesthetic)~~ ✅ (session 210)
212. ~~GLSL minification: strip comments and extra whitespace from shader r#"..."# literals (est. 10-14KB savings)~~ ✅ (session 212 — 8KB source / 12KB WASM)
213. ~~Investigate building model JSON const encoding to reduce .rodata 5.9KB~~ ✅ (session 214 — data[0]=5.9KB JSON templates, data[5]=19.5KB building/unit names; top savings: integer discriminant lookup est. -15KB)
214. ~~Add ember/spark particle effect for Smelter buildings (iron/gold smelter)~~ ✅ (session 213)
215. Verify Fix #73 on mobile: request new render snapshot from Daniel (Android/WebKit/Mali-G710) to confirm tiles now display
216. Verify Fix #75: check browser console for GL_INVALID_OPERATION warnings (reflection FBO feedback loop + sampler mismatch) — should be silent now
217. WASM size: 316KB → 300KB — remaining 16KB gap [MUST]
218. Lazy-load building model JSON from assets/ to reduce .rodata [NICE — ~15KB potential]
219. ~~Audit remaining 81 exports for dead code — found 16 dead, 13 still in codebase~~ ✅ (session 219 — all 13 removed)
220. ~~Remove remaining 13 dead exports~~ ✅ (session 219 — all removed, internal Rust functions preserved)
221. Consider removing all_names() / name() string functions if JS-side can provide names [NICE — 19.5KB potential]
222. ~~Clean up 15 clippy warnings: 12 static_mut_refs (Rust 2024 compat) + 3 too_many_arguments in particle.rs~~ ✅ (session 221)
223. WASM size: 316KB → 300KB — remaining 16KB gap [MUST]
224. Lazy-load building model JSON from assets/ to reduce .rodata (~15KB potential) [NICE]
225. Verify Fix #73 on mobile: request new render snapshot from Daniel to confirm tiles display on ANGLE/Mali-G710 [SHOULD]
226. WASM size: 316KB → 300KB — remaining 16KB gap [MUST — top priority]
227. Lazy-load building model JSON from assets/ to reduce .rodata (~15KB potential) [NICE — largest single win]
228. Consider removing all_names() / name() string functions if JS-side can provide names [NICE — 19.5KB potential]
229. ~~Refactor particle spawn functions to use config struct (remove #[allow] workaround)~~ ✅ (session 222)
235. WASM size: 316.9KB → 300KB — remaining 16.9KB gap [MUST — top priority]
236. Lazy-load building model JSON from assets/ — already done (load_model_json WASM export), no further action needed
237. ~~Convert from_name() match arms to integer discriminant lookup~~ ✅ (S238 — FNV-1a hash lookup done; zero WASM savings because name()/all_names() retain strings)
238. ~~Audit data[118]=5.3KB, data[87]=4.8KB, data[63]=4.7KB, data[61]=3.9KB segments~~ ✅ (S224 — identified: model JSON duplicates, flt2dec table, compressed data)
239. Verify Fix #73 on mobile: request new render snapshot from Daniel to confirm tiles display on ANGLE/Mali-G710 [SHOULD]
240. Investigate data[87]+[118] duplicate: grep Rust source for which model JSON files are compiled into WASM; deduplicate if 2 copies of same model [MUST — saves 4.8KB]
241. Identify data[63]=4.7KB content — possibly serde_json internal buffers or compressed terrain data [SHOULD]
242. WASM size: 316.9KB → 300KB — remaining 16.9KB gap. Model JSON dedup (est. 4.8KB) + from_name integer discriminant (est. 15KB) would hit target [MUST]
260. WASM size: 312.2KB → 300KB — remaining 12.2KB gap [MUST]
263. Render profiling confirms no easy wins: 39.7KB render() body is essential draw-call pipeline code. Focus on data-segment elimination instead. ✅ (S237)
264. ~~Convert from_name() to integer discriminant lookup~~ ✅ (S238 — hash lookup done; removing name()/all_names() still needed for WASM savings)
265. Investigate 7KB WASM size variance (307.3KB after cargo clean vs 300.1KB reported). Run checksum on wasm binaries from both builds to identify the source of growth. [SHOULD]
266. Re-baseline WASM size target: 300KB. At 307.3KB we are 7.3KB over. Need 7.3KB savings from from_name() conversion + any remaining low-hanging fruit. [MUST]

Next session priorities: (1) Audit WorkerKind for remaining name() method and convert to const array. (2) Migrate JS building consumers to use BUILDING_NAMES_BY_ID + BUILDING_ICONS_BY_ID with integer key lookups (no string-based key matching). (3) Migrate JS unit consumers to use UNIT_KIND_NAMES via integer discriminant lookup. (4) Once all JS consumers use integer discriminants, remove RESOURCE_NAMES/BUILDING_NAMES/NATION_NAMES/UNIT_KIND_NAMES const arrays from WASM binary for ~20KB+ savings. (5) Re-baseline WASM size and measure savings from name-string removal.

*All building data must match BASE.md. Never modify BASE.md.*
