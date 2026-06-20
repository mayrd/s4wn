# Siedler 4 Wildering New-Dawn (S4WN)

Welcome to the Siedler 4 Wildering New-Dawn (S4WN) project, initially known as Siedler 4 Web Native. Our mission is to preserve the spirit of the classic *Siedler 4* (The Settlers IV) experience while evolving it for the modern era. By migrating the game engine to a web-based architecture, we ensure accessibility across desktop and mobile browsers, ensuring this timeless classic remains playable for generations to come.

---

## 🤖 AI Agent Operational Protocol
This project is maintained by an AI agent operating on a daily 1-hour sprint cycle. The agent is tasked with the autonomous advancement of the codebase through the following structured workflow:

### 1. Initialization & Synchronization
* Git Sync: Pull the latest changes from the repository.
* Environment Check: Ensure the development environment is synchronized with the latest project state.

### 2. Task Execution
* Issue Resolution: Analyze open GitHub issues, prioritize based on project stability, and implement fixes.
* Feature Development: Consult the IMPLEMENTATION_PLAN.md to build out new features.
* Research & Planning: Investigate technical requirements for upcoming features and update the IMPLEMENTATION_PLAN.md accordingly.

### 3. Quality Assurance & Documentation
* Testing: Develop and maintain comprehensive regression tests to ensure game logic remains intact during refactoring.
* Documentation: Update technical documentation (inline comments and docs/) to reflect architectural changes.

### 4. Continuous Integration & Delivery
* Verification: Run all test suites.
* Cleanup: Review the IMPLEMENTATION_PLAN.md and append new actionable items discovered during the session.
* Commit: Push all changes to the Git repository.
* Deployment: Trigger a build for the Multi-Architecture Docker Image (targeting linux/amd64 and linux/arm64). The image must bundle all necessary dependencies to act as a standalone Webserver for the game.

---

## 📦 Asset Policy — 100% Open-Source

**Original Siedler 4 game assets (graphics, sounds, music, sprites) will NOT be used.** All visual and audio assets must be:
- **Generated or created** by the AI agent or contributors — nothing extracted from the original game
- **Committed directly into this repository** as open-source (MIT license)
- **Designed from scratch** — they do NOT need to replicate the original look-and-feel; creative reinterpretation is encouraged
- **Replaceable** — the engine loads assets from standard web formats (PNG, WebP, OGG, JSON) not from proprietary containers

The only original S4 files the engine MUST support are **maps and campaigns** (`*.map`, `*.sav` savegames):
- These are user-generated content, not copyrighted Ubisoft artwork
- They should be **importable or migrated on-the-fly** when a player drops a map/campaign file
- The `.map`/.`sav` parser reads scenario data (terrain layout, starting resources, objectives, triggers) but references our own generated asset ids — never extracts original sprites or textures

**Raison d'être:** This keeps the project legally clean, fully self-contained, and genuinely open-source — not dependent on extracting proprietary files the user may or may not own.

---

## 🛠 Technical Stack & Requirements
* Core: Web-native engine (targeting WebAssembly/JavaScript).
* Deployment: Dockerized Webserver (serving the game assets and engine).
* Compatibility: Cross-platform support for Desktop and Mobile web browsers.
* Architecture: Optimized for arm64 (Apple Silicon/Raspberry Pi) and x64 environments.

---

## 📋 Project Governance
* Implementation Plan: See IMPLEMENTATION_PLAN.md for the roadmap.
* Issue Tracker: Manage all bugs and feature requests via GitHub Issues.
* Testing: All PRs must pass regression tests before being merged into the main branch.
* **Reference:** [siedlercommunity.de/siedler4](https://www.siedlercommunity.de/siedler4/) — best source for Siedler 4 buildings, units, production chains, and game mechanics.

---

*This project is dedicated to the Settlers community. Our goal is to maintain the legacy of Siedler 4 by embracing modern web standards.*

---

## 🚀 Current Status

**Phase 4 ✅ complete — Phase 5: 3D Pipeline** ✅ — **Phase 6: Particles + Mobile** ✅ — **Phase 6.5: Death Animation** ✅ — **Phase 6.6: Sound Effects** ✅ — **Phase 6.7: Day/Night Lighting Fix** ✅ — **Phase 6.8: Map Editor** ✅ (436 tests)
- ✅ Mobile responsive CSS — @media queries for sub-768px viewports: full-width panels, larger touch targets, flex-wrap controls
- ✅ Touch camera pan — single-finger drag (touchstart/touchmove/touchend)
- ✅ Touch pinch-to-zoom — two-finger proportional pinch with distance ratio scaling
- ✅ Drag guard — accidental building placement suppressed after touch pan/zoom
- ✅ Panel scrolling — construction & stats panels overflow-y:auto with momentum scrolling on mobile
- ✅ Nation-gated building placement — Roman, Viking, Maya, Trojan, and Dark Tribe unique buildings. `Economy::is_building_available()` checks player nation.
- ✅ Dark Tribe unique buildings (7) — DarkTemple, DarkGarden, MushroomFarm, SanctuaryOfMorbus, SanctuaryOfPestilence, DarkFortress, DemonGate
- ✅ Balance simulation — all 5 nations reach 10+ settlers in 10 min, produce 3+ unique resources, no nation exceeds 200% of median output. 4 new tests, deterministic.
- ✅ Tap-to-place pulse feedback — green/red ripple animation at tap point for building placement confirmation on both mouse and touch. 269 tests pass.
- ✅ Long-press tile inspector — touch-and-hold (500ms) opens floating info panel with terrain, elevation, and resource data. Auto-closes after 4s or tap outside.
- ✅ Orientation handler — screen.orientation + matchMedia with debounced resize
- ✅ Construction accordion — categories collapse on mobile, click to toggle
- ✅ Mobile test suite — 14 logic tests covering accordion, orientation, touch, pinch-zoom
- ✅ Swipe gesture navigation — swipe left/right on canvas to toggle construction/stats panels (60px/400ms threshold), swipe hint indicators with auto-hide, CSS slide transitions
- ✅ Particle effects system — Particle struct + ParticleSystem (MAX_PARTICLES=256), CPU-simulated with gravity/bounce/alpha fade, GPU point-sprite rendering via overlay shader, WASM exports (spawn_particle, spawn_build_effect, spawn_combat_effect, spawn_smoke_effect, spawn_leaf_effect, particle_count, clear_particles, get_particles_json), green sparkles on building placement, orange/red explosions on combat death, chimney smoke from buildings, floating leaves near forests, 36 new tests
- ✅ Unit death animation — Dying state with 1.0s timer, tick_dying() countdown, death_animation_progress() for JS scale-down + fade rendering, tick_dying_units() in game loop, dying_progress in get_unit_info JSON. 8 new tests, 423 total.
- ✅ Sound effects — procedural Web Audio API (UIClick, Build, Combat, Death, Error, MenuToggle). Respects sfxOn + masterVolume settings. 16 JS tests.
- ✅ Map editor mode — Ctrl+Click terrain painting, Shift+Click cycle terrain type, grid overlay dots

**Phase 5 — 3D Pipeline** ✅ (365 tests)
- ✅ Orbital camera model — azimuth/elevation/distance spherical coords, eye()/look_at_target()/world_to_clip() (LookAt + Perspective). set_azimuth/set_elevation/set_distance with clamping + smoothing. snap_to_isometric() reset. 10 tests.
- ✅ u_vp (View+Projection) mat4 uniform — dual-path vertex shader (legacy iso + orbital VP). WASM exports: set_azimuth/set_elevation/set_distance. WASM cache v=33.
- ✅ Fragment shader diffuse lighting — n·l ambient+diffuse model, sun arc from day_phase. 3 new tests, 287 total.
- ✅ Height-displaced terrain mesh — 3-float positions (x, elev*0.5, y), vertex normals from central-difference gradient, a_normal attribute at location 9, v_normal varying for future lighting. 5 new tests, 284 total.
- ✅ Terrain splat-map atlas — 2048x512 atlas with 4 procedurally-generated layers (grass, rock, sand, snow at 512x512 each). Splat weights (a_splat, location 10) computed from terrain type + slope. Fragment shader 4-layer blending with UV remapping. 8 new tests, 295 total.
- ✅ Water shader — 3-component sine-wave vertex displacement (u_water_time uniform) for water/DeepWater tiles; DeepWater waves scaled 0.7x. Fragment shader water path: Blinn-Phong specular highlight, Fresnel-based transparency, depth color ramp (turquoise shallow → dark navy deep). 9 new tests, 304 total.
- ✅ JSON mesh parser — `parse_json_mesh()` validates version, parses vertices/normals/UVs/indices/AABB. Auto-generates default normals (+Y) and UVs (0,0) when missing. `ModelInstance` struct with builder pattern (with_scale, with_rotation_y). MVP matrix computation: `compute_mvp()`, `perspective()`, `look_at()`, `mat4_mul()`. WASM exports: `load_model_json`, `parse_obj_info`, `compute_mvp_json`. 30 OBJ→JSON model conversions. 39 new tests, 344 total.
- ✅ GPU model rendering — building + unit placement connected to 3D model instances with instanced draw calls (`draw_elements_instanced`), per-instance model matrix (a_model mat4) and offset (a_offset vec3) attributes, shared VP matrix. All 59 building types have dedicated procedurally-generated JSON models — no fallback to construction.json. Complete buildings at 1.0 scale, incomplete at 0.7 scale. 84 total models in assets/models/json/. WASM cache v=36. 360 tests pass.
- ✅ Per-model GPU buffers fix — each model now has its own VAO + index buffer stored in a `HashMap<String, GpuModel>`. Previously all instances rendered with the last-loaded model's mesh. `render_models()` now iterates over model groups and issues separate instanced draw calls per model type.
---

AI Agent Configuration:
* Work Duration: 10-20 minutes per session.
* Frequency: Hourly.
* Reporting: Ensure README.md and IMPLEMENTATION_PLAN.md remain accurate to the current state of the project.
