# AGENTS.md — S4WN Project Reference

## 1. Agent Rules

### Asset Policy (Non-Negotiable)
- **NO original Siedler 4 assets** (sprites, textures, sounds, music) are ever extracted or committed.
- All visuals and audio must be **generated from scratch** in `assets/`.
- Standard web formats: PNG, WebP, OGG, JSON, glTF — never proprietary containers.

### Base Knowledge
- **[siedlercommunity.de/siedler4](https://www.siedlercommunity.de/siedler4/)** — authoritative source for buildings, units, production chains, and game mechanics.
- **BASE.md** contains building reference data — always consult it before implementing building-related features.

### Session Protocol
**Start:** Read BASE.md → fetch open GitHub issues (token in `/opt/data/.env`) → read Next Session below.

**During:** Resolve open issues FIRST → one small atomic task per run → `npm test` after every TypeScript change.

**End (MANDATORY):** `npm test` green → `git add -A && git commit` → `git push` (if fails, `git pull --rebase`) → update Session Log below with 3-5 next steps.

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
| Aspect | Before (Rust/WASM) | After (Babylon.js/TypeScript) |
|--------|-------------------|------------------------------|
| Engine | Rust → WASM (299KB) | Babylon.js (TypeScript) |
| Rendering | Raw WebGL2 | Babylon.js WebGL/WebGPU |
| Build | cargo + wasm-pack | npm + vite |
| Models | OBJ/MTL parsing | glTF 2.0 (.glb) native support |

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
| Vite | Build system |
| Caddy 2.x | Production web server |
| Docker Buildx | Multi-arch images |
| Jest | Testing |

## 3. Implementation Plan

Status: P2 · Babylon.js Edition · Phase 2 in progress.

### Roadmap

| Phase | Status | Description |
|-------|--------|-------------|
| 0 — Foundation | ✅ | npm + TypeScript + Babylon.js setup |
| 1 — Core Engine | ✅ | Map, camera, units, buildings, pathfinding |
| 2 — 3D Rendering | 🔄 | Terrain, water, buildings, shadows, particles |
| 3 — Game Systems | ⬤ | GameLoop, WorkerAI, CombatAI, territory, fog |
| 4 — UI Migration | ⬤ | Main menu, editor, HUD panels |
| 5 — Integration | ⬤ | Save/load, mobile, performance, audio |
| 6 — Testing | ⬤ | Jest tests, visual regression, deployment |

## 4. Session Log

| Session | Date | Summary |
|---------|------|---------|
| P0 | 2026-07-04 | Initialize npm + TypeScript + Babylon.js, install deps |
| P1 | 2026-07-04 | Migrate core modules (Map, Unit, Pathfinding, Building) |
| P2 | 2026-07-04 | Create main.ts with ArcRotateCamera, TerrainRenderer |

### Next Session Priorities
1. Terrain texture splat-mapping (Phase 2)
2. Water plane with reflections
3. Building 3D models (glTF via Babylon.js)
4. Ground-plane shadows for buildings/units

*All building data must match BASE.md. Never modify BASE.md.*