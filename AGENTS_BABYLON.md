# Babylon.js/TypeScript Refactor — S4WN Project

> **⚠️ BASE.md is the priority source of truth.** Read BASE.md first. Never modify BASE.md unless explicitly asked.

---

## Architecture Change: Rust/WASM → Babylon.js/TypeScript

### Rationale
- Eliminates WASM build complexity and toolchain
- Babylon.js provides robust 3D engine (WebGL2, WebGPU ready)
- Native glTF 2.0 support for 3D models
- Standard web development workflow (npm, vite, typescript)
- Built-in PBR materials, lighting, shadows, post-processing

### Technology Choices

| Aspect | Before (Rust/WASM) | After (Babylon.js/TypeScript) |
|--------|-------------------|------------------------------|
| Engine | Rust → WASM (299KB) | Babylon.js (TypeScript) |
| Rendering | Raw WebGL2 | Babylon.js WebGL/WebGPU |
| Build | cargo + wasm-pack | npm + vite |
| Tests | cargo test (Rust) | jest (TypeScript) |
| Models | OBJ/MTL parsing | glTF 2.0 (.glb) native support |

---

## Implementation Plan

### Phase 0 — Project Setup (Session 1) ✅
- [x] Initialize npm project with TypeScript
- [x] Install Babylon.js, jest, vite, typescript
- [x] Create src/ directory structure
- [x] Migrate asset pipeline to npm run scripts

### Phase 1 — Core Game Logic Migration (Sessions 2-4) ✅
- [x] Map system (terrain, elevation, resources)
- [x] Camera system (orbital with Babylon.js ArcRotateCamera)
- [x] Unit system (UnitKind, Unit, UnitManager, states, stances)
- [x] Building system (BuildingType, Building, production)
- [x] Pathfinding (A* implementation in TypeScript)

### Phase 2 — 3D Rendering Pipeline (Sessions 4-8)
- [x] Scene setup with ArcRotateCamera (orbital)
- [x] Terrain mesh generation (height displacement)
- [ ] Terrain texture splat-mapping
- [ ] Water plane with reflections
- [ ] Building 3D models (glTF via Babylon.js)
- [ ] Ground-plane shadows
- [ ] Particle system (15 effect types)

### Phase 3 — Game Systems (Sessions 8-10)
- [ ] GameLoop with tick-based simulation
- [ ] WorkerAI for settler assignment/movement
- [ ] CombatAI for military units
- [ ] Territory computation
- [ ] Fog of war system

### Phase 4 — UI Migration (Sessions 10-12)
- [ ] Main menu (HTML/CSS overlay)
- [ ] Map editor (side panel)
- [ ] Object explorer (side panel)
- [ ] HUD panels (HTML overlay)
- [ ] Debug panel with stats

### Phase 5 — Integration & Polish (Sessions 12-14)
- [ ] Network layer (WebSocket)
- [ ] Save/load game state (localStorage)
- [ ] Mobile touch controls
- [ ] Performance optimization
- [ ] Audio system

### Phase 6 — Testing & Deployment (Sessions 14-15)
- [ ] Migrate Rust tests to TypeScript/jest
- [ ] Visual regression tests
- [ ] Integration tests (keep Playwright)
- [ ] Update Dockerfile for static serving
- [ ] Update CI/CD pipeline

---

## File Migration Map

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

---

## Migration Log

| Session | Date | Summary |
|---------|------|---------|
| P0 | 2026-07-04 | Initialize npm + TypeScript + Babylon.js |
| P1 | 2026-07-04 | Migrate core modules (Map, Unit, Pathfinding, Building) |
| P2 | 2026-07-04 | Create main.ts with ArcRotateCamera, TerrainRenderer |