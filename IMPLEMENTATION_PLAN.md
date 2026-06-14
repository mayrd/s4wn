# Implementation Plan

> This document is maintained by the AI agent. It reflects the current state and roadmap.

## Status: Phase 0 — Foundation (in progress)

Last updated: 2026-06-14

---

## Roadmap

### Phase 0 — Foundation
- [x] TECHNOLOGY_CHOICE.md: Evaluate WASM vs emulation, select stack
- [x] Hello World proof-of-concept: WebGL/WASM rendering a Settlers IV-themed terrain
- [x] Repository structure and CI/CD pipeline
- [ ] Rebuild WASM after dead-code fix, verify clean build

### Phase 1 — Core Engine
- [ ] Map rendering and camera controls
- [ ] Game loop architecture (tick-based, deterministic)
- [ ] Asset pipeline (decode Siedler 4 `.dat` files → web-friendly formats)

### Phase 2 — Game Logic
- [ ] Economy system (resources, buildings, production chains)
- [ ] Military system (units, combat)
- [ ] Settler AI and pathfinding

### Phase 3 — Multiplayer
- [ ] WebRTC peer-to-peer or WebSocket client-server
- [ ] Synchronized game state
- [ ] Lobby and matchmaking

### Phase 4 — Polish & Release
- [ ] Mobile UI adaptation
- [ ] Sound and music (Web Audio API)
- [ ] Docker multi-arch deployment (linux/amd64, linux/arm64)

---

## Repository Structure

```
s4wn/
├── README.md                  # Project overview
├── LICENSE                    # MIT
├── IMPLEMENTATION_PLAN.md     # This file
├── TECHNOLOGY_CHOICE.md       # Tech decisions
├── Dockerfile                 # Multi-arch Caddy + game assets
├── .gitignore
├── .github/workflows/ci.yml   # CI/CD pipeline
├── engine/                    # Rust WASM game engine
│   ├── Cargo.toml
│   ├── build.sh
│   ├── index.html             # Demo page
│   ├── src/lib.rs             # Engine core (WebGL renderer)
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

---

## Blockers

None yet.

---

## Notes

- The original Siedler 4 uses a custom C++ engine. Assets are stored in `.dat` archives.
- Settlers United community has reverse-engineered parts of the game.
- Target: fully playable in browser, no install required.
- **Session 1 decisions:** Rust for engine (Option A), Caddy for web server, wasm-pack + wgpu for build pipeline.
- Hello World POC renders an 8×8 isometric terrain grid with animated elevation via vertex shader — validates the full WASM + WebGL2 pipeline on arm64.
- Next session (2): begin Phase 1 — map rendering with camera pan/zoom controls.
