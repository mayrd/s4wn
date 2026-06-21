# Implementation Plan — S4WN

> **⚠️ Priority: BASE.md** defines building data and game knowledge. All implementation must respect BASE.md information. Never modify BASE.md.

**Status:** Phase 6.20 — Building Auto-Repair (519 tests)
**Last updated:** 2026-06-21

---

## Development Methodology: BDD/TDD

Every feature: **Objective → Test Cases → Implementation → Verify → Commit**

- Tests written BEFORE code
- `cargo test` must be green before commit
- Every bugfix adds a regression test

---

## Roadmap

### Phase 0 — Foundation ✅
- Hello World POC renders terrain via WASM/WebGL2
- CI/CD pipeline passes on push

### Phase 1 — Core Engine ✅
- Map renders with camera controls, tick-based game loop (10 TPS)
- ARA+LZH decoder for S4 archives

### Phase 2 — Economy ✅
- Resource production chains, building construction, tool requirements

### Phase 3 — Units ✅
- Settler + military unit spawning, pathfinding, commands

### Phase 4 — UI Overhaul ✅
- Canvas viewport, overlay HUD, splash/menu, construction/resource/settler panels

### Phase 5 — 3D Pipeline ✅
- Orbital camera, heightmap terrain, splat-map blending, water shader, GPU models

### Phase 6 — Polish ✅
- Particles, sound, mobile CSS, marquee selection, health bars, minimap
- Unit stances, building destruction/repair, map editor, tutorial

---

## Session Log (recent)

| Session | Date | Summary |
|---------|------|---------|
| 143 | 2026-06-21 | Fix #54: canvas CSS stretching on mobile |
| 142 | 2026-06-21 | Building Auto-Repair + Bugfix #52 |
| 141 | 2026-06-21 | Attack-move formation preservation |
| 140 | 2026-06-20 | Minimap building dots |
| 139 | 2026-06-20 | Building rubble particle effect |
| 138 | 2026-06-20 | Building combat |
| 137 | 2026-06-20 | Building HP system |
| 136 | 2026-06-19 | Unit stance JS/UI complete |
| 135 | 2026-06-19 | Unit stance engine implementation |
| 133 | 2026-06-18 | Unit formation movement |

---

## Next Session — Concrete Steps

1. Implement .sav full campaign state restoration
2. Add garrison interactions for military buildings
3. Investigate unit ranks/experience — create GitHub issue
4. Add fog of war (unexplored terrain darkening)
5. Polish tutorial campaign progression

---

*All building data must match BASE.md. See git log for full session history.*
