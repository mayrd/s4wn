# AGENTS.md — S4WN Project Reference

## 1. Agent Rules

### Asset Policy (Non-Negotiable)
- **NO original Siedler 4 assets** (sprites, textures, sounds, music) are ever extracted or committed.
- All visuals and audio must be **generated from scratch** in `assets/`.
- Standard web formats: PNG, WebP, OGG, JSON, glTF — never proprietary containers.

### Base Knowledge
- **[siedlercommunity.de/siedler4](https://www.siedlercommunity.de/siedler4/)** — authoritative source for buildings, units, production chains, and game mechanics.
- **BASE.md** contains building, resources and settlers reference data — always consult it before implementing any features.

### Session Protocol
**Start:** Read BASE.md → fetch open GitHub issues → read Next Session below.

**During:** Resolve open issues FIRST → one small atomic task per run → run tests after every change.

**End (MANDATORY):** Run tests `/tests/run_tests.sh` and ensure they are green → `git add -A && git commit` → `git push` (if fails, `git pull --rebase`) → update Session Log below with 3-5 next steps.

### Communication
- Keep responses concise — short direct answers on Telegram
- Daniel prefers fewer, longer messages over many short ones

## 2. Technology Stack

### Engine: Babylon.js/TypeScript
**Chosen over:** Rust/WASM (complexity)
- Babylon.js provides robust 3D engine (WebGL2, WebGPU ready)
- Native glTF 2.0 support for 3D models
- Standard web development workflow (npm, vite, typescript)
- Built-in PBR materials, lighting, shadows, post-processing

### Graphics: Babylon.js WebGL/WebGPU
| Aspect | Babylon.js/TypeScript |
|--------|------------------------------|
| Engine | Babylon.js (TypeScript) |
| Rendering |Babylon.js WebGL/WebGPU |
| Build | npm + vite |
| Models | glTF 2.0 (.glb) native support |
| Tests | jest (Unit), Playwright (UI) |

### Camera: Orbital (Babylon.js ArcRotateCamera)
Default: classic isometric (alpha=45° azimuth, beta=30.264° elevation). Smooth interpolation `dt * 8.0`.

### Textures: WebP Atlases
Terrain 2048×2048. All procedurally generated. Goal: match original S4 art style with same color palette, terrain texel density, biome transitions.

### Server: Caddy 2.x (Single-Container)
Auto-HTTPS via Let's Encrypt. Multi-arch Docker (amd64 + arm64).

### Build Toolchain
| Tool | Purpose |
|------|---------|
| TypeScript (stable) | Game logic |
| Vite | Build system (with SourceMaps enabled) |
| Caddy 2.x | Production web server |
| Docker Buildx | Multi-arch images |
| Jest | Unit Testing |
| Playwright | UI/E2E Testing |

## 3. Implementation Plan

Status: P2 · Babylon.js Edition · Phase 2 in progress.

### Roadmap

| Phase | Status | Description |
|-------|--------|-------------|
| 0 — Foundation | ✅ | npm + TypeScript + Babylon.js setup |
| 1 — Core Engine | ✅ | Map, camera, units, buildings, pathfinding |
| 2 — 3D Rendering | ✅ | Terrain, water, buildings, shadows, particles |
| 3 — Game Systems | ✅ | GameLoop, WorkerAI, CombatAI, territory, fog |
| 4 — UI Migration | 🔄 | Main menu, editor, HUD panels |
| 5 — Integration | ⬤ | Save/load, mobile, performance, audio |
| 6 — Testing | ⬤ | Jest (Unit), Playwright (UI/E2E), visual regression, deployment |

#### Detailed Phase Breakdown

##### Error Handling & Logging (PRIORITY) ✅
- [x] Implement structured `Logger` with severity levels (`src/core/Logger.ts`)
- [x] Implement global `ErrorHandler` for unhandled exceptions/rejections (`src/core/ErrorHandler.ts`)
- [x] Enable Vite SourceMaps for original code references in console
- [x] Integrate global error handling into boot sequence

##### Phase 0 — Project Setup ✅
- [x] Initialize npm project with TypeScript
- [x] Install Babylon.js, jest, vite, typescript
- [x] Create src/ directory structure
- [x] Migrate asset pipeline to npm run scripts

##### Phase 1 — Core Game Logic Migration ✅
- [x] Map system (terrain, elevation, resources)
- [x] Camera system (orbital with Babylon.js ArcRotateCamera)
- [x] Unit system (UnitKind, Unit, UnitManager, states, stances)
- [x] Building system (BuildingType, Building, production)
- [x] Pathfinding (A* implementation in TypeScript)

##### Phase 2 — 3D Rendering Pipeline ✅
- [x] Scene setup with ArcRotateCamera (orbital)
- [x] Terrain mesh generation (height displacement)
- [x] Terrain texture splat-mapping
- [x] Water plane with reflections
- [x] Building 3D models (OBJ via Babylon.js loaders)
- [x] Ground-plane shadows
- [x] Particle system (15 effect types)

##### Phase 3 — Game Systems ✅
- [x] GameLoop with tick-based simulation
- [x] WorkerAI for settler assignment/movement
- [x] CombatAI for military units
- [x] Territory computation
- [x] Fog of war system (Shader blending)

##### Phase 4 — UI Migration 🔄
- [x] Splash Screen and Main Menu (HTML/CSS)
- [x] UI Styling (Siedler 4 aesthetic)
- [x] UI Integration with GameLoop
- [x] UI Testing (Playwright)
- [ ] Map editor (side panel)
- [x] Object explorer (side panel)
- [x] HUD panels (HTML overlay)
- [ ] Debug panel with stats

##### Phase 5 — Integration & Polish ⬤
- [ ] Network layer (WebSocket)
- [ ] Save/load game state (localStorage)
- [ ] Mobile touch controls
- [ ] Performance optimization
- [ ] Audio system

##### Phase 6 — Testing & Deployment ⬤
- [x] Migrate Rust tests to TypeScript/jest
- [ ] Visual regression tests
- [ ] Integration tests (keep Playwright)
- [x] Update Dockerfile for static serving
- [ ] Update CI/CD pipeline

### File Migration Map

| Rust Module | TypeScript Target | Notes |
|-------------|------------------|-------|
| `map.rs` | `src/game/Map.ts` | Terrain, elevation, resources |
| `camera.rs` | `src/game/Camera.ts` | Orbital controls → ArcRotateCamera |
| `units.rs` | `src/game/Unit.ts`, `src/game/UnitManager.ts` | UnitKind enum, Unit struct |
| `economy.rs` | `src/game/Economy.ts` | BuildingType, Building, resources |
| `pathfinding.rs` | `src/game/Pathfinder.ts` | A* algorithm (done) |
| `worker_ai.rs` | `src/game/WorkerAI.ts` | AI logic |
| `combat.rs` | `src/game/CombatAI.ts` | Military AI |
| `nation.rs` | `src/game/Nation.ts` | Nation modifiers |
| `particle.rs` | `src/game/particles/ParticleSystem.ts` | Effect types |
| `shaders.rs` | `src/rendering/pipelines/*.ts` | GLSL → Babylon.js shaders |

## 4. Session Log

| Session | Date | Summary |
|---------|------|---------|
| P0 | 2026-07-04 | Initialize npm + TypeScript + Babylon.js, install deps |
| P1 | 2026-07-04 | Migrate core modules (Map, Unit, Pathfinding, Building) |
| P2 | 2026-07-04 | Create main.ts with ArcRotateCamera, TerrainRenderer |
| P3 | 2026-07-04 | Remove all WASM/Rust frontend code, clean up .gitignore, Dockerfile, AGENTS.md |
| P4 | 2026-07-05 | Implement Terrain splat-mapping, Water reflections, glTF Building loader, Shadows, and GameLoop/AI integration |
| P5 | 2026-07-05 | Implement Splash Screen, Main Menu (HTML/CSS), and fix build/TS errors |
| P6 | 2026-07-05 | Fix ShaderMaterial Jest test mock, update index.html styles, fix Playwright port config |
| P7 | 2026-07-05 | Implement Object Explorer UI, fix RawTexture type errors, and resolve UI test regressions |

### Next Session Priorities
1. Integrate Object Explorer with game data (UnitManager, Economy)
2. Implement Map editor (side panel) - create UI panel with map tools
3. Implement Debug panel with stats - create UI panel with performance/debug info
4. Visual regression tests - implement Playwright screenshot comparison tests

*All building, resources and settlers data must match BASE.md. Never modify BASE.md.*
