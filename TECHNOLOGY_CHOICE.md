# Technology Choice — S4WN

> **⚠️ This file derives from [BASE.md](BASE.md).** BASE.md §3 defines the architecture. This file explains the rationale behind each decision.

---

## Core Decisions (see BASE.md §3 for architecture diagram)

### Engine: Rust → WASM (Native Re-Implementation)

**Chosen over:**
- **x86 Emulation via WASM** — performance overhead, ARM complexity, licensing concerns
- **Hybrid Reverse-Engineered Core** — legal grey area, dependency on RE accuracy
- **TypeScript/JS Engine** — insufficient performance for game simulation

**Rationale:** Full control, modern toolchain, clean legal foundation. Reference community-documented game mechanics (formulas, production chains, unit stats) without copying original code.

### Graphics: Raw WebGL2 via web-sys

**Chosen over:**
- **three.js** — adds ~600KB, OOP abstractions fight ECS design, custom shaders require fighting material system
- **wgpu** — WebGPU support is narrower than WebGL2; migration path exists when browser share >90%
- **Bevy** — WASM target is experimental, ECS overhead unnecessary for single-threaded browser game

**Rationale:** Direct GPU access, zero framework overhead, custom shaders without black-box abstractions. WASM binary stays at ~200KB. WebGPU (via wgpu) is the planned upgrade path.

### Camera: Orbital with Isometric Default

- **Azimuth** (0°–360°), **Elevation** (10°–80°), **Distance** (2–100 tiles)
- Default: classic isometric (az=45°, el=35.264° = atan(1/√2))
- Smooth interpolation: `dt * 8.0` smoothing factor

### 3D Models: Procedural OBJ/JSON → glTF 2.0

- Current: 84 procedurally-generated JSON models
- Future: glTF 2.0 (.glb) with PBR materials, skeletal animation, LOD
- All models generated from scratch — no original S4 meshes

### Textures: Procedural → WebP Atlases

- Terrain: 2048×2048 WebP atlas (4-layer splat map)
- Buildings/Units/Resources: dedicated atlases
- All textures procedurally generated (noise + color ramps)

### Server: Caddy 2.x

**Chosen over:**
- **Nginx** — more ecosystem but Caddy's auto-HTTPS and simpler config reduce maintenance
- **lighttpd** — too minimal, missing modern features

**Rationale:** Zero-config TLS via Let's Encrypt, simple Caddyfile (~5 lines for static hosting), official multi-arch Docker images.

---

## Build Toolchain

| Tool | Purpose |
|------|---------|
| Rust (stable) | Game engine |
| wasm-pack | Rust → WASM + JS bindings |
| wasm-bindgen | JS interop |
| Caddy 2.x | Production web server |
| Docker Buildx | Multi-arch images (amd64 + arm64) |
| GitHub Actions | CI/CD pipeline |

---

## Performance Targets

- 60 FPS on desktop (integrated GPU, 1080p)
- 30 FPS on Raspberry Pi 5 (720p)
- <200 draw calls per frame
- WASM binary: <300KB

---

*Derived from BASE.md. See BASE.md for the complete architectural specification.*
