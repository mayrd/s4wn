//! S4WN Engine — Siedler 4 Web-Native
//!
//! Phase 1: Isometric map rendering + camera controls.
//! Full WASM + WebGL2 pipeline with generated terrain maps,
//! smooth camera pan (mouse drag) and zoom (scroll wheel).

pub mod ara_crypt;
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

use camera::Camera;
use game_loop::{GameLoop, GameState};
use map::{Map, Terrain};
use network::{ClientInterpolator, NetworkManager};
use wasm_bindgen::prelude::*;
use web_sys::{
    window, HtmlCanvasElement, WebGl2RenderingContext, WebGlBuffer, WebGlProgram, WebGlShader,
    WebGlVertexArrayObject,
};

// ── Shaders ───────────────────────────────────────────────────────────────────

const VERTEX_SHADER: &str = r#"#version 300 es
precision highp float;

in vec3 a_position;
in vec3 a_color;
in float a_elevation;
in float a_has_resource;
in float a_slope;
in float a_edge_dist;
in float a_visibility;
in vec2 a_uv;
in float a_terrain_id;
in vec3 a_normal;
in vec4 a_splat;

uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_camera_center;
uniform float u_zoom;
uniform float u_day_phase;
// Phase 5: Orbital camera View-Projection matrix (dual-path migration)
uniform mat4 u_vp;
uniform bool u_use_vp;
uniform float u_water_time;

out vec3 v_color;
out float v_elevation;
out float v_has_resource;
out float v_day_phase;
out float v_slope;
out float v_edge_dist;
out float v_visibility;
out vec2 v_uv;
out float v_terrain_id;
out vec3 v_normal;
out vec4 v_splat;

void main() {
    float x = a_position.x;
    float y = a_position.y;
    float elev = a_elevation;

    // Subtle terrain animation: slight elevation wave driven by u_time
    elev += sin(u_time * 0.5 + x * 0.3 + y * 0.3) * 0.02;

    // Water vertex animation: sine-wave displacement for water tiles
    // Water=3, DeepWater=4 — animate with u_water_time for independent control
    if (a_terrain_id > 2.5 && a_terrain_id < 4.5) {
        float wave1 = sin(u_water_time * 1.8 + x * 1.2 + y * 0.8) * 0.06;
        float wave2 = sin(u_water_time * 2.4 + x * 0.5 - y * 1.1) * 0.04;
        float wave3 = sin(u_water_time * 0.7 + (x + y) * 1.5) * 0.03;
        float water_anim = wave1 + wave2 + wave3;
        // DeepWater gets slightly smaller waves
        if (a_terrain_id > 3.5) {
            water_anim *= 0.7;
        }
        elev += water_anim;
    }

    if (u_use_vp) {
        // Phase 5: Orbital camera — use View-Projection matrix
        // Y is elevation for height-displacement (flat grid currently, will be 3D mesh later)
        float world_y = elev * 0.5;
        gl_Position = u_vp * vec4(x, world_y, y, 1.0);
    } else {
        // Legacy isometric projection
        float iso_x = (x - y) * 0.866;  // cos(30°)
        float iso_y = (x + y) * 0.5 - elev * 0.3;

        // Camera transform
        iso_x -= u_camera_center.x;
        iso_y -= u_camera_center.y;
        iso_x *= u_zoom;
        iso_y *= u_zoom;

        // Convert to clip space
        vec2 clip = (vec2(iso_x, iso_y) / u_resolution) * 2.0;
        clip.y = -clip.y;

        gl_Position = vec4(clip, 0.0, 1.0);
    }
    v_color = a_color;
    v_elevation = elev;
    v_has_resource = a_has_resource;
    v_day_phase = u_day_phase;
    v_slope = a_slope;
    v_edge_dist = a_edge_dist;
    v_uv = a_uv;
    v_terrain_id = a_terrain_id;
    v_visibility = a_visibility;
    v_normal = a_normal;
    v_splat = a_splat;
}
"#;

const FRAGMENT_SHADER: &str = r#"#version 300 es
precision highp float;

in vec3 v_color;
in float v_elevation;
in float v_has_resource;
in float v_day_phase;
in float v_slope;
in float v_edge_dist;
in float v_visibility;
in vec2 v_uv;
in float v_terrain_id;
in vec3 v_normal;
in vec4 v_splat;

uniform highp sampler2DArray u_terrain_textures;
uniform bool u_use_textures;
uniform vec3 u_fog_color;
uniform vec3 u_light_direction;
uniform float u_water_time;

out vec4 out_color;

void main() {
    // Base color: splat-blended terrain atlas or fall back to vertex color
    // Atlas layout: 4 horizontal slices (grass=0, rock=1, sand=2, snow=3), each 512x512 in 2048x512 image
    // v_splat.rgba = weights for grass/rock/sand/snow
    vec3 base_color;
    if (u_use_textures) {
        // Remap UV into each 512-wide slice: U = (layer + uv.x) / 4.0, V = uv.y
        vec2 atlas_uv_grass = vec2((0.0 + v_uv.x) / 4.0, v_uv.y);
        vec2 atlas_uv_rock  = vec2((1.0 + v_uv.x) / 4.0, v_uv.y);
        vec2 atlas_uv_sand  = vec2((2.0 + v_uv.x) / 4.0, v_uv.y);
        vec2 atlas_uv_snow  = vec2((3.0 + v_uv.x) / 4.0, v_uv.y);
        vec3 tex_grass = texture(u_terrain_textures, vec3(atlas_uv_grass, 0.0)).rgb;
        vec3 tex_rock  = texture(u_terrain_textures, vec3(atlas_uv_rock,  0.0)).rgb;
        vec3 tex_sand  = texture(u_terrain_textures, vec3(atlas_uv_sand,  0.0)).rgb;
        vec3 tex_snow  = texture(u_terrain_textures, vec3(atlas_uv_snow,  0.0)).rgb;
        float w = dot(v_splat, vec4(1.0)); // total weight for normalization
        if (w < 0.001) w = 1.0; // avoid division by zero
        base_color = (tex_grass * v_splat.r + tex_rock * v_splat.g
                    + tex_sand * v_splat.b + tex_snow * v_splat.a) / w;
    } else {
        base_color = v_color;
    }

    // Slope-based shading: steeper = darker
    float slope_shade = 1.0 - smoothstep(0.0, 0.4, v_slope) * 0.5;
    // Elevation-based shade: higher = slightly brighter
    float elev_shade = 1.0 + v_elevation * 0.1;
    float shade = slope_shade * elev_shade;

    // Day/night cycle: 0.0=midnight (darkest), 0.5=noon (brightest). Uses shifted sine + Hermite smoothstep for natural transition
    // Day/night cycle: phase 0.0=midnight (dark), 0.5=noon (bright)
    // Shift by -0.25 so sin peaks at noon and bottoms at midnight
    // Apply Hermite smoothstep for natural transition feel
    float day_light_raw = 0.5 + 0.5 * sin((v_day_phase - 0.25) * 6.2831853);
    // Smooth ease-in-out: gentler transitions, night stays dark, day stays bright
    float day_light = day_light_raw * day_light_raw * (3.0 - 2.0 * day_light_raw);
    float warmth = 0.5 + day_light * 0.5;

    // Diffuse lighting from vertex normal
    vec3 n = normalize(v_normal);
    vec3 l = normalize(u_light_direction);
    float diffuse = max(dot(n, l), 0.0);
    float ambient_base = 0.15 + day_light * 0.35;
    float light = ambient_base + diffuse * 0.7;

    vec3 lit = base_color * shade * light;

    // Water rendering path: Fresnel-based transparency + specular + depth color ramp
    // Water=3, DeepWater=4
    bool is_water = (v_terrain_id > 2.5 && v_terrain_id < 4.5);
    bool is_deep_water = (v_terrain_id > 3.5);
    if (is_water) {
        // Animated specular highlight (sun reflection on waves)
        vec3 view_dir = vec3(0.0, 1.0, 0.0); // simplified top-down-ish view
        vec3 n_w = normalize(v_normal);
        vec3 l_w = normalize(u_light_direction);
        vec3 h = normalize(l_w + view_dir);
        float spec = pow(max(dot(n_w, h), 0.0), 64.0);
        float specular_strength = spec * (0.4 + day_light * 0.6);

        // Fresnel: stronger reflection at grazing edges
        float fresnel = pow(1.0 - max(dot(n_w, view_dir), 0.0), 3.0);
        fresnel = mix(0.04, 1.0, fresnel);

        // Depth-based color ramp
        vec3 shallow_color = vec3(0.1, 0.45, 0.55);  // turquoise shallow
        vec3 deep_color    = vec3(0.02, 0.12, 0.35);  // dark navy deep
        float depth_t = is_deep_water ? 0.7 : 0.3;
        // Add spatial variation
        depth_t += 0.15 * sin(u_water_time * 1.5 + v_uv.x * 6.28 + v_uv.y * 6.28);
        depth_t = clamp(depth_t, 0.0, 1.0);
        vec3 water_color = mix(shallow_color, deep_color, depth_t);

        // Blend water color with terrain base using fresnel
        vec3 water_surface = water_color * light;
        // Add specular sparkle
        water_surface += vec3(1.0, 0.95, 0.8) * specular_strength * 0.6;
        // Fresnel blend with underlying terrain
        lit = mix(water_surface, lit * vec3(0.3, 0.5, 0.6), fresnel * 0.6);
        // Slight transparency simulation via color desaturation at edges
        float alpha_sim = mix(0.85, 1.0, fresnel);
        lit *= alpha_sim;
    }

    // Resource glow: tiles with resources get a subtle pulsing overlay
    if (v_has_resource > 0.5) {
        float pulse = 0.8 + 0.2 * sin((v_day_phase - 0.25) * 6.2831853 * 2.0);
        vec3 glow = vec3(0.9, 0.85, 0.3) * 0.15 * pulse;
        lit = lit + glow;
    }

    // Edge-of-map fog: darken tiles near map border (pre-computed on CPU)
    float edge_dist = v_edge_dist;
    float edge_zone = 8.0;  // tiles from edge where fog starts
    float edge_factor = smoothstep(0.0, edge_zone, edge_dist);
    lit = mix(u_fog_color, lit, edge_factor);

    // Fog of war: darken tiles based on visibility
    // v_visibility is 0.0 (unexplored/hidden) to 1.0 (fully visible)
    // Smooth transition: below 0.2 visibility → fully fogged, above 0.5 → fully visible
    float vis = smoothstep(0.15, 0.6, v_visibility);
    lit = mix(u_fog_color, lit, vis);

    // Add warmth tint
    lit = mix(lit * 0.7, lit, warmth);

    out_color = vec4(lit, 1.0);
}
"#;

// ── Overlay Shaders (buildings + units) ───────────────────────────────────────

const OVERLAY_VERTEX_SHADER: &str = r#"#version 300 es
precision highp float;

in vec2 a_overlay_pos;
in vec3 a_overlay_color;
in float a_overlay_size;

uniform vec2 u_resolution;
uniform vec2 u_camera_center;
uniform float u_zoom;

out vec3 v_overlay_color;

void main() {
    float x = a_overlay_pos.x;
    float y = a_overlay_pos.y;

    // Isometric projection (same as terrain)
    float iso_x = (x - y) * 0.866;
    float iso_y = (x + y) * 0.5;

    // Camera transform
    iso_x -= u_camera_center.x;
    iso_y -= u_camera_center.y;
    iso_x *= u_zoom;
    iso_y *= u_zoom;

    // Convert to clip space
    vec2 clip = (vec2(iso_x, iso_y) / u_resolution) * 2.0;
    clip.y = -clip.y;

    gl_Position = vec4(clip, 0.0, 1.0);
    gl_PointSize = a_overlay_size * u_zoom;
    v_overlay_color = a_overlay_color;
}
"#;

const OVERLAY_FRAGMENT_SHADER: &str = r#"#version 300 es
precision highp float;

in vec3 v_overlay_color;
uniform vec3 u_player_rgb; // (0,0,0) = no nation tint; otherwise nation color

out vec4 out_color;

void main() {
    // Draw a soft circle for each point
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);
    if (dist > 0.5) discard;

    // Soft edge
    float alpha = 1.0 - smoothstep(0.3, 0.5, dist);

    // Tint with player nation color (40% blend) when a nation is selected
    vec3 final_color = v_overlay_color;
    if (u_player_rgb != vec3(0.0)) {
        final_color = mix(v_overlay_color, u_player_rgb, 0.4);
    }
    out_color = vec4(final_color, alpha);
}
"#;

// ── Model 3D Shaders ─────────────────────────────────────────────────────────
// Phase 5 Step 8: GPU model rendering pass for buildings and units.

const MODEL_VERTEX_SHADER: &str = r#"#version 300 es
precision highp float;

in vec3 a_position;
in vec3 a_normal;
in vec2 a_uv;
// Instanced model matrix (4 vec4 attributes at locations 3-6)
in mat4 a_model;
// Per-instance world offset (location 7)
in vec3 a_offset;
// Per-instance animation phase (location 8) — 0.0 = no wobble (buildings), non-zero = unit idle wobble
in float a_anim_phase;

uniform mat4 u_vp;
uniform mat4 u_model;
uniform vec3 u_view_pos;
uniform vec3 u_light_dir;
uniform float u_use_instanced;
uniform float u_time;

out vec3 v_normal;
out vec3 v_world_pos;
out vec2 v_uv;
out vec3 v_light_dir;
out vec3 v_view_dir;

void main() {
    mat4 model = (u_use_instanced > 0.5) ? a_model : u_model;
    vec3 pos = a_position + a_offset;

    // Unit idle wobble: subtle sine-wave displacement when a_anim_phase != 0.0
    // Y bob: gentle vertical sway, X/Z: slight horizontal drift
    if (a_anim_phase > 0.0 || a_anim_phase < 0.0) {
        float t = u_time * 2.0 + a_anim_phase;
        pos.y += sin(t) * 0.04;
        pos.x += sin(t * 1.3 + 1.0) * 0.015;
        pos.z += cos(t * 0.7 + 2.0) * 0.015;
    }

    vec4 world_pos = model * vec4(pos, 1.0);
    v_world_pos = world_pos.xyz;
    v_normal = normalize(mat3(model) * a_normal);
    v_uv = a_uv;
    v_light_dir = normalize(u_light_dir);
    v_view_dir = normalize(u_view_pos - world_pos.xyz);
    gl_Position = u_vp * world_pos;
}
"#;

const MODEL_FRAGMENT_SHADER: &str = r#"#version 300 es
precision highp float;

in vec3 v_normal;
in vec3 v_world_pos;
in vec2 v_uv;
in vec3 v_light_dir;
in vec3 v_view_dir;

uniform vec4 u_model_color;
uniform float u_roughness;
uniform float u_metallic;

out vec4 out_color;

void main() {
    vec3 N = normalize(v_normal);
    vec3 L = normalize(v_light_dir);
    vec3 V = normalize(v_view_dir);
    vec3 H = normalize(L + V);

    // Diffuse (Lambert)
    float NdotL = max(dot(N, L), 0.0);
    vec3 diffuse = u_model_color.rgb * NdotL;

    // Ambient
    vec3 ambient = u_model_color.rgb * 0.15;

    // Specular (Blinn-Phong with roughness)
    float NdotH = max(dot(N, H), 0.0);
    float spec = pow(NdotH, 2.0 / (u_roughness * u_roughness + 0.001));
    vec3 specular = mix(vec3(0.04), u_model_color.rgb, u_metallic) * spec * 0.5;

    vec3 final_color = ambient + diffuse + specular;
    out_color = vec4(final_color, u_model_color.a);
}
"#;


/// Scale factor for converting tile elevation (0.0–1.0) to world-space Y units.
/// Default 0.5 means a full-height tile displaces upward by 0.5 world units.
const ELEVATION_SCALE: f32 = 0.5;

// ── Application State ─────────────────────────────────────────────────────────

static mut APP: Option<App> = None;

/// GPU buffers for a single uploaded 3D model mesh.
/// Each model gets its own VAO + index buffer so per-model draw calls work correctly.
#[allow(dead_code)]
struct GpuModel {
    vao: WebGlVertexArrayObject,
    index_buffer: WebGlBuffer,
    index_count: i32,
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

    // FPS counter
    fps_frame_count: u32,
    fps_last_time: f64,
    current_fps: u32,

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
    // Splat-map buffer
    splat_buffer: Option<WebGlBuffer>,
    // Water animation time uniform
    water_time_loc: Option<web_sys::WebGlUniformLocation>,
    // ── Phase 5 Step 8: Model 3D rendering ──────────────────────────
    model_program: Option<WebGlProgram>,
    /// Per-model GPU buffers (VAO + index buffer + index count), keyed by model_id
    gpu_models: std::collections::HashMap<String, GpuModel>,
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
    // ── Phase 6: Particle System ──────────────────────────────────────────
    particle_system: particle::ParticleSystem,
    /// Sound event counters — drained each frame by JS for audio playback
    recent_death_count: u32,
    recent_combat_count: u32,

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
            indices: Vec::new(),
        }
    }
}

fn build_map_mesh(map: &Map, camera: &Camera) -> MeshData {
    let mut mesh = MeshData::new();
    let (min_x, max_x, min_y, max_y) = camera.visible_bounds(map.width, map.height);

    // Guard against degenerate viewport (e.g., 1px-tall canvas) that could cause
    // integer underflow or capacity overflow when computing row/col counts.
    if max_x < min_x || max_y < min_y {
        return mesh;
    }

    // Expand a bit to avoid pop-in at edges
    let extra = 2usize;
    let min_x = min_x.saturating_sub(extra);
    // Clamp to width-2 / height-2 to leave room for the +1 vertex
    // needed by the triangle strip (loop goes 0..=cols, 0..=rows)
    let max_x = (max_x + extra).min(map.width.saturating_sub(2));
    let min_y = min_y.saturating_sub(extra);
    let max_y = (max_y + extra).min(map.height.saturating_sub(2));

    // Extra guard: if expansion/clamping produced invalid bounds, bail
    if max_x < min_x || max_y < min_y {
        return mesh;
    }

    let rows = max_y - min_y + 1;
    let cols = max_x - min_x + 1;
    let grid_w = (cols + 1) as u16;

    for row in 0..=rows {
        for col in 0..=cols {
            let mx = min_x + col;
            let my = min_y + row;
            let tile = map.get(mx, my).unwrap();

            mesh.positions.push(mx as f32);
            mesh.positions.push(tile.elevation * ELEVATION_SCALE);
            mesh.positions.push(my as f32);

            let c = tile.terrain.color();
            mesh.colors.push(c[0]);
            mesh.colors.push(c[1]);
            mesh.colors.push(c[2]);

            mesh.elevations.push(tile.elevation);

            // Resource flag: 1.0 if tile has a resource, 0.0 otherwise
            let has_res = if tile.resource.is_some() {
                1.0f32
            } else {
                0.0f32
            };
            mesh.has_resources.push(has_res);

            // Compute slope: max elevation difference to neighbors
            let mut max_diff = 0.0f32;
            for dy in [-1isize, 0, 1] {
                for dx in [-1isize, 0, 1] {
                    if dx == 0 && dy == 0 {
                        continue;
                    }
                    let nx = mx as isize + dx;
                    let ny = my as isize + dy;
                    if nx >= 0 && ny >= 0 && (nx as usize) < map.width && (ny as usize) < map.height
                    {
                        let neighbor_elev = map.get(nx as usize, ny as usize).unwrap().elevation;
                        let diff = (tile.elevation - neighbor_elev).abs();
                        if diff > max_diff {
                            max_diff = diff;
                        }
                    }
                }
            }
            mesh.slopes.push(max_diff);

            // Compute edge distance for fog (CPU-side to avoid GPU uniform optimizer issues)
            let edge_x = (mx as f32).min(map.width as f32 - 1.0 - mx as f32);
            let edge_y = (my as f32).min(map.height as f32 - 1.0 - my as f32);
            mesh.edge_dists.push(edge_x.min(edge_y));

            // UV coordinates for texture mapping (tile-relative, 4×4 repeat)
            let u = (mx % 4) as f32 / 4.0;
            let v = (my % 4) as f32 / 4.0;
            mesh.uvs.push(u);
            mesh.uvs.push(v);
            mesh.terrain_ids.push(tile.terrain as u8 as f32);
            mesh.visibilities.push(tile.visibility);

            // Compute vertex normal from heightmap gradient (central differences)
            let h_scale = ELEVATION_SCALE;
            let h_c = tile.elevation * h_scale;
            let get_h = |x: isize, y: isize| -> f32 {
                if x >= 0 && y >= 0 && (x as usize) < map.width && (y as usize) < map.height {
                    map.get(x as usize, y as usize).unwrap().elevation * h_scale
                } else {
                    h_c
                }
            };
            let nx = -(get_h(mx as isize + 1, my as isize) - get_h(mx as isize - 1, my as isize)) / 2.0;
            let nz = -(get_h(mx as isize, my as isize + 1) - get_h(mx as isize, my as isize - 1)) / 2.0;
            let ny = 1.0;
            let n_len = (nx * nx + ny * ny + nz * nz).sqrt();
            if n_len > 1e-10 {
                mesh.normals.push(nx / n_len);
                mesh.normals.push(ny / n_len);
                mesh.normals.push(nz / n_len);
            } else {
                mesh.normals.push(0.0);
                mesh.normals.push(1.0);
                mesh.normals.push(0.0);
            }

            // Compute splat-map weights based on terrain type + slope
            // R=grass, G=rock, B=sand, A=snow
            let terrain = tile.terrain;
            let slope_val = max_diff;
            let mut splat_r = 0.0f32;
            let mut splat_g = 0.0f32;
            let mut splat_b = 0.0f32;
            let mut splat_a = 0.0f32;
            match terrain {
                Terrain::Grass | Terrain::Forest => {
                    // Grass-dominant, with rock on steep slopes
                    let rock = ((slope_val - 0.15) / 0.3).clamp(0.0, 1.0);
                    splat_r = 1.0 - rock;
                    splat_g = rock;
                }
                Terrain::Mountain => {
                    // Rock-dominant, more rock on steeper slopes
                    let rock = if slope_val > 0.3 { 1.0 } else { 0.8 };
                    splat_g = rock;
                    splat_r = 1.0 - rock;
                }
                Terrain::Desert | Terrain::Swamp => {
                    splat_b = 0.8;
                    splat_r = 0.2;
                }
                Terrain::Snow => {
                    splat_a = 1.0;
                }
                Terrain::Water | Terrain::DeepWater => {
                    // Underwater: mix sand / rock / grass
                    splat_b = 0.5;
                    splat_g = 0.3;
                    splat_r = 0.2;
                }
            }
            // Normalize splats so they sum to ~1.0
            let splat_sum = splat_r + splat_g + splat_b + splat_a;
            if splat_sum > 0.0 {
                splat_r /= splat_sum;
                splat_g /= splat_sum;
                splat_b /= splat_sum;
                splat_a /= splat_sum;
            }
            mesh.splats.push(splat_r);
            mesh.splats.push(splat_g);
            mesh.splats.push(splat_b);
            mesh.splats.push(splat_a);

            // Build triangle strip indices
            if row < rows && col < cols {
                let tl = (row as u16) * grid_w + (col as u16);
                let tr = tl + 1;
                let bl = tl + grid_w;
                let br = bl + 1;

                mesh.indices.extend_from_slice(&[tl, bl, tr, tr, bl, br]);
            }
        }
    }

    mesh
}

// ── App Implementation ────────────────────────────────────────────────────────

impl App {
    fn new(canvas: &HtmlCanvasElement) -> Result<App, JsValue> {
        let gl = canvas
            .get_context("webgl2")?
            .ok_or("WebGL2 not available")?
            .dyn_into::<WebGl2RenderingContext>()?;

        // Compile shaders
        let vert = compile_shader(&gl, WebGl2RenderingContext::VERTEX_SHADER, VERTEX_SHADER)?;
        let frag = compile_shader(
            &gl,
            WebGl2RenderingContext::FRAGMENT_SHADER,
            FRAGMENT_SHADER,
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
        let day_phase_loc = gl
            .get_uniform_location(&program, "u_day_phase")
            .ok_or("Cannot find u_day_phase")?;
        // ── Phase 5 Step 8: Initialize model rendering ──────────────
        let model_program = compile_shader(
            &gl,
            WebGl2RenderingContext::VERTEX_SHADER,
            MODEL_VERTEX_SHADER,
        )
        .and_then(|vert| {
            compile_shader(
                &gl,
                WebGl2RenderingContext::FRAGMENT_SHADER,
                MODEL_FRAGMENT_SHADER,
            )
            .and_then(|frag| link_program(&gl, &vert, &frag))
        })
        .ok();

        let (model_pos_buffer, model_normal_buffer, model_uv_buffer,
             model_model_loc, model_view_pos_loc, model_light_dir_loc,
             model_color_loc, model_roughness_loc, model_metallic_loc,
             model_instance_buffer, model_offset_buffer, model_vp_loc, model_use_instanced_loc,
             model_time_loc, model_anim_phase_buffer) = 
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
                )
            } else {
                (None, None, None, None, None, None, None, None, None, None, None, None, None, None, None)
            };


        // Compile overlay shaders
        let overlay_vert = compile_shader(
            &gl,
            WebGl2RenderingContext::VERTEX_SHADER,
            OVERLAY_VERTEX_SHADER,
        )?;
        let overlay_frag = compile_shader(
            &gl,
            WebGl2RenderingContext::FRAGMENT_SHADER,
            OVERLAY_FRAGMENT_SHADER,
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
            
            model_program,
            gpu_models: std::collections::HashMap::new(),
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
            water_time_loc,

            // Phase 6: Particle system
            particle_system: particle::ParticleSystem::new(),
            recent_death_count: 0,
            recent_combat_count: 0,
        })
    }

    fn resize(&mut self, width: u32, height: u32) {
        self.gl.viewport(0, 0, width as i32, height as i32);
        self.camera.viewport_width = width;
        self.camera.viewport_height = height;
        self.mesh_dirty = true;
    }

    fn render(&mut self, now: f64) {
        let elapsed = (now - self.start_time) / 1000.0; // seconds

        // Run game logic ticks (fixed timestep), scaled by speed, paused check
        if !self.paused {
            let scaled_elapsed = elapsed * self.speed_multiplier;
            let _ticks = self.game_loop.frame(scaled_elapsed);
        } else {
            // When paused, reset timing so we don't get a burst of ticks on resume
            self.game_loop.reset_timing(elapsed);
        }

        // Store frame time for overlay interpolation
        self.last_frame_ms = now;

        // Process incoming network messages (feed GameStateSync into interpolator)
        let messages = self.network_manager.receive();
        for msg in messages {
            if let network::NetworkMessage::GameStateSync(snapshot) = msg {
                self.interpolator.push_snapshot(snapshot, now / 1000.0);
            }
        }

        // Compute day_phase from game time: cycle ~ 5 minutes of real-time per day
        // Day cycle = 300 seconds / 10 TPS = 3000 ticks per day
        let day_phase = (self.game_loop.state.game_time / 300.0) % 1.0;

        // Update particles (always runs, even when paused, for visual effects)
        self.particle_system.update(0.016);

        // Spawn combat particles for recently died units
        // Drain sound event counters for JS-side audio playback
        let dead_positions = self.game_loop.state.economy.units.drain_recently_died();
        self.recent_death_count = dead_positions.len() as u32;
        self.recent_combat_count = self.game_loop.state.economy.units.drain_combat_hits();
        for (dx, dy) in &dead_positions {
            particle::spawn_combat_effect(&mut self.particle_system, *dx, *dy);
        }

        // Ambient particles: chimney smoke from buildings, leaves near forests
        // Rate-limited: only spawn when particle count is low
        if self.particle_system.alive_count() < 64 {
            let tick = self.game_loop.state.game_time as u32;
            // Every ~30 ticks, try spawning ambient effects
            if tick % 30 == 0 {
                // Collect building positions for smoke
                let buildings = self.game_loop.state.economy.buildings.clone();
                for (i, b) in buildings.iter().enumerate() {
                    // Smoke from every 3rd building to limit count
                    if i % 3 == 0 {
                        particle::spawn_smoke_effect(&mut self.particle_system, b.x as f32 + 0.5, b.y as f32 + 0.5);
                    }
                }
            }
            // Leaf particles near forest tiles (every ~50 ticks)
            if tick % 50 == 0 {
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
        }

        // Smooth camera
        self.camera.update(0.016); // ~60fps

        // Rebuild mesh if camera moved significantly
        if self.mesh_dirty {
            self.rebuild_mesh();
            self.mesh_dirty = false;
        }

        // FPS counter: count frames over 1-second windows
        self.fps_frame_count += 1;
        let fps_delta = now - self.fps_last_time;
        if fps_delta >= 1000.0 {
            self.current_fps = self.fps_frame_count;
            self.fps_frame_count = 0;
            self.fps_last_time = now;
        }

        // Now borrow gl for drawing (after mutable operations are done)
        let gl = &self.gl;

        gl.clear_color(0.05, 0.08, 0.18, 1.0); // Dark navy
        gl.clear(WebGl2RenderingContext::COLOR_BUFFER_BIT);

        // ── Render diagnostics (first frame only) ──────────────────────
        if self.fps_frame_count == 0 {
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
        if self.textures_loaded {
            if let Some(ref loc) = self.terrain_tex_loc {
                gl.uniform1i(Some(loc), 0); // TEXTURE0
            }
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
            gl.uniform3f(Some(loc), 0.05, 0.08, 0.18);
        }
        // Pass light direction (tied to day/night cycle: sun arc)
        if let Some(ref loc) = self.light_dir_loc {
            let sun_angle = (day_phase as f32 - 0.25) * 6.2831853;
            let sun_elev = sun_angle.sin() * 0.8 + 0.2;
            let lx = sun_angle.cos() * sun_elev.max(0.1);
            let ly = sun_elev.max(0.1);
            let lz = sun_angle.sin() * sun_elev.max(0.1);
            let len = (lx*lx + ly*ly + lz*lz).sqrt();
            gl.uniform3f(Some(loc), lx/len, ly/len, lz/len);
        }
        // Pass water animation time (independent of game time for visual smoothness)
        if let Some(ref loc) = self.water_time_loc {
            gl.uniform1f(Some(loc), elapsed as f32);
        }
        // Phase 5: Pass orbital camera View-Projection matrix to shader
        // When enabled (u_use_vp=true), shader uses VP matrix instead of legacy iso params
        if let (Some(ref vp_loc), Some(ref use_loc)) = (&self.vp_loc, &self.use_vp_loc) {
            // Compute VP from orbital camera params
            let (ex, ey, ez) = self.camera.eye();
            let (tx, ty, tz) = self.camera.look_at_target();
            let aspect = self.camera.viewport_width as f32 / self.camera.viewport_height.max(1) as f32;
            let fov = 45.0f32.to_radians();
            let near = 0.1_f32;
            let far = 500.0_f32;
            let f = 1.0 / (fov * 0.5).tan();
            let range_inv = 1.0 / (near - far);
            // LookAt: forward, right, up
            let fwd_x = tx - ex;
            let fwd_y = ty - ey;
            let fwd_z = tz - ez;
            let fwd_len = (fwd_x*fwd_x + fwd_y*fwd_y + fwd_z*fwd_z).sqrt();
            let fwd_x = fwd_x / fwd_len;
            let fwd_y = fwd_y / fwd_len;
            let fwd_z = fwd_z / fwd_len;
            let world_up = (0.0_f32, 1.0_f32, 0.0_f32);
            let right_x = fwd_y * world_up.2 - fwd_z * world_up.1;
            let right_y = fwd_z * world_up.0 - fwd_x * world_up.2;
            let right_z = fwd_x * world_up.1 - fwd_y * world_up.0;
            let right_len = (right_x*right_x + right_y*right_y + right_z*right_z).sqrt();
            let right_x = right_x / right_len;
            let right_y = right_y / right_len;
            let right_z = right_z / right_len;
            let up_x = right_y * fwd_z - right_z * fwd_y;
            let up_y = right_z * fwd_x - right_x * fwd_z;
            let up_z = right_x * fwd_y - right_y * fwd_x;
            // Translation part of view: -eye
            let v_tx = -(right_x * ex + right_y * ey + right_z * ez);
            let v_ty = -(up_x * ex + up_y * ey + up_z * ez);
            let v_tz = -(-fwd_x * ex - fwd_y * ey - fwd_z * ez);
            // Perspective projection matrix (column-major)
            let p00 = f / aspect;
            let p11 = f;
            let p22 = (near + far) * range_inv;
            let p23 = 2.0 * near * far * range_inv;
            let p32 = -1.0;
            // VP = P * V (column-major for WebGL)
            let vp: [f32; 16] = [
                p00 * right_x,  p11 * up_x,    p22 * (-fwd_x),  p32 * (-fwd_x),
                p00 * right_y,  p11 * up_y,    p22 * (-fwd_y),  p32 * (-fwd_y),
                p00 * right_z,  p11 * up_z,    p22 * (-fwd_z),  p32 * (-fwd_z),
                p00 * v_tx,     p11 * v_ty,    p22 * v_tz + p23, p32 * v_tz,
            ];
            gl.uniform_matrix4fv_with_f32_array(Some(vp_loc), false, &vp);
            gl.uniform1i(Some(use_loc), 1);
        } else {
            // No VP — shader falls back to legacy iso
            if let Some(ref loc) = self.use_vp_loc {
                gl.uniform1i(Some(loc), 0);
            }
        }
        gl.uniform2f(
            Some(&self.resolution_loc),
            canvas.width() as f32 * 0.5,
            canvas.height() as f32 * 0.5,
        );

        gl.bind_vertex_array(Some(&self.vao));

        gl.draw_elements_with_i32(
            WebGl2RenderingContext::TRIANGLES,
            self.index_count,
            WebGl2RenderingContext::UNSIGNED_SHORT,
            0,
        );

        // ── Model 3D: auto-populate instances from game state, then draw ──
        self.populate_model_instances_from_game_state();
        self.render_models(elapsed as f32);

// ── Overlay: draw buildings and units as colored dots ─────────────
        self.render_overlay();
    }

    // ── Phase 5 Step 8: Model 3D Rendering Pass ──────────────────────

    /// Upload a model mesh to GPU buffers for rendering.
    /// Creates a per-model VAO + index buffer so that render_models can do
    /// correctly separated draw calls per model type.
    fn upload_model_to_gpu(&mut self, name: &str, mesh: &model::ModelMesh) {
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
                name.to_string(),
                GpuModel {
                    vao,
                    index_buffer: buf,
                    index_count: mesh.indices.len() as i32,
                },
            );
        }
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

        // Compute VP matrix from orbital camera (reuse existing infrastructure)
        let (ex, ey, ez) = self.camera.eye();
        let (tx, ty, tz) = self.camera.look_at_target();
        let aspect = self.camera.viewport_width as f32 / self.camera.viewport_height.max(1) as f32;
        let proj = model::perspective(45.0, aspect, 0.1, 500.0);
        let view = model::look_at(&[ex, ey, ez], &[tx, ty, tz], &[0.0, 1.0, 0.0]);
        let vp = model::mat4_mul(&proj, &view);

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

        // Color/material uniforms (same for all instances)
        if let Some(ref loc) = self.model_color_loc {
            gl.uniform4f(Some(loc), 0.7, 0.65, 0.55, 1.0);
        }
        if let Some(ref loc) = self.model_roughness_loc {
            gl.uniform1f(Some(loc), 0.6);
        }
        if let Some(ref loc) = self.model_metallic_loc {
            gl.uniform1f(Some(loc), 0.0);
        }

        // Enable instanced path
        if let Some(ref loc) = self.model_use_instanced_loc {
            gl.uniform1f(Some(loc), 1.0);
        }

        // Animation time uniform (for unit wobble)
        if let Some(ref loc) = self.model_time_loc {
            gl.uniform1f(Some(loc), elapsed as f32);
        }

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

        // Group instances by model_id
        let mut groups: std::collections::HashMap<&str, Vec<&model::ModelInstance>> = std::collections::HashMap::new();
        for inst in &self.model_instances {
            groups.entry(&inst.model_id).or_insert_with(Vec::new).push(inst);
        }

        // Per-model instanced draw calls
        for (model_id, instances) in &groups {
            // Look up this model's GPU buffers
            let gpu_model = match self.gpu_models.get(*model_id) {
                Some(gm) => gm,
                None => continue, // model not uploaded yet, skip
            };

            // Bind this model's VAO (which has its own index buffer)
            gl.bind_vertex_array(Some(&gpu_model.vao));

            // Build instance data arrays for this model group
            let mut model_mats: Vec<f32> = Vec::new();
            let mut offsets: Vec<f32> = Vec::new();
            let mut anim_phases: Vec<f32> = Vec::new();
            for inst in instances {
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

            // Instanced draw call for this model group
            let instance_count = instances.len() as i32;
            gl.draw_elements_instanced_with_i32(
                WebGl2RenderingContext::TRIANGLES,
                gpu_model.index_count,
                WebGl2RenderingContext::UNSIGNED_SHORT,
                0,
                instance_count,
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
        }

        if positions.is_empty() {
            return;
        }

        let gl = &self.gl;

        // Rebuild overlay buffers if dirty
        if self.overlay_dirty || true {
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
        gl.draw_arrays(WebGl2RenderingContext::POINTS, 0, self.overlay_index_count);
        gl.disable(WebGl2RenderingContext::BLEND);
    }

    fn rebuild_mesh(&mut self) {
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
        return Err(JsValue::from_str(&format!("Shader compile error: {}", log)));
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
    console_error_panic_hook::set_once();

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
    let app = unsafe { APP.as_mut().expect("App not initialized") };
    app.textures_loaded = true;
    web_sys::console::log_1(&"Terrain textures ready (8 layers, 1024x1024)".into());
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

/// Phase 5: Set orbital camera azimuth (horizontal orbit), degrees [0–360).
#[wasm_bindgen]
pub fn set_azimuth(degrees: f32) {
    unsafe {
        if let Some(ref mut app) = APP {
            app.camera.set_azimuth(degrees);
            app.mesh_dirty = true;
        }
    }
}

/// Phase 5: Set orbital camera elevation (vertical angle), degrees [10–80].
#[wasm_bindgen]
pub fn set_elevation(degrees: f32) {
    unsafe {
        if let Some(ref mut app) = APP {
            app.camera.set_elevation(degrees);
            app.mesh_dirty = true;
        }
    }
}

/// Phase 5: Set orbital camera distance from focus, tile units [2–100].
#[wasm_bindgen]
pub fn set_distance(dist: f32) {
    unsafe {
        if let Some(ref mut app) = APP {
            app.camera.set_distance(dist);
            app.mesh_dirty = true;
        }
    }
}

/// Get engine stats as a JSON string (FPS, tick count, game time).
#[wasm_bindgen]
pub fn get_stats() -> String {
    unsafe {
        if let Some(ref app) = APP {
            return format!(
                "{{\"fps\":{},\"ticks\":{},\"game_time\":{:.1},\"zoom\":{:.2}}}",
                app.current_fps,
                app.game_loop.state.tick_count,
                app.game_loop.state.game_time,
                app.camera.zoom
            );
        }
    }
    String::new()
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

/// Load a map from JSON string (same format as exported by to_json()).
/// Format: {"width":64,"height":64,"tiles":[{"t":0,"e":0.0,"r":null},...]}
/// Also accepts verbose format: {"width":64,"height":64,"tiles":[{"terrain":"Grass","elevation":0.0,"resource":"Iron"},...]}
/// Returns "ok" on success or an error message.
#[wasm_bindgen]
pub fn load_map_json(json: &str) -> String {
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
                    String::from("ok")
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
                    format!("error: {}", e)
                }
            }
        } else {
            String::from("error: engine not initialized")
        }
    }
}

fn parse_map_json(json: &str) -> Result<Map, String> {
    use serde_json::Value;
    // Trim whitespace and strip BOM; use Deserializer for trailing-data tolerance
    let trimmed = json.trim().trim_start_matches('\u{feff}');
    let mut de = serde_json::Deserializer::from_str(trimmed);
    let v: Value = serde::Deserialize::deserialize(&mut de)
        .map_err(|e| format!("JSON parse error: {}", e))?;

    let width = v["width"].as_u64().ok_or("missing width")? as usize;
    let height = v["height"].as_u64().ok_or("missing height")? as usize;

    if width == 0 || width > 1024 || height == 0 || height > 1024 {
        return Err(format!("invalid dimensions: {}×{}", width, height));
    }

    let tiles_arr = v["tiles"].as_array().ok_or("missing tiles array")?;

    let mut map = Map::new(width, height);

    for (i, tile_val) in tiles_arr.iter().enumerate() {
        if i >= width * height {
            break;
        }
        let x = i % width;
        let y = i / width;

        // Support both Rust format ({t, e, r}) and verbose format ({terrain, elevation, resource})
        let terrain: Terrain = if let Some(t) = tile_val["t"].as_u64() {
            match t {
                0 => Terrain::Grass,
                1 => Terrain::Forest,
                2 => Terrain::Mountain,
                3 => Terrain::Water,
                4 => Terrain::DeepWater,
                5 => Terrain::Desert,
                6 => Terrain::Swamp,
                7 => Terrain::Snow,
                _ => return Err(format!("invalid terrain id {} at ({},{})", t, x, y)),
            }
        } else if let Some(tname) = tile_val["terrain"].as_str() {
            match tname {
                "Grass" => Terrain::Grass,
                "Forest" => Terrain::Forest,
                "Mountain" => Terrain::Mountain,
                "Water" => Terrain::Water,
                "DeepWater" | "Deep Water" => Terrain::DeepWater,
                "Desert" => Terrain::Desert,
                "Swamp" => Terrain::Swamp,
                "Snow" => Terrain::Snow,
                _ => return Err(format!("unknown terrain '{}' at ({},{})", tname, x, y)),
            }
        } else {
            return Err(format!("tile at ({},{}) has no terrain", x, y));
        };

        let elevation = tile_val["e"]
            .as_f64()
            .or_else(|| tile_val["elevation"].as_f64())
            .unwrap_or(0.0) as f32;

        let resource = if let Some(r) = tile_val["r"].as_str() {
            match r {
                "Iron" => Some(map::Resource::Iron),
                "Coal" => Some(map::Resource::Coal),
                "Gold" => Some(map::Resource::Gold),
                "Stone" => Some(map::Resource::Stone),
                "Sulfur" => Some(map::Resource::Sulfur),
                "Fish" => Some(map::Resource::Fish),
                "Game" => Some(map::Resource::Game),
                "Grain" => Some(map::Resource::Grain),
                _ => None,
            }
        } else if let Some(r) = tile_val["resource"].as_str() {
            match r {
                "Iron" => Some(map::Resource::Iron),
                "Coal" => Some(map::Resource::Coal),
                "Gold" => Some(map::Resource::Gold),
                "Stone" => Some(map::Resource::Stone),
                "Sulfur" => Some(map::Resource::Sulfur),
                "Fish" => Some(map::Resource::Fish),
                "Game" => Some(map::Resource::Game),
                "Grain" => Some(map::Resource::Grain),
                _ => None,
            }
        } else {
            None
        };

        let tile = map
            .get_mut(x, y)
            .ok_or(format!("out of bounds: ({},{})", x, y))?;
        tile.terrain = terrain;
        tile.elevation = elevation;
        tile.resource = resource;
    }

    Ok(map)
}

#[wasm_bindgen]
pub fn get_tile_at(x: f32, y: f32) -> String {
    unsafe {
        if let Some(ref app) = APP {
            let (wx, wy) = app.camera.screen_to_world(x, y);
            let tx = wx.floor() as isize;
            let ty = wy.floor() as isize;

            if tx >= 0 && ty >= 0 && (tx as usize) < app.map.width && (ty as usize) < app.map.height
            {
                let tile = app.map.get(tx as usize, ty as usize).unwrap();
                let terrain_name = match tile.terrain {
                    Terrain::Grass => "Grass",
                    Terrain::Forest => "Forest",
                    Terrain::Mountain => "Mountain",
                    Terrain::Water => "Water",
                    Terrain::DeepWater => "Deep Water",
                    Terrain::Desert => "Desert",
                    Terrain::Swamp => "Swamp",
                    Terrain::Snow => "Snow",
                };
                let resource = match tile.resource {
                    Some(map::Resource::Iron) => "\"Iron\"",
                    Some(map::Resource::Coal) => "\"Coal\"",
                    Some(map::Resource::Gold) => "\"Gold\"",
                    Some(map::Resource::Stone) => "\"Stone\"",
                    Some(map::Resource::Sulfur) => "\"Sulfur\"",
                    Some(map::Resource::Fish) => "\"Fish\"",
                    Some(map::Resource::Game) => "\"Game\"",
                    Some(map::Resource::Grain) => "\"Grain\"",
                    None => "null",
                };
                return format!(
                    "{{\"x\":{},\"y\":{},\"terrain\":\"{}\",\"elevation\":{:.2},\"resource\":{}}}",
                    tx, ty, terrain_name, tile.elevation, resource
                );
            }
        }
    }
    String::new()
}

/// Get resource counts as a JSON string for the HUD.
/// Returns: {"Wood":100,"Stone":50,"Iron":0,"Coal":0,"Gold":0,"Grain":0,"Planks":0,...}
#[wasm_bindgen]
pub fn get_resource_counts() -> String {
    unsafe {
        if let Some(ref app) = APP {
            let storage = &app.game_loop.state.economy.storage;
            use crate::economy::ResourceType;
            let mut parts = Vec::new();
            for i in 0..ResourceType::COUNT {
                let rt = std::mem::transmute::<u8, ResourceType>(i as u8);
                parts.push(format!("\"{}\":{}", rt.name(), storage.get(rt)));
            }
            return format!("{{{}}}", parts.join(","));
        }
    }
    String::new()
}

/// Get tool counts as a JSON string for the HUD.
/// Returns: {"Hammer":3,"Pickaxe":0,"Axe":2,...} — all 11 tool types.
#[wasm_bindgen]
pub fn get_tool_counts() -> String {
    unsafe {
        if let Some(ref app) = APP {
            let economy = &app.game_loop.state.economy;
            let mut parts = Vec::new();
            for code in 0..=10u8 {
                let count = economy.get_tool_count(code);
                let name = crate::economy::tool_code_to_name(code);
                parts.push(format!("\"{}\":{}", name, count));
            }
            return format!("{{{}}}", parts.join(","));
        }
    }
    String::new()
}

/// Set the player's nation for the current game.
/// Returns true if the nation name was recognized and applied.
#[wasm_bindgen]
pub fn set_player_nation(nation_name: &str) -> bool {
    use crate::nation::{NationType, Nation};
    if let Some(nation_type) = NationType::from_name(nation_name) {
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

/// Get the player's nation as a JSON string {name, color, emoji, description}
/// Returns empty string if no nation is set.
#[wasm_bindgen]
pub fn get_player_nation() -> String {
    unsafe {
        if let Some(ref app) = APP {
            if let Some(nation) = app.game_loop.state.player_nation {
                return format!(
                    "{{\"name\":\"{}\",\"color\":\"{}\",\"emoji\":\"{}\",\"description\":\"{}\"}}",
                    nation.name(),
                    nation.color_hex(),
                    nation.emoji(),
                    nation.description()
                );
            }
        }
    }
    String::new()
}

/// List all available nation types as a JSON array.
#[wasm_bindgen]
pub fn list_nations() -> String {
    use crate::nation::NationType;
    let nations: Vec<String> = NationType::all_names().iter().map(|name| {
        if let Some(nt) = NationType::from_name(name) {
            format!("{{\"name\":\"{}\",\"color\":\"{}\",\"emoji\":\"{}\",\"description\":\"{}\"}}",
                nt.name(), nt.color_hex(), nt.emoji(), nt.description())
        } else {
            String::new()
        }
    }).collect();
    format!("[{}]", nations.join(","))
}
/// Get unique building names for a nation as JSON array.
#[wasm_bindgen]
pub fn get_nation_buildings(nation_name: &str) -> String {
    use crate::nation;
    let names = nation::get_nation_buildings(nation_name);
    let quoted: Vec<String> = names.iter().map(|n| format!("\"{}\"", n)).collect();
    format!("[{}]", quoted.join(","))
}

/// Get territory border tiles for the local player as a JSON string.
/// Returns: [{"x":5,"y":10}, ...] — tiles at the edge of player 0's territory.
#[wasm_bindgen]
pub fn get_territory_border_tiles_json() -> String {
    unsafe {
        if let Some(ref app) = APP {
            let border_tiles = app.game_loop.state.map.get_territory_border_tiles(0);
            let parts: Vec<String> = border_tiles
                .iter()
                .map(|&(x, y)| format!("{{\"x\":{},\"y\":{}}}", x, y))
                .collect();
            return format!("[{}]", parts.join(","));
        }
    }
    String::new()
}

/// Check if a building type is available for a given nation.
/// Returns "true" or "false".
#[wasm_bindgen]
pub fn is_building_available_for_nation(building_name: &str, nation_name: &str) -> String {
    let kind = match crate::economy::BuildingType::from_name(building_name) {
        Some(k) => k,
        None => return String::from("false"),
    };
    let nation = match crate::nation::NationType::from_name(nation_name) {
        Some(n) => n,
        None => return String::from("false"),
    };
    if let Some(required) = kind.nation_for_building() {
        if required == nation {
            String::from("true")
        } else {
            String::from("false")
        }
    } else {
        String::from("true") // common building
    }
}

/// Get building summary as a JSON string for the HUD.
/// Returns: [{"type":"Farm","x":3,"y":3,"complete":true,"settlers":1,"owner_id":0,"garrison":0,"max_garrison":0},...]
#[wasm_bindgen]
pub fn get_building_summary() -> String {
    unsafe {
        if let Some(ref app) = APP {
            let mut parts = Vec::new();
            for b in app.game_loop.state.economy.buildings.iter() {
                parts.push(format!(
                    "{{\"type\":\"{}\",\"x\":{},\"y\":{},\"complete\":{},\"settlers\":{},\"owner_id\":{},\"garrison\":{},\"max_garrison\":{}}}",
                    b.kind.name(),
                    b.x,
                    b.y,
                    b.is_complete(),
                    b.assigned_settlers.len(),
                    b.owner_id,
                    b.garrison.len(),
                    b.max_garrison
                ));
            }
            return format!("[{}]", parts.join(","));
        }
    }
    String::new()
}

/// Get unit summary as a JSON string for the HUD.
/// Returns: [{"id":1,"kind":"Settler","x":3.5,"y":3.5,"hp":50,"max_hp":50,"state":"Working"},...]
#[wasm_bindgen]
pub fn get_unit_summary() -> String {
    unsafe {
        if let Some(ref app) = APP {
            let mut parts = Vec::new();
            for u in app.game_loop.state.economy.units.alive_units() {
                let stance_name = u.stance.as_str();
                let state_name = match u.state {
                    crate::units::UnitState::Idle => "Idle",
                    crate::units::UnitState::Moving => "Moving",
                    crate::units::UnitState::Working => "Working",
                    crate::units::UnitState::Fighting => "Fighting",
                    crate::units::UnitState::Patrolling => "Patrolling",
                    crate::units::UnitState::FormationMove => "FormationMove",
                    crate::units::UnitState::Dying => "Dying",
                    crate::units::UnitState::Dead => "Dead",
                };
                let tool_code = u.carried_tool.map(|tc| {
                    use crate::economy::tool_code_to_name;
                    tool_code_to_name(tc)
                }).unwrap_or("");
                parts.push(format!(
                    "{{\"id\":{},\"kind\":\"{}\",\"x\":{:.1},\"y\":{:.1},\"hp\":{},\"max_hp\":{},\"state\":\"{}\",\"stance\":\"{}\",\"carried_tool\":\"{}\"}}",
                    u.id,
                    u.kind.name(),
                    u.x,
                    u.y,
                    u.hp,
                    u.max_hp,
                    state_name,
                    stance_name,
                    tool_code
                ));
            }
            return format!("[{}]", parts.join(","));
        }
    }
    String::new()
}

/// Get military units within a world-coordinate rectangle.
/// Returns JSON array of unit IDs for Swordsman and Bowman within [min_x, max_x] x [min_y, max_y].
/// Used for Shift+drag marquee selection in the UI.
/// Returns: [{"id":1,"kind":"Swordsman","x":3.5,"y":4.0,"hp":100,"state":"Idle"},...]
#[wasm_bindgen]
pub fn get_units_in_rect(min_x: f32, min_y: f32, max_x: f32, max_y: f32) -> String {
    unsafe {
        if let Some(ref app) = APP {
            let mut parts = Vec::new();
            for u in app.game_loop.state.economy.units.alive_units() {
                // Only select military units (not settlers)
                if !u.kind.can_fight() {
                    continue;
                }
                if u.x >= min_x && u.x <= max_x && u.y >= min_y && u.y <= max_y {
                    let stance_name = u.stance.as_str();
                let state_name = match u.state {
                        crate::units::UnitState::Idle => "Idle",
                        crate::units::UnitState::Moving => "Moving",
                        crate::units::UnitState::Working => "Working",
                        crate::units::UnitState::Fighting => "Fighting",
                        crate::units::UnitState::Patrolling => "Patrolling",
                    crate::units::UnitState::FormationMove => "FormationMove",
                        crate::units::UnitState::Dying => "Dying",
                        crate::units::UnitState::Dead => "Dead",
                    };
                    parts.push(format!(
                        r#"{{"id":{},"kind":"{}","x":{:.1},"y":{:.1},"hp":{},"max_hp":{},"state":"{}","stance":"{}"}}"#,
                        u.id, u.kind.name(), u.x, u.y, u.hp,
                    u.max_hp, state_name, stance_name
                    ));
                }
            }
            return format!("[{}]", parts.join(","));
        }
    }
    "[]".to_string()
}

/// Order a set of units to move to a target tile.
/// unit_ids_json: JSON array of unit IDs, e.g. "[1,2,3]"
/// target_x, target_y: destination tile coordinates
/// Returns: number of units successfully ordered to move
#[wasm_bindgen]
pub fn move_units_to_tile(unit_ids_json: &str, target_x: usize, target_y: usize) -> u32 {
    unsafe {
        if let Some(ref mut app) = APP {
            let unit_ids: Vec<u32> = serde_json::from_str(unit_ids_json).unwrap_or_default();
            app.game_loop.state.economy.units.move_units_to(
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

/// Order a set of units to patrol to a target tile.
/// unit_ids_json: JSON array of unit IDs, e.g. "[1,2,3]"
/// target_x, target_y: destination tile coordinates for patrol
/// Returns: number of units successfully ordered to patrol
#[wasm_bindgen]
pub fn order_patrol(unit_ids_json: &str, target_x: usize, target_y: usize) -> u32 {
    unsafe {
        if let Some(ref mut app) = APP {
            let unit_ids: Vec<u32> = serde_json::from_str(unit_ids_json).unwrap_or_default();
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
/// unit_ids_json: JSON array of unit IDs, e.g. [1,2,3]
/// Returns the number of units successfully ordered to move.
#[wasm_bindgen]
pub fn formation_move(unit_ids_json: &str, target_x: usize, target_y: usize) -> u32 {
    unsafe {
        if let Some(ref mut app) = APP {
            let unit_ids: Vec<u32> = serde_json::from_str(unit_ids_json).unwrap_or_default();
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
pub fn get_building_info(idx: usize) -> String {
    use crate::economy::ResourceType;
    unsafe {
        if let Some(ref app) = APP {
            let economy = &app.game_loop.state.economy;
            if let Some(b) = economy.buildings.get(idx) {
                let kind = b.kind;
                let settler_ids: Vec<String> =
                    b.assigned_settlers.iter().map(|w| w.to_string()).collect();
                let inputs: Vec<String> = kind
                    .inputs()
                    .iter()
                    .map(|(rt, amt)| format!(r#""{}",{}"#, rt.name(), amt))
                    .collect();
                let outputs: Vec<String> = kind
                    .outputs()
                    .iter()
                    .map(|(rt, amt)| format!(r#""{}",{}"#, rt.name(), amt))
                    .collect();
                let construction_pct = b.construction; // duplicate for JS clarity

                // Output buffer summary (non-zero entries only)
                let mut obuf_parts = Vec::new();
                for i in 0..ResourceType::COUNT {
                    let val = b.output_buffer[i];
                    if val > 0 {
                        let rt = std::mem::transmute::<u8, ResourceType>(i as u8);
                        obuf_parts.push(format!(r#""{}":{}"#, rt.name(), val));
                    }
                }
            // Toolsmith: report currently-producing tool
            use crate::economy::{tool_code_to_name, BuildingType};
            let producing_tool: Option<String> =
                if kind == BuildingType::Toolsmith && b.is_complete() {
                    let tool_code = economy.most_needed_tool().unwrap_or(0);
                    Some(format!(r##","producing_tool":"{}""##, tool_code_to_name(tool_code)))
                } else {
                    None
                };

                return format!(
                    r#"{{"kind":"{}","x":{},"y":{},"construction":{},"constructed_pct":{},"complete":{},"active":{},"settlers":[{}],"max_settlers":{},"build_ticks":{},"production_interval":{},"inputs":[{}],"outputs":[{}],"output_buffer":{{{}}},"destruction_progress":{}{}"#,
                    kind.name(),
                    b.x,
                    b.y,
                    b.construction,
                    construction_pct,
                    b.is_complete(),
                    b.active,
                    settler_ids.join(","),
                    b.max_settlers,
                    kind.build_time(),
                    kind.production_interval(),
                    inputs.join(","),
                    outputs.join(","),
                    obuf_parts.join(","),
                    b.destruction_progress().unwrap_or(-1.0),
                    producing_tool.unwrap_or_default(),
                );
            }
        }
    }
    format!(r#"{{"error":"Building at index {} not found"}}"#, idx)
}

/// Get detailed unit info by ID.
/// Returns JSON: {"id":1,"kind":"Settler","x":5.5,"y":3.0,"hp":50,"max_hp":50,
///   "state":"Working","assigned_building":2,"target":null}
/// or {"error":"Unit not found"}
#[wasm_bindgen]
pub fn get_unit_info(id: u32) -> String {
    unsafe {
        if let Some(ref app) = APP {
            let units = &app.game_loop.state.economy.units;
            if let Some(u) = units.get(id) {
                if u.state == crate::units::UnitState::Dead {
                    return format!(r#"{{"error":"Unit {} is dead"}}"#, id);
                }
                let stance_name = u.stance.as_str();
                let state_name = match u.state {
                    crate::units::UnitState::Idle => "Idle",
                    crate::units::UnitState::Moving => "Moving",
                    crate::units::UnitState::Working => "Working",
                    crate::units::UnitState::Fighting => "Fighting",
                    crate::units::UnitState::Patrolling => "Patrolling",
                    crate::units::UnitState::FormationMove => "FormationMove",
                    crate::units::UnitState::Dying => "Dying",
                    crate::units::UnitState::Dead => "Dead",
                };
                let ab = match u.assigned_building {
                    Some(bi) => bi.to_string(),
                    None => "null".to_string(),
                };
                let target = match u.target {
                    Some(tid) => tid.to_string(),
                    None => "null".to_string(),
                };
                let tool_name = u.carried_tool
                    .map(|tc| crate::economy::tool_code_to_name(tc))
                    .unwrap_or("");
                let dying_progress = u.death_animation_progress()
                    .map(|p| format!("{:.2}", p))
                    .unwrap_or_else(|| "null".to_string());
                return format!(
                    r#"{{"id":{},"kind":"{}","x":{:.1},"y":{:.1},"hp":{},"max_hp":{},"state":"{}","stance":"{}","dying_progress":{},"assigned_building":{},"target":{},"carried_tool":"{}"}}"#,
                    u.id,
                    u.kind.name(),
                    u.x,
                    u.y,
                    u.hp,
                    u.max_hp,
                    state_name,
                    stance_name,
                    dying_progress,
                    ab,
                    target,
                    tool_name,
                );
            }
        }
    }
    format!(r#"{{"error":"Unit {} not found"}}"#, id)
}

/// Set the combat stance for a single unit.
/// stance: 0=Aggressive, 1=StandGround, 2=Passive
/// Returns true if the unit was found and stance was set.
#[wasm_bindgen]
pub fn set_unit_stance(unit_id: u32, stance: u8) -> bool {
    use crate::units::UnitStance;
    unsafe {
        if let Some(ref mut app) = APP {
            if let Some(unit) = app.game_loop.state.economy.units.get_mut(unit_id) {
                if unit.is_alive() && unit.kind.can_fight() {
                    unit.stance = UnitStance::from_u8(stance);
                    return true;
                }
            }
        }
    }
    false
}

/// Set the combat stance for multiple units (batch).
/// unit_ids_json: JSON array of unit IDs, e.g. "[1,2,3]"
/// stance: 0=Aggressive, 1=StandGround, 2=Passive
/// Returns the number of units whose stance was successfully set.
#[wasm_bindgen]
pub fn set_units_stance(unit_ids_json: &str, stance: u8) -> u32 {
    use crate::units::UnitStance;
    unsafe {
        if let Some(ref mut app) = APP {
            let unit_ids: Vec<u32> = serde_json::from_str(unit_ids_json).unwrap_or_default();
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

/// Try to place a building on the map.
/// Takes building type name (e.g. "Farm"), tile x, tile y.
/// Returns JSON: {"ok":true,"idx":0} or {"error":"message"}
#[wasm_bindgen]
pub fn try_place_building(kind_name: &str, x: usize, y: usize) -> String {
    use crate::economy::BuildingType;
    unsafe {
        if let Some(ref mut app) = APP {
            // Parse building type name
            let kind = match BuildingType::from_name(kind_name) {
                Some(k) => k,
                None => return format!(r#"{{"error":"Unknown building type: {}"}}"#, kind_name),
            };

            // Validate tile is within map bounds
            if x >= app.map.width || y >= app.map.height {
                return format!(r#"{{"error":"Tile ({},{}) out of bounds"}}"#, x, y);
            }

            // Validate terrain is buildable (not water, deep water, or mountain)
            let tile = app.map.get(x, y).unwrap();
            let buildable = match tile.terrain {
                Terrain::Water | Terrain::DeepWater | Terrain::Mountain => false,
                _ => true,
            };
            if !buildable {
                return format!(
                    r#"{{"error":"Cannot build on {} terrain at ({},{})"}}"#,
                    match tile.terrain {
                        Terrain::Water => "water",
                        Terrain::DeepWater => "deep water",
                        Terrain::Mountain => "mountain",
                        _ => "unbuildable",
                    },
                    x,
                    y
                );
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
                return format!(r#"{{"error":"Tile ({},{}) already has a building"}}"#, x, y);
            }

            // Try to place the building
            match app.game_loop.state.economy.try_place_building(kind, x, y) {
                Some(idx) => {
                    app.overlay_dirty = true;
                    return format!(r#"{{"ok":true,"idx":{},"kind":"{}"}}"#, idx, kind.name());
                }
                None => {
                    return format!(
                        r#"{{"error":"Cannot afford {} — insufficient resources"}}"#,
                        kind.name()
                    );
                }
            }
        }
    }
    format!(r#"{{"error":"Engine not initialized"}}"#)
}

/// Get build cost for a building type. Returns JSON: {"Wood":3} or {"error":"..."}
#[wasm_bindgen]
pub fn get_build_cost(kind_name: &str) -> String {
    use crate::economy::BuildingType;
    let kind = match BuildingType::from_name(kind_name) {
        Some(k) => k,
        None => return format!(r#"{{"error":"Unknown building type: {}"}}"#, kind_name),
    };
    let cost = kind.build_cost();
    let mut parts = Vec::new();
    for &(rt, amt) in cost.iter() {
        parts.push(format!(r#""{}":{}"#, rt.name(), amt));
    }
    format!("{{{}}}", parts.join(","))
}

/// Get a list of all building types as JSON.
/// Returns: ["Castle","Farm","Sawmill",...]
#[wasm_bindgen]
pub fn list_building_types() -> String {
    use crate::economy::BuildingType;
    let names: Vec<&str> = BuildingType::all_names();
    let quoted: Vec<String> = names.iter().map(|n| format!(r#""{}""#, n)).collect();
    format!("[{}]", quoted.join(","))
}

// ── WebSocket Client API ─────────────────────────────────────────────────────

/// Connect to a game server via WebSocket.
/// Returns true if connection was initiated.
#[wasm_bindgen]
pub fn ws_connect(_url: &str) -> bool {
    // TODO: integrate with JS WebSocket — currently a stub
    false
}

/// Send a network message (JSON string) to the server.
#[wasm_bindgen]
pub fn ws_send(_json: &str) {
    // TODO: integrate with JS WebSocket — currently a stub
    // In multiplayer, JS would send this to the server
}

/// Receive pending network messages as JSON strings.
/// Returns a JSON array of messages.
#[wasm_bindgen]
pub fn ws_receive() -> String {
    // Stub — in the browser, JS would inject messages from the server
    String::from("[]")
}

/// Get the current network connection state as a string.
#[wasm_bindgen]
pub fn ws_state() -> String {
    String::from("disconnected")
}

/// Set the game speed multiplier (1.0 = normal, 2.0 = double, 4.0 = quadruple).
#[wasm_bindgen]
pub fn set_game_speed(multiplier: f64) {
    unsafe {
        if let Some(ref mut app) = APP {
            app.speed_multiplier = multiplier.clamp(0.25, 8.0);
        }
    }
}

/// Get the current game speed multiplier.
#[wasm_bindgen]
pub fn get_game_speed() -> f64 {
    unsafe {
        if let Some(ref app) = APP {
            app.speed_multiplier
        } else {
            1.0
        }
    }
}

/// Set the game pause state.
#[wasm_bindgen]
pub fn set_paused(paused: bool) {
    unsafe {
        if let Some(ref mut app) = APP {
            app.paused = paused;
        }
    }
}

/// Get camera state for minimap viewport calculation.
/// Returns JSON: {"center_x":10.5,"center_y":12.3,"zoom":1.0,"vp_w":1280,"vp_h":720}
#[wasm_bindgen]
pub fn get_camera_state() -> String {
    unsafe {
        if let Some(ref app) = APP {
            return format!(
                r#"{{"center_x":{:.2},"center_y":{:.2},"zoom":{:.2},"vp_w":{},"vp_h":{}}}"#,
                app.camera.center_x,
                app.camera.center_y,
                app.camera.zoom,
                app.camera.viewport_width,
                app.camera.viewport_height,
            );
        }
    }
    String::new()
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

/// Generate a procedural map and return it as a JSON string.
/// map_type: "demo" (currently only one type supported; future: "island", "continents", etc.)
/// width/height: map dimensions (clamped to 16..1024)
/// Returns JSON in the format expected by load_map_json().
#[wasm_bindgen]
pub fn generate_map(map_type: &str, width: u32, height: u32) -> String {
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
    map.to_json()
}

/// Apply starting resources based on difficulty level.
/// Should be called AFTER load_map_json() to seed the new game state.
/// difficulty: "easy" (2× resources), "medium" (1×), "hard" (0.5×)
/// Returns "ok" on success or an error message.
#[wasm_bindgen]
pub fn add_starting_resources(difficulty: &str) -> String {
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
            String::from("ok")
        } else {
            String::from("error: engine not initialized")
        }
    }
}

/// Place a free Castle near map center and spawn starter settlers.
/// Called after load_map_json() + add_starting_resources() to set up the initial base.
/// settler_count: number of idle settlers to spawn (clamped to 1..8).
/// Returns JSON: {"ok":true,"hq_x":N,"hq_y":N,"settlers":N} or {"error":"..."}
#[wasm_bindgen]
pub fn setup_starter_base(settler_count: u32) -> String {
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
            format!(
                r#"{{"ok":true,"hq_x":{},"hq_y":{},"settlers":{}}}"#,
                hq_x, hq_y, count
            )
        } else {
            String::from(r#"{"error":"Engine not initialized"}"#)
        }
    }
}

/// Get the complete game state as a JSON string for save/load.
/// Returns JSON with: map_json, resources, buildings, units, game_time, player_name, difficulty, map_type
#[wasm_bindgen]
pub fn get_game_state() -> String {
    use crate::economy::ResourceType;
    unsafe {
        if let Some(ref app) = APP {
            let eco = &app.game_loop.state.economy;
            let game_time = app.game_loop.state.game_time;
            let map_json = app.map.to_json();

            // Resources
            let mut res_parts = Vec::new();
            for i in 0..ResourceType::COUNT {
                let rt = std::mem::transmute::<u8, ResourceType>(i as u8);
                res_parts.push(format!("\"{}\":{}", rt.name(), eco.storage.get(rt)));
            }

            // Buildings
            let mut bldg_parts = Vec::new();
            for b in eco.buildings.iter() {
                let settler_ids: Vec<String> =
                    b.assigned_settlers.iter().map(|w| w.to_string()).collect();
                let mut inbuf_parts = Vec::new();
                for i in 0..ResourceType::COUNT {
                    if b.input_buffer[i] > 0 {
                        let rt = std::mem::transmute::<u8, ResourceType>(i as u8);
                        inbuf_parts.push(format!("\"{}\":{}", rt.name(), b.input_buffer[i]));
                    }
                }
                let mut outbuf_parts = Vec::new();
                for i in 0..ResourceType::COUNT {
                    if b.output_buffer[i] > 0 {
                        let rt = std::mem::transmute::<u8, ResourceType>(i as u8);
                        outbuf_parts.push(format!("\"{}\":{}", rt.name(), b.output_buffer[i]));
                    }
                }
                bldg_parts.push(format!(
                    r#"{{"kind":"{}","x":{},"y":{},"construction":{},"active":{},"production_counter":{},"assigned_settlers":[{}],"max_settlers":{},"input_buffer":{{{}}},"output_buffer":{{{}}}}}"#,
                    b.kind.name(), b.x, b.y, b.construction, b.active, b.production_counter,
                    settler_ids.join(","), b.max_settlers,
                    inbuf_parts.join(","), outbuf_parts.join(",")
                ));
            }

            // Units
            let mut unit_parts = Vec::new();
            for u in eco.units.alive_units() {
                let stance_name = u.stance.as_str();
                let state_name = match u.state {
                    crate::units::UnitState::Idle => "Idle",
                    crate::units::UnitState::Moving => "Moving",
                    crate::units::UnitState::Working => "Working",
                    crate::units::UnitState::Fighting => "Fighting",
                        crate::units::UnitState::Patrolling => "Patrolling",
                    crate::units::UnitState::FormationMove => "FormationMove",
                    crate::units::UnitState::Dying => "Dying",
                    crate::units::UnitState::Dead => "Dead",
                };
                let ab = match u.assigned_building {
                    Some(bi) => bi.to_string(),
                    None => "null".to_string(),
                };
                let tgt = match u.target {
                    Some(tid) => tid.to_string(),
                    None => "null".to_string(),
                };
                unit_parts.push(format!(
                    r#"{{"id":{},"kind":"{}","x":{},"y":{},"hp":{},"max_hp":{},"state":"{}","stance":"{}","assigned_building":{},"target":{}}}"#,
                    u.id, u.kind.name(), u.x, u.y, u.hp,
                    u.max_hp, state_name, stance_name, ab, tgt
                ));
            }

            return format!(
                r#"{{"version":1,"game_time":{},"map_json":{},"resources":{{{}}},"buildings":[{}],"units":[{}]}}"#,
                game_time,
                map_json,
                res_parts.join(","),
                bldg_parts.join(","),
                unit_parts.join(",")
            );
        }
    }
    String::from(r#"{"error":"engine not initialized"}"#)
}

/// Restore game state from a JSON save string (produced by get_game_state).
/// Returns "ok" on success or an error message.
#[wasm_bindgen]
pub fn restore_game_state(json: &str) -> String {
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
                            .find(|c: char| c == ',' || c == '}' || c == ']')
                            .unwrap_or(after_key.len());
                        Some(&after_key[..end])
                    }
                }
            }

            // 1. Load map
            let map_json_val = match find_json_value(json, "map_json") {
                Some(v) => v,
                None => return String::from("error: missing map_json"),
            };
            let map_load = crate::load_map_json(map_json_val);
            if map_load != "ok" {
                return format!("error: map load failed: {}", map_load);
            }

            // 2. Clear existing economy and rebuild
            let mut new_eco = Economy::new();

            // 3. Restore resources
            let resources_str = match find_json_value(json, "resources") {
                Some(v) => v,
                None => return String::from("error: missing resources"),
            };
            for i in 0..ResourceType::COUNT {
                let rt: ResourceType = std::mem::transmute(i as u8);
                let name = rt.name();
                // Find "{name}":number in resources string
                let search = format!("\"{}\":", name);
                if let Some(pos) = resources_str.find(&search) {
                    let after = &resources_str[pos + search.len()..];
                    let end = after
                        .find(|c: char| c == ',' || c == '}')
                        .unwrap_or(after.len());
                    if let Ok(val) = after[..end].trim().parse::<u32>() {
                        new_eco.storage.set(rt, val);
                    }
                }
            }

            // 4. Restore buildings
            let buildings_str = match find_json_value(json, "buildings") {
                Some(v) => v,
                None => return String::from("error: missing buildings"),
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
                    let active = find_json_value(bjson, "active").map_or(false, |v| v == "true");
                    let production_counter = find_json_value(bjson, "production_counter")
                        .and_then(|v| v.parse::<u32>().ok())
                        .unwrap_or(0);
                    let max_settlers = find_json_value(bjson, "max_settlers")
                        .and_then(|v| v.parse::<u32>().ok())
                        .unwrap_or(0);

                    if let Some(kind) = BuildingType::from_name(kind_name) {
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
                                let rt: ResourceType = std::mem::transmute(i as u8);
                                let search = format!("\"{}\":", rt.name());
                                if let Some(pos) = inbuf_str.find(&search) {
                                    let after = &inbuf_str[pos + search.len()..];
                                    let end = after
                                        .find(|c: char| c == ',' || c == '}')
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
                                let rt: ResourceType = std::mem::transmute(i as u8);
                                let search = format!("\"{}\":", rt.name());
                                if let Some(pos) = outbuf_str.find(&search) {
                                    let after = &outbuf_str[pos + search.len()..];
                                    let end = after
                                        .find(|c: char| c == ',' || c == '}')
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
                None => return String::from("error: missing units"),
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
                    let kind_name = find_json_value(ujson, "kind").unwrap_or("Settler");
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

                    let kind = match kind_name {
                        "Soldier" => UnitKind::Swordsman,
                        "Archer" => UnitKind::Bowman,
                        _ => UnitKind::Settler,
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

            return String::from("ok");
        }
    }
    String::from("error: engine not initialized")
}

/// Load a model from a JSON mesh string, validate it, and upload to GPU buffers.
/// Returns "ok:{name}:{indices}tri" if successful, or "error:{message}" on failure.
#[wasm_bindgen]
pub fn load_model_json(name: &str, json_str: &str) -> String {
    let mesh = match model::parse_json_mesh(json_str) {
        Ok(m) => m,
        Err(e) => return format!("error:{}", e),
    };
    if mesh.is_empty() {
        return format!("error:empty mesh");
    }
    let tri_count = mesh.triangle_count;
    unsafe {
        if let Some(ref mut app) = APP.as_mut() {
            app.upload_model_to_gpu(name, &mesh);
        }
    }
    format!("ok:{}:{}tri", name, tri_count)
}

/// Parse an OBJ model string and return vertex count, triangle count, and AABB as JSON.
#[wasm_bindgen]
pub fn parse_obj_info(obj_str: &str) -> String {
    let mesh = model::parse_obj(obj_str);
    if mesh.is_empty() {
        return String::from("{\"error\":\"empty mesh\"}");
    }
    format!(
        "{{\"vertices\":{},\"triangles\":{},\"aabb\":[{},{},{},{},{},{}]}}",
        mesh.vertex_count,
        mesh.triangle_count,
        mesh.aabb.0, mesh.aabb.1, mesh.aabb.2,
        mesh.aabb.3, mesh.aabb.4, mesh.aabb.5,
    )
}

/// Compute a model-view-projection matrix for a model instance.
/// Takes JSON input: {x, y, scale, rotation_y, view: [16], projection: [16]}
/// Returns JSON array of 16 floats (column-major MVP matrix).
#[wasm_bindgen]
pub fn compute_mvp_json(input_json: &str) -> String {
    #[derive(serde::Deserialize)]
    struct MvpInput {
        x: f32,
        y: f32,
        scale: f32,
        rotation_y: f32,
        view: [f32; 16],
        projection: [f32; 16],
    }

    let input: MvpInput = match serde_json::from_str(input_json) {
        Ok(v) => v,
        Err(e) => return format!("{{\"error\":\"{}\"}}", e),
    };

    let instance = model::ModelInstance::new("", input.x, input.y)
        .with_scale(input.scale)
        .with_rotation_y(input.rotation_y);

    let mvp = model::compute_mvp(&instance, &input.view, &input.projection);
    serde_json::to_string(&mvp.to_vec()).unwrap_or_else(|_| String::from("{\"error\":\"serialize failed\"}"))
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
pub fn add_model_instance(model_id: &str, x: f32, y: f32, scale: f32, rotation_y: f32) -> bool {
    unsafe {
        if let Some(ref mut app) = APP.as_mut() {
            let inst = model::ModelInstance::new(model_id, x, y)
                .with_scale(scale)
                .with_rotation_y(rotation_y);
            app.model_instances.push(inst);
            return true;
        }
    }
    false
}

/// Clear all model instances (called at start of each frame).
#[wasm_bindgen]
pub fn clear_model_instances() {
    unsafe {
        if let Some(ref mut app) = APP.as_mut() {
            app.model_instances.clear();
        }
    }
}

/// Populate model_instances from current game state (buildings).
/// Maps building types to model IDs. Called from JS each frame before render().
#[wasm_bindgen]
pub fn populate_model_instances_from_game() -> i32 {
    unsafe {
        if let Some(ref mut app) = APP.as_mut() {
            app.populate_model_instances_from_game_state()
        } else {
            0
        }
    }
}

impl App {
    /// Map a unit kind to a 3D model ID.
    fn model_id_for_unit(kind: units::UnitKind) -> &'static str {
        match kind {
            units::UnitKind::Settler => "worker",
            units::UnitKind::Swordsman => "soldier",
            units::UnitKind::Bowman => "archer",
            _ => "worker",
        }
    }

    /// Map a building type name to a 3D model ID.
    fn model_id_for_building(kind_name: &str) -> &'static str {
        match kind_name {
            "Sawmill" => "sawmill",
            "Mine" => "mine",
            "Bakery" => "bakery",
            "Butcher" => "butcher",
            "Farm" => "farm",
            "Fisherman" => "fishery",
            "Woodcutter" => "lumberjack",
            "Castle" => "headquarters",
            "Armory" => "armory",
            "Blacksmith" => "blacksmith",
            "Mill" => "mill",
            "Toolsmith" => "toolsmith",
            "Weaponsmith" => "weaponsmith",
            "Stonecutter" => "stonecutter",
            "Storehouse" => "storehouse",
            "Waterworks" => "waterworks",
            "Smelter" => "smelter",
            "Barracks" => "barracks",
            "Guard Tower" => "guardtower",
            "Fortress" => "fortress",
            "Siege Workshop" => "siegeworkshop",
            "Shipyard" => "shipyard",
            "Road Layer" => "roadlayer",
            "Apiary" => "apiary",
            "Mead Maker" => "meadmaker",
            // Roman unique
            "Wine Press" => "winepress",
            "Temple of Bacchus" => "templeofbacchus",
            "Colosseum" => "colosseum",
            "Sanctuary of Minerva" => "sanctuaryofminerva",
            "Sanctuary of Vulcan" => "sanctuaryofvulcan",
            // Viking unique
            "Mead Hall" => "meadhall",
            "Sanctuary of Odin" => "sanctuaryofodin",
            "Sanctuary of Thor" => "sanctuaryofthor",
            "Sanctuary of Freya" => "sanctuaryoffreya",
            "Runestone" => "runestone",
            // Maya unique
            "Temple of Chac" => "templeofchac",
            "Agave Farm" => "agavefarm",
            "Distillery" => "distillery",
            "Sanctuary of Kukulkan" => "sanctuaryofkukulkan",
            "Sanctuary of Quetzalcoatl" => "sanctuaryofquetzalcoatl",
            "Sanctuary of Huitzilopochtli" => "sanctuaryofhuitzilopochtli",
            "Observatory" => "observatory",
            // Trojan unique
            "Oracle of Apollo" => "oracleofapollo",
            "Olive Grove" => "olivegrove",
            "Oil Press" => "oilpress",
            "Sanctuary of Artemis" => "sanctuaryofartemis",
            "Sanctuary of Poseidon" => "sanctuaryofposeidon",
            "Sanctuary of Apollo" => "sanctuaryofapollo",
            "Amphitheater" => "amphitheater",
            // Dark Tribe unique
            "Dark Temple" => "darktemple",
            "Dark Garden" => "darkgarden",
            "Mushroom Farm" => "mushroomfarm",
            "Sanctuary of Morbus" => "sanctuaryofmorbus",
            "Sanctuary of Pestilence" => "sanctuaryofpestilence",
            "Dark Fortress" => "darkfortress",
            "Demon Gate" => "demongate",
            _ => "construction",
        }
    }

    /// Compute a smooth scale factor from construction progress.
    /// Returns 0.3 at construction=0.0, easing up to 1.0 at construction=1.0.
    /// Uses ease-out curve (1 - (1-t)^2) for a natural "settling" feel.
    fn construction_scale(construction: f32) -> f32 {
        let t = construction.clamp(0.0, 1.0);
        let ease = 1.0 - (1.0 - t) * (1.0 - t);
        0.3 + 0.7 * ease
    }

    fn populate_model_instances_from_game_state(&mut self) -> i32 {
        self.model_instances.clear();
        let mut count = 0i32;

        // Buildings
        for b in self.game_loop.state.economy.buildings.iter() {
            let model_id = Self::model_id_for_building(b.kind.name());
            let scale = Self::construction_scale(b.construction);
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

/// Get the number of loaded model instances for this frame.
#[wasm_bindgen]
pub fn model_instance_count() -> i32 {
    unsafe {
        if let Some(ref app) = APP.as_ref() {
            app.model_instances.len() as i32
        } else {
            0
        }
    }
}

// ── Phase 6: Particle System WASM Exports ─────────────────────────────────────

/// Spawn a single particle.
/// Parameters: x, y, z, vx, vy, vz, life, r, g, b, size
#[wasm_bindgen]
pub fn spawn_particle(
    x: f32, y: f32, z: f32,
    vx: f32, vy: f32, vz: f32,
    life: f32,
    r: f32, g: f32, b: f32,
    size: f32,
) -> bool {
    unsafe {
        if let Some(ref mut app) = APP.as_mut() {
            app.particle_system.spawn(x, y, z, vx, vy, vz, life, r, g, b, size)
        } else {
            false
        }
    }
}

/// Spawn a burst of particles. Returns number spawned.
#[wasm_bindgen]
pub fn spawn_particle_burst(
    x: f32, y: f32,
    count: u32,
    r: f32, g: f32, b: f32,
    speed: f32, life: f32, size: f32,
) -> u32 {
    unsafe {
        if let Some(ref mut app) = APP.as_mut() {
            app.particle_system.spawn_burst(x, y, 0.0, count, r, g, b, speed, life, size)
        } else {
            0
        }
    }
}

/// Spawn a green "build success" effect at the given tile.
#[wasm_bindgen]
pub fn spawn_build_effect(tile_x: f32, tile_y: f32) {
    unsafe {
        if let Some(ref mut app) = APP.as_mut() {
            particle::spawn_build_effect(&mut app.particle_system, tile_x, tile_y);
        }
    }
}

/// Spawn a red/orange "combat hit" effect at the given tile.
#[wasm_bindgen]
pub fn spawn_combat_effect(tile_x: f32, tile_y: f32) {
    unsafe {
        if let Some(ref mut app) = APP.as_mut() {
            particle::spawn_combat_effect(&mut app.particle_system, tile_x, tile_y);
        }
    }
}

/// Spawn chimney smoke puffs at a building location.
#[wasm_bindgen]
pub fn spawn_smoke_effect(tile_x: f32, tile_y: f32) {
    unsafe {
        if let Some(ref mut app) = APP.as_mut() {
            particle::spawn_smoke_effect(&mut app.particle_system, tile_x, tile_y);
        }
    }
}

/// Spawn a floating leaf particle (forest ambient).
#[wasm_bindgen]
pub fn spawn_leaf_effect(tile_x: f32, tile_y: f32) {
    unsafe {
        if let Some(ref mut app) = APP.as_mut() {
            particle::spawn_leaf_effect(&mut app.particle_system, tile_x, tile_y);
        }
    }
}

/// Get the number of alive particles.
#[wasm_bindgen]
pub fn particle_count() -> i32 {
    unsafe {
        if let Some(ref app) = APP.as_ref() {
            app.particle_system.alive_count() as i32
        } else {
            0
        }
    }
}

/// Clear all particles.
#[wasm_bindgen]
pub fn clear_particles() {
    unsafe {
        if let Some(ref mut app) = APP.as_mut() {
            app.particle_system.clear();
        }
    }
}

/// Get particles as JSON for JS-side rendering fallback.
#[wasm_bindgen]
pub fn get_particles_json() -> String {
    unsafe {
        if let Some(ref app) = APP.as_ref() {
            app.particle_system.to_json()
        } else {
            String::from("[]")
        }
    }
}

/// Get number of unit deaths since last call (drains each frame).
/// Used by JS to trigger death sound effects.
#[wasm_bindgen]
pub fn recent_death_count() -> i32 {
    unsafe {
        if let Some(ref app) = APP.as_ref() {
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
        if let Some(ref app) = APP.as_ref() {
            app.recent_combat_count as i32
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
        if let Some(ref mut app) = APP.as_mut() {
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
        if let Some(ref mut app) = APP.as_mut() {
            app.editor_grid = !app.editor_grid;
            app.mesh_dirty = true;
            app.editor_grid
        } else {
            false
        }
    }
}

/// Check if editor grid overlay is active.
#[wasm_bindgen]
pub fn editor_grid_enabled() -> bool {
    unsafe {
        APP.as_ref().map_or(false, |app| app.editor_grid)
    }
}

/// Export the current map as a JSON string (same format as load_map_json expects).
/// Returns the JSON string on success, or an error string if no map is loaded.
#[wasm_bindgen]
pub fn export_map_json() -> String {
    unsafe {
        APP.as_ref()
            .map(|app| app.game_loop.state.map.to_json())
            .unwrap_or_else(|| String::from("error: no map loaded"))
    }
}

/// Set the rally point for a building.
/// building_index: index into the economy's buildings list.
/// x, y: target tile coordinates for the rally point.
/// Returns true if the building exists and the rally point was set.
#[wasm_bindgen]
pub fn set_building_rally_point(building_index: usize, x: usize, y: usize) -> bool {
    unsafe {
        if let Some(ref mut app) = APP {
            app.game_loop.state.economy.set_building_rally_point(building_index, x, y)
        } else {
            false
        }
    }
}

/// Clear the rally point for a building.
/// Returns true if the building existed.
#[wasm_bindgen]
pub fn clear_building_rally_point(building_index: usize) -> bool {
    unsafe {
        if let Some(ref mut app) = APP {
            app.game_loop.state.economy.clear_building_rally_point(building_index)
        } else {
            false
        }
    }
}

/// Get the rally point for a building as JSON: {"x":N,"y":N} or null if none set.
#[wasm_bindgen]
pub fn get_building_rally_point(building_index: usize) -> String {
    unsafe {
        if let Some(ref app) = APP {
            match app.game_loop.state.economy.get_building_rally_point(building_index) {
                Some((x, y)) => format!(r#"{{"x":{},"y":{}}}"#, x, y),
                None => String::from("null"),
            }
        } else {
            String::from("null")
        }
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
/// Returns JSON array of completed destructions: [{"index":N,"x":N,"y":N}, ...]
/// JS should call this each frame and remove buildings from the model list.
#[wasm_bindgen]
pub fn tick_building_destructions(dt: f32) -> String {
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
            let parts: Vec<String> = completed.iter()
                .map(|(idx, x, y)| format!(r#"{{"index":{},"x":{},"y":{}}}"#, idx, x, y))
                .collect();
            format!("[{}]", parts.join(","))
        } else {
            String::from("[]")
        }
    }
}

/// Get the destruction animation progress for a building (0.0 to 1.0, or -1.0 if not destroying).
#[wasm_bindgen]
pub fn get_building_destruction_progress(building_index: usize) -> f32 {
    unsafe {
        if let Some(ref app) = APP {
            if let Some(b) = app.game_loop.state.economy.buildings.get(building_index) {
                b.destruction_progress().unwrap_or(-1.0)
            } else {
                -1.0
            }
        } else {
            -1.0
        }
    }
}

/// Apply damage to a building at the given index. If HP reaches 0, destruction starts.
/// Returns the remaining HP, or 0 if the building doesn't exist.
#[wasm_bindgen]
pub fn damage_building(building_index: usize, amount: u32) -> u32 {
    unsafe {
        if let Some(ref mut app) = APP {
            if let Some(b) = app.game_loop.state.economy.buildings.get_mut(building_index) {
                return b.take_damage(amount);
            }
        }
        0
    }
}

/// Get the current HP of a building at the given index. Returns 0 if not found.
#[wasm_bindgen]
pub fn get_building_hp(building_index: usize) -> u32 {
    unsafe {
        if let Some(ref app) = APP {
            app.game_loop.state.economy.buildings.get(building_index)
                .map_or(0, |b| b.hp)
        } else {
            0
        }
    }
}

/// Get the max HP of a building at the given index. Returns 0 if not found.
#[wasm_bindgen]
pub fn get_building_max_hp(building_index: usize) -> u32 {
    unsafe {
        if let Some(ref app) = APP {
            app.game_loop.state.economy.buildings.get(building_index)
                .map_or(0, |b| b.max_hp)
        } else {
            0
        }
    }
}

/// Get building info at a tile position. Returns JSON or "null" if no building.
#[wasm_bindgen]
pub fn get_building_at_tile(tile_x: usize, tile_y: usize) -> String {
    unsafe {
        if let Some(ref app) = APP {
            for (i, b) in app.game_loop.state.economy.buildings.iter().enumerate() {
                if b.x == tile_x && b.y == tile_y {
                    let progress = b.destruction_progress().unwrap_or(-1.0);
                    return format!(
                        r#"{{"index":{},"kind":"{}","x":{},"y":{},"construction":{},"active":{},"destruction_progress":{}}}"#,
                        i, b.kind.name(), b.x, b.y, b.construction, b.active, progress
                    );
                }
            }
            String::from("null")
        } else {
            String::from("null")
        }
    }
}

// ── Garrison & Morale API ─────────────────────────────────────────────────────

/// Get garrison info for a building at the given index.
/// Returns JSON: {"count":2,"capacity":6,"unit_ids":[1,2],"garrisoned":true}
/// or {"count":0,"capacity":0,"unit_ids":[],"garrisoned":false} if building not found.
#[wasm_bindgen]
pub fn get_building_garrison_json(building_index: usize) -> String {
    unsafe {
        if let Some(ref app) = APP {
            if let Some(b) = app.game_loop.state.economy.buildings.get(building_index) {
                let ids: Vec<String> = b.garrison.iter().map(|id| id.to_string()).collect();
                return format!(
                    r#"{{"count":{},"capacity":{},"unit_ids":[{}],"garrisoned":{}}}"#,
                    b.garrison.len(),
                    b.max_garrison,
                    ids.join(","),
                    b.is_garrisoned()
                );
            }
        }
    }
    String::from(r#"{{"count":0,"capacity":0,"unit_ids":[],"garrisoned":false}}"#)
}

/// Get morale bonus for a unit by ID.
/// Returns JSON: {"morale_bonus":0.15,"morale_percent":"15%"}
/// or {"morale_bonus":0.0,"morale_percent":"0%"} if unit not found.
#[wasm_bindgen]
pub fn get_unit_morale_json(unit_id: u32) -> String {
    unsafe {
        if let Some(ref app) = APP {
            if let Some(u) = app.game_loop.state.economy.units.get(unit_id) {
                let pct = (u.morale_bonus * 100.0).round() as i32;
                return format!(
                    r#"{{"morale_bonus":{:.2},"morale_percent":"{}%"}}"#,
                    u.morale_bonus, pct
                );
            }
        }
    }
    String::from(r#"{{"morale_bonus":0.0,"morale_percent":"0%"}}"#)
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
                .map_or(false, |u| u.kind.can_fight() && u.hp > 0);
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

/// Ungarrison a unit from a building. Returns true if the unit was found and removed.
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

// ── Tests ──────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_shader_constants() {
        assert!(VERTEX_SHADER.contains("a_position"));
        assert!(VERTEX_SHADER.contains("a_uv"), "missing a_uv");
        assert!(
            VERTEX_SHADER.contains("a_terrain_id"),
            "missing a_terrain_id"
        );
        assert!(
            FRAGMENT_SHADER.contains("u_terrain_textures"),
            "missing texture sampler"
        );
        assert!(
            FRAGMENT_SHADER.contains("u_use_textures"),
            "missing use_textures uniform"
        );
        assert!(FRAGMENT_SHADER.contains("out_color"));
        assert!(VERTEX_SHADER.contains("u_camera_center"));
        assert!(VERTEX_SHADER.contains("u_zoom"));
        // Phase 5: Orbital camera uniforms
        assert!(VERTEX_SHADER.contains("u_vp"), "missing u_vp uniform");
        assert!(VERTEX_SHADER.contains("u_use_vp"), "missing u_use_vp uniform");
    }

    #[test]
    fn test_edge_fog_shader_attribute() {
        // Verify edge-of-map fog uses CPU-computed vertex attributes (not GPU uniforms)
        assert!(
            VERTEX_SHADER.contains("a_edge_dist"),
            "vertex shader missing a_edge_dist attribute"
        );
        assert!(
            FRAGMENT_SHADER.contains("v_edge_dist"),
            "fragment shader missing v_edge_dist varying"
        );
        // u_map_dims should NOT be in either shader (replaced by CPU-computed edge_dists)
        assert!(
            !VERTEX_SHADER.contains("u_map_dims"),
            "vertex shader should NOT have u_map_dims"
        );
        assert!(
            !FRAGMENT_SHADER.contains("u_map_dims"),
            "fragment shader should NOT have u_map_dims"
        );
        // Verify fog computation is present
        assert!(
            FRAGMENT_SHADER.contains("edge_dist"),
            "fragment shader missing edge_dist computation"
        );
        assert!(
            FRAGMENT_SHADER.contains("fog_factor") || FRAGMENT_SHADER.contains("edge_factor"),
            "fragment shader missing edge fog computation"
        );
        assert!(
            FRAGMENT_SHADER.contains("fog_color") || FRAGMENT_SHADER.contains("u_fog_color"),
            "fragment shader missing fog_color"
        );
        // Verify fog of war visibility is used in fragment shader
        assert!(
            FRAGMENT_SHADER.contains("v_visibility"),
            "fragment shader missing visibility varying"
        );
        assert!(
            FRAGMENT_SHADER.contains("u_fog_color"),
            "fragment shader missing u_fog_color uniform"
        );
    }

    #[test]
    fn test_edge_fog_fog_color_matches_clear() {
        // The fog color is now a uniform (u_fog_color) set in the render loop
        // to match the clear color (0.05, 0.08, 0.18).
        // Verify the uniform is declared in the fragment shader.
        assert!(
            FRAGMENT_SHADER.contains("u_fog_color"),
            "fragment shader should declare u_fog_color uniform"
        );
    }

    #[test]
    fn test_map_data_format() {
        // Verify the map data format: header + terrain bytes
        let map = Map::generate_demo(32, 32);
        let w = map.width;
        let h = map.height;
        let mut data = Vec::with_capacity(4 + w * h);
        data.push((w & 0xFF) as u8);
        data.push((w >> 8) as u8);
        data.push((h & 0xFF) as u8);
        data.push((h >> 8) as u8);
        for y in 0..h {
            for x in 0..w {
                data.push(map.get(x, y).unwrap().terrain as u8);
            }
        }

        // Header
        assert_eq!(w, data[0] as usize | ((data[1] as usize) << 8));
        assert_eq!(h, data[2] as usize | ((data[3] as usize) << 8));
        // Total length
        assert_eq!(data.len(), 4 + w * h);
        // All terrain bytes should be 0-7
        for &byte in &data[4..] {
            assert!(byte <= 7, "terrain byte out of range: {}", byte);
        }
    }

    #[test]
    fn test_overlay_shaders_present() {
        assert!(OVERLAY_VERTEX_SHADER.contains("a_overlay_pos"));
        assert!(OVERLAY_FRAGMENT_SHADER.contains("gl_PointCoord"));
        assert!(OVERLAY_FRAGMENT_SHADER.contains("u_player_rgb"));
    }

    #[test]
    fn test_building_color_coverage() {
        // Ensure all building types have a color
        use crate::economy::BuildingType::*;
        for kind in [
            Castle,
            Sawmill,
            Stonecutter,
            Mine,
            Toolsmith,
            Weaponsmith,
            Bakery,
            Butcher,
            Mill,
            Farm,
            Fisherman,
            Woodcutter,
            Storehouse,
            Waterworks,
            Smelter,
            Barracks,
            GuardTower,
            Fortress,
            SiegeWorkshop,
            Shipyard,
            RoadLayer,
            Apiary,
            MeadMaker,
            TempleOfBacchus,
            Colosseum,
            SanctuaryOfMinerva,
            SanctuaryOfVulcan,
            MeadHall,
            SanctuaryOfOdin,
            SanctuaryOfThor,
            SanctuaryOfFreya,
            Runestone,
            TempleOfChac,
            AgaveFarm,
            Distillery,
            SanctuaryOfKukulkan,
            SanctuaryOfQuetzalcoatl,
            SanctuaryOfHuitzilopochtli,
            Observatory,
            OracleOfApollo,
            SanctuaryOfArtemis,
            SanctuaryOfPoseidon,
            SanctuaryOfApollo,
            Amphitheater,
        ] {
            let c = building_color(&kind);
            assert!(c[0] >= 0.0 && c[0] <= 1.0);
            assert!(c[1] >= 0.0 && c[1] <= 1.0);
            assert!(c[2] >= 0.0 && c[2] <= 1.0);
        }
    }

    #[test]
    fn test_unit_color_coverage() {
        use crate::units::UnitKind::*;
        for kind in [Settler, Swordsman, Bowman] {
            let c = unit_color(&kind);
            assert!(c[0] >= 0.0 && c[0] <= 1.0);
            assert!(c[1] >= 0.0 && c[1] <= 1.0);
            assert!(c[2] >= 0.0 && c[2] <= 1.0);
        }
    }

    // ── Texture Pipeline Tests ───────────────────────────────────────────

    #[test]
    fn test_terrain_layer_mapping() {
        // Terrain enum discriminants MUST match the texture array layer order
        // Layer 0=Grass, 1=Forest, 2=Mountain, 3=Water, 4=DeepWater, 5=Desert, 6=Swamp, 7=Snow
        use crate::map::Terrain::*;
        assert_eq!(Grass as u8, 0);
        assert_eq!(Forest as u8, 1);
        assert_eq!(Mountain as u8, 2);
        assert_eq!(Water as u8, 3);
        assert_eq!(DeepWater as u8, 4);
        assert_eq!(Desert as u8, 5);
        assert_eq!(Swamp as u8, 6);
        assert_eq!(Snow as u8, 7);
    }

    #[test]
    fn test_mesh_contains_uv_and_terrain_id() {
        // build_map_mesh must populate uvs (2 floats per vertex) and terrain_ids (1 float)
        let map = Map::generate_demo(16, 16);
        let camera = Camera::new(8.0, 8.0, 800, 600);
        let mesh = build_map_mesh(&map, &camera);

        let vertex_count = mesh.positions.len() / 3;
        assert!(vertex_count > 0, "mesh should have vertices");

        // UVs: 2 floats per vertex
        assert_eq!(mesh.uvs.len(), vertex_count * 2, "uvs count mismatch");
        // terrain_ids: 1 float per vertex
        assert_eq!(
            mesh.terrain_ids.len(),
            vertex_count,
            "terrain_ids count mismatch"
        );

        // All UVs must be in [0.0, 1.0) range
        for &uv in &mesh.uvs {
            assert!(
                (0.0..1.0).contains(&uv),
                "UV value {uv} outside [0, 1) range"
            );
        }

        // All terrain_ids must be in [0, 7] range (valid terrain types)
        for &id in &mesh.terrain_ids {
            assert!(
                (0.0..=7.0).contains(&id),
                "terrain_id {id} outside [0, 7] range"
            );
        }
    }

    #[test]
    fn test_terrain_id_matches_uv_correspondence() {
        // Each vertex's terrain_id should correspond to the actual tile's terrain
        let map = Map::generate_demo(8, 8);
        let camera = Camera::new(4.0, 4.0, 400, 300);
        let mesh = build_map_mesh(&map, &camera);

        // Vertices are laid out in row-major order (row, col)
        // terrain_ids follow the same order as positions
        for v in 0..mesh.terrain_ids.len() {
            let x = mesh.positions[v * 3] as usize;
            let y = mesh.positions[v * 3 + 2] as usize;
            let expected = map.get(x, y).unwrap().terrain as u8 as f32;
            assert_eq!(
                mesh.terrain_ids[v], expected,
                "Vertex {v}: position ({x},{y}) terrain_id {} != expected {expected}",
                mesh.terrain_ids[v]
            );
        }
    }

    #[test]
    fn test_fragment_shader_texture_fallback() {
        // Fragment shader must support both texture sampling and flat-color fallback
        assert!(
            FRAGMENT_SHADER.contains("if (u_use_textures)"),
            "fragment shader missing u_use_textures branch"
        );
        assert!(
            FRAGMENT_SHADER.contains("texture(u_terrain_textures"),
            "fragment shader missing texture() sampling call"
        );
        assert!(
            FRAGMENT_SHADER.contains("base_color = v_color"),
            "fragment shader missing flat-color fallback"
        );
        // The base_color variable must be used for the final lit calculation
        assert!(
            FRAGMENT_SHADER.contains("base_color * shade"),
            "fragment shader not using base_color in shading"
        );
    }

    #[test]
    fn test_texture_varying_pass_through() {
        // Vertex shader must pass v_uv and v_terrain_id to fragment shader
        assert!(
            VERTEX_SHADER.contains("v_uv = a_uv"),
            "vertex shader missing v_uv = a_uv pass-through"
        );
        assert!(
            VERTEX_SHADER.contains("v_terrain_id = a_terrain_id"),
            "vertex shader missing v_terrain_id = a_terrain_id pass-through"
        );
        // Fragment shader must receive them
        assert!(
            FRAGMENT_SHADER.contains("in vec2 v_uv"),
            "fragment shader missing v_uv input"
        );
        assert!(
            FRAGMENT_SHADER.contains("in float v_terrain_id"),
            "fragment shader missing v_terrain_id input"
        );
    }

    // ── Phase 5: Height-Displaced Mesh & Vertex Normals Tests ──────────

    #[test]
    fn test_height_displaced_positions() {
        // Positions must be 3-float: (tile_x, elevation * ELEVATION_SCALE, tile_y)
        let map = Map::generate_demo(16, 16);
        let camera = Camera::new(8.0, 8.0, 800, 600);
        let mesh = build_map_mesh(&map, &camera);

        let vertex_count = mesh.positions.len() / 3;
        assert!(vertex_count > 0, "mesh should have vertices");

        // Check that all position heights match tile elevation * ELEVATION_SCALE
        for v in 0..vertex_count {
            let idx = v * 3;
            let mx = mesh.positions[idx] as usize;
            let h = mesh.positions[idx + 1];
            let my = mesh.positions[idx + 2] as usize;

            let tile = map.get(mx, my).unwrap();
            let expected_h = tile.elevation * ELEVATION_SCALE;
            assert!((h - expected_h).abs() < 0.001,
                "height mismatch at ({},{}): {} vs {}", mx, my, h, expected_h);
        }
    }

    #[test]
    fn test_mesh_normals_count() {
        // Normals must be 3 floats per vertex
        let map = Map::generate_demo(16, 16);
        let camera = Camera::new(8.0, 8.0, 800, 600);
        let mesh = build_map_mesh(&map, &camera);

        let vertex_count = mesh.positions.len() / 3;
        assert_eq!(mesh.normals.len(), vertex_count * 3, "normals count mismatch");
    }

    #[test]
    fn test_normals_are_unit_vectors() {
        // All computed normals must be unit vectors (or default up)
        let map = Map::generate_demo(16, 16);
        let camera = Camera::new(8.0, 8.0, 800, 600);
        let mesh = build_map_mesh(&map, &camera);

        let vertex_count = mesh.normals.len() / 3;
        for v in 0..vertex_count {
            let idx = v * 3;
            let nx = mesh.normals[idx];
            let ny = mesh.normals[idx + 1];
            let nz = mesh.normals[idx + 2];
            let len = (nx * nx + ny * ny + nz * nz).sqrt();
            assert!((len - 1.0).abs() < 0.01, "normal at vertex {} not unit: {}", v, len);
        }
    }

    #[test]
    fn test_vertex_shader_has_position_z_and_normal() {
        assert!(VERTEX_SHADER.contains("in vec3 a_position"),
            "vertex shader missing in vec3 a_position");
        assert!(VERTEX_SHADER.contains("in vec3 a_normal"),
            "vertex shader missing in vec3 a_normal");
        assert!(VERTEX_SHADER.contains("out vec3 v_normal"),
            "vertex shader missing out vec3 v_normal");
    }

    #[test]
    fn test_fragment_shader_has_v_normal() {
        assert!(FRAGMENT_SHADER.contains("in vec3 v_normal"),
            "fragment shader missing in vec3 v_normal");
    }

    #[test]
    fn test_texture_uniforms_declared() {
        // Both texture-related uniforms must be declared in the fragment shader
        assert!(
            FRAGMENT_SHADER.contains("uniform highp sampler2DArray u_terrain_textures"),
            "fragment shader missing sampler2DArray declaration"
        );
        assert!(
            FRAGMENT_SHADER.contains("uniform bool u_use_textures"),
            "fragment shader missing u_use_textures declaration"
        );
    }

    // ── Phase 5: Fragment Shader Diffuse Lighting Tests ──────────────────────

    #[test]
    fn test_fragment_shader_has_light_direction_uniform() {
        assert!(
            FRAGMENT_SHADER.contains("uniform vec3 u_light_direction"),
            "fragment shader missing u_light_direction uniform"
        );
    }

    #[test]
    fn test_fragment_shader_uses_v_normal_for_diffuse() {
        // Fragment shader must normalize v_normal and compute dot product with light dir
        assert!(
            FRAGMENT_SHADER.contains("normalize(v_normal)"),
            "fragment shader missing normalize(v_normal)"
        );
        assert!(
            FRAGMENT_SHADER.contains("dot(n, l)"),
            "fragment shader missing dot(n, l) diffuse calculation"
        );
    }

    #[test]
    fn test_fragment_shader_combined_lighting() {
        // Fragment shader must combine ambient + diffuse (not just ambient alone)
        assert!(
            FRAGMENT_SHADER.contains("ambient_base"),
            "fragment shader missing ambient_base"
        );
        assert!(
            FRAGMENT_SHADER.contains("diffuse"),
            "fragment shader missing diffuse lighting"
        );
        // The old ambient-only vec3 lit = base_color * shade * ambient should be gone
        assert!(
            FRAGMENT_SHADER.contains("base_color * shade * light"),
            "fragment shader should use combined light (ambient+diffuse), not just ambient"
        );
    }

    // ── Phase 5: Splat-Map Tests ──────────────────────────────────────────

    #[test]
    fn test_vertex_shader_has_splat_attribute() {
        assert!(
            VERTEX_SHADER.contains("in vec4 a_splat"),
            "vertex shader missing in vec4 a_splat"
        );
        assert!(
            VERTEX_SHADER.contains("out vec4 v_splat"),
            "vertex shader missing out vec4 v_splat"
        );
        assert!(
            VERTEX_SHADER.contains("v_splat = a_splat"),
            "vertex shader missing v_splat = a_splat pass-through"
        );
    }

    #[test]
    fn test_fragment_shader_has_splat_varying() {
        assert!(
            FRAGMENT_SHADER.contains("in vec4 v_splat"),
            "fragment shader missing in vec4 v_splat"
        );
    }

    #[test]
    fn test_mesh_contains_splat_data() {
        // build_map_mesh must populate splats (4 floats per vertex)
        let map = Map::generate_demo(16, 16);
        let camera = Camera::new(8.0, 8.0, 800, 600);
        let mesh = build_map_mesh(&map, &camera);

        let vertex_count = mesh.positions.len() / 3;
        assert!(vertex_count > 0, "mesh should have vertices");

        // Splats: 4 floats per vertex (R=grass, G=rock, B=sand, A=snow)
        assert_eq!(mesh.splats.len(), vertex_count * 4, "splats count mismatch");
    }

    #[test]
    fn test_splat_weights_sum_to_one() {
        // All splat weights at each vertex should sum to approximately 1.0
        let map = Map::generate_demo(16, 16);
        let camera = Camera::new(8.0, 8.0, 800, 600);
        let mesh = build_map_mesh(&map, &camera);

        let vertex_count = mesh.splats.len() / 4;
        for v in 0..vertex_count {
            let s = v * 4;
            let sum = mesh.splats[s] + mesh.splats[s + 1] + mesh.splats[s + 2] + mesh.splats[s + 3];
            assert!(
                (sum - 1.0).abs() < 0.01,
                "splat weights at vertex {} sum to {} (expected ~1.0)",
                v,
                sum
            );
        }
    }

    #[test]
    fn test_splat_weights_non_negative() {
        // All splat weights should be non-negative
        let map = Map::generate_demo(16, 16);
        let camera = Camera::new(8.0, 8.0, 800, 600);
        let mesh = build_map_mesh(&map, &camera);

        for (i, &w) in mesh.splats.iter().enumerate() {
            assert!(w >= 0.0, "splat weight at index {} is negative: {}", i, w);
        }
    }

    #[test]
    fn test_grass_terrain_has_grass_splat() {
        // A grass tile should have non-zero grass (R) splat weight
        let map = Map::generate_demo(32, 32);
        let camera = Camera::new(16.0, 16.0, 800, 600);
        let mesh = build_map_mesh(&map, &camera);

        // Find a grass vertex and check it has grass-dominant splat
        let mut found_grass = false;
        for v in 0..mesh.terrain_ids.len() {
            if mesh.terrain_ids[v] == 0.0 {
                // Grass terrain
                let s = v * 4;
                assert!(
                    mesh.splats[s] > 0.01,
                    "grass tile vertex should have non-trivial R (grass) splat, got {}",
                    mesh.splats[s]
                );
                found_grass = true;
                break;
            }
        }
        assert!(found_grass, "should have found at least one grass vertex");
    }

    #[test]
    fn test_fragment_shader_splat_blending() {
        // Fragment shader must contain splat-based atlas sampling
        assert!(
            FRAGMENT_SHADER.contains("atlas_uv_grass"),
            "fragment shader missing grass atlas UV computation"
        );
        assert!(
            FRAGMENT_SHADER.contains("v_splat.r"),
            "fragment shader missing splat.r weight"
        );
        assert!(
            FRAGMENT_SHADER.contains("/ w"),
            "fragment shader missing splat normalization by total weight"
        );
    }

    #[test]
    fn test_fragment_shader_splat_atlas_uv_remap() {
        // Verify the UV remapping divides by 4.0 (4 horizontal slices)
        assert!(
            FRAGMENT_SHADER.contains("/ 4.0"),
            "fragment shader missing / 4.0 atlas UV remap"
        );
    }

    // ── Water Shader Tests ─────────────────────────────────────────────────────

    #[test]
    fn test_vertex_shader_has_water_time_uniform() {
        assert!(
            VERTEX_SHADER.contains("uniform float u_water_time"),
            "vertex shader missing u_water_time uniform"
        );
    }

    #[test]
    fn test_fragment_shader_has_water_time_uniform() {
        assert!(
            FRAGMENT_SHADER.contains("uniform float u_water_time"),
            "fragment shader missing u_water_time uniform declaration"
        );
    }

    #[test]
    fn test_vertex_shader_water_animation_for_water_tiles() {
        assert!(
            VERTEX_SHADER.contains("a_terrain_id > 2.5 && a_terrain_id < 4.5"),
            "vertex shader missing water terrain ID check"
        );
        assert!(
            VERTEX_SHADER.contains("water_anim"),
            "vertex shader missing water_anim variable"
        );
    }

    #[test]
    fn test_vertex_shader_water_wave_components() {
        // Three wave components for realistic water animation
        assert!(
            VERTEX_SHADER.contains("u_water_time * 1.8"),
            "vertex shader missing wave1 frequency"
        );
        assert!(
            VERTEX_SHADER.contains("u_water_time * 2.4"),
            "vertex shader missing wave2 frequency"
        );
        assert!(
            VERTEX_SHADER.contains("u_water_time * 0.7"),
            "vertex shader missing wave3 frequency"
        );
    }

    #[test]
    fn test_vertex_shader_deep_water_smaller_waves() {
        assert!(
            VERTEX_SHADER.contains("a_terrain_id > 3.5"),
            "vertex shader missing deep water check"
        );
        assert!(
            VERTEX_SHADER.contains("water_anim *= 0.7"),
            "vertex shader missing deep water wave reduction"
        );
    }

    #[test]
    fn test_fragment_shader_water_rendering_path() {
        assert!(
            FRAGMENT_SHADER.contains("is_water"),
            "fragment shader missing is_water boolean"
        );
        assert!(
            FRAGMENT_SHADER.contains("Water=3, DeepWater=4"),
            "fragment shader missing water terrain ID comment"
        );
    }

    #[test]
    fn test_fragment_shader_water_specular_highlight() {
        assert!(
            FRAGMENT_SHADER.contains("specular_strength"),
            "fragment shader missing specular_strength"
        );
        assert!(
            FRAGMENT_SHADER.contains("pow(max(dot(n_w, h), 0.0), 64.0)"),
            "fragment shader missing Blinn-Phong specular computation"
        );
    }

    #[test]
    fn test_fragment_shader_water_fresnel() {
        assert!(
            FRAGMENT_SHADER.contains("fresnel"),
            "fragment shader missing fresnel variable"
        );
        assert!(
            FRAGMENT_SHADER.contains("pow(1.0 - max(dot(n_w, view_dir), 0.0), 3.0)"),
            "fragment shader missing fresnel computation"
        );
    }

    #[test]
    fn test_fragment_shader_water_depth_color_ramp() {
        assert!(
            FRAGMENT_SHADER.contains("shallow_color"),
            "fragment shader missing shallow water color"
        );
        assert!(
            FRAGMENT_SHADER.contains("deep_color"),
            "fragment shader missing deep water color"
        );
        assert!(
            FRAGMENT_SHADER.contains("vec3(0.1, 0.45, 0.55)"),
            "fragment shader missing turquoise shallow color"
        );
        assert!(
            FRAGMENT_SHADER.contains("vec3(0.02, 0.12, 0.35)"),
            "fragment shader missing dark navy deep color"
        );
    }

    #[test]
    fn test_fragment_shader_water_depth_animation() {
        assert!(
            FRAGMENT_SHADER.contains("u_water_time * 1.5"),
            "fragment shader missing water depth animation"
        );
        assert!(
            FRAGMENT_SHADER.contains("v_uv.x * 6.28"),
            "fragment shader missing UV-based depth variation"
        );
    }

    // ── Model 3D Rendering Tests ──────────────────────────────────────────

    #[test]
    fn test_model_vertex_shader_has_required_uniforms() {
        assert!(MODEL_VERTEX_SHADER.contains("u_vp"), "model vertex shader missing u_vp");
        assert!(MODEL_VERTEX_SHADER.contains("u_model"), "model vertex shader missing u_model");
        assert!(MODEL_VERTEX_SHADER.contains("u_use_instanced"), "model vertex shader missing u_use_instanced");
        assert!(MODEL_VERTEX_SHADER.contains("a_model"), "model vertex shader missing a_model (instanced)");
        assert!(MODEL_VERTEX_SHADER.contains("a_position"), "model vertex shader missing a_position");
        assert!(MODEL_VERTEX_SHADER.contains("a_normal"), "model vertex shader missing a_normal");
        assert!(MODEL_VERTEX_SHADER.contains("a_uv"), "model vertex shader missing a_uv");
    }

    #[test]
    fn test_model_fragment_shader_has_required_uniforms() {
        assert!(MODEL_FRAGMENT_SHADER.contains("u_model_color"), "model fragment shader missing u_model_color");
        assert!(MODEL_FRAGMENT_SHADER.contains("u_roughness"), "model fragment shader missing u_roughness");
        assert!(MODEL_FRAGMENT_SHADER.contains("u_metallic"), "model fragment shader missing u_metallic");
    }

    // ── Unit wobble animation shader tests ──────────────────────────────────

    #[test]
    fn test_model_vertex_shader_has_time_uniform() {
        assert!(MODEL_VERTEX_SHADER.contains("u_time"), "model vertex shader missing u_time uniform for wobble animation");
    }

    #[test]
    fn test_model_vertex_shader_has_anim_phase_attribute() {
        assert!(MODEL_VERTEX_SHADER.contains("a_anim_phase"), "model vertex shader missing a_anim_phase instanced attribute");
    }

    #[test]
    fn test_model_vertex_shader_wobble_uses_sin() {
        assert!(MODEL_VERTEX_SHADER.contains("sin("), "model vertex shader wobble should use sin() for smooth oscillation");
    }

    #[test]
    fn test_model_vertex_shader_wobble_displaces_y() {
        assert!(MODEL_VERTEX_SHADER.contains("pos.y += sin"), "model vertex shader should displace Y with sin for vertical bob");
    }

    #[test]
    fn test_model_vertex_shader_wobble_displaces_xz() {
        assert!(MODEL_VERTEX_SHADER.contains("pos.x += sin") && MODEL_VERTEX_SHADER.contains("pos.z += cos"),
            "model vertex shader should displace X/Z for horizontal sway");
    }

    #[test]
    fn test_model_vertex_shader_wobble_conditional_on_phase() {
        // Wobble should only apply when a_anim_phase is non-zero (units, not buildings)
        assert!(MODEL_VERTEX_SHADER.contains("a_anim_phase"), "wobble should check a_anim_phase");
    }

    #[test]
    fn test_load_model_json_valid() {
        let json = r#"{"version":1,"vertices":[[0,0,0],[1,0,0],[0,1,0]],"normals":[[0,1,0],[0,1,0],[0,1,0]],"uvs":[[0,0],[1,0],[0,1]],"indices":[0,1,2],"aabb":[0,0,0,1,1,0]}"#;
        let result = load_model_json("TestModel", json);
        assert!(result.starts_with("ok:TestModel:"), "expected ok, got: {}", result);
    }

    #[test]
    fn test_load_model_json_invalid_json() {
        let result = load_model_json("Bad", "not json");
        assert!(result.starts_with("error:"), "expected error, got: {}", result);
    }

    #[test]
    fn test_load_model_json_wrong_version() {
        let json = r#"{"version":99,"vertices":[[0,0,0],[1,0,0]],"normals":[[0,1,0],[0,1,0]],"uvs":[[0,0],[1,0]],"indices":[0,1,2],"aabb":[0,0,0,0,0,0]}"#;
        let result = load_model_json("BadVer", json);
        assert!(result.starts_with("error:"), "expected error for wrong version, got: {}", result);
    }

    #[test]
    fn test_model_instance_count_zero_when_no_app() {
        // model_instance_count returns 0 when APP is None (no WebGL context)
        assert_eq!(model_instance_count(), 0);
    }

    #[test]
    fn test_clear_model_instances_no_app() {
        // clear_model_instances should not panic when APP is None
        clear_model_instances();
    }

    #[test]
    fn test_add_model_instance_no_app() {
        // add_model_instance should return false when APP is None
        assert!(!add_model_instance("test", 1.0, 2.0, 1.0, 0.0));
    }

    #[test]
    fn test_load_model_json_empty_mesh() {
        let json = r#"{"version":1,"vertices":[],"normals":[],"uvs":[],"indices":[],"aabb":[0,0,0,0,0,0]}"#;
        let result = load_model_json("Empty", json);
        assert!(result.starts_with("error:"), "expected error for empty mesh, got: {}", result);
    }

    #[test]
    fn test_load_model_json_missing_fields() {
        let json = r#"{"version":1}"#;
        let result = load_model_json("Missing", json);
        assert!(result.starts_with("error:"), "expected error for missing fields, got: {}", result);
    }

    #[test]
    fn test_model_id_for_unit_settler() {
        // Settler -> "worker" model
        assert_eq!(App::model_id_for_unit(units::UnitKind::Settler), "worker");
    }

    #[test]
    fn test_model_id_for_unit_swordsman() {
        assert_eq!(App::model_id_for_unit(units::UnitKind::Swordsman), "soldier");
    }

    #[test]
    fn test_model_id_for_unit_bowman() {
        assert_eq!(App::model_id_for_unit(units::UnitKind::Bowman), "archer");
    }

    #[test]
    fn test_model_id_for_unit_all_variants_covered() {
        // Verify all 3 unit kinds have model mappings
        use units::UnitKind;
        let kinds = [UnitKind::Settler, UnitKind::Swordsman, UnitKind::Bowman];
        for kind in kinds {
            let model_id = App::model_id_for_unit(kind);
            assert!(!model_id.is_empty(), "{:?} should map to a model", kind);
        }
    }

    #[test]
    fn test_unit_model_json_files_exist() {
        // Verify the JSON model files for units exist on disk
        // These are needed for the game to render unit models
        let unit_models = ["worker", "soldier", "archer"];
        for name in unit_models {
            let path = std::path::Path::new("../assets/models/json").join(format!("{}.json", name));
            assert!(path.exists(), "missing unit model: {}", path.display());
        }
    }

    #[test]
    fn test_unit_model_json_parsable() {
        // Verify all 3 unit models parse correctly
        let unit_models = ["worker", "soldier", "archer"];
        for name in unit_models {
            let path = std::path::Path::new("../assets/models/json").join(format!("{}.json", name));
            let json_str = std::fs::read_to_string(&path).expect(&format!("cannot read {}", path.display()));
            let mesh = crate::model::parse_json_mesh(&json_str)
                .expect(&format!("cannot parse unit model {}", name));
            assert!(mesh.positions.len() >= 16, "{} has too few vertices", name);
            assert!(mesh.indices.len() >= 12, "{} has too few indices", name);
        }
    }


    // ── Construction Scale Tests ────────────────────────────────────────────

    #[test]
    fn test_construction_scale_zero() {
        // At construction=0.0, scale should be 0.3
        let s = App::construction_scale(0.0);
        assert!((s - 0.3).abs() < 0.001, "construction=0.0 should give scale ~0.3, got {}", s);
    }

    #[test]
    fn test_construction_scale_complete() {
        // At construction=1.0, scale should be 1.0
        let s = App::construction_scale(1.0);
        assert!((s - 1.0).abs() < 0.001, "construction=1.0 should give scale 1.0, got {}", s);
    }

    #[test]
    fn test_construction_scale_half() {
        // At construction=0.5, ease = 1 - 0.5^2 = 0.75, scale = 0.3 + 0.7*0.75 = 0.825
        let s = App::construction_scale(0.5);
        let expected = 0.3 + 0.7 * 0.75;
        assert!((s - expected).abs() < 0.001, "construction=0.5 should give scale ~{}, got {}", expected, s);
    }

    #[test]
    fn test_construction_scale_monotonic() {
        // Scale should increase monotonically
        let steps = 20;
        let mut prev = 0.0f32;
        for i in 0..=steps {
            let t = i as f32 / steps as f32;
            let s = App::construction_scale(t);
            assert!(s >= prev - 0.001, "scale decreased at t={}: {} < {}", t, s, prev);
            prev = s;
        }
    }

    #[test]
    fn test_construction_scale_clamped() {
        // Values outside 0..1 should be clamped
        let s_neg = App::construction_scale(-0.5);
        let s_zero = App::construction_scale(0.0);
        assert!((s_neg - s_zero).abs() < 0.001, "negative should clamp to 0.0");

        let s_over = App::construction_scale(1.5);
        let s_one = App::construction_scale(1.0);
        assert!((s_over - s_one).abs() < 0.001, ">1.0 should clamp to 1.0");
    }

    // ── Phase 6: Particle System Tests ──────────────────────────────────────

    #[test]
    fn test_particle_system_new_empty() {
        let ps = particle::ParticleSystem::new();
        assert_eq!(ps.alive_count(), 0);
    }

    #[test]
    fn test_particle_spawn_and_update() {
        let mut ps = particle::ParticleSystem::new();
        assert!(ps.spawn(1.0, 2.0, 0.0, 0.0, 0.0, 1.0, 1.0, 0.5, 0.5, 0.5, 8.0));
        assert_eq!(ps.alive_count(), 1);
        ps.update(0.5);
        assert_eq!(ps.alive_count(), 1);
        ps.update(0.6);
        assert_eq!(ps.alive_count(), 0);
    }

    #[test]
    fn test_particle_burst() {
        let mut ps = particle::ParticleSystem::new();
        let n = ps.spawn_burst(5.0, 5.0, 0.0, 10, 1.0, 0.0, 0.0, 2.0, 1.0, 6.0);
        assert_eq!(n, 10);
        assert_eq!(ps.alive_count(), 10);
    }

    #[test]
    fn test_particle_overlay_data() {
        let mut ps = particle::ParticleSystem::new();
        ps.spawn(3.0, 4.0, 0.5, 0.0, 0.0, 0.0, 1.0, 0.2, 0.8, 0.3, 10.0);
        let (pos, col, sizes) = ps.get_overlay_data();
        assert_eq!(pos.len(), 2);
        assert_eq!(col.len(), 3);
        assert_eq!(sizes.len(), 1);
        assert_eq!(pos[0], 3.0);
        assert!((sizes[0] - 11.0).abs() < 0.001);
    }

    #[test]
    fn test_particle_to_json() {
        let mut ps = particle::ParticleSystem::new();
        assert_eq!(ps.to_json(), "[]");
        ps.spawn(1.0, 2.0, 0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 0.5, 0.2, 8.0);
        let json = ps.to_json();
        assert!(json.contains("\"x\":1.00"), "json: {}", json);
    }

    #[test]
    fn test_build_effect() {
        let mut ps = particle::ParticleSystem::new();
        particle::spawn_build_effect(&mut ps, 10.0, 20.0);
        assert!(ps.alive_count() > 0 && ps.alive_count() <= 12);
    }

    #[test]
    fn test_combat_effect() {
        let mut ps = particle::ParticleSystem::new();
        particle::spawn_combat_effect(&mut ps, 5.0, 5.0);
        assert!(ps.alive_count() > 0 && ps.alive_count() <= 16);
    }

    #[test]
    fn test_particle_max_pool() {
        let mut ps = particle::ParticleSystem::new();
        for i in 0..particle::MAX_PARTICLES + 10 {
            let spawned = ps.spawn(i as f32, 0.0, 0.0, 0.0, 0.0, 0.0, 10.0, 1.0, 1.0, 1.0, 8.0);
            if (i as usize) < particle::MAX_PARTICLES {
                assert!(spawned);
            } else {
                assert!(!spawned);
            }
        }
        assert_eq!(ps.alive_count(), particle::MAX_PARTICLES);
    }

    #[test]
    fn test_particle_clear() {
        let mut ps = particle::ParticleSystem::new();
        ps.spawn_burst(0.0, 0.0, 0.0, 20, 1.0, 1.0, 1.0, 2.0, 1.0, 6.0);
        assert_eq!(ps.alive_count(), 20);
        ps.clear();
        assert_eq!(ps.alive_count(), 0);
    }

    #[test]
    fn test_particle_alpha_fade() {
        let mut p = particle::Particle::new();
        p.spawn(0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0, 8.0);
        assert!((p.alpha() - 1.0).abs() < 0.001);
        p.life = 0.5;
        let alpha = p.alpha();
        assert!(alpha < 1.0 && alpha > 0.0, "alpha: {}", alpha);
    }

    #[test]
    fn test_particle_bounce() {
        let mut p = particle::Particle::new();
        p.spawn(0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 2.0, 1.0, 1.0, 1.0, 8.0);
        p.vz = -5.0;
        p.tick(0.5);
        assert!(p.z >= 0.0, "z: {}", p.z);
    }
}

    // ── Day/Night Lighting Tests ───────────────────────────────────────────

    /// Helper: replicate the Rust sun_angle calculation for testing.
    #[allow(dead_code)]
    fn compute_sun_angle(day_phase: f32) -> f32 {
        (day_phase - 0.25) * std::f32::consts::TAU
    }

    /// Helper: replicate the shader day_light_raw formula.
    #[allow(dead_code)]
    fn compute_day_light_raw(day_phase: f32) -> f32 {
        0.5 + 0.5 * (compute_sun_angle(day_phase)).sin()
    }

    /// Helper: Hermite smoothstep for transition smoothing.
    #[allow(dead_code)]
    fn smooth_day_light(raw: f32) -> f32 {
        raw * raw * (3.0 - 2.0 * raw)
    }

    #[test]
    fn test_sun_angle_midnight_below_horizon() {
        // At midnight (phase 0.0), sun should be at nadir (below horizon)
        let angle = compute_sun_angle(0.0);
        let elev = angle.sin() * 0.8 + 0.2;
        assert!(elev < 0.0, "sun elevation at midnight should be below horizon, got {}", elev);
    }

    #[test]
    fn test_sun_angle_noon_overhead() {
        // At noon (phase 0.5), sun should be at zenith (overhead)
        let angle = compute_sun_angle(0.5);
        let elev = angle.sin() * 0.8 + 0.2;
        assert!((elev - 1.0).abs() < 0.01, "sun elevation at noon should be ~1.0, got {}", elev);
    }

    #[test]
    fn test_sun_angle_dawn_horizon() {
        // At dawn (phase 0.25), sun should be at horizon
        let angle = compute_sun_angle(0.25);
        let elev = angle.sin() * 0.8 + 0.2;
        assert!((elev - 0.2).abs() < 0.01, "sun at dawn should be at horizon, got {}", elev);
    }

    #[test]
    fn test_day_light_raw_darkest_at_midnight() {
        let raw = compute_day_light_raw(0.0);
        assert!((raw - 0.0).abs() < 0.001, "day_light at midnight should be 0 (darkest), got {}", raw);
    }

    #[test]
    fn test_day_light_raw_brightest_at_noon() {
        let raw = compute_day_light_raw(0.5);
        assert!((raw - 1.0).abs() < 0.001, "day_light at noon should be 1.0 (brightest), got {}", raw);
    }

    #[test]
    fn test_day_light_smoothed_preserves_extrema() {
        // Smoothing should preserve 0.0 and 1.0
        assert!((smooth_day_light(0.0) - 0.0).abs() < 0.001);
        assert!((smooth_day_light(1.0) - 1.0).abs() < 0.001);
    }

    #[test]
    fn test_day_light_smoothed_eases_midpoint() {
        // At 0.5 raw, smoothed should be 0.5 (Hermite S-curve symmetric)
        assert!((smooth_day_light(0.5) - 0.5).abs() < 0.001);
    }

    #[test]
    fn test_day_light_smoothed_night_stays_dark() {
        // Dawn transition should be gentle: raw 0.25 should map to < 0.25
        let smoothed = smooth_day_light(0.25);
        assert!(smoothed < 0.25, "smoothed dawn should be slower than linear, got {}", smoothed);
    }

    #[test]
    fn test_day_light_smoothed_day_stays_bright() {
        // Dusk transition: raw 0.75 should map to > 0.75
        let smoothed = smooth_day_light(0.75);
        assert!(smoothed > 0.75, "smoothed dusk should stay bright longer, got {}", smoothed);
    }

    #[test]
    fn test_fragment_shader_has_corrected_day_light() {
        // Verify the fragment shader contains the corrected formula
        assert!(FRAGMENT_SHADER.contains("sin((v_day_phase - 0.25)"),
            "fragment shader should use shifted phase for day_light");
        assert!(FRAGMENT_SHADER.contains("day_light_raw"),
            "fragment shader should use day_light_raw for smoothstep");
        assert!(FRAGMENT_SHADER.contains("Hermite smoothstep"),
            "fragment shader should document Hermite smoothstep");
    }

    #[test]
    fn test_fragment_shader_has_corrected_resource_glow() {
        // Verify resource glow uses corrected phase
        assert!(FRAGMENT_SHADER.contains("sin((v_day_phase - 0.25) * 6.2831853 * 2.0)"),
            "resource glow should use shifted phase");
    }

    #[test]
    fn test_export_map_json() {
        use crate::map::{Map, Terrain, Resource};
        // Create a simple map
        let mut map = Map::new(4, 4);
        map.set_terrain(0, 0, Terrain::Grass);
        map.set_terrain(1, 0, Terrain::Forest);
        map.set_terrain(2, 0, Terrain::Water);
        map.set_terrain(3, 0, Terrain::Mountain);
        // Set some resources directly
        if let Some(tile) = map.get_mut(1, 0) {
            tile.resource = Some(Resource::Iron);
        }
        if let Some(tile) = map.get_mut(3, 0) {
            tile.resource = Some(Resource::Gold);
        }
        let json = map.to_json();
        // Verify JSON structure
        assert!(json.starts_with("{\"width\":4,\"height\":4"), "bad header: {}", &json[..40]);
        assert!(json.contains("\"t\":0"), "missing grass");
        assert!(json.contains("\"t\":1"), "missing forest");
        assert!(json.contains("\"t\":3"), "missing water");
        assert!(json.contains("\"t\":2"), "missing mountain");
        assert!(json.contains("\"Iron\""), "missing Iron resource");
        assert!(json.contains("\"Gold\""), "missing Gold resource");
        assert!(json.contains("\"r\":null"), "missing null resource");
        assert!(json.ends_with("]}"), "bad footer");
    }

    #[test]
    fn test_get_units_in_rect_wasm_finds_military() {
        // Test that the WASM wrapper works end-to-end
        use crate::units::UnitManager;
        use crate::economy::Economy;
        use crate::units::UnitKind;
        use crate::map::Map;

        let mut map = Map::new(10, 10);
        let mut eco = Economy::default();
        eco.units.spawn(UnitKind::Settler, 1.0, 1.0);    // settler - should NOT be selected
        eco.units.spawn(UnitKind::Swordsman, 2.0, 3.0);   // swordsman - IN rect
        eco.units.spawn(UnitKind::Bowman, 4.0, 5.0);      // bowman - IN rect
        eco.units.spawn(UnitKind::Swordsman, 8.0, 8.0);   // swordsman - OUTSIDE rect

        // Test via UnitManager directly (WASM wrapper delegates to this)
        let result = eco.units.military_in_rect(0.0, 0.0, 6.0, 6.0);
        
        assert_eq!(result.len(), 2, "Should find 2 military units in rect");
        let ids: Vec<u32> = result.iter().map(|(id, ..)| *id).collect();
        assert!(ids.contains(&2), "Should contain Swordsman id=2");
        assert!(ids.contains(&3), "Should contain Bowman id=3");
        assert!(!ids.contains(&1), "Should NOT contain Settler id=1");
        assert!(!ids.contains(&4), "Should NOT contain unit id=4 (outside rect)");
    }

    #[test]
    fn test_get_units_in_rect_wasm_empty() {
        use crate::units::UnitManager;
        use crate::economy::Economy;
        use crate::units::UnitKind;

        let mut eco = Economy::default();
        eco.units.spawn(UnitKind::Settler, 1.0, 1.0);

        // No military units - only settlers which can_fight=false
        let result = eco.units.military_in_rect(0.0, 0.0, 10.0, 10.0);
        assert_eq!(result.len(), 0);
    }
