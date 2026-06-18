//! S4WN Engine — Siedler 4 Web-Native
//!
//! Phase 1: Isometric map rendering + camera controls.
//! Full WASM + WebGL2 pipeline with generated terrain maps,
//! smooth camera pan (mouse drag) and zoom (scroll wheel).

pub mod ara_crypt;
pub mod camera;
pub mod combat;
pub mod decompress;
pub mod economy;
pub mod game_loop;
pub mod map;
pub mod nation;
pub mod network;
pub mod pathfinding;
pub mod units;
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

in vec2 a_position;
in vec3 a_color;
in float a_elevation;
in float a_has_resource;
in float a_slope;
in float a_edge_dist;
in float a_visibility;
in vec2 a_uv;
in float a_terrain_id;

uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_camera_center;
uniform float u_zoom;
uniform float u_day_phase;

out vec3 v_color;
out float v_elevation;
out float v_has_resource;
out float v_day_phase;
out float v_slope;
out float v_edge_dist;
out float v_visibility;
out vec2 v_uv;
out float v_terrain_id;

void main() {
    float x = a_position.x;
    float y = a_position.y;
    float elev = a_elevation;

    // Subtle terrain animation: slight elevation wave driven by u_time
    elev += sin(u_time * 0.5 + x * 0.3 + y * 0.3) * 0.02;

    // Isometric projection
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
    v_color = a_color;
    v_elevation = elev;
    v_has_resource = a_has_resource;
    v_day_phase = u_day_phase;
    v_slope = a_slope;
    v_edge_dist = a_edge_dist;
    v_uv = a_uv;
    v_terrain_id = a_terrain_id;
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

uniform highp sampler2DArray u_terrain_textures;
uniform bool u_use_textures;
uniform vec3 u_fog_color;

out vec4 out_color;

void main() {
    // Base color: sample terrain texture or fall back to vertex color
    vec3 base_color;
    if (u_use_textures) {
        base_color = texture(u_terrain_textures, vec3(v_uv, v_terrain_id)).rgb;
    } else {
        base_color = v_color;
    }

    // Slope-based shading: steeper = darker
    float slope_shade = 1.0 - smoothstep(0.0, 0.4, v_slope) * 0.5;
    // Elevation-based shade: higher = slightly brighter
    float elev_shade = 1.0 + v_elevation * 0.1;
    float shade = slope_shade * elev_shade;

    // Day/night cycle: day_phase is 0..1, 0.0=midnight, 0.5=noon
    float day_light = 0.5 + 0.5 * sin(v_day_phase * 6.2831853);
    float ambient = 0.2 + day_light * 0.8;
    float warmth = 0.5 + day_light * 0.5;

    vec3 lit = base_color * shade * ambient;

    // Water animation: subtle wave color shift
    if (v_color.b > v_color.r && v_color.b > v_color.g) {
        float wave = 0.85 + 0.15 * sin(v_day_phase * 6.2831853 * 3.0 + v_elevation * 10.0);
        lit = lit * wave;
    }

    // Resource glow: tiles with resources get a subtle pulsing overlay
    if (v_has_resource > 0.5) {
        float pulse = 0.8 + 0.2 * sin(v_day_phase * 6.2831853 * 2.0);
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

// ── Application State ─────────────────────────────────────────────────────────

static mut APP: Option<App> = None;

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
    textures_loaded: bool,
    fog_color_loc: Option<web_sys::WebGlUniformLocation>,
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
    uvs: Vec<f32>,
    terrain_ids: Vec<f32>,
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
            uvs: Vec::new(),
            terrain_ids: Vec::new(),
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

        let position_buffer = upload_f32_buffer(&gl, &mesh.positions, 0, 2);
        let color_buffer = upload_f32_buffer(&gl, &mesh.colors, 1, 3);
        let elevation_buffer = upload_f32_buffer(&gl, &mesh.elevations, 2, 1);
        let resource_buffer = upload_f32_buffer(&gl, &mesh.has_resources, 3, 1);
        let slope_buffer = upload_f32_buffer(&gl, &mesh.slopes, 4, 1);
        let edge_buffer = upload_f32_buffer(&gl, &mesh.edge_dists, 5, 1);
        let uvs_buffer = upload_f32_buffer(&gl, &mesh.uvs, 6, 2);
        let terrain_id_buffer = upload_f32_buffer(&gl, &mesh.terrain_ids, 7, 1);
        let visibility_buffer = upload_f32_buffer(&gl, &mesh.visibilities, 8, 1);
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
        let day_phase_loc = gl
            .get_uniform_location(&program, "u_day_phase")
            .ok_or("Cannot find u_day_phase")?;

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
            textures_loaded: false,
            fog_color_loc,
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

        // ── Overlay: draw buildings and units as colored dots ─────────────
        self.render_overlay();
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
        ClayPit => [0.7, 0.5, 0.3],              // clay brown
        Brickworks => [0.8, 0.4, 0.2],           // brick red
        HempFarm => [0.3, 0.6, 0.2],             // hemp green
        Ropemaker => [0.6, 0.5, 0.3],            // rope tan
        Apiary => [0.9, 0.8, 0.2],               // honey gold
        MeadMaker => [0.7, 0.5, 0.2],             // mead amber
        Vineyard => [0.6, 0.3, 0.6],             // grape purple
        WinePress => [0.5, 0.2, 0.4],            // wine dark purple
        TempleOfBacchus => [0.8, 0.6, 0.2],      // temple gold
        Colosseum => [0.7, 0.5, 0.3],            // arena sandstone
        SanctuaryOfMinerva => [0.9, 0.8, 0.6],   // marble white
        SanctuaryOfVulcan => [0.8, 0.3, 0.1],    // forge orange-red
    }
}

/// Get the color for a unit kind (RGB, 0.0-1.0).
fn unit_color(kind: &crate::units::UnitKind) -> [f32; 3] {
    use crate::units::UnitKind::*;
    match kind {
        Settler => [0.2, 0.4, 1.0],   // blue
        Swordsman => [1.0, 0.2, 0.2], // red
        Bowman => [0.2, 0.8, 0.2],    // green
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

    // Set canvas size to fill the container
    let parent = canvas.parent_element().unwrap();
    let w = parent.client_width() as u32;
    let h = parent.client_height() as u32;
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
            let parent = canvas.parent_element().unwrap();
            let w = parent.client_width() as u32;
            let h = parent.client_height() as u32;
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
                Err(e) => format!("error: {}", e),
            }
        } else {
            String::from("error: engine not initialized")
        }
    }
}

fn parse_map_json(json: &str) -> Result<Map, String> {
    use serde_json::Value;
    let v: Value = serde_json::from_str(json).map_err(|e| format!("JSON parse error: {}", e))?;

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
/// Returns: {"Wood":100,"Stone":50,"Iron":0,"Coal":0,"Gold":0,"Grain":0,"Boards":0,...}
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

/// Get building summary as a JSON string for the HUD.
/// Returns: [{"type":"Farm","x":3,"y":3,"complete":true,"settlers":1},...]
#[wasm_bindgen]
pub fn get_building_summary() -> String {
    unsafe {
        if let Some(ref app) = APP {
            let mut parts = Vec::new();
            for b in app.game_loop.state.economy.buildings.iter() {
                parts.push(format!(
                    "{{\"type\":\"{}\",\"x\":{},\"y\":{},\"complete\":{},\"settlers\":{}}}",
                    b.kind.name(),
                    b.x,
                    b.y,
                    b.is_complete(),
                    b.assigned_settlers.len()
                ));
            }
            return format!("[{}]", parts.join(","));
        }
    }
    String::new()
}

/// Get unit summary as a JSON string for the HUD.
/// Returns: [{"id":1,"kind":"Settler","x":3.5,"y":3.5,"hp":50,"state":"Working"},...]
#[wasm_bindgen]
pub fn get_unit_summary() -> String {
    unsafe {
        if let Some(ref app) = APP {
            let mut parts = Vec::new();
            for u in app.game_loop.state.economy.units.alive_units() {
                let state_name = match u.state {
                    crate::units::UnitState::Idle => "Idle",
                    crate::units::UnitState::Moving => "Moving",
                    crate::units::UnitState::Working => "Working",
                    crate::units::UnitState::Fighting => "Fighting",
                    crate::units::UnitState::Dead => "Dead",
                };
                let tool_code = u.carried_tool.map(|tc| {
                    use crate::economy::tool_code_to_name;
                    tool_code_to_name(tc)
                }).unwrap_or("");
                parts.push(format!(
                    "{{\"id\":{},\"kind\":\"{}\",\"x\":{:.1},\"y\":{:.1},\"hp\":{},\"state\":\"{}\",\"carried_tool\":\"{}\"}}",
                    u.id,
                    u.kind.name(),
                    u.x,
                    u.y,
                    u.hp,
                    state_name,
                    tool_code
                ));
            }
            return format!("[{}]", parts.join(","));
        }
    }
    String::new()
}

/// Get detailed building info by index.
/// Returns JSON: {"kind":"Farm","x":3,"y":3,"construction":1.0,"complete":true,
///   "active":true,"settlers":[1],"max_settlers":1,
///   "build_ticks":20,"production_interval":20,"inputs":[["Wood",2]],
///   "outputs":[["Boards",1]],"output_buffer":{"Boards":5}}
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
                    r#"{{"kind":"{}","x":{},"y":{},"construction":{},"constructed_pct":{},"complete":{},"active":{},"settlers":[{}],"max_settlers":{},"build_ticks":{},"production_interval":{},"inputs":[{}],"outputs":[{}],"output_buffer":{{{}}}}}{}"#,
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
                if !u.is_alive() {
                    return format!(r#"{{"error":"Unit {} is dead"}}"#, id);
                }
                let state_name = match u.state {
                    crate::units::UnitState::Idle => "Idle",
                    crate::units::UnitState::Moving => "Moving",
                    crate::units::UnitState::Working => "Working",
                    crate::units::UnitState::Fighting => "Fighting",
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
                return format!(
                    r#"{{"id":{},"kind":"{}","x":{:.1},"y":{:.1},"hp":{},"max_hp":{},"state":"{}","assigned_building":{},"target":{},"carried_tool":"{}"}}"#,
                    u.id,
                    u.kind.name(),
                    u.x,
                    u.y,
                    u.hp,
                    u.max_hp,
                    state_name,
                    ab,
                    target,
                    tool_name,
                );
            }
        }
    }
    format!(r#"{{"error":"Unit {} not found"}}"#, id)
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
            let economy = crate::economy::Economy::with_starting_resources(&resources);
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

            app.overlay_dirty = true;
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
                let state_name = match u.state {
                    crate::units::UnitState::Idle => "Idle",
                    crate::units::UnitState::Moving => "Moving",
                    crate::units::UnitState::Working => "Working",
                    crate::units::UnitState::Fighting => "Fighting",
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
                    r#"{{"id":{},"kind":"{}","x":{},"y":{},"hp":{},"max_hp":{},"state":"{}","assigned_building":{},"target":{}}}"#,
                    u.id, u.kind.name(), u.x, u.y, u.hp, u.max_hp, state_name, ab, tgt
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
            ClayPit,
            Brickworks,
            HempFarm,
            Ropemaker,
            Apiary,
            MeadMaker,
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

        let vertex_count = mesh.positions.len() / 2;
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
            let x = mesh.positions[v * 2] as usize;
            let y = mesh.positions[v * 2 + 1] as usize;
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
}
