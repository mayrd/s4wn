# S4WN — Siedler 4 Wildering New-Dawn

> **⚠️ Priority: [BASE.md](BASE.md)** contains game knowledge (building data, production chains). Never modify BASE.md.

Web-native reimplementation of *The Settlers IV* (2001). Open-source, runs in any browser, no original game files required.

---

## Test-Driven Development

This project follows **strict TDD discipline**. Every feature begins with a failing test.

### Quick Start (Testing)
```bash
npm install          # Install dependencies
npm test             # Run unit tests (Jest) - must be green before any commit
npm run test:ui      # Run visual regression tests (Playwright)
./tests/run_tests.sh # Run full pipeline (Typecheck + UI tests)
npm run dev          # Start development server (Vite)
```

### TDD Workflow
1. Write a failing test for the behavior you want
2. Run tests to confirm the test fails for the right reason
3. Implement minimally to make the test pass
4. Refactor while keeping tests green
5. Commit with test results verified

### Testing Stack
| Layer | Framework | Command |
|-------|-----------|---------|
| Unit | Jest | `npm test` |
| Visual Regression | Playwright | `npm run test:ui` |
| Type Check | TypeScript | `npx tsc --noEmit` |
| Full Pipeline | Shell script | `./tests/run_tests.sh` |

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

## Object Explorer

The Object Explorer is a **standalone debugging tool** that can be used without a game context:

```typescript
import { ObjectExplorer } from './ui/explorer/ObjectExplorer';

// Standalone mode - no GameLoop required
const explorer = new ObjectExplorer();
explorer.show(); // Shows static asset catalog

// Connected mode - with live game data
const explorer = new ObjectExplorer(gameLoop);
explorer.show(); // Shows live stats + catalog
```

**Features:**
- Font: Georgia serif with high contrast readability
- Clickable assets: Each row triggers detailed inspection
- Live toggle: Auto-refresh runtime state when connected to game
- Tabs: terrain | buildings | units | resources | decorations | misc

---

## Debug Panel

Access Babylon.js scene inspector during gameplay:

```typescript
// In-game console
debugPanel.showBabylonInspector();
```

Provides real-time FPS, game time, unit/building counts, and scene debugging tools.

---

### For AI Agents
Read in order: **BASE.md → AGENTS.md**

---

## Key Reference

- **[siedlercommunity.de/siedler4](https://www.siedlercommunity.de/siedler4/)** — building/unit/production chain mechanics
- **[BASE.md](BASE.md)** — building reference data (do not modify)
- **[AGENTS.md](AGENTS.md)** — agent rules, tech choices, implementation plan