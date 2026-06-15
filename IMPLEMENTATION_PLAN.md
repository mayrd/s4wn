# Implementation Plan

> This document is maintained by the AI agent. It reflects the current state and roadmap.

## Status: Phase 3 — Multiplayer 🔨

Last updated: 2026-06-15

---

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

### Phase 4 — Polish & Release
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
| 5 | 2026-06-15 | ~20 min | Economy system: ResourceType enum (9 raw + 7 processed), BuildingType enum (14 types with costs, inputs, outputs, production intervals), Building struct (construction, production, input/output buffers), ResourceStorage (capacity, cap tracking, spending), Economy manager (tick update, building placement); integrated into GameState + GameLoop; 30 new tests (59 total passing). Updated lib.rs to register economy module. Production chain Wood→Planks tested end-to-end. |
| 6 | 2026-06-15 | ~20 min | Units system (src/units.rs): Unit struct with Worker/Soldier/Archer types, HP, speed, attack stats, movement along paths, assignment to buildings; UnitManager for spawning/assigning/removing units; 15 tests. Pathfinding (src/pathfinding.rs): A* on tile grid with terrain-aware movement costs, 10 tests. Worker-building integration: Building.assigned_workers, has_worker(), assign_worker(), Economy.spawn_worker_for(), auto_assign_workers(). Buildings now require workers to produce. Updated 2 existing tests. 84 tests total passing. |
| 7 | 2026-06-15 | ~15 min | Fixed issue #3 (u_time uniform): unused uniform was optimized away by GLSL compiler → now used for subtle terrain animation. New worker_ai module: auto-assigns idle workers to buildings, pathfinds workers to buildings using A*, transitions to Working on arrival (6 tests). New combat module: soldier/archer AI finds nearest enemies, moves into range, resolves attacks with damage/cooldown, death handling (8 tests). Added idle_workers() iterator to UnitManager. 100 tests passing. Phase 2 nearly complete. |
|| 8 | 2026-06-15 | ~18 min | Combat+worker AI game loop integration: wired WorkerAI and CombatAI into GameState::update(), separated movement ticking (workers via WorkerAI, soldiers via CombatAI). Added 3 integration tests (102 total). Created standalone map-viewer.html (Canvas2D isometric renderer with pan/zoom/touch/drop). Sample island map in assets/. Added UnitManager::all_mut(). Phase 2 complete! |
|| 9 | 2026-06-15 | ~20 min | Phase 3 start: created network.rs module with NetworkMessage enum (10 variants: GameStateSync, BuildingPlace, UnitSpawn, UnitMove, UnitAttack, PlayerJoin, PlayerLeave, Chat, Ping/Pong, Welcome), NetworkManager stub with send/receive/inject, ConnectionState enum, serialization via serde (15 tests). Added building+unit overlay rendering to WebGL (second shader program, colored dots). Added HUD WASM bindings: get_resource_counts(), get_building_summary(), get_unit_summary(). Added Map::to_json(). Generated procedural assets: 8 terrain tiles, 5 building sprites, 3 unit sprites, 2 UI elements. Total ~130 tests. |
|| 10 | 2026-06-15 | ~20 min | WebSocket server: created server/ crate with tokio-tungstenite. Protocol module with NetworkMessage (serde tagged enum), RoomManager with Player/Room/RoomState, full WebSocket server with connection handling, room create/join/leave, chat relay, game start, broadcast. 16 server tests passing. Created lobby.html with title/loading screen (issue #6), room list, create/join/leave UI, player list, chat panel. Added ws_connect/ws_send/ws_receive/ws_state WASM stubs. Updated docker-compose with s4wn-server service, Caddyfile with /ws proxy. 129 engine + 16 server tests passing. |
||| 11 | 2026-06-15 | ~10 min | Server-authoritative game state: Created server/src/game_state.rs with GameMap (procedural biome gen via SplitMix64), ServerGameState (map/buildings/units/player resources), action validation (BuildingPlace, UnitSpawn, UnitMove, UnitAttack), tick update (building construction+production, unit movement, combat resolution), GameStateSnapshot broadcast. Integrated into Room (starts game state on GameStart) and main.rs (10 TPS tick loop broadcasts to in-progress rooms). 14 new tests. 30 server + 129 engine = 159 total, all passing. |
||| 12 | 2026-06-15 | ~10 min | Closed stale GitHub issues #4, #5, #6 (verified all resolved). Added ClientInterpolator struct in engine/src/network.rs for client-side state interpolation: holds previous + current GameStateSnapshot, provides interpolation_alpha() for smooth 60fps rendering between 10 TPS server ticks, interpolate_unit_position() with spawn/death/move handling. 8 new tests. Marked synchronized game state roadmap item complete. 137 engine + 30 server = 167 total tests passing. |

---

## Open Items & Decisions Needed

| ID | Title | Status | Notes |
|----|-------|--------|-------|
| #1 | docker-compose.yml | ✅ Closed | Resolved in Session 4 |
| #3 | Cannot find u_time | ✅ Closed | Fixed in Session 7 — u_time now used in vertex shader |

All known issues are resolved. No open decisions needed.

---

## Blockers

None at the moment.

---

## Delivery Protocol (Mandatory for Every Session)

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

- **Wire ClientInterpolator into WASM engine rendering loop:**
  - In `lib.rs`, feed received `GameStateSync` messages into `ClientInterpolator`
  - Use `interpolate_unit_position()` in the render loop for smooth unit movement at 60fps
  - Apply interpolated building construction states for progress bars
  - Handle first snapshot (no interpolation) and reconnection edge cases

- **Add interpolated building rendering:**
  - Extend `ClientInterpolator` with `interpolate_building_construction()` for construction progress
  - Render building construction animations using interpolated values

- **Client-side resource interpolation:**
  - Interpolate resource counts between snapshots for smooth HUD updates
  - Handle resource delta display (+5 wood, -2 planks)

- **End-to-end multiplayer integration test:**
  - Start server, connect 2 WASM clients, join room, start game
  - Verify GameStateSync round-trip serialization matches between server and engine
  - Place building, validate it appears in subsequent snapshots

- **Fix WASM build warnings:** Clean up 17 compiler warnings (unused imports, variables) for cleaner build output

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
- **Economy system (Session 5):** 14 building types with defined production chains. Resource storage caps at 200 base + 100 per warehouse. Production intervals range 15-50 ticks (1.5-5s at 10 TPS). Production chain Wood→Planks tested end-to-end.
