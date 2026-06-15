# Technology Choice

> Decision document — Session 1 deliverable

Status: **DECIDED** — 2026-06-14

---

## Evaluation Criteria

| Criterion | Weight | Notes |
|-----------|--------|-------|
| Browser compatibility | High | Must work on Chrome, Firefox, Safari, mobile |
| Performance | High | Settlers IV has complex simulation logic |
| Maintainability | Medium | Single codebase, modern tooling |
| Community | Medium | Active ecosystem, documentation |
| Arm64 support | Medium | Raspberry Pi 5 target |

---

## Decision: Engine Approach

### Selected: **Option A — Native WASM Re-Implementation (Rust)**

| Criterion | Score | Notes |
|-----------|-------|-------|
| Browser compat | ✅ Excellent | WASM + WebGL works everywhere; WebGPU supported in all majors since Nov 2025 |
| Performance | ✅ Excellent | Near-native Rust → WASM with wasm-bindgen |
| Maintainability | ✅ Good | Single Rust codebase, modern tooling, strong type system |
| Community | ✅ Good | Rust game dev ecosystem growing (wgpu, winit, bevy) |
| Arm64 support | ✅ Built-in | Rust cross-compiles to wasm32 natively |

**Rationale:**
- **Option B (Emulation via x86 WASM)** was rejected due to performance overhead, x86 emulation complexity on ARM, and licensing concerns with the original binary.
- **Option C (Hybrid — Reverse-Engineered Core)** was rejected because it creates a dependency on reverse-engineering accuracy and operates in a legal grey area. We want a clean, legally distributable open-source project.
- **Option A** gives us full control, a modern tech stack, and a clean legal foundation. While it requires reimplementing game logic, we can reference the community's documented game mechanics (formulas, production chains, unit stats) without copying code.

**Key Technology Stack:**
- **Language:** Rust (safety, performance, WASM target)
- **WASM Bindings:** wasm-bindgen + web-sys
- **Graphics:** wgpu (targets WebGL2 for broad compat, WebGPU for modern browsers)
- **Audio:** Web Audio API (via web-sys)
- **Build:** wasm-pack → npm package

---

## Decision: Web Server

### Selected: **Caddy**

| Criterion | Score | Notes |
|-----------|-------|-------|
| Auto-HTTPS | ✅ Built-in | Zero-config TLS via Let's Encrypt |
| Config simplicity | ✅ Excellent | Caddyfile is 5 lines for static hosting |
| Multi-arch | ✅ Good | Official images for amd64 + arm64 |
| Binary size | ✅ Small | ~35MB, much smaller than Nginx |

**Rationale:**
- **Nginx** has more ecosystem but Caddy's auto-HTTPS and simpler config reduce maintenance burden.
- **lighttpd** is too minimal — missing modern features like HTTP/2 push, easy TLS.
- Caddy handles TLS certificate renewal automatically, critical for a zero-maintenance deployment.

---

## Decision: Build & CI

### Selected Toolchain

| Tool | Purpose | Version |
|------|---------|---------|
| **Rust (stable)** | Game engine language | 1.96.0 |
| **wasm-pack** | Rust → WASM + JS bindings | 0.15.0 |
| **wasm-bindgen** | JS interop | bundled with wasm-pack |
| **wgpu** | Cross-platform graphics (WebGL/WebGPU) | latest |
| **Caddy** | Production web server | 2.x (Alpine-based) |
| **Docker Buildx** | Multi-arch images (amd64 + arm64) | latest |
| **GitHub Actions** | CI/CD pipeline | — |

---

## Architecture Overview

```
┌─────────────────────────────────────────┐
│                 Browser                  │
│  ┌───────────────────────────────────┐  │
│  │         JavaScript Glue           │  │
│  │  (wasm-pack generated loader)     │  │
│  ├───────────────────────────────────┤  │
│  │         WASM Module               │  │
│  │  ┌──────────┐  ┌──────────────┐   │  │
│  │  │ Game     │  │ Renderer     │   │  │
│  │  │ Logic    │  │ (wgpu/WebGL) │   │  │
│  │  │ (Rust)   │  │              │   │  │
│  │  └──────────┘  └──────────────┘   │  │
│  └───────────────────────────────────┘  │
│  ┌──────────┐  ┌────────────────────┐   │
│  │ Web Audio│  │  HTML5 Canvas      │   │
│  │ API      │  │                     │   │
│  └──────────┘  └────────────────────┘   │
└─────────────────────────────────────────┘
         ▲
         │ HTTP/2 + TLS
         ▼
┌─────────────────┐
│  Caddy Server   │
│  (Docker)       │
│  amd64 + arm64  │
└─────────────────┘
```

---

## Decisions Checklist

- [x] Engine approach: **Native WASM Re-Implementation in Rust**
- [x] Web server: **Caddy**
- [x] Build toolchain: **Rust + wasm-pack + wgpu + Docker Buildx + GitHub Actions**
- [x] Rationale: See above — clean legal foundation, modern stack, full control

---

## Decision: Graphics Architecture

> Updated: 2026-06-15 — comprehensive graphics pipeline definition

### Design Philosophy

S4WN renders a **full 3D world** viewed through an adjustable camera. The classic
Siedler 4 isometric angle is the **default view**, not the only view. Players can
orbit, tilt, and zoom freely — the game feels like a diorama you can inspect from
any angle.

All visuals are procedurally generated. No original S4 sprites or textures are
ever used. The aesthetic is low-poly with flat-shaded or simple PBR materials —
clean, readable, and performant on integrated GPUs (including Raspberry Pi 5).

### Selected: **Raw WebGL2 via web-sys + Custom Engine**

| Criterion | Score | Notes |
|-----------|-------|-------|
| Control | ✅ Full | Custom shaders, render passes, culling — no black-box abstractions |
| Performance | ✅ Excellent | Zero overhead from framework object models; direct GPU access |
| WASM size | ✅ Smaller | No three.js/wgpu shader bloat in the .wasm binary |
| Portability | ✅ Good | WebGL2 runs on all modern browsers (Chrome, Firefox, Safari, Edge) |
| Future-proof | ⚠️ Moderate | WebGPU (via wgpu) is the planned upgrade path when browser support matures |

**Why not three.js:**
- Adds ~600KB minified + gzipped to the JS bundle
- Object-oriented abstractions (Scene, Mesh, Material) fight against the ECS-like
  data-oriented design of a simulation game
- Custom shaders (terrain blending, day/night cycle) require fighting three.js's
  material system rather than writing GLSL directly
- three.js is excellent for demos and 3D websites; less ideal for a game engine
  that needs fine-grained control over draw calls and state

**Why not wgpu (yet):**
- wgpu targets WebGPU, which has narrower browser support than WebGL2
- The current WebGL2 backend via web-sys is already working and well-tested
- When WebGPU reaches >90% browser share, wgpu becomes the natural migration path
  (the tech choice document already names wgpu as the long-term target)

**Why not Bevy:**
- Bevy's WASM target is experimental and produces large binaries
- ECS overhead is unnecessary for a single-threaded browser game
- The custom engine is already 125KB WASM with 137 tests — lean and maintainable

---

### Graphics Stack

```
┌──────────────────────────────────────────────────────┐
│                  Rendering Pipeline                   │
├──────────────────────────────────────────────────────┤
│  1. Shadow Pass      (directional light depth map)   │
│  2. Terrain Pass     (heightmap mesh + blend textures)│
│  3. Water Pass       (reflective/refractive surface)  │
│  4. Object Pass      (buildings, units, resources)    │
│  5. Overlay Pass     (selection highlights, UI dots)  │
│  6. Post-Processing  (fog, vignette, color grading)   │
├──────────────────────────────────────────────────────┤
│  All passes: GLSL 300 es, WebGL2, custom engine       │
│  Asset format: glTF 2.0 (.glb) for models             │
│  Textures: procedural → WebP atlases (2048×2048)      │
│  Animations: glTF skeletal + blend shape              │
└──────────────────────────────────────────────────────┘
```

---

### 3D Model Format: glTF 2.0 (.glb)

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| **Container** | `.glb` (binary glTF) | Single-file, compact, fast to parse |
| **Materials** | PBR metallic-roughness | Industry standard, matches WebGL2 capabilities |
| **Textures** | WebP (lossy) atlases | 60-80% smaller than PNG; atlases reduce draw calls |
| **Animation** | Skeletal (up to 16 bones per model) | Sufficient for low-poly units; blend shapes for facial/deformation |
| **Vertex format** | Position + Normal + UV + Joints(4) + Weights(4) | Standard skinned mesh layout |
| **Triangle budget** | Buildings: 50-200, Units: 80-150, Resources: 20-60 | Matches the existing OBJ pack constraints |
| **Level of Detail** | 2 LODs per model (full + half resolution) | GPU-friendly on mobile/RPi |

**Conversion pipeline:**
```
Procedural OBJ (Python)  →  Blender CLI (bpy)  →  glTF 2.0 .glb
   ↑                                                    ↓
   assets/models/*.obj                          assets/models/*.glb
   (generated Session 14)                       (to be generated)
```

Existing 62 OBJ models are the **source of truth** for geometry. A future
`convert_to_gltf.py` script batch-converts them, adds PBR material defaults,
and generates collision proxies.

---

### Camera: Orbital with Isometric Default

The camera orbits a world-space focus point on the terrain. Three parameters
define the view:

| Parameter | Range | Default | Description |
|-----------|-------|---------|-------------|
| **Azimuth** (θ) | 0°–360° | 45° | Horizontal rotation around focus |
| **Elevation** (φ) | 10°–80° | 35.264° | Vertical angle above horizon (classic iso = atan(1/√2) ≈ 35.264°) |
| **Distance** (d) | 2–100 tiles | 20 tiles | Distance from focus point |

**Interaction model:**
- **Right-drag** → orbit (azimuth + elevation)
- **Scroll** → dolly (distance)
- **Middle-drag** → pan (move focus point)
- **Double-click tile** → focus on that tile with smooth animation
- **"Reset View" button** → snap to classic isometric (θ=45°, φ=35.264°, d=auto)

**Matrices (column-major, GL convention):**
```
View = LookAt(eye, focus, up)
  where:
    eye.x = focus.x + d * cos(φ) * sin(θ)
    eye.y = focus.y + d * sin(φ)
    eye.z = focus.z + d * cos(φ) * cos(θ)
    up = (0, 1, 0)

Projection = Perspective(fov=45°, aspect=canvas.w/canvas.h, near=0.1, far=500)
```

**Smooth transitions:** All camera parameters interpolate with easing
(lerp + exponential decay) for cinematic feel. Target parameters update
instantly on input; actual parameters chase with `dt * 8.0` smoothing factor.

---

### Terrain: Heightmap Displacement Mesh

The map grid (e.g., 64×64 tiles) becomes a vertex-displaced mesh. Each tile
is a quad with elevation extruding in Y.

| Aspect | Specification |
|--------|---------------|
| **Vertex count** | (width+1) × (height+1) — one vertex per tile corner |
| **Triangle count** | width × height × 2 — two triangles per tile quad |
| **Y displacement** | `vertex.y = tile.elevation * ELEVATION_SCALE` (default 0.5 world units) |
| **Texture blending** | 4-layer splat map: R=grass, G=rock, B=sand, A=snow. Water uses separate mesh |
| **Tile size** | 1.0 world unit per tile edge |
| **Water plane** | Separate semi-transparent mesh at Y=0 with animated vertex displacement |

**Terrain shader features:**
- Slope-based texture selection (steep faces get rock texture)
- Triplanar mapping on steep slopes to avoid stretching
- Elevation-based snow line (above Y=0.7, blend to snow)
- Day/night lighting via directional light angle

---

### Textures: Procedural, Atlased, WebP

All textures are procedurally generated — never extracted from original S4 assets.

| Texture Type | Resolution | Format | Generation |
|-------------|------------|--------|------------|
| **Terrain atlas** | 2048×2048 | WebP | 16 tile textures (grass, rock, sand, snow variants) in 4×4 grid |
| **Building atlas** | 1024×1024 | WebP | 14 building textures (wood, stone, thatch, metal variants) |
| **Unit atlas** | 512×512 | WebP | 3 unit textures (worker, soldier, archer) with team color mask |
| **Resource atlas** | 512×512 | WebP | 8 resource icons (iron, coal, gold, stone, sulfur, fish, game, grain) |
| **Water normal map** | 512×512 | WebP | Tiling normal map for water surface ripples |
| **Shadow map** | 2048×2048 | — | Render-to-texture depth map (dynamic, not stored) |
| **Sky gradient** | 256×1 | WebP | Single-row gradient for sky color (dawn→noon→dusk→night cycle) |

**Texture preparation workflow:**
1. `generate_assets.py` creates PNG textures using procedural noise + color ramps
2. Convert to WebP with `cwebp -q 80` (balanced quality/size)
3. Pack into atlases with `scripts/pack_atlas.py`
4. Generate mipmap chain (WebGL `generateMipmap` at load time)

**PBR material parameters (per texture set):**
- Albedo (base color) — from atlas
- Roughness — constant per material type (wood=0.7, stone=0.5, metal=0.3)
- Metallic — 0.0 for organic, 1.0 for metal
- Ambient occlusion — baked into albedo alpha channel or separate map

---

### Animation: glTF Skeletal + Simple State Machine

| Unit State | Animation | Duration | Looping |
|-----------|-----------|----------|---------|
| Idle | Slight bob + idle pose | 2.0s | Yes |
| Walking | Walk cycle (4 keyframes) | 0.8s | Yes |
| Working | Tool swing / hammer / harvest | 1.5s | Yes |
| Fighting | Attack swing / bow draw | 0.6s | Trigger |
| Dying | Fall + fade | 1.0s | Once |
| Building | Grow from ground (scale) + scaffolding | 3.0s | Once |

**Skeletal rig specification (humanoid units):**
- 12 bones: root, spine, chest, neck, head, L_upper_arm, L_lower_arm, R_upper_arm, R_lower_arm, L_upper_leg, L_lower_leg, R_upper_leg, R_lower_leg
- Forward kinematics only (no IK solver needed at this poly count)
- Animations authored procedurally (Python script generates keyframes as quaternion rotations)

**Animation blending:**
- Cross-fade between states (0.2s blend duration)
- Animation speed proportional to unit movement speed
- All animations at 30 FPS keyframe rate (stored as glTF sparse accessors for size efficiency)

---

### Shader Pipeline Details

**Vertex Shader (terrain):**
```glsl
#version 300 es
layout(location=0) in vec3 a_position;   // x,z = tile corner, y = elevation
layout(location=1) in vec3 a_normal;     // computed from heightmap gradient
layout(location=2) in vec2 a_texcoord;   // tile UV (0..1 per tile)
layout(location=3) in vec4 a_splat;      // texture blend weights (RGBA)

uniform mat4 u_modelViewProjection;
uniform mat4 u_model;
uniform vec3 u_lightDirection;           // sun position
uniform float u_dayPhase;                // 0..1 for day/night cycle

out vec3 v_worldPos;
out vec3 v_normal;
out vec2 v_texcoord;
out vec4 v_splat;
out vec3 v_lightDir;
```

**Fragment Shader (terrain):**
```glsl
#version 300 es
// PBR: diffuse + specular with roughness
// 4-layer texture splatting via v_splat weights
// Day/night ambient + directional light mixing
// Fog based on distance from camera
```

**Performance targets:**
- 60 FPS on desktop (integrated GPU, 1080p)
- 30 FPS on Raspberry Pi 5 (720p)
- < 200 draw calls per frame (terrain = 1 instanced draw, buildings = 1 per type, units = 1 per type)
- Shadow map at half resolution (1024×1024) for mobile

---

### Asset Preparation Checklist

For a complete 3D animated game, the following must be generated:

| Asset | Format | Count | Status |
|-------|--------|-------|--------|
| Terrain textures (atlas) | WebP 2048×2048 | 1 | ⬜ Not yet |
| Building models | .glb | 14 | 🟡 OBJ exists, needs glTF conversion |
| Building textures | WebP atlas | 1 | ⬜ Not yet |
| Unit models (rigged) | .glb | 3 | 🟡 OBJ exists, needs rigging + glTF |
| Unit textures | WebP atlas | 1 | ⬜ Not yet |
| Unit animations | glTF animation | 15 (5 states × 3 units) | ⬜ Not yet |
| Resource models | .glb | 11 | 🟡 OBJ exists, needs glTF conversion |
| Resource textures | WebP atlas | 1 | ⬜ Not yet |
| Water normal map | WebP 512×512 | 1 | ⬜ Not yet |
| Sky gradient | WebP 256×1 | 1 | ⬜ Not yet |
| Particle textures | WebP 64×64 | 4 (smoke, spark, dust, leaves) | ⬜ Not yet |
| UI icons | WebP 32×32 | 20+ | ⬜ Not yet |

---

### Migration Path: Current → 3D

The current implementation (isometric Canvas2D + flat WebGL terrain) is not
throwaway work — it's the foundation that evolves into the 3D pipeline:

| Phase | What Changes | Effort |
|-------|-------------|--------|
| **Now** (Phase 4) | Canvas fills viewport, overlay HUD, splash/menu | ✅ Done |
| **Step 1** | Replace isometric projection matrix with orbital camera; terrain becomes height-displaced mesh | ~2 sessions |
| **Step 2** | Replace solid-color terrain with splat-map texture blending | ~1 session |
| **Step 3** | Convert OBJ models to glTF; render with PBR shader | ~1 session |
| **Step 4** | Add skeletal animation system; create unit rigs + animations | ~2 sessions |
| **Step 5** | Add shadow mapping, water surface, post-processing, particles | ~2 sessions |
| **Step 6** | Performance optimization (instanced rendering, LOD, frustum culling) | ~1 session |
