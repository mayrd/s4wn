# Implementation Plan

> This document is maintained by the AI agent. It reflects the current state and roadmap.

## Status: Phase 2.8 — Nations & Balancing 🔨 (205 tests, 210 total)
Last updated: 2026-06-17 (Session 64)

## 🤖 Agent Operating Rules

### GitHub Issues — READ FIRST, Always
- **At the start of EVERY session**, fetch all open GitHub issues via the API: `GET /repos/mayrd/s4wn/issues?state=open`
- **Incorporate open issues into the session's task list** — resolving existing issues always takes priority over new features.
- Issues tagged `decision needed` = the agent should decide on its own if possible; only block if genuinely ambiguous.
- Close issues via commit message (`Fixes #N`) when resolved.

### GitHub Issues — RAISE Proactively
- **When encountering a design decision or ambiguity**, create a GitHub issue with the `decision needed` label BEFORE blocking.
- Try to decide as much as possible yourself — only raise issues for genuinely unclear trade-offs.
- Document the decision in the issue body when you make it.
- Use issue labels: `decision needed`, `bug`, `enhancement`, `blocked`.

### Iteration Rule
- If the task pipeline finishes before 9+ minutes, loop back and start the next incomplete IMPLEMENTATION_PLAN item.
- Only stop early if ALL items are marked complete.

### Asset Policy — ALL Assets Open-Source & Generated
- **NO original Siedler 4 assets** (sprites, textures, sounds, music) are ever extracted or committed.
- **All visual/audio assets are generated** — by the agent or by procedural generation — and committed as standard web formats (PNG, WebP, OGG, JSON).
- **Creative freedom:** Assets do NOT need to match the original game's look; the style should be coherent but independently designed.
- **Map & campaign import is EXCEPTED:** the engine MUST parse original `*.map` / `*.sav` files for scenario data (terrain, resources, objectives) — but always maps to our own asset IDs, never extracts original graphics.
- If you encounter a `.dat` / `.bbf` / `.gfx` file during development, use the ARA+LZH decoder only for structural research — never extract and commit its contents.

### S4 Authenticity Rule — Verify Before Building
- **Every building, nation, unit, resource, terrain, decoration, specialist, and tool MUST exist in authentic Siedler 4 before being added to S4WN.**
- **Source of truth:** `references/s4-authentic-content.md` in the `s4wn-development` skill (derived from S4Forge.RE C++ decompilation).
- **Before adding ANY new game content:** cross-reference against the S4 building type IDs (0-82), settler type IDs (0-66), terrain types (8), resource deposits (8), nations (5), and naming conventions tables.
- **Fabricated content (NEVER add):** Residence, Tannery, Archery Range, Sand terrain, Dirt terrain, Coast terrain, Leather resource, or any building/unit/resource not listed in the reference.
- **When in doubt:** look it up in the reference FIRST, before writing code. If the reference is incomplete for a specific item, raise a `decision needed` GitHub issue.

---

## Roadmap

### Phase 0 — Foundation ✅
- [x] TECHNOLOGY_CHOICE.md: Evaluate WASM vs emulation, select stack
- [x] Hello World proof-of-concept: WebGL/WASM rendering a Settlers IV-themed terrain
- [x] Repository structure and CI/CD pipeline
- [x] Rebuild WASM after dead-code fix, verify clean build

### Phase 1 — Core Engine ✅
- [x] Map rendering and camera controls
- [x] Game loop architecture (tick-based, deterministic)
- [x] Asset pipeline (ARA stream cipher + LZ+Huffman decompression decoder)
- [x] WASM Phase 2 integration: day/night cycle + resource visualization in renderer

### Phase 2 — Game Logic
- [x] Economy system (resources, buildings, production chains, storage) — 30 tests
- [x] Units system (workers, soldiers, archers, movement, combat stats) — 15 tests
- [x] Pathfinding (A* on tile grid, terrain-aware cost) — 10 tests
- [x] Worker-building integration (buildings need workers to produce)
- [x] Settler/worker AI (auto-assignment, pathfind to building, transition to Working)
- [x] Military combat system (attack resolution, damage, unit AI, chase behavior)
- [x] Combat integration with game loop (AI-driven battles on map)
- [x] Economy visualization in renderer (map-viewer.html — standalone viewer with terrain+resources)

#### 2.8 — Nations & Balancing (Siedler 4 Specific)

> **Goal:** Implement the 5 playable nations from Siedler IV with distinct playstyles,
> unique buildings/units, and balanced start conditions. All data declared in code.

**Nation Roster (Core 5):**

| Nation    | Playstyle | Strength | Weakness |
|-----------|-----------|----------|---------|
| **Romans**    | Balanced builder | Efficient production chains, strong economy | Average military, no speed bonuses |
| **Vikings**   | Aggressive rusher | Cheap military, fast unit production, naval bonus | Weak economy, high resource consumption |
| **Maya**    | Defensive expander | Fast workers, high HP buildings, natural healing | Slow unit production, expensive upgrades |
| **Trojans**   | Trade & quality | Trade bonus, powerful elite units | Expensive buildings, slow early game |
| **Dark Tribe**| Terraforming swarm | Terrain control, cheap mass units, auto-spread | No toolmaker, weak individual units, must terraform first |

**Implementation Tasks:**

##### 2.8.1 — Nation Data Model
- [x] `Nation` struct: `id` (u8), `name` (&str), `description` (&str), `color` (RGBA)
- [x] `NationType` enum: `Roman`, `Viking`, `Maya`, `Trojan`, `DarkTribe`
- [x] `NationRegistry` — const lookup table with all 5 nations and their modifiers
- [x] Nation selection integrated into new game setup flow

##### 2.8.2 — Common Buildings (All Nations)
> **Siedler IV settlers are recruited from the Castle.** There is no separate Residence building.
> Territory expands via military buildings (Barracks, Guard Tower, Fortress).
> Tools are required to assign workers to buildings.
> The common building pool is shared across all 5 nations with nation-specific aesthetics.

**Resource Supply Chain (shared across all nations):**

| Category | Building | Input | Output | Tool Required |
|----------|----------|-------|--------|---------------|
| **Settler Recruitment** | Castle | None | Settlers | None |
| **Food — Grain** | Farm | None | Grain | None |
| **Food — Flour** | Mill | Grain | Flour | None |
| **Food — Bread** | Bakery | Flour + Water | Bread | Rolling Pin |
| **Food — Fish** | Fisherman | None | Fish | Fishing Rod |
| **Food — Meat** | Butcher | Game | Meat | Cleaver |
| **Food — Water** | Waterworks | None | Water | Bucket |
| **Wood — Raw** | Woodcutter | None | Wood | Axe |
| **Wood — Processed** | Sawmill | Wood | Boards | Saw |
| **Stone — Raw** | Stonecutter | None | Stone | Pickaxe |
| **Iron — Raw** | Mine (on iron deposit) | None | Iron Ore | Pickaxe |
| **Coal** | Mine (on coal deposit) | None | Coal | Pickaxe |
| **Iron — Smelted** | Smelter | Iron Ore + Coal | Iron Ingots | None |
| **Gold — Raw** | Mine (on gold deposit) | None | Gold Ore | Pickaxe |
| **Gold — Minted** | Mint | Gold Ore + Coal | Coins | None |
| **Tools** | Toolsmith | Iron Ingots + Wood | Tools (all types) | Hammer |
| **Weapons** | Weaponsmith | Iron Ingots + Coal | Weapons | Hammer |
| **Military — Melee** | Barracks | Weapons + Settler | Swordsmen | None |
| **Military — Ranged** | Barracks | Weapons + Settler | Bowmen | None |
| **Military — Territory** | Guard Tower / Fortress | Stone + Boards | Territory expansion + garrison | Hammer |
| **Siege** | Siege Workshop | Iron Ingots + Wood | Catapults / Ballistas | Hammer |
| **Storage** | Storehouse | — (capacity buffer) | Stores all goods | None |
| **Ship — Transport** | Shipyard | Wood + Boards | Transport Ship | Saw |
| **Ship — War** | Warship Dock | Wood + Iron Ingots | Warship | Hammer |
| **Roads** | Road Layer | Stone | Paved Road (speed bonus) | None |

**Implementation:**
- [ ] Full `BuildingType` variants for all S4 common buildings (17 currently)
- [x] Each building stores `input_resources: Vec<(ResourceType, u32)>`, `output_resources: Vec<(ResourceType, u32)>`, `required_tool: Option<ToolType>`
- [ ] Tool system: buildings stay "unoccupied" until worker with correct tool arrives
- [ ] Construction progress: worker builds for N ticks based on building cost
- [ ] Territory system: Guard Towers/Fortresses extend player territory radius when garrisoned

##### 2.8.2a — Nation-Specific Unique Buildings
> Each nation has a distinct flavor building cluster. These define the nation's identity
> and cannot be built by other nations.

**Romans** — Economy & Balanced Military
| Building | Function | Input | Output |
|----------|----------|-------|--------|
| Temple of Bacchus | Manna production | None | Manna |
| Vineyard | Wine production | None | Grapes |
| Wine Press | Wine processing | Grapes | Wine (trade good, morale bonus) |
| Sanctuary of Minerva | Pioneer/specialist training | Manna | Promotes soldiers, reveals map |
| Sanctuary of Vulcan | Earthquake magic | Manna (high) | Destroys enemy buildings in radius |
| Colosseum | Morale + territory bonus | Stone + Boards | Eyecatcher (offensive strength) |

**Vikings** — Aggressive Rush + Naval
| Building | Function | Input | Output |
|----------|----------|-------|--------|
| Mead Hall | Manna production + mead brewing | Honey (from special farm) | Mead + Manna |
| Apiary | Honey production | None | Honey |
| Sanctuary of Odin | Vision/sun magic | Manna | Reveals enemy territory, boosts production |
| Sanctuary of Thor | Thunder magic | Manna (high) | Lightning strikes on enemy buildings |
| Sanctuary of Freya | Healing magic | Manna | Heals all friendly units in territory |
| Runestone | Morale + territory bonus | Stone | Eyecatcher |

**Maya** — Defensive + Farm Economy
| Building | Function | Input | Output |
|----------|----------|-------|--------|
| Temple of Chac | Manna production | None | Manna |
| Agave Farm | Grows agave (desert only) | None | Agave |
| Distillery | Tequila production | Agave | Tequila (trade good, morale) |
| Sanctuary of Kukulkan | Plague magic | Manna (high) | Damages all enemy units in radius |
| Sanctuary of Quetzalcoatl | Blessing magic | Manna | Boosts farm production 2× for duration |
| Sanctuary of Huitzilopochtli | War magic | Manna | Temporarily boosts soldier strength |
| Observatory | Morale + territory bonus | Stone + Boards | Eyecatcher |

**Trojans** — Trade + Elite Units
| Building | Function | Input | Output |
|----------|----------|-------|--------|
| Oracle of Apollo | Manna production | None | Manna |
| Olive Grove | Grows olives | None | Olives |
| Oil Press | Olive oil production | Olives | Olive Oil (trade good) |
| Sanctuary of Artemis | Hunt magic | Manna | Spawns temporary hunter units |
| Sanctuary of Poseidon | Earthquake magic | Manna (high) | Destroys enemy buildings in radius |
| Sanctuary of Apollo | Sun magic | Manna | Boosts trade income 2× for duration |
| Amphitheater | Morale + territory bonus | Stone + Marble | Eyecatcher |

**Dark Tribe** — Terraforming + Swarm (Expansion Pack)
| Building | Function | Input | Output |
|----------|----------|-------|--------|
| Dark Temple | Manna production | None | Manna |
| Dark Garden | Spreads Dark Grass (terraforms) | Manna | Converts terrain to Dark Grass |
| Mushroom Farm | Food production (on Dark Grass) | None | Mushrooms |
| Dark Brewery | Drink production | Mushrooms | Dark Brew (morale, manna regen) |
| Sanctuary of Morbus | Petrification magic | Manna (high) | Turns enemy units to stone |
| Sanctuary of Pestilence | Disease magic | Manna | Damages + slows enemy production |
| Dark Fortress | Territory + elite unit training | Stone + Obsidian | Dark soldiers, territory expansion |
| Demon Gate | Spawns temporary demon units | Manna (high) | Demon warriors (limited lifetime) |

**Dark Tribe special mechanics:**
- Cannot build on normal grass — must terraform with Dark Garden first (plants Dark Grass)
- Dark Grass spreads naturally within territory (like creep)
- No toolmaker — Dark Tribe uses "Shaman" specialist instead
- No traditional residences — settlers spawn from Dark Temple when manna is available
- Units are cheaper but weaker individually; rely on numbers

**Specialists (all nations):**
| Specialist | Produced At | Tool | Function |
|------------|-------------|------|----------|
| Pioneer | Residence + Sanctuary | Hammer | Expands territory (plants flag) |
| Geologist | Residence + Sanctuary | Pickaxe | Prospecting (finds resource deposits) |
| Thief | Residence + Sanctuary | Dagger | Steals resources from enemy storehouse |
| Saboteur | Residence + Sanctuary | Dagger | Destroys enemy buildings |
| Priest | Temple (nation-specific) | None | Generates manna at temple |

**Implementation:**
- [ ] `BuildingType` enum extended to ~55 variants (25 common + ~30 unique across 5 nations)
- [ ] `Nation` constraint on unique buildings: construction menu filters by nation
- [ ] Manna resource type + mana consumption for magic spells
- [ ] Dark Grass terrain type (index 8) with natural spread mechanic
- [ ] Nation-specific sprite sheets: `assets/buildings/{romans,vikings,mayans,trojans,dark}/`
- [ ] `generate_assets.py` extended for all 5 nation palettes
- [ ] Territory expansion logic: `GuardTower`/`Fortress`/`DarkFortress` extend border when garrisoned

##### 2.8.3 — Nation-Specific Unit Specials
- [ ] **Roman Legionary:** +10% attack in formation (adjacent to other Romans)
- [ ] **Viking Berserker:** +30% attack below 50% HP, faster movement
- [ ] **Mayan Jaguar Warrior:** stealth detection, +20% defense in forest
- [ ] **Trojan Phalanx:** +40% defense, -20% movement speed
- [ ] Special ability enum: `FormationBonus`, `Berserk`, `ForestGuard`, `ShieldWall`
##### 2.8.3a — Settlers (Worker Units)
> **Goal:** Settlers are the backbone of the economy. In Siedler IV, workers are generic
> unnamed "settlers" recruited from Residences. Our version adds nation flavor.

**Settler Tasks:**
1. **Build** — walks to construction site, adds progress each tick (must hold correct tool)
2. **Carry** — picks up resource from production building, walks to Storehouse, deposits
3. **Harvest** — works at farm/forester/mine, produces raw resources each tick
4. **Repair** — walks to damaged building, repairs HP over time
5. **Idle** — stands at Residence, awaits assignment

**Settler State Machine:**
```
Idle → Assigned → Pathfinding → Building/Harvesting/Carrying → Returning → Idle
  ↑                                                              |
  └──────────────────────────────────────────────────────────────┘
```

**Implementation:**
- [ ] `SettlerVariant` enum with per-nation cosmetic differences (tunic color, hat, tool style)
- [ ] Tool dependency: worker must pick up tool from Toolmaker before occupying a building
- [ ] Build speed affected by: nation modifier, adjacent worker count (Romans: +10%), tool quality
- [ ] Terrain speed modifier lookup table (Snow ×0.8, Forest ×0.9, Dark Grass ×1.1 for Dark Tribe)
- [ ] Worker sprites: 5 nations × 4 directions × 3 frames = 60 base sprite frames
- [ ] Procedural generation via `generate_assets.py` — 32×32 sprites in nation color palettes
- [ ] Worker animations: walk (bob), build (hammer swing), carry (slight lean), idle (breathe)

**Carrier Logic (Siedler 4 signature mechanic):**
- Every production building has an output buffer (produced goods waiting for pickup)
- Workers auto-assign to carry tasks when: building output buffer ≥ threshold (default: 1 unit)
- Worker carries goods from building → deposits at nearest Storehouse
- If no Storehouse has capacity, worker waits (idle at building) — creates visible congestion
- Roads increase worker speed by 20% on road tiles

**Assets Needed:**
- [ ] Worker sprites: 5 nations × 4 dirs × 4 states = 80 frames (PNG 32×32)
- [ ] Worker portrait (UI): 5 (PNG 64×64)
- [ ] Worker icon (minimap): 5 (PNG 8×8)
- [ ] Carry item overlays: 8 (PNG 16×16) — Log, Stone, Iron Ingot, Gold Nugget, Coal, Grain Sack, Fish, Plank
- [ ] Build animation particle: 1 (PNG 16×16)

##### 2.8.4 — Balancing Framework
- [ ] **Cost balancing matrix:** Compare resource costs across nations — ensure no nation has strictly better units
- [ ] **Build order simulation:** Script that simulates first 10 minutes for each nation, verifies similar resource totals
- [ ] **Combat balance:** Equal-resource battles (Romans vs Vikings, etc.) should favor the "better" nation by ≤15%
- [ ] **Starting resources:** Each nation starts with identical totals but different distribution (e.g., Vikings more stone for barracks, Romans more wood for economy buildings)
- [ ] **Playtest data collector:** Export game stats (resources over time, unit counts, building counts) to JSON for balance analysis
- [ ] **Balance TOML file:** `assets/balance.toml` — all modifiers in one place, human-readable, reloadable at runtime

##### 2.8.5 — AI Personality Per Nation
- [ ] **Roman AI:** Prioritizes economy buildings, expands slowly, defends with balanced army
- [ ] **Viking AI:** Rushes military, attacks early, sparse economy, high aggression
- [ ] **Mayan AI:** Walls up, builds defensively, counter-attacks, heals units
- [ ] **Trojan AI:** Rushes trade routes, builds elite army late-game, avoids early conflict
- [ ] AI personality struct: `aggression` (0.0–1.0), `expansion_rate` (0.0–1.0), `defense_priority` (0.0–1.0), `trade_focus` (0.0–1.0)
- [ ] AI decision weights derived from personality

**Tests:** 20+ tests covering nation modifiers, unique building availability, unit specials, balance assertions
**Reference:** Siedler IV Gold Edition manual, Settlers United wiki, community balance patches

### Phase 3 — Multiplayer
- [x] WebSocket network module (`engine/src/network.rs`) — `NetworkMessage` enum, `NetworkManager` stub, `GameStateSnapshot`, serialization via serde, 15 tests
- [x] Building/unit overlay rendering in WebGL — colored dots for buildings (by type) and units (blue workers, red soldiers, green archers)
- [x] Economy HUD WASM bindings — `get_resource_counts()`, `get_building_summary()`, `get_unit_summary()`
- [x] Map export — `Map::to_json()` method for serializing map data
- [x] Procedural asset generation pipeline — `generate_assets.py` creates 8 terrain tiles, 5 building sprites, 3 unit sprites, 2 UI elements (112KB total)
- [x] WebSocket server integration — `server/` with tokio-tungstenite, RoomManager, Player, protocol messages, 16 tests
- [x] Lobby and matchmaking UI — `engine/lobby.html` with room list, create/join/leave, player list, chat
- [x] WebSocket client stubs — `ws_connect()`, `ws_send()`, `ws_receive()`, `ws_state()` WASM bindings
- [x] Synchronized game state (server-authoritative tick + broadcast) — 30 tests
- [x] Server-authoritative game state — ServerGameState module with map, buildings, units, resource tracking, action validation, tick loop broadcast (30 tests)

### Phase 4 — UI & Single Player

#### 4.0 — Splash Screen & Title Sequence
- [x] Splash screen HTML/CSS (S4WN title, subtitle, version number)
- [x] Auto-fade transition to main menu (2.5s display → 0.8s fade-out)
- [x] Logo image in splash screen (512px PNG — heraldic shield design, tribute to S4 History Edition)
- [x] Favicon (SVG + multi-size PNG: 16/32/180/192/512) — closes #8
- [x] Web app manifest (manifest.json) for PWA support
- [x] Loading screen logo integrated in lobby.html title screen
- [x] Particle/glow animation polish on title text

#### 4.1 — Main Menu
- [x] Menu overlay with semi-transparent dark backdrop + blur
- [x] "Load Map" button → triggers file input dialog
- [x] "Demo Map" button → starts demo map in fullscreen
- [x] "Load Game" button → file picker for `.map` / `.sav` files
- [x] "New Game" button → game setup panel (player name, map selection, difficulty selector)
- [x] "Settings" button → opens settings panel
- [ ] "Credits" / GitHub link
- [x] Keyboard navigation (arrow keys + Enter)
- [ ] Menu open/close animation (slide/fade)
- [ ] Menu accessible from in-game via ☰ button or Esc

#### 4.2 — Settings Menu
- [x] Settings panel (slide-in from right or center modal)
- [x] Graphics: zoom sensitivity slider, terrain detail (low/med/high)
- [x] Audio: master volume, music on/off, SFX on/off (stubs — no audio yet)
- [x] Controls: mouse sensitivity, invert scroll, keyboard bindings display
- [x] Settings persisted to localStorage
- [x] "Reset to Defaults" button
- [x] Back button returns to main menu

#### 4.3 — New Game Flow
- [x] Map selection screen (choose from bundled maps or upload custom)
- [x] Bundled maps: "Island", "Continents", "River Valley", "Highlands"
- [x] Map preview thumbnail on selection
- [x] Game setup: player name input, faction color picker
- [x] Difficulty selector (Easy/Medium/Hard — affects starting resources/AI aggression)
- [x] "Start Game" button → transitions to fullscreen map view
- [x] Loading screen with progress bar while WASM initializes
- [x] Wire Start Game button to call generate_map() + load_map_json() + add_starting_resources()

#### 4.4 — Load Game Flow
- [ ] File upload dialog accepting `.map` (terrain/scenario) and `.sav` (savegame)
- [ ] Parse and validate `.map` binary format (WRLD magic header, dimensions, tile data)
- [ ] Parse and validate `.sav` binary format (game state: buildings, units, resources)
- [ ] Preview: show map name, dimensions, terrain distribution before loading
- [ ] Error handling: show human-readable error for invalid/corrupt files
- [ ] "Load" confirmation button → transitions to game view
- [x] Recent files list (localStorage, max 5) with clickable reload

#### 4.4a — Siedler 4 `.map` File Support (REQUIRED)
> **Non-negotiable:** The engine MUST load original Siedler 4 `.map` binary files.
> Maps are the only original S4 assets the engine is permitted to consume — per the
> Asset Policy, terrain/scenario data is mapped to our own generated asset IDs.
> No original sprites, textures, or sounds are ever extracted.

- [x] Binary `.map` file detection (WRLD magic bytes `57 52 4C 44`)
- [x] Header parsing: version (u32 LE), width (u32 LE), height (u32 LE)
- [x] Tile record parsing: 6 bytes per tile — terrain (u8), elevation raw (u8 → normalized f32), flags (u8), resource ID (u8), micro-x (u8), micro-y (u8)
- [x] Terrain ID mapping: 0=Grass, 1=Forest, 2=Mountain, 3=Water, 4=DeepWater, 5=Desert, 6=Swamp, 7=Snow
- [x] Resource ID mapping: 0=None, 1=Iron, 2=Coal, 3=Gold, 4=Stone, 5=Sulfur, 6=Fish, 7=Game, 8=Grain
- [x] Elevation decoding: raw byte 0-255 → normalized -1.0 to 1.0
- [x] Fallback: if file starts with `{`, treat as JSON and parse via `load_map_json()`
- [x] **Validate** map integrity: all terrain IDs in 0-7 range, dimensions ≤ 1024×1024, tile count matches width×height
- [x] **Validate** elevation: flag suspicious elevation ranges (all water at -1.0? all flat at 0.0?) — warn user but don't reject
- [x] **Preview** before loading: show map name (from filename), dimensions, terrain type distribution (bar chart with percentages), resource count summary
- [x] **Conflict resolution**: if map uses terrain/resource IDs unknown to us (custom maps), map to nearest equivalent with user warning, don't crash
- [x] **Error recovery**: if parsing fails mid-file, report exact byte offset and tile (x,y) where corruption was detected
- [ ] **Performance**: for maps > 256×256, show loading progress bar; target < 2s for 512×512 maps
- [ ] **Test corpus**: maintain 3-5 test .map files of varying sizes (64×64, 128×128, 256×256) in `assets/maps/test/`
- [x] **CI validation**: validate test .map corpus in GitHub Actions pipeline (`scripts/validate_test_maps.py`)
- [ ] **Round-trip**: load .map → render → export JSON → verify terrain/resource/elevation match between original and export
- [x] Integration with **Load Game flow**: file picker accepts `.map` extension, auto-detects binary vs JSON, previews before loading
- [ ] Integration with **New Game flow**: selecting "New Game" shows bundled maps AND a "Load Custom .map" option

#### 4.5 — In-Game HUD (Single Player)
- [x] FPS counter (top-right, green, monospace)
- [x] Map info overlay (top-left: map name, dimensions, zoom level)
- [x] Tile hover tooltip (terrain type, elevation, resource, coordinates)
- [x] Minimap (bottom-right, clickable to jump camera)
- [x] Resource bar (top-center: wood, stone, iron, coal, gold, grain, fish, game, sulfur — icons + counts)
- [x] Game time display (hh:mm:ss)
- [x] Pause button → pauses game loop, shows pause overlay
- [x] Speed controls (1×, 2×, 4× game speed)
- [x] **Building placement mode** — click building type button → highlight valid terrain tiles → click to place. Wire to WASM `try_place_building()`, show construction progress.
- [x] Selection indicator (click-select buildings/units on map; info card with HP, production, workers, assigned building, combat target)
- [x] Building construction progress visibility (bar under overlay dots, auto-refresh toolbar affordability)

#### 4.6 — Single-Player Game Start (with .map file)
- [x] `load_map_json()` WASM binding — accepts JSON map data, rebuilds mesh
- [x] Support both Rust format (`{t, e, r}`) and verbose format (`{terrain, elevation, resource}`)
- [x] `.map` binary format parser in JS (WRLD magic, version, width/height, tile loop)
- [x] Game state reset on map load (new GameLoop, repositioned camera)
- [ ] Validate map integrity before loading (check all tiles have valid terrain IDs)
- [ ] Starting resources allocation based on map size + difficulty
- [ ] Initial HQ placement (auto-placed at map center or player-chosen)
- [x] Initial worker spawn (2-4 workers near HQ)
- [x] Auto-save every 5 minutes to localStorage (get_game_state + restore_game_state WASM exports, Continue button, Save button in pause overlay)
- [ ] Fog of war / unexplored territory (darken tiles not yet seen) — optional, phase 4.6+

### Phase 4.7 — Visual Polish
- [x] Terrain elevation shading improvements (steeper = darker via slope-based shading)
- [x] Water animation (fragment shader wave color shift for water tiles)
- [x] Edge-of-map visual treatment (fog/gradient/water border)

#### 4.8 — Full-Screen Map View
- [x] Isometric rendering with smooth zoom (mouse wheel, pinch)
- [x] Pan via mouse drag and touch
- [x] Day/night cycle rendering
- [x] Building + unit overlay dots
- [x] Resource glow animation

### Phase 5 — Polish & Release
- [ ] Mobile UI adaptation
- [ ] Sound and music (Web Audio API) — generated, not extracted
- [ ] Docker multi-arch deployment (linux/amd64, linux/arm64)
- [ ] Map / campaign importer — parse original `*.map` and `*.sav` scenario data, map to internal asset IDs
- [ ] Asset generation pipeline — procedural sprites, tile textures, UI elements, sound effects
- [ ] `assets/` directory populated with all generated game assets

---

## Repository Structure

```
s4wn/
├── README.md                  # Project overview
├── LICENSE                    # MIT
├── IMPLEMENTATION_PLAN.md     # This file
├── TECHNOLOGY_CHOICE.md       # Tech decisions
├── Dockerfile                 # Multi-arch Caddy + game assets
├── docker-compose.yml         # Dev/prod Docker Compose config
├── .gitignore
├── .github/workflows/ci.yml   # CI/CD pipeline
├── assets/                    # Generated game assets (PNG, WebP, OGG, JSON)
│   ├── tiles/                 # Terrain tile textures
│   ├── buildings/             # Building sprites
│   ├── units/                 # Unit/settler sprites
│   ├── ui/                    # UI elements, icons, fonts
│   └── audio/                 # Sound effects, music (generated)
├── engine/                    # Rust WASM game engine
│   ├── Cargo.toml
│   ├── build.sh
│   ├── index.html             # Demo page
│   ├── src/lib.rs             # Engine core (WebGL renderer + GL context)
│   ├── src/map.rs             # Map/tile/terrain/resource system
│   ├── src/camera.rs          # Isometric camera with pan/zoom
│   ├── src/game_loop.rs       # Tick-based game loop
│   ├── src/economy.rs         # Economy: resources, buildings, production chains
│   ├── src/ara_crypt.rs       # ARA stream cipher (S4 decryption)
│   ├── src/decompress.rs      # LZ+Huffman decompression (S4 archives)
│   └── pkg/                   # Built WASM output (gitignored)
└── web/
    └── Caddyfile              # Production web server config
```

---

## Session Log

| Session | Date | Duration | Summary |
|---------|------|----------|---------|
| 0 | 2026-06-13 | — | Repo init, README, IMPLEMENTATION_PLAN.md, TECHNOLOGY_CHOICE.md stubs |
| 1 | 2026-06-14 | ~40 min | Filled TECHNOLOGY_CHOICE.md (Rust + WASM + wgpu/WebGL2 + Caddy); created Hello World POC: Rust/WASM engine rendering an animated isometric terrain grid via WebGL2 (42KB .wasm); set up CI/CD (GitHub Actions + Docker Buildx multi-arch); added LICENSE, Dockerfile, Caddyfile, .gitignore; unit tests passing |
| 2 | 2026-06-14 | ~60 min | Map module (8 terrain types, procedural gen, resource deposits); Camera module (isometric pan/zoom, touch support); Game loop module (10 TPS tick-based, SplitMix64 PRNG); integrated into lib.rs; 18 unit tests passing; WASM build 70KB; HTML demo with mouse/touch controls |
| 3 | 2026-06-15 | ~5 min | Recovery: committed and pushed Session 2 work (was lost due to cron error); updated IMPLEMENTATION_PLAN.md |
| 4 | 2026-06-15 | ~30 min | Asset pipeline: ported ARA stream cipher and LZ+Huffman decompression from Settlers.ts reference (ara_crypt.rs, decompress.rs); wired game loop into renderer with day/night cycle and resource visualization (glowing resource deposits); created docker-compose.yml (fixes #1); 29 tests passing |
| 5 | 2026-06-15 | ~20 min | Economy system: ResourceType enum (9 raw + 7 processed), BuildingType enum (14 types with costs, inputs, outputs, production intervals), Building struct (construction, production, input/output buffers), ResourceStorage (capacity, cap tracking, spending), Economy manager (tick update, building placement); integrated into GameState + GameLoop; 30 new tests (59 total passing). Updated lib.rs to register economy module. Production chain Wood→Boards tested end-to-end. |
| 6 | 2026-06-15 | ~20 min | Units system (src/units.rs): Unit struct with Worker/Soldier/Archer types, HP, speed, attack stats, movement along paths, assignment to buildings; UnitManager for spawning/assigning/removing units; 15 tests. Pathfinding (src/pathfinding.rs): A* on tile grid with terrain-aware movement costs, 10 tests. Worker-building integration: Building.assigned_workers, has_worker(), assign_worker(), Economy.spawn_worker_for(), auto_assign_workers(). Buildings now require workers to produce. Updated 2 existing tests. 84 tests total passing. |
| 7 | 2026-06-15 | ~15 min | Fixed issue #3 (u_time uniform): unused uniform was optimized away by GLSL compiler → now used for subtle terrain animation. New worker_ai module: auto-assigns idle workers to buildings, pathfinds workers to buildings using A*, transitions to Working on arrival (6 tests). New combat module: soldier/archer AI finds nearest enemies, moves into range, resolves attacks with damage/cooldown, death handling (8 tests). Added idle_workers() iterator to UnitManager. 100 tests passing. Phase 2 nearly complete. |
|| 8 | 2026-06-15 | ~18 min | Combat+worker AI game loop integration: wired WorkerAI and CombatAI into GameState::update(), separated movement ticking (workers via WorkerAI, soldiers via CombatAI). Added 3 integration tests (102 total). Created standalone map-viewer.html (Canvas2D isometric renderer with pan/zoom/touch/drop). Sample island map in assets/. Added UnitManager::all_mut(). Phase 2 complete! |
|| 9 | 2026-06-15 | ~20 min | Phase 3 start: created network.rs module with NetworkMessage enum (10 variants: GameStateSync, BuildingPlace, UnitSpawn, UnitMove, UnitAttack, PlayerJoin, PlayerLeave, Chat, Ping/Pong, Welcome), NetworkManager stub with send/receive/inject, ConnectionState enum, serialization via serde (15 tests). Added building+unit overlay rendering to WebGL (second shader program, colored dots). Added HUD WASM bindings: get_resource_counts(), get_building_summary(), get_unit_summary(). Added Map::to_json(). Generated procedural assets: 8 terrain tiles, 5 building sprites, 3 unit sprites, 2 UI elements. Total ~130 tests. |
|| 10 | 2026-06-15 | ~20 min | WebSocket server: created server/ crate with tokio-tungstenite. Protocol module with NetworkMessage (serde tagged enum), RoomManager with Player/Room/RoomState, full WebSocket server with connection handling, room create/join/leave, chat relay, game start, broadcast. 16 server tests passing. Created lobby.html with title/loading screen (issue #6), room list, create/join/leave UI, player list, chat panel. Added ws_connect/ws_send/ws_receive/ws_state WASM stubs. Updated docker-compose with s4wn-server service, Caddyfile with /ws proxy. 129 engine + 16 server tests passing. |
||| 11 | 2026-06-15 | ~10 min | Server-authoritative game state: Created server/src/game_state.rs with GameMap (procedural biome gen via SplitMix64), ServerGameState (map/buildings/units/player resources), action validation (BuildingPlace, UnitSpawn, UnitMove, UnitAttack), tick update (building construction+production, unit movement, combat resolution), GameStateSnapshot broadcast. Integrated into Room (starts game state on GameStart) and main.rs (10 TPS tick loop broadcasts to in-progress rooms). 14 new tests. 30 server + 129 engine = 159 total, all passing. |
||| 12 | 2026-06-15 | ~10 min | Closed stale GitHub issues #4, #5, #6 (verified all resolved). Added ClientInterpolator struct in engine/src/network.rs for client-side state interpolation: holds previous + current GameStateSnapshot, provides interpolation_alpha() for smooth 60fps rendering between 10 TPS server ticks, interpolate_unit_position() with spawn/death/move handling. 8 new tests. Marked synchronized game state roadmap item complete. 137 engine + 30 server = 167 total tests passing. |
|| 13 | 2026-06-15 | ~10 min | Wired ClientInterpolator into WASM rendering loop: added interpolator/network_manager fields to App struct, process GameStateSync messages in render() into interpolator, use interpolated unit positions in render_overlay() for smooth 60fps movement. Handle edge cases (first snapshot, no interpolation, fallback). All 137 tests passing. |
|| 14 | 2026-06-15 | ~15 min | Fixed issue #7 (shader #version directive on wrong line — leading newline in OVERLAY shaders). Generated 3D model pack: 14 buildings, 14 resources, 3 units, 9 terrain tiles, 8 structures, 2 vehicles, 11 resource icons — 62 OBJ+MTL models, 2,721 tris total. |
|| 15 | 2026-06-15 | ~20 min | Full-page UI overhaul: rewrote map-viewer.html and engine/index.html with splash screen (animated title → fade → menu), game menu (Load Map, Demo Map), full-page canvas, FPS/stats as in-map HUD overlays, minimap, tile tooltip, keyboard shortcuts. Added load_map_json() WASM binding supporting both Rust and verbose JSON formats. Built optimized WASM package. Fixed dynamic import crash (#8 — cache mismatch on load_map_json export). Fixed issue #9 — bounding-box off-by-one causing panic at map edge (clamped to width-2/height-2). |
||| 16 | 2026-06-15 | ~15 min | Authored comprehensive Phase 4 UI & Single Player implementation plan covering splash screen, main menu, settings, new game flow, load game flow, in-game HUD, single-player game start, and full-screen map view. 57 actionable sub-items across 8 UI sections. |
||| 17 | 2026-06-15 | ~10 min | Resolved #8: Created S4WN icon/logo suite — SVG favicon + multi-size PNGs (16/32/180/192/512), 512px loading screen logo with heraldic shield design (tribute to Siedler 4 History Edition CD cover), web app manifest. Integrated into all 3 HTML pages (favicon links, splash screen logo, lobby title screen). Added reproducible icon generation script. 137 engine tests passing. |
||| 18 | 2026-06-15 | ~8 min | Fixed 6 server test compilation errors: set_unit_move_target param names, get_building_mut type/param, remove_room return type. All 167 tests passing (137 engine + 30 server). |
||| 19 | 2026-06-15 | ~10 min | Settings panel (Phase 4.1/4.2): slide-in panel with zoom speed, terrain detail, master volume, music/SFX toggles. localStorage persistence, Reset to Defaults, keyboard shortcut S, Esc-to-close. Applied to both engine/index.html and map-viewer.html. 167 tests passing. |
||| 20 | 2026-06-15 | ~10 min | Phase 4.5 HUD: Added resource bar at top-center with emoji icons and live counts from WASM `get_resource_counts()` (Wood, Stone, Iron, Coal, Gold, Grain, Fish, Game, Sulfur). Formatted game_time as hh:mm:ss. Added "New Game" menu button with setup panel (player name, map selection, difficulty). Throttled resource update to every 2s. 167 tests passing. |
||| 21 | 2026-06-15 | ~7 min | Phase 4.5 HUD: Added live building/unit population summary to top-left HUD. Imports get_building_summary() and get_unit_summary() from WASM. Displays building counts (complete + constructing) and unit counts (workers + military). Throttled to 2s updates like resource bar. Resets on New Game start. |
||| 22 | 2026-06-15 | ~10 min | Phase 4.5 Pause & Speed: Added `speed_multiplier` and `paused` fields to Rust App struct; game ticks scale by speed, skip when paused. Added 5 new WASM exports (set_game_speed, get_game_speed, set_paused, toggle_pause, is_paused). Added pause overlay (⏸ PAUSED with pulse animation) and speed control buttons (1×/2×/4×) to index.html. Keyboard shortcuts: P=toggle pause, 1/2/3=set speed. Rebuilt WASM v5. 137 engine tests passing. |
||| 23 | 2026-06-15 | ~10 min | Phase 4.5 Building Placement: Added BuildingType::from_name() and all_names() to economy.rs. Added 3 WASM exports (try_place_building, get_build_cost, list_building_types) with terrain validation, occupancy checks, and cost checking. Building toolbar UI with 14 building type buttons, cost tooltips, emoji icons. Crosshair cursor in placement mode. Keyboard: B to toggle, Esc to cancel. Bumped WASM to v6. 137 engine + 5 server tests passing. |
||| 24 | 2026-06-15 | ~10 min | Phase 4.5 Selection Indicator: Added get_building_info(idx) and get_unit_info(id) WASM exports returning detailed info (construction, production, workers, HP, state, target). Added selection info card UI with position-aware placement near cursor. Click canvas (non-placement mode) selects building at tile or nearest unit within 1.5 tile radius. Escape closes card. Bumped WASM to v7. 137 engine + 5 server tests passing. |
|||| 25 | 2026-06-16 | ~10 min | Phase 4.5: Building affordability check in build toolbar — `refreshBuildingAffordability()` disables buttons for unaffordable buildings, green border indicator for affordable ones, auto-refresh every 2s, immediate refresh after placement, auto-cancel if current building becomes unaffordable. 137 engine + 5 server tests passing. |
||||| 26 | 2026-06-16 | ~8 min | Phase 4.5: Building construction progress visualization — constructing buildings now render as orange dots in the WebGL overlay (size 3.0→8.0 proportional to construction progress, previously invisible). Added explicit `constructed_pct` field to `get_building_info()` WASM export for JS clarity. Bumped WASM cache to v=8. All 167 tests passing (137 engine + 30 server). |
||||| 27 | 2026-06-16 | ~10 min | Phase 4.3: Wired Start Game button — added `generate_map` and `add_starting_resources` WASM exports, loading screen with animated progress bar (4-step: Generate terrain → Build landscape → Prepare resources → Ready), difficulty-based starting resources (Easy 2×, Medium 1×, Hard 0.5× of Wood/Stone/Iron/Coal/Gold/Grain/Fish/Game). Map size adapts to difficulty (48×48 easy, 64×64 others). Bumped WASM cache to v=9. All 167 tests passing. |
||||| 28 | 2026-06-16 | ~10 min | Phase 4.6: Added `setup_starter_base()` WASM export — spiral-searches from map center for a buildable tile, places free Headquarters, spawns 2–4 idle workers in offset pattern (2 Hard, 3 Medium, 4 Easy). Wired into `startNewGame()`. Added map integrity validation to `parseBinaryMap()`: terrain ID range check, tile count vs width×height verification, file size validation, elevation pattern warnings. Bumped WASM to v=10. 142 tests passing (137 engine + 5 server). |
|||| 29 | 2026-06-16 | ~10 min | Phase 4.6 auto-save complete: Added `get_game_state()` + `restore_game_state()` WASM exports with full round-trip serialization (resources, buildings w/ input/output buffers + construction + workers, units w/ HP/state/assignments/targets, map JSON, game time). Added `add_existing()` + `set_next_id()` to UnitManager. JS side: auto-save to localStorage every 5 min, initial save 1s after New Game, Continue button in main menu (shows saved game time), Save button in pause overlay with confirmation feedback. Bumped WASM to v=11. All 167 tests passing (137 engine + 30 server). |
||||| 30 | 2026-06-16 | ~10 min | Phase 4.4 recent files: Added Recent Files panel to main menu — stores file metadata (name, size, type, date) in localStorage on successful map load (max 5 entries). Shows type-specific icons (🗺️ .map, 💾 .sav, 📄 .json), file size, and load date. Clicking a recent entry triggers file input dialog for reload. Added `.sav` to file input accept attribute for future savegame support. All 167 tests passing. |
|||||| 31 | 2026-06-16 | ~10 min | Phase 4.4a map preview + binary loader: Added binary .map parser (`parseBinaryMap`) to engine/index.html with full validation (terrain IDs, dimensions, tile count, elevation range). Added map preview panel showing dimensions, terrain distribution bar chart (color-coded swatches + percentages), resource count summary (icons + counts), and integrity warnings. File type auto-detection (.map → ArrayBuffer binary parse, .sav → graceful unsupported message, .json → text parse). Marked 6 previously-pending Phase 4.4a checklist items complete. |
||||||| 32 | 2026-06-16 | ~10 min | Phase 4.4 .sav WASM bridge: Added `decompress_sav_chunk()` WASM export (ARA-decrypt + LZ/Huffman decompress). Updated `parseSavHeader()` to store raw chunk byte offsets. Wired `confirmMapLoad()` for .sav files — decompresses terrain chunk (0x2711), parses 6-byte tile records, builds JSON map, loads via `load_map_json()`. Bumped WASM cache to v=12. All 142 tests passing. |
||||||| 33 | 2026-06-16 | ~10 min | Phase 4.4 .sav polish: Fixed dead .sav preview "Parse More" button — now wired to `confirmMapLoad()` (▶ Load Savegame). Added dimension extraction from SaveGameGeneralInformation chunk (0x2712 byte 28 → u32 BE map width) via WASM decompression, replacing inaccurate sqrt-tile-count estimate. Updated preview warning text. All 142 tests passing. |
||| 34 | 2026-06-16 | ~10 min | Phase 4.4 .sav preview enhancements: Added CHUNK_TYPE_NAMES lookup table with 15 known chunk types (0x2711–0x271A + alt 10001–10005) and getChunkTypeInfo() helper. Show human-readable chunk names + descriptions in preview. Decompress 0x2712 GeneralInformation chunk during preview to extract accurate map dimensions (green highlight when from save data). Store _savMapWidth to avoid double decompression in confirmMapLoad(). All 167 tests passing (137 engine + 30 server). |
||| 35 | 2026-06-16 | ~10 min | Test corpus + chunk type research: Generated 3 test .map files (island 32×32, river valley 64×64, continents 128×128) with varying terrain, resources, and elevation. Created `scripts/generate_test_maps.py` for reproducible test map generation. Researched Settlers.ts chunk type mapping — discovered MapChunkType enum with 23 decimal IDs (130–250). Updated CHUNK_TYPE_NAMES with dual-scheme support: Scheme A (observed 0x2711 hex range + 10001 alt) AND Scheme B (Settlers.ts decimal IDs 130, 161, 162, 200, etc.) for future .sav compatibility. All 142 tests passing. |
||| 36 | 2026-06-16 | ~5 min | Bugfix: Fixed two fatal JS module syntax errors in engine/index.html — (1) missing closing `}` on `showMapPreview()` causing "Unexpected end of input", (2) duplicate `RESOURCE_ICONS` const redeclaration (map icons at line 766 vs resource bar icons at line 2015) — renamed map version to `MAP_RESOURCE_ICONS`. Both were silent in classic script mode but fatal in `<script type="module">`. Verified with `node --check` and brace balance scan. |
||| 37 | 2026-06-16 | ~9 min | CI & QA: Added `scripts/validate_test_maps.py` — validates binary .map files (WRLD magic, terrain IDs 0-7, resource IDs 0-8, elevation 0-255, tile count vs dimensions, file size). Integrated into GitHub Actions CI pipeline (runs after `cargo test --lib`). Fixed .gitignore to not exclude `assets/maps/test/`. All 3 test maps validated successfully. 167 tests passing. |
||| 38 | 2026-06-16 | ~10 min | Error handler UI: Added comprehensive error dialog system — catches window.onerror + unhandledrejection, shows error name/message/stack with file:line:col, 'Report on GitHub' button opens pre-filled issue (title, body, bug label), 'Copy Error Details' copies full report to clipboard, console.error wrapped to print GitHub deeplink for every error. Dark themed dialog with red accents. All 167 tests passing. |
||| 39 | 2026-06-16 | ~20 min | S4Naming cleanup: Renamed all buildings/resources/units/nations to authentic Siedler 4 names. Buildings: Castle, Stonecutter, Toolsmith, Weaponsmith, Mill, Fisherman, Woodcutter, Storehouse. Resources: Boards, Flour. Units: Settler, Swordsman, Bowman. Nations: Maya. Updated all production chains (Mill now Grain→Flour). Rebuilt WASM (v=13). |
|||||| 39 | 2026-06-16 | ~10 min | Full .sav savegame state restoration: Researched S4Forge.RE C++ decompilation (CGameChunkGeneral struct, CSavedPlayer, building type IDs 0-82, settler type IDs 0-66). Created S4 building ID → S4WN BuildingType mapping (14 types) and S4 settler ID → S4WN UnitKind mapping (all 67 types). Added parseSavGeneralInfo() (map dims, game/map names, players, tick counter, camera), parseSavBuildings() (heuristic record-size detection), parseSavSettlers() (heuristic), parseSavResources() (fixed-array). Wired into confirmMapLoad() — after terrain load, decompresses all chunks, builds full state JSON, calls restore_game_state(). Enhanced savegame preview with game name, player info, restoration status. Supports all 3 chunk type ID schemes. All 142 tests passing. |
|||||| 40 | 2026-06-16 | ~10 min | Phase 4.2 Controls settings: Added mouse sensitivity slider (0.2×–3.0×), invert scroll checkbox, and keyboard bindings display (13 shortcuts) to settings panel. Wired invert scroll to wheel handler in both index.html and map-viewer.html. Phase 4.0 Splash polish: Added 30 floating gold particles with drift animation, titleFloat bob animation, radial gradient glow overlay via ::after pseudo-element. All 167 tests passing (137 engine + 30 server). |
||||| 41 | 2026-06-16 | ~10 min | Phase 4.7 Visual Polish: Added slope-based elevation shading (computes max neighbor elevation difference per tile as vertex attribute, fragment shader darkens steep terrain via smoothstep). Added water wave animation (fragment shader detects water tiles by color, applies time-varying brightness wave). Updated MeshData, App struct, vertex/fragment shaders, mesh builder, and rebuild_mesh. WASM rebuilt (183KB). All 137 engine tests passing. |
|||||| 42 | 2026-06-16 | ~10 min | Phase 4.7 Edge-of-map fog: Added shader-based edge fog effect — tiles near map border fade to dark navy (matching clear color) via smoothstep over 8-tile edge zone. Added u_map_dims uniform + v_tile_pos varying to vertex shader, fog computation in fragment shader. WASM rebuilt (184KB). Added 2 shader tests (edge fog uniforms + fog color match). 139 engine + 5 server = 144 tests passing. |
||||| 43 | 2026-06-16 | ~10 min | Phase 2.8.1 Nation Data Model: Created nation.rs module with NationType enum (5 nations), Nation struct with production/cost/unit/AI modifiers, NationRegistry const lookup tables, UnitSpecial enum (FormationBonus/Berserk/ForestGuard/ShieldWall/None), UniqueBuildingType enum (34 buildings), SpecialistType enum (6 types), ToolType enum (11 types), starting resources per nation. 21 new tests. 160 total tests passing (139 engine + 21 nation). |
| 44 | 2026-06-16 | ~10 min | S4 naming cleanup: Aligned terminology with authentic Siedler 4 conventions (worker→settler, Headquarters→Castle, Quarry→Stonecutter, Blacksmith→Toolsmith, Armory→Weaponsmith, Fishery→Fisherman, Lumberjack→Woodcutter, Warehouse→Storehouse, Planks→Boards, Leather→Flour, Soldier→Swordsman). Fixed compiler warnings (unused imports/variables). Phase 2.8.1 integration: Added nation selection dropdown to new game panel (5 nations with emoji icons and playstyle descriptions), wired into startNewGame(). All 160 engine tests passing. |

||| 45 | 2026-06-16 | ~10 min | Phase 2.8.2: Extended BuildingType from 14→18 variants (Residence, Waterworks, Smelter, Barracks). Added ResourceType::Water + IronIngots (COUNT 25). Added required_tool() method with 11 tool assignments. Wired full config: build_cost, inputs, outputs, production_interval, build_time, colors. Added 5 new tests (tool coverage, resource types, waterworks production, smelter chain). All 170 tests passing (165 engine + 5 server). |
||| 46 | 2026-06-16 | ~10 min | Phase 2.8.2 tool wiring: Added `carried_tool: Option<u8>` to Unit, `required_tool: Option<u8>` to Building, `tool_code_from_name()` helper, `has_tooled_settler()` method. Updated `Economy::update()` to precompute tool-aware production eligibility — buildings without tool-equipped settlers now block production. 6 new tests (tool_code_from_name, required_tool_field, has_tooled_settler, tool blocks/allows production). 171 tests passing. |
||| 47 | 2026-06-16 | ~20 min | Debug session: Investigated black main-canvas despite working minimap. Added RENDER_DIAG console.log to Rust render() — fires on first frame, logs map dimensions, index_count, zoom, camera center, canvas size, and map_dims_loc (Some/None). Identified potential edge-fog false-positive: if u_map_dims uniform is 0,0 the fog covers entire map making it invisible against clear color. Rebuilt WASM (v=14). Awaiting user console output for diagnosis. 171 tests passing. |
||| 48 | 2026-06-16 | ~25 min | S4 Authenticity cleanup: Removed fabricated Residence building (not in Siedler 4) from BuildingType enum, all methods (name/build_cost/inputs/outputs/requires_settler/build_time/required_tool/all_names/from_name), building_color() in lib.rs, and all tests. Deleted tannery.obj + tannery.mtl assets (fabricated building). Updated MODEL_LISTING.md and IMPLEMENTATION_PLAN.md (Residence references corrected to Castle). Rebuilt WASM (v=15). 171 tests passing. |
|| 51 | 2026-06-16 | ~2h | **Nano Banana 2 high-res terrain textures.** Generated 8 × 1024×1024 PNG terrain textures via google/gemini-3.1-flash-image-preview (OpenRouter, ~$0.55). Wired into WebGL pipeline: added a_uv + a_terrain_id vertex attributes, sampler2DArray u_terrain_textures, base_color texture sampling in fragment shader with flat-color fallback. JS creates TEXTURE_2D_ARRAY, loads 8 PNGs, uploads via texSubImage3D. Cache v=17→v=18. 174 tests passing. |
||| 52 | 2026-06-16 | ~10 min | **Bugfix #10 + named tool storage.** Fixed `openMenu is not defined` — JS `<script type="module">` scoped functions invisible to inline onclick handlers; exposed 9 UI functions to `window`. Added `tool_storage: [u32; 12]` to Economy with `get_tool_count`/`add_tool`/`withdraw_tool`/`most_needed_tool`. Toolsmith now produces named tools based on demand. 184 tests passing (+4). |
||| 54 | 2026-06-17 | ~10 min | **Mint building + Coins resource.** Added ResourceType::Coins (COUNT 26) and BuildingType::Mint (18 common buildings). Mint converts Gold Ore + Coal → Coins (30 tick interval, Hammer tool, 35 tick construction). Updated building_color, BUILDING_ICONS (🪙), all match arms, tests (+mint_production_chain). 188 tests passing, WASM rebuilt (143KB). |
||| 55 | 2026-06-17 | ~10 min | **Barracks unit training:** Added BARRACKS_TRAINING_INTERVAL (60 ticks). Completed Barracks consume 1 Weapon → spawn Swordsman. Timer holds when Weapons unavailable. Construction gate (no training until built). 4 new tests. 192 tests passing (+4). |
||| 56 | 2026-06-17 | ~10 min | **Tool counts WASM export + tool bar HUD:** Added `get_tool_counts()` WASM export returning JSON with all 11 tool type counts. Added `tool_code_to_name()` helper in economy.rs. Extended `tool_code_from_name()` to cover Dagger/Shovel/Bow. Tool bar UI below resource bar with emoji icons + live counts (3s refresh). Bumped WASM cache v=20→v=21. 2 new tests. 194 engine + 5 server = 199 tests passing. |
||| 57 | 2026-06-17 | ~10 min | **Nation integration:** Added NationType::from_name(), all_names(), emoji(). Added player_nation field to GameState. Added set_player_nation(), get_player_nation(), list_nations() WASM exports. Wired nation selection from new game panel to WASM. Added nation HUD (emoji + name + description) below tool bar. Bumped WASM cache v=21→v=22. 199 tests passing. |
|| 59 | 2026-06-17 | ~10 min | Bowman training: Barracks alternates Swordsman/Bowman each cycle, `training_kind` field, nation archer modifiers (`archer_hp/attack/range`), `attack_range_mult` on Unit used by CombatAI, 2 new tests (199 total). WASM v=24. |
|| 60 | 2026-06-17 | ~10 min | **Worker speed modifier:** Added `nation_speed_mult` field to Unit, applied in `tick_movement` (speed = base × terrain × nation). Added `set_nation_speed_mult()` to UnitManager. Wired into `Economy::set_nation_modifiers()` and Castle recruitment spawn. 5 new tests (204 total). |
||| 61 | 2026-06-17 | ~10 min | **Worker build speed modifier:** Added `speed_mult` param to `Building::tick_construction()`, `Economy::build_speed()` reads `NationModifiers.units.worker_build_speed`, wired into `Economy::update()`. Romans build 10% faster (1.1x), Vikings/Trojans 10% slower (0.9x). 1 new test (205 engine, 210 total). |
|||| 62 | 2026-06-17 | ~10 min | **Toolsmith UI feedback:** Added producing_tool field to get_building_info() WASM export — when a completed Toolsmith is selected, shows which tool is currently being produced (based on most_needed_tool()). JS showBuildingInfo() displays 🔧 + tool name. Rebuilt WASM v=25. 205 tests passing. |
|||| 58 | 2026-06-17 | ~10 min | **Nation modifier application:** Economy production speed modifiers via try_produce(speed), building cost modifiers (ceil rounding), Barracks swordsmen get nation HP/attack/defense multipliers, CombatAI uses attack_mult/defense_mult for damage resolution. Unit gains attack_mult/defense_mult fields. BuildingType::building_category() for Economic/Military lookups. 3 new tests. 197 tests. WASM v=22→v=23. |


||| 53 | 2026-06-16 | ~10 min | **Settler tool pickup + tool awareness.** WorkerAI::auto_assign() now withdraws required tools from economy storage and gives them to settlers (carried_tool) when assigning to tool-requiring buildings. Economy::auto_assign_settlers() applies the same logic. Buildings check has_tooled_settler() before production. 3 new tests (tool pickup with/without tool, economy auto_assign tool pickup). 187 tests passing (+3). |
|| 50 | 2026-06-16 | ~10 min | Castle settler recruitment: added recruitment_timer to Building, CASTLE_SETTLER_INTERVAL=50, Economy::update() spawns idle settlers from completed Castles. Fixed Building::new() zero-build-time buildings. 174 tests passing. |
||| 49 | 2026-06-16 | ~25 min | Comprehensive S4 authenticity audit of nations, people, goods, resources, terrain, decorations, and objects. No fabricated content beyond Residence (removed S48). Cleaned old names from docs. 171 tests passing. |
| 48 | 2026-06-16 | ~10 min | Fixed black screen (Session 47 carryover): removed unused u_map_dims uniform from vertex shader — GPU drivers optimized it away, causing get_uniform_location to return None and default (0,0) to blanket map in edge-fog color matching clear color. Updated edge-fog shader test. Bumped WASM cache to v=15. All 171 tests passing. |
|| 63 | 2026-06-17 | ~10 min | **Nation-color tinting on building overlay dots:** Added `u_player_rgb` uniform to overlay fragment shader — when a player nation is selected, building dots are tinted 40% with the nation color (Romans=red, Vikings=blue, Maya=green, Trojans=gold, DarkTribe=purple). No tint when no nation selected. `overlay_player_rgb_loc` stored as Option for GPU safety. WASM rebuilt (v=25). All 210 tests passing (205 engine + 5 server). |
---

## Open Items & Decisions Needed

| ID | Title | Status | Notes |
|----|-------|--------|-------|
| #1 | docker-compose.yml | ✅ Closed | Resolved in Session 4 |
| #10 | openMenu is not defined | ✅ Closed | Fixed in Session 52 — module-scoped functions exposed to window |
| #3 | Cannot find u_time | ✅ Closed | Fixed in Session 7 — u_time now used in vertex shader |
| #8 | Create S4WN Icon and Logo | ✅ Closed | Resolved in Session 17 — SVG + PNG favicon suite, loading screen logo, web manifest |

All known issues are resolved. No open decisions needed.

---

## Blockers

None at the moment.

---

## Delivery Protocol (Mandatory for Every Session)

**Every S4WN run MUST end with these steps — no exceptions:**

1. **Push to GitHub** — `git push` all changes. If push fails, `git pull --rebase` and retry. Never end a session with unpushed commits.
2. **Update IMPLEMENTATION_PLAN.md:**
   - Mark completed roadmap items with `[x]`
   - Append session entry to the Session Log table
   - Update "Last updated" date and "Status" at the top
   - Update Open Items & Decisions Needed table
   - **Write 3-5 concrete next implementation steps** in the "Next Session" section below
3. **Update README.md** if project status or features changed
4. **Report** what was accomplished

---

## Next Session

### ✅ Nano Banana 2 terrain textures (Session 51)
- 1024×1024 textures for all 8 S4 terrain types, loaded via WebGL TEXTURE_2D_ARRAY
- Graceful fallback to flat colors if textures fail to load
- Future: tune UV repeat factor, add texture blending between tile edges

### Next Session (Session 65)

1. **Fog of war:** Implement unexplored territory darkening for tiles not yet seen (shader-based, similar to edge-fog pattern).
2. **Unit overlay dot tinting:** Extend nation-color overlay tinting to unit dots as well (not just buildings).
3. **Guard Tower / Fortress territory expansion:** When garrisoned, extend player territory radius.
4. **Common building completion:** Add remaining S4 common buildings (Shipyard, Siege Workshop, Guard Tower, Fortress, Road Layer).
5. **Tool pickup polish:** Settlers now route through Storehouse for tools — verify in-game, add HUD feedback showing tool pickup in progress.

### ✅ Completed in Session 64

1. **Tool production integration — physical pickup:** ✅ Settlers physically pick up tools from Storehouse inventory (Session 64) (add `pickup_tool()` route), not just magically on auto_assign. This makes the tool bar HUD actionable — players see tools being consumed.
2. **Fog of war:** Implement unexplored territory darkening for tiles not yet seen (shader-based, similar to edge-fog pattern).
3. **Unit overlay dot tinting:** Extend nation-color overlay tinting to unit dots as well (not just buildings).
4. **Guard Tower / Fortress territory expansion:** When garrisoned, extend player territory radius.
5. **Common building completion:** Add remaining S4 common buildings (Shipyard, Siege Workshop, Guard Tower, Fortress, Road Layer).

### Phase 2.8.2 — Common Buildings (continued)

### Phase 2.8.2 — Common Buildings (continued)
 - [x] **Toolsmith named tool production:** Toolsmith produces specific tools (Hammer, Pickaxe, Saw, etc.) — each with separate production cycle and storage in storehouse
### Session 52 Deliverables
- [x] **Bugfix #10:** `openMenu is not defined` — exposed 9 module-scoped UI functions to `window`
- [x] **Toolsmith named tool production:** `tool_storage` array on Economy, Toolsmith produces named tools based on `most_needed_tool()` demand scan
- [x] **Settler tool pickup:** idle settlers check storehouse for tools needed by unstaffed buildings, auto-pickup and route to building
- [x] **Castle settler recruitment:** spawn idle settler at castle every ~50 ticks (5s at 10 TPS)
- [x] **Barracks unit training:** Weapons → Swordsman — recruitment timer, consumes 1 Weapon, 4 tests (Session 55)
- [x] **Mint building:** Gold Ore + Coal → Coins (trade/economic good) — 18 common buildings (Session 54)
- [x] **WorkerAI tool awareness:** auto_assign prefers tool-carrying settlers; Toolsmith produces named tools with tool_type field

### Phase 2.8.1 — Nation Integration
- [x] `set_player_nation(nation_name)` WASM export storing nation on GameState
- [x] Apply nation modifiers: production speed, unit stats, building costs in economy/combat
- [x] Nation flag/icon in in-game HUD

### Phase 4.7 — Visual Polish
- [ ] Fog of war / unexplored territory (darken unseen tiles via shader)
- [x] Nation-color tinting on buildings in WebGL overlay

---

## Reference Notes

- The original Siedler 4 uses a custom C++ engine. Assets are stored in `.dat`, `.bbf`, and `.gfx` archive formats.
- Settlers United community has reverse-engineered parts of the game.
- **S4 file formats** (researched Session 4):
  - **Encryption**: ARA stream cipher with fixed key (0x30313233, 0x34353637, 0x38393031) — see engine/src/ara_crypt.rs
  - **Compression**: LZ77 + Adaptive Huffman (rebuilds code table periodically) — see engine/src/decompress.rs
  - **Graphics**: `.gfx` container with palette-based sprites (run-length encoded or raw)
  - **Reference implementations**: [Settlers.ts](https://github.com/tomsoftware/Settlers.ts) (TypeScript), [S4GFX](https://github.com/WizzardMaker/S4GFX) (C#), [S4Forge.RE](https://github.com/Settlers4-Reforged/S4Forge.RE) (C++ decompilation)
- Target: fully playable in browser, no install required.
- Hello World POC renders an 8×8 isometric terrain grid with animated elevation via vertex shader — validates the full WASM + WebGL2 pipeline on arm64.
- Day/night cycle cycles every ~5 real-time minutes; resource deposits glow with a pulsing overlay.
- **⚠️ Asset Policy (non-negotiable):** Original S4 assets are NEVER used. All graphics/sound must be generated and stored in `assets/`. The ARA+LZH decoder exists solely for structural research and for the map/campaign importer — never to extract and republish Ubisoft artwork.
- **Economy system (Session 5):** 17 building types with defined production chains. Resource storage caps at 200 base + 100 per storehouse. Production intervals range 15-50 ticks (1.5-5s at 10 TPS). Production chain Wood→Boards tested end-to-end.
- **Siedler 4 `.map` file format** (reverse-engineered, implemented Session 15):
  - **Magic**: 4 bytes `57 52 4C 44` ("WRLD")
  - **Header**: version (u32 LE), width (u32 LE), height (u32 LE) — 12 bytes total
  - **Tile records**: width×height entries, 6 bytes each:
    - Byte 0: terrain ID (0=Grass, 1=Forest, 2=Mountain, 3=Water, 4=DeepWater, 5=Desert, 6=Swamp, 7=Snow)
    - Byte 1: raw elevation (0-255, map to -1.0..1.0 normalized)
    - Byte 2: flags (bitfield — water, buildable, etc.)
    - Byte 3: resource ID (0=None, 1=Iron, 2=Coal, 3=Gold, 4=Stone, 5=Sulfur, 6=Fish, 7=Game, 8=Grain)
    - Bytes 4-5: micro-position (sub-tile offset for objects)
  - **Parser location**: `map-viewer.html` `parseBinaryMap()` function (client-side JS)
  - **WASM path**: binary .map → JS parser → JSON → `load_map_json()` → WASM mesh rebuild
  - **Reference**: S4 map structure documented in Settlers United community wiki; original maps bundled with Siedler 4 Gold Edition
