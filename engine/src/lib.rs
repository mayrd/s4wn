//! S4WN Engine — Siedler 4 Web-Native
//!
//! Phase 1: Isometric map rendering + camera controls.
//! Full WASM + WebGL2 pipeline with generated terrain maps,
//! smooth camera pan (mouse drag) and zoom (scroll wheel).

#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

pub mod ara_crypt;
#[cfg(test)]
pub mod base_validation_tests;
pub mod camera;
pub mod combat;
pub mod decompress;
pub mod economy;
pub mod game_loop;
pub mod model;
pub mod map;
pub mod nation;
pub mod network;
pub mod pathfinding;
pub mod units;
pub mod particle;
pub mod worker_ai;
pub mod shaders;
use shaders::*;

use camera::Camera;
use game_loop::{GameLoop, GameState};
use map::{Map, Terrain};
use network::{ClientInterpolator, NetworkManager};
use wasm_bindgen::prelude::*;
use web_sys::{
    window, HtmlCanvasElement, WebGl2RenderingContext, WebGlBuffer, WebGlProgram, WebGlShader,
    WebGlVertexArrayObject, WebGlContextAttributes,
};

const ELEVATION_SCALE: f32 = 0.5;


/// Compute the shared day_light value from day_phase (0.0–1.0).
#[allow(dead_code)]
/// Mirrors the GLSL sin+smoothstep formula used in day_light_glsl_u/day_light_glsl_v.
/// day_phase: 0.0=midnight, 0.5=noon, 1.0=next midnight
/// Returns value in 0.0-1.0 range (Hermite smoothstep of a sine wave).
fn compute_day_light(day_phase: f64) -> f32 {
    let p = day_phase as f32;
    let raw = 0.5 + 0.5 * ((p - 0.25) * std::f32::consts::TAU).sin();
    // Hermite smoothstep: t^2 * (3 - 2*t)
    raw * raw * (3.0 - 2.0 * raw)
}

/// Compute sky background color from day_phase (0.0–1.0 over a 300s day cycle).
/// Returns (r, g, b) in 0.0–1.0 range.
/// Phase 7: Physically-based Rayleigh/Mie atmospheric scattering model.
///
/// Rayleigh scattering (~1/λ⁴): molecular scattering dominates blue sky at noon.
/// Mie scattering (~constant): aerosol haze adds warm tones near the sun/horizon.
/// Both depend on optical air mass (path length through atmosphere) which increases
/// at low sun elevations, causing reddening at sunrise/sunset as blue light
/// is scattered away.
fn sky_color(day_phase: f64) -> (f32, f32, f32) {
    let dp = day_phase as f32;
    let sun_angle = (dp - 0.25) * std::f32::consts::TAU;
    let sun_elev = sun_angle.sin();

    // Clamp near-zero sun elevation to avoid f32 sin(π) imprecision
    // (sin(π) ≈ -8.7e-8 instead of exactly 0.0 in f32)
    let sun_elev = if sun_elev.abs() < 1e-6 { 0.0 } else { sun_elev };

    // Night: very dark blue, no direct sunlight
    if sun_elev < -0.35 {
        return (0.015, 0.025, 0.06);
    }

    // Twilight: sun below horizon but upper atmosphere still illuminated.
    // Gradual transition from dark night to dawn sky colors.
    let twilight = if sun_elev < 0.0 {
        // sun_elev in [-0.35, 0.0): atmosphere glow increases toward horizon.
        // Clamped to [0.0, 1.0] for safe blending.
        ((sun_elev + 0.35) / 0.35).clamp(0.0, 1.0)
    } else {
        0.0
    };

    // Air mass: optical path length through atmosphere relative to zenith.
    // Numerator softened to avoid division blow-up near horizon.
    let effective_elev = if sun_elev > 0.0 { sun_elev } else { 0.0 };
    let airmass = 1.0 / (effective_elev.max(0.02) + 0.08);

    // Rayleigh optical depth per channel (artistic scaling for visible effect).
    // τ ∝ 1/λ⁴: blue ≈ 5.5× red, green ≈ 2.3× red.
    let tau_r: f32 = airmass * 0.6;
    let tau_g: f32 = airmass * 1.4;
    let tau_b: f32 = airmass * 3.3;

    // Rayleigh single scattering: 1 - e^(-τ).
    // At low airmass (noon): blue scatters strongly → blue sky.
    // At high airmass: all channels approach saturation → grey/white at horizon.
    let r_scatter = 1.0 - (-tau_r).exp();
    let g_scatter = 1.0 - (-tau_g).exp();
    let b_scatter = 1.0 - (-tau_b).exp();

    // Sun illumination reaching the zenith atmosphere.
    // At high sun: full illumination. At low sun: attenuated by long path.
    let sun_path_ext = (-0.06 * airmass).exp();

    // Mie scattering: wavelength-independent aerosol haze.
    // Stronger at low sun angles (high airmass).
    let mie_tau = airmass * 0.08;
    let mie_scatter = 1.0 - (-mie_tau).exp();

    // Compose: Rayleigh (blue sky) + Mie (warm haze)
    // Modulated by how much sunlight reaches the scattering volume.
    // Illumination reaching the scattering volume.
    // Night baseline evens out the transition from hardcoded night return
    // to twilight: at sun_elev=-0.35, twilight=0 → illum≈0.015 (≈night level).
    let night_base: f32 = 0.020;
    let illum = if twilight > 0.0 {
        // Blend night base into full twilight glow
        night_base + twilight * 0.10
    } else {
        night_base + sun_path_ext
    };

    let mut r = (r_scatter * illum * 0.85 + mie_scatter * illum * 0.28).min(1.0);
    let mut g = (g_scatter * illum * 1.10 + mie_scatter * illum * 0.12).min(1.0);
    let b = (b_scatter * illum * 1.30 + mie_scatter * illum * 0.05).min(1.0);

    // Sunset/dawn glow: warm horizon boost when sun is near/below horizon
    if sun_elev < 0.15 {
        let horizon_t = if sun_elev > 0.0 {
            1.0 - sun_elev / 0.15
        } else if sun_elev > -0.08 {
            1.0 + sun_elev / 0.08
        } else {
            0.0
        };
        let glow = horizon_t * horizon_t * (illum + twilight * 0.5) * 0.60;
        r = (r + glow * 1.2).min(1.0);
        g = (g + glow * 0.35).min(1.0);
    }

    (r, g, b)
}

// ── Application State ─────────────────────────────────────────────────────────

static mut APP: Option<App> = None;

/// GPU buffers for a single uploaded 3D model mesh.
/// Each model gets its own VAO + index buffer so per-model draw calls work correctly.
#[allow(dead_code)]
struct GpuModel {
    vao: WebGlVertexArrayObject,
    index_buffer: WebGlBuffer,
    index_count: i32,
    material: model::Material,
}

struct App {
    gl: WebGl2RenderingContext,
    program: WebGlProgram,
    vao: WebGlVertexArrayObject,
    position_buffer: WebGlBuffer,
    color_buffer: WebGlBuffer,
    elevation_buffer: WebGlBuffer,
    resource_buffer: WebGlBuffer,
    slope_buffer: WebGlBuffer,
    edge_buffer: WebGlBuffer,
    index_buffer: WebGlBuffer,

    resolution_loc: web_sys::WebGlUniformLocation,
    time_loc: web_sys::WebGlUniformLocation,
    camera_center_loc: web_sys::WebGlUniformLocation,
    zoom_loc: web_sys::WebGlUniformLocation,
    day_phase_loc: web_sys::WebGlUniformLocation,

    index_count: i32,
    start_time: f64,

    // Map data
    map: Map,

    // Camera
    camera: Camera,

    // Mouse state for panning
    mouse_down: bool,
    last_mouse_x: f32,
    last_mouse_y: f32,

    // Rebuild flag: set true when map/camera changes require mesh rebuild
    mesh_dirty: bool,
    // Map editor grid overlay toggle
    editor_grid: bool,

    // Game loop (tick-based simulation)
    game_loop: GameLoop,

    fps_frame_count: u32,
    fps_last_time: f64,
    current_fps: u32,
    last_frame_time_ms: f32,
    draw_call_count: u32,

    // FPS benchmarking stats (min/max/avg over session)
    fps_min: u32,
    fps_max: u32,
    fps_accum: f64,
    fps_sample_count: u64,
    fps_visible: bool,
    // Frametime ring buffer for histogram display
    frame_times: Vec<f32>,
    frame_time_write_idx: usize,
    // Overlay (buildings + units) rendering
    overlay_program: WebGlProgram,
    overlay_vao: WebGlVertexArrayObject,
    overlay_pos_buffer: WebGlBuffer,
    overlay_color_buffer: WebGlBuffer,
    overlay_size_buffer: WebGlBuffer,
    overlay_resolution_loc: web_sys::WebGlUniformLocation,
    overlay_camera_center_loc: web_sys::WebGlUniformLocation,
    overlay_zoom_loc: web_sys::WebGlUniformLocation,
    overlay_player_rgb_loc: Option<web_sys::WebGlUniformLocation>,
    overlay_index_count: i32,
    overlay_dirty: bool,

    // Network and client-side interpolation
    network_manager: NetworkManager,
    interpolator: ClientInterpolator,
    last_frame_ms: f64,

    // Game speed control (1.0 = normal, 2.0 = double, 4.0 = quadruple)
    speed_multiplier: f64,
    // Pause state
    paused: bool,
    // Day/night cycle override (None = use game time, Some(0.0-1.0) = fixed phase)
    day_phase_override: Option<f64>,
    // Terrain texture support (texture created + managed by JS)
    terrain_tex_loc: Option<web_sys::WebGlUniformLocation>,
    use_textures_loc: Option<web_sys::WebGlUniformLocation>,
    uvs_buffer: Option<WebGlBuffer>,
    terrain_id_buffer: Option<WebGlBuffer>,
    visibility_buffer: Option<WebGlBuffer>,
    normal_buffer: Option<WebGlBuffer>,
    textures_loaded: bool,
    fog_color_loc: Option<web_sys::WebGlUniformLocation>,
    // Phase 5: Orbital camera VP matrix
    vp_loc: Option<web_sys::WebGlUniformLocation>,
    use_vp_loc: Option<web_sys::WebGlUniformLocation>,
    // Fragment shader light direction
    light_dir_loc: Option<web_sys::WebGlUniformLocation>,
    // Phase 7: Volumetric light beams (god rays)
    sun_dir_loc: Option<web_sys::WebGlUniformLocation>,
    god_ray_strength_loc: Option<web_sys::WebGlUniformLocation>,
    // Splat-map buffer
    splat_buffer: Option<WebGlBuffer>,
    // Ambient occlusion buffer
    ao_buffer: Option<WebGlBuffer>,
    // Water normal map texture uniforms
    water_normal_loc: Option<web_sys::WebGlUniformLocation>,
    water_normal_ready_loc: Option<web_sys::WebGlUniformLocation>,
    water_normal_ready: bool,
    // Water animation time uniform
    water_time_loc: Option<web_sys::WebGlUniformLocation>,
    // ── Phase 5 Step 8: Model 3D rendering ──────────────────────────
    model_program: Option<WebGlProgram>,
    /// Per-model GPU buffers (VAO + index buffer + index count), keyed by model_id
    gpu_models: std::collections::HashMap<u8, GpuModel>,
    /// Cached model mesh data for re-upload after WebGL context loss/restore.
    /// Stores the parsed ModelMesh keyed by model_id so models can be
    /// re-uploaded to GPU after reinit_webgl() without JS intervention.
    model_mesh_cache: std::collections::HashMap<u8, model::ModelMesh>,
    /// Shared vertex buffer for all models (positions/normals/UVs) — overwritten on each upload
    model_pos_buffer: Option<WebGlBuffer>,
    model_normal_buffer: Option<WebGlBuffer>,
    model_uv_buffer: Option<WebGlBuffer>,
    model_model_loc: Option<web_sys::WebGlUniformLocation>,
    model_view_pos_loc: Option<web_sys::WebGlUniformLocation>,
    model_light_dir_loc: Option<web_sys::WebGlUniformLocation>,
    model_color_loc: Option<web_sys::WebGlUniformLocation>,
    model_roughness_loc: Option<web_sys::WebGlUniformLocation>,
    model_metallic_loc: Option<web_sys::WebGlUniformLocation>,
    /// Model instances to render this frame
    model_instances: Vec<model::ModelInstance>,
    // Instanced rendering: per-instance model matrix buffer (4 vec4 = 16 floats per instance)
    model_instance_buffer: Option<WebGlBuffer>,
    // Per-instance offset buffer (3 floats for x,y,z offset)
    model_offset_buffer: Option<WebGlBuffer>,
    model_vp_loc: Option<web_sys::WebGlUniformLocation>,
    model_use_instanced_loc: Option<web_sys::WebGlUniformLocation>,
    model_time_loc: Option<web_sys::WebGlUniformLocation>,
    model_anim_phase_buffer: Option<WebGlBuffer>,
    model_terrain_tex_loc: Option<web_sys::WebGlUniformLocation>,
    model_use_textures_loc: Option<web_sys::WebGlUniformLocation>,
    model_day_phase_loc: Option<web_sys::WebGlUniformLocation>,
    // ── Phase 7: Shadow rendering ─────────────────────────────────────────
    shadow_program: Option<WebGlProgram>,
    shadow_vao: Option<WebGlVertexArrayObject>,
    shadow_vp_loc: Option<web_sys::WebGlUniformLocation>,
    shadow_light_dir_loc: Option<web_sys::WebGlUniformLocation>,
    shadow_instance_pos_loc: Option<web_sys::WebGlUniformLocation>,
    shadow_size_loc: Option<web_sys::WebGlUniformLocation>,
    shadow_penumbra_loc: Option<web_sys::WebGlUniformLocation>,
    // ── Phase 6: Particle System ──────────────────────────────────────────
    particle_system: particle::ParticleSystem,
    /// Sound event counters — drained each frame by JS for audio playback
    recent_death_count: u32,
    recent_combat_count: u32,
    /// Building construction completions this frame — drained by JS for sound playback
    recent_construction_complete_count: u32,
    /// Resource production events this frame — drained by JS for sound playback
    recent_resource_pickup_count: u32,
    // ── Phase 7: Cloud layer rendering ─────────────────────────────────────
    cloud_program: Option<WebGlProgram>,
    cloud_vao: Option<WebGlVertexArrayObject>,
    cloud_pos_buffer: Option<WebGlBuffer>,
    cloud_size_buffer: Option<WebGlBuffer>,
    cloud_alpha_buffer: Option<WebGlBuffer>,
    cloud_vp_loc: Option<web_sys::WebGlUniformLocation>,
    cloud_parallax_loc: Option<web_sys::WebGlUniformLocation>,
    cloud_day_phase_loc: Option<web_sys::WebGlUniformLocation>,
    // — Phase 7: Sun/Moon disc rendering ———————————————————————
    sun_moon_program: Option<WebGlProgram>,
    sun_moon_vao: Option<WebGlVertexArrayObject>,
    sun_moon_day_phase_loc: Option<web_sys::WebGlUniformLocation>,
    sun_moon_is_moon_loc: Option<web_sys::WebGlUniformLocation>,
    sun_moon_screen_pos_loc: Option<web_sys::WebGlUniformLocation>,
    sun_moon_radius_loc: Option<web_sys::WebGlUniformLocation>,

    // ── Phase 7: Lightning flashes ─────────────────────────────────────────
    lightning_flash: f32,
    lightning_timer: f32,
    lightning_loc: Option<web_sys::WebGlUniformLocation>,

    // ── Phase 7: Water reflection ──────────────────────────────────────────
    reflection_fbo: Option<web_sys::WebGlFramebuffer>,
    reflection_tex: Option<web_sys::WebGlTexture>,
    reflection_depth: Option<web_sys::WebGlRenderbuffer>,
    reflection_w: i32,
    reflection_h: i32,
    reflection_tex_loc: Option<web_sys::WebGlUniformLocation>,
    reflection_pass_loc: Option<web_sys::WebGlUniformLocation>,
    reflection_horizon_y_loc: Option<web_sys::WebGlUniformLocation>,
    context_lost: bool,
    /// First-frame diagnostic has fired (debug logging)
    first_frame_diag_done: bool,
    /// Debug toggle: show full map (bypass fog of war)
    show_full_map: bool,

}
// ── Mesh Data ─────────────────────────────────────────────────────────────────

struct MeshData {
    positions: Vec<f32>,
    colors: Vec<f32>,
    elevations: Vec<f32>,
    has_resources: Vec<f32>,
    slopes: Vec<f32>,
    edge_dists: Vec<f32>,
    visibilities: Vec<f32>,
    normals: Vec<f32>,
    uvs: Vec<f32>,
    terrain_ids: Vec<f32>,
    /// Splat-map weights: 4 floats per vertex (R=grass, G=rock, B=sand, A=snow)
    splats: Vec<f32>,
    /// Ambient occlusion: 1.0 = fully lit, lower = darker at cliff bases
    ao_factors: Vec<f32>,
    indices: Vec<u16>,
}

impl MeshData {
    fn new() -> Self {
        MeshData {
            positions: Vec::new(),
            colors: Vec::new(),
            elevations: Vec::new(),
            has_resources: Vec::new(),
            slopes: Vec::new(),
            edge_dists: Vec::new(),
            visibilities: Vec::new(),
            normals: Vec::new(),
            uvs: Vec::new(),
            terrain_ids: Vec::new(),
            splats: Vec::new(),
            ao_factors: Vec::new(),
            indices: Vec::new(),
        }
    }
}

fn build_map_mesh(map: &Map, camera: &Camera) -> MeshData {
    build_map_mesh_lod(map, camera, 8, 20)
}
/// Build a terrain mesh with multi-level LOD (Level of Detail).
///
/// Tiles close to the camera center use full resolution (1 vertex per tile).
/// Medium-distance tiles are rendered at half resolution (2x2 tiles per quad).
/// Far-distance tiles are rendered at quarter resolution (4x4 tiles per quad).
///
/// # Arguments
/// * `map` — the game map
/// * `camera` — the camera (used to determine visible bounds and LOD center)
/// * `lod1_radius` — distance in tiles within which full-resolution (LOD 0) is used
/// * `lod2_radius` — distance in tiles within which half-resolution (LOD 1) is used;
///   beyond this, quarter-resolution (LOD 2) is used
fn build_map_mesh_lod(
    map: &Map,
    camera: &Camera,
    lod1_radius: usize,
    lod2_radius: usize,
) -> MeshData {
    let mut mesh = MeshData::new();
    let (min_x, max_x, min_y, max_y) = camera.visible_bounds(map.width, map.height);

    if max_x < min_x || max_y < min_y {
        return mesh;
    }

    let extra = 2usize;
    let min_x = min_x.saturating_sub(extra);
    let max_x = (max_x + extra).min(map.width.saturating_sub(2));
    let min_y = min_y.saturating_sub(extra);
    let max_y = (max_y + extra).min(map.height.saturating_sub(2));

    if max_x < min_x || max_y < min_y {
        return mesh;
    }

    let cam_cx = camera.center_x;
    let cam_cy = camera.center_y;

    let lod_level = |tx: usize, ty: usize| -> u8 {
        let dx = (tx as f32 - cam_cx).abs();
        let dy = (ty as f32 - cam_cy).abs();
        let dist = dx.max(dy);
        if dist <= lod1_radius as f32 { 0 }
        else if dist <= lod2_radius as f32 { 1 }
        else { 2 }
    };

    let rows_total = max_y - min_y + 1;
    let cols_total = max_x - min_x + 1;
    let grid_rows = rows_total + 1;
    let grid_cols = cols_total + 1;

    // Helper: emit splat weights for a tile
    fn emit_splat(
        mesh: &mut MeshData,
        map: &Map,
        terrain: Terrain,
        slope_val: f32,
        mx: usize,
        my: usize,
    ) {
        let base_splat = |t: Terrain, slope: f32| -> (f32, f32, f32, f32) {
            let mut r = 0.0f32;
            let mut g = 0.0f32;
            let mut b = 0.0f32;
            let mut a = 0.0f32;
            match t {
                Terrain::Grass | Terrain::Forest => {
                    let rock = ((slope - 0.15) / 0.3).clamp(0.0, 1.0);
                    r = 1.0 - rock; g = rock;
                }
                Terrain::Mountain => {
                    let rock = if slope > 0.3 { 1.0 } else { 0.8 };
                    g = rock; r = 1.0 - rock;
                }
                Terrain::Desert | Terrain::Swamp => { b = 0.8; r = 0.2; }
                Terrain::Snow => { a = 1.0; }
                Terrain::Water | Terrain::DeepWater => { b = 0.5; g = 0.3; r = 0.2; }
            }
            let sum = r + g + b + a;
            if sum > 0.0 { (r/sum, g/sum, b/sum, a/sum) } else { (r, g, b, a) }
        };

        let mut tr = 0.0f32; let mut tg = 0.0f32;
        let mut tb = 0.0f32; let mut ta = 0.0f32;
        let mut ws = 0.0f32;

        let (cr, cg, cb, ca) = base_splat(terrain, slope_val);
        tr += cr; tg += cg; tb += cb; ta += ca; ws += 1.0;

        for &(ndx, ndy) in &[(0isize, -1isize), (1, 0), (0, 1), (-1, 0)] {
            let nx = mx as isize + ndx;
            let ny = my as isize + ndy;
            if nx >= 0 && ny >= 0 && (nx as usize) < map.width && (ny as usize) < map.height {
                let neighbor = map.get(nx as usize, ny as usize).unwrap();
                if neighbor.terrain != terrain {
                    let mut nmd = 0.0f32;
                    for ndy2 in [-1isize, 0, 1] {
                        for ndx2 in [-1isize, 0, 1] {
                            if ndx2 == 0 && ndy2 == 0 { continue; }
                            let nnx = nx + ndx2; let nny = ny + ndy2;
                            if nnx >= 0 && nny >= 0 && (nnx as usize) < map.width && (nny as usize) < map.height {
                                let nn_e = map.get(nnx as usize, nny as usize).unwrap().elevation;
                                let d = (neighbor.elevation - nn_e).abs();
                                if d > nmd { nmd = d; }
                            }
                        }
                    }
                    let (nr, ng, nb, na) = base_splat(neighbor.terrain, nmd);
                    tr += nr * 0.5; tg += ng * 0.5; tb += nb * 0.5; ta += na * 0.5; ws += 0.5;
                }
            }
        }

        let sr = if ws > 0.0 { tr / ws } else { 0.0 };
        let sg = if ws > 0.0 { tg / ws } else { 0.0 };
        let sb = if ws > 0.0 { tb / ws } else { 0.0 };
        let sa = if ws > 0.0 { ta / ws } else { 0.0 };
        mesh.splats.push(sr); mesh.splats.push(sg); mesh.splats.push(sb); mesh.splats.push(sa);
    }

    // Emit a single vertex for tile (mx, my)
    let emit_v = |mesh: &mut MeshData, mx: usize, my: usize| -> u16 {
        let tile = map.get(mx, my).unwrap();
        let idx = (mesh.positions.len() / 3) as u16;

        mesh.positions.push(mx as f32);
        mesh.positions.push(tile.elevation * ELEVATION_SCALE);
        mesh.positions.push(my as f32);

        let c = tile.terrain.color();
        mesh.colors.push(c[0]); mesh.colors.push(c[1]); mesh.colors.push(c[2]);
        mesh.elevations.push(tile.elevation);
        mesh.has_resources.push(if tile.resource.is_some() { 1.0 } else { 0.0 });

        let mut max_diff = 0.0f32;
        for dy in [-1isize, 0, 1] { for dx in [-1isize, 0, 1] {
            if dx == 0 && dy == 0 { continue; }
            let nx = mx as isize + dx; let ny = my as isize + dy;
            if nx >= 0 && ny >= 0 && (nx as usize) < map.width && (ny as usize) < map.height {
                let d = (tile.elevation - map.get(nx as usize, ny as usize).unwrap().elevation).abs();
                if d > max_diff { max_diff = d; }
            }
        }}
        mesh.slopes.push(max_diff);

        let mut ao = 1.0f32;
        for dy in [-1isize, 0, 1] { for dx in [-1isize, 0, 1] {
            if dx == 0 && dy == 0 { continue; }
            let nx = mx as isize + dx; let ny = my as isize + dy;
            if nx >= 0 && ny >= 0 && (nx as usize) < map.width && (ny as usize) < map.height {
                let ed = map.get(nx as usize, ny as usize).unwrap().elevation - tile.elevation;
                if ed > 0.0 { ao -= ed * 0.08; }
            }
        }}
        mesh.ao_factors.push(ao.max(0.55));

        let edge_x = (mx as f32).min(map.width as f32 - 1.0 - mx as f32);
        let edge_y = (my as f32).min(map.height as f32 - 1.0 - my as f32);
        mesh.edge_dists.push(edge_x.min(edge_y));

        mesh.uvs.push((mx % 4) as f32 / 4.0);
        mesh.uvs.push((my % 4) as f32 / 4.0);
        mesh.terrain_ids.push(tile.terrain as u8 as f32);
        mesh.visibilities.push(tile.visibility);

        let hs = ELEVATION_SCALE;
        let hc = tile.elevation * hs;
        let gh = |x: isize, y: isize| -> f32 {
            if x >= 0 && y >= 0 && (x as usize) < map.width && (y as usize) < map.height {
                map.get(x as usize, y as usize).unwrap().elevation * hs
            } else { hc }
        };
        let nx_n = -(gh(mx as isize + 1, my as isize) - gh(mx as isize - 1, my as isize)) / 2.0;
        let nz_n = -(gh(mx as isize, my as isize + 1) - gh(mx as isize, my as isize - 1)) / 2.0;
        let ny_n = 1.0;
        let nl = (nx_n*nx_n + ny_n*ny_n + nz_n*nz_n).sqrt();
        if nl > 1e-10 {
            mesh.normals.push(nx_n/nl); mesh.normals.push(ny_n/nl); mesh.normals.push(nz_n/nl);
        } else {
            mesh.normals.push(0.0); mesh.normals.push(1.0); mesh.normals.push(0.0);
        }

        emit_splat(mesh, map, tile.terrain, max_diff, mx, my);
        idx
    };

    // Build vertex grid: determine which grid positions get vertices
    let mut vertex_grid: Vec<Option<u16>> = vec![None; grid_cols * grid_rows];

    for row in 0..grid_rows {
        for col in 0..grid_cols {
            let mx = min_x + col;
            let my = min_y + row;
            let lod = lod_level(mx, my);

            let should_emit = match lod {
                0 => true,
                1 => col % 2 == 0 && row % 2 == 0,
                2 => col % 4 == 0 && row % 4 == 0,
                _ => false,
            };

            if should_emit {
                let vidx = emit_v(&mut mesh, mx, my);
                vertex_grid[row * grid_cols + col] = Some(vidx);
            }
        }
    }

    // Emit triangles for LOD 0 blocks (1x1 tiles)
    for row in 0..rows_total {
        for col in 0..cols_total {
            let mx = min_x + col; let my = min_y + row;
            if lod_level(mx, my) != 0 { continue; }
            let tl = vertex_grid[row * grid_cols + col];
            let tr = vertex_grid[row * grid_cols + col + 1];
            let bl = vertex_grid[(row + 1) * grid_cols + col];
            let br = vertex_grid[(row + 1) * grid_cols + col + 1];
            if let (Some(tl), Some(tr), Some(bl), Some(br)) = (tl, tr, bl, br) {
                mesh.indices.extend_from_slice(&[tl, bl, tr, tr, bl, br]);
            }
        }
    }

    // Emit triangles for LOD 1 blocks (2x2 tiles)
    for row in (0..rows_total).step_by(2) {
        for col in (0..cols_total).step_by(2) {
            let mx = min_x + col; let my = min_y + row;
            if lod_level(mx, my) != 1 { continue; }
            let r1 = row;
            let r2 = (row + 2).min(grid_rows - 1);
            let c1 = col;
            let c2 = (col + 2).min(grid_cols - 1);
            let tl = vertex_grid[r1 * grid_cols + c1];
            let tr = vertex_grid[r1 * grid_cols + c2];
            let bl = vertex_grid[r2 * grid_cols + c1];
            let br = vertex_grid[r2 * grid_cols + c2];
            if let (Some(tl), Some(tr), Some(bl), Some(br)) = (tl, tr, bl, br) {
                mesh.indices.extend_from_slice(&[tl, bl, tr, tr, bl, br]);
            }
        }
    }

    // Emit triangles for LOD 2 blocks (4x4 tiles)
    for row in (0..rows_total).step_by(4) {
        for col in (0..cols_total).step_by(4) {
            let mx = min_x + col; let my = min_y + row;
            if lod_level(mx, my) < 2 { continue; }
            let r1 = row;
            let r2 = (row + 4).min(grid_rows - 1);
            let c1 = col;
            let c2 = (col + 4).min(grid_cols - 1);
            let tl = vertex_grid[r1 * grid_cols + c1];
            let tr = vertex_grid[r1 * grid_cols + c2];
            let bl = vertex_grid[r2 * grid_cols + c1];
            let br = vertex_grid[r2 * grid_cols + c2];
            if let (Some(tl), Some(tr), Some(bl), Some(br)) = (tl, tr, bl, br) {
                mesh.indices.extend_from_slice(&[tl, bl, tr, tr, bl, br]);
            }
        }
    }

    mesh
}

// ── App Implementation ────────────────────────────────────────────────────────

impl App {
    fn new(canvas: &HtmlCanvasElement) -> Result<App, JsValue> {
        let context_options = WebGlContextAttributes::new();
        context_options.set_preserve_drawing_buffer(true);
        let gl = canvas
            .get_context_with_context_options("webgl2", context_options.as_ref())?
            .ok_or("WebGL2 not available")?
            .dyn_into::<WebGl2RenderingContext>()?;

        // Compile shaders
        let vert = compile_shader(&gl, WebGl2RenderingContext::VERTEX_SHADER, VERTEX_SHADER, "terrain_vertex")?;
        let frag = compile_shader(
            &gl,
            WebGl2RenderingContext::FRAGMENT_SHADER,
            FRAGMENT_SHADER,
            "terrain_fragment",
        )?;
        let program = link_program(&gl, &vert, &frag)?;

        // Generate demo map (64×64 tiles)
        let map = Map::generate_demo(64, 64);

        // Camera starts centered on map
        let camera = Camera::new(
            map.width as f32 * 0.5,
            map.height as f32 * 0.5,
            canvas.width(),
            canvas.height(),
        );

        // Build initial mesh
        let mesh = build_map_mesh(&map, &camera);

        // Create VAO and upload buffers
        let vao = gl.create_vertex_array().ok_or("Cannot create VAO")?;
        gl.bind_vertex_array(Some(&vao));

        let position_buffer = upload_f32_buffer(&gl, &mesh.positions, 0, 3);
        let color_buffer = upload_f32_buffer(&gl, &mesh.colors, 1, 3);
        let elevation_buffer = upload_f32_buffer(&gl, &mesh.elevations, 2, 1);
        let resource_buffer = upload_f32_buffer(&gl, &mesh.has_resources, 3, 1);
        let slope_buffer = upload_f32_buffer(&gl, &mesh.slopes, 4, 1);
        let edge_buffer = upload_f32_buffer(&gl, &mesh.edge_dists, 5, 1);
        let uvs_buffer = upload_f32_buffer(&gl, &mesh.uvs, 6, 2);
        let terrain_id_buffer = upload_f32_buffer(&gl, &mesh.terrain_ids, 7, 1);
        let visibility_buffer = upload_f32_buffer(&gl, &mesh.visibilities, 8, 1);
        let normal_buffer = upload_f32_buffer(&gl, &mesh.normals, 9, 3);
        let splat_buffer = upload_f32_buffer(&gl, &mesh.splats, 10, 4);
        let ao_buffer = upload_f32_buffer(&gl, &mesh.ao_factors, 11, 1);
        let index_buffer = gl.create_buffer().ok_or("Cannot create index buffer")?;
        gl.bind_buffer(
            WebGl2RenderingContext::ELEMENT_ARRAY_BUFFER,
            Some(&index_buffer),
        );
        unsafe {
            let view = js_sys::Uint16Array::view(&mesh.indices);
            gl.buffer_data_with_array_buffer_view(
                WebGl2RenderingContext::ELEMENT_ARRAY_BUFFER,
                &view,
                WebGl2RenderingContext::STATIC_DRAW,
            );
        }

        gl.bind_vertex_array(None);

        let resolution_loc = gl
            .get_uniform_location(&program, "u_resolution")
            .ok_or("Cannot find u_resolution")?;
        let time_loc = gl
            .get_uniform_location(&program, "u_time")
            .ok_or("Cannot find u_time")?;
        let camera_center_loc = gl
            .get_uniform_location(&program, "u_camera_center")
            .ok_or("Cannot find u_camera_center")?;
        let zoom_loc = gl
            .get_uniform_location(&program, "u_zoom")
            .ok_or("Cannot find u_zoom")?;
        let terrain_tex_loc = gl.get_uniform_location(&program, "u_terrain_textures");
        let use_textures_loc = gl.get_uniform_location(&program, "u_use_textures");
        let fog_color_loc = gl.get_uniform_location(&program, "u_fog_color");
        let vp_loc = gl.get_uniform_location(&program, "u_vp");
        let use_vp_loc = gl.get_uniform_location(&program, "u_use_vp");
        let light_dir_loc = gl.get_uniform_location(&program, "u_light_direction");
        let water_time_loc = gl.get_uniform_location(&program, "u_water_time");
        let lightning_loc = gl.get_uniform_location(&program, "u_lightning");
        let water_normal_loc = gl.get_uniform_location(&program, "u_water_normal");
        let water_normal_ready_loc = gl.get_uniform_location(&program, "u_water_normal_ready");
        let reflection_tex_loc = gl.get_uniform_location(&program, "u_reflection_tex");
        let reflection_pass_loc = gl.get_uniform_location(&program, "u_reflection_pass");
        let reflection_horizon_y_loc = gl.get_uniform_location(&program, "u_reflection_horizon_y");
        let sun_dir_loc = gl.get_uniform_location(&program, "u_sun_dir");
        let god_ray_strength_loc = gl.get_uniform_location(&program, "u_god_ray_strength");
        let day_phase_loc = gl
            .get_uniform_location(&program, "u_day_phase")
            .ok_or("Cannot find u_day_phase")?;
        // ── Phase 5 Step 8: Initialize model rendering ──────────────
        let model_program = compile_shader(
            &gl,
            WebGl2RenderingContext::VERTEX_SHADER,
            MODEL_VERTEX_SHADER,
            "model_vertex",
        )
        .and_then(|vert| {
            compile_shader(
                &gl,
                WebGl2RenderingContext::FRAGMENT_SHADER,
                MODEL_FRAGMENT_SHADER,
                "model_fragment",
            )
            .and_then(|frag| link_program(&gl, &vert, &frag))
        })
        .ok();

        let (model_pos_buffer, model_normal_buffer, model_uv_buffer,
             model_model_loc, model_view_pos_loc, model_light_dir_loc,
             model_color_loc, model_roughness_loc, model_metallic_loc,
             model_instance_buffer, model_offset_buffer, model_vp_loc, model_use_instanced_loc,
             model_time_loc, model_anim_phase_buffer,
             model_terrain_tex_loc, model_use_textures_loc,
             model_day_phase_loc) = 
            if let Some(ref prog) = model_program {
                let pos_buf = gl.create_buffer();
                let norm_buf = gl.create_buffer();
                let uv_buf = gl.create_buffer();
                let inst_buf = gl.create_buffer();
                let offs_buf = gl.create_buffer();
                let time_loc = gl.get_uniform_location(prog, "u_time");
                let anim_buf = gl.create_buffer();
                (
                    pos_buf, norm_buf, uv_buf,
                    gl.get_uniform_location(prog, "u_model"),
                    gl.get_uniform_location(prog, "u_view_pos"),
                    gl.get_uniform_location(prog, "u_light_dir"),
                    gl.get_uniform_location(prog, "u_model_color"),
                    gl.get_uniform_location(prog, "u_roughness"),
                    gl.get_uniform_location(prog, "u_metallic"),
                    inst_buf,
                    offs_buf,
                    gl.get_uniform_location(prog, "u_vp"),
                    gl.get_uniform_location(prog, "u_use_instanced"),
                    time_loc,
                    anim_buf,
                    gl.get_uniform_location(prog, "u_terrain_textures"),
                    gl.get_uniform_location(prog, "u_use_textures"),
                    gl.get_uniform_location(prog, "u_day_phase"),
                )
            } else {
                (None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, None, None)
            };

        // ── Phase 7: Shadow program ──────────────────────────
        let shadow_shader_verts: [f32; 12] = [
            -1.0, -1.0,  1.0, -1.0,  1.0,  1.0,  // tri 1
            -1.0, -1.0,  1.0,  1.0, -1.0,  1.0,  // tri 2
        ];
        let (shadow_program, shadow_vao,
             shadow_vp_loc, shadow_light_dir_loc, shadow_instance_pos_loc, shadow_size_loc, _shadow_penumbra_loc) =
            compile_shader(&gl, WebGl2RenderingContext::VERTEX_SHADER, SHADOW_VERTEX_SHADER, "shadow_vertex")
            .and_then(|vert| {
                compile_shader(&gl, WebGl2RenderingContext::FRAGMENT_SHADER, SHADOW_FRAGMENT_SHADER, "shadow_fragment")
                .and_then(|frag| link_program(&gl, &vert, &frag))
            })
            .map(|prog| {
                let vao = gl.create_vertex_array();
                gl.bind_vertex_array(vao.as_ref());
                gl.use_program(Some(&prog));
                let quad_buf = gl.create_buffer();
                gl.bind_buffer(WebGl2RenderingContext::ARRAY_BUFFER, quad_buf.as_ref());
                unsafe {
                    let view = js_sys::Float32Array::view(&shadow_shader_verts);
                    gl.buffer_data_with_array_buffer_view(
                        WebGl2RenderingContext::ARRAY_BUFFER, &view,
                        WebGl2RenderingContext::STATIC_DRAW,
                    );
                }
                gl.vertex_attrib_pointer_with_i32(0, 2, WebGl2RenderingContext::FLOAT, false, 0, 0);
                gl.enable_vertex_attrib_array(0);
                let vp_loc = gl.get_uniform_location(&prog, "u_vp");
                let ld_loc = gl.get_uniform_location(&prog, "u_light_dir");
                let ip_loc = gl.get_uniform_location(&prog, "u_instance_pos");
                let sz_loc = gl.get_uniform_location(&prog, "u_shadow_size");
                let pn_loc = gl.get_uniform_location(&prog, "u_shadow_penumbra");
                gl.bind_vertex_array(None);
                (
                    Some(prog),
                    vao,
                    vp_loc,
                    ld_loc,
                    ip_loc,
                    sz_loc,
                    pn_loc,
                )
            })
            .unwrap_or((None, None, None, None, None, None, None));


        // ── Phase 7: Cloud program ──────────────────────────────────────
        let (cloud_program, cloud_vao, cloud_pos_buffer, cloud_size_buffer, cloud_alpha_buffer,
              cloud_vp_loc, cloud_parallax_loc, cloud_day_phase_loc) =
            compile_shader(&gl, WebGl2RenderingContext::VERTEX_SHADER, CLOUD_VERTEX_SHADER, "cloud_vertex")
            .and_then(|vert| {
                compile_shader(&gl, WebGl2RenderingContext::FRAGMENT_SHADER, CLOUD_FRAGMENT_SHADER, "cloud_fragment")
                .and_then(|frag| link_program(&gl, &vert, &frag))
            })
            .map(|prog| {
                let vao = gl.create_vertex_array();
                gl.bind_vertex_array(vao.as_ref());
                gl.use_program(Some(&prog));
                let pos_buf = gl.create_buffer();
                gl.bind_buffer(WebGl2RenderingContext::ARRAY_BUFFER, pos_buf.as_ref());
                gl.vertex_attrib_pointer_with_i32(0, 3, WebGl2RenderingContext::FLOAT, false, 0, 0);
                gl.enable_vertex_attrib_array(0);
                let size_buf = gl.create_buffer();
                gl.bind_buffer(WebGl2RenderingContext::ARRAY_BUFFER, size_buf.as_ref());
                gl.vertex_attrib_pointer_with_i32(1, 2, WebGl2RenderingContext::FLOAT, false, 0, 0);
                gl.enable_vertex_attrib_array(1);
                let alpha_buf = gl.create_buffer();
                gl.bind_buffer(WebGl2RenderingContext::ARRAY_BUFFER, alpha_buf.as_ref());
                gl.vertex_attrib_pointer_with_i32(2, 1, WebGl2RenderingContext::FLOAT, false, 0, 0);
                gl.enable_vertex_attrib_array(2);
                // Set instance-rate divisors for cloud position/size/alpha
                gl.vertex_attrib_divisor(0, 1);
                gl.vertex_attrib_divisor(1, 1);
                gl.vertex_attrib_divisor(2, 1);
                // Static unit-quad corner buffer (per-vertex, divisor=0 default)
                let corner_buf = gl.create_buffer();
                gl.bind_buffer(WebGl2RenderingContext::ARRAY_BUFFER, corner_buf.as_ref());
                let quad_corners: [f32; 12] = [
                    -1.0, -1.0,  1.0, -1.0,  1.0,  1.0,
                    -1.0, -1.0,  1.0,  1.0, -1.0,  1.0,
                ];
                unsafe {
                    let view = js_sys::Float32Array::view(&quad_corners);
                    gl.buffer_data_with_array_buffer_view(
                        WebGl2RenderingContext::ARRAY_BUFFER,
                        &view,
                        WebGl2RenderingContext::STATIC_DRAW,
                    );
                }
                gl.vertex_attrib_pointer_with_i32(3, 2, WebGl2RenderingContext::FLOAT, false, 0, 0);
                gl.enable_vertex_attrib_array(3);
                let vp_loc = gl.get_uniform_location(&prog, "u_vp");
                let parallax_loc = gl.get_uniform_location(&prog, "u_cam_parallax");
                let day_loc = gl.get_uniform_location(&prog, "u_day_phase");
                gl.bind_vertex_array(None);
                (Some(prog), vao, pos_buf, size_buf, alpha_buf, vp_loc, parallax_loc, day_loc)
            })
            .unwrap_or((None, None, None, None, None, None, None, None));

        // — Phase 7: Sun/Moon disc program ————————————————————————
        let (sun_moon_program, sun_moon_vao, sun_moon_day_phase_loc,
             sun_moon_is_moon_loc, sun_moon_screen_pos_loc,
             sun_moon_radius_loc) =
            compile_shader(&gl, WebGl2RenderingContext::VERTEX_SHADER, SUN_MOON_VERTEX_SHADER, "sun_moon_vertex")
            .and_then(|vert| {
                compile_shader(&gl, WebGl2RenderingContext::FRAGMENT_SHADER, SUN_MOON_FRAGMENT_SHADER, "sun_moon_fragment")
                .and_then(|frag| link_program(&gl, &vert, &frag))
            })
            .map(|prog| {
                let vao = gl.create_vertex_array();
                gl.bind_vertex_array(vao.as_ref());
                gl.use_program(Some(&prog));
                // No vertex buffers needed — full-screen quad from vertex ID
                let _vp_loc = gl.get_uniform_location(&prog, "u_vp");
                let day_loc = gl.get_uniform_location(&prog, "u_day_phase");
                let is_moon_loc = gl.get_uniform_location(&prog, "u_is_moon");
                let screen_pos_loc = gl.get_uniform_location(&prog, "u_sun_screen_pos");
                let radius_loc = gl.get_uniform_location(&prog, "u_sun_radius");
                gl.bind_vertex_array(None);
                (Some(prog), vao, day_loc, is_moon_loc, screen_pos_loc, radius_loc)
            })
            .unwrap_or((None, None, None, None, None, None));

        // Compile overlay shaders
        let overlay_vert = compile_shader(
            &gl,
            WebGl2RenderingContext::VERTEX_SHADER,
            OVERLAY_VERTEX_SHADER,
            "overlay_vertex",
        )?;
        let overlay_frag = compile_shader(
            &gl,
            WebGl2RenderingContext::FRAGMENT_SHADER,
            OVERLAY_FRAGMENT_SHADER,
            "overlay_fragment",
        )?;
        let overlay_program = link_program(&gl, &overlay_vert, &overlay_frag)?;

        // Create overlay VAO and buffers
        let overlay_vao = gl
            .create_vertex_array()
            .ok_or("Cannot create overlay VAO")?;
        gl.bind_vertex_array(Some(&overlay_vao));

        let overlay_pos_buffer = upload_f32_buffer(&gl, &[], 0, 2);
        let overlay_color_buffer = upload_f32_buffer(&gl, &[], 1, 3);
        let overlay_size_buffer = upload_f32_buffer(&gl, &[], 2, 1);

        gl.bind_vertex_array(None);

        let overlay_resolution_loc = gl
            .get_uniform_location(&overlay_program, "u_resolution")
            .ok_or("Cannot find overlay u_resolution")?;
        let overlay_camera_center_loc = gl
            .get_uniform_location(&overlay_program, "u_camera_center")
            .ok_or("Cannot find overlay u_camera_center")?;
        let overlay_zoom_loc = gl
            .get_uniform_location(&overlay_program, "u_zoom")
            .ok_or("Cannot find overlay u_zoom")?;

        let overlay_player_rgb_loc = gl.get_uniform_location(&overlay_program, "u_player_rgb");

        let start_time = window()
            .and_then(|w| w.performance())
            .map(|p| p.now())
            .unwrap_or(0.0);

        Ok(App {
            gl,
            program,
            vao,
            position_buffer,
            color_buffer,
            elevation_buffer,
            resource_buffer,
            slope_buffer,
            edge_buffer,
            index_buffer,
            resolution_loc,
            time_loc,
            camera_center_loc,
            zoom_loc,
            day_phase_loc,

            index_count: mesh.indices.len() as i32,
            start_time,
            map: map.clone(),
            camera,
            mouse_down: false,
            last_mouse_x: 0.0,
            last_mouse_y: 0.0,
            mesh_dirty: false,
            editor_grid: false,
            game_loop: GameLoop::new(GameState::new(map)),
            fps_frame_count: 0,
            fps_last_time: start_time,
            current_fps: 0,
            last_frame_time_ms: 0.0,
            draw_call_count: 0,
            fps_min: u32::MAX,
            fps_max: 0,
            fps_accum: 0.0,
            fps_sample_count: 0,
            fps_visible: true,
            frame_times: vec![0.0f32; 128],
            frame_time_write_idx: 0,
            overlay_program,
            overlay_vao,
            overlay_pos_buffer,
            overlay_color_buffer,
            overlay_size_buffer,
            overlay_resolution_loc,
            overlay_camera_center_loc,
            overlay_zoom_loc,
            overlay_player_rgb_loc,
            overlay_index_count: 0,
            overlay_dirty: true,
            network_manager: NetworkManager::new(),
            interpolator: ClientInterpolator::new(0.1), // 10 TPS → 0.1s tick duration
            last_frame_ms: 0.0,
            speed_multiplier: 1.0,
            paused: false,
            day_phase_override: None,
            terrain_tex_loc,
            use_textures_loc,
            uvs_buffer: Some(uvs_buffer),
            terrain_id_buffer: Some(terrain_id_buffer),
            visibility_buffer: Some(visibility_buffer),
            normal_buffer: Some(normal_buffer),
            textures_loaded: false,
            fog_color_loc,
            vp_loc,
            use_vp_loc,
            light_dir_loc,
            splat_buffer: Some(splat_buffer),
            ao_buffer: Some(ao_buffer),
            
            model_program,
            gpu_models: std::collections::HashMap::new(),
            model_mesh_cache: std::collections::HashMap::new(),
            model_pos_buffer,
            model_normal_buffer,
            model_uv_buffer,
            model_model_loc,
            model_view_pos_loc,
            model_light_dir_loc,
            model_color_loc,
            model_roughness_loc,
            model_metallic_loc,
            model_instances: Vec::new(),
            model_instance_buffer,
            model_offset_buffer,
            model_vp_loc,
            model_use_instanced_loc,
            model_time_loc,
            model_anim_phase_buffer,
            model_terrain_tex_loc,
            model_use_textures_loc,
            model_day_phase_loc,
            // ── Phase 7: Shadow rendering
            shadow_program,
            shadow_vao,
            shadow_vp_loc,
            shadow_light_dir_loc,
            shadow_instance_pos_loc,
            shadow_size_loc,
            shadow_penumbra_loc: _shadow_penumbra_loc,
            water_normal_loc,
            water_normal_ready_loc,
            water_normal_ready: false,
            water_time_loc,
            // ── Phase 7: Cloud layer rendering
            cloud_program,
            cloud_vao,
            cloud_pos_buffer,
            cloud_size_buffer,
            cloud_alpha_buffer,
            cloud_vp_loc,
            cloud_parallax_loc,
            cloud_day_phase_loc,
            // — Phase 7: Sun/Moon disc rendering
            sun_moon_program,
            sun_moon_vao,
            sun_moon_day_phase_loc,
            sun_moon_is_moon_loc,
            sun_moon_screen_pos_loc,
            sun_moon_radius_loc,


            // Phase 6: Particle system
            particle_system: particle::ParticleSystem::new(),
            recent_death_count: 0,
            recent_combat_count: 0,
            recent_construction_complete_count: 0,
            recent_resource_pickup_count: 0,
            lightning_flash: 0.0,
            lightning_timer: 30.0,
            lightning_loc,
            reflection_fbo: None,
            reflection_tex: None,
            reflection_depth: None,
            reflection_w: 0,
            reflection_h: 0,
            reflection_tex_loc,
            reflection_pass_loc,
            reflection_horizon_y_loc,
            sun_dir_loc,
            god_ray_strength_loc,
            context_lost: false,
            first_frame_diag_done: false,
            show_full_map: false,
        })
    }

    fn resize(&mut self, width: u32, height: u32) {
        if self.context_lost { return; }
        self.gl.viewport(0, 0, width as i32, height as i32);
        self.camera.viewport_width = width;
        self.camera.viewport_height = height;
        self.mesh_dirty = true;
    }

    /// Recreate all WebGL resources after context loss/restore.
    /// Preserves game state (map, economy, units, particles, camera).
    fn reinit_webgl(&mut self) -> Result<(), JsValue> {
        // Get fresh WebGL2 context from the canvas (old one is invalid)
        let canvas = self.gl.canvas()
            .ok_or("No canvas")?
            .dyn_into::<HtmlCanvasElement>()?;
        
        let context_options = WebGlContextAttributes::new();
        context_options.set_preserve_drawing_buffer(true);
        let gl = canvas
            .get_context_with_context_options("webgl2", context_options.as_ref())?
            .ok_or("WebGL2 not available after context restoration")?
            .dyn_into::<WebGl2RenderingContext>()?;
        
        // Replace the dead context with the fresh one
        self.gl = gl;
        
        // Rebuild mesh (terrain LOD)
        let mesh = build_map_mesh(&self.map, &self.camera);
        
        // ── Terrain program ──────────────────────────────
        let vert = compile_shader(&self.gl, WebGl2RenderingContext::VERTEX_SHADER, VERTEX_SHADER, "terrain_vertex")?;
        let frag = compile_shader(&self.gl, WebGl2RenderingContext::FRAGMENT_SHADER, FRAGMENT_SHADER, "terrain_fragment")?;
        self.program = link_program(&self.gl, &vert, &frag)?;
        
        self.vao = self.gl.create_vertex_array().ok_or("Cannot create VAO")?;
        self.gl.bind_vertex_array(Some(&self.vao));
        
        self.position_buffer = upload_f32_buffer(&self.gl, &mesh.positions, 0, 3);
        self.color_buffer = upload_f32_buffer(&self.gl, &mesh.colors, 1, 3);
        self.elevation_buffer = upload_f32_buffer(&self.gl, &mesh.elevations, 2, 1);
        self.resource_buffer = upload_f32_buffer(&self.gl, &mesh.has_resources, 3, 1);
        self.slope_buffer = upload_f32_buffer(&self.gl, &mesh.slopes, 4, 1);
        self.edge_buffer = upload_f32_buffer(&self.gl, &mesh.edge_dists, 5, 1);
        self.uvs_buffer = Some(upload_f32_buffer(&self.gl, &mesh.uvs, 6, 2));
        self.terrain_id_buffer = Some(upload_f32_buffer(&self.gl, &mesh.terrain_ids, 7, 1));
        self.visibility_buffer = Some(upload_f32_buffer(&self.gl, &mesh.visibilities, 8, 1));
        self.normal_buffer = Some(upload_f32_buffer(&self.gl, &mesh.normals, 9, 3));
        self.splat_buffer = Some(upload_f32_buffer(&self.gl, &mesh.splats, 10, 4));
        self.ao_buffer = Some(upload_f32_buffer(&self.gl, &mesh.ao_factors, 11, 1));
        
        self.index_buffer = self.gl.create_buffer().ok_or("Cannot create index buffer")?;
        self.gl.bind_buffer(WebGl2RenderingContext::ELEMENT_ARRAY_BUFFER, Some(&self.index_buffer));
        unsafe {
            let view = js_sys::Uint16Array::view(&mesh.indices);
            self.gl.buffer_data_with_array_buffer_view(
                WebGl2RenderingContext::ELEMENT_ARRAY_BUFFER, &view,
                WebGl2RenderingContext::STATIC_DRAW,
            );
        }
        self.gl.bind_vertex_array(None);
        
        self.index_count = mesh.indices.len() as i32;
        
        // Relocate all terrain uniforms
        self.resolution_loc = self.gl.get_uniform_location(&self.program, "u_resolution").ok_or("Cannot find u_resolution")?;
        self.time_loc = self.gl.get_uniform_location(&self.program, "u_time").ok_or("Cannot find u_time")?;
        self.camera_center_loc = self.gl.get_uniform_location(&self.program, "u_camera_center").ok_or("Cannot find u_camera_center")?;
        self.zoom_loc = self.gl.get_uniform_location(&self.program, "u_zoom").ok_or("Cannot find u_zoom")?;
        self.day_phase_loc = self.gl.get_uniform_location(&self.program, "u_day_phase").ok_or("Cannot find u_day_phase")?;
        self.terrain_tex_loc = self.gl.get_uniform_location(&self.program, "u_terrain_textures");
        self.use_textures_loc = self.gl.get_uniform_location(&self.program, "u_use_textures");
        self.fog_color_loc = self.gl.get_uniform_location(&self.program, "u_fog_color");
        self.vp_loc = self.gl.get_uniform_location(&self.program, "u_vp");
        self.use_vp_loc = self.gl.get_uniform_location(&self.program, "u_use_vp");
        self.light_dir_loc = self.gl.get_uniform_location(&self.program, "u_light_direction");
        self.water_time_loc = self.gl.get_uniform_location(&self.program, "u_water_time");
        self.lightning_loc = self.gl.get_uniform_location(&self.program, "u_lightning");
        self.water_normal_loc = self.gl.get_uniform_location(&self.program, "u_water_normal");
        self.water_normal_ready_loc = self.gl.get_uniform_location(&self.program, "u_water_normal_ready");
        self.reflection_tex_loc = self.gl.get_uniform_location(&self.program, "u_reflection_tex");
        self.reflection_pass_loc = self.gl.get_uniform_location(&self.program, "u_reflection_pass");
        self.reflection_horizon_y_loc = self.gl.get_uniform_location(&self.program, "u_reflection_horizon_y");
        self.sun_dir_loc = self.gl.get_uniform_location(&self.program, "u_sun_dir");
        self.god_ray_strength_loc = self.gl.get_uniform_location(&self.program, "u_god_ray_strength");
        
        // ── Model program ──────────────────────────────
        self.model_program = compile_shader(
            &self.gl, WebGl2RenderingContext::VERTEX_SHADER, MODEL_VERTEX_SHADER, "model_vertex"
        ).and_then(|vert| {
            compile_shader(&self.gl, WebGl2RenderingContext::FRAGMENT_SHADER, MODEL_FRAGMENT_SHADER, "model_fragment")
            .and_then(|frag| link_program(&self.gl, &vert, &frag))
        }).ok();
        
        if let Some(ref prog) = self.model_program {
            self.model_pos_buffer = self.gl.create_buffer();
            self.model_normal_buffer = self.gl.create_buffer();
            self.model_uv_buffer = self.gl.create_buffer();
            self.model_instance_buffer = self.gl.create_buffer();
            self.model_offset_buffer = self.gl.create_buffer();
            self.model_anim_phase_buffer = self.gl.create_buffer();
            self.model_model_loc = self.gl.get_uniform_location(prog, "u_model");
            self.model_view_pos_loc = self.gl.get_uniform_location(prog, "u_view_pos");
            self.model_light_dir_loc = self.gl.get_uniform_location(prog, "u_light_dir");
            self.model_color_loc = self.gl.get_uniform_location(prog, "u_model_color");
            self.model_roughness_loc = self.gl.get_uniform_location(prog, "u_roughness");
            self.model_metallic_loc = self.gl.get_uniform_location(prog, "u_metallic");
            self.model_vp_loc = self.gl.get_uniform_location(prog, "u_vp");
            self.model_use_instanced_loc = self.gl.get_uniform_location(prog, "u_use_instanced");
            self.model_time_loc = self.gl.get_uniform_location(prog, "u_time");
            self.model_terrain_tex_loc = self.gl.get_uniform_location(prog, "u_terrain_textures");
            self.model_use_textures_loc = self.gl.get_uniform_location(prog, "u_use_textures");
            self.model_day_phase_loc = self.gl.get_uniform_location(prog, "u_day_phase");
        }
        
        // Clear GPU model cache (textures/buffers need re-upload)
        self.gpu_models.clear();
        
        // Re-upload all cached model meshes after context restoration
        // (model_mesh_cache survives context loss because it stores CPU-side mesh data)
        let cached_meshes: Vec<(u8, model::ModelMesh)> = self.model_mesh_cache.iter()
            .map(|(k, v)| (*k, v.clone()))
            .collect();
        for (model_id, mesh) in cached_meshes {
            self.upload_model_to_gpu(model_id, &mesh);
        }
        web_sys::console::log_1(&format!("Re-uploaded {} model meshes after context restore", self.gpu_models.len()).into());
        
        // ── Shadow program ──────────────────────────────
        let shadow_verts: [f32; 12] = [-1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0, -1.0, 1.0, 1.0, -1.0, 1.0];
        let shadow_result = compile_shader(&self.gl, WebGl2RenderingContext::VERTEX_SHADER, SHADOW_VERTEX_SHADER, "shadow_vertex")
            .and_then(|vert| {
                compile_shader(&self.gl, WebGl2RenderingContext::FRAGMENT_SHADER, SHADOW_FRAGMENT_SHADER, "shadow_fragment")
                .and_then(|frag| link_program(&self.gl, &vert, &frag))
            })
            .ok();
        if let Some(ref prog) = shadow_result {
            self.shadow_vao = Some(self.gl.create_vertex_array().ok_or("Cannot create shadow VAO").unwrap());
            self.gl.bind_vertex_array(self.shadow_vao.as_ref());
            self.gl.use_program(Some(prog));
            let quad_buf = self.gl.create_buffer();
            self.gl.bind_buffer(WebGl2RenderingContext::ARRAY_BUFFER, quad_buf.as_ref());
            unsafe {
                let view = js_sys::Float32Array::view(&shadow_verts);
                self.gl.buffer_data_with_array_buffer_view(WebGl2RenderingContext::ARRAY_BUFFER, &view, WebGl2RenderingContext::STATIC_DRAW);
            }
            self.gl.vertex_attrib_pointer_with_i32(0, 2, WebGl2RenderingContext::FLOAT, false, 0, 0);
            self.gl.enable_vertex_attrib_array(0);
            self.shadow_vp_loc = self.gl.get_uniform_location(prog, "u_vp");
            self.shadow_light_dir_loc = self.gl.get_uniform_location(prog, "u_light_dir");
            self.shadow_instance_pos_loc = self.gl.get_uniform_location(prog, "u_instance_pos");
            self.shadow_size_loc = self.gl.get_uniform_location(prog, "u_shadow_size");
            self.shadow_penumbra_loc = self.gl.get_uniform_location(prog, "u_shadow_penumbra");
            self.gl.bind_vertex_array(None);
            self.shadow_program = Some(prog.clone());
        } else {
            self.shadow_program = None;
            self.shadow_vao = None;
            self.shadow_vp_loc = None;
            self.shadow_light_dir_loc = None;
            self.shadow_instance_pos_loc = None;
            self.shadow_size_loc = None;
            self.shadow_penumbra_loc = None;
        }
        
        // ── Cloud program ──────────────────────────────
        let cloud_result = compile_shader(&self.gl, WebGl2RenderingContext::VERTEX_SHADER, CLOUD_VERTEX_SHADER, "cloud_vertex")
            .and_then(|vert| {
                compile_shader(&self.gl, WebGl2RenderingContext::FRAGMENT_SHADER, CLOUD_FRAGMENT_SHADER, "cloud_fragment")
                .and_then(|frag| link_program(&self.gl, &vert, &frag))
            })
            .ok();
        if let Some(ref prog) = cloud_result {
            self.cloud_vao = Some(self.gl.create_vertex_array().ok_or("Cannot create cloud VAO").unwrap());
            self.gl.bind_vertex_array(self.cloud_vao.as_ref());
            self.gl.use_program(Some(prog));
            self.cloud_pos_buffer = self.gl.create_buffer();
            self.gl.bind_buffer(WebGl2RenderingContext::ARRAY_BUFFER, self.cloud_pos_buffer.as_ref());
            self.gl.vertex_attrib_pointer_with_i32(0, 3, WebGl2RenderingContext::FLOAT, false, 0, 0);
            self.gl.enable_vertex_attrib_array(0);
            self.cloud_size_buffer = self.gl.create_buffer();
            self.gl.bind_buffer(WebGl2RenderingContext::ARRAY_BUFFER, self.cloud_size_buffer.as_ref());
            self.gl.vertex_attrib_pointer_with_i32(1, 2, WebGl2RenderingContext::FLOAT, false, 0, 0);
            self.gl.enable_vertex_attrib_array(1);
            self.cloud_alpha_buffer = self.gl.create_buffer();
            self.gl.bind_buffer(WebGl2RenderingContext::ARRAY_BUFFER, self.cloud_alpha_buffer.as_ref());
            self.gl.vertex_attrib_pointer_with_i32(2, 1, WebGl2RenderingContext::FLOAT, false, 0, 0);
            self.gl.enable_vertex_attrib_array(2);
            self.gl.vertex_attrib_divisor(0, 1);
            self.gl.vertex_attrib_divisor(1, 1);
            self.gl.vertex_attrib_divisor(2, 1);
            let corner_buf = self.gl.create_buffer();
            self.gl.bind_buffer(WebGl2RenderingContext::ARRAY_BUFFER, corner_buf.as_ref());
            let quad_corners: [f32; 12] = [-1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0, -1.0, 1.0, 1.0, -1.0, 1.0];
            unsafe {
                let view = js_sys::Float32Array::view(&quad_corners);
                self.gl.buffer_data_with_array_buffer_view(WebGl2RenderingContext::ARRAY_BUFFER, &view, WebGl2RenderingContext::STATIC_DRAW);
            }
            self.gl.vertex_attrib_pointer_with_i32(3, 2, WebGl2RenderingContext::FLOAT, false, 0, 0);
            self.gl.enable_vertex_attrib_array(3);
            self.cloud_vp_loc = self.gl.get_uniform_location(prog, "u_vp");
            self.cloud_parallax_loc = self.gl.get_uniform_location(prog, "u_cam_parallax");
            self.cloud_day_phase_loc = self.gl.get_uniform_location(prog, "u_day_phase");
            self.gl.bind_vertex_array(None);
            self.cloud_program = Some(prog.clone());
        } else {
            self.cloud_program = None;
            self.cloud_vao = None;
            self.cloud_pos_buffer = None;
            self.cloud_size_buffer = None;
            self.cloud_alpha_buffer = None;
            self.cloud_vp_loc = None;
            self.cloud_parallax_loc = None;
            self.cloud_day_phase_loc = None;
        }
        
        // ── Sun/Moon program ──────────────────────────────
        let sun_moon_result = compile_shader(&self.gl, WebGl2RenderingContext::VERTEX_SHADER, SUN_MOON_VERTEX_SHADER, "sun_moon_vertex")
            .and_then(|vert| {
                compile_shader(&self.gl, WebGl2RenderingContext::FRAGMENT_SHADER, SUN_MOON_FRAGMENT_SHADER, "sun_moon_fragment")
                .and_then(|frag| link_program(&self.gl, &vert, &frag))
            })
            .ok();
        if let Some(ref prog) = sun_moon_result {
            self.sun_moon_vao = Some(self.gl.create_vertex_array().ok_or("Cannot create sun/moon VAO").unwrap());
            self.gl.bind_vertex_array(self.sun_moon_vao.as_ref());
            self.gl.use_program(Some(prog));
            self.sun_moon_day_phase_loc = self.gl.get_uniform_location(prog, "u_day_phase");
            self.sun_moon_is_moon_loc = self.gl.get_uniform_location(prog, "u_is_moon");
            self.sun_moon_screen_pos_loc = self.gl.get_uniform_location(prog, "u_sun_screen_pos");
            self.sun_moon_radius_loc = self.gl.get_uniform_location(prog, "u_sun_radius");
            self.gl.bind_vertex_array(None);
            self.sun_moon_program = Some(prog.clone());
        } else {
            self.sun_moon_program = None;
            self.sun_moon_vao = None;
            self.sun_moon_day_phase_loc = None;
            self.sun_moon_is_moon_loc = None;
            self.sun_moon_screen_pos_loc = None;
            self.sun_moon_radius_loc = None;
        }
        
        // ── Overlay program ──────────────────────────────
        let overlay_vert = compile_shader(&self.gl, WebGl2RenderingContext::VERTEX_SHADER, OVERLAY_VERTEX_SHADER, "overlay_vertex")?;
        let overlay_frag = compile_shader(&self.gl, WebGl2RenderingContext::FRAGMENT_SHADER, OVERLAY_FRAGMENT_SHADER, "overlay_fragment")?;
        self.overlay_program = link_program(&self.gl, &overlay_vert, &overlay_frag)?;
        
        self.overlay_vao = self.gl.create_vertex_array().ok_or("Cannot create overlay VAO")?;
        self.gl.bind_vertex_array(Some(&self.overlay_vao));
        self.overlay_pos_buffer = upload_f32_buffer(&self.gl, &[], 0, 2);
        self.overlay_color_buffer = upload_f32_buffer(&self.gl, &[], 1, 3);
        self.overlay_size_buffer = upload_f32_buffer(&self.gl, &[], 2, 1);
        self.gl.bind_vertex_array(None);
        
        self.overlay_resolution_loc = self.gl.get_uniform_location(&self.overlay_program, "u_resolution").ok_or("Cannot find overlay u_resolution")?;
        self.overlay_camera_center_loc = self.gl.get_uniform_location(&self.overlay_program, "u_camera_center").ok_or("Cannot find overlay u_camera_center")?;
        self.overlay_zoom_loc = self.gl.get_uniform_location(&self.overlay_program, "u_zoom").ok_or("Cannot find overlay u_zoom")?;
        self.overlay_player_rgb_loc = self.gl.get_uniform_location(&self.overlay_program, "u_player_rgb");
        
        // ── Reflection FBO ──────────────────────────────
        self.reflection_fbo = None;
        self.reflection_tex = None;
        self.reflection_depth = None;
        self.reflection_w = 0;
        self.reflection_h = 0;
        
        // Reset texture flags — JS will re-set these
        self.textures_loaded = false;
        self.water_normal_ready = false;
        self.first_frame_diag_done = false;
        
        Ok(())
    }


    fn render(&mut self, now: f64) {
        if self.context_lost { return; }
        let elapsed = (now - self.start_time) / 1000.0; // seconds

        // Run game logic ticks (fixed timestep), scaled by speed, paused check
        if !self.paused {
            let scaled_elapsed = elapsed * self.speed_multiplier;
            let _ticks = self.game_loop.frame(scaled_elapsed);
        } else {
            // When paused, reset timing so we don't get a burst of ticks on resume
            self.game_loop.reset_timing(elapsed);
        }


        // Process incoming network messages (feed GameStateSync into interpolator)
        let messages = self.network_manager.receive();
        for msg in messages {
            if let network::NetworkMessage::GameStateSync(snapshot) = msg {
                self.interpolator.push_snapshot(snapshot, now / 1000.0);
            }
        }

        // Compute day_phase from game time: cycle ~ 5 minutes of real-time per day
        // Day cycle = 300 seconds / 10 TPS = 3000 ticks per day
        let day_phase = match self.day_phase_override { Some(dp) => dp, None => (self.game_loop.state.game_time / 300.0) % 1.0, };
        let (mut sky_r, mut sky_g, mut sky_b) = sky_color(day_phase);

        // ── Phase 7: Lightning flashes ──────────────────────────────────────
        // Frame delta for frame-rate-independent fade
        let dt = (now - self.last_frame_ms) / 1000.0;
        self.last_frame_ms = now;
        self.last_frame_time_ms = dt as f32;
        // Store frametime into ring buffer for histogram
        let idx = self.frame_time_write_idx % 128;
        self.frame_times[idx] = dt as f32;
        self.frame_time_write_idx += 1;
        // Countdown to next lightning
        self.lightning_timer -= dt as f32;
        if self.lightning_timer <= 0.0 && self.lightning_flash <= 0.001 {
            // Trigger flash with random intensity 0.5-1.0
            let r = ((self.game_loop.state.game_time * 7919.0) % 1.0) as f32;
            self.lightning_flash = 0.5 + r * 0.5_f32;
            // Next flash in 20-90 seconds
            let next = ((self.game_loop.state.game_time * 1373.0) % 1.0) as f32;
            self.lightning_timer = 20.0 + next * 70.0_f32;
            // 30% chance of double flash
            if r > 0.7 {
                self.lightning_timer = 0.15; // quick second flash
            }
        }
        // Rapid fade: decays to ~15% in 0.15s at 60fps
        if self.lightning_flash > 0.001 {
            self.lightning_flash *= 0.85_f32.powf(dt as f32 * 60.0);
            if self.lightning_flash < 0.001 {
                self.lightning_flash = 0.0;
            }
        }
        // Boost sky color during lightning
        if self.lightning_flash > 0.001 {
            let boost = 1.0_f32 + self.lightning_flash * 1.5;
            sky_r = (sky_r * boost).min(1.0);
            sky_g = (sky_g * boost).min(1.0);
            sky_b = (sky_b * boost).min(1.0);
        }

        // Update particles (always runs, even when paused, for visual effects)
        self.particle_system.update(0.016);

        // Spawn combat particles for recently died units
        // Drain sound event counters for JS-side audio playback
        let dead_positions = self.game_loop.state.economy.units.drain_recently_died();
        self.recent_death_count = dead_positions.len() as u32;
        self.recent_combat_count = self.game_loop.state.economy.units.drain_combat_hits();
        // Drain building construction and resource pickup sound counters
        self.recent_construction_complete_count = self.game_loop.state.economy.construction_completions;
        self.recent_resource_pickup_count = self.game_loop.state.economy.resource_pickups;
        for (dx, dy) in &dead_positions {
            particle::spawn_combat_effect(&mut self.particle_system, *dx, *dy);
        }

        // Ambient particles: chimney smoke from buildings, leaves near forests
        // Rate-limited: only spawn when particle count is low
        if self.particle_system.alive_count() < 64 {
            let tick = self.game_loop.state.game_time as u32;
            // Every ~30 ticks, try spawning ambient effects
            if tick.is_multiple_of(30) {
                // Collect building positions for smoke
                let buildings = self.game_loop.state.economy.buildings.clone();
                for (i, b) in buildings.iter().enumerate() {
                    // Smoke from every 3rd building to limit count
                    if i % 3 == 0 {
                        particle::spawn_smoke_effect(&mut self.particle_system, b.x as f32 + 0.5, b.y as f32 + 0.5);
                    }
                }
            }
            // Construction particles for buildings being built (every ~20 ticks)
            if tick.is_multiple_of(20) {
                if let Some(nation) = self.game_loop.state.player_nation {
                    let (nr, ng, nb, _) = nation.color();
                    let nr_f = nr as f32 / 255.0;
                    let ng_f = ng as f32 / 255.0;
                    let nb_f = nb as f32 / 255.0;
                    for b in self.game_loop.state.economy.buildings.iter() {
                        if b.construction > 0.0 && b.construction < 1.0 {
                            particle::spawn_construction_effect(
                                &mut self.particle_system,
                                b.x as f32 + 0.5,
                                b.y as f32 + 0.5,
                                nr_f, ng_f, nb_f,
                            );
                        }
                    }
                }
            }
            // Leaf particles near forest tiles (every ~50 ticks)
            if tick.is_multiple_of(50) {
                let map = &self.game_loop.state.map;
                let cx = self.camera.center_x as usize;
                let cy = self.camera.center_y as usize;
                // Check a few tiles around camera center for forest
                for dy in 0..5usize {
                    for dx in 0..5usize {
                        let tx = cx + dx;
                        let ty = cy + dy;
                        if let Some(tile) = map.get(tx, ty) {
                            if tile.terrain == crate::map::Terrain::Forest {
                                particle::spawn_leaf_effect(&mut self.particle_system, tx as f32, ty as f32);
                            }
                        }
                    }
                }
            }
            // Rain particles: every ~4 ticks, spawn 3 droplets across the visible area
            // Rate-limited by the <64 alive_count guard above
            if tick.is_multiple_of(4) {
                let map_w = self.game_loop.state.map.width as f32;
                let map_h = self.game_loop.state.map.height as f32;
                let vis_w = 24.0f32;
                let vis_h = 18.0f32;
                let cx = self.camera.center_x;
                let cy = self.camera.center_y;
                let min_x = (cx - vis_w).max(0.0).min(map_w);
                let min_y = (cy - vis_h).max(0.0).min(map_h);
                let max_x = (cx + vis_w).max(0.0).min(map_w);
                let max_y = (cy + vis_h).max(0.0).min(map_h);
                particle::spawn_rain_burst(&mut self.particle_system, min_x, min_y, max_x, max_y, 3);
            }
            // Snow particles: spawn near mountain/snow tiles
            if tick.is_multiple_of(6) {
                let map = &self.game_loop.state.map;
                let cx = self.camera.center_x as usize;
                let cy = self.camera.center_y as usize;
                let range = 12usize;
                let mut snow_count = 0u32;
                for dy in 0..range {
                    for dx in 0..range {
                        let tx = cx.saturating_sub(range/2) + dx;
                        let ty = cy.saturating_sub(range/2) + dy;
                        if let Some(tile) = map.get(tx, ty) {
                            if (tile.terrain == crate::map::Terrain::Snow || tile.terrain == crate::map::Terrain::Mountain) && snow_count < 4 {
                                particle::spawn_snow_particle(&mut self.particle_system, tx as f32, ty as f32);
                                snow_count += 1;
                            }
                        }
                    }
                }
            }
            // Dust storm particles: spawn near desert tiles
            if tick.is_multiple_of(5) {
                let map = &self.game_loop.state.map;
                let cx = self.camera.center_x as usize;
                let cy = self.camera.center_y as usize;
                let range = 14usize;
                let mut dust_count = 0u32;
                for dy in 0..range {
                    for dx in 0..range {
                        let tx = cx.saturating_sub(range/2) + dx;
                        let ty = cy.saturating_sub(range/2) + dy;
                        if let Some(tile) = map.get(tx, ty) {
                            if tile.terrain == crate::map::Terrain::Desert && dust_count < 3 {
                                particle::spawn_dust_storm_particle(&mut self.particle_system, tx as f32, ty as f32);
                                dust_count += 1;
                            }
                        }
                    }
                }
            }

            // Fog/mist particles: spawn near Water and Swamp tiles
            if tick.is_multiple_of(8) {
                let map = &self.game_loop.state.map;
                let cx = self.camera.center_x as usize;
                let cy = self.camera.center_y as usize;
                let range = 14usize;
                let mut fog_count = 0u32;
                for dy in 0..range {
                    for dx in 0..range {
                        let tx = cx.saturating_sub(range/2) + dx;
                        let ty = cy.saturating_sub(range/2) + dy;
                        if let Some(tile) = map.get(tx, ty) {
                            if (tile.terrain == crate::map::Terrain::Water || tile.terrain == crate::map::Terrain::Swamp) && fog_count < 2 {
                                particle::spawn_fog_particle(&mut self.particle_system, tx as f32, ty as f32);
                                fog_count += 1;
                            }
                        }
                    }
                }
            }
            // Firefly particles: spawn near Forest/Grass tiles at dusk/night
            // Only spawn during low-light conditions (day_phase < 0.2 or > 0.8)
            if tick.is_multiple_of(10) {
                let day_phase = (self.game_loop.state.game_time / 300.0) % 1.0;
                if !(0.2..=0.8).contains(&day_phase) {
                    let map = &self.game_loop.state.map;
                    let cx = self.camera.center_x as usize;
                    let cy = self.camera.center_y as usize;
                    let range = 10usize;
                    let mut firefly_count = 0u32;
                    for dy in 0..range {
                        for dx in 0..range {
                            let tx = cx.saturating_sub(range/2) + dx;
                            let ty = cy.saturating_sub(range/2) + dy;
                            if let Some(tile) = map.get(tx, ty) {
                                if (tile.terrain == crate::map::Terrain::Forest || tile.terrain == crate::map::Terrain::Grass) && firefly_count < 2 {
                                    particle::spawn_firefly_effect(&mut self.particle_system, tx as f32, ty as f32);
                                    firefly_count += 1;
                                }
                            }
                        }
                    }
                }
            }
            // Autumn leaf particles: spawn near Forest tiles
            // Slow falling leaves with warm amber/orange/red-brown colors
            if tick.is_multiple_of(12) {
                let map = &self.game_loop.state.map;
                let cx = self.camera.center_x as usize;
                let cy = self.camera.center_y as usize;
                let range = 10usize;
                let mut leaf_count = 0u32;
                for dy in 0..range {
                    for dx in 0..range {
                        let tx = cx.saturating_sub(range/2) + dx;
                        let ty = cy.saturating_sub(range/2) + dy;
                        if let Some(tile) = map.get(tx, ty) {
                            if tile.terrain == crate::map::Terrain::Forest && leaf_count < 3 {
                                particle::spawn_autumn_leaf_particle(&mut self.particle_system, tx as f32, ty as f32);
                                leaf_count += 1;
                            }
                        }
                    }
                }
            }
            // Water splash particles: spawn near Water tiles
            // Small upward burst to simulate wave action on water surface
            if tick.is_multiple_of(8) {
                let map = &self.game_loop.state.map;
                let cx = self.camera.center_x as usize;
                let cy = self.camera.center_y as usize;
                let range = 12usize;
                let mut splash_count = 0u32;
                for dy in 0..range {
                    for dx in 0..range {
                        let tx = cx.saturating_sub(range/2) + dx;
                        let ty = cy.saturating_sub(range/2) + dy;
                        if let Some(tile) = map.get(tx, ty) {
                            if tile.terrain == crate::map::Terrain::Water && splash_count < 2 {
                                particle::spawn_water_splash_particle(&mut self.particle_system, tx as f32, ty as f32);
                                splash_count += 1;
                            }
                        }
                    }
                }
            }
            // Water sparkle particles: bright specular glints on water surface
            // Tiny bright flashes that appear and disappear quickly — sunlight
            // reflecting off gentle ripples. Daytime only (sparkles need sun).
            if tick.is_multiple_of(3) {
                let day_phase = (self.game_loop.state.game_time / 300.0) % 1.0;
                if (0.2..=0.8).contains(&day_phase) {
                    let map = &self.game_loop.state.map;
                    let cx = self.camera.center_x as usize;
                    let cy = self.camera.center_y as usize;
                    let range = 14usize;
                    let mut sparkle_count = 0u32;
                    for dy in 0..range {
                        for dx in 0..range {
                            let tx = cx.saturating_sub(range/2) + dx;
                            let ty = cy.saturating_sub(range/2) + dy;
                            if let Some(tile) = map.get(tx, ty) {
                                if tile.terrain == crate::map::Terrain::Water && sparkle_count < 5 {
                                    particle::spawn_water_sparkle_particle(&mut self.particle_system, tx as f32, ty as f32);
                                    sparkle_count += 1;
                                }
                            }
                            if sparkle_count >= 5 { break; }
                        }
                        if sparkle_count >= 5 { break; }
                    }
                }
            }
            // Ember/spark particles: spawn near Iron/Gold Smelter buildings
            // Embers rise from furnace chimneys with orange-red-yellow color
            if tick.is_multiple_of(7) {
                let mut ember_count = 0u32;
                for b in self.game_loop.state.economy.buildings.iter() {
                    if b.is_complete() && b.active {
                        let is_smelter = b.kind == crate::economy::BuildingType::IronSmelter
                            || b.kind == crate::economy::BuildingType::GoldSmelter
                            || b.kind == crate::economy::BuildingType::Smelter;
                        if is_smelter && ember_count < 2 {
                            particle::spawn_ember_particle(&mut self.particle_system, b.x as f32, b.y as f32);
                            ember_count += 1;
                        }
                    }
                    if ember_count >= 2 { break; }
                }
            }

            // Pollen/drifting seeds: spawn near Grass tiles during daytime
            if tick.is_multiple_of(6) {
                let day_phase = (self.game_loop.state.game_time / 300.0) % 1.0;
                if (0.2..=0.8).contains(&day_phase) {
                    let map = &self.game_loop.state.map;
                    let cx = self.camera.center_x as usize;
                    let cy = self.camera.center_y as usize;
                    let range = 12usize;
                    let mut pollen_count = 0u32;
                    for dy in 0..range {
                        for dx in 0..range {
                            let tx = cx.saturating_sub(range / 2) + dx;
                            let ty = cy.saturating_sub(range / 2) + dy;
                            if let Some(tile) = map.get(tx, ty) {
                                if tile.terrain == crate::map::Terrain::Grass && pollen_count < 4 {
                                    particle::spawn_pollen_particle(&mut self.particle_system, tx as f32, ty as f32);
                                    pollen_count += 1;
                                }
                            }
                            if pollen_count >= 4 { break; }
                        }
                        if pollen_count >= 4 { break; }
                    }
                }
            }

            // Butterflies: spawn near Forest and Grass tiles during daytime
            if tick.is_multiple_of(8) {
                let day_phase = (self.game_loop.state.game_time / 300.0) % 1.0;
                if (0.25..=0.75).contains(&day_phase) {
                    let map = &self.game_loop.state.map;
                    let cx = self.camera.center_x as usize;
                    let cy = self.camera.center_y as usize;
                    let range = 12usize;
                    let mut butterfly_count = 0u32;
                    for dy in 0..range {
                        for dx in 0..range {
                            let tx = cx.saturating_sub(range / 2) + dx;
                            let ty = cy.saturating_sub(range / 2) + dy;
                            if let Some(tile) = map.get(tx, ty) {
                                if (tile.terrain == crate::map::Terrain::Forest
                                    || tile.terrain == crate::map::Terrain::Grass)
                                    && butterfly_count < 2
                                {
                                    particle::spawn_butterfly_particle(&mut self.particle_system, tx as f32, ty as f32);
                                    butterfly_count += 1;
                                }
                            }
                            if butterfly_count >= 2 { break; }
                        }
                        if butterfly_count >= 2 { break; }
                    }
                }
            }

        }

        // Moths: spawn near complete buildings at night (attracted to torchlight)
        if self.particle_system.alive_count() < 64 {
            let moth_tick = self.game_loop.state.game_time as u32;
            if moth_tick.is_multiple_of(10) {
                let day_phase = (self.game_loop.state.game_time / 300.0) % 1.0;
                if !(0.2..=0.8).contains(&day_phase) {
                    let mut moth_count = 0u32;
                    for b in self.game_loop.state.economy.buildings.iter() {
                        if b.is_complete() && moth_count < 2 {
                            particle::spawn_moth_particle(&mut self.particle_system, b.x as f32, b.y as f32);
                            moth_count += 1;
                        }
                        if moth_count >= 2 { break; }
                    }
                }
            }
        }

        // Magic sparkle particles: divine energy rising from temples during daytime
        if self.particle_system.alive_count() < 64 {
            let sparkle_tick = self.game_loop.state.game_time as u32;
            if sparkle_tick.is_multiple_of(8) {
                let day_phase = (self.game_loop.state.game_time / 300.0) % 1.0;
                if (0.2..=0.8).contains(&day_phase) {
                    let mut sparkle_count = 0u32;
                    for b in self.game_loop.state.economy.buildings.iter() {
                        if b.is_complete() && b.active {
                            let is_temple = b.kind == crate::economy::BuildingType::SmallTemple
                                || b.kind == crate::economy::BuildingType::LargeTemple;
                            if is_temple && sparkle_count < 2 {
                                particle::spawn_magic_sparkle_particle(&mut self.particle_system, b.x as f32, b.y as f32);
                                sparkle_count += 1;
                            }
                        }
                        if sparkle_count >= 2 { break; }
                    }
                }
            }
        }

        // Mine spark particles: forge sparks from ore mines (Gold/Coal/IronOre)
        if self.particle_system.alive_count() < 64 {
            let mine_tick = self.game_loop.state.game_time as u32;
            if mine_tick.is_multiple_of(6) {
                let mut mine_count = 0u32;
                for b in self.game_loop.state.economy.buildings.iter() {
                    if b.is_complete() && b.active {
                        let is_mine = b.kind == crate::economy::BuildingType::GoldMine
                            || b.kind == crate::economy::BuildingType::CoalMine
                            || b.kind == crate::economy::BuildingType::IronOreMine;
                        if is_mine && mine_count < 2 {
                            particle::spawn_mine_spark_particle(&mut self.particle_system, b.x as f32, b.y as f32);
                            mine_count += 1;
                        }
                    }
                    if mine_count >= 2 { break; }
                }
            }

            // Forge sparks: hot yellow-white sparks from Toolsmith/Weaponsmith buildings
            let forge_tick = self.game_loop.state.game_time as u32;
            if forge_tick.is_multiple_of(7) {
                let mut forge_count = 0u32;
                for b in self.game_loop.state.economy.buildings.iter() {
                    if b.is_complete() && b.active {
                        let is_forge = b.kind == crate::economy::BuildingType::Toolsmith
                            || b.kind == crate::economy::BuildingType::Weaponsmith;
                        if is_forge && forge_count < 2 {
                            particle::spawn_forge_spark_particle(&mut self.particle_system, b.x as f32, b.y as f32);
                            forge_count += 1;
                        }
                    }
                    if forge_count >= 2 { break; }
                }
            }
        }

        // Smooth camera
        self.camera.update(0.016); // ~60fps

        // Rebuild mesh if camera moved significantly
        if self.mesh_dirty {
            self.rebuild_mesh();
            self.mesh_dirty = false;
        }

        // Draw call counter: reset each frame
        self.draw_call_count = 0;
        // FPS counter: count frames over 1-second windows
        self.fps_frame_count += 1;
        let fps_delta = now - self.fps_last_time;
        if fps_delta >= 1000.0 {
            self.current_fps = self.fps_frame_count;
            self.fps_frame_count = 0;
            self.fps_last_time = now;
            // Update FPS benchmarking stats (min/max/avg)
            let fps = self.current_fps;
            if fps > 0 {
                if fps < self.fps_min { self.fps_min = fps; }
                if fps > self.fps_max { self.fps_max = fps; }
                let n = self.fps_sample_count as f64;
                self.fps_accum = (self.fps_accum * n + fps as f64) / (n + 1.0);
                self.fps_sample_count += 1;
            }
        }

        // Now borrow gl for drawing (after mutable operations are done)
        let gl = &self.gl;

        gl.clear_color(sky_r, sky_g, sky_b, 1.0); // Dynamic sky from day_phase
        gl.clear(WebGl2RenderingContext::COLOR_BUFFER_BIT);

        // ── Render diagnostics (first frame only) ──────────────────────
        if !self.first_frame_diag_done {
            self.first_frame_diag_done = true;
            let canvas_diag = gl
                .canvas()
                .unwrap()
                .dyn_into::<HtmlCanvasElement>()
                .unwrap();
            let msg = format!(
                "RENDER_DIAG: map={}×{} index_count={} zoom={:.2} cam=({:.1},{:.1}) canvas={}×{} fog=CPU-computed",
                self.map.width,
                self.map.height,
                self.index_count,
                self.camera.zoom,
                self.camera.center_x,
                self.camera.center_y,
                canvas_diag.width(),
                canvas_diag.height(),
            );
            web_sys::console::log_1(&msg.into());
        }

        gl.use_program(Some(&self.program));

        // Tell shader whether textures are loaded (JS binds the texture array)
        if let Some(ref loc) = self.use_textures_loc {
            gl.uniform1i(Some(loc), if self.textures_loaded { 1 } else { 0 });
        }
        if let Some(ref loc) = self.terrain_tex_loc {
            gl.uniform1i(Some(loc), 0); // TEXTURE0
        }

        let canvas = gl
            .canvas()
            .unwrap()
            .dyn_into::<HtmlCanvasElement>()
            .unwrap();

        // Camera transforms via shader uniforms
        // We pass world-space center and let the shader do the work
        let iso_x = (self.camera.center_x - self.camera.center_y) * 0.866;
        let iso_y = (self.camera.center_x + self.camera.center_y) * 0.5;

        gl.uniform2f(Some(&self.camera_center_loc), iso_x, iso_y);
        gl.uniform1f(Some(&self.zoom_loc), self.camera.zoom);
        gl.uniform1f(Some(&self.day_phase_loc), day_phase as f32);
        gl.uniform1f(Some(&self.time_loc), elapsed as f32);
        if let Some(ref loc) = self.fog_color_loc {
            gl.uniform3f(Some(loc), sky_r, sky_g, sky_b);
        }
        // Pass light direction (tied to day/night cycle: sun arc)
        if let Some(ref loc) = self.light_dir_loc {
            let sun_angle = (day_phase as f32 - 0.25) * std::f32::consts::TAU;
            let sun_elev = sun_angle.sin() * 0.8 + 0.2;
            let lx = sun_angle.cos() * sun_elev.max(0.1);
            let ly = sun_elev.max(0.1);
            let lz = sun_angle.sin() * sun_elev.max(0.1);
            let len = (lx*lx + ly*ly + lz*lz).sqrt();
            gl.uniform3f(Some(loc), lx/len, ly/len, lz/len);
        }
        // Phase 7: Set sun direction (toward the sun, opposite of light direction)
        if let Some(ref loc) = self.sun_dir_loc {
            let sun_angle = (day_phase as f32 - 0.25) * std::f32::consts::TAU;
            let sun_elev = sun_angle.sin() * 0.8 + 0.2;
            let sx = sun_angle.cos() * sun_elev.max(0.1);
            let sy = sun_elev.max(0.1);
            let sz = sun_angle.sin() * sun_elev.max(0.1);
            let slen = (sx*sx + sy*sy + sz*sz).sqrt();
            // sun_dir is TOWARD the sun (opposite of light direction)
            gl.uniform3f(Some(loc), -sx/slen, -sy/slen, -sz/slen);
        }
        // Phase 7: God ray strength — strongest at dawn/dusk, zero at night
        if let Some(ref loc) = self.god_ray_strength_loc {
            let dl = compute_day_light(day_phase);
            let dawn_dusk = 1.0 - (dl * 2.0 - 1.0).abs(); // peaks at dawn/dusk
            let strength = dawn_dusk * 0.12;
            gl.uniform1f(Some(loc), strength);
        }
        // Pass water animation time (independent of game time for visual smoothness)
        if let Some(ref loc) = self.water_time_loc {
            gl.uniform1f(Some(loc), elapsed as f32);
        }
        // Pass water normal texture unit and ready flag
        if let Some(ref loc) = self.water_normal_loc {
            gl.uniform1i(Some(loc), 1); // TEXTURE1
        }
        if let Some(ref loc) = self.water_normal_ready_loc {
            gl.uniform1f(Some(loc), if self.water_normal_ready { 1.0 } else { 0.0 });
        }
        if let Some(ref loc) = self.lightning_loc {
            gl.uniform1f(Some(loc), self.lightning_flash);
        }
        // Ensure reflection pass is off for normal terrain rendering
        if let Some(ref loc) = self.reflection_pass_loc {
            gl.uniform1i(Some(loc), 0);
        }
        // Phase 5: Pass orbital camera View-Projection matrix to shader
        // When enabled (u_use_vp=true), shader uses VP matrix instead of legacy iso params
        if let (Some(ref vp_loc), Some(ref use_loc)) = (&self.vp_loc, &self.use_vp_loc) {
            let (ex, ey, ez) = self.camera.eye();
            let (tx, ty, tz) = self.camera.look_at_target();
            let aspect = self.camera.viewport_width as f32 / self.camera.viewport_height.max(1) as f32;
            let vp = model::compute_vp(&[ex, ey, ez], &[tx, ty, tz], 45.0, aspect, 0.1, 500.0);
            gl.uniform_matrix4fv_with_f32_array(Some(vp_loc), false, &vp);
            gl.uniform1i(Some(use_loc), 1);
        } else {
            // No VP — shader falls back to legacy iso
            if let Some(ref loc) = self.use_vp_loc {
                gl.uniform1i(Some(loc), 0);
            }
        }
        // ── Water reflection pass: render scene to FBO with camera Y flipped ──
        // Create FBO lazily on first use (canvas required for dimensions)
        if self.reflection_fbo.is_none() {
            let fbo = gl.create_framebuffer();
            let tex = gl.create_texture();
            if let (Some(fbo), Some(tex)) = (fbo, tex) {
                // Create reflection texture on TEXTURE2 to avoid type conflicts
                // with terrain TEXTURE_2D_ARRAY on TEXTURE0
                gl.active_texture(WebGl2RenderingContext::TEXTURE2);
                gl.bind_texture(WebGl2RenderingContext::TEXTURE_2D, Some(&tex));
                // Half-resolution: 50% saves 75% fill rate on water tiles
                self.reflection_w = (canvas.width() / 2).max(1) as i32;
                self.reflection_h = (canvas.height() / 2).max(1) as i32;
                gl.tex_image_2d_with_i32_and_i32_and_i32_and_format_and_type_and_opt_u8_array(
                    WebGl2RenderingContext::TEXTURE_2D,
                    0,
                    WebGl2RenderingContext::RGBA as i32,
                    self.reflection_w,
                    self.reflection_h,
                    0,
                    WebGl2RenderingContext::RGBA,
                    WebGl2RenderingContext::UNSIGNED_BYTE,
                    None,
                ).ok();
                gl.tex_parameteri(WebGl2RenderingContext::TEXTURE_2D, WebGl2RenderingContext::TEXTURE_MIN_FILTER, WebGl2RenderingContext::LINEAR as i32);
                gl.tex_parameteri(WebGl2RenderingContext::TEXTURE_2D, WebGl2RenderingContext::TEXTURE_MAG_FILTER, WebGl2RenderingContext::LINEAR as i32);
                gl.tex_parameteri(WebGl2RenderingContext::TEXTURE_2D, WebGl2RenderingContext::TEXTURE_WRAP_S, WebGl2RenderingContext::CLAMP_TO_EDGE as i32);
                gl.tex_parameteri(WebGl2RenderingContext::TEXTURE_2D, WebGl2RenderingContext::TEXTURE_WRAP_T, WebGl2RenderingContext::CLAMP_TO_EDGE as i32);
                gl.bind_framebuffer(WebGl2RenderingContext::FRAMEBUFFER, Some(&fbo));
                gl.framebuffer_texture_2d(
                    WebGl2RenderingContext::FRAMEBUFFER,
                    WebGl2RenderingContext::COLOR_ATTACHMENT0,
                    WebGl2RenderingContext::TEXTURE_2D,
                    Some(&tex),
                    0,
                );
                // Depth renderbuffer for proper depth sorting in reflection
                let depth_rb = gl.create_renderbuffer();
                if let Some(depth_rb) = depth_rb {
                    gl.bind_renderbuffer(WebGl2RenderingContext::RENDERBUFFER, Some(&depth_rb));
                    gl.renderbuffer_storage(
                        WebGl2RenderingContext::RENDERBUFFER,
                        WebGl2RenderingContext::DEPTH_COMPONENT24,
                        self.reflection_w,
                        self.reflection_h,
                    );
                    gl.framebuffer_renderbuffer(
                        WebGl2RenderingContext::FRAMEBUFFER,
                        WebGl2RenderingContext::DEPTH_ATTACHMENT,
                        WebGl2RenderingContext::RENDERBUFFER,
                        Some(&depth_rb),
                    );
                    gl.bind_renderbuffer(WebGl2RenderingContext::RENDERBUFFER, None);
                    self.reflection_depth = Some(depth_rb);
                }
                gl.bind_framebuffer(WebGl2RenderingContext::FRAMEBUFFER, None);
                // Unbind reflection texture from TEXTURE2 — will be re-bound in render loop
                gl.bind_texture(WebGl2RenderingContext::TEXTURE_2D, None);
                self.reflection_fbo = Some(fbo);
                self.reflection_tex = Some(tex);
            }
        }
        // Reflection render pass: flip camera Y across water plane (Y=0), render to FBO
        if let (Some(ref fbo), Some(ref vp_loc), Some(ref use_loc)) = (&self.reflection_fbo, &self.vp_loc, &self.use_vp_loc) {
            // Unbind reflection texture from TEXTURE2 to prevent feedback loop
            // (FBO color attachment == reflection_tex, and shader declares u_reflection_tex sampler)
            gl.active_texture(WebGl2RenderingContext::TEXTURE2);
            gl.bind_texture(WebGl2RenderingContext::TEXTURE_2D, None);
            let (ex, ey, ez) = self.camera.eye();
            let (tx, ty, tz) = self.camera.look_at_target();
            let aspect = self.camera.viewport_width as f32 / self.camera.viewport_height.max(1) as f32;
            let ref_vp = model::compute_reflection_vp(&[ex, ey, ez], &[tx, ty, tz], 45.0, aspect, 0.1, 500.0);
            gl.bind_framebuffer(WebGl2RenderingContext::FRAMEBUFFER, Some(fbo));
            gl.viewport(0, 0, self.reflection_w, self.reflection_h);
            gl.clear_color(sky_r, sky_g, sky_b, 1.0);
            gl.clear(WebGl2RenderingContext::COLOR_BUFFER_BIT | WebGl2RenderingContext::DEPTH_BUFFER_BIT);
            gl.uniform_matrix4fv_with_f32_array(Some(vp_loc), false, &ref_vp);
            gl.uniform1i(Some(use_loc), 1);
            // Set reflection pass flag: discard water tiles in the FBO render
            if let Some(ref loc) = self.reflection_pass_loc {
                gl.uniform1i(Some(loc), 1);
            }
            let horizon_screen_y = model::compute_horizon_y(&[ex, ey, ez], &[tx, ty, tz], 45.0);
            if let Some(ref loc) = self.reflection_horizon_y_loc {
                gl.uniform1f(Some(loc), horizon_screen_y);
            }
            gl.bind_vertex_array(Some(&self.vao));
            self.draw_call_count += 1;
            gl.draw_elements_with_i32(
                WebGl2RenderingContext::TRIANGLES,
                self.index_count,
                WebGl2RenderingContext::UNSIGNED_SHORT,
                0,
            );
            gl.bind_framebuffer(WebGl2RenderingContext::FRAMEBUFFER, None);
            gl.viewport(0, 0, canvas.width() as i32, canvas.height() as i32);
            // Reset reflection pass flag for normal rendering
            if let Some(ref loc) = self.reflection_pass_loc {
                gl.uniform1i(Some(loc), 0);
            }
            // Restore main VP matrix (reflection pass overwrote u_vp with Y-flipped VP)
            let main_vp = model::compute_vp(&[ex, ey, ez], &[tx, ty, tz], 45.0, aspect, 0.1, 500.0);
            gl.uniform_matrix4fv_with_f32_array(Some(vp_loc), false, &main_vp);
            gl.uniform1i(Some(use_loc), 1);
        }
        // Bind reflection texture for water shader to sample (always set uniform to prevent unit clash)
        if let Some(ref loc) = self.reflection_tex_loc {
            gl.uniform1i(Some(loc), 2); // TEXTURE2
        }
        if let Some(ref tex) = self.reflection_tex {
            gl.active_texture(WebGl2RenderingContext::TEXTURE2);
            gl.bind_texture(WebGl2RenderingContext::TEXTURE_2D, Some(tex));
        }

        gl.uniform2f(
            Some(&self.resolution_loc),
            canvas.width() as f32 * 0.5,
            canvas.height() as f32 * 0.5,
        );

        gl.bind_vertex_array(Some(&self.vao));
        self.draw_call_count += 1;
        gl.draw_elements_with_i32(
            WebGl2RenderingContext::TRIANGLES,
            self.index_count,
            WebGl2RenderingContext::UNSIGNED_SHORT,
            0,
        );

        // ── Model 3D: auto-populate instances from game state, then draw ──
        self.populate_model_instances_from_game_state();
        self.render_shadows();
        self.render_clouds(day_phase);
        self.render_sun_moon(day_phase);
        self.render_models(elapsed as f32);

// ── Overlay: draw buildings and units as colored dots ─────────────
        self.render_overlay();
    }

    // ── Phase 5 Step 8: Model 3D Rendering Pass ──────────────────────

    /// Upload a model mesh to GPU buffers for rendering.
    /// Creates a per-model VAO + index buffer so that render_models can do
    /// correctly separated draw calls per model type.
    fn upload_model_to_gpu(&mut self, model_id: u8, mesh: &model::ModelMesh) {
        let gl = &self.gl;
        let prog = match self.model_program.as_ref() {
            Some(p) => p,
            None => return,
        };

        // Create per-model VAO
        let vao = match gl.create_vertex_array() {
            Some(v) => v,
            None => return,
        };
        gl.bind_vertex_array(Some(&vao));
        gl.use_program(Some(prog));

        // Upload position buffer (location 0) — bind to VAO via temp buffer, then detach
        if let Some(ref buf) = self.model_pos_buffer {
            gl.bind_buffer(WebGl2RenderingContext::ARRAY_BUFFER, Some(buf));
            unsafe {
                let view = js_sys::Float32Array::view(&mesh.positions);
                gl.buffer_data_with_array_buffer_view(
                    WebGl2RenderingContext::ARRAY_BUFFER,
                    &view,
                    WebGl2RenderingContext::STATIC_DRAW,
                );
            }
            gl.vertex_attrib_pointer_with_i32(0, 3, WebGl2RenderingContext::FLOAT, false, 0, 0);
            gl.enable_vertex_attrib_array(0);
        }

        // Upload normal buffer (location 1)
        if let Some(ref buf) = self.model_normal_buffer {
            gl.bind_buffer(WebGl2RenderingContext::ARRAY_BUFFER, Some(buf));
            unsafe {
                let view = js_sys::Float32Array::view(&mesh.normals);
                gl.buffer_data_with_array_buffer_view(
                    WebGl2RenderingContext::ARRAY_BUFFER,
                    &view,
                    WebGl2RenderingContext::STATIC_DRAW,
                );
            }
            gl.vertex_attrib_pointer_with_i32(1, 3, WebGl2RenderingContext::FLOAT, false, 0, 0);
            gl.enable_vertex_attrib_array(1);
        }

        // Upload UV buffer (location 2)
        if let Some(ref buf) = self.model_uv_buffer {
            gl.bind_buffer(WebGl2RenderingContext::ARRAY_BUFFER, Some(buf));
            unsafe {
                let view = js_sys::Float32Array::view(&mesh.uvs);
                gl.buffer_data_with_array_buffer_view(
                    WebGl2RenderingContext::ARRAY_BUFFER,
                    &view,
                    WebGl2RenderingContext::STATIC_DRAW,
                );
            }
            gl.vertex_attrib_pointer_with_i32(2, 2, WebGl2RenderingContext::FLOAT, false, 0, 0);
            gl.enable_vertex_attrib_array(2);
        }

        // Create and upload per-model index buffer (stays bound to VAO)
        let idx_buf = gl.create_buffer();
        if let Some(ref buf) = idx_buf {
            gl.bind_buffer(
                WebGl2RenderingContext::ELEMENT_ARRAY_BUFFER,
                Some(buf),
            );
            unsafe {
                let view = js_sys::Uint16Array::view(&mesh.indices);
                gl.buffer_data_with_array_buffer_view(
                    WebGl2RenderingContext::ELEMENT_ARRAY_BUFFER,
                    &view,
                    WebGl2RenderingContext::STATIC_DRAW,
                );
            }
        }

        gl.bind_vertex_array(None);

        // Store per-model GPU resources
        if let Some(buf) = idx_buf {
            self.gpu_models.insert(
                model_id,
                GpuModel {
                    vao,
                    index_buffer: buf,
                    index_count: mesh.indices.len() as i32,
                    material: mesh.material.clone(),
                },
            );
        }
    }

    // ── Phase 7: Soft ground-plane shadow pass ──────────────────────────
    fn render_shadows(&mut self) {
        if self.model_instances.is_empty() {
            return;
        }
        let gl = &self.gl;
        let prog = match self.shadow_program.as_ref() {
            Some(p) => p,
            None => return,
        };
        let vao = match self.shadow_vao.as_ref() {
            Some(v) => v,
            None => return,
        };
        let vp_loc = match self.shadow_vp_loc.as_ref() {
            Some(l) => l,
            None => return,
        };
        let light_dir_loc = match self.shadow_light_dir_loc.as_ref() {
            Some(l) => l,
            None => return,
        };
        let pos_loc = match self.shadow_instance_pos_loc.as_ref() {
            Some(l) => l,
            None => return,
        };
        let size_loc = match self.shadow_size_loc.as_ref() {
            Some(l) => l,
            None => return,
        };
        let penumbra_loc = match self.shadow_penumbra_loc.as_ref() {
            Some(l) => l,
            None => return,
        };

        gl.use_program(Some(prog));
        gl.bind_vertex_array(Some(vao));

        // Enable blending for soft shadow transparency
        gl.enable(WebGl2RenderingContext::BLEND);
        gl.blend_func(WebGl2RenderingContext::SRC_ALPHA, WebGl2RenderingContext::ONE_MINUS_SRC_ALPHA);

        // Compute VP matrix (same as model rendering)
        let (ex, ey, ez) = self.camera.eye();
        let (tx, ty, tz) = self.camera.look_at_target();
        let aspect = self.camera.viewport_width as f32 / self.camera.viewport_height.max(1) as f32;
        let vp = model::compute_vp(&[ex, ey, ez], &[tx, ty, tz], 45.0, aspect, 0.1, 500.0);
        gl.uniform_matrix4fv_with_f32_array(Some(vp_loc), false, &vp);

        // Light direction (same sun arc as model shader)
        let day_phase = (self.game_loop.state.game_time / 300.0) % 1.0;
        let sun_angle = (day_phase as f32 - 0.25) * std::f32::consts::TAU;
        let sun_elev = sun_angle.sin() * 0.8 + 0.2;
        let lx = sun_angle.cos() * sun_elev.max(0.1);
        let ly = sun_elev.max(0.1);
        let lz = sun_angle.sin() * sun_elev.max(0.1);
        let len = (lx*lx + ly*ly + lz*lz).sqrt();
        gl.uniform3f(Some(light_dir_loc), lx/len, ly/len, lz/len);

        // Camera eye position for distance-based penumbra
        let (ex, ey, ez) = self.camera.eye();

        // Draw one shadow quad per model instance
        for inst in &self.model_instances {
            // Compute distance from camera eye to instance world position
            let dx = inst.x - ex;
            let dy = 0.0 - ey;
            let dz = inst.y - ez;
            let cam_dist = (dx * dx + dy * dy + dz * dz).sqrt();

            // Distance-based penumbra: closer = sharper, farther = softer
            // At 0-6 units: penumbra 0.25 (sharp)
            // At 6-30 units: linear ramp 0.25->1.0
            // Beyond 30 units: penumbra 1.0 (very soft)
            let penumbra = if cam_dist < 6.0 {
                0.25
            } else if cam_dist > 30.0 {
                1.0
            } else {
                0.25 + (cam_dist - 6.0) / 24.0 * 0.75
            };
            gl.uniform1f(Some(penumbra_loc), penumbra);

            // Sun-angle shadow stretch: low sun = longer shadows
            // sun_elev ranges from ~0.2 (low) to ~1.0 (high noon)
            let stretch = 1.0 / sun_elev.max(0.15);
            let shadow_size = inst.scale * 0.6 * stretch;

            gl.uniform3f(Some(pos_loc), inst.x, 0.0, inst.y);
            gl.uniform1f(Some(size_loc), shadow_size);
            self.draw_call_count += 1;
            gl.draw_arrays(WebGl2RenderingContext::TRIANGLES, 0, 6);
        }

        gl.bind_vertex_array(None);
        gl.disable(WebGl2RenderingContext::BLEND);
    }

    // ── Phase 7: Cloud layer rendering ─────────────────────────────────────
    fn render_clouds(&mut self, day_phase: f64) {
        let gl = &self.gl;
        let prog = match self.cloud_program.as_ref() {
            Some(p) => p,
            None => return,
        };
        let vao = match self.cloud_vao.as_ref() {
            Some(v) => v,
            None => return,
        };

        // Generate cloud instance data: semi-transparent quads at high elevation
        // Clouds are placed in a grid above the map with some randomness
        let mut positions: Vec<f32> = Vec::new();
        let mut sizes: Vec<f32> = Vec::new();
        let mut alphas: Vec<f32> = Vec::new();

        let map_w = self.map.width as f32;
        let map_h = self.map.height as f32;
        let cloud_y = 8.0_f32; // high above terrain
        let grid_step = 6.0_f32; // one cloud every N tiles

        // Seed-based pseudo-random using position (deterministic)
        let mut _cloud_idx = 0u32;
        let mut z = -grid_step * 0.5;
        while z < map_h + grid_step {
            let mut x = -grid_step * 0.5;
            while x < map_w + grid_step {
                // Deterministic hash for this grid cell
                let h = ((x * 127.1 + z * 311.7 + 74.7).sin() * 43_758.547).fract();
                let h2 = ((x * 269.5 + z * 183.3 + 67.2).sin() * 28_374.123).fract();
                let h3 = ((x * 419.2 + z * 357.8 + 91.3).sin() * 19_283.568).fract();

                // Skip some cells for natural spacing (density ~60%)
                if h > 0.4 {
                    let cx = x + h2 * grid_step * 0.8;
                    let cz = z + h3 * grid_step * 0.8;
                    let size_base = 2.0 + h * 3.0; // 2.0–5.0 tile width
                    let alpha = 0.3 + h2 * 0.5; // 0.3–0.8 opacity

                    // One entry per cloud (instanced rendering)
                    positions.push(cx);
                    positions.push(cloud_y);
                    positions.push(cz);
                    sizes.push(size_base);
                    sizes.push(size_base * 0.6); // slightly elliptical
                    alphas.push(alpha);
                    _cloud_idx += 1;
                }
                x += grid_step;
            }
            z += grid_step;
        }

        if positions.is_empty() {
            return;
        }

        gl.use_program(Some(prog));
        gl.bind_vertex_array(Some(vao));

        // Upload cloud instance data
        if let Some(ref buf) = self.cloud_pos_buffer {
            gl.bind_buffer(WebGl2RenderingContext::ARRAY_BUFFER, Some(buf));
            unsafe {
                let view = js_sys::Float32Array::view(&positions);
                gl.buffer_data_with_array_buffer_view(
                    WebGl2RenderingContext::ARRAY_BUFFER,
                    &view,
                    WebGl2RenderingContext::DYNAMIC_DRAW,
                );
            }
        }
        if let Some(ref buf) = self.cloud_size_buffer {
            gl.bind_buffer(WebGl2RenderingContext::ARRAY_BUFFER, Some(buf));
            unsafe {
                let view = js_sys::Float32Array::view(&sizes);
                gl.buffer_data_with_array_buffer_view(
                    WebGl2RenderingContext::ARRAY_BUFFER,
                    &view,
                    WebGl2RenderingContext::DYNAMIC_DRAW,
                );
            }
        }
        if let Some(ref buf) = self.cloud_alpha_buffer {
            gl.bind_buffer(WebGl2RenderingContext::ARRAY_BUFFER, Some(buf));
            unsafe {
                let view = js_sys::Float32Array::view(&alphas);
                gl.buffer_data_with_array_buffer_view(
                    WebGl2RenderingContext::ARRAY_BUFFER,
                    &view,
                    WebGl2RenderingContext::DYNAMIC_DRAW,
                );
            }
        }

        // Compute VP matrix (same as model rendering)
        let (ex, ey, ez) = self.camera.eye();
        let (tx, ty, tz) = self.camera.look_at_target();
        let aspect = self.camera.viewport_width as f32 / self.camera.viewport_height.max(1) as f32;
        let vp = model::compute_vp(&[ex, ey, ez], &[tx, ty, tz], 45.0, aspect, 0.1, 500.0);

        if let Some(ref loc) = self.cloud_vp_loc {
            gl.uniform_matrix4fv_with_f32_array(Some(loc), false, &vp);
        }
        // Parallax offset: based on camera center
        if let Some(ref loc) = self.cloud_parallax_loc {
            gl.uniform2f(Some(loc), self.camera.center_x, self.camera.center_y);
        }
        if let Some(ref loc) = self.cloud_day_phase_loc {
            gl.uniform1f(Some(loc), day_phase as f32);
        }

        // Enable blending for semi-transparent clouds
        gl.enable(WebGl2RenderingContext::BLEND);
        gl.blend_func(WebGl2RenderingContext::SRC_ALPHA, WebGl2RenderingContext::ONE_MINUS_SRC_ALPHA);

        // Draw all cloud quads using instanced rendering
        let instance_count = (positions.len() / 3) as i32;
        self.draw_call_count += 1;
        gl.draw_arrays_instanced(WebGl2RenderingContext::TRIANGLES, 0, 6, instance_count);

        gl.disable(WebGl2RenderingContext::BLEND);
        gl.bind_vertex_array(None);
    }

    // — Phase 7: Sun/Moon Disc Rendering —————————————————————————————

    /// Render a sun or moon disc in the sky, positioned based on day_phase.
    /// The sun follows an arc across the sky; the moon is opposite.
    fn render_sun_moon(&mut self, day_phase: f64) {
        let gl = &self.gl;
        let prog = match self.sun_moon_program.as_ref() {
            Some(p) => p,
            None => return,
        };
        let vao = match self.sun_moon_vao.as_ref() {
            Some(v) => v,
            None => return,
        };

        // Compute sun position in world space using the same arc as the light direction
        let p = day_phase as f32;
        let sun_angle = (p - 0.25) * std::f32::consts::TAU;
        let sun_elev = sun_angle.sin() * 0.8 + 0.2;
        let sun_elev_clamped = sun_elev.max(-0.1);

        // Sun direction in world space (normalized)
        let lx = sun_angle.cos() * sun_elev_clamped.max(0.1);
        let ly = sun_elev_clamped;
        let lz = sun_angle.sin() * sun_elev_clamped.max(0.1);
        let len = (lx*lx + ly*ly + lz*lz).sqrt();
        let sun_dir = [lx/len, ly/len, lz/len];

        // Project sun direction to screen space using the same VP matrix as models
        let (ex, ey, ez) = self.camera.eye();
        let (tx, ty, tz) = self.camera.look_at_target();
        let aspect = self.camera.viewport_width as f32 / self.camera.viewport_height.max(1) as f32;
        let vp = model::compute_vp(&[ex, ey, ez], &[tx, ty, tz], 45.0, aspect, 0.1, 500.0);

        // Transform sun direction to clip space (as direction, ignore translation)
        // Use a point far along the sun direction
        let far_dist = 200.0;
        let world_pos = [
            ex + sun_dir[0] * far_dist,
            ey + sun_dir[1] * far_dist,
            ez + sun_dir[2] * far_dist,
        ];
        // Manual matrix multiply: clip = VP * vec4(world_pos, 1.0)
        let clip = [
            vp[0]*world_pos[0] + vp[4]*world_pos[1] + vp[8]*world_pos[2]  + vp[12],
            vp[1]*world_pos[0] + vp[5]*world_pos[1] + vp[9]*world_pos[2]  + vp[13],
            vp[2]*world_pos[0] + vp[6]*world_pos[1] + vp[10]*world_pos[2] + vp[14],
            vp[3]*world_pos[0] + vp[7]*world_pos[1] + vp[11]*world_pos[2] + vp[15],
        ];

        // If sun is behind camera, skip rendering
        if clip[3] <= 0.0 {
            return;
        }

        let ndc_x = clip[0] / clip[3];
        let ndc_y = clip[1] / clip[3];

        // Disc radius in clip space (roughly 3% of screen)
        let radius = 0.04_f32;

        gl.use_program(Some(prog));
        gl.bind_vertex_array(Some(vao));

        if let Some(ref loc) = self.sun_moon_screen_pos_loc {
            gl.uniform2f(Some(loc), ndc_x, ndc_y);
        }
        if let Some(ref loc) = self.sun_moon_radius_loc {
            gl.uniform1f(Some(loc), radius);
        }
        if let Some(ref loc) = self.sun_moon_day_phase_loc {
            gl.uniform1f(Some(loc), p);
        }

        // Draw sun (is_moon = 0)
        if let Some(ref loc) = self.sun_moon_is_moon_loc {
            gl.uniform1i(Some(loc), 0);
        }

        gl.enable(WebGl2RenderingContext::BLEND);
        gl.blend_func(WebGl2RenderingContext::SRC_ALPHA, WebGl2RenderingContext::ONE_MINUS_SRC_ALPHA);
        self.draw_call_count += 1;
        gl.draw_arrays(WebGl2RenderingContext::TRIANGLES, 0, 6);

        // Draw moon (is_moon = 1) — opposite position
        if let Some(ref loc) = self.sun_moon_is_moon_loc {
            gl.uniform1i(Some(loc), 1);
        }
        if let Some(ref loc) = self.sun_moon_screen_pos_loc {
            gl.uniform2f(Some(loc), -ndc_x, -ndc_y);
        }
        self.draw_call_count += 1;
        gl.draw_arrays(WebGl2RenderingContext::TRIANGLES, 0, 6);

        gl.disable(WebGl2RenderingContext::BLEND);
        gl.bind_vertex_array(None);
    }

    fn render_models(&mut self, elapsed: f32) {
        if self.model_instances.is_empty() {
            return;
        }
        let gl = &self.gl;
        let prog = match self.model_program.as_ref() {
            Some(p) => p,
            None => return,
        };

        gl.use_program(Some(prog));

        // Compute VP matrix from orbital camera
        let (ex, ey, ez) = self.camera.eye();
        let (tx, ty, tz) = self.camera.look_at_target();
        let aspect = self.camera.viewport_width as f32 / self.camera.viewport_height.max(1) as f32;
        let vp = model::compute_vp(&[ex, ey, ez], &[tx, ty, tz], 45.0, aspect, 0.1, 500.0);

        // Set VP matrix uniform (shared across all instances)
        if let Some(ref loc) = self.model_vp_loc {
            gl.uniform_matrix4fv_with_f32_array(Some(loc), false, &vp);
        }

        // View position for specular lighting
        if let Some(ref loc) = self.model_view_pos_loc {
            gl.uniform3f(Some(loc), ex, ey, ez);
        }

        // Light direction (same as terrain — sun arc from day_phase)
        let day_phase = (self.game_loop.state.game_time / 300.0) % 1.0;
        let sun_angle = (day_phase as f32 - 0.25) * std::f32::consts::TAU;
        let sun_elev = sun_angle.sin() * 0.8 + 0.2;
        let lx = sun_angle.cos() * sun_elev.max(0.1);
        let ly = sun_elev.max(0.1);
        let lz = sun_angle.sin() * sun_elev.max(0.1);
        let len = (lx*lx + ly*ly + lz*lz).sqrt();
        if let Some(ref loc) = self.model_light_dir_loc {
            gl.uniform3f(Some(loc), lx/len, ly/len, lz/len);
        }

        // Per-model material uniforms are now set inside the draw loop below

        // Enable instanced path
        if let Some(ref loc) = self.model_use_instanced_loc {
            gl.uniform1f(Some(loc), 1.0);
        }

        // Animation time uniform (for unit wobble)
        if let Some(ref loc) = self.model_time_loc {
            gl.uniform1f(Some(loc), elapsed);
        }

        // Terrain texture atlas for model texturing (reuse terrain texture on TEXTURE0)
        if let Some(ref loc) = self.model_terrain_tex_loc {
            gl.uniform1i(Some(loc), 0); // TEXTURE0
        }
        if let Some(ref loc) = self.model_use_textures_loc {
            gl.uniform1i(Some(loc), if self.textures_loaded { 1 } else { 0 });
        }

        // Day-phase uniform for model ambient lighting
        if let Some(ref loc) = self.model_day_phase_loc {
            gl.uniform1f(Some(loc), day_phase as f32);
        }

        // Distance culling: skip building instances beyond MODEL_CULL_DISTANCE
        // Camera world position (horizontal XZ plane maps to instance x,y)
        let cam_x = ex;
        let cam_z = ez;
        let cull_dist_sq = model::MODEL_CULL_DISTANCE * model::MODEL_CULL_DISTANCE;
        let mut _culled = 0u32;

        // Build model matrix helper
        let build_model_mat = |inst: &model::ModelInstance| -> [f32; 16] {
            let s = inst.scale;
            let ry = inst.rotation_y.to_radians();
            let cos_y = ry.cos();
            let sin_y = ry.sin();
            [
                s * cos_y, 0.0, s * sin_y, 0.0,
                0.0, s, 0.0, 0.0,
                -s * sin_y, 0.0, s * cos_y, 0.0,
                inst.x, 0.0, inst.y, 1.0,
            ]
        };

        // Group instances by model_id (with distance culling + LOD skipping)
        let mut groups: std::collections::HashMap<u8, Vec<(f32, &model::ModelInstance)>> = std::collections::HashMap::new();
        for inst in &self.model_instances {
            let dx = inst.x - cam_x;
            let dy = inst.y - cam_z;
            let dist_sq = dx * dx + dy * dy;
            if dist_sq > cull_dist_sq {
                _culled += 1;
                continue;
            }
            groups.entry(inst.model_id).or_default().push((dist_sq, inst));
        }

        // Per-model instanced draw calls
        for (model_id, instances) in &groups {
            // Look up this model's GPU buffers by integer model_id
            let gpu_model = match self.gpu_models.get(model_id) {
                Some(gm) => gm,
                None => continue, // model not uploaded yet, skip
            };

            // Set per-model material uniforms
            let mat = &gpu_model.material;
            if let Some(ref loc) = self.model_color_loc {
                gl.uniform4f(Some(loc), mat.diffuse[0], mat.diffuse[1], mat.diffuse[2], 1.0);
            }
            if let Some(ref loc) = self.model_roughness_loc {
                gl.uniform1f(Some(loc), mat.roughness);
            }
            if let Some(ref loc) = self.model_metallic_loc {
                gl.uniform1f(Some(loc), mat.metallic);
            }

            // Bind this model's VAO (which has its own index buffer)
            gl.bind_vertex_array(Some(&gpu_model.vao));

            // Build instance data arrays for this model group (with LOD skipping)
            let mut model_mats: Vec<f32> = Vec::new();
            let mut offsets: Vec<f32> = Vec::new();
            let mut anim_phases: Vec<f32> = Vec::new();
            let mut lod_skipped = 0u32;
            for (idx, (dist_sq, inst)) in instances.iter().enumerate() {
                if model::lod_skip_instance(*dist_sq, idx) {
                    lod_skipped += 1;
                    continue;
                }
                let mat = build_model_mat(inst);
                model_mats.extend_from_slice(&mat);
                offsets.extend_from_slice(&[0.0f32, 0.0, 0.0]);
                anim_phases.push(inst.anim_phase);
            }

            // Upload per-instance model matrices
            if let Some(ref buf) = self.model_instance_buffer {
                gl.bind_buffer(WebGl2RenderingContext::ARRAY_BUFFER, Some(buf));
                unsafe {
                    let view = js_sys::Float32Array::view(&model_mats);
                    gl.buffer_data_with_array_buffer_view(
                        WebGl2RenderingContext::ARRAY_BUFFER,
                        &view,
                        WebGl2RenderingContext::DYNAMIC_DRAW,
                    );
                }
                let stride = 64; // 16 floats * 4 bytes
                for i in 0..4 {
                    let loc = 3 + i;
                    gl.vertex_attrib_pointer_with_i32(
                        loc, 4, WebGl2RenderingContext::FLOAT, false, stride, (i * 16) as i32,
                    );
                    gl.enable_vertex_attrib_array(loc);
                    gl.vertex_attrib_divisor(loc, 1);
                }
            }

            // Upload per-instance offsets
            if let Some(ref buf) = self.model_offset_buffer {
                gl.bind_buffer(WebGl2RenderingContext::ARRAY_BUFFER, Some(buf));
                unsafe {
                    let view = js_sys::Float32Array::view(&offsets);
                    gl.buffer_data_with_array_buffer_view(
                        WebGl2RenderingContext::ARRAY_BUFFER,
                        &view,
                        WebGl2RenderingContext::DYNAMIC_DRAW,
                    );
                }
                gl.vertex_attrib_pointer_with_i32(7, 3, WebGl2RenderingContext::FLOAT, false, 0, 0);
                gl.enable_vertex_attrib_array(7);
                gl.vertex_attrib_divisor(7, 1);
            }

            // Upload per-instance animation phase (location 8)
            if let Some(ref buf) = self.model_anim_phase_buffer {
                gl.bind_buffer(WebGl2RenderingContext::ARRAY_BUFFER, Some(buf));
                unsafe {
                    let view = js_sys::Float32Array::view(&anim_phases);
                    gl.buffer_data_with_array_buffer_view(
                        WebGl2RenderingContext::ARRAY_BUFFER,
                        &view,
                        WebGl2RenderingContext::DYNAMIC_DRAW,
                    );
                }
                gl.vertex_attrib_pointer_with_i32(8, 1, WebGl2RenderingContext::FLOAT, false, 0, 0);
                gl.enable_vertex_attrib_array(8);
                gl.vertex_attrib_divisor(8, 1);
            }

            // Instanced draw call for this model group (skip if all LOD-skipped)
            let rendered_count = (instances.len() as u32).saturating_sub(lod_skipped) as i32;
            if rendered_count == 0 {
                gl.bind_vertex_array(None);
                continue;
            }
            self.draw_call_count += 1;
            gl.draw_elements_instanced_with_i32(
                WebGl2RenderingContext::TRIANGLES,
                gpu_model.index_count,
                WebGl2RenderingContext::UNSIGNED_SHORT,
                0,
                rendered_count,
            );

            // Reset instanced divisor for next group
            for i in 0..4 {
                gl.vertex_attrib_divisor(3 + i, 0);
            }
            gl.vertex_attrib_divisor(7, 0);
            gl.vertex_attrib_divisor(8, 0);
        }

        gl.bind_vertex_array(None);

        // Also set u_model for non-instanced fallback compatibility
        if let Some(ref loc) = self.model_model_loc {
            let identity: [f32; 16] = [1.0,0.0,0.0,0.0, 0.0,1.0,0.0,0.0, 0.0,0.0,1.0,0.0, 0.0,0.0,0.0,1.0];
            gl.uniform_matrix4fv_with_f32_array(Some(loc), false, &identity);
        }
    }


    fn render_overlay(&mut self) {
        // Build overlay points from game state
        let mut positions: Vec<f32> = Vec::new();
        let mut colors: Vec<f32> = Vec::new();
        let mut sizes: Vec<f32> = Vec::new();

        // Buildings: colored by type (complete) or orange (constructing)
        for building in self.game_loop.state.economy.buildings.iter() {
            let complete = building.is_complete();
            let con_pct = building.construction; // 0.0–1.0

            positions.push(building.x as f32 + 0.5);
            positions.push(building.y as f32 + 0.5);

            if complete {
                let c = building_color(&building.kind);
                colors.push(c[0]);
                colors.push(c[1]);
                colors.push(c[2]);
                sizes.push(8.0);
            } else {
                // Orange dot, size grows with construction progress
                colors.push(1.0); // R
                colors.push(0.55); // G
                colors.push(0.1); // B
                sizes.push(3.0 + 5.0 * con_pct); // 3.0→8.0
            }
        }

        // Units: blue settlers, red soldiers, green archers
        let use_interp = self.interpolator.can_interpolate();
        let alpha = if use_interp {
            self.interpolator
                .interpolation_alpha(self.last_frame_ms / 1000.0)
        } else {
            0.0
        };

        for unit in self.game_loop.state.economy.units.alive_units() {
            if use_interp {
                if let Some((ix, iy)) = self.interpolator.interpolate_unit_position(unit.id, alpha)
                {
                    positions.push(ix);
                    positions.push(iy);
                } else {
                    // Fall back to actual position if not in snapshots
                    positions.push(unit.x);
                    positions.push(unit.y);
                }
            } else {
                positions.push(unit.x);
                positions.push(unit.y);
            }
            let c = unit_color(&unit.kind);
            colors.push(c[0]);
            colors.push(c[1]);
            colors.push(c[2]);
            sizes.push(5.0);
        }

        // Territory border tiles: render as small colored dots with player nation color
        let border_player_id: u8 = 0; // local player is always player 0
        let border_tiles = self.game_loop.state.map.get_territory_border_tiles(border_player_id);
        if !border_tiles.is_empty() {
            // Get player nation color for border tint
            let border_color = if let Some(nation) = self.game_loop.state.player_nation {
                let (r, g, b, _) = nation.color();
                [r as f32 / 255.0, g as f32 / 255.0, b as f32 / 255.0]
            } else {
                [0.5, 0.8, 1.0] // default blue-ish for no nation
            };
            for &(bx, by) in &border_tiles {
                positions.push(bx as f32 + 0.5);
                positions.push(by as f32 + 0.5);
                colors.push(border_color[0]);
                colors.push(border_color[1]);
                colors.push(border_color[2]);
                sizes.push(4.0); // smaller than buildings, visible but not dominant
            }
        }

        // Phase 6: Append particle overlay data
        let (p_positions, p_colors, p_sizes) = self.particle_system.get_overlay_data();
        if !p_positions.is_empty() {
            positions.extend(p_positions);
            colors.extend(p_colors);
            sizes.extend(p_sizes);
        }
    // Map editor grid overlay: semi-transparent dots at tile corners
    if self.editor_grid {
        let map = &self.game_loop.state.map;
        let dot_spacing = 2; // every Nth tile corner for performance
        for y in (0..=map.height).step_by(dot_spacing) {
            for x in (0..=map.width).step_by(dot_spacing) {
                positions.push(x as f32);
                positions.push(y as f32);
                colors.push(0.3);
                colors.push(0.3);
                colors.push(0.3);
                sizes.push(2.5);
            }
        }
    }

        if positions.is_empty() {
            return;
        }

        let gl = &self.gl;

        // Rebuild overlay buffers if dirty
        if true { // always rebuild since game state changes
            // always rebuild since game state changes
            gl.bind_buffer(
                WebGl2RenderingContext::ARRAY_BUFFER,
                Some(&self.overlay_pos_buffer),
            );
            unsafe {
                let view = js_sys::Float32Array::view(&positions);
                gl.buffer_data_with_array_buffer_view(
                    WebGl2RenderingContext::ARRAY_BUFFER,
                    &view,
                    WebGl2RenderingContext::DYNAMIC_DRAW,
                );
            }
            gl.bind_buffer(
                WebGl2RenderingContext::ARRAY_BUFFER,
                Some(&self.overlay_color_buffer),
            );
            unsafe {
                let view = js_sys::Float32Array::view(&colors);
                gl.buffer_data_with_array_buffer_view(
                    WebGl2RenderingContext::ARRAY_BUFFER,
                    &view,
                    WebGl2RenderingContext::DYNAMIC_DRAW,
                );
            }
            gl.bind_buffer(
                WebGl2RenderingContext::ARRAY_BUFFER,
                Some(&self.overlay_size_buffer),
            );
            unsafe {
                let view = js_sys::Float32Array::view(&sizes);
                gl.buffer_data_with_array_buffer_view(
                    WebGl2RenderingContext::ARRAY_BUFFER,
                    &view,
                    WebGl2RenderingContext::DYNAMIC_DRAW,
                );
            }
            self.overlay_index_count = (positions.len() / 2) as i32;
        }

        gl.use_program(Some(&self.overlay_program));

        let iso_x = (self.camera.center_x - self.camera.center_y) * 0.866;
        let iso_y = (self.camera.center_x + self.camera.center_y) * 0.5;

        gl.uniform2f(Some(&self.overlay_camera_center_loc), iso_x, iso_y);
        gl.uniform1f(Some(&self.overlay_zoom_loc), self.camera.zoom);

        // Pass player nation color for overlay dot tinting (buildings + units)
        if let Some(ref loc) = self.overlay_player_rgb_loc {
            let rgb = if let Some(nation) = self.game_loop.state.player_nation {
                let (r, g, b, _) = nation.color();
                [r as f32 / 255.0, g as f32 / 255.0, b as f32 / 255.0]
            } else {
                [0.0, 0.0, 0.0] // no nation = no tint
            };
            gl.uniform3f(Some(loc), rgb[0], rgb[1], rgb[2]);
        }

        let canvas = gl
            .canvas()
            .unwrap()
            .dyn_into::<HtmlCanvasElement>()
            .unwrap();
        gl.uniform2f(
            Some(&self.overlay_resolution_loc),
            canvas.width() as f32 * 0.5,
            canvas.height() as f32 * 0.5,
        );

        gl.enable(WebGl2RenderingContext::BLEND);
        gl.blend_func(
            WebGl2RenderingContext::SRC_ALPHA,
            WebGl2RenderingContext::ONE_MINUS_SRC_ALPHA,
        );

        gl.bind_vertex_array(Some(&self.overlay_vao));
        self.draw_call_count += 1;
        gl.draw_arrays(WebGl2RenderingContext::POINTS, 0, self.overlay_index_count);
        gl.disable(WebGl2RenderingContext::BLEND);
    }

    fn rebuild_mesh(&mut self) {
        // Debug toggle: show full map bypasses fog of war
        if self.show_full_map {
            self.map.set_all_visible();
        }
        let mesh = build_map_mesh(&self.map, &self.camera);

        let gl = &self.gl;
        gl.bind_buffer(
            WebGl2RenderingContext::ARRAY_BUFFER,
            Some(&self.position_buffer),
        );
        update_f32_buffer(gl, &mesh.positions);

        gl.bind_buffer(
            WebGl2RenderingContext::ARRAY_BUFFER,
            Some(&self.color_buffer),
        );
        update_f32_buffer(gl, &mesh.colors);

        gl.bind_buffer(
            WebGl2RenderingContext::ARRAY_BUFFER,
            Some(&self.elevation_buffer),
        );
        update_f32_buffer(gl, &mesh.elevations);

        gl.bind_buffer(
            WebGl2RenderingContext::ARRAY_BUFFER,
            Some(&self.resource_buffer),
        );
        update_f32_buffer(gl, &mesh.has_resources);

        gl.bind_buffer(
            WebGl2RenderingContext::ARRAY_BUFFER,
            Some(&self.slope_buffer),
        );
        update_f32_buffer(gl, &mesh.slopes);

        gl.bind_buffer(
            WebGl2RenderingContext::ARRAY_BUFFER,
            Some(&self.edge_buffer),
        );
        update_f32_buffer(gl, &mesh.edge_dists);

        if let Some(ref buf) = self.uvs_buffer {
            gl.bind_buffer(WebGl2RenderingContext::ARRAY_BUFFER, Some(buf));
            update_f32_buffer(gl, &mesh.uvs);
        }
        if let Some(ref buf) = self.terrain_id_buffer {
            gl.bind_buffer(WebGl2RenderingContext::ARRAY_BUFFER, Some(buf));
            update_f32_buffer(gl, &mesh.terrain_ids);
        }
        if let Some(ref buf) = self.visibility_buffer {
            gl.bind_buffer(WebGl2RenderingContext::ARRAY_BUFFER, Some(buf));
            update_f32_buffer(gl, &mesh.visibilities);
        }
        if let Some(ref buf) = self.normal_buffer {
            gl.bind_buffer(WebGl2RenderingContext::ARRAY_BUFFER, Some(buf));
            update_f32_buffer(gl, &mesh.normals);
        }
        if let Some(ref buf) = self.splat_buffer {
            gl.bind_buffer(WebGl2RenderingContext::ARRAY_BUFFER, Some(buf));
            update_f32_buffer(gl, &mesh.splats);
        }
        if let Some(ref buf) = self.ao_buffer {
            gl.bind_buffer(WebGl2RenderingContext::ARRAY_BUFFER, Some(buf));
            update_f32_buffer(gl, &mesh.ao_factors);
        }

        gl.bind_buffer(
            WebGl2RenderingContext::ELEMENT_ARRAY_BUFFER,
            Some(&self.index_buffer),
        );
        unsafe {
            let view = js_sys::Uint16Array::view(&mesh.indices);
            gl.buffer_data_with_array_buffer_view(
                WebGl2RenderingContext::ELEMENT_ARRAY_BUFFER,
                &view,
                WebGl2RenderingContext::DYNAMIC_DRAW,
            );
        }

        self.index_count = mesh.indices.len() as i32;
    }
}

// ── Helper Functions ──────────────────────────────────────────────────────────

fn compile_shader(
    gl: &WebGl2RenderingContext,
    shader_type: u32,
    source: &str,
    label: &str,
) -> Result<WebGlShader, JsValue> {
    let shader = gl
        .create_shader(shader_type)
        .ok_or("Cannot create shader")?;
    gl.shader_source(&shader, source);
    gl.compile_shader(&shader);

    if !gl
        .get_shader_parameter(&shader, WebGl2RenderingContext::COMPILE_STATUS)
        .as_bool()
        .unwrap_or(false)
    {
        let log = gl
            .get_shader_info_log(&shader)
            .unwrap_or_else(|| "Unknown error".into());
        gl.delete_shader(Some(&shader));
        return Err(JsValue::from_str(&format!("Shader compile error [{}]: {}", label, log)));
    }

    Ok(shader)
}

fn link_program(
    gl: &WebGl2RenderingContext,
    vert: &WebGlShader,
    frag: &WebGlShader,
) -> Result<WebGlProgram, JsValue> {
    let program = gl.create_program().ok_or("Cannot create program")?;
    gl.attach_shader(&program, vert);
    gl.attach_shader(&program, frag);
    gl.link_program(&program);

    if !gl
        .get_program_parameter(&program, WebGl2RenderingContext::LINK_STATUS)
        .as_bool()
        .unwrap_or(false)
    {
        let log = gl
            .get_program_info_log(&program)
            .unwrap_or_else(|| "Unknown error".into());
        gl.delete_program(Some(&program));
        return Err(JsValue::from_str(&format!("Program link error: {}", log)));
    }

    Ok(program)
}

fn upload_f32_buffer(
    gl: &WebGl2RenderingContext,
    data: &[f32],
    location: u32,
    components: i32,
) -> WebGlBuffer {
    let buffer = gl.create_buffer().expect("Cannot create buffer");
    gl.bind_buffer(WebGl2RenderingContext::ARRAY_BUFFER, Some(&buffer));
    unsafe {
        let view = js_sys::Float32Array::view(data);
        gl.buffer_data_with_array_buffer_view(
            WebGl2RenderingContext::ARRAY_BUFFER,
            &view,
            WebGl2RenderingContext::STATIC_DRAW,
        );
    }
    gl.enable_vertex_attrib_array(location);
    gl.vertex_attrib_pointer_with_i32(
        location,
        components,
        WebGl2RenderingContext::FLOAT,
        false,
        0,
        0,
    );
    buffer
}

fn update_f32_buffer(gl: &WebGl2RenderingContext, data: &[f32]) {
    unsafe {
        let view = js_sys::Float32Array::view(data);
        gl.buffer_data_with_array_buffer_view(
            WebGl2RenderingContext::ARRAY_BUFFER,
            &view,
            WebGl2RenderingContext::DYNAMIC_DRAW,
        );
    }
}

/// Get the color for a building type (RGB, 0.0-1.0).
fn building_color(kind: &crate::economy::BuildingType) -> [f32; 3] {
    use crate::economy::BuildingType::*;
    match kind {
        Castle => [1.0, 0.8, 0.2],      // gold
        Sawmill => [0.6, 0.4, 0.2],     // brown
        Stonecutter => [0.5, 0.5, 0.5], // grey
        Mine => [0.4, 0.3, 0.3],        // dark red
        Toolsmith => [0.8, 0.2, 0.2],   // red
        Weaponsmith => [0.7, 0.1, 0.1], // dark red
        Bakery => [0.8, 0.6, 0.3],      // tan
        Butcher => [0.6, 0.2, 0.2],     // maroon
        Mill => [0.5, 0.3, 0.2],        // dark brown
        Farm => [0.3, 0.7, 0.3],        // green
        Fisherman => [0.2, 0.5, 0.8],   // blue
        Woodcutter => [0.2, 0.5, 0.2],  // dark green
        Storehouse => [0.6, 0.5, 0.4],  // taupe
        Waterworks => [0.2, 0.6, 1.0],  // water blue
        Smelter => [1.0, 0.5, 0.1],     // orange
        Barracks => [0.8, 0.2, 0.2],    // crimson
        GuardTower => [0.45, 0.4, 0.35],     // stone grey
        Fortress => [0.4, 0.35, 0.3],          // dark stone grey
        SiegeWorkshop => [0.6, 0.3, 0.1],       // rusty orange
        Shipyard => [0.2, 0.4, 0.6],            // nautical blue
        RoadLayer => [0.5, 0.45, 0.35],          // tan/sand
        Apiary => [0.9, 0.8, 0.2],               // honey gold
        MeadMaker => [0.7, 0.5, 0.2],             // mead amber
        TempleOfBacchus => [0.8, 0.6, 0.2],      // temple gold
        Colosseum => [0.7, 0.5, 0.3],            // arena sandstone
        SanctuaryOfMinerva => [0.9, 0.8, 0.6],   // marble white
        SanctuaryOfVulcan => [0.8, 0.3, 0.1],    // forge orange-red
        MeadHall => [0.7, 0.6, 0.3],             // mead amber/tan
        SanctuaryOfOdin => [0.3, 0.4, 0.7],      // Norse blue
        SanctuaryOfThor => [0.6, 0.3, 0.1],       // thunder bronze
        SanctuaryOfFreya => [0.5, 0.7, 0.4],      // nature green
        Runestone => [0.55, 0.5, 0.45],           // stone grey-blue
        TempleOfChac => [0.2, 0.6, 0.9],             // rain blue
        AgaveFarm => [0.3, 0.7, 0.3],                 // agave green
        Distillery => [0.7, 0.5, 0.3],                 // pulque amber
        SanctuaryOfKukulkan => [0.3, 0.7, 0.5],       // jungle green
        SanctuaryOfQuetzalcoatl => [0.5, 0.8, 0.6],   // wind green
        SanctuaryOfHuitzilopochtli => [0.8, 0.2, 0.1], // war red
        Observatory => [0.9, 0.85, 0.7],               // limestone
        OracleOfApollo => [0.9, 0.85, 0.4],               // golden oracle
        SanctuaryOfArtemis => [0.6, 0.85, 0.5],          // forest green
        SanctuaryOfPoseidon => [0.2, 0.5, 0.8],          // ocean blue
        SanctuaryOfApollo => [0.95, 0.85, 0.3],          // sun gold
        Amphitheater => [0.85, 0.8, 0.65],               // marble
        DarkTemple => [0.3, 0.15, 0.3],               // dark purple (DarkTribe)
        DarkGarden => [0.15, 0.25, 0.1],              // dark garden green (DarkTribe)
        MushroomFarm => [0.4, 0.3, 0.2],              // mushroom brown (DarkTribe)
        SanctuaryOfMorbus => [0.35, 0.15, 0.2],        // disease dark red (DarkTribe)
        SanctuaryOfPestilence => [0.25, 0.3, 0.15],    // pestilence green (DarkTribe)
        DarkFortress => [0.2, 0.18, 0.2],              // dark obsidian (DarkTribe)
        DemonGate => [0.5, 0.1, 0.05],                // demonic red-orange (DarkTribe)
            GoldMine => [0.8, 0.7, 0.1],
            CoalMine => [0.15, 0.15, 0.15],
            IronOreMine => [0.5, 0.3, 0.2],
            SulfurMine => [0.9, 0.9, 0.1],
            GoldSmelter => [0.9, 0.75, 0.2],
            IronSmelter => [0.4, 0.35, 0.3],
            Slaughterhouse => [0.6, 0.2, 0.2],
            OilPress => [0.6, 0.5, 0.2],
            PowderMill => [0.3, 0.3, 0.35],
            WeaponFoundry => [0.4, 0.3, 0.35],
            Forester => [0.15, 0.55, 0.15],
            Healer => [0.9, 0.9, 0.9],
            GoatRanch => [0.6, 0.5, 0.4],
            PigRanch => [0.7, 0.5, 0.6],
            GooseRanch => [0.8, 0.8, 0.6],
            DonkeyRanch => [0.5, 0.4, 0.35],
            TrojanFarm => [0.7, 0.6, 0.3],
            Marketplace => [0.9, 0.8, 0.4],
            LandingDock => [0.5, 0.4, 0.3],
            Vineyard => [0.4, 0.6, 0.2],
            StorageYard => [0.5, 0.45, 0.4],
            SmallResidence => [0.7, 0.65, 0.5],
            MediumResidence => [0.7, 0.6, 0.45],
            LargeResidence => [0.75, 0.55, 0.35],
            SmallTemple => [0.9, 0.85, 0.7],
            LargeTemple => [0.95, 0.9, 0.75],

    }
}
/// Get the color for a unit kind (RGB, 0.0-1.0).
fn unit_color(kind: &crate::units::UnitKind) -> [f32; 3] {
    use crate::units::UnitKind::*;
    match kind {
        Settler => [0.2, 0.4, 1.0],
        Swordsman => [1.0, 0.2, 0.2],
        Bowman => [0.2, 0.8, 0.2],
        _ => [0.5, 0.5, 0.5],
    }
}

// ── Public API (called from JavaScript) ────────────────────────────────────────

/// Initialize the engine on a canvas element.
/// Returns true on success.
#[wasm_bindgen]
pub fn init(canvas_id: &str) -> Result<bool, JsValue> {
    let window = window().ok_or("No window")?;
    let document = window.document().ok_or("No document")?;
    let canvas = document
        .get_element_by_id(canvas_id)
        .ok_or("Canvas not found")?
        .dyn_into::<HtmlCanvasElement>()?;

    // Use window dimensions, not parent.clientHeight (empty body → 19px on mobile)
    let win = web_sys::window().ok_or("No window")?;
    let w = win.inner_width().ok().and_then(|w| w.as_f64()).unwrap_or(1024.0) as u32;
    let h = win.inner_height().ok().and_then(|h| h.as_f64()).unwrap_or(768.0) as u32;
    canvas.set_width(w.max(1));
    canvas.set_height(h.max(1));

    let mut app = App::new(&canvas)?;
    app.resize(w.max(1), h.max(1));

    unsafe {
        APP = Some(app);
    }

    Ok(true)
}
/// Called from JS after terrain textures are fully loaded into the shared WebGL context.
/// JS creates the TEXTURE_2D_ARRAY with 8 layers (1024×1024), then calls this.
#[wasm_bindgen]
pub fn set_textures_ready() {
    let app = unsafe { (*std::ptr::addr_of_mut!(APP)).as_mut().expect("App not initialized") };
    app.textures_loaded = true;
    web_sys::console::log_1(&"Terrain textures ready (8 layers, 1024x1024)".into());
}
/// Called from JS after water normal map is loaded into TEXTURE1.
#[wasm_bindgen]
pub fn set_water_normal_ready() {
    let app = unsafe { (*std::ptr::addr_of_mut!(APP)).as_mut().expect("App not initialized") };
    app.water_normal_ready = true;
    web_sys::console::log_1(&"Water normal map ready (TEXTURE1)".into());
}
/// Called from JS when the WebGL context is lost (canvas webglcontextlost event).
/// Sets a flag that suspends all rendering until context restoration.
#[wasm_bindgen]
pub fn on_webgl_context_lost() {
    unsafe {
        if let Some(ref mut app) = APP {
            app.context_lost = true;
            web_sys::console::warn_1(&"WebGL context lost — rendering suspended".into());
        }
    }
}

/// Called from JS when the WebGL context is restored (canvas webglcontextrestored event).
/// Recreates all WebGL resources (shaders, buffers, programs, FBOs) from scratch
/// while preserving game state (map, economy, units, particles).
#[wasm_bindgen]
pub fn on_webgl_context_restored() {
    unsafe {
        if let Some(ref mut app) = APP {
            web_sys::console::log_1(&"WebGL context restored — recreating resources".into());
            if let Err(e) = app.reinit_webgl() {
                web_sys::console::error_1(&format!("WebGL reinit failed: {:?}", e).into());
                return;
            }
            app.context_lost = false;
            app.mesh_dirty = true;
            app.overlay_dirty = true;
            web_sys::console::log_1(&"WebGL resources recreated successfully".into());
        }
    }
}

#[wasm_bindgen]
pub fn render(timestamp: f64) {
    unsafe {
        if let Some(ref mut app) = APP {
            app.render(timestamp);
        }
    }
}
/// Handle window/canvas resize.
#[wasm_bindgen]
pub fn resize() {
    unsafe {
        if let Some(ref mut app) = APP {
            let canvas = app
                .gl
                .canvas()
                .unwrap()
                .dyn_into::<HtmlCanvasElement>()
                .unwrap();
            let win = window().unwrap();
            let w = win.inner_width().ok().and_then(|w| w.as_f64()).unwrap_or(1024.0) as u32;
            let h = win.inner_height().ok().and_then(|h| h.as_f64()).unwrap_or(768.0) as u32;
            canvas.set_width(w.max(1));
            canvas.set_height(h.max(1));
            app.resize(w.max(1), h.max(1));
        }
    }
}
/// Handle mouse down for panning
#[wasm_bindgen]
pub fn on_mouse_down(x: f32, y: f32) {
    unsafe {
        if let Some(ref mut app) = APP {
            app.mouse_down = true;
            app.last_mouse_x = x;
            app.last_mouse_y = y;
        }
    }
}
/// Handle mouse move for panning
#[wasm_bindgen]
pub fn on_mouse_move(x: f32, y: f32) {
    unsafe {
        if let Some(ref mut app) = APP {
            if app.mouse_down {
                let dx = x - app.last_mouse_x;
                let dy = y - app.last_mouse_y;
                app.camera.pan_screen(dx, dy);
                app.mesh_dirty = true;
            }
            app.last_mouse_x = x;
            app.last_mouse_y = y;
        }
    }
}
/// Handle mouse up (stop panning)
#[wasm_bindgen]
pub fn on_mouse_up() {
    unsafe {
        if let Some(ref mut app) = APP {
            app.mouse_down = false;
        }
    }
}
/// Handle scroll wheel for zooming
#[wasm_bindgen]
pub fn on_wheel(delta_y: f32) {
    unsafe {
        if let Some(ref mut app) = APP {
            let factor = if delta_y > 0.0 { 0.9 } else { 1.1 };
            app.camera.zoom_by(factor);
            app.mesh_dirty = true;
        }
    }
}
/// Engine stats returned by `get_stats` — replaces JSON string with typed struct.
/// `fps` is the currently displayed FPS. `ticks` is the game tick counter.
/// `game_time` is the elapsed game time in seconds. `zoom` is the camera zoom factor.
#[wasm_bindgen]
#[derive(Copy, Clone)]
pub struct StatsInfo {
    pub fps: u32,
    pub ticks: u32,
    pub game_time: f32,
    pub zoom: f32,
    pub frame_time_ms: f32,
    pub fps_min: u32,
    pub fps_max: u32,
    pub fps_avg: f32,
    pub fps_sample_count: u32,
    pub fps_visible: bool,
}

/// Get engine stats as a typed struct (replaces JSON string, eliminating JSON.parse()).
// (wasm_bindgen removed - not needed for private fn)
/// Compute frametime histogram from a ring buffer of frame times (in seconds).
/// Returns 8 buckets representing frame time ranges in milliseconds.
/// Buckets: <8ms, 8-12ms, 12-16ms, 16-20ms, 20-25ms, 25-33ms, 33-50ms, >50ms
#[allow(dead_code)]
pub(crate) fn compute_frametime_histogram(times: &[f32]) -> Vec<u32> {
    let mut buckets = [0u32; 8];
    for &t in times {
        if t <= 0.0 { continue; }
        let ms = t * 1000.0;
        let bucket = if ms < 8.0 { 0 }
        else if ms < 12.0 { 1 }
        else if ms < 16.0 { 2 }
        else if ms < 20.0 { 3 }
        else if ms < 25.0 { 4 }
        else if ms < 33.0 { 5 }
        else if ms < 50.0 { 6 }
        else { 7 };
        buckets[bucket] += 1;
    }
    buckets.to_vec()
}

#[wasm_bindgen]
pub fn get_frametime_histogram() -> Vec<u32> {
    unsafe {
        if let Some(ref app) = APP {
            compute_frametime_histogram(&app.frame_times)
        } else {
            vec![0u32; 8]
        }
    }
}

/// Engine stats exported as structured type (avoids JSON.parse overhead).
pub fn get_stats() -> Option<StatsInfo> {
    unsafe {
        (*std::ptr::addr_of!(APP)).as_ref().map(|app| StatsInfo {
            fps: app.current_fps,
            ticks: app.game_loop.state.tick_count as u32,
            game_time: app.game_loop.state.game_time as f32,
            zoom: app.camera.zoom,
            frame_time_ms: app.last_frame_time_ms,
            fps_min: app.fps_min,
            fps_max: app.fps_max,
            fps_avg: if app.fps_sample_count > 0 { app.fps_accum as f32 } else { 0.0 },
            fps_sample_count: app.fps_sample_count as u32,
            fps_visible: app.fps_visible,
        })
    }
}
/// Get the full map as a compact Vec<u8> for minimap rendering.
/// Layout: [width_lo, width_hi, height_lo, height_hi, terrain_byte, terrain_byte, ...]
/// Each tile is one byte (terrain type as u8, matching Terrain enum repr).
#[wasm_bindgen]
pub fn get_map_data() -> Vec<u8> {
    unsafe {
        if let Some(ref app) = APP {
            let w = app.map.width;
            let h = app.map.height;
            // Guard against inconsistent map state (tile count mismatch)
            let tile_count = w.checked_mul(h).unwrap_or(0);
            if tile_count == 0 || app.map.tiles_len() != tile_count {
                return Vec::new();
            }
            let cap = 4usize.checked_add(tile_count).unwrap_or(0);
            if cap == 0 {
                return Vec::new();
            }
            let mut data = Vec::with_capacity(cap);
            data.push((w & 0xFF) as u8);
            data.push((w >> 8) as u8);
            data.push((h & 0xFF) as u8);
            data.push((h >> 8) as u8);
            for y in 0..h {
                for x in 0..w {
                    let terrain = app.map.get(x, y).map(|t| t.terrain as u8).unwrap_or(0u8);
                    data.push(terrain);
                }
            }
            return data;
        }
    }
    Vec::new()
}
/// Result struct for load_map_json — replaces JSON string status.
/// `ok` is true on success, `error` contains the error message on failure.
#[wasm_bindgen]
pub struct LoadMapResult {
    ok: bool,
    error: String,
}

#[wasm_bindgen]
impl LoadMapResult {
    /// True if the map was loaded successfully.
    #[wasm_bindgen(getter)]
    pub fn ok(&self) -> bool { self.ok }

    /// Error message if loading failed, empty string on success.
    #[wasm_bindgen(getter)]
    pub fn error(&self) -> String { self.error.clone() }
}

/// Load a map from JSON string (same format as exported by to_json()).
/// Format: {"width":64,"height":64,"tiles":[{"t":0,"e":0.0,"r":0},...]}
/// t=terrain id (0-7), e=elevation, r=map::Resource discriminant (0-7) or null
/// Returns a LoadMapResult with ok=true on success or ok=false with error message.
#[wasm_bindgen]
pub fn load_map_json(json: &str) -> LoadMapResult {
    unsafe {
        if let Some(ref mut app) = APP {
            match parse_map_json(json) {
                Ok(new_map) => {
                    app.map = new_map;
                    app.camera.center_x = app.map.width as f32 * 0.5;
                    app.camera.center_y = app.map.height as f32 * 0.5;
                    app.camera.zoom = 1.0;
                    app.mesh_dirty = true;
                    app.overlay_dirty = true;
                    // Reset game state for the new map
                    app.game_loop = GameLoop::new(GameState::new(app.map.clone()));
                    // Compute initial visibility from the starter base entities
                    // (all tiles start at 0.0 visibility = fully fogged)
                    let buildings: Vec<(crate::economy::BuildingType, usize, usize)> = app
                        .game_loop
                        .state
                        .economy
                        .buildings
                        .iter()
                        .map(|b| (b.kind, b.x, b.y))
                        .collect();
                    let units: Vec<(crate::units::UnitKind, f32, f32)> = app
                        .game_loop
                        .state
                        .economy
                        .units
                        .alive_units()
                        .map(|u| (u.kind, u.x, u.y))
                        .collect();
                    app.map.compute_visibility_from_entities(&buildings, &units);
                    LoadMapResult { ok: true, error: String::new() }
                }
                Err(e) => {
                    // On parse failure, show a water-filled map (not stale grass)
                    // to make the error visually obvious
                    let (w, h) = (app.map.width, app.map.height);
                    let mut water_map = Map::new(w, h);
                    for y in 0..h {
                        for x in 0..w {
                            if let Some(tile) = water_map.get_mut(x, y) {
                                tile.terrain = Terrain::Water;
                                tile.elevation = 0.0;
                                tile.resource = None;
                            }
                        }
                    }
                    app.map = water_map;
                    app.mesh_dirty = true;
                    LoadMapResult { ok: false, error: format!("parse error: {}", e) }
                }
            }
        } else {
            LoadMapResult { ok: false, error: String::from("engine not initialized") }
        }
    }
}

/// Find a top-level JSON object field by key, return its raw value string.
/// Handles: {"key": value, ...} — value can be number, string, array, object, null, bool.
/// Tolerates whitespace between key and colon.
fn extract_json_field<'a>(json: &'a str, key: &str) -> Option<&'a str> {
    let bytes = json.as_bytes();
    let key_pat = format!("\"{}\"", key);  // just the quoted key
    let key_bytes = key_pat.as_bytes();
    let mut i = 0;
    while i + key_bytes.len() <= bytes.len() {
        if bytes[i..].starts_with(key_bytes) {
            // Found the key, now skip whitespace and find the colon
            let mut j = i + key_bytes.len();
            while j < bytes.len() && (bytes[j] == b' ' || bytes[j] == b'\t'
                || bytes[j] == b'\n' || bytes[j] == b'\r') {
                j += 1;
            }
            if j >= bytes.len() || bytes[j] != b':' { continue; }
            j += 1;  // skip the colon
            while j < bytes.len() && (bytes[j] == b' ' || bytes[j] == b'\t'
                || bytes[j] == b'\n' || bytes[j] == b'\r') {
                j += 1;
            }
            if j >= bytes.len() { return None; }
            // Determine value extent
            let val_start = j;
            match bytes[j] {
                b'"' => {
                    // String: find closing quote (skip escapes)
                    j += 1;
                    while j < bytes.len() {
                        if bytes[j] == b'\\' { j += 2; continue; }
                        if bytes[j] == b'"' { return Some(&json[val_start..=j]); }
                        j += 1;
                    }
                    return None;
                }
                b'[' | b'{' => {
                    // Array or object: track nesting
                    let open = bytes[j];
                    let close = if open == b'[' { b']' } else { b'}' };
                    let mut depth = 1;
                    let mut in_string = false;
                    j += 1;
                    while j < bytes.len() && depth > 0 {
                        if in_string {
                            if bytes[j] == b'\\' { j += 2; continue; }
                            if bytes[j] == b'"' { in_string = false; }
                        } else {
                            match bytes[j] {
                                b'"' => in_string = true,
                                c if c == open => depth += 1,
                                c if c == close => depth -= 1,
                                _ => {}
                            }
                        }
                        j += 1;
                    }
                    return Some(&json[val_start..j]);
                }
                b't' | b'f' | b'n' => {
                    // true, false, null — read until delimiter
                    while j < bytes.len() && bytes[j] != b',' && bytes[j] != b'}' {
                        j += 1;
                    }
                    return Some(&json[val_start..j]);
                }
                _ => {
                    // Number: read until delimiter
                    while j < bytes.len() && bytes[j] != b',' && bytes[j] != b'}'
                        && bytes[j] != b' ' && bytes[j] != b'\t'
                        && bytes[j] != b'\n' && bytes[j] != b'\r' {
                        j += 1;
                    }
                    return Some(&json[val_start..j]);
                }
            }
        }
        i += 1;
    }
    None
}

/// Extract a numeric value from a tile sub-object string like `{"t":0,"e":1.5,"r":2}`.
/// Returns the raw value string for the given key, trimmed.
fn extract_tile_field(tile_str: &str, key: &str) -> Option<String> {
    let pat = format!("\"{}\"", key);  // just the quoted key
    let bytes = tile_str.as_bytes();
    let pat_bytes = pat.as_bytes();
    let mut i = 0;
    while i + pat_bytes.len() <= bytes.len() {
        if bytes[i..].starts_with(pat_bytes) {
            // Skip whitespace and find colon
            let mut j = i + pat_bytes.len();
            while j < bytes.len() && (bytes[j] == b' ' || bytes[j] == b'\t'
                || bytes[j] == b'\n' || bytes[j] == b'\r') {
                j += 1;
            }
            if j >= bytes.len() || bytes[j] != b':' { continue; }
            j += 1;  // skip colon
            // Skip whitespace after colon
            while j < bytes.len() && (bytes[j] == b' ' || bytes[j] == b'\t') {
                j += 1;
            }
            if j >= bytes.len() { return None; }
            let val_start = j;
            // Read until , or }
            while j < bytes.len() && bytes[j] != b',' && bytes[j] != b'}' {
                j += 1;
            }
            let val = tile_str[val_start..j].trim();
            return Some(val.to_string());
        }
        i += 1;
    }
    None
}

/// Split a JSON array string `[a,b,c]` into individual element strings.
fn split_json_array(arr_str: &str) -> Vec<&str> {
    let bytes = arr_str.as_bytes();
    let mut elements = Vec::new();
    if bytes.is_empty() || bytes[0] != b'[' { return elements; }
    let mut i = 1; // skip opening [
    let mut elem_start = None;
    let mut depth = 0;
    let mut in_string = false;
    while i < bytes.len() {
        let c = bytes[i];
        if elem_start.is_none() && c != b' ' && c != b'\t' && c != b'\n' && c != b'\r' && c != b',' {
            elem_start = Some(i);
        }
        if in_string {
            if c == b'\\' { i += 1; }
            else if c == b'"' { in_string = false; }
        } else {
            match c {
                b'"' => in_string = true,
                b'[' | b'{' => depth += 1,
                b']' | b'}' => {
                    if depth == 0 {
                        if c == b']' {
                            if let Some(s) = elem_start {
                                if s < i { elements.push(&arr_str[s..i]); }
                            }
                            return elements;
                        }
                        depth -= 1;
                    } else {
                        depth -= 1;
                    }
                }
                b',' if depth == 0 => {
                    if let Some(s) = elem_start {
                        elements.push(&arr_str[s..i]);
                        elem_start = None;
                    }
                }
                _ => {}
            }
        }
        i += 1;
    }
    elements
}

fn parse_map_json(json: &str) -> Result<Map, String> {
    // Trim whitespace and strip BOM
    let trimmed = json.trim().trim_start_matches('\u{feff}');

    // Extract width and height using manual field extraction
    let width_str = extract_json_field(trimmed, "width")
        .ok_or("missing width")?;
    let width: usize = width_str.trim().parse()
        .map_err(|_| format!("invalid width: {}", width_str))?;

    let height_str = extract_json_field(trimmed, "height")
        .ok_or("missing height")?;
    let height: usize = height_str.trim().parse()
        .map_err(|_| format!("invalid height: {}", height_str))?;

    if width == 0 || width > 1024 || height == 0 || height > 1024 {
        return Err(format!("invalid dimensions: {}×{}", width, height));
    }

    let tiles_arr_str = extract_json_field(trimmed, "tiles")
        .ok_or("missing tiles array")?;

    let tile_strs = split_json_array(tiles_arr_str);

    let mut map = Map::new(width, height);

    for (i, tile_str) in tile_strs.iter().enumerate() {
        if i >= width * height {
            break;
        }
        let x = i % width;
        let y = i / width;

        // Integer-key format: {t: ter_id, e: elev, r: res_id|null}
        let terrain: Terrain = if let Some(t_str) = extract_tile_field(tile_str, "t") {
            let t: u64 = t_str.parse()
                .map_err(|_| format!("invalid terrain id '{}' at ({},{})''", t_str, x, y))?;
            match t {
                0 => Terrain::Grass,
                1 => Terrain::Forest,
                2 => Terrain::Mountain,
                3 => Terrain::Water,
                4 => Terrain::DeepWater,
                5 => Terrain::Desert,
                6 => Terrain::Swamp,
                7 => Terrain::Snow,
                _ => return Err(format!("invalid terrain id {} at ({},{})''", t, x, y)),
            }
        } else {
            return Err(format!("tile at ({},{}) has no terrain", x, y));
        };

        let elevation = if let Some(e_str) = extract_tile_field(tile_str, "e") {
            e_str.trim().parse::<f64>().unwrap_or(0.0) as f32
        } else {
            0.0
        };

        let resource = if let Some(r_str) = extract_tile_field(tile_str, "r") {
            let r_str = r_str.trim();
            if r_str == "null" || r_str.is_empty() {
                None
            } else {
                match r_str.parse::<u64>() {
                    Ok(0) => Some(map::Resource::Iron),
                    Ok(1) => Some(map::Resource::Coal),
                    Ok(2) => Some(map::Resource::Gold),
                    Ok(3) => Some(map::Resource::Stone),
                    Ok(4) => Some(map::Resource::Sulfur),
                    Ok(5) => Some(map::Resource::Fish),
                    Ok(6) => Some(map::Resource::Game),
                    Ok(7) => Some(map::Resource::Grain),
                    _ => None,
                }
            }
        } else {
            None
        };

        let tile = map
            .get_mut(x, y)
            .ok_or(format!("out of bounds: ({},{})''", x, y))?;
        tile.terrain = terrain;
        tile.elevation = elevation;
        tile.resource = resource;
    }

    Ok(map)
}

/// Map export data — typed replacement for JSON string from export_map_json().
/// `terrain` is Terrain discriminant (u8), `elevation` is height value,
/// `resource` is Resource discriminant (i32), -1 = no resource.
/// Tiles are in row-major order (y * width + x).
#[wasm_bindgen]
pub struct MapExportData {
    width: u32,
    height: u32,
    terrain: Vec<u8>,
    elevation: Vec<f32>,
    resource: Vec<i32>,
}

#[wasm_bindgen]
impl MapExportData {
    pub fn width(&self) -> u32 { self.width }
    pub fn height(&self) -> u32 { self.height }
    pub fn terrain(&self) -> Vec<u8> { self.terrain.clone() }
    pub fn elevation(&self) -> Vec<f32> { self.elevation.clone() }
    pub fn resource(&self) -> Vec<i32> { self.resource.clone() }
}

/// Tile information returned by `get_tile_at` — replaces JSON string with typed struct.
/// `resource` is -1 when no resource is present on the tile.
#[wasm_bindgen]
#[derive(Copy, Clone)]
pub struct TileInfo {
    pub x: i32,
    pub y: i32,
    pub terrain: u8,
    pub elevation: f32,
    /// Resource discriminant, or -1 if none.
    pub resource: i32,
}

#[wasm_bindgen]
pub fn get_tile_at(x: f32, y: f32) -> Option<TileInfo> {
    unsafe {
        if let Some(ref app) = APP {
            let (wx, wy) = app.camera.screen_to_world(x, y);
            let tx = wx.floor() as isize;
            let ty = wy.floor() as isize;

            if tx >= 0 && ty >= 0 && (tx as usize) < app.map.width && (ty as usize) < app.map.height
            {
                let tile = app.map.get(tx as usize, ty as usize).unwrap();
                return Some(TileInfo {
                    x: tx as i32,
                    y: ty as i32,
                    terrain: tile.terrain as u8,
                    elevation: tile.elevation,
                    resource: tile.resource.map(|r| r as i32).unwrap_or(-1),
                });
            }
        }
    }
    None
}
/// Get resource counts as a dense Vec<u32> indexed by ResourceType discriminant.
/// Returns a Vec with max_discriminant+1 elements; invalid/gap indices are 0.
/// JS callers can index directly: counts[disc] — no JSON.parse() needed.
/// Use RESOURCE_NAMES_BY_ID (data.js) for JS-side name lookup.
#[wasm_bindgen]
pub fn get_resource_counts_by_id() -> Vec<u32> {
    unsafe {
        if let Some(ref app) = APP {
            let storage = &app.game_loop.state.economy.storage;
            use crate::economy::ResourceType;
            // Find max discriminant to size the array
            let max_disc = ResourceType::VALID_RESOURCE_DISCRIMINANTS
                .iter()
                .copied()
                .max()
                .unwrap_or(0);
            let mut counts = vec![0u32; max_disc as usize + 1];
            for &disc in &ResourceType::VALID_RESOURCE_DISCRIMINANTS {
                let rt = ResourceType::from_discriminant(disc).unwrap();
                counts[disc as usize] = storage.get(rt);
            }
            return counts;
        }
    }
    Vec::new()
}
/// Get tool counts as a Vec<u32> indexed by ToolType discriminant (0=Hammer through 10=Bow).
/// Returns 11-element array. JS callers iterate with index, no JSON.parse() needed.
/// Use TOOL_ICONS_BY_ID / TOOL_NAMES_BY_ID (in index.html) for JS-side name/icon lookup.
#[wasm_bindgen]
pub fn get_tool_counts() -> Vec<u32> {
    unsafe {
        if let Some(app) = (*(std::ptr::addr_of!(APP))).as_ref() {
            let economy = &app.game_loop.state.economy;
            let mut counts = vec![0u32; 11];
            for code in 0..=10u8 {
                counts[code as usize] = economy.get_tool_count(code);
            }
            return counts;
        }
    }
    Vec::new()
}
/// Set the player's nation by discriminant integer for the current game.
/// Returns true if the discriminant was recognized and applied.
#[wasm_bindgen]
pub fn set_player_nation_by_id(discriminant: u8) -> bool {
    use crate::nation::{NationType, Nation};
    if let Some(nation_type) = NationType::from_discriminant(discriminant) {
        let nation = Nation::new(nation_type);
        unsafe {
            if let Some(ref mut app) = APP {
                app.game_loop.state.player_nation = Some(nation_type);
                // Apply nation modifiers to economy
                app.game_loop.state.economy.set_nation_modifiers(nation.modifiers);
                // Set player nation on economy for nation-gated building placement
                app.game_loop.state.economy.set_player_nation(nation_type);
                return true;
            }
        }
    }
    false
}
/// Nation information returned by `get_player_nation` — replaces JSON string with typed struct.
/// `name_id` is the NationType discriminant (0=Roman..4=DarkTribe).
/// Fields are accessed via JS getters (no JSON.parse needed).
#[wasm_bindgen]
pub struct NationInfo {
    name_id: u8,
    color: String,
    emoji: String,
    description: String,
}

#[wasm_bindgen]
impl NationInfo {
    /// The NationType discriminant (0=Roman..4=DarkTribe).
    #[wasm_bindgen(getter)]
    pub fn name_id(&self) -> u8 { self.name_id }

    /// Color as a hex string (e.g., "#C83232").
    #[wasm_bindgen(getter)]
    pub fn color(&self) -> String { self.color.clone() }

    /// Emoji icon for HUD display.
    #[wasm_bindgen(getter)]
    pub fn emoji(&self) -> String { self.emoji.clone() }

    /// Human-readable description of the nation's playstyle.
    #[wasm_bindgen(getter)]
    pub fn description(&self) -> String { self.description.clone() }
}

/// Get the player's nation as a typed NationInfo struct.
/// Returns `None` if no nation is set.
#[wasm_bindgen]
pub fn get_player_nation() -> Option<NationInfo> {
    unsafe {
        if let Some(ref app) = APP {
            if let Some(nation) = app.game_loop.state.player_nation {
                return Some(NationInfo {
                    name_id: nation.discriminant(),
                    color: nation.color_hex().to_string(),
                    emoji: nation.emoji().to_string(),
                    description: nation.description().to_string(),
                });
            }
        }
    }
    None
}
/// Get unique building names for a nation by discriminant as JSON array.
#[cfg(test)]
pub fn get_nation_buildings_by_id(discriminant: u8) -> String {
    use crate::nation::{self, NationType};
    let nation = match NationType::from_discriminant(discriminant) {
        Some(n) => n,
        None => return String::from("[]"),
    };
    let names = nation::get_nation_buildings_by_disc(nation);
    let quoted: Vec<String> = names.iter().map(|n| format!("\"{}\"", n)).collect();
    format!("[{}]", quoted.join(","))
}
#[wasm_bindgen]
pub fn get_draw_calls() -> u32 {
    unsafe {
        if let Some(ref app) = APP {
            return app.draw_call_count;
        }
    }
    0
}

/// Get the number of currently active particles in the particle system.
#[wasm_bindgen]
pub fn get_particle_count() -> u32 {
    unsafe {
        if let Some(ref app) = APP {
            return app.particle_system.alive_count() as u32;
        }
    }
    0
}

/// Toggle FPS counter visibility. Returns new visibility state (true = visible).
#[wasm_bindgen]
pub fn toggle_fps_visible() -> bool {
    unsafe {
        if let Some(ref mut app) = APP {
            app.fps_visible = !app.fps_visible;
            return app.fps_visible;
        }
    }
    true
}

/// Reset FPS benchmarking stats (min/max/avg). Called when starting a new benchmark session.
#[wasm_bindgen]
pub fn reset_fps_stats() {
    unsafe {
        if let Some(ref mut app) = APP {
            app.fps_min = u32::MAX;
            app.fps_max = 0;
            app.fps_accum = 0.0;
            app.fps_sample_count = 0;
        }
    }
}

/// Building information struct — replaces JSON string from get_building_summary.
/// `index` is the position in the buildings array (used for garrison/destruction).
/// `kind` is the BuildingType discriminant (use BUILDING_NAMES_BY_ID in JS).
/// `settlers` is the count of assigned workers. `garrison` is count of garrisoned soldiers.
#[wasm_bindgen]
#[derive(Copy, Clone)]
pub struct BuildingInfo {
    pub index: u32,
    pub kind: u8,
    pub x: u32,
    pub y: u32,
    pub complete: bool,
    pub settlers: u32,
    pub owner_id: u8,
    pub garrison: u32,
    pub max_garrison: u32,
}

/// Returns building data as a typed Vec<BuildingInfo> — no JSON parse needed in JS.
/// Use BUILDING_NAMES_BY_ID[info.kind] for the building name.
#[wasm_bindgen]
pub fn get_building_summary() -> Vec<BuildingInfo> {
    unsafe {
        if let Some(ref app) = APP {
            return app
                .game_loop
                .state
                .economy
                .buildings
                .iter()
                .enumerate()
                .map(|(i, b)| BuildingInfo {
                    index: i as u32,
                    kind: b.kind.discriminant(),
                    x: b.x as u32,
                    y: b.y as u32,
                    complete: b.is_complete(),
                    settlers: b.assigned_settlers.len() as u32,
                    owner_id: b.owner_id,
                    garrison: b.garrison.len() as u32,
                    max_garrison: b.max_garrison,
                })
                .collect();
        }
    }
    Vec::new()
}
/// Unit information struct — replaces JSON string from get_unit_summary.
/// `kind` is the UnitKind discriminant (use UNIT_NAMES_BY_ID in JS).
/// `state` discriminant: 0=Idle, 1=Moving, 2=Working, 3=Fighting, 4=Patrolling, 5=FormationMove, 6=Dying, 7=Dead.
/// `stance` discriminant: 0=Aggressive, 1=StandGround, 2=Passive.
/// `carried_tool` is the tool code discriminant, or 255 if none.
#[wasm_bindgen]
#[derive(Copy, Clone)]
pub struct UnitInfo {
    pub id: u32,
    pub kind: u8,
    pub x: f32,
    pub y: f32,
    pub hp: u32,
    pub max_hp: u32,
    pub state: u8,
    pub stance: u8,
    pub carried_tool: u8,
}

/// Detailed unit info for a single unit by ID.
/// sentinel 0 for None: assigned_building offset +1 (actual index+1), target raw ID (IDs start at 1).
/// dying_progress is 0.0 when not dying.
#[wasm_bindgen]
#[derive(Copy, Clone)]
pub struct UnitDetailInfo {
    pub id: u32,
    pub kind: u8,
    pub x: f32,
    pub y: f32,
    pub hp: u32,
    pub max_hp: u32,
    pub state: u8,
    pub stance: u8,
    pub dying_progress: f32,
    pub assigned_building: u32, // building_index + 1; 0 = None
    pub target: u32,            // unit ID; 0 = None (unit IDs start at 1)
    pub carried_tool: u8,
}

/// Returns unit data as a typed Vec<UnitInfo> — no JSON parse needed in JS.
/// Use UNIT_NAMES_BY_ID[info.kind] for the unit name.
#[wasm_bindgen]
pub fn get_unit_summary() -> Vec<UnitInfo> {
    unsafe {
        if let Some(ref app) = APP {
            return app
                .game_loop
                .state
                .economy
                .units
                .alive_units()
                .map(|u| UnitInfo {
                    id: u.id,
                    kind: u.kind.discriminant(),
                    x: u.x,
                    y: u.y,
                    hp: u.hp,
                    max_hp: u.max_hp,
                    state: u.state as u8,
                    stance: u.stance as u8,
                    carried_tool: u.carried_tool.unwrap_or(255),
                })
                .collect();
        }
    }
    Vec::new()
}
/// Get military units within a world-coordinate rectangle.
/// Returns typed Vec<UnitInfo> for Swordsman and Bowman within [min_x, max_x] x [min_y, max_y].
/// Used for Shift+drag marquee selection in the UI.
/// Fields are integer discriminants — use JS-side lookup tables for names.
#[wasm_bindgen]
pub fn get_units_in_rect(min_x: f32, min_y: f32, max_x: f32, max_y: f32) -> Vec<UnitInfo> {
    unsafe {
        if let Some(ref app) = APP {
            return app
                .game_loop
                .state
                .economy
                .units
                .alive_units()
                .filter(|u| u.kind.can_fight())
                .filter(|u| u.x >= min_x && u.x <= max_x && u.y >= min_y && u.y <= max_y)
                .map(|u| UnitInfo {
                    id: u.id,
                    kind: u.kind.discriminant(),
                    x: u.x,
                    y: u.y,
                    hp: u.hp,
                    max_hp: u.max_hp,
                    state: u.state as u8,
                    stance: u.stance as u8,
                    carried_tool: u.carried_tool.unwrap_or(255),
                })
                .collect();
        }
    }
    Vec::new()
}
/// Order selected units to patrol between their current position and a target tile.
/// unit_ids: array of unit IDs (JS number[] auto-converts to Vec<u32>).
/// Returns: number of units successfully ordered to patrol.
#[wasm_bindgen]
pub fn order_patrol(unit_ids: Vec<u32>, target_x: usize, target_y: usize) -> u32 {
    unsafe {
        if let Some(ref mut app) = APP {
            app.game_loop.state.economy.units.order_patrol(
                &unit_ids,
                target_x,
                target_y,
                &app.game_loop.state.map,
            )
        } else {
            0
        }
    }
}
/// Order a set of units to move in formation to a target tile.
/// Each unit maintains its relative offset from the group center.
/// unit_ids: array of unit IDs (JS number[] auto-converts to Vec<u32>).
/// Returns the number of units successfully ordered to move.
#[wasm_bindgen]
pub fn formation_move(unit_ids: Vec<u32>, target_x: usize, target_y: usize) -> u32 {
    unsafe {
        if let Some(ref mut app) = APP {
            app.game_loop.state.economy.units.formation_move(
                &unit_ids,
                target_x,
                target_y,
                &app.game_loop.state.map,
            )
        } else {
            0
        }
    }
}
/// Get detailed building info by index.
/// Returns JSON: {"kind":"Farm","x":3,"y":3,"construction":1.0,"complete":true,
///   "active":true,"settlers":[1],"max_settlers":1,
///   "build_ticks":20,"production_interval":20,"inputs":[["Wood",2]],
///   "outputs":[["Planks",1]],"output_buffer":{"Planks":5}}
/// or {"error":"Building not found"}
#[wasm_bindgen]
/// Detailed building info for a single building by index.
/// `kind` is the BuildingType discriminant (use BUILDING_NAMES_BY_ID in JS).
/// `workers` is a Vec<u32> of settler IDs.
/// `inputs`/`outputs` are flattened [discriminant, amount] pairs (use in steps of 2).
/// `output_buffer` is indexed by ResourceType discriminant (dense Vec<u32>).
/// `producing_tool` is the tool code discriminant (0=Hammer..10=Bow), 255 for none/not-toolsmith.
#[wasm_bindgen]
pub struct BuildingDetailInfo {
    pub(crate) kind: u8,
    pub(crate) x: u32,
    pub(crate) y: u32,
    pub(crate) construction: f32,
    pub(crate) complete: bool,
    pub(crate) active: bool,
    pub(crate) workers: Vec<u32>,
    pub(crate) max_workers: u32,
    pub(crate) build_ticks: u32,
    pub(crate) production_interval: u32,
    pub(crate) inputs: Vec<u32>,
    pub(crate) outputs: Vec<u32>,
    pub(crate) output_buffer: Vec<u32>,
    pub(crate) destruction_progress: f32,
    pub(crate) garrison: u32,
    pub(crate) max_garrison: u32,
    pub(crate) producing_tool: u8,
}

#[wasm_bindgen]
impl BuildingDetailInfo {
    #[wasm_bindgen(getter)]
    pub fn kind(&self) -> u8 { self.kind }
    #[wasm_bindgen(getter)]
    pub fn x(&self) -> u32 { self.x }
    #[wasm_bindgen(getter)]
    pub fn y(&self) -> u32 { self.y }
    #[wasm_bindgen(getter)]
    pub fn construction(&self) -> f32 { self.construction }
    #[wasm_bindgen(getter)]
    pub fn complete(&self) -> bool { self.complete }
    #[wasm_bindgen(getter)]
    pub fn active(&self) -> bool { self.active }
    #[wasm_bindgen(getter)]
    pub fn workers(&self) -> Vec<u32> { self.workers.clone() }
    #[wasm_bindgen(getter)]
    pub fn max_workers(&self) -> u32 { self.max_workers }
    #[wasm_bindgen(getter)]
    pub fn build_ticks(&self) -> u32 { self.build_ticks }
    #[wasm_bindgen(getter)]
    pub fn production_interval(&self) -> u32 { self.production_interval }
    #[wasm_bindgen(getter)]
    pub fn inputs(&self) -> Vec<u32> { self.inputs.clone() }
    #[wasm_bindgen(getter)]
    pub fn outputs(&self) -> Vec<u32> { self.outputs.clone() }
    #[wasm_bindgen(getter)]
    pub fn output_buffer(&self) -> Vec<u32> { self.output_buffer.clone() }
    #[wasm_bindgen(getter)]
    pub fn destruction_progress(&self) -> f32 { self.destruction_progress }
    #[wasm_bindgen(getter)]
    pub fn garrison(&self) -> u32 { self.garrison }
    #[wasm_bindgen(getter)]
    pub fn max_garrison(&self) -> u32 { self.max_garrison }
    #[wasm_bindgen(getter)]
    pub fn producing_tool(&self) -> u8 { self.producing_tool }
}

/// Get detailed building info by index.
/// Returns Some(BuildingDetailInfo) or None if index is out of bounds.
/// Eliminates JSON.parse() at showBuildingInfo() call sites.
#[wasm_bindgen]
pub fn get_building_info(idx: usize) -> Option<BuildingDetailInfo> {
    unsafe {
        if let Some(ref app) = APP {
            let economy = &app.game_loop.state.economy;
            if let Some(b) = economy.buildings.get(idx) {
                let kind = b.kind;

                let workers: Vec<u32> = b.assigned_settlers.to_vec();

                let inputs: Vec<u32> = kind
                    .inputs()
                    .iter()
                    .flat_map(|(rt, amt)| [rt.discriminant() as u32, *amt])
                    .collect();

                let outputs: Vec<u32> = kind
                    .outputs()
                    .iter()
                    .flat_map(|(rt, amt)| [rt.discriminant() as u32, *amt])
                    .collect();

                let output_buffer = b.output_buffer.to_vec();

                use crate::economy::BuildingType;
                let producing_tool: u8 =
                    if kind == BuildingType::Toolsmith && b.is_complete() {
                        economy.most_needed_tool().unwrap_or(255)
                    } else {
                        255
                    };

                return Some(BuildingDetailInfo {
                    kind: kind.discriminant(),
                    x: b.x as u32,
                    y: b.y as u32,
                    construction: b.construction,
                    complete: b.is_complete(),
                    active: b.active,
                    workers,
                    max_workers: b.max_settlers,
                    build_ticks: kind.build_time(),
                    production_interval: kind.production_interval(),
                    inputs,
                    outputs,
                    output_buffer,
                    destruction_progress: b.destruction_progress().unwrap_or(-1.0),
                    garrison: b.garrison.len() as u32,
                    max_garrison: b.max_garrison,
                    producing_tool,
                });
            }
        }
    }
    None
}
/// Get detailed unit info by ID.
/// Returns Option<UnitDetailInfo> — wasm-bindgen converts to JS object or undefined.
/// Uses integer discriminants for state/stance/kind/carried_tool (see JS lookup arrays).
/// assigned_building is building_index + 1 (0 = None). target is raw unit ID (0 = None, IDs start at 1).
#[wasm_bindgen]
pub fn get_unit_info(id: u32) -> Option<UnitDetailInfo> {
    unsafe {
        if let Some(ref app) = APP {
            let units = &app.game_loop.state.economy.units;
            if let Some(u) = units.get(id) {
                if u.state == crate::units::UnitState::Dead {
                    return None;
                }
                let ab = u.assigned_building
                    .map(|bi| (bi + 1) as u32)
                    .unwrap_or(0);
                let tgt = u.target.unwrap_or(0);
                let dying = u.death_animation_progress().unwrap_or(0.0);
                return Some(UnitDetailInfo {
                    id: u.id,
                    kind: u.kind.discriminant(),
                    x: u.x,
                    y: u.y,
                    hp: u.hp,
                    max_hp: u.max_hp,
                    state: u.state as u8,
                    stance: u.stance as u8,
                    dying_progress: dying,
                    assigned_building: ab,
                    target: tgt,
                    carried_tool: u.carried_tool.unwrap_or(255),
                });
            }
        }
    }
    None
}
/// Set stance for selected units.
/// unit_ids: array of unit IDs (JS number[] auto-converts to Vec<u32>).
/// Returns the number of units whose stance was successfully set.
#[wasm_bindgen]
pub fn set_units_stance(unit_ids: Vec<u32>, stance: u8) -> u32 {
    use crate::units::UnitStance;
    unsafe {
        if let Some(ref mut app) = APP {
            let st = UnitStance::from_u8(stance);
            let mut count = 0u32;
            for &id in &unit_ids {
                if let Some(unit) = app.game_loop.state.economy.units.get_mut(id) {
                    if unit.is_alive() && unit.kind.can_fight() {
                        unit.stance = st;
                        count += 1;
                    }
                }
            }
            return count;
        }
    }
    0
}
/// Get the current stance of a unit.
/// Returns: 0=Aggressive, 1=StandGround, 2=Passive. Returns 0 if unit not found.
#[wasm_bindgen]
pub fn get_unit_stance(unit_id: u32) -> u8 {
    unsafe {
        if let Some(ref app) = APP {
            if let Some(unit) = app.game_loop.state.economy.units.get(unit_id) {
                return unit.stance as u8;
            }
        }
    }
    0
}

/// Try to place a building by BuildingType integer discriminant.
/// Returns typed PlaceBuildingResult struct (ok, idx, kind) on success or error message on failure.
#[wasm_bindgen]
pub fn try_place_building_by_id(discriminant: u8, x: usize, y: usize) -> PlaceBuildingResult {
    use crate::economy::BuildingType;
    // Validate discriminant before accessing APP (so tests can check rejection)
    let kind = match BuildingType::from_discriminant(discriminant) {
        Some(k) => k,
        None => return PlaceBuildingResult { ok: false, idx: 0, kind: 0, error: format!("Invalid building discriminant: {}", discriminant) },
    };
    unsafe {
        if let Some(ref mut app) = APP {
            // Validate tile is within map bounds
            if x >= app.map.width || y >= app.map.height {
                return PlaceBuildingResult { ok: false, idx: 0, kind: 0, error: format!("Tile ({},{}) out of bounds", x, y) };
            }

            // Validate terrain is buildable (not water, deep water, or mountain)
            let tile = app.map.get(x, y).unwrap();
            let buildable = !matches!(tile.terrain, Terrain::Water | Terrain::DeepWater | Terrain::Mountain);
            if !buildable {
                let terrain_name = match tile.terrain {
                    Terrain::Water => "water",
                    Terrain::DeepWater => "deep water",
                    Terrain::Mountain => "mountain",
                    _ => "unbuildable",
                };
                return PlaceBuildingResult { ok: false, idx: 0, kind: 0, error: format!("Cannot build on {} terrain at ({},{})", terrain_name, x, y) };
            }

            // Validate tile isn't already occupied by another building
            let occupied = app
                .game_loop
                .state
                .economy
                .buildings
                .iter()
                .any(|b| b.x == x && b.y == y);
            if occupied {
                return PlaceBuildingResult { ok: false, idx: 0, kind: 0, error: format!("Tile ({},{}) already has a building", x, y) };
            }

            // Try to place the building
            match app.game_loop.state.economy.try_place_building(kind, x, y) {
                Some(idx) => {
                    app.overlay_dirty = true;
                    return PlaceBuildingResult { ok: true, idx: idx as u32, kind: kind.discriminant(), error: String::new() };
                }
                None => {
                    return PlaceBuildingResult { ok: false, idx: 0, kind: 0, error: format!("Cannot afford building {} — insufficient resources", kind.discriminant()) };
                }
            }
        }
    }
    PlaceBuildingResult { ok: false, idx: 0, kind: 0, error: "Engine not initialized".to_string() }
}


/// Get build cost by BuildingType integer discriminant as typed Vec<BuildCostItem>.
/// Returns empty vec for invalid discriminants or buildings with no cost.
/// JS callers iterate: cost[i].resource_discriminant, cost[i].amount — no JSON.parse needed.
#[wasm_bindgen]
pub fn get_build_cost_by_id(discriminant: u8) -> Vec<BuildCostItem> {
    use crate::economy::BuildingType;
    let kind = match BuildingType::from_discriminant(discriminant) {
        Some(k) => k,
        None => return Vec::new(),
    };
    kind.build_cost()
        .iter()
        .map(|&(rt, amt)| BuildCostItem {
            resource_discriminant: rt.discriminant(),
            amount: amt,
        })
        .collect()
}


// ── WebSocket Client API ─────────────────────────────────────────────────────
/// Receive pending network messages as JSON strings.
/// Set the game speed multiplier (1.0 = normal, 2.0 = double, 4.0 = quadruple).
#[wasm_bindgen]
pub fn set_game_speed(multiplier: f64) {
    unsafe {
        if let Some(ref mut app) = APP {
            app.speed_multiplier = multiplier.clamp(0.25, 8.0);
        }
    }
}

/// Override the day/night cycle phase. Pass 0.0 (midnight) to 1.0 (next midnight).
/// Pass a negative value to clear the override and resume the game-time cycle.
#[wasm_bindgen]
pub fn set_day_phase(phase: f64) {
    unsafe {
        if let Some(ref mut app) = APP {
            app.day_phase_override = if phase < 0.0 { None } else { Some(phase.clamp(0.0, 1.0)) };
        }
    }
}

/// Reveal all tiles on the map (bypass fog of war). Debug helper.
#[wasm_bindgen]
pub fn reveal_map() {
    unsafe {
        if let Some(ref mut app) = APP {
            app.game_loop.state.map.set_all_visible();
            app.mesh_dirty = true;
        }
    }
}


/// Camera state struct — replaces JSON string from get_camera_state.
/// `center_x`/`center_y` are the camera center in world tile coords.
/// `zoom` is the camera zoom factor.
/// `vp_w`/`vp_h` are the viewport dimensions in pixels.
#[wasm_bindgen]
#[derive(Copy, Clone)]
pub struct CameraState {
    pub center_x: f32,
    pub center_y: f32,
    pub zoom: f32,
    pub vp_w: u32,
    pub vp_h: u32,
}

/// Get camera state as a typed struct (replaces JSON string, eliminating JSON.parse()).
/// Returns None if engine not initialized.
#[wasm_bindgen]
pub fn get_camera_state() -> Option<CameraState> {
    unsafe {
        (*std::ptr::addr_of!(APP)).as_ref().map(|app| CameraState {
            center_x: app.camera.center_x,
            center_y: app.camera.center_y,
            zoom: app.camera.zoom,
            vp_w: app.camera.viewport_width,
            vp_h: app.camera.viewport_height,
        })
    }
}

/// Set camera center to world coordinates (immediate).
/// Used by minimap click-to-center feature.
#[wasm_bindgen]
pub fn set_camera_center(x: f32, y: f32) {
    unsafe {
        if let Some(app) = (*std::ptr::addr_of_mut!(APP)).as_mut() {
            app.camera.set_center(x, y);
            app.mesh_dirty = true;
        }
    }
}

/// Rotate camera azimuth by a delta angle in degrees.
/// Positive = clockwise rotation around the focus point.
/// Used by minimap rotation arrow buttons.
#[wasm_bindgen]
pub fn rotate_camera_azimuth(delta_deg: f32) {
    unsafe {
        if let Some(app) = (*std::ptr::addr_of_mut!(APP)).as_mut() {
            let new_azimuth = app.camera.azimuth + delta_deg;
            app.camera.set_azimuth(new_azimuth);
            app.mesh_dirty = true;
        }
    }
}

/// Toggle show full map (bypass fog of war).
/// Used by debug panel checkbox.
#[wasm_bindgen]
pub fn set_show_full_map(on: bool) {
    unsafe {
        if let Some(app) = (*std::ptr::addr_of_mut!(APP)).as_mut() {
            app.show_full_map = on;
            app.mesh_dirty = true;
        }
    }
}

/// Starter result struct — replaces JSON string from setup_starter_base.
/// `ok` is true when the base was placed successfully.
/// `error` contains the error message when `ok` is false (empty on success).
/// Fields are accessed via JS getters (no JSON.parse needed).
#[wasm_bindgen]
#[derive(Clone)]
pub struct StarterResult {
    ok: bool,
    hq_x: u32,
    hq_y: u32,
    settlers: u32,
    error: String,
}

#[wasm_bindgen]
impl StarterResult {
    /// True if the starter base was placed successfully.
    #[wasm_bindgen(getter)]
    pub fn ok(&self) -> bool { self.ok }

    /// X coordinate of the placed HQ (Castle).
    #[wasm_bindgen(getter)]
    pub fn hq_x(&self) -> u32 { self.hq_x }

    /// Y coordinate of the placed HQ (Castle).
    #[wasm_bindgen(getter)]
    pub fn hq_y(&self) -> u32 { self.hq_y }

    /// Number of settlers spawned.
    #[wasm_bindgen(getter)]
    pub fn settlers(&self) -> u32 { self.settlers }

    /// Error message (empty on success).
    #[wasm_bindgen(getter)]
    pub fn error(&self) -> String { self.error.clone() }
}

/// Result of add_starting_resources — replaces JSON String return.
/// `ok` is true when resources were applied successfully.
/// `error` contains the error message when `ok` is false (empty on success).
#[wasm_bindgen]
#[derive(Clone)]
pub struct StartingResourcesResult {
    ok: bool,
    error: String,
}

#[wasm_bindgen]
impl StartingResourcesResult {
    /// True if starting resources were applied successfully.
    #[wasm_bindgen(getter)]
    pub fn ok(&self) -> bool { self.ok }

    /// Error message (empty on success).
    #[wasm_bindgen(getter)]
    pub fn error(&self) -> String { self.error.clone() }
}

/// Result of load_model_json — replaces JSON String return (S313).
///  is true when the model was loaded successfully.
///  is the model name,  the triangle count.
///  contains the error message when  is false (empty on success).
#[wasm_bindgen]
#[derive(Clone)]
pub struct LoadModelResult {
    ok: bool,
    model_id: u8,
    tri_count: u32,
    error: String,
}

#[wasm_bindgen]
impl LoadModelResult {
    /// True if the model was loaded successfully.
    #[wasm_bindgen(getter)]
    pub fn ok(&self) -> bool { self.ok }

    /// Integer model type ID (0-61).
    #[wasm_bindgen(getter)]
    pub fn model_id(&self) -> u8 { self.model_id }

    /// Triangle count of the loaded mesh.
    #[wasm_bindgen(getter)]
    pub fn tri_count(&self) -> u32 { self.tri_count }

    /// Error message (empty on success).
    #[wasm_bindgen(getter)]
    pub fn error(&self) -> String { self.error.clone() }
}

/// Toggle the game pause state. Returns the new state.
#[wasm_bindgen]
pub fn toggle_pause() -> bool {
    unsafe {
        if let Some(ref mut app) = APP {
            app.paused = !app.paused;
            app.paused
        } else {
            false
        }
    }
}
/// Get the current pause state.
#[wasm_bindgen]
pub fn is_paused() -> bool {
    unsafe {
        if let Some(ref app) = APP {
            app.paused
        } else {
            false
        }
    }
}
/// Generate a procedural map and return it as typed MapExportData.
/// map_type: "demo" (currently only one type supported; future: "island", "continents", etc.)
/// width/height: map dimensions (clamped to 16..1024)
/// Returns MapExportData with typed arrays — eliminates JSON String construction in generate path.
/// JS callers reconstruct JSON for load_map_json() from typed arrays.
#[wasm_bindgen]
pub fn generate_map(map_type: &str, width: u32, height: u32) -> MapExportData {
    let w = width.clamp(16, 1024) as usize;
    let h = height.clamp(16, 1024) as usize;
    let map = match map_type {
        "demo" | "island" | "continents" | "rivervalley" | "highlands" => {
            // All types use the same procedural gen for now; distinct biomes TBD
            Map::generate_demo(w, h)
        }
        "tutorial" => Map::generate_tutorial(w, h),
        _ => Map::generate_demo(w, h),
    };
    let size = map.width * map.height;
    let mut terrain = Vec::with_capacity(size);
    let mut elevation = Vec::with_capacity(size);
    let mut resource = Vec::with_capacity(size);
    for y in 0..map.height {
        for x in 0..map.width {
            if let Some(tile) = map.get(x, y) {
                terrain.push(tile.terrain as u8);
                elevation.push(tile.elevation);
                resource.push(match tile.resource {
                    Some(r) => r as i32,
                    None => -1,
                });
            }
        }
    }
    MapExportData {
        width: map.width as u32,
        height: map.height as u32,
        terrain,
        elevation,
        resource,
    }
}
/// Apply starting resources based on difficulty level.
/// Should be called AFTER load_map_json() to seed the new game state.
/// difficulty: "easy" (2× resources), "medium" (1×), "hard" (0.5×)
/// Returns "ok" on success or an error message.
#[wasm_bindgen]
pub fn add_starting_resources(difficulty: &str) -> Option<StartingResourcesResult> {
    use crate::economy::ResourceType;
    unsafe {
        if let Some(ref mut app) = APP {
            let multiplier = match difficulty {
                "easy" => 2.0,
                "hard" => 0.5,
                _ => 1.0, // medium or unknown
            };
            let resources: Vec<(ResourceType, u32)> = vec![
                (ResourceType::Wood, (100.0 * multiplier) as u32),
                (ResourceType::Stone, (50.0 * multiplier) as u32),
                (ResourceType::IronOre, (20.0 * multiplier) as u32),
                (ResourceType::Coal, (20.0 * multiplier) as u32),
                (ResourceType::Gold, (10.0 * multiplier) as u32),
                (ResourceType::Grain, (30.0 * multiplier) as u32),
                (ResourceType::Fish, (20.0 * multiplier) as u32),
                (ResourceType::Meat, (10.0 * multiplier) as u32),
            ];
            let mut economy = crate::economy::Economy::with_starting_resources(&resources);
            economy.set_map(app.map.clone());
            app.game_loop.state.economy = economy;
            Some(StartingResourcesResult { ok: true, error: String::new() })
        } else {
            Some(StartingResourcesResult { ok: false, error: String::from("error: engine not initialized") })
        }
    }
}
/// Place a free Castle near map center and spawn starter settlers.
/// Called after load_map_json() + add_starting_resources() to set up the initial base.
/// settler_count: number of idle settlers to spawn (clamped to 1..8).
/// Returns typed StarterResult struct (replaces JSON string, eliminating JSON.parse()).
#[wasm_bindgen]
pub fn setup_starter_base(settler_count: u32) -> Option<StarterResult> {
    use crate::economy::BuildingType;
    use crate::units::UnitKind;
    unsafe {
        if let Some(ref mut app) = APP {
            let w = app.map.width;
            let h = app.map.height;

            let cx = w / 2;
            let cy = h / 2;

            // Spiral outward from center to find buildable tile for HQ
            let mut hq_x = cx;
            let mut hq_y = cy;
            let search_limit = w.max(h) as isize;
            'outer: for radius in 0..search_limit {
                for dx in -radius..=radius {
                    for dy in -radius..=radius {
                        if dx.abs() != radius && dy.abs() != radius {
                            continue;
                        }
                        let tx = cx as isize + dx;
                        let ty = cy as isize + dy;
                        if tx < 0 || ty < 0 || tx >= w as isize || ty >= h as isize {
                            continue;
                        }
                        let tile = app.map.get(tx as usize, ty as usize).unwrap();
                        let buildable = !matches!(
                            tile.terrain,
                            Terrain::Water | Terrain::DeepWater | Terrain::Mountain
                        );
                        if buildable {
                            hq_x = tx as usize;
                            hq_y = ty as usize;
                            break 'outer;
                        }
                    }
                }
            }

            // Place Castle for free (direct place_building, no cost)
            let _idx = app
                .game_loop
                .state
                .economy
                .place_building(BuildingType::Castle, hq_x, hq_y);

            // Spawn idle settlers around HQ in a small offset pattern
            let count = settler_count.clamp(1, 8) as usize;
            for i in 0..count {
                let wx = hq_x as f32 + 0.5 + ((i % 3) as f32 - 1.0) * 0.8;
                let wy = hq_y as f32 + 0.5 + ((i as f32 / 3.0).floor() - 0.5) * 0.8;
                app.game_loop
                    .state
                    .economy
                    .units
                    .spawn(UnitKind::Settler, wx, wy);
            }

            // Recompute visibility from the new starter base entities
            let buildings: Vec<(crate::economy::BuildingType, usize, usize)> = app
                .game_loop
                .state
                .economy
                .buildings
                .iter()
                .map(|b| (b.kind, b.x, b.y))
                .collect();
            let units: Vec<(crate::units::UnitKind, f32, f32)> = app
                .game_loop
                .state
                .economy
                .units
                .alive_units()
                .map(|u| (u.kind, u.x, u.y))
                .collect();
            app.map.compute_visibility_from_entities(&buildings, &units);

            app.overlay_dirty = true;
            app.mesh_dirty = true;

            Some(StarterResult {
                ok: true,
                hq_x: hq_x as u32,
                hq_y: hq_y as u32,
                settlers: count as u32,
                error: String::new(),
            })
        } else {
            Some(StarterResult {
                ok: false,
                hq_x: 0,
                hq_y: 0,
                settlers: 0,
                error: String::from("Engine not initialized"),
            })
        }
    }
}
/// Complete game state returned by get_game_state — replaces JSON string with typed struct.
/// JS side reconstructs JSON from typed fields for localStorage save/load compatibility.
/// Map data is stored as typed arrays (terrain/elevation/resource) instead of JSON string
/// to eliminate map.to_json() format!() calls from the production WASM export path.
#[wasm_bindgen]
pub struct GameStateData {
    game_time: f64,
    map_width: u32,
    map_height: u32,
    map_terrain: Vec<u8>,
    map_elevation: Vec<f32>,
    map_resource: Vec<i32>,
    resources: Vec<u32>,
    buildings: Vec<BuildingSaveData>,
    units: Vec<UnitSaveData>,
}

#[wasm_bindgen]
impl GameStateData {
    #[wasm_bindgen(getter)]
    pub fn game_time(&self) -> f64 { self.game_time }
    #[wasm_bindgen(getter)]
    pub fn map_width(&self) -> u32 { self.map_width }
    #[wasm_bindgen(getter)]
    pub fn map_height(&self) -> u32 { self.map_height }
    #[wasm_bindgen(getter)]
    pub fn map_terrain(&self) -> Vec<u8> { self.map_terrain.clone() }
    #[wasm_bindgen(getter)]
    pub fn map_elevation(&self) -> Vec<f32> { self.map_elevation.clone() }
    #[wasm_bindgen(getter)]
    pub fn map_resource(&self) -> Vec<i32> { self.map_resource.clone() }
    #[wasm_bindgen(getter)]
    pub fn resources(&self) -> Vec<u32> { self.resources.clone() }
    #[wasm_bindgen(getter)]
    pub fn buildings(&self) -> Vec<BuildingSaveData> { self.buildings.clone() }
    #[wasm_bindgen(getter)]
    pub fn units(&self) -> Vec<UnitSaveData> { self.units.clone() }
}

/// Building data in save game state.
#[wasm_bindgen]
#[derive(Clone)]
pub struct BuildingSaveData {
    kind: u8,
    x: u32,
    y: u32,
    construction: f32,
    active: bool,
    production_counter: f32,
    assigned_settlers: Vec<u32>,
    max_settlers: u32,
    input_buffer: Vec<u32>,
    output_buffer: Vec<u32>,
}

#[wasm_bindgen]
impl BuildingSaveData {
    #[wasm_bindgen(getter)]
    pub fn kind(&self) -> u8 { self.kind }
    #[wasm_bindgen(getter)]
    pub fn x(&self) -> u32 { self.x }
    #[wasm_bindgen(getter)]
    pub fn y(&self) -> u32 { self.y }
    #[wasm_bindgen(getter)]
    pub fn construction(&self) -> f32 { self.construction }
    #[wasm_bindgen(getter)]
    pub fn active(&self) -> bool { self.active }
    #[wasm_bindgen(getter)]
    pub fn production_counter(&self) -> f32 { self.production_counter }
    #[wasm_bindgen(getter)]
    pub fn assigned_settlers(&self) -> Vec<u32> { self.assigned_settlers.clone() }
    #[wasm_bindgen(getter)]
    pub fn max_settlers(&self) -> u32 { self.max_settlers }
    #[wasm_bindgen(getter)]
    pub fn input_buffer(&self) -> Vec<u32> { self.input_buffer.clone() }
    #[wasm_bindgen(getter)]
    pub fn output_buffer(&self) -> Vec<u32> { self.output_buffer.clone() }
}

/// Unit data in save game state.
#[wasm_bindgen]
#[derive(Clone)]
pub struct UnitSaveData {
    id: u32,
    kind: u8,
    x: f32,
    y: f32,
    hp: u32,
    max_hp: u32,
    state: u8,
    stance: u8,
    assigned_building: u32,
    target: u32,
}

#[wasm_bindgen]
impl UnitSaveData {
    #[wasm_bindgen(getter)]
    pub fn id(&self) -> u32 { self.id }
    #[wasm_bindgen(getter)]
    pub fn kind(&self) -> u8 { self.kind }
    #[wasm_bindgen(getter)]
    pub fn x(&self) -> f32 { self.x }
    #[wasm_bindgen(getter)]
    pub fn y(&self) -> f32 { self.y }
    #[wasm_bindgen(getter)]
    pub fn hp(&self) -> u32 { self.hp }
    #[wasm_bindgen(getter)]
    pub fn max_hp(&self) -> u32 { self.max_hp }
    #[wasm_bindgen(getter)]
    pub fn state(&self) -> u8 { self.state }
    #[wasm_bindgen(getter)]
    pub fn stance(&self) -> u8 { self.stance }
    #[wasm_bindgen(getter)]
    pub fn assigned_building(&self) -> u32 { self.assigned_building }
    #[wasm_bindgen(getter)]
    pub fn target(&self) -> u32 { self.target }
}

/// Get the complete game state as a typed struct for save/load.
/// JS side reconstructs JSON from typed fields for localStorage compatibility.
/// Map data is exported as typed arrays (terrain/elevation/resource) in row-major order
/// instead of JSON string, eliminating map.to_json() format!() overhead.
#[wasm_bindgen]
pub fn get_game_state() -> GameStateData {
    use crate::economy::ResourceType;
    unsafe {
        if let Some(ref app) = APP {
            let eco = &app.game_loop.state.economy;
            let game_time = app.game_loop.state.game_time;

            // Map: typed tile arrays in row-major order (y * width + x)
            let map_w = app.map.width as u32;
            let map_h = app.map.height as u32;
            let tile_count = app.map.width * app.map.height;
            let mut map_terrain = Vec::with_capacity(tile_count);
            let mut map_elevation = Vec::with_capacity(tile_count);
            let mut map_resource = Vec::with_capacity(tile_count);
            for y in 0..app.map.height {
                for x in 0..app.map.width {
                    let tile = app.map.get(x, y).unwrap();
                    map_terrain.push(tile.terrain as u8);
                    map_elevation.push(tile.elevation);
                    map_resource.push(tile.resource.map(|r| r as i32).unwrap_or(-1));
                }
            }

            // Resources: dense Vec<u32> indexed by ResourceType discriminant
            let mut resources = vec![0u32; ResourceType::COUNT];
            for (i, item) in resources.iter_mut().enumerate().take(ResourceType::COUNT) {
                let rt: ResourceType = std::mem::transmute::<u8, ResourceType>(i as u8);
                *item = eco.storage.get(rt) as u32;
            }

            // Buildings
            let buildings: Vec<BuildingSaveData> = eco.buildings.iter().map(|b| {
                let assigned_settlers: Vec<u32> = b.assigned_settlers.to_vec();
                let input_buffer: Vec<u32> = (0..ResourceType::COUNT).map(|i| b.input_buffer[i]).collect();
                let output_buffer: Vec<u32> = (0..ResourceType::COUNT).map(|i| b.output_buffer[i]).collect();
                BuildingSaveData {
                    kind: b.kind.discriminant(),
                    x: b.x as u32,
                    y: b.y as u32,
                    construction: b.construction,
                    active: b.active,
                    production_counter: b.production_counter,
                    assigned_settlers,
                    max_settlers: b.max_settlers,
                    input_buffer,
                    output_buffer,
                }
            }).collect();

            // Units
            let units: Vec<UnitSaveData> = eco.units.alive_units().map(|u| {
                UnitSaveData {
                    id: u.id,
                    kind: u.kind.discriminant(),
                    x: u.x,
                    y: u.y,
                    hp: u.hp,
                    max_hp: u.max_hp,
                    state: u.state as u8,
                    stance: u.stance as u8,
                    assigned_building: u.assigned_building.map(|bi| bi as u32).unwrap_or(0),
                    target: u.target.unwrap_or(0),
                }
            }).collect();

            return GameStateData {
                game_time,
                map_width: map_w,
                map_height: map_h,
                map_terrain,
                map_elevation,
                map_resource,
                resources,
                buildings,
                units,
            };
        }
    }
    GameStateData {
        game_time: 0.0,
        map_width: 0,
        map_height: 0,
        map_terrain: Vec::new(),
        map_elevation: Vec::new(),
        map_resource: Vec::new(),
        resources: Vec::new(),
        buildings: Vec::new(),
        units: Vec::new(),
    }
}
/// Result struct for restore_game_state — replaces JSON string status.
/// `ok` is true on success, `error` contains the error message on failure.
#[wasm_bindgen]
pub struct RestoreStateResult {
    ok: bool,
    error: String,
}

#[wasm_bindgen]
impl RestoreStateResult {
    /// True if the game state was restored successfully.
    #[wasm_bindgen(getter)]
    pub fn ok(&self) -> bool { self.ok }

    /// Error message if restore failed, empty string on success.
    #[wasm_bindgen(getter)]
    pub fn error(&self) -> String { self.error.clone() }
}

/// Restore game state from a JSON save string (produced by get_game_state).
/// Returns a RestoreStateResult with ok=true on success or ok=false with error message.
#[wasm_bindgen]
pub fn restore_game_state(json: &str) -> RestoreStateResult {
    use crate::economy::{Building, BuildingType, Economy, ResourceType};
    use crate::units::{Unit, UnitKind, UnitState};
    unsafe {
        if let Some(ref mut app) = APP {
            // Parse the JSON manually — no serde in WASM context, use simple string parsing
            // Since we control the format, we can safely use a simple approach

            // Helper: find a JSON value by key
            fn find_json_value<'a>(s: &'a str, key: &str) -> Option<&'a str> {
                let search = format!("\"{}\":", key);
                let start = s.find(&search)?;
                let after_key = &s[start + search.len()..];
                let ch = after_key.chars().next()?;
                match ch {
                    '"' => {
                        // String value
                        let rest = &after_key[1..];
                        let end = rest.find('"')?;
                        Some(&rest[..end])
                    }
                    '{' | '[' => {
                        // Nested object/array — find matching close
                        let open_char = ch;
                        let close_char = if ch == '{' { '}' } else { ']' };
                        let mut depth = 1u32;
                        let mut end = 1usize;
                        for c in after_key[1..].chars() {
                            end += c.len_utf8();
                            if c == open_char {
                                depth += 1;
                            } else if c == close_char {
                                depth -= 1;
                                if depth == 0 {
                                    break;
                                }
                            }
                        }
                        Some(&after_key[..end])
                    }
                    _ => {
                        // Number or boolean or null
                        let end = after_key
                            .find([',', '}', ']'])
                            .unwrap_or(after_key.len());
                        Some(&after_key[..end])
                    }
                }
            }

            // 1. Load map
            let map_json_val = match find_json_value(json, "map_json") {
                Some(v) => v,
                None => return RestoreStateResult { ok: false, error: String::from("missing map_json") },
            };
            let map_load = crate::load_map_json(map_json_val);
            if !map_load.ok {
                return RestoreStateResult { ok: false, error: format!("map load failed: {}", map_load.error()) };
            }

            // 2. Clear existing economy and rebuild
            let mut new_eco = Economy::new();

            // 3. Restore resources
            let resources_str = match find_json_value(json, "resources") {
                Some(v) => v,
                None => return RestoreStateResult { ok: false, error: String::from("missing resources") },
            };
            for i in 0..ResourceType::COUNT {
                let rt: ResourceType = std::mem::transmute(i as u8);
                let int_key = i.to_string();
                let int_search = format!("\"{}\":", int_key);
                if let Some(pos) = resources_str.find(&int_search) {
                    let after = &resources_str[pos + int_search.len()..];
                    let end = after
                        .find([',', '}'])
                        .unwrap_or(after.len());
                    if let Ok(val) = after[..end].trim().parse::<u32>() {
                        new_eco.storage.set(rt, val);
                    }
                }
            }

            // 4. Restore buildings
            let buildings_str = match find_json_value(json, "buildings") {
                Some(v) => v,
                None => return RestoreStateResult { ok: false, error: String::from("missing buildings") },
            };
            if buildings_str != "[]" {
                // Parse each building object by splitting on "},{"
                let inner = &buildings_str[1..buildings_str.len() - 1];
                let mut depth = 0;
                let mut start = 0;
                let mut bldg_jsons = Vec::new();
                for (i, ch) in inner.char_indices() {
                    match ch {
                        '{' => depth += 1,
                        '}' => {
                            depth -= 1;
                            if depth == 0 {
                                bldg_jsons.push(&inner[start..=i]);
                                start = i + 2; // skip "},{"
                            }
                        }
                        _ => {}
                    }
                }

                for bjson in bldg_jsons {
                    // Extract building properties
                    let kind_name = find_json_value(bjson, "kind").unwrap_or("Unknown");
                    let x = find_json_value(bjson, "x")
                        .and_then(|v| v.parse::<usize>().ok())
                        .unwrap_or(0);
                    let y = find_json_value(bjson, "y")
                        .and_then(|v| v.parse::<usize>().ok())
                        .unwrap_or(0);
                    let construction = find_json_value(bjson, "construction")
                        .and_then(|v| v.parse::<f32>().ok())
                        .unwrap_or(0.0);
                    let active = find_json_value(bjson, "active") == Some("true");
                    let production_counter = find_json_value(bjson, "production_counter")
                        .and_then(|v| v.parse::<u32>().ok())
                        .unwrap_or(0);
                    let max_settlers = find_json_value(bjson, "max_settlers")
                        .and_then(|v| v.parse::<u32>().ok())
                        .unwrap_or(0);

                    // Integer discriminant only (get_game_state always writes discriminants)
                    let kind = kind_name.parse::<u8>().ok()
                        .and_then(BuildingType::from_discriminant);
                    if let Some(kind) = kind {
                        let mut b = Building::new(kind, x, y);
                        b.construction = construction;
                        b.active = active;
                        b.production_counter = production_counter as f32;
                        b.max_settlers = max_settlers;

                        // Restore settler IDs
                        if let Some(settlers_str) = find_json_value(bjson, "assigned_settlers") {
                            let inner_w = &settlers_str[1..settlers_str.len() - 1];
                            if !inner_w.is_empty() {
                                for wid_str in inner_w.split(',') {
                                    if let Ok(wid) = wid_str.trim().parse() {
                                        b.assigned_settlers.push(wid);
                                    }
                                }
                            }
                        }

                        // Restore input buffer
                        if let Some(inbuf_str) = find_json_value(bjson, "input_buffer") {
                            for i in 0..ResourceType::COUNT {
                                let int_key = i.to_string();
                                let int_search = format!("\"{}\":", int_key);
                                if let Some(pos) = inbuf_str.find(&int_search) {
                                    let after = &inbuf_str[pos + int_search.len()..];
                                    let end = after
                                        .find([',', '}'])
                                        .unwrap_or(after.len());
                                    if let Ok(val) = after[..end].trim().parse::<u32>() {
                                        b.input_buffer[i] = val;
                                    }
                                }
                            }
                        }
                        // Restore output buffer
                        if let Some(outbuf_str) = find_json_value(bjson, "output_buffer") {
                            for i in 0..ResourceType::COUNT {
                                let int_key = i.to_string();
                                let int_search = format!("\"{}\":", int_key);
                                if let Some(pos) = outbuf_str.find(&int_search) {
                                    let after = &outbuf_str[pos + int_search.len()..];
                                    let end = after
                                        .find([',', '}'])
                                        .unwrap_or(after.len());
                                    if let Ok(val) = after[..end].trim().parse::<u32>() {
                                        b.output_buffer[i] = val;
                                    }
                                }
                            }
                        }

                        new_eco.buildings.push(b);
                    }
                }
            }

            // 5. Restore units
            let units_str = match find_json_value(json, "units") {
                Some(v) => v,
                None => return RestoreStateResult { ok: false, error: String::from("missing units") },
            };
            if units_str != "[]" {
                let inner = &units_str[1..units_str.len() - 1];
                let mut depth = 0;
                let mut start = 0;
                let mut unit_jsons = Vec::new();
                for (i, ch) in inner.char_indices() {
                    match ch {
                        '{' => depth += 1,
                        '}' => {
                            depth -= 1;
                            if depth == 0 {
                                unit_jsons.push(&inner[start..=i]);
                                start = i + 2;
                            }
                        }
                        _ => {}
                    }
                }

                // Track max ID to continue sequence
                let mut max_id: u32 = 0;
                for ujson in unit_jsons {
                    let id = find_json_value(ujson, "id")
                        .and_then(|v| v.parse::<u32>().ok())
                        .unwrap_or(0);
                    let kind_raw = find_json_value(ujson, "kind").unwrap_or("0");
                    let ux = find_json_value(ujson, "x")
                        .and_then(|v| v.parse::<f32>().ok())
                        .unwrap_or(0.0);
                    let uy = find_json_value(ujson, "y")
                        .and_then(|v| v.parse::<f32>().ok())
                        .unwrap_or(0.0);
                    let hp = find_json_value(ujson, "hp")
                        .and_then(|v| v.parse::<u32>().ok())
                        .unwrap_or(50);
                    let max_hp = find_json_value(ujson, "max_hp")
                        .and_then(|v| v.parse::<u32>().ok())
                        .unwrap_or(50);
                    let state_str = find_json_value(ujson, "state").unwrap_or("Idle");
                    let assigned_building =
                        find_json_value(ujson, "assigned_building").and_then(|v| {
                            if v == "null" {
                                None
                            } else {
                                v.parse::<usize>().ok()
                            }
                        });
                    let target = find_json_value(ujson, "target").and_then(|v| {
                        if v == "null" {
                            None
                        } else {
                            v.parse::<u32>().ok()
                        }
                    });

                    // Parse kind as integer discriminant first (new format), fall back to string (old)
                    let kind = if let Ok(d) = kind_raw.parse::<u8>() {
                        match d {
                            1 => UnitKind::Swordsman,
                            2 => UnitKind::Bowman,
                            _ => UnitKind::Settler,
                        }
                    } else {
                        match kind_raw {
                            "Soldier" => UnitKind::Swordsman,
                            "Archer" => UnitKind::Bowman,
                            _ => UnitKind::Settler,
                        }
                    };

                    let state = match state_str {
                        "Moving" => UnitState::Moving,
                        "Working" => UnitState::Working,
                        "Fighting" => UnitState::Fighting,
                        "Dying" => UnitState::Dying,
                        "Dead" => UnitState::Dead,
                        _ => UnitState::Idle,
                    };

                    let mut unit = Unit::new(id, kind, ux, uy);
                    unit.hp = hp;
                    unit.max_hp = max_hp;
                    unit.state = state;
                    unit.assigned_building = assigned_building;
                    unit.target = target;

                    if id > max_id {
                        max_id = id;
                    }
                    new_eco.units.add_existing(unit);
                }
                new_eco.units.set_next_id(max_id + 1);
            }

            // 6. Restore game time
            if let Some(gt_val) = find_json_value(json, "game_time") {
                if let Ok(gt) = gt_val.parse::<f64>() {
                    app.game_loop.state.game_time = gt;
                }
            }

            // Replace economy
            app.game_loop.state.economy = new_eco;
            app.overlay_dirty = true;
            app.mesh_dirty = true;

            return RestoreStateResult { ok: true, error: String::new() };
        }
    }
    RestoreStateResult { ok: false, error: String::from("engine not initialized") }
}
/// Load a model from a JSON mesh string, validate it, and upload to GPU buffers.
/// Returns "ok:{name}:{indices}tri" if successful, or "error:{message}" on failure.
#[wasm_bindgen]
pub fn load_model_json(model_id: u8, json_str: &str) -> LoadModelResult {
    let mesh = match model::parse_json_mesh(json_str) {
        Ok(m) => m,
        Err(e) => return LoadModelResult {
            ok: false,
            model_id,
            tri_count: 0,
            error: e,
        },
    };
    if mesh.is_empty() {
        return LoadModelResult {
            ok: false,
            model_id,
            tri_count: 0,
            error: String::from("empty mesh"),
        };
    }
    let tri_count = mesh.triangle_count;
    unsafe {
        if let Some(ref mut app) = (*std::ptr::addr_of_mut!(APP)).as_mut() {
            app.upload_model_to_gpu(model_id, &mesh);
            // Cache the mesh data for WebGL context loss recovery
            app.model_mesh_cache.insert(model_id, mesh);
        }
    }
    LoadModelResult {
        ok: true,
        model_id,
        tri_count: tri_count as u32,
        error: String::new(),
    }
}




/// Decompress a .sav savegame chunk: ARA-decrypt then LZ+Huffman decompress.
/// Used by the JS .sav loader to extract game data from savegame chunks.
/// Returns the decompressed data, or an empty Vec on failure.
#[wasm_bindgen]
pub fn decompress_sav_chunk(data: &[u8], expected_length: usize) -> Vec<u8> {
    use crate::ara_crypt::AraCrypt;
    use crate::decompress::Decompressor;

    let mut ara = AraCrypt::new_s4();
    let decrypted = ara.decrypt(data);
    Decompressor::unpack(&decrypted, 0, decrypted.len(), expected_length)
}
/// Add a model instance to the render list for this frame.
/// Called from JS each frame for every building/unit to render.
#[wasm_bindgen]
pub fn add_model_instance(model_type_id: u8, x: f32, y: f32, scale: f32, rotation_y: f32) -> bool {
    unsafe {
        if let Some(ref mut app) = (*std::ptr::addr_of_mut!(APP)).as_mut() {
            let inst = model::ModelInstance::new(model_type_id, x, y)
                .with_scale(scale)
                .with_rotation_y(rotation_y);
            app.model_instances.push(inst);
            return true;
        }
    }
    false
}

// clear_model_instances wasm export removed — dead, 0 JS refs


impl App {
    /// Map a unit kind to a 3D model ID.
    fn model_id_for_unit(kind: units::UnitKind) -> u8 {
        match kind {
            units::UnitKind::Settler => 59,  // worker
            units::UnitKind::Swordsman => 60, // soldier
            units::UnitKind::Bowman => 61,    // archer
            _ => 59,                          // worker fallback
        }
    }
    /// Unique model name strings indexed by model type ID.
    /// Used only in tests for model name assertions.
    #[cfg(test)]
    const MODEL_NAME_BY_ID: [&str; 62] = [
        "headquarters",
        "sawmill",
        "stonecutter",
        "mine",
        "toolsmith",
        "weaponsmith",
        "construction",
        "bakery",
        "butcher",
        "mill",
        "farm",
        "fishery",
        "lumberjack",
        "storehouse",
        "waterworks",
        "smelter",
        "barracks",
        "guardtower",
        "fortress",
        "siegeworkshop",
        "shipyard",
        "roadlayer",
        "apiary",
        "meadmaker",
        "templeofbacchus",
        "colosseum",
        "sanctuaryofminerva",
        "sanctuaryofvulcan",
        "meadhall",
        "sanctuaryofodin",
        "sanctuaryofthor",
        "sanctuaryoffreya",
        "runestone",
        "templeofchac",
        "agavefarm",
        "distillery",
        "sanctuaryofkukulkan",
        "sanctuaryofquetzalcoatl",
        "sanctuaryofhuitzilopochtli",
        "observatory",
        "oracleofapollo",
        "sanctuaryofartemis",
        "sanctuaryofposeidon",
        "sanctuaryofapollo",
        "amphitheater",
        "darktemple",
        "darkgarden",
        "mushroomfarm",
        "sanctuaryofmorbus",
        "sanctuaryofpestilence",
        "darkfortress",
        "demongate",
        "oilpress",
        "armory",
        "healer",
        "vineyard",
        "small_residence",
        "medium_residence",
        "large_residence",
        "worker",
        "soldier",
        "archer",
    ];

    #[cfg(test)]
    /// Look up a model name string from its integer type ID.
    fn model_name_for_id(id: u8) -> &'static str {
        Self::MODEL_NAME_BY_ID.get(id as usize).copied().unwrap_or("construction")
    }

/// Model ID strings for each BuildingType discriminant (87 slots = COUNT).
    /// Indexed by `kind.discriminant() as usize`. Gaps and types without
    /// dedicated 3D models fall back to "construction".
    const BUILDING_MODEL_IDS: [u8; crate::economy::BuildingType::COUNT] = [
        0,                             // 0
        1,                             // 1
        2,                             // 2
        3,                             // 3
        4,                             // 4
        5,                             // 5
        6,                             // 6
        7,                             // 7
        8,                             // 8
        9,                             // 9
        10,                            // 10
        11,                            // 11
        12,                            // 12
        13,                            // 13
        14,                            // 14
        15,                            // 15
        16,                            // 16
        6,                             // 17
        17,                            // 18
        18,                            // 19
        19,                            // 20
        20,                            // 21
        21,                            // 22
        6,                             // 23
        6,                             // 24
        6,                             // 25
        6,                             // 26
        22,                            // 27
        23,                            // 28
        6,                             // 29
        6,                             // 30
        24,                            // 31
        25,                            // 32
        26,                            // 33
        27,                            // 34
        28,                            // 35
        29,                            // 36
        30,                            // 37
        31,                            // 38
        32,                            // 39
        33,                            // 40
        34,                            // 41
        35,                            // 42
        36,                            // 43
        37,                            // 44
        38,                            // 45
        39,                            // 46
        40,                            // 47
        6,                             // 48
        6,                             // 49
        41,                            // 50
        42,                            // 51
        43,                            // 52
        44,                            // 53
        45,                            // 54
        46,                            // 55
        47,                            // 56
        48,                            // 57
        49,                            // 58
        50,                            // 59
        51,                            // 60
        3,                             // 61
        3,                             // 62
        3,                             // 63
        3,                             // 64
        15,                            // 65
        15,                            // 66
        8,                             // 67
        52,                            // 68
        9,                             // 69
        53,                            // 70
        12,                            // 71
        54,                            // 72
        10,                            // 73
        10,                            // 74
        10,                            // 75
        10,                            // 76
        10,                            // 77
        13,                            // 78
        20,                            // 79
        55,                            // 80
        13,                            // 81
        56,                            // 82
        57,                            // 83
        58,                            // 84
        24,                            // 85
        24,                            // 86
    ];

    /// Map a building type to a 3D model ID via array lookup by discriminant.
    fn model_id_for_building(kind: crate::economy::BuildingType) -> u8 {
        Self::BUILDING_MODEL_IDS[kind.discriminant() as usize]
    }

    /// Compute a smooth scale factor from construction progress.
    /// Returns 0.3 at construction=0.0, easing up to 1.0 at construction=1.0.
    /// Uses ease-out curve (1 - (1-t)^2) for a natural "settling" feel.
    fn construction_scale(construction: f32) -> f32 {
        let t = construction.clamp(0.0, 1.0);
        let ease = 1.0 - (1.0 - t) * (1.0 - t);
        0.3 + 0.7 * ease
    }
    /// Compute the visual scale for a building being destroyed.
    /// `progress` is 0.0 (just started) to 1.0 (about to vanish).
    /// Returns a scale factor from 1.0 (full size) down to 0.0 (gone),
    /// with an ease-out curve so the collapse accelerates at the end.
    fn destruction_scale(progress: f32) -> f32 {
        let t = progress.clamp(0.0, 1.0);
        // Ease-in curve: starts slow, accelerates (building crumbles faster at end)
        let ease = t * t;
        1.0 - ease
    }

    fn populate_model_instances_from_game_state(&mut self) -> i32 {
        self.model_instances.clear();
        let mut count = 0i32;

        // Buildings
        for b in self.game_loop.state.economy.buildings.iter() {
            let model_id = Self::model_id_for_building(b.kind);
            // If the building is being destroyed, use destruction scale; otherwise construction scale
            let scale = if let Some(prog) = b.destruction_progress() {
                Self::destruction_scale(prog)
            } else {
                Self::construction_scale(b.construction)
            };
            self.model_instances.push(model::ModelInstance::new(
                model_id,
                b.x as f32 + 0.5,
                b.y as f32 + 0.5,
            ).with_scale(scale));
            count += 1;
        }

        // Units — add a deterministic anim_phase based on unit position so each
        // unit wobbles with a different offset, avoiding a synchronized "army march" look.
        for u in self.game_loop.state.economy.units.alive_units() {
            let model_id = Self::model_id_for_unit(u.kind);
            // Hash the unit coords into a 0..2π phase
            let phase = ((u.x * 127.0 + u.y * 311.0 + 0.5).rem_euclid(std::f32::consts::TAU)).abs();
            self.model_instances.push(model::ModelInstance::new(
                model_id,
                u.x,
                u.y,
            ).with_anim_phase(phase));
            count += 1;
        }

        count
    }
}

// model_instance_count wasm export removed — dead, 0 JS refs

// ── Phase 6: Particle System WASM Exports ─────────────────────────────────────

/// Spawn a single particle.
/// Parameters: x, y, z, vx, vy, vz, life, r, g, b, size
/// Spawn a burst of particles. Returns number spawned.
/// Spawn a green "build success" effect at the given tile.
#[wasm_bindgen]
pub fn spawn_build_effect(tile_x: f32, tile_y: f32) {
    unsafe {
        if let Some(ref mut app) = (*std::ptr::addr_of_mut!(APP)).as_mut() {
            particle::spawn_build_effect(&mut app.particle_system, tile_x, tile_y);
        }
    }
}







/// Get alive particles as typed structs for JS-side rendering.
/// Returns an empty Vec if the app is not initialized.
#[wasm_bindgen]
pub fn get_particles() -> Vec<particle::ParticleInfo> {
    unsafe {
        if let Some(app) = (*std::ptr::addr_of!(APP)).as_ref() {
            app.particle_system.to_info_vec()
        } else {
            Vec::new()
        }
    }
}
/// Get number of unit deaths since last call (drains each frame).
/// Used by JS to trigger death sound effects.
#[wasm_bindgen]
pub fn recent_death_count() -> i32 {
    unsafe {
        if let Some(app) = (*std::ptr::addr_of!(APP)).as_ref() {
            app.recent_death_count as i32
        } else {
            0
        }
    }
}
/// Get number of combat hits since last call (drains each frame).
/// Used by JS to trigger combat sound effects.
#[wasm_bindgen]
pub fn recent_combat_count() -> i32 {
    unsafe {
        if let Some(app) = (*std::ptr::addr_of!(APP)).as_ref() {
            app.recent_combat_count as i32
        } else {
            0
        }
    }
}

/// Get number of building construction completions since last call (drains each frame).
/// Used by JS to trigger construction complete sound effects.
#[wasm_bindgen]
pub fn recent_construction_complete_count() -> i32 {
    unsafe {
        if let Some(app) = (*std::ptr::addr_of!(APP)).as_ref() {
            app.recent_construction_complete_count as i32
        } else {
            0
        }
    }
}

/// Get number of resource production events since last call (drains each frame).
/// Used by JS to trigger resource pickup sound effects.
#[wasm_bindgen]
pub fn recent_resource_pickup_count() -> i32 {
    unsafe {
        if let Some(app) = (*std::ptr::addr_of!(APP)).as_ref() {
            app.recent_resource_pickup_count as i32
        } else {
            0
        }
    }
}


// ── Map Editor Mode ───────────────────────────────────────────────────────────

/// Set the terrain type at a tile position (map editor).
/// terrain_id: 0=Grass, 1=Forest, 2=Mountain, 3=Water, 4=DeepWater, 5=Desert, 6=Swamp, 7=Snow
#[wasm_bindgen]
pub fn set_tile_terrain(x: usize, y: usize, terrain_id: u8) -> bool {
    let terrain = match terrain_id {
        0 => map::Terrain::Grass,
        1 => map::Terrain::Forest,
        2 => map::Terrain::Mountain,
        3 => map::Terrain::Water,
        4 => map::Terrain::DeepWater,
        5 => map::Terrain::Desert,
        6 => map::Terrain::Swamp,
        7 => map::Terrain::Snow,
        _ => return false,
    };
    unsafe {
        if let Some(ref mut app) = (*std::ptr::addr_of_mut!(APP)).as_mut() {
            if app.game_loop.state.map.set_terrain(x, y, terrain) {
                app.mesh_dirty = true;
                return true;
            }
        }
    }
    false
}
/// Toggle map editor grid overlay on/off. Returns new state.
#[wasm_bindgen]
pub fn toggle_editor_grid() -> bool {
    unsafe {
        if let Some(ref mut app) = (*std::ptr::addr_of_mut!(APP)).as_mut() {
            app.editor_grid = !app.editor_grid;
            app.mesh_dirty = true;
            app.editor_grid
        } else {
            false
        }
    }
}
/// Export the current map as typed data (same format as load_map_json expects).
/// Returns None if no map is loaded. JS reconstructs JSON for file download.
#[wasm_bindgen]
pub fn export_map_json() -> Option<MapExportData> {
    unsafe {
        (*std::ptr::addr_of!(APP)).as_ref()
            .map(|app| {
                let map = &app.game_loop.state.map;
                let size = map.width * map.height;
                let mut terrain = Vec::with_capacity(size);
                let mut elevation = Vec::with_capacity(size);
                let mut resource = Vec::with_capacity(size);
                for y in 0..map.height {
                    for x in 0..map.width {
                        if let Some(tile) = map.get(x, y) {
                            terrain.push(tile.terrain as u8);
                            elevation.push(tile.elevation);
                            resource.push(match tile.resource {
                                Some(r) => r as i32,
                                None => -1,
                            });
                        }
                    }
                }
                MapExportData {
                    width: map.width as u32,
                    height: map.height as u32,
                    terrain,
                    elevation,
                    resource,
                }
            })
    }
}
/// Start the destruction animation for a building at the given index.
/// `duration_secs` controls how long the scale-down animation plays (e.g. 1.5).
/// Returns true if the building exists and destruction was started.
#[wasm_bindgen]
pub fn start_building_destruction(building_index: usize, duration_secs: f32) -> bool {
    unsafe {
        if let Some(ref mut app) = APP {
            app.game_loop.state.economy.start_building_destruction(building_index, duration_secs)
        } else {
            false
        }
    }
}
/// Tick destruction timers for all buildings by `dt` seconds.
/// Returns typed Vec<DestructionInfo> - no JSON.parse() needed in JS.
/// JS should call this each frame and remove buildings from the model list.
#[wasm_bindgen]
pub fn tick_building_destructions(dt: f32) -> Vec<DestructionInfo> {
    unsafe {
        if let Some(ref mut app) = APP {
            let completed = app.game_loop.state.economy.tick_destructions(dt);
            // Spawn rubble particles for each completed destruction
            for &(_idx, bx, by) in &completed {
                crate::particle::spawn_rubble_effect(
                    &mut app.particle_system,
                    bx as f32 + 0.5,
                    by as f32 + 0.5,
                );
            }
            completed.iter()
                .map(|(idx, x, y)| DestructionInfo {
                    index: *idx as u32,
                    x: *x as u32,
                    y: *y as u32,
                })
                .collect()
        } else {
            Vec::new()
        }
    }
}/// Returns the remaining HP, or 0 if the building doesn't exist.
/// Get the max HP of a building at the given index. Returns 0 if not found.
/// Building-at-tile information struct — replaces JSON string from get_building_at_tile.
/// `index` is the position in the buildings array (used for garrison/destruction).
/// `kind` is the BuildingType discriminant (use BUILDING_NAMES_BY_ID in JS).
/// `construction` is 0.0..1.0 build progress. `active` is whether the building is producing.
/// `destruction_progress` is -1.0 when not being destroyed, otherwise 0.0..1.0.
#[wasm_bindgen]
#[derive(Copy, Clone)]
pub struct BuildingTileInfo {
    pub index: u32,
    pub kind: u8,
    pub x: u32,
    pub y: u32,
    pub construction: f32,
    pub active: bool,
    pub destruction_progress: f32,
}

/// Destruction info for a building - replaces JSON string from tick_building_destructions.
/// `index` is the position in the buildings array at time of destruction.
/// `x` and `y` are tile coordinates.
#[wasm_bindgen]
#[derive(Copy, Clone)]
pub struct DestructionInfo {
    pub index: u32,
    pub x: u32,
    pub y: u32,
}

/// Get building info at a tile position. Returns Some(BuildingTileInfo) or None.
#[wasm_bindgen]
pub fn get_building_at_tile(tile_x: usize, tile_y: usize) -> Option<BuildingTileInfo> {
    unsafe {
        if let Some(ref app) = APP {
            for (i, b) in app.game_loop.state.economy.buildings.iter().enumerate() {
                if b.x == tile_x && b.y == tile_y {
                    return Some(BuildingTileInfo {
                        index: i as u32,
                        kind: b.kind.discriminant(),
                        x: b.x as u32,
                        y: b.y as u32,
                        construction: b.construction,
                        active: b.active,
                        destruction_progress: b.destruction_progress().unwrap_or(-1.0),
                    });
                }
            }
            None
        } else {
            None
        }
    }
}

// ── Garrison & Morale API ─────────────────────────────────────────────────────

/// Garrison info for a building — replaces JSON string from get_building_garrison_json.
/// `unit_ids` are the raw unit IDs of garrisoned soldiers.
/// Uses manual getters because wasm-bindgen requires Copy for public fields and Vec is not Copy.
#[wasm_bindgen]
pub struct GarrisonInfo {
    count: u32,
    capacity: u32,
    unit_ids: Vec<u32>,
    garrisoned: bool,
}

#[wasm_bindgen]
impl GarrisonInfo {
    #[wasm_bindgen(getter)]
    pub fn count(&self) -> u32 { self.count }
    #[wasm_bindgen(getter)]
    pub fn capacity(&self) -> u32 { self.capacity }
    #[wasm_bindgen(getter)]
    pub fn unit_ids(&self) -> Vec<u32> { self.unit_ids.clone() }
    #[wasm_bindgen(getter)]
    pub fn garrisoned(&self) -> bool { self.garrisoned }
}

/// Get garrison info for a building at the given index.
/// Returns None if building not found or game not initialized.
#[wasm_bindgen]
pub fn get_building_garrison(building_index: usize) -> Option<GarrisonInfo> {
    unsafe {
        if let Some(ref app) = APP {
            if let Some(b) = app.game_loop.state.economy.buildings.get(building_index) {
                return Some(GarrisonInfo {
                    count: b.garrison.len() as u32,
                    capacity: b.max_garrison,
                    unit_ids: b.garrison.to_vec(),
                    garrisoned: b.is_garrisoned(),
                });
            }
        }
    }
    None
}

    #[test]
    fn test_garrison_info_struct_fields() {
        let info = GarrisonInfo {
            count: 3,
            capacity: 6,
            unit_ids: vec![1, 2, 3],
            garrisoned: true,
        };
        assert_eq!(info.count(), 3);
        assert_eq!(info.capacity(), 6);
        assert_eq!(info.unit_ids(), vec![1, 2, 3]);
        assert!(info.garrisoned());
    }

    #[test]
    fn test_morale_info_struct_fields() {
        let info = MoraleInfo {
            morale_bonus: 0.15,
            morale_percent: 15,
        };
        assert_eq!(info.morale_bonus, 0.15);
        assert_eq!(info.morale_percent, 15);

        let zero_info = MoraleInfo {
            morale_bonus: 0.0,
            morale_percent: 0,
        };
        assert_eq!(zero_info.morale_bonus, 0.0);
        assert_eq!(zero_info.morale_percent, 0);
    }

/// Morale info for a unit — replaces JSON string from get_unit_morale_json.
/// `morale_bonus` is the raw multiplier (0.0 = no bonus).
/// `morale_percent` is the percentage as integer (e.g. 15 for +15%).
#[wasm_bindgen]
#[derive(Copy, Clone)]
pub struct MoraleInfo {
    pub morale_bonus: f32,
    pub morale_percent: i32,
}

/// Get morale info for a unit by ID.
/// Returns None if unit not found or game not initialized.
#[wasm_bindgen]
pub fn get_unit_morale(unit_id: u32) -> Option<MoraleInfo> {
    unsafe {
        if let Some(ref app) = APP {
            if let Some(u) = app.game_loop.state.economy.units.get(unit_id) {
                let pct = (u.morale_bonus * 100.0).round() as i32;
                return Some(MoraleInfo {
                    morale_bonus: u.morale_bonus,
                    morale_percent: pct,
                });
            }
        }
    }
    None
}
/// Garrison a unit into a building. Returns true if successful.
/// The unit must be a combat unit and adjacent to the building.
#[wasm_bindgen]
pub fn wasm_garrison_unit(building_index: usize, unit_id: u32) -> bool {
    unsafe {
        if let Some(ref mut app) = APP {
            // Verify the unit exists and is a combat unit
            let can_garrison = app
                .game_loop
                .state
                .economy
                .units
                .get(unit_id)
                .is_some_and(|u| u.kind.can_fight() && u.hp > 0);
            if !can_garrison {
                return false;
            }
            if let Some(b) = app.game_loop.state.economy.buildings.get_mut(building_index) {
                return b.garrison_unit(unit_id);
            }
        }
        false
    }
}
#[wasm_bindgen]
pub fn wasm_ungarrison_unit(building_index: usize, unit_id: u32) -> bool {
    unsafe {
        if let Some(ref mut app) = APP {
            if let Some(b) = app.game_loop.state.economy.buildings.get_mut(building_index) {
                return b.ungarrison_unit(unit_id);
            }
        }
        false
    }
}

/// Build cost item — one resource requirement for a building.
/// Used by get_build_cost_by_id to return typed cost data (no JSON.parse needed).
#[wasm_bindgen]
#[derive(Copy, Clone)]
pub struct BuildCostItem {
    resource_discriminant: u8,
    amount: u32,
}

#[wasm_bindgen]
impl BuildCostItem {
    /// ResourceType discriminant (maps to ResourceType::from_discriminant).
    #[wasm_bindgen(getter)]
    pub fn resource_discriminant(&self) -> u8 { self.resource_discriminant }

    /// Amount of this resource required.
    #[wasm_bindgen(getter)]
    pub fn amount(&self) -> u32 { self.amount }
}



/// Result of try_place_building_by_id — typed struct replacing JSON string.
/// Returns Ok(PlaceBuildingResult) on success, Err(PlaceBuildingResult) with error message on failure.
#[wasm_bindgen]
#[derive(Clone)]
pub struct PlaceBuildingResult {
    ok: bool,
    idx: u32,
    kind: u8,
    error: String,
}

#[wasm_bindgen]
impl PlaceBuildingResult {
    /// Whether the building was successfully placed.
    #[wasm_bindgen(getter)]
    pub fn ok(&self) -> bool { self.ok }

    /// Building index in the economy vector (valid when ok=true).
    #[wasm_bindgen(getter)]
    pub fn idx(&self) -> u32 { self.idx }

    /// BuildingType discriminant (valid when ok=true).
    #[wasm_bindgen(getter)]
    pub fn kind(&self) -> u8 { self.kind }

    /// Error message (valid when ok=false).
    #[wasm_bindgen(getter)]
    pub fn error(&self) -> String { self.error.clone() }
}
// ── Tests ──────────────────────────────────────────────────────────────────────

#[cfg(test)]
#[path = "lib_tests.rs"]
mod tests;
