# Technology Choice — S4WN

> **⚠️ Priority: BASE.md** defines building data and game knowledge. All tech decisions must respect BASE.md.

---

## Core Decisions

### Engine: Rust → WASM (Native Re-Implementation)

**Chosen over:** x86 Emulation (performance), Hybrid RE (legal grey area), JS Engine (too slow)

**Rationale:** Full control, modern toolchain, clean legal foundation. Reference community-documented game mechanics without copying original code.

### Graphics: Raw WebGL2 via web-sys

**Chosen over:** three.js (600KB overhead, OOP abstractions), wgpu (narrower browser support), Bevy (experimental WASM)

**Rationale:** Direct GPU access, zero framework overhead, custom shaders. ~200KB WASM binary. WebGPU planned when browser share >90%.

### Camera: Orbital (Azimuth/Elevation/Distance)

Default: classic isometric (az=45°, el=35.264°). Smooth interpolation with `dt * 8.0`.

### Models: Procedural OBJ/JSON → glTF 2.0

Currently 84 procedurally-generated JSON models. Future: glTF 2.0 (.glb) with PBR.

### Textures: Procedural → WebP Atlases

Terrain 2048×2048, all procedurally generated (noise + color ramps).

### Server: Caddy 2.x

Chosen over Nginx (simpler config), lighttpd (too minimal). Auto-HTTPS via Let's Encrypt.

---

## Build Toolchain

| Tool | Purpose |
|------|---------|
| Rust (stable) | Game engine |
| wasm-pack | Rust → WASM + JS bindings |
| Caddy 2.x | Production web server |
| Docker Buildx | Multi-arch images (amd64 + arm64) |

---

## Performance Targets

- 60 FPS desktop (1080p), 30 FPS Raspberry Pi 5 (720p)
- <200 draw calls per frame
- WASM binary: <300KB

---

*All buildings and production chains must match BASE.md data.*
