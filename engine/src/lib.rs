//! S4WN Engine — Siedler 4 Web-Native
//!
//! Hello World POC: WebGL2 rendering of an isometric-style grid.
//! This demonstrates the full WASM + WebGL pipeline:
//!   - WASM module initialization
//!   - WebGL2 context setup (shaders, buffers, uniforms)
//!   - Animation loop via requestAnimationFrame
//!   - Window resize handling

use wasm_bindgen::prelude::*;
use web_sys::{
    WebGl2RenderingContext, WebGlProgram, WebGlShader, WebGlBuffer,
    WebGlVertexArrayObject, HtmlCanvasElement, window,
};

// ── Constants ──────────────────────────────────────────────────────────────────

const VERTEX_SHADER: &str = r#"#version 300 es
precision highp float;

in vec2 a_position;
in vec3 a_color;
in float a_elevation;

uniform vec2 u_resolution;
uniform float u_time;

out vec3 v_color;
out float v_elevation;

void main() {
    float x = a_position.x;
    float y = a_position.y;
    float elev = a_elevation;

    // Isometric projection
    float iso_x = (x - y) * 0.866;  // cos(30°)
    float iso_y = (x + y) * 0.5 - elev * 0.3;

    // Convert to clip space
    vec2 clip = (vec2(iso_x, iso_y) / u_resolution) * 2.0 - 1.0;
    clip.y = -clip.y;  // Flip Y

    // Gentle wave animation
    clip.y += sin(iso_x * 2.0 + u_time) * 0.02;

    gl_Position = vec4(clip, 0.0, 1.0);
    v_color = a_color;
    v_elevation = elev;
}
"#;

const FRAGMENT_SHADER: &str = r#"#version 300 es
precision highp float;

in vec3 v_color;
in float v_elevation;
out vec4 out_color;

void main() {
    float shade = 1.0 - v_elevation * 0.15;
    out_color = vec4(v_color * shade, 1.0);
}
"#;

// ── Application State ─────────────────────────────────────────────────────────

static mut APP: Option<App> = None;

struct App {
    gl: WebGl2RenderingContext,
    program: WebGlProgram,
    vao: WebGlVertexArrayObject,
    #[allow(dead_code)]
    position_buffer: WebGlBuffer,
    #[allow(dead_code)]
    color_buffer: WebGlBuffer,
    _elevation_buffer: WebGlBuffer,
    #[allow(dead_code)]
    index_buffer: WebGlBuffer,
    resolution_loc: web_sys::WebGlUniformLocation,
    time_loc: web_sys::WebGlUniformLocation,
    index_count: i32,
    start_time: f64,
}

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

        // Build isometric grid mesh
        let grid_size: i32 = 8;
        let mut positions: Vec<f32> = Vec::new();
        let mut colors: Vec<f32> = Vec::new();
        let mut elevations: Vec<f32> = Vec::new();
        let mut indices: Vec<u16> = Vec::new();

        // S4WN brand colors + terrain palette
        let terrain_colors: [[f32; 3]; 4] = [
            [0.25, 0.60, 0.25], // grass green
            [0.55, 0.45, 0.20], // earth brown
            [0.20, 0.55, 0.20], // forest green
            [0.85, 0.75, 0.40], // wheat yellow
        ];

        for row in 0..=grid_size {
            for col in 0..=grid_size {
                let x = (col as f32 - grid_size as f32 * 0.5) * 0.8;
                let y = (row as f32 - grid_size as f32 * 0.5) * 0.8;
                let elev = ((row as f32 * 0.7).sin() * (col as f32 * 0.9).cos()) * 0.4 + 0.3;

                positions.push(x);
                positions.push(y);

                let color_idx = ((row + col) % 4) as usize;
                colors.push(terrain_colors[color_idx][0]);
                colors.push(terrain_colors[color_idx][1]);
                colors.push(terrain_colors[color_idx][2]);

                elevations.push(elev);

                // Build triangle strip indices (grid LOD)
                if row < grid_size && col < grid_size {
                    let tl = (row * (grid_size + 1) + col) as u16;
                    let tr = tl + 1;
                    let bl = tl + (grid_size + 1) as u16;
                    let br = bl + 1;

                    // Two triangles per quad
                    indices.extend_from_slice(&[tl, bl, tr, tr, bl, br]);
                }
            }
        }

        // Upload buffers
        let vao = gl.create_vertex_array().ok_or("Cannot create VAO")?;
        gl.bind_vertex_array(Some(&vao));

        let position_buffer = upload_f32_buffer(&gl, &positions, 0, 2);
        let color_buffer = upload_f32_buffer(&gl, &colors, 1, 3);
        let _elevation_buffer = upload_f32_buffer(&gl, &elevations, 2, 1);
        let index_buffer = gl.create_buffer().ok_or("Cannot create index buffer")?;
        gl.bind_buffer(WebGl2RenderingContext::ELEMENT_ARRAY_BUFFER, Some(&index_buffer));
        unsafe {
            let view = js_sys::Uint16Array::view(&indices);
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
            _elevation_buffer,
            index_buffer,
            resolution_loc,
            time_loc,
            index_count: indices.len() as i32,
            start_time,
        })
    }

    fn resize(&self, width: u32, height: u32) {
        self.gl.viewport(0, 0, width as i32, height as i32);
    }

    fn render(&self, now: f64) {
        let gl = &self.gl;
        let elapsed = (now - self.start_time) / 1000.0; // seconds

        gl.clear_color(0.08, 0.12, 0.25, 1.0); // Dark slate blue
        gl.clear(WebGl2RenderingContext::COLOR_BUFFER_BIT);

        gl.use_program(Some(&self.program));
        gl.uniform1f(Some(&self.time_loc), elapsed as f32);

        let canvas = gl
            .canvas()
            .unwrap()
            .dyn_into::<HtmlCanvasElement>()
            .unwrap();
        gl.uniform2f(
            Some(&self.resolution_loc),
            canvas.width() as f32 * 0.5,
            canvas.height() as f32 * 0.35,
        );

        gl.bind_vertex_array(Some(&self.vao));
        gl.draw_elements_with_i32(
            WebGl2RenderingContext::TRIANGLES,
            self.index_count,
            WebGl2RenderingContext::UNSIGNED_SHORT,
            0,
        );
    }
}

// ── Helper Functions ───────────────────────────────────────────────────────────

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

    let app = App::new(&canvas)?;
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
        if let Some(ref app) = APP {
            app.render(timestamp);
        }
    }
}

/// Handle window/canvas resize.
#[wasm_bindgen]
pub fn resize() {
    unsafe {
        if let Some(ref app) = APP {
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

// ── Tests ──────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    // WebGL tests require a browser context — run via wasm-bindgen-test
    #[test]
    fn test_constants() {
        assert!(super::VERTEX_SHADER.contains("a_position"));
        assert!(super::FRAGMENT_SHADER.contains("out_color"));
    }
}
