# Siedler 4 Web-Native (S4WN)

Welcome to the Siedler 4 Web-Native (S4WN) project. Our mission is to preserve the spirit of the classic *Siedler 4* (The Settlers IV) experience while evolving it for the modern era. By migrating the game engine to a web-based architecture, we ensure accessibility across desktop and mobile browsers, ensuring this timeless classic remains playable for generations to come.

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

---

*This project is dedicated to the Settlers United community. Our goal is to maintain the legacy of Siedler 4 by embracing modern web standards.*

---

## 🚀 Current Status

**Phase 1 — Core Engine** (complete ✅)

- ✅ **TECHNOLOGY_CHOICE.md** — Engine: Rust → WASM, Server: Caddy, Graphics: WebGL2/WebGPU
- ✅ **Hello World POC** — Rust/WASM engine rendering an animated isometric terrain grid via WebGL2 (42KB .wasm)
- ✅ **CI/CD Pipeline** — GitHub Actions + Docker Buildx multi-arch (amd64/arm64)
- ✅ **Map Module** — 8 terrain types, procedural generation, resource deposits
- ✅ **Camera Module** — Isometric pan/zoom with mouse + touch support
- ✅ **Game Loop** — Tick-based deterministic, 10 TPS, seeded PRNG (SplitMix64)
- ✅ **Asset Pipeline** — ARA stream cipher + LZ/Huffman decompression (ported from Settlers.ts)
- ✅ **Renderer Integration** — Day/night cycle, resource glow visualization

**Phase 2 — Game Logic** (complete ✅)

- ✅ **Economy System** — 16 resource types (9 raw + 7 processed), 14 building types, production chains, resource storage
- ✅ **Units System** — Workers, Soldiers, Archers with HP/speed/attack stats, movement along paths
- ✅ **Pathfinding** — A* on tile grid with terrain-aware movement costs
- ✅ **Worker-Building Integration** — Buildings require assigned workers to produce resources
- ✅ **Worker AI** — Auto-assignment, pathfind to building, transition to Working state
- ✅ **Combat System** — Attack resolution, damage/death, soldier chase and attack AI
- ✅ **Game Loop Integration** — WorkerAI + CombatAI wired into deterministic tick update
- ✅ **Map Viewer** — Standalone Canvas2D isometric viewer with pan/zoom/touch (map-viewer.html)
- ✅ **102 unit tests** passing

**Phase 3 — Multiplayer** (complete ✅)

- ✅ **Network Module** — WebSocket-compatible message types, NetworkManager stub, serialization (15 tests)
- ✅ **Overlay Rendering** — WebGL building and unit dot markers
- ✅ **Economy HUD** — `get_resource_counts()`, `get_building_summary()`, `get_unit_summary()` WASM exports
- ✅ **Pause & Speed Controls** — Pause game loop (⏸ overlay, `P` key), Speed controls (1×/2×/4×, keys `1`/`2`/`3`)
- ✅ **Map Export** — `Map::to_json()` serialization method
- ✅ **Procedural Assets** — 8 terrain tile textures, 5 building sprites, 3 unit sprites, 2 UI elements (112KB)
- ✅ **WebSocket Server** — `server/` crate with tokio-tungstenite, room management, player handling, chat relay, game start (16 tests)
- ✅ **Lobby UI** — `lobby.html` with animated title/loading screen, room list, create/join/leave, player list, chat
- ✅ **WebSocket Client Stubs** — `ws_connect()`, `ws_send()`, `ws_receive()`, `ws_state()` WASM bindings
- ✅ **Server-Authoritative Game State** — `ServerGameState` module (map, buildings, units, resources), action validation, 10 TPS tick loop broadcasting `GameStateSync` to all room members (14 tests)
- ✅ **Client-Side Interpolation** — `ClientInterpolator` struct with previous/current snapshot tracking, `interpolation_alpha()` for smooth 60fps rendering, `interpolate_unit_position()` with spawn/death/move handling (8 tests). Wired into WASM rendering loop.
- ✅ **~167 tests** passing (137 engine + 30 server)

**Phase 4 — UI & Single Player** (in progress 🔨)

- ✅ **Splash Screen & Title** — Animated splash → fade → menu, S4WN logo, heraldic shield design, favicon suite
- ✅ **Main Menu** — Load Map, Demo Map, Load Game, New Game, Settings buttons; keyboard navigation
- ✅ **Settings Panel** — Zoom speed, terrain detail, volume/SFX toggles, localStorage persistence
- ✅ **Economy HUD** — FPS counter, map info, tile tooltip, minimap, resource bar (emojis + counts)
- ✅ **Pause & Speed** — Pause overlay, 1×/2×/4× speed controls, keyboard shortcuts
- ✅ **Building Placement** — Building toolbar (14 types), terrain validation, cost checking, crosshair cursor
- ✅ **Selection Info** — Click-to-select buildings/units, detail card with HP/production/workers
- ✅ **Building Affordability** — Auto-refresh toolbar affordability, disable unaffordable, green indicators
- ✅ **Construction Progress** — Orange overlay dots for constructing buildings, size proportional to progress (3.0→8.0), `constructed_pct` in building info
- ✅ **New Game Flow** — Procedural map generation via `generate_map()` WASM, loading screen with progress bar, difficulty-based starting resources (Easy 2×, Medium 1×, Hard 0.5×)
- ✅ **Starter Base** — Auto-placed Headquarters at map center + 2-4 idle workers on new game start
- ✅ **Map Validation** — Binary .map integrity checks (terrain ID range, tile count, elevation pattern warnings)
- ⏳ **Single-Player Start** — Auto-save (✅), continue game (✅), load .sav files (⏳)
- ✅ **Save/Load System** — `get_game_state()` + `restore_game_state()` WASM exports, auto-save every 5 min to localStorage, Continue button with game time indicator, manual Save in pause overlay
- ✅ **Recent Files** — Tracks last 5 loaded files in localStorage (metadata: name, size, type, date), clickable to re-trigger file picker
- ⏳ **Load .sav files** — Savegame binary format parser in progress

---

AI Agent Configuration:
* Work Duration: 10-20 minutes per session.
* Frequency: Hourly.
* Reporting: Ensure README.md and IMPLEMENTATION_PLAN.md remain accurate to the current state of the project.
