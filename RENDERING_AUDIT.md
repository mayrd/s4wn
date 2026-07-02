# Rendering Pipeline Audit Checklist — Phase 7

> Generated: 2026-06-23 | Session 188
> Baseline: 972 tests passing | WASM 288KB | 84 building models | Updated: 2026-07-02 Session 348

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
- [x] Dynamic sky color ramp → Rayleigh/Mie physical scattering (S341)
- [x] Smooth biome transition splat-map blending
- [x] Ambient occlusion at cliff/elevation boundaries
- [x] Terrain LOD (3 levels: 1x1, 2x2, 4x4 tiles per quad)
- [x] Procedural terrain atlas (2048x512)
- [x] VP matrix via orbital camera
- [x] Desert heat shimmer brightness modulation (S340)
- [x] Desert heat mirage UV distortion (S343)
- [x] Screen-space dithering to reduce color banding (S344)
- [ ] SHOULD: Verify terrain atlas texture fidelity at all zoom levels
- [ ] SHOULD: Measure LOD seam visibility at transitions

### Water
- [x] Water surface animation with normal maps + specular (sun-angle modulated)
- [x] Reflection FBO with Fresnel blend
- [x] Half-resolution FBO (50pct, 75pct fill rate savings)
- [x] Water tiles discarded from reflection FBO
- [ ] MUST: Verify water tiles excluded from reflection FBO visually (Step 32)
- [x] SHOULD: Fine-tune horizon_y for camera elevations/zoom (Step 33) — DONE session 191
- [x] NICE: Add depth attachment to reflection FBO (Step 34) — DONE session 198

### Lighting
- [x] Day-phase-aware hemisphere ambient lighting
- [x] Directional light from sun position
- [x] Smooth shadow penumbra via multi-layer falloff + noise dither
- [x] Distance-based shadow penumbra (close=sharp, far=soft) (S339)
- [x] Sun-angle shadow stretch (low sun = 4× stretch) (S339)
- [x] Lightning flashes with rapid fade (20-90s, 30pct double)
- [x] Day-phase via shared day_light_glsl macro
- [x] SHOULD: Test shadow penumbra at extreme camera angles — DONE S349 (5 new tests: overhead, shallow, zero-offset, far, monotonic height)

### Atmosphere
- [x] Cloud layer with instanced rendering + parallax
- [x] Sun/Moon disc rendering with glow
- [x] Rain particle system (blue-white streaks, gravity, drift)
- [x] Lightning sky brightening
- [x] Cloud shadow projection on terrain (procedural cloud_shadow() + god rays)
- [x] Fog/haze at far distance with elevation modulation (S335-336)
- [x] Rayleigh/Mie atmospheric scattering for sky colors (S341)

### Buildings and Models
- [x] 84 procedurally-generated building models
- [x] Hipped roofs, stepped temple bases + spires
- [x] Per-vertex normals for all models
- [x] Per-building material colors + texture UVs
- [x] Building destruction animation (scale-to-zero)
- [x] Construction particles with per-nation colors
- [x] Procedural detail normals for building walls
- [x] Rim lighting (Fresnel edge highlight) for building models
- [x] Roof specular highlights — tight (pow 64), warm-tinted (S342)
- [ ] SHOULD: Verify models render correctly at all zoom/LOD levels
- [x] NICE: LOD for distant building models — DONE S346 (80-tile distance culling)

### Particles
- [x] Combat effects (death particles)
- [x] Chimney smoke from buildings
- [x] Construction particles
- [x] Rain particles with burst spawning + soft ground fade
- [x] Leaf particles near forest tiles (S210)
- [x] Firefly particles near Grass/Forest at dusk (S209)
- [x] Fog/mist particles near Water/Swamp tiles (S208)
- [x] Dust storm particles near Desert tiles (S206)
- [x] Snow particles near Snow/Mountain tiles (S205)
- [x] Pollen/drifting seed particles near Grass tiles (S215)
- [x] Ember/spark particles for Smelter buildings (S213)

## Performance Checklist

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| WASM size | under 300KB | 280KB | PASS |
| Tests passing | All | 967 | PASS |
| Draw calls/frame | under 200 | 7~20 | PASS |
| FPS desktop 1080p | 60 | TBD | TODO |
| FPS RPI5 720p | 30 | TBD | TODO |

### WASM Size Reduction
- [x] Remove console_error_panic_hook (saved 3.5KB)
- [x] Audit unused web-sys features (removed 8)
- [x] Consolidate shader day_light function (3 to 1)
- [x] Remove dead u_sun_color/u_moon_color uniforms
- [x] Add panic=abort to Cargo.toml
- [x] opt-level=z reduced 365KB→338KB (-27KB)
- [x] GLSL minification: saved 12KB WASM (S212)
- [x] WASM target 300KB ACHIEVED: 280KB final
- [ ] NICE: Replace flt2dec float formatting with ryu (~10KB savings)
- [ ] NICE: Replace from_name match with phf/const hash (~28KB savings potential)
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
- [x] u_fog_color (screen-space radial fog)
- [x] u_sun_dir, u_god_ray_strength (god rays)
- [x] Dead uniforms removed: u_sun_color, u_moon_color
- [x] SHOULD: Audit for remaining dead uniforms — DONE S349 (0 dead, all 48 active)

### Model Fragment Shader
- [x] All uniforms present
- [x] Day-phase via shared macro
- [x] Terrain texture wired in
- [x] Roof specular highlights (S342)

### Cloud/Sun-Moon Shaders
- [x] All uniforms present; day-phase via shared macro

## Stability

- [x] cargo test: 972 passed, 0 failed
- [x] WASM build successful
- [x] No known shader compilation errors
- [x] Fix 69: u_resolution missing uniform
- [x] Fix 70: WASM rebuild + deploy
- [x] cargo clippy: 0 errors, 0 warnings
- [ ] SHOULD: trunk serve for visual smoke test
- [ ] MUST: Verify reflection FBO on real WebGL2 hardware

## Integration

- [x] JS-WASM bindings for all public functions
- [x] WASM export audit complete
- [x] pkg/ via git add -f engine/pkg/
- [x] Orphaned WebGL resources cleanup
- [x] SHOULD: WebGL context loss recovery — DONE S347
- [ ] NICE: GPU object leak detection in test mode

## Summary

Done: 52 rendering features across 7 passes. WASM 288KB (under 300KB target). 972 tests. Clippy clean.
Needs verification: 3 visual items (unchanged) (reflection FBO, water tile exclusion, reflection pass correctness). 2 FPS benchmarks pending. 
Next: Visual verification by Daniel — sky colors, roof specular, desert mirage, shadow penumbra quality.
