# Rendering Pipeline Audit Checklist — Phase 7

> Generated: 2026-06-23 | Session 188
> Baseline: 645 tests passing | WASM ~377KB | 84 building models

## Pipeline Render Order

| Step | Feature | Status | Verified | Notes |
|------|---------|--------|----------|-------|
| 1 | Reflection FBO pass | DONE | TODO | Half-res FBO; water tiles discarded; Y-flipped camera |
| 2 | Main terrain pass | DONE | YES | LOD 3-level; splat-mapped; AO; water reflections |
| 3 | Shadow rendering | DONE | TODO | Ground-plane shadows; multi-layer penumbra + noise dither |
| 4 | Cloud layer | DONE | TODO | Instanced quads; parallax; day-phase coloring |
| 5 | Sun/Moon discs | DONE | TODO | Celestial body discs with glow; day/night visibility |
| 6 | Model 3D rendering | DONE | YES | 84 models; per-building colors; normals; UVs; instanced |
| 7 | Overlay 2D dots | DONE | YES | Buildings + units as colored dots |

## Visual Feature Checklist

### Terrain
- [x] Dynamic sky color ramp (dawn-noon-dusk-night)
- [x] Smooth biome transition splat-map blending
- [x] Ambient occlusion at cliff/elevation boundaries
- [x] Terrain LOD (3 levels: 1x1, 2x2, 4x4 tiles per quad)
- [x] Procedural terrain atlas (2048x512)
- [x] VP matrix via orbital camera
- [ ] SHOULD: Verify terrain atlas texture fidelity at all zoom levels
- [ ] SHOULD: Measure LOD seam visibility at transitions

### Water
- [x] Water surface animation with normal maps + specular
- [x] Reflection FBO with Fresnel blend
- [x] Half-resolution FBO (50pct, 75pct fill rate savings)
- [x] Water tiles discarded from reflection FBO
- [ ] MUST: Verify water tiles excluded from reflection FBO visually (Step 32)
- [ ] SHOULD: Fine-tune horizon_y for camera elevations/zoom (Step 33)
- [ ] NICE: Add depth attachment to reflection FBO (Step 34)

### Lighting
- [x] Day-phase-aware hemisphere ambient lighting
- [x] Directional light from sun position
- [x] Smooth shadow penumbra via multi-layer falloff + noise dither
- [x] Lightning flashes with rapid fade (20-90s, 30pct double)
- [x] Day-phase via shared day_light_glsl macro
- [ ] SHOULD: Test shadow penumbra at extreme camera angles

### Atmosphere
- [x] Cloud layer with instanced rendering + parallax
- [x] Sun/Moon disc rendering with glow
- [x] Rain particle system (blue-white streaks, gravity, drift)
- [x] Lightning sky brightening
- [ ] NICE: Cloud shadow projection on terrain
- [ ] NICE: Fog/haze at far distance

### Buildings and Models
- [x] 84 procedurally-generated building models
- [x] Hipped roofs, stepped temple bases + spires
- [x] Per-vertex normals for all models
- [x] Per-building material colors + texture UVs
- [x] Building destruction animation (scale-to-zero)
- [x] Construction particles with per-nation colors
- [x] Procedural detail normals for building walls
- [ ] SHOULD: Verify models render correctly at all zoom/LOD levels
- [ ] NICE: LOD for distant building models

### Particles
- [x] Combat effects (death particles)
- [x] Chimney smoke from buildings
- [x] Construction particles
- [x] Rain particles with burst spawning
- [x] Leaf particles near forest tiles
- [ ] NICE: Dust/wind particles in desert biomes
- [ ] NICE: Snow particles in mountain biomes

## Performance Checklist

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| WASM size | under 300KB | ~377KB | WARN 77KB over |
| Tests passing | All | 645 | PASS |
| Draw calls/frame | under 200 | TBD | TODO |
| FPS desktop 1080p | 60 | TBD | TODO |
| FPS RPI5 720p | 30 | TBD | TODO |

### WASM Size Reduction
- [x] Remove console_error_panic_hook (saved 3.5KB)
- [x] Audit unused web-sys features (removed 8)
- [x] Consolidate shader day_light function (3 to 1)
- [x] Remove dead u_sun_color/u_moon_color uniforms
- [x] Add panic=abort to Cargo.toml
- [ ] MUST: Investigate 77KB over budget
- [ ] NICE: Model data compression (quantize vertices)

## Shader Uniforms Audit

### Terrain Fragment Shader
- [x] u_resolution, u_camera_center, u_zoom
- [x] u_player_rgb, u_use_textures, u_splat_scale
- [x] u_vp, u_use_vp (orbital camera)
- [x] u_light_dir, u_day_phase
- [x] u_water_time, u_water_normal, u_water_normal_ready
- [x] u_lightning
- [x] u_reflection_tex, u_reflection_pass, u_reflection_horizon_y
- [x] Dead uniforms removed: u_sun_color, u_moon_color
- [ ] SHOULD: Audit for remaining dead uniforms

### Model Fragment Shader
- [x] All uniforms present
- [x] Day-phase via shared macro
- [x] Terrain texture wired in

### Cloud/Sun-Moon Shaders
- [x] All uniforms present; day-phase via shared macro

## Stability

- [x] cargo test: 645 passed, 0 failed
- [x] WASM build successful
- [x] No known shader compilation errors
- [x] Fix 69: u_resolution missing uniform
- [x] Fix 70: WASM rebuild + deploy
- [ ] SHOULD: cargo clippy + fix warnings
- [ ] SHOULD: trunk serve for visual smoke test
- [ ] MUST: Verify reflection FBO on real WebGL2 hardware

## Integration

- [x] JS-WASM bindings for all public functions
- [x] WASM export audit complete
- [x] pkg/ via git add -f engine/pkg/
- [x] Orphaned WebGL resources cleanup
- [ ] SHOULD: WebGL context loss recovery
- [ ] NICE: GPU object leak detection in test mode

## Summary

Done: 38 rendering features across 7 passes.
Needs verification: 3 visual items (Steps 32-34), 4 perf measurements, 2 stability checks.
Next priority: Step 32 - Verify reflection FBO excludes water tiles visually.
