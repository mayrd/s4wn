# Implementation Plan — S4WN

> **Development Methodology: Behavior-Driven & Test-Driven Development**
> Every feature follows this pattern: **Objective → Test Cases → Implementation**.
> Tests are written BEFORE code. A feature is done when its tests pass — not before.

**Status:** Phase 2.8 — Nations & Balancing (204 tests)
**Last updated:** 2026-06-17 (Session 73 — Authentic S4 Resources)

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
- **205 tests must always pass.** `cargo test --lib` is the gatekeeper.

---

## Active Objectives

### Objective: Nation-Specific Construction Menu

**Goal:** When a player opens the construction panel, buildings unique to their chosen nation appear in a dedicated category.

**Test Cases:**
- [ ] `get_nation_buildings("Roman")` returns `["Temple of Bacchus", "Vineyard", ...]` (6 buildings)
- [ ] `get_nation_buildings("Viking")` returns 6 buildings
- [ ] `get_nation_buildings("Maya")` returns 7 buildings
- [ ] `get_nation_buildings("Trojan")` returns 7 buildings
- [ ] `get_nation_buildings("Dark Tribe")` returns 7 buildings
- [ ] `get_nation_buildings("unknown")` returns `[]` (no crash)
- [ ] `populateConstructionPanel()` does NOT crash when no nation is selected (`get_player_nation()` returns `""`)
- [ ] JS `BUILDING_ICONS` has entries for all unique building names

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
| WorkerAI tool pickup (physical routing via Storehouse) | 6 | ✅ |
| **Nation-specific unique building implementation** | 0 | 🔨 |
| **Territory expansion (Guard Tower, Fortress)** | 0 | ❌ |
| **Fog of war** | 0 | ❌ |
| **Balance simulation (first 10 min per nation)** | 0 | ❌ |

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

### Engine Tests (205 passing)
```
economy::tests              ~80 tests    Production chains, costs, tools, nation modifiers
nation::tests                21 tests    Nation data, unique buildings, specialists
units::tests                 15 tests    Spawn, assign, movement, HP
map::tests                   10 tests    Terrain, resources, generation
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
|| **73** | **2026-06-17** | **Authentic S4 resources: removed Coins+Mint (fabricated), renamed Iron→IronOre, Game→Meat (raw). Added 6 missing S4 resources (Clay, Hemp, Honey, Bricks, Rope, Mead) + 6 planned buildings (ClayPit, Brickworks, HempFarm, Ropemaker, Apiary, MeadMaker). Resources: 18→22. Buildings: 22→27 (21 impl + 6 planned). 204 tests pass.** |

---

## Next Objectives (TDD Order)

### 1. Fog of War
**Objective:** Unexplored tiles render dark. Tiles become visible when a unit/building is within sight radius.
**Test Cases (to write first):**
- [ ] Tile outside sight radius has `visibility = 0.0`
- [ ] Tile inside sight radius has `visibility = 1.0`
- [ ] Fragment shader darkens tiles with `visibility < 1.0`
- [ ] Sight radius expands when Guard Tower is built
- [ ] Performance: 256×256 map fog update < 5ms

### 2. Territory Expansion
**Objective:** Guard Towers and Fortresses extend player territory border when garrisoned.
**Test Cases (to write first):**
- [ ] `Garrisoned GuardTower` → territory radius +3 tiles
- [ ] `Garrisoned Fortress` → territory radius +6 tiles
- [ ] Territory border renders as colored line or tinted ground
- [ ] Buildings can only be placed within own territory
- [ ] Enemy buildings in contested territory are flagged

### 3. Nation-Specific Unique Buildings (Roman)
**Objective:** Romans can build Temple of Bacchus, Vineyard, Wine Press, Colosseum, and Sanctuaries.
**Test Cases (to write first):**
- [ ] `get_nation_buildings("Roman")` returns 6 building names
- [ ] Temple of Bacchus produces Manna (1 unit/30 ticks)
- [ ] Vineyard produces Grapes, Wine Press converts Grapes → Wine
- [ ] Colosseum provides territory + morale bonus
- [ ] Non-Roman nations CANNOT build Roman unique buildings
- [ ] `try_place_building("Temple of Bacchus")` fails for Viking player

### 4. Balance Simulation
**Objective:** Automated test simulates first 10 minutes for each nation, verifies similar resource totals (±15%).
**Test Cases (to write first):**
- [ ] `simulate_nation(Roman, 600 ticks)` produces resources within expected range
- [ ] All 5 nations reach similar total resource value at 600 ticks
- [ ] No nation has strictly better units than another (cost/stat ratio)

### 5. Mobile UI Adaptation
**Objective:** Game is playable on mobile devices (touch-friendly buttons, responsive layout).
**Test Cases (to write first):**
- [ ] Viewport < 768px: menu buttons stack vertically
- [ ] Touch drag works for camera pan
- [ ] Pinch zoom works
- [ ] Construction panel fits mobile screen without scrolling

---

## Reference Notes

- **🌐 Best source of Siedler 4 info:** [siedlercommunity.de/siedler4](https://www.siedlercommunity.de/siedler4/) — buildings, units, production chains, game mechanics, maps, guides. Always consult this first when researching authentic S4 behavior.
- **S4Forge.RE:** Authoritative C++ decompilation for building IDs (0-82), settler IDs (0-66), terrain (8 types), resources (8 types), nations (5)
- **S4 file formats:** ARA stream cipher, LZ+Huffman compression, `.map` (WRLD magic), `.sav` (PE stub + chunked container)
- **WASM cache:** Current v=32. Always bump when adding new `#[wasm_bindgen]` exports.
- **`<script type="module">`:** All declarations are module-scoped. Inline `onclick` handlers need `window.X = X` exposure.
- **Test count:** 205 engine + 5 server = 210 total. `cargo test --lib` must pass before every push.
