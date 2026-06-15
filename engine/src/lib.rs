//! S4WN Engine — Siedler 4 Web-Native
//!
//! Phase 1: Isometric map rendering + camera controls.
//! Full WASM + WebGL2 pipeline with generated terrain maps,
//! smooth camera pan (mouse drag) and zoom (scroll wheel).

pub mod map;
pub mod camera;
pub mod game_loop;
pub mod ara_crypt;
pub mod decompress;
pub mod economy;

use camera::Camera;
use game_loop::{GameLoop, GameState};
use map::{Map, Terrain};
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

uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_camera_center;
uniform float u_zoom;
uniform float u_day_phase;

out vec3 v_color;
out float v_elevation;
out float v_has_resource;
out float v_day_phase;

void main() {
    float x = a_position.x;
    float y = a_position.y;
    float elev = a_elevation;

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
}
"#;

const FRAGMENT_SHADER: &str = r#"#version 300 es
precision highp float;

in vec3 v_color;
in float v_elevation;
in float v_has_resource;
in float v_day_phase;

out vec4 out_color;

void main() {
    // Elevation-based shade
    float shade = 1.0 - v_elevation * 0.15;

    // Day/night cycle: day_phase is 0..1, 0.0=midnight, 0.5=noon
    // Use a smooth sine wave for daylight
    float day_light = 0.5 + 0.5 * sin(v_day_phase * 6.2831853);
    float ambient = 0.2 + day_light * 0.8; // 0.2 min, 1.0 max
    float warmth = 0.5 + day_light * 0.5; // warmer during day

    vec3 lit = v_color * shade * ambient;

    // Resource glow: tiles with resources get a subtle pulsing overlay
    if (v_has_resource > 0.5) {
        float pulse = 0.8 + 0.2 * sin(v_day_phase * 6.2831853 * 2.0);
        vec3 glow = vec3(0.9, 0.85, 0.3) * 0.15 * pulse;
        lit = lit + glow;
    }

    // Add warmth tint
    lit = mix(lit * 0.7, lit, warmth);

    out_color = vec4(lit, 1.0);
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
}

// ── Mesh Data ─────────────────────────────────────────────────────────────────

struct MeshData {
    positions: Vec<f32>,
    colors: Vec<f32>,
    elevations: Vec<f32>,
    has_resources: Vec<f32>,
    indices: Vec<u16>,
}

impl MeshData {
    fn new() -> Self {
        MeshData {
            positions: Vec::new(),
            colors: Vec::new(),
            elevations: Vec::new(),
            has_resources: Vec::new(),
            indices: Vec::new(),
        }
    }
}

fn build_map_mesh(map: &Map, camera: &Camera) -> MeshData {
    let mut mesh = MeshData::new();
    let (min_x, max_x, min_y, max_y) = camera.visible_bounds(map.width, map.height);

    // Expand a bit to avoid pop-in at edges
    let extra = 2usize;
    let min_x = min_x.saturating_sub(extra);
    let max_x = (max_x + extra).min(map.width.saturating_sub(1));
    let min_y = min_y.saturating_sub(extra);
    let max_y = (max_y + extra).min(map.height.saturating_sub(1));

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
            let has_res = if tile.resource.is_some() { 1.0f32 } else { 0.0f32 };
            mesh.has_resources.push(has_res);

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
        let frag = compile_shader(&gl, WebGl2RenderingContext::FRAGMENT_SHADER, FRAGMENT_SHADER)?;
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
        let index_buffer = gl.create_buffer().ok_or("Cannot create index buffer")?;
        gl.bind_buffer(WebGl2RenderingContext::ELEMENT_ARRAY_BUFFER, Some(&index_buffer));
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
        let day_phase_loc = gl
            .get_uniform_location(&program, "u_day_phase")
            .ok_or("Cannot find u_day_phase")?;

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

        // Run game logic ticks (fixed timestep)
        let _ticks = self.game_loop.frame(elapsed);

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

        gl.use_program(Some(&self.program));

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
    }

    fn rebuild_mesh(&mut self) {
        let mesh = build_map_mesh(&self.map, &self.camera);

        let gl = &self.gl;
        gl.bind_buffer(WebGl2RenderingContext::ARRAY_BUFFER, Some(&self.position_buffer));
        update_f32_buffer(gl, &mesh.positions);

        gl.bind_buffer(WebGl2RenderingContext::ARRAY_BUFFER, Some(&self.color_buffer));
        update_f32_buffer(gl, &mesh.colors);

        gl.bind_buffer(WebGl2RenderingContext::ARRAY_BUFFER, Some(&self.elevation_buffer));
        update_f32_buffer(gl, &mesh.elevations);

        gl.bind_buffer(WebGl2RenderingContext::ARRAY_BUFFER, Some(&self.resource_buffer));
        update_f32_buffer(gl, &mesh.has_resources);

        gl.bind_buffer(WebGl2RenderingContext::ELEMENT_ARRAY_BUFFER, Some(&self.index_buffer));
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
    gl.vertex_attrib_pointer_with_i32(location, components, WebGl2RenderingContext::FLOAT, false, 0, 0);
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

/// Render one frame. Call this from requestAnimationFrame.
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
            let canvas = app.gl.canvas().unwrap().dyn_into::<HtmlCanvasElement>().unwrap();
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
            let mut data = Vec::with_capacity(4 + w * h);
            data.push((w & 0xFF) as u8);
            data.push((w >> 8) as u8);
            data.push((h & 0xFF) as u8);
            data.push((h >> 8) as u8);
            for y in 0..h {
                for x in 0..w {
                    data.push(app.map.get(x, y).unwrap().terrain as u8);
                }
            }
            return data;
        }
    }
    Vec::new()
}
#[wasm_bindgen]
pub fn get_tile_at(x: f32, y: f32) -> String {
    unsafe {
        if let Some(ref app) = APP {
            let (wx, wy) = app.camera.screen_to_world(x, y);
            let tx = wx.floor() as isize;
            let ty = wy.floor() as isize;

            if tx >= 0 && ty >= 0 && (tx as usize) < app.map.width && (ty as usize) < app.map.height {
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

// ── Tests ──────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_shader_constants() {
        assert!(VERTEX_SHADER.contains("a_position"));
        assert!(FRAGMENT_SHADER.contains("out_color"));
        assert!(VERTEX_SHADER.contains("u_camera_center"));
        assert!(VERTEX_SHADER.contains("u_zoom"));
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
}
