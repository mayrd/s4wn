# Implementation Plan — S4WN

> **⚠️ Derives from [BASE.md](BASE.md).** BASE.md defines project identity, constraints, and architecture. This file tracks implementation progress. All work must adhere to BASE.md.

**Status:** Phase 6.20 — Building Auto-Repair (519 tests)
**Last updated:** 2026-06-21

---

## Development Methodology: BDD/TDD

Every feature follows: **Objective → Test Cases → Implementation → Verify → Commit**

- Tests written BEFORE code
- `cargo test` must be green before commit
- Every bugfix adds a regression test
- See BASE.md §4 for session workflow

---

## Roadmap

### Phase 0 — Foundation ✅
- Hello World POC renders terrain via WASM/WebGL2
- CI/CD pipeline passes on push

### Phase 1 — Core Engine ✅
- Map renders with camera controls
- Tick-based game loop (10 TPS)
- ARA+LZH decoder for S4 archives

### Phase 2 — Economy ✅
- Resource production chains
- Building construction + tool requirements
- Worker assignment + tool gating

### Phase 3 — Units ✅
- Settler + military unit spawning
- Pathfinding (A*)
- Unit commands (move, attack)

### Phase 4 — UI Overhaul ✅
- Canvas fills viewport, overlay HUD, splash/menu
- Construction panel, resources panel, settlers panel
- Nation-gated building placement

### Phase 5 — 3D Pipeline ✅
- Orbital camera model
- Height-displaced terrain mesh
- Splat-map texture blending, water shader
- GPU model rendering (instanced draw calls)

### Phase 6 — Polish ✅
- Particles, sound effects, mobile CSS
- Marquee selection, health bars, minimap
- Unit stances (Aggressive/StandGround/Passive)
- Building destruction, auto-repair
- Map editor, tutorial engine
- Formation-preserving movement

---

## Session Log (recent)

| Session | Date | Duration | Summary |
|---------|------|----------|---------|
| 143 | 2026-06-21 | ~10 min | Fix #54: canvas CSS stretching on mobile |
| 142 | 2026-06-21 | ~10 min | Building Auto-Repair + Bugfix #52 (toggleEditorMode) |
| 141 | 2026-06-21 | ~10 min | Attack-move formation preservation |
| 140 | 2026-06-20 | ~10 min | Minimap building dots |
| 139 | 2026-06-20 | ~10 min | Building rubble particle effect |
| 138 | 2026-06-20 | ~10 min | Building combat (units attack buildings) |
| 137 | 2026-06-20 | ~10 min | Building HP system |
| 136 | 2026-06-19 | ~10 min | Unit stance JS/UI complete |
| 135 | 2026-06-19 | ~10 min | Unit stance engine implementation |
| 134 | 2026-06-19 | ~10 min | Unit stance investigation + GitHub issue #51 |
| 133 | 2026-06-18 | ~10 min | Unit formation movement |
| 111 | 2026-06-17 | ~10 min | Per-model GPU buffers fix |
| 108 | 2026-06-17 | ~10 min | Unit model instances |
| 107 | 2026-06-17 | ~10 min | Docker consolidation |

---

## Next Session — Concrete Steps

1. Implement .sav full campaign state restoration from parsed chunk data
2. Add garrison interactions for military buildings (auto-defense when units stationed)
3. Investigate unit ranks/experience (S4 had 3 tiers: recruit, veteran, elite) — create GitHub issue
4. Add fog of war (unexplored terrain darkening via shader)
5. Polish tutorial campaign progression

---

*See full session history in git log. Derived from BASE.md.*
