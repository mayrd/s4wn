# Implementation Plan

> This document is maintained by the AI agent. It reflects the current state and roadmap.

## Status: Phase 2 — Game Logic (ready to start)

Last updated: 2026-06-15

---

## 🤖 Agent Operating Rules

### GitHub Issues — READ FIRST, Always
- **At the start of EVERY session**, fetch all open GitHub issues via the API: `GET /repos/mayrd/s4wn/issues?state=open`
- **Incorporate open issues into the session's task list** — resolving existing issues always takes priority over new features.
- Issues tagged `decision needed` = the agent should decide on its own if possible; only block if genuinely ambiguous.
- Close issues via commit message (`Fixes #N`) when resolved.

### GitHub Issues — RAISE Proactively
- **When encountering a design decision or ambiguity**, create a GitHub issue with the `decision needed` label BEFORE blocking.
- Try to decide as much as possible yourself — only raise issues for genuinely unclear trade-offs.
- Document the decision in the issue body when you make it.
- Use issue labels: `decision needed`, `bug`, `enhancement`, `blocked`.

### Iteration Rule
- If the task pipeline finishes before 55+ minutes, loop back and start the next incomplete IMPLEMENTATION_PLAN item.
- Only stop early if ALL items are marked complete.

### Asset Policy — ALL Assets Open-Source & Generated
- **NO original Siedler 4 assets** (sprites, textures, sounds, music) are ever extracted or committed.
- **All visual/audio assets are generated** — by the agent or by procedural generation — and committed as standard web formats (PNG, WebP, OGG, JSON).
- **Creative freedom:** Assets do NOT need to match the original game's look; the style should be coherent but independently designed.
- **Map & campaign import is EXCEPTED:** the engine MUST parse original `*.map` / `*.sav` files for scenario data (terrain, resources, objectives) — but always maps to our own asset IDs, never extracts original graphics.
- If you encounter a `.dat` / `.bbf` / `.gfx` file during development, use the ARA+LZH decoder only for structural research — never extract and commit its contents.

---

## Roadmap

### Phase 0 — Foundation ✅
- [x] TECHNOLOGY_CHOICE.md: Evaluate WASM vs emulation, select stack
- [x] Hello World proof-of-concept: WebGL/WASM rendering a Settlers IV-themed terrain
- [x] Repository structure and CI/CD pipeline
- [x] Rebuild WASM after dead-code fix, verify clean build

### Phase 1 — Core Engine ✅
- [x] Map rendering and camera controls
- [x] Game loop architecture (tick-based, deterministic)
- [x] Asset pipeline (ARA stream cipher + LZ+Huffman decompression decoder)
- [x] WASM Phase 2 integration: day/night cycle + resource visualization in renderer

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
- [ ] Sound and music (Web Audio API) — generated, not extracted
- [ ] Docker multi-arch deployment (linux/amd64, linux/arm64)
- [ ] Map / campaign importer — parse original `*.map` and `*.sav` scenario data, map to internal asset IDs
- [ ] Asset generation pipeline — procedural sprites, tile textures, UI elements, sound effects
- [ ] `assets/` directory populated with all generated game assets

---

## Repository Structure

```
s4wn/
├── README.md                  # Project overview
├── LICENSE                    # MIT
├── IMPLEMENTATION_PLAN.md     # This file
├── TECHNOLOGY_CHOICE.md       # Tech decisions
├── Dockerfile                 # Multi-arch Caddy + game assets
├── docker-compose.yml         # Dev/prod Docker Compose config
├── .gitignore
├── .github/workflows/ci.yml   # CI/CD pipeline
├── assets/                    # Generated game assets (PNG, WebP, OGG, JSON)
│   ├── tiles/                 # Terrain tile textures
│   ├── buildings/             # Building sprites
│   ├── units/                 # Unit/settler sprites
│   ├── ui/                    # UI elements, icons, fonts
│   └── audio/                 # Sound effects, music (generated)
├── engine/                    # Rust WASM game engine
│   ├── Cargo.toml
│   ├── build.sh
│   ├── index.html             # Demo page
│   ├── src/lib.rs             # Engine core (WebGL renderer + GL context)
│   ├── src/map.rs             # Map/tile/terrain/resource system
│   ├── src/camera.rs          # Isometric camera with pan/zoom
│   ├── src/game_loop.rs       # Tick-based game loop
│   ├── src/ara_crypt.rs       # ARA stream cipher (S4 decryption)
│   ├── src/decompress.rs      # LZ+Huffman decompression (S4 archives)
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
| 2 | 2026-06-14 | ~60 min | Map module (8 terrain types, procedural gen, resource deposits); Camera module (isometric pan/zoom, touch support); Game loop module (10 TPS tick-based, SplitMix64 PRNG); integrated into lib.rs; 18 unit tests passing; WASM build 70KB; HTML demo with mouse/touch controls |
| 3 | 2026-06-15 | ~5 min | Recovery: committed and pushed Session 2 work (was lost due to cron error); updated IMPLEMENTATION_PLAN.md |
| 4 | 2026-06-15 | ~30 min | Asset pipeline: ported ARA stream cipher and LZ+Huffman decompression from Settlers.ts reference (ara_crypt.rs, decompress.rs); wired game loop into renderer with day/night cycle and resource visualization (glowing resource deposits); created docker-compose.yml (fixes #1); 29 tests passing |

---

## Open Items & Decisions Needed

| ID | Title | Status | Notes |
|----|-------|--------|-------|
| #1 | docker-compose.yml | ✅ Closed | Resolved in Session 4 |

---

## Blockers

None at the moment.

---

## Reference Notes

- The original Siedler 4 uses a custom C++ engine. Assets are stored in `.dat`, `.bbf`, and `.gfx` archive formats.
- Settlers United community has reverse-engineered parts of the game.
- **S4 file formats** (researched Session 4):
  - **Encryption**: ARA stream cipher with fixed key (0x30313233, 0x34353637, 0x38393031) — see engine/src/ara_crypt.rs
  - **Compression**: LZ77 + Adaptive Huffman (rebuilds code table periodically) — see engine/src/decompress.rs
  - **Graphics**: `.gfx` container with palette-based sprites (run-length encoded or raw)
  - **Reference implementations**: [Settlers.ts](https://github.com/tomsoftware/Settlers.ts) (TypeScript), [S4GFX](https://github.com/WizzardMaker/S4GFX) (C#), [S4Forge.RE](https://github.com/Settlers4-Reforged/S4Forge.RE) (C++ decompilation)
- Target: fully playable in browser, no install required.
- Hello World POC renders an 8×8 isometric terrain grid with animated elevation via vertex shader — validates the full WASM + WebGL2 pipeline on arm64.
- Day/night cycle cycles every ~5 real-time minutes; resource deposits glow with a pulsing overlay.
- **Next session:** Check for open GitHub issues first.
- **⚠️ Asset Policy (non-negotiable):** Original S4 assets are NEVER used. All graphics/sound must be generated and stored in `assets/`. The ARA+LZH decoder exists solely for structural research and for the map/campaign importer — never to extract and republish Ubisoft artwork.
