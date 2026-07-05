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

**Phase 2 — 3D Rendering Pipeline in progress**

- ✅ Engine setup with TypeScript & Babylon.js
- ✅ Map system (terrain, elevation, resources)
- ✅ Camera system (orbital ArcRotateCamera)
- ✅ Unit & Building systems (core logic)
- ✅ Pathfinding (A*)
- 🔄 Terrain mesh generation (height displacement)
- ⏳ Terrain texture splat-mapping
- ⏳ Water plane with reflections
- ⏳ Building 3D models (glTF)

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