# S4WN — Siedler 4 Web-Native

> **⚠️ Priority: [BASE.md](BASE.md)** contains game knowledge (building data, production chains). Never modify BASE.md.

Web-native reimplementation of *The Settlers IV* (2001). Open-source, runs in any browser, no original game files required.

---

## Quick Reference

| | |
|---|---|
| **Engine** | Babylon.js / TypeScript |
| **Graphics** | Babylon.js WebGL/WebGPU |
| **UI** | HTML/CSS Overlay |
| **Audio** | Web Audio API |
| **Server** | Caddy (static files + WebSocket) |
| **Deploy** | Docker, multi-arch (amd64 + arm64) |
| **Tests** | Jest |
| **License** | MIT |

---

## Architecture

```
Browser → index.html
  ├─ Babylon.js Engine (TypeScript)
  │   ├─ Economy, Combat, Units, Map, Pathfinding
  │   ├─ Orbital camera (ArcRotateCamera)
  │   └─ PBR materials, lighting, shadows, particles
  ├─ HTML/CSS Overlay — UI, HUD, menus
  └─ Web Audio API — procedural sound effects
```

---

## Current Status

**Phase 4 — UI Migration in progress**

- ✅ Phase 0: Foundation (npm, TypeScript, Babylon.js)
- ✅ Phase 1: Core Engine (Map, Camera, Units, Buildings, Pathfinding)
- ✅ Phase 2: 3D Rendering (Terrain, Water, Buildings, Shadows, Particles)
- ✅ Phase 3: Game Systems (GameLoop, WorkerAI, CombatAI, Territory, Fog)
- 🔄 Phase 4: UI Migration (Main Menu, Object Explorer, HUD, Debug Panel)
- ⏳ Phase 5: Integration & Polish (Network, Save/Load, Mobile, Audio)
- ⏳ Phase 6: Testing & Deployment (Visual Regression, CI/CD)

---

## Development

```bash
npm install          # Install dependencies
npm test             # Run unit tests (Jest)
npm run test:ui      # Run UI tests (Playwright)
./tests/run_tests.sh # Run full pipeline (Typecheck + UI tests)
npm run dev          # Start development server (Vite)
```

### For AI Agents
Read in order: **BASE.md → AGENTS.md**

---

## Key Reference

- **[siedlercommunity.de/siedler4](https://www.siedlercommunity.de/siedler4/)** — building/unit/production chain mechanics
- **[BASE.md](BASE.md)** — building reference data (do not modify)
- **[AGENTS.md](AGENTS.md)** — agent rules, tech choices, implementation plan