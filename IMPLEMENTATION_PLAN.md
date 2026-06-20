# Implementation Plan — S4WN

> **Development Methodology: Behavior-Driven & Test-Driven Development**
> Every feature follows this pattern: **Objective → Test Cases → Implementation**.
> Tests are written BEFORE code. A feature is done when its tests pass — not before.

| **Status:** Phase 6 — Bugfixes + Map Editor (437 tests)
| **Last updated:** 2026-06-20 (Session 125 — Map editor export to JSON)

---

## Development Workflow

### The BDD/TDD Cycle

For EVERY feature, follow this exact sequence:

```
1. OBJECTIVE     — What behavior should the user see? Write a clear, testable goal.
2. TEST CASES    — What tests must pass? Write them FIRST (they WILL fail initially).
3. IMPLEMENT     — Write the minimum code to make tests pass.
4. VERIFY        — cargo test must be green. No exceptions.
7. ~~Add map editor mode (toggle grid overlay, click to paint terrain)~~ Done (Session 123)
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

### Engine Tests (435 passing)
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

|||||| **104** | **2026-06-19** | **Phase 5 Step 8: GPU model shaders (MODEL_VERTEX/FRAGMENT_SHADER with PBR), model VAO/buffer management in App struct, upload_model_to_gpu(), render_models() draw pass, WASM exports (add_model_instance, clear_model_instances, model_instance_count). Bugfix #45 (updateSettingVal window exposure). 10 new tests, 354 total.** |

||| **106** | **2026-06-19** | **Phase 5 Step 8: Connected building placement to 3D model instances. Added populate_model_instances_from_game() WASM export, model_id_for_building() mapping (10 exact matches + construction fallback), auto-population each frame in render(). JS: add_model_instance() call on placement, modelIdForBuilding() helper. WASM cache v=35. 354 tests pass.** |
||| **103** | **2026-06-19** | **Phase 5 Step 7: JSON mesh parser (`parse_json_mesh`), `ModelInstance` struct, `compute_mvp`/`perspective`/`look_at` matrix functions, WASM exports (`load_model_json`, `parse_obj_info`, `compute_mvp_json`), 30 JSON models converted from OBJ. 39 new tests, 344 total.** |
|| **102** | **2026-06-19** | **Bugfix #38: Shader compile error — u_water_time undeclared identifier in fragment shader. Root cause: u_water_time uniform was declared in vertex shader but not in fragment shader, even though line 213 uses it for water depth animation. Added 'uniform float u_water_time;' to fragment shader. Added regression test test_fragment_shader_has_water_time_uniform. 305 tests pass.** |
---

## Next Objectives (TDD Order)

||| **108** | **2026-06-19** | **Phase 5 Step 8.5: Unit model instances. Added model_id_for_unit(), alive_units() iteration, 3 procgen JSON unit models (worker/soldier/archer), 5 new tests. WASM cache v=36. 360 tests pass.** |

|| **112** | **2026-06-20** | **Building construction animation: smooth scale 0.3→1.0 with ease-out curve (1-(1-t)²) based on construction progress. 5 new tests for construction_scale(). WASM cache v=36→v=37. 365 tests pass.** |
|| **113** | **2026-06-20** | **Unit wobble animation: vertex shader-based idle animation for 3D model instances. Added anim_phase field to ModelInstance, u_time uniform + a_anim_phase instanced attribute (location 8) to model vertex shader. Sin-based Y bob + X/Z sway with 3-frequency mix. Deterministic per-unit phase from position hash. 14 new tests (8 model + 6 shader). 379 tests pass.** |
|
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


|| 118 | 2026-06-20 | Sound effects: procedural Web Audio API Sfx module (6 sounds: UIClick, Build, Combat, Death, Error, MenuToggle), hooked into building placement/UI/menu, 16 JS tests, all 424 engine tests green |
|| 119 | 2026-06-20 | Day/night lighting fix: corrected sun_angle (shift by -π/2 so noon=overhead, midnight=nadir), fixed day_light + resource glow in fragment shader, Hermite smoothstep for natural transitions, 11 new tests, 435 engine + 30 server = 465 total |
|| 120 | 2026-06-20 | Combat/death sound hooks: UnitManager.recent_combat_hits counter + drain, WASM exports recent_death_count()/recent_combat_count(), JS render loop polls and triggers Sfx.playDeath()/Sfx.playCombat(), WASM cache v=37→38, 465 tests pass |
||| **121** | **2026-06-20** | **Bugfix #50: added missing `get_game_speed` import from WASM module to fix ReferenceError on page load. Issue closed.** |
||| **122** | **2026-06-20** | **Investigated #49: L3 map format — file is 922KB with "L3\x00\x00" magic, not WRLD. ARA+LZH decrypt failed. Improved error message with specific L3 guidance + link to issue. Commented findings on GitHub.** |
||| **123** | **2026-06-20** | **Map editor mode: Ctrl+Click terrain painting + grid overlay dots. Ctrl+Click paints terrain at tile position via set_tile_terrain() WASM export. Shift+Click cycles terrain type 0-7. Grid overlay dots rendered at tile corners via Rust editor_grid flag. All 436 tests pass.** |
||| **124** | **2026-06-20** | **Map editor terrain palette UI: clickable 8-terrain type selector (Grass, Forest, Mountain, Water, Deep Water, Desert, Swamp, Snow) in floating panel. Edit button in bottom-left HUD toggles editor mode + grid overlay. Selected terrain highlighted with gold border. Shift+Click cycling preserved as secondary input, now updates palette. All 436 tests pass.** |
||| **125** | **2026-06-20** | **Map editor export: added `export_map_json()` WASM export that serializes current map to JSON. Added "Export JSON" button to terrain palette UI with Blob-triggered download. New test_export_map_json() test. 437 tests pass.** |
|| **87** | **2026-06-18** | **Dark Tribe unique buildings: 7 BuildingType variants (DarkTemple=54..DemonGate=60), nation-gated placement, production chains (DarkTemple→Wine, DarkGarden→Grapes, MushroomFarm→Grain, DemonGate→Weapons), building colors, costs, tools, config. Added Grapes+Wine to resources.json. 265 tests pass.** |
|
|| **100** | **2026-06-19** | **Phase 5 Step 5: Terrain splat-map atlas (2048x512, 4 layers), a_splat vertex attribute (location 10), 4-layer splat blending in fragment shader, 8 new tests. 295 total.** |
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
3. ~~Add orientation-change handler to recalculate viewport layout~~ ✅ Done (Session 94)
4. ~~Optimize construction panel category collapse for small screens (accordion)~~ ✅ Done (Session 94)
7. ~~Add map editor mode (toggle grid overlay, click to paint terrain)~~ Done (Session 123)
5. ~~Add swipe gesture navigation for panel toggling~~ ✅ Done (Session 115)
6. Test touch interactions on actual mobile viewport via Chrome DevTools responsive mode

---

## Reference Notes

- **🌐 Best source of Siedler 4 info:** [siedlercommunity.de/siedler4](https://www.siedlercommunity.de/siedler4/) — buildings, units, production chains, game mechanics, maps, guides. Always consult this first when researching authentic S4 behavior.
- **S4Forge.RE:** Authoritative C++ decompilation for building IDs (0-82), settler IDs (0-66), terrain (8 types), resources (8 types), nations (5)
- **S4 file formats:** ARA stream cipher, LZ+Huffman compression, `.map` (WRLD magic), `.sav` (PE stub + chunked container)
- **WASM cache:** Current v=38. Always bump when adding new `#[wasm_bindgen]` exports.
- **`<script type="module">`:** All declarations are module-scoped. Inline `onclick` handlers need `window.X = X` exposure.
- **Test count:** 425 engine + 30 server = 455 total (425 `cargo test --lib`). `cargo test --lib` must pass before every push.

## Next Session — Concrete Steps

### Phase 5: 3D Pipeline — Steps 1-4 Complete

| Step | Description | Session | Status |
|------|-------------|---------|--------|
| 1 | Orbital camera model (azimuth/elevation/distance) | 96 | done |
| 2 | u_vp mat4 uniform + WASM camera exports | 97 | done |
| 3 | Height-displaced terrain mesh + vertex normals | 98 | done |
| 4 | Fragment shader diffuse lighting (n.l) + sun arc | 99 | done |

### Phase 5: Step 6 — Water Shader & Refraction ✅ (Session 101)

Objective: Add animated water surface with refraction/distortion effect.
Status: ✅ Done — 3-component sine-wave vertex displacement, Blinn-Phong specular, Fresnel transparency, depth color ramp.

### Phase 5: Step 7 — 3D Model Loading & Rendering ✅ (Session 103)

Objective: Load and render 3D models for buildings and units.

Objective: Load 3D models into GPU buffers and render them via a dedicated shader pass.

Status: 🚧 In progress — Core infrastructure complete. Next: JS-side integration.

Concrete steps:
1. Define model format — JSON-based mesh format (vertices, normals, UVs, indices)
2. Add model loader in Rust — parse model JSON, upload to GPU buffers
3. Add model instance rendering — per-instance model-view-projection, texture binding
4. Write model loader tests — verify parsing, buffer upload
7. ~~Add map editor mode (toggle grid overlay, click to paint terrain)~~ Done (Session 123)
5. Generate starter models — Castle, Farm, Sawmill, Worker, Soldier, Bowman

### Next Session — Concrete Steps

**Phase 5 Steps 1-9: ✅ Complete**

All Phase 5 steps are now complete:
1. ✅ Orbital camera model
2. ✅ u_vp mat4 uniform + WASM camera exports
3. ✅ Height-displaced terrain mesh + vertex normals
4. ✅ Fragment shader diffuse lighting
7. ~~Add map editor mode (toggle grid overlay, click to paint terrain)~~ Done (Session 123)
5. ✅ Terrain splat-map atlas
6. ✅ Water shader & refraction
7. ✅ 3D model loading (JSON mesh parser, 30 OBJ→JSON conversions, building/unit instances, instanced rendering)
8. ✅ GPU model rendering + all 59 building models
9. ✅ Per-model GPU buffers fix (Session 111) — each model now has its own VAO + index buffer for correct instanced rendering
10. ✅ Building construction animation (Session 112) — smooth scale 0.3→1.0 with ease-out curve
11. ✅ Unit wobble animation (Session 113) — vertex shader sin-based Y bob + X/Z sway

**Phase 6: Polish & Next Features**

1. ~~Add building construction animation~~ ✅ Done (Session 112)
2. ~~Add model animation support (unit wobble)~~ ✅ Done (Session 113)
3. ~~Add particle effects for building placement/combat~~ ✅ Done (Session 114) — green sparkles on build, orange explosions on unit death, 32 new tests
4. ~~Improve mobile UI: add swipe gestures for panel navigation~~ ✅ Done (Session 115) — handlePanelSwipe() with 60px/400ms threshold, swipe hint indicators, CSS slide transitions
7. ~~Add map editor mode (toggle grid overlay, click to paint terrain)~~ Done (Session 123)
5. ~~Add ambient particle effects (foliage, chimney smoke)~~ ✅ Done (Session 115) — spawn_smoke_effect + spawn_leaf_effect with WASM exports, game loop integration
6. ~~Add unit death animation (scale-down + fade before removal)~~ ✅ Done (Session 116) — Dying state, 1.0s timer, death_animation_progress() WASM export, 8 new tests
7. Add sound effects system (Web Audio API)

**Next Session — Concrete Steps:**

1. ✅ Add Web Audio API sound effects module (Done Session 118)
2. ✅ Fix issue #48: Add debug mode with console commands (Done Session 117)
3. ✅ Add day/night lighting transition smoothing (Done Session 119)
4. ✅ Hook death/combat sounds into Rust engine events via WASM (Done Session 120)
5. ✅ Investigated issue #49 (Session 122) — L3 magic analyzed, error messages improved, findings documented on GitHub
6. ✅ Add map editor mode (Ctrl+Click terrain painting + grid overlay) — Done Session 123
7. Optimize particle rendering: use instanced rendering for better performance
8. Implement L3 map format parser — need to identify which community editor produces L3, get format docs
9. Add unit selection box / marquee drag select for military units
10. ✅ Add map editor terrain palette UI — Done Session 124
11. ✅ Add map editor save/export functionality — Done Session 125

---

### Session 111 — Per-Model GPU Buffers Fix ✅

- **Bug:** `upload_model_to_gpu()` overwrote a single set of GPU buffers each time, so only the last uploaded model's geometry was available. All instances rendered with the same mesh.
- **Fix:** Added `GpuModel` struct (VAO + index buffer + index count), stored in `HashMap<String, GpuModel>`. Each `upload_model_to_gpu()` call now creates a new VAO + index buffer. `render_models()` iterates over model groups, binds each model's VAO, and issues separate instanced draw calls.
- **Cleanup:** Removed unused `model_index_count` and `model_mvp_loc` fields.
- All 365 tests pass.

### Session 108 — Unit model instances ✅

- Added model_id_for_unit() mapping: Settler to worker, Swordsman to soldier, Bowman to archer
- Extended populate_model_instances_from_game_state() to iterate alive units
- Generated 3 procgen unit JSON models (worker.json, soldier.json, archer.json)
- 5 new tests, 360 total passing, WASM cache v=36

### Session 107 — Docker consolidation ✅

- Auto-load demo map on page load (splash hides → generate_map → add resources/HQ → render)
- Fixed: tiles weren't rendering because no map was loaded on startup
- Consolidated Docker into single image: one Dockerfile builds both Caddy + Rust WS server
- Multi-stage: `rust:1.96-alpine` builds musl binary → copied to `caddy:2-alpine`
- Single `start.sh` launches s4wn-server in background, then Caddy foreground via dumb-init
- Caddy `reverse_proxy /ws* localhost:8080` (in-container)
- docker-compose.yml simplified to one `s4wn` service (single port 8080)
- Now serves: engine/ (index, lobby, pkg, config, mobile-enhancements), assets/, map-viewer.html
- `redir / /engine/` for convenience
