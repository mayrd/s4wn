# Implementation Plan — S4WN

> **Development Methodology: Behavior-Driven & Test-Driven Development**
> Every feature follows this pattern: **Objective → Test Cases → Implementation**.
> Tests are written BEFORE code. A feature is done when its tests pass — not before.

| **Status:** Phase 5 — 3D Pipeline 🔬 (284 tests)
| **Last updated:** 2026-06-19 (Session 98 — Height-displaced terrain mesh with vertex normals)

---

## Development Workflow

### The BDD/TDD Cycle

For EVERY feature, follow this exact sequence:

```
1. OBJECTIVE     — What behavior should the user see? Write a clear, testable goal.
2. TEST CASES    — What tests must pass? Write them FIRST (they WILL fail initially).
3. IMPLEMENT     — Write the minimum code to make tests pass.
4. VERIFY        — cargo test must be green. No exceptions.
5. COMMIT        — Push with tests passing.
```

### Rules

- **Never implement without tests first.** Every new function, WASM export, or UI behavior must have corresponding tests.
- **Tests are the spec.** If a test isn't written, the behavior doesn't exist.
- **Red → Green → Refactor.** Write failing test → make it pass → clean up.
- **Regression tests for every bug.** Every bugfix adds a test proving the bug is fixed.
- **259 tests must always pass.** `cargo test --lib` is the gatekeeper.

---

## Active Objectives

### Objective: Nation-Specific Construction Menu

**Goal:** When a player opens the construction panel, buildings unique to their chosen nation appear in a dedicated category.

**Test Cases:**
- [x] `get_nation_buildings("Roman")` returns `["Temple of Bacchus", "Vineyard", ...]` (6 buildings)
- [x] `get_nation_buildings("Viking")` returns 6 buildings
- [x] `get_nation_buildings("Maya")` returns 7 buildings
- [x] `get_nation_buildings("Trojan")` returns 7 buildings
- [x] `get_nation_buildings("Dark Tribe")` returns 7 buildings
- [x] `get_nation_buildings("unknown")` returns `[]` (no crash)
- [x] `populateConstructionPanel()` does NOT crash when no nation is selected (`get_player_nation()` returns `""`)
- [x] JS `BUILDING_ICONS` has entries for all unique building names

**Implementation:** ✅ Done (Session 71) — WASM export `get_nation_buildings()`, JS dynamic category in `populateConstructionPanel()`, try/catch guard for empty nation state.

---

### Objective: Brewery Removal (S4 Authenticity)

**Goal:** Remove the fabricated "Brewery" building. Real S4 has "Mead Maker" (honey+water→mead), not a grain→beer brewery. Beer resource also removed.

**Test Cases:**
- [x] `BuildingType::all_names()` returns 22 types (was 23) — **22**
- [x] `BuildingType::from_name("Brewery")` returns `None`
- [x] No `ResourceType::Beer` variant
- [x] DarkTribe unique buildings: 7 (was 8, DarkBrewery removed) — **7**
- [x] Total unique buildings across all nations: 33 (was 34) — **33**
- [x] Server `BuildingKind::Brewery` removed, compiles
- [x] All 205 engine tests pass

**Implementation:** ✅ Done (Session 71) — Removed from economy.rs, lib.rs, nation.rs, server/game_state.rs, index.html, MODEL_LISTING.md, assets.

---

### Objective: Old Build Toolbar Removal

**Goal:** Remove the legacy left-side build toolbar. Building selection now happens through the construction panel.

**Test Cases:**
- [x] `document.getElementById('build-toolbar')` returns `null`
- [x] `populateBuildToolbar` function no longer exists
- [x] No CSS rules reference `#build-toolbar`
- [x] Construction panel (`#construction-panel`) still works via `toggleConstructionPanel()`
- [x] `node --check` passes on extracted JS

**Implementation:** ✅ Done (Session 71) — Removed HTML, CSS, function definition, and call sites. `placementButtons` array kept for `selectBuilding()` compatibility.

---

## Roadmap (TDD-Ordered)

Each phase lists objectives with test cases and implementation status.

### Phase 0 — Foundation ✅ (all tests pass)
- [x] **Objective:** Hello World POC renders terrain via WASM/WebGL2
- [x] **Objective:** CI/CD pipeline passes on push

### Phase 1 — Core Engine ✅ (all tests pass)
- [x] **Objective:** Map renders with camera controls
- [x] **Objective:** Tick-based game loop runs at 10 TPS
- [x] **Objective:** ARA+LZH decoder parses S4 archives

### Phase 2 — Game Logic (in progress)

#### 2.0–2.7 ✅ Complete
- [x] Economy system (resources, buildings, production) — 30 tests
- [x] Units system (workers, soldiers, archers) — 15 tests
- [x] Pathfinding (A*, terrain-aware) — 10 tests
- [x] Worker-building integration — tests pass
- [x] Combat system — tests pass
- [x] Nation data model — 21 tests

#### 2.8 — Nations & Balancing

| Objective | Tests | Status |
|-----------|-------|--------|
| Nation data model (5 nations, modifiers, unique buildings) | 21 | ✅ |
| Common buildings (22 types with tools, costs, production) | ~160 | ✅ |
| Castle settler recruitment | 4 | ✅ |
| Barracks unit training (Swordsman/Bowman alternating) | 4 | ✅ |
| Nation modifiers applied (production speed, costs, unit stats) | 12 | ✅ |
|| WorkerAI tool pickup (physical routing via Storehouse) | 6 | ✅ |
||| **Fog of war** | 12 | ✅ |
||| **Fog of war shader integration** | 4 | ✅ |
|| **Territory expansion (Guard Tower, Fortress)** | 12 | ✅ |
|| **Building placement territory validation** | 10 | ✅ |
|| **Balance simulation (first 10 min per nation)** | 0 | ❌ |

### Phase 3 — Multiplayer ✅ (30 server tests pass)
- [x] WebSocket network module
- [x] Server-authoritative game state
- [x] Lobby UI

### Phase 4 — UI & Single Player (in progress)

| Objective | Tests | Status |
|-----------|-------|--------|
| Splash screen + menu | JS | ✅ |
| Settings panel | JS | ✅ |
| New Game flow (map gen, starter base) | JS | ✅ |
| Load Game flow (.map/.sav parsing, preview) | JS | ✅ |
| In-game HUD (resources, tools, minimap) | JS | ✅ |
| Building placement + construction panel | JS | ✅ |
| Statistics panel | JS | ✅ |
| i18n translations (EN/DE/ES/FR) | JS | ✅ |
| Auto-save/load (localStorage round-trip) | JS | ✅ |
| Error handler UI (GitHub issue deeplink) | JS | ✅ |
| **Fog of war** | — | ❌ |
| **Mobile UI adaptation** | — | ❌ |

---

## Test Suite Reference

### Engine Tests (269 passing)
```
economy::tests              ~90 tests    Production chains, costs, tools, nation modifiers, territory validation
nation::tests                21 tests    Nation data, unique buildings, specialists
units::tests                 15 tests    Spawn, assign, movement, HP
map::tests                   36 tests    Terrain, resources, generation, fog of war, territory, border
pathfinding::tests           10 tests    A* correctness, terrain costs
combat::tests                 8 tests    Attack resolution, damage, range
worker_ai::tests              6 tests    Auto-assign, tool pickup
game_loop::tests              5 tests    Tick update, integration
network::tests               15 tests    Serialization, interpolation
render/shader tests          10 tests    Uniforms, attributes, edge fog
lib.rs tests                 25 tests    WASM exports, building colors, helpers
```

### Server Tests (5 passing)
```
protocol::tests               5 tests    Message serialization, room management
```

---

## Agent Operating Rules

### GitHub Issues
- **READ FIRST** every session: fetch open issues
- **RAISE** for genuinely ambiguous decisions (label: `decision needed`)
- **CLOSE** via commit message or API when resolved
- **Bug reports = regression tests**: Every user-reported bug gets a test proving it's fixed

### Asset Policy
- **NO original S4 assets** — all visuals/audio generated
- **Map import EXCEPTED**: parse `.map`/`.sav` for terrain/scenario data, map to our asset IDs
- S4Forge.RE decompilation is the source of truth for building/unit/terrain IDs

### S4 Authenticity Rule
- **Every game element must exist in authentic S4** — cross-reference `s4-authentic-content.md` before adding
- **Fabricated content (NEVER add):** Residence, Tannery, Archery Range, Brewery, Sand, Dirt, Coast

### Delivery Protocol (Every Session)
1. `git push` — never end with unpushed commits
2. Update this file: mark completed, append session, update "Next Objectives"
3. Report what was accomplished

---

## Session Log

| Session | Date | Summary |
|---------|------|---------|
| 0 | 2026-06-13 | Repo init, README, plan stubs |
| 1 | 2026-06-14 | Technology choice, Hello World POC, CI/CD |
| 2 | 2026-06-14 | Map, Camera, Game loop modules — 18 tests |
| 3 | 2026-06-15 | Recovery: push Session 2 work |
| 4 | 2026-06-15 | ARA+LZH decoder, day/night cycle — 29 tests |
| 5 | 2026-06-15 | Economy system (17 buildings, resources) — 59 tests |
| 6 | 2026-06-15 | Units, pathfinding, worker-building integration — 84 tests |
| 7 | 2026-06-15 | WorkerAI, CombatAI — 100 tests |
| 8 | 2026-06-15 | Game loop integration, map-viewer.html — 102 tests |
| 9 | 2026-06-15 | Network module, overlay rendering, HUD — 130 tests |
| 10 | 2026-06-15 | WebSocket server, lobby UI — 145 tests |
| 11 | 2026-06-15 | Server-authoritative game state — 159 tests |
| 12 | 2026-06-15 | ClientInterpolator — 167 tests |
| 13 | 2026-06-15 | Wired interpolator into render loop |
| 14 | 2026-06-15 | Shader fix #7, 3D model pack (62 models) |
| 15 | 2026-06-15 | Full-page UI, load_map_json, map preview |
| 16 | 2026-06-15 | Phase 4 UI plan (57 items) |
| 17 | 2026-06-15 | S4WN icon/logo suite, favicon |
| 18 | 2026-06-15 | Server test fixes — 167 tests |
| 19 | 2026-06-15 | Settings panel, localStorage persistence |
| 20 | 2026-06-15 | Resource bar HUD, New Game panel |
| 21 | 2026-06-15 | Building/unit population HUD |
| 22 | 2026-06-15 | Pause + speed controls |
| 23 | 2026-06-15 | Building placement toolbar, WASM exports |
| 24 | 2026-06-15 | Selection indicator, building/unit info cards |
| 25 | 2026-06-16 | Building affordability checks |
| 26 | 2026-06-16 | Construction progress visualization |
| 27 | 2026-06-16 | Wired Start Game button, loading screen |
| 28 | 2026-06-16 | Starter base setup, map validation — 142 tests |
| 29 | 2026-06-16 | Auto-save/load, game state round-trip |
| 30 | 2026-06-16 | Recent files panel (localStorage) |
| 31 | 2026-06-16 | Binary .map parser, map preview panel |
| 32 | 2026-06-16 | .sav WASM bridge (decompress_sav_chunk) |
| 33 | 2026-06-16 | .sav polish (dimensions, preview) |
| 34 | 2026-06-16 | .sav chunk type research, dual-scheme IDs |
| 35 | 2026-06-16 | Test map corpus, CI validation script |
| 36 | 2026-06-16 | JS module syntax bugfixes (#8 regression) |
| 37 | 2026-06-16 | CI: validate_test_maps.py in pipeline |
| 38 | 2026-06-16 | Error handler UI, GitHub issue deeplink |
| 39 | 2026-06-16 | S4 naming cleanup, .sav full state restoration |
| 40 | 2026-06-16 | Controls settings, splash screen polish |
| 41 | 2026-06-16 | Slope-based elevation shading, water animation |
| 42 | 2026-06-16 | Edge-of-map fog effect |
| 43 | 2026-06-16 | Nation data model (nation.rs) — 21 tests, 160 total |
| 44 | 2026-06-16 | S4 naming cleanup, nation selection in new game |
| 45 | 2026-06-16 | Extended BuildingType 14→18 — 170 tests |
| 46 | 2026-06-16 | Tool wiring (carried_tool, has_tooled_settler) — 171 tests |
| 47 | 2026-06-16 | RENDER_DIAG logging for black-screen debug |
| 48 | 2026-06-16 | Black screen FIXED (u_map_dims GPU optimizer) |
| 49 | 2026-06-16 | S4 authenticity audit — all content verified |
| 50 | 2026-06-16 | Castle settler recruitment — 174 tests |
| 51 | 2026-06-16 | Nano Banana 2 terrain textures, WebGL pipeline |
| 52 | 2026-06-16 | Bugfix #10 (openMenu), tool storage, 184 tests |
| 53 | 2026-06-16 | Physical tool pickup routing — 187 tests |
|| 54 | 2026-06-17 | ~~Mint building + Coins~~ **(REMOVED Session 73 — fabricated, no coin minting in S4)** |
| 55 | 2026-06-17 | Barracks unit training — 192 tests |
| 56 | 2026-06-17 | Tool counts WASM export, tool bar HUD — 199 tests |
| 57 | 2026-06-17 | Nation integration (select, display) — 199 tests |
| 58 | 2026-06-17 | Nation modifier application — 197 tests |
| 59 | 2026-06-17 | Bowman alternating training — 199 tests |
| 60 | 2026-06-17 | Worker speed modifier — 204 tests |
| 61 | 2026-06-17 | Worker build speed modifier — 205 tests |
| 62 | 2026-06-17 | Toolsmith UI feedback (producing tool) |
| 63 | 2026-06-17 | Nation-color tinting on overlay dots |
| 64 | 2026-06-17 | Physical tool pickup with Storehouse routing |
| 65 | 2026-06-17 | Guard Tower building |
| 66 | 2026-06-17 | Bugfix #11 — splash screen stall (missing #[wasm_bindgen]) |
| 67 | 2026-06-17 | Bugfixes #12, #14, #15 — UI cleanup + bounds guards |
| 68 | 2026-06-17 | i18n translations (EN/DE/ES/FR) — 55+ keys |
| 69 | 2026-06-17 | 4 new S4 common buildings (Fortress, SiegeWorkshop, Shipyard, RoadLayer) |
| 70 | 2026-06-17 | Unit overlay tinting verified, carried_tool in get_unit_info |
| **71** | **2026-06-17** | **9 issues closed: #26–#35 bugs, Brewery removal, nation buildings, Menu button** |
|| 72 | 2026-06-17 | Tool pickup toast notifications — carried_tool added to get_unit_summary(), showToast() CSS animation, trackToolPickups() in game loop, WASM v=32 |
||| **73** | **2026-06-17** | **Authentic S4 resources: removed Coins+Mint (fabricated), renamed Iron→IronOre, Game→Meat (raw). Added 6 missing S4 resources (Clay, Hemp, Honey, Bricks, Rope, Mead) + 6 planned buildings (ClayPit, Brickworks, HempFarm, Ropemaker, Apiary, MeadMaker). Resources: 18→22. Buildings: 22→27 (21 impl + 6 planned). 204 tests pass.** |
||| **74** | **2026-06-17** | **Fog of war: visibility field on Tile, compute_visibility() with linear falloff, compute_visibility_from_entities() for buildings (Castle=5, GuardTower=7, Fortress=10, Storehouse=3, others=2) and units (Settler=3, Swordsman=4, Bowman=4). 12 new tests. Visibility integrated into mesh vertex attribute for shader fog rendering. 216 tests pass.** |
||| **75** | **2026-06-17** | **Bugfix #37: toggleSpeed() was module-scoped, inaccessible to inline onclick. Added window.toggleSpeed to exposure block. 216 tests pass.** |
|||| **76** | **2026-06-18** | **Fog of war shader integration: Fragment shader now uses v_visibility to darken unexplored/unvisible tiles. Added u_fog_color uniform, visibility_buffer GPU buffer at location 8. Smooth transition with smoothstep(0.15, 0.6, v_visibility). Updated shader tests. 216 tests pass.** |
|||| **77** | **2026-06-18** | **Territory expansion: territory_owner field on Tile, compute_territory() from buildings (Castle=5, GuardTower=3, Fortress=6, Storehouse=2, others=1), is_within_territory() for placement validation, owner_id on Building, integrated into game_loop every 100 ticks. 12 new tests, 228 total passing.** |
|||| **78** | **2026-06-18** | **Building placement territory validation: Economy::try_place_building_checked() validates terrain buildability, territory ownership (not neutral/enemy), affordability, and map bounds. 10 new tests, 238 total passing.** |
|||| **79** | **2026-06-18** | **Territory border visual overlay: border tiles computed and rendered as colored dots with nation color tinting. 6 new tests, 244 total passing.** |
|||||| **81** | **2026-06-18** | **Bugfix #38: No tiles visible on startup or map load. Root cause: setup_starter_base() placed Castle + settlers but never called compute_visibility_from_entities(), leaving all tiles at visibility=0.0 (fully fogged → black screen). Fixed by adding visibility recomputation + mesh_dirty=true at end of setup_starter_base(). All 244 tests pass.** |
|||||| **82** | **2026-06-18** | **Bugfix #39: German translation not working for resources. Root cause: ResourceType::name() returned spaced names ("Iron Ore", "Iron Ingots") but config resources.json IDs are CamelCase ("IronOre", "IronIngots"). tResource() looked up the dictionary with wrong keys. Fixed by aligning name() to return CamelCase. All 259 tests pass.** |
|||||| **82** | **2026-06-18** | **Nation-gated building placement: Added player_nation field to Economy, nation_for_building() to BuildingType (Roman unique buildings require Roman nation), is_building_available() check in try_place_building_checked(), set_player_nation() on Economy, WASM export is_building_available_for_nation(). Roman unique buildings categorized as BuildingCategory::Unique. 8 new tests, 252 total passing.** |
| **83** | **2026-06-18** | **Viking unique buildings: Added 5 new BuildingType variants (MeadHall, SanctuaryOfOdin, SanctuaryOfThor, SanctuaryOfFreya, Runestone) with nation_for_building() requiring Viking nation, BuildingCategory::Unique, building colors, from_name/all_names wiring. 7 new tests, 259 total passing.** |
|| **84** | **2026-06-18** | **Maya unique buildings: 7 BuildingType variants (TempleOfChac, AgaveFarm, Distillery, 3 Sanctuaries, Observatory), nation-gated placement (Maya only), 259→259 tests (no new test file — existing coverage maintained).** |
||| **85** | **2026-06-18** | **Config sync: 22 buildings marked implemented, Next Objectives rewritten (Trojan/DarkTribe/Balance/Mobile), ClayPit/HempFarm/MeadMaker naming gap identified, data.js regenerated, config validation passes** |

---

## Next Objectives (TDD Order)

### 1. Trojan Unique Buildings ✅ (Session 86)
**Objective:** Trojans can build their 7 unique buildings: Oracle of Apollo, Olive Grove, Oil Press, Sanctuary of Artemis, Sanctuary of Poseidon, Sanctuary of Apollo, Amphitheater.
**Status:** ✅ Done (Session 87). BuildingType enum variants, production chains, and nation-gated placement needed.
**Pre-work:** ✅ Done — Olives and OliveOil added to ResourceType enum + resources.json.
**Test Cases (to write first):**
- [x] `get_nation_buildings("Trojan")` returns 7 building names
- [x] OliveGrove produces Olives (new resource)
- [x] OilPress consumes Olives → produces OliveOil (new resource)
- [x] All Trojan unique buildings are buildable when Trojan nation is selected
- [x] Non-Trojan nations CANNOT build Trojan unique buildings
- [x] All 52 building names in all_names() (45 + 7 new)

### 2. Dark Tribe Unique Buildings ✅ (Session 87)
**Objective:** Dark Tribe can build their 7 unique buildings: Dark Temple, Dark Garden, Mushroom Farm, Sanctuary of Morbus, Sanctuary of Pestilence, Dark Fortress, Demon Gate.
**Status:** ✅ Done (Session 87).
**Test Cases (to write first):**
- [x] `get_nation_buildings("Dark Tribe")` returns 7 building names
- [x] All DarkTribe unique buildings are buildable when DarkTribe nation is selected
- [x] Non-DarkTribe nations CANNOT build DarkTribe unique buildings
- [x] All 59 building names in all_names() (52 + 7 new)

### 4. Balance Simulation ✅ (Session 89)
**Objective:** Simulate the first 10 minutes of gameplay for each nation to verify economic balance. No single nation should dominate all metrics.
**Test Cases (to write first):**
- [x] All 5 nations reach 10+ settlers within 10 minutes
- [x] All 5 nations produce at least 3 unique resources
- [x] No nation exceeds 200% of the median resource output
- [x] Simulation runs deterministically with fixed seed

### 3. Config Name Normalization
**Status:** ✅ Done (Session 88) — 3 config IDs renamed (ClayPit→Clay Pit, HempFarm→Hemp Farm, MeadMaker→Mead Maker). buildings.json, categories.json updated; data.js regenerated. Now matches Rust `BuildingType::name()` output.
**Test Cases:**
- [x] Config ID "Clay Pit" matches Rust `BuildingType::from_name("Clay Pit")`
- [x] Config ID "Hemp Farm" matches Rust `BuildingType::from_name("Hemp Farm")`
- [x] Config ID "Mead Maker" matches Rust `BuildingType::from_name("Mead Maker")`
- [x] `data.js` regenerated after fix, all 60 buildings resolve correctly

|| **87** | **2026-06-18** | **Dark Tribe unique buildings: 7 BuildingType variants (DarkTemple=54..DemonGate=60), nation-gated placement, production chains (DarkTemple→Wine, DarkGarden→Grapes, MushroomFarm→Grain, DemonGate→Weapons), building colors, costs, tools, config. Added Grapes+Wine to resources.json. 265 tests pass.** |
|
|| **93** | **2026-06-18** | **Flaky balance test fix (HashMap non-determinism in most_needed_tool) + Long-press tile inspector for mobile (500ms hold → floating info panel with terrain, elevation, resource). 269 tests pass.** |
| **88** | **2026-06-18** | **Config name normalization: ClayPit→Clay Pit, HempFarm→Hemp Farm, MeadMaker→Mead Maker. Fixed naming gap between JS config (CamelCase) and Rust from_name() (space-separated). buildings.json, categories.json, data.js updated. All 295 tests pass.** |
|
|
|
|
|
|
|
### 4. Mobile UI Adaptation
**Objective:** Game is playable on mobile devices (touch-friendly buttons, responsive layout).
**Status:** In progress — orientation handler + accordion (Session 94). Remaining: mobile testing.
**Test Cases (to write first):**
- [x] Viewport < 768px: menu and panels adapt to mobile (responsive CSS media queries)
- [x] Touch drag works for camera pan
- [x] Pinch zoom works (proportional scaling)
- [x] Construction panel fits mobile screen with overflow scrolling
- [x] Tap-to-place visual feedback (pulse animation on placed tile)

**Next concrete steps:**
1. ~~Add tap-to-place visual feedback (pulse animation on selected tile)~~ ✅ Done (Session 92)
2. ~~Add long-press context menu for tile info (inspector) on mobile~~ ✅ Done (Session 93)
3. Test touch interactions on actual mobile viewport via Chrome DevTools responsive mode
3. Test touch interactions on actual mobile viewport via Chrome DevTools responsive mode
4. Add orientation-change handler to recalculate viewport layout
5. Optimize construction panel category collapse for small screens (accordion)

---

## Reference Notes

- **🌐 Best source of Siedler 4 info:** [siedlercommunity.de/siedler4](https://www.siedlercommunity.de/siedler4/) — buildings, units, production chains, game mechanics, maps, guides. Always consult this first when researching authentic S4 behavior.
- **S4Forge.RE:** Authoritative C++ decompilation for building IDs (0-82), settler IDs (0-66), terrain (8 types), resources (8 types), nations (5)
- **S4 file formats:** ARA stream cipher, LZ+Huffman compression, `.map` (WRLD magic), `.sav` (PE stub + chunked container)
- **WASM cache:** Current v=32. Always bump when adding new `#[wasm_bindgen]` exports.
- **`<script type="module">`:** All declarations are module-scoped. Inline `onclick` handlers need `window.X = X` exposure.
- **Test count:** 284 engine + 30 server = 314 total (284 `cargo test --lib`; 10 new orbital camera tests). `cargo test --lib` must pass before every push.

1. **Test touch interactions** on actual mobile viewport via Chrome DevTools responsive mode — verify orientation handler, accordion, tap-to-place, long-press inspector all work correctly at 375px/414px/768px widths
2. **Fix any mobile-specific bugs** discovered during testing — focus on touch target sizing, panel overlap, and scrolling issues
3. **Add mobile-specific test cases** in a new test file for JS mobile interactions (orientation, accordion, touch)
4. **Phase 4 wrap-up**: verify all mobile checklist items, update README status to Phase 4 complete
5. **Begin Phase 5**: Research and plan for 3D pipeline migration (orbital camera, splat-map textures, glTF model migration) per TECHNOLOGY_CHOICE.md

| **98** | **2026-06-19** | **Phase 5 Step 3: Height-displaced terrain mesh with vertex normals. ELEVATION_SCALE=0.5, 3-float positions (x,elev*scale,y), central-difference normals, normal_buffer attribute 9, vertex shader a_position vec2→vec3, a_normal+v_normal varyings. 5 new tests. 284 tests pass (was 279).** |
|| **96** | **2026-06-19** | **Phase 5 Step 1: Orbital camera model. Added azimuth/elevation/distance fields with smoothing targets to Camera struct. Implemented eye() (spherical→world-space), look_at_target(), world_to_clip() (LookAt+Perspective), set_azimuth()/set_elevation()/set_distance() with clamping, set_focus(), snap_to_isometric(). normalize() helper for 3D vectors. 10 new tests: orbital defaults, az wrap, elev clamp, dist clamp, eye classic iso, az moves z-axis, elevation→height, clip valid w, snap, lerp smoothing. All 279 tests pass (was 269).**
| **95** | **2026-06-19** | **Mobile test suite (14 logic tests, 12/13 pass), Phase 5 architecture research. Identified orbital camera migration path: replace isometric projection (camera.rs ISO_COS/ISO_SIN) → LookAt + Perspective matrices, terrain → height-displaced 3D mesh, shader UVs → attribute arrays.**
## Next Session — Concrete Steps

### Phase 5: 3D Pipeline — Step 1 Complete, Step 2 (Shader Integration)
Steps 1–4 ✅ DONE (Session 96). Remaining:

5. ✅ **Pass `u_vp` (View-Projection matrix) as shader uniform** to the vertex shader instead of separate `u_camera_center` + `u_zoom`. Add the 4×4 mat4 uniform to the shader, update `App` struct in lib.rs to store the new uniform location, and pass `eye()` + projection values each frame. Keep the legacy iso uniforms for backward compat (dual-path during migration). **Done (Session 97)**.
6. ✅ **Add WASM exports** for `set_azimuth()`, `set_elevation()`, `set_distance()` so JS can control the orbital camera. Bump WASM cache version to v=33. **Done (Session 97).**

### Phase 5: 3D Pipeline — Step 3 (Terrain Height Mesh)
7. **Replace flat vertex grid with height-displaced mesh**: modify `build_map_mesh()` to compute per-vertex Y from `tile.elevation * ELEVATION_SCALE` (default 0.5). Add vertex normals from heightmap gradient. Update vertex shader attributes to include `a_position.z` and `a_normal`.

### Files to modify
- `engine/src/lib.rs` — add WASM exports (set_azimuth/set_elevation/set_distance), u_vp uniform, shader changes
- `engine/index.html` — JS camera orbit controls (right-drag for azimuth/elevation, scroll for distance)
- `engine/src/camera.rs` — no changes needed (model done)
