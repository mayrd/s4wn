//! 3D Model Loading & Mesh Data
//!
//! Phase 5 Step 7: OBJ parser + JSON model format + model instance rendering.
//! Phase 7.1: per-building material colors + texture UVs.

use std::collections::HashMap;


/// Material parameters for PBR-like rendering.
#[derive(Debug, Clone, PartialEq)]
pub struct Material {
    /// Diffuse/albedo color (RGB, 0.0–1.0)
    pub diffuse: [f32; 3],
    /// Surface roughness (0.0 = mirror, 1.0 = matte)
    pub roughness: f32,
    /// Metallic factor (0.0 = dielectric, 1.0 = metal)
    pub metallic: f32,
}

impl Default for Material {
    fn default() -> Self {
        Material {
            diffuse: [0.55, 0.50, 0.45],
            roughness: 0.7,
            metallic: 0.05,
        }
    }
}

/// A single 3D model loaded from OBJ or JSON.
#[derive(Debug, Clone, PartialEq)]
pub struct ModelMesh {
    pub positions: Vec<f32>,
    pub normals: Vec<f32>,
    pub uvs: Vec<f32>,
    pub indices: Vec<u16>,
    pub vertex_count: usize,
    pub triangle_count: usize,
    pub aabb: (f32, f32, f32, f32, f32, f32),
    pub material: Material,
}

impl ModelMesh {
    pub fn empty() -> Self {
        ModelMesh {
            positions: Vec::new(),
            normals: Vec::new(),
            uvs: Vec::new(),
            indices: Vec::new(),
            vertex_count: 0,
            triangle_count: 0,
            aabb: (0.0, 0.0, 0.0, 0.0, 0.0, 0.0),
            material: Material::default(),
        }
    }

    pub fn is_empty(&self) -> bool {
        self.indices.is_empty()
    }
}

/// Parse a Wavefront OBJ string (triangular faces only).
pub fn parse_obj(src: &str) -> ModelMesh {
    let mut positions: Vec<[f32; 3]> = Vec::new();
    let mut raw_faces: Vec<[usize; 3]> = Vec::new();

    for line in src.lines() {
        let line = line.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }
        let mut parts = line.split_whitespace();
        match parts.next() {
            Some("v") => {
                let x: f32 = parts.next().and_then(|s| s.parse().ok()).unwrap_or(0.0);
                let y: f32 = parts.next().and_then(|s| s.parse().ok()).unwrap_or(0.0);
                let z: f32 = parts.next().and_then(|s| s.parse().ok()).unwrap_or(0.0);
                positions.push([x, y, z]);
            }
            Some("f") => {
                let verts: Vec<&str> = parts.collect();
                if verts.len() >= 3 {
                    let i0 = parse_obj_index(verts[0]);
                    let i1 = parse_obj_index(verts[1]);
                    let i2 = parse_obj_index(verts[2]);
                    if let (Some(a), Some(b), Some(c)) = (i0, i1, i2) {
                        raw_faces.push([a, b, c]);
                    }
                }
            }
            _ => {}
        }
    }

    if positions.is_empty() || raw_faces.is_empty() {
        return ModelMesh::empty();
    }

    let vertex_count = positions.len();
    let mut normal_acc: Vec<[f32; 3]> = vec![[0.0, 0.0, 0.0]; vertex_count];
    let mut normal_count: Vec<u32> = vec![0; vertex_count];

    for face in &raw_faces {
        let p0 = positions[face[0]];
        let p1 = positions[face[1]];
        let p2 = positions[face[2]];
        let n = face_normal(p0, p1, p2);
        for &vi in face {
            normal_acc[vi][0] += n[0];
            normal_acc[vi][1] += n[1];
            normal_acc[vi][2] += n[2];
            normal_count[vi] += 1;
        }
    }

    let mut normals: Vec<f32> = Vec::with_capacity(vertex_count * 3);
    for i in 0..vertex_count {
        let count = normal_count[i].max(1) as f32;
        let nx = normal_acc[i][0] / count;
        let ny = normal_acc[i][1] / count;
        let nz = normal_acc[i][2] / count;
        let len = (nx * nx + ny * ny + nz * nz).sqrt();
        if len > 1e-8 {
            normals.push(nx / len);
            normals.push(ny / len);
            normals.push(nz / len);
        } else {
            normals.push(0.0);
            normals.push(1.0);
            normals.push(0.0);
        }
    }

    let mut out_positions: Vec<f32> = Vec::with_capacity(vertex_count * 3);
    for p in &positions {
        out_positions.push(p[0]);
        out_positions.push(p[1]);
        out_positions.push(p[2]);
    }

    let uvs: Vec<f32> = vec![0.0; vertex_count * 2];

    let mut indices: Vec<u16> = Vec::with_capacity(raw_faces.len() * 3);
    for face in &raw_faces {
        indices.push(face[0] as u16);
        indices.push(face[1] as u16);
        indices.push(face[2] as u16);
    }

    let mut aabb_min = [f32::MAX; 3];
    let mut aabb_max = [f32::MIN; 3];
    for p in &positions {
        for j in 0..3 {
            aabb_min[j] = aabb_min[j].min(p[j]);
            aabb_max[j] = aabb_max[j].max(p[j]);
        }
    }

    ModelMesh {
        positions: out_positions,
        normals,
        uvs,
        indices,
        vertex_count,
        triangle_count: raw_faces.len(),
        aabb: (
            aabb_min[0], aabb_min[1], aabb_min[2],
            aabb_max[0], aabb_max[1], aabb_max[2],
        ),
        material: Material::default(),
    }
}

fn parse_obj_index(s: &str) -> Option<usize> {
    let vertex_str = s.split('/').next().unwrap_or(s);
    vertex_str.parse::<usize>().ok().map(|i| i - 1)
}

fn face_normal(p0: [f32; 3], p1: [f32; 3], p2: [f32; 3]) -> [f32; 3] {
    let ux = p1[0] - p0[0];
    let uy = p1[1] - p0[1];
    let uz = p1[2] - p0[2];
    let vx = p2[0] - p0[0];
    let vy = p2[1] - p0[1];
    let vz = p2[2] - p0[2];
    [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx]
}

#[derive(Debug, Default)]
pub struct ModelRegistry {
    models: HashMap<String, ModelMesh>,
}

impl ModelRegistry {
    pub fn new() -> Self {
        ModelRegistry { models: HashMap::new() }
    }
    pub fn insert(&mut self, name: &str, mesh: ModelMesh) {
        self.models.insert(name.to_string(), mesh);
    }
    pub fn get(&self, name: &str) -> Option<&ModelMesh> {
        self.models.get(name)
    }
    pub fn len(&self) -> usize { self.models.len() }
    pub fn is_empty(&self) -> bool { self.models.is_empty() }
    pub fn remove(&mut self, name: &str) -> Option<ModelMesh> { self.models.remove(name) }
    pub fn clear(&mut self) { self.models.clear(); }
    pub fn names(&self) -> impl Iterator<Item = &str> { self.models.keys().map(|s| s.as_str()) }
}


// ── Manual JSON Parser for Model Mesh ──────────────────────────────────────────

/// Lightweight JSON parser for the fixed model mesh schema.
/// Handles objects, arrays, strings, and numbers. No serde dependency needed.
struct JsonParser<'a> {
    bytes: &'a [u8],
    pos: usize,
}

impl<'a> JsonParser<'a> {
    fn new(src: &'a str) -> Self {
        JsonParser { bytes: src.as_bytes(), pos: 0 }
    }

    fn peek(&self) -> Option<u8> {
        self.bytes.get(self.pos).copied()
    }

    fn skip_ws(&mut self) {
        while self.pos < self.bytes.len() {
            match self.bytes[self.pos] {
                b' ' | b'\t' | b'\n' | b'\r' => self.pos += 1,
                _ => break,
            }
        }
    }

    fn expect(&mut self, ch: u8) -> Result<(), String> {
        self.skip_ws();
        if self.peek() == Some(ch) {
            self.pos += 1;
            Ok(())
        } else {
            Err(format!("expected '{}' at pos {}, got {:?}", ch as char, self.pos,
                self.peek().map(|c| c as char)))
        }
    }

    fn read_string(&mut self) -> Result<String, String> {
        self.expect(b'"')?;
        let start = self.pos;
        while self.pos < self.bytes.len() {
            match self.bytes[self.pos] {
                b'"' => {
                    let s = std::str::from_utf8(&self.bytes[start..self.pos])
                        .map_err(|e| format!("invalid UTF-8: {}", e))?;
                    self.pos += 1;
                    return Ok(s.to_string());
                }
                b'\\' => {
                    // Skip escaped character (not needed for field names)
                    self.pos += 2;
                }
                _ => self.pos += 1,
            }
        }
        Err("unterminated string".to_string())
    }

    fn read_number(&mut self) -> Result<f64, String> {
        self.skip_ws();
        let start = self.pos;
        // Optional minus
        if self.peek() == Some(b'-') { self.pos += 1; }
        // Integer part
        while self.pos < self.bytes.len() && self.bytes[self.pos].is_ascii_digit() {
            self.pos += 1;
        }
        // Optional fractional part
        if self.peek() == Some(b'.') {
            self.pos += 1;
            while self.pos < self.bytes.len() && self.bytes[self.pos].is_ascii_digit() {
                self.pos += 1;
            }
        }
        // Optional exponent
        if self.peek() == Some(b'e') || self.peek() == Some(b'E') {
            self.pos += 1;
            if self.peek() == Some(b'+') || self.peek() == Some(b'-') {
                self.pos += 1;
            }
            while self.pos < self.bytes.len() && self.bytes[self.pos].is_ascii_digit() {
                self.pos += 1;
            }
        }
        if self.pos == start {
            return Err("expected number".to_string());
        }
        let s = std::str::from_utf8(&self.bytes[start..self.pos])
            .map_err(|e| format!("invalid UTF-8 in number: {}", e))?;
        s.parse::<f64>().map_err(|e| format!("invalid number '{}': {}", s, e))
    }

    fn read_f32(&mut self) -> Result<f32, String> {
        Ok(self.read_number()? as f32)
    }

    fn read_u32(&mut self) -> Result<u32, String> {
        let n = self.read_number()?;
        Ok(n as u32)
    }

    fn read_u16(&mut self) -> Result<u16, String> {
        let n = self.read_number()?;
        Ok(n as u16)
    }

    fn read_array_3f32(&mut self) -> Result<[f32; 3], String> {
        self.expect(b'[')?;
        let x = self.read_f32()?;
        self.expect(b',')?;
        let y = self.read_f32()?;
        self.expect(b',')?;
        let z = self.read_f32()?;
        self.expect(b']')?;
        Ok([x, y, z])
    }

    fn read_array_2f32(&mut self) -> Result<[f32; 2], String> {
        self.expect(b'[')?;
        let u = self.read_f32()?;
        self.expect(b',')?;
        let v = self.read_f32()?;
        self.expect(b']')?;
        Ok([u, v])
    }

    fn read_array_6f32(&mut self) -> Result<[f32; 6], String> {
        self.expect(b'[')?;
        let v0 = self.read_f32()?;
        self.expect(b',')?;
        let v1 = self.read_f32()?;
        self.expect(b',')?;
        let v2 = self.read_f32()?;
        self.expect(b',')?;
        let v3 = self.read_f32()?;
        self.expect(b',')?;
        let v4 = self.read_f32()?;
        self.expect(b',')?;
        let v5 = self.read_f32()?;
        self.expect(b']')?;
        Ok([v0, v1, v2, v3, v4, v5])
    }

    fn read_material(&mut self) -> Result<Material, String> {
        self.expect(b'{')?;
        let key = self.read_string()?;
        if key != "diffuse" {
            return Err(format!("expected \"diffuse\" in material, got \"{}\"", key));
        }
        self.expect(b':')?;
        self.expect(b'[')?;
        let r = self.read_f32()?;
        self.expect(b',')?;
        let g = self.read_f32()?;
        self.expect(b',')?;
        let b = self.read_f32()?;
        self.expect(b']')?;

        self.expect(b',')?;
        let roughness_key = self.read_string()?;
        if roughness_key != "roughness" {
            return Err(format!("expected \"roughness\", got \"{}\"", roughness_key));
        }
        self.expect(b':')?;
        let roughness = self.read_f32()?;

        self.expect(b',')?;
        let metallic_key = self.read_string()?;
        if metallic_key != "metallic" {
            return Err(format!("expected \"metallic\", got \"{}\"", metallic_key));
        }
        self.expect(b':')?;
        let metallic = self.read_f32()?;

        self.expect(b'}')?;
        Ok(Material { diffuse: [r, g, b], roughness, metallic })
    }
}

/// Parse a JSON mesh string into a ModelMesh using a manual parser (no serde).
pub fn parse_json_mesh(src: &str) -> Result<ModelMesh, String> {
    let mut p = JsonParser::new(src);
    p.expect(b'{')?;

    // Read version
    let version_key = p.read_string()?;
    if version_key != "version" {
        return Err(format!("expected \"version\" field, got \"{}\"", version_key));
    }
    p.expect(b':')?;
    let version = p.read_u32()?;

    if version != 1 {
        return Err(format!("unsupported version: {}", version));
    }

    // Read vertices
    p.expect(b',')?;
    let vtx_key = p.read_string()?;
    if vtx_key != "vertices" {
        return Err(format!("expected \"vertices\" field, got \"{}\"", vtx_key));
    }
    p.expect(b':')?;
    p.expect(b'[')?;
    let mut vertices: Vec<[f32; 3]> = Vec::new();
    if p.peek() != Some(b']') {
        loop {
            vertices.push(p.read_array_3f32()?);
            p.skip_ws();
            if p.peek() == Some(b',') {
                p.pos += 1;
            } else {
                break;
            }
        }
    }
    p.expect(b']')?;

    // Read normals
    p.expect(b',')?;
    let n_key = p.read_string()?;
    if n_key != "normals" {
        return Err(format!("expected \"normals\" field, got \"{}\"", n_key));
    }
    p.expect(b':')?;
    p.expect(b'[')?;
    let mut normals_vec: Vec<[f32; 3]> = Vec::new();
    if p.peek() != Some(b']') {
        loop {
            normals_vec.push(p.read_array_3f32()?);
            p.skip_ws();
            if p.peek() == Some(b',') {
                p.pos += 1;
            } else {
                break;
            }
        }
    }
    p.expect(b']')?;

    // Read uvs
    p.expect(b',')?;
    let uv_key = p.read_string()?;
    if uv_key != "uvs" {
        return Err(format!("expected \"uvs\" field, got \"{}\"", uv_key));
    }
    p.expect(b':')?;
    p.expect(b'[')?;
    let mut uvs_vec: Vec<[f32; 2]> = Vec::new();
    if p.peek() != Some(b']') {
        loop {
            uvs_vec.push(p.read_array_2f32()?);
            p.skip_ws();
            if p.peek() == Some(b',') {
                p.pos += 1;
            } else {
                break;
            }
        }
    }
    p.expect(b']')?;

    // Read indices
    p.expect(b',')?;
    let idx_key = p.read_string()?;
    if idx_key != "indices" {
        return Err(format!("expected \"indices\" field, got \"{}\"", idx_key));
    }
    p.expect(b':')?;
    p.expect(b'[')?;
    let mut indices_vec: Vec<u16> = Vec::new();
    if p.peek() != Some(b']') {
        loop {
            indices_vec.push(p.read_u16()?);
            p.skip_ws();
            if p.peek() == Some(b',') {
                p.pos += 1;
            } else {
                break;
            }
        }
    }
    p.expect(b']')?;

    // Read aabb
    p.expect(b',')?;
    let aabb_key = p.read_string()?;
    if aabb_key != "aabb" {
        return Err(format!("expected \"aabb\" field, got \"{}\"", aabb_key));
    }
    p.expect(b':')?;
    let aabb = p.read_array_6f32()?;

    // Optional material field
    let material: Material;
    p.skip_ws();
    if p.peek() == Some(b',') {
        p.pos += 1;
        p.skip_ws();
        let mat_key = p.read_string()?;
        if mat_key == "material" {
            p.expect(b':')?;
            material = p.read_material()?;
        } else {
            return Err(format!("expected \"material\" field, got \"{}\"", mat_key));
        }
    } else {
        material = Material::default();
    }

    p.expect(b'}')?;

    if vertices.is_empty() || indices_vec.is_empty() {
        return Ok(ModelMesh::empty());
    }

    let vertex_count = vertices.len();
    let mut positions: Vec<f32> = Vec::with_capacity(vertex_count * 3);
    for v in &vertices {
        positions.push(v[0]);
        positions.push(v[1]);
        positions.push(v[2]);
    }

    let mut normals: Vec<f32> = Vec::with_capacity(vertex_count * 3);
    if normals_vec.len() == vertex_count {
        for n in &normals_vec {
            let len = (n[0] * n[0] + n[1] * n[1] + n[2] * n[2]).sqrt();
            if len > 1e-8 {
                normals.push(n[0] / len);
                normals.push(n[1] / len);
                normals.push(n[2] / len);
            } else {
                normals.push(0.0);
                normals.push(1.0);
                normals.push(0.0);
            }
        }
    } else {
        // Generate flat normals if not provided
        for _ in 0..vertex_count {
            normals.push(0.0);
            normals.push(1.0);
            normals.push(0.0);
        }
    }

    let mut uvs: Vec<f32> = Vec::with_capacity(vertex_count * 2);
    if uvs_vec.len() == vertex_count {
        for uv in &uvs_vec {
            uvs.push(uv[0]);
            uvs.push(uv[1]);
        }
    } else {
        for _ in 0..vertex_count {
            uvs.push(0.0);
            uvs.push(0.0);
        }
    }

    let triangle_count = indices_vec.len() / 3;

    Ok(ModelMesh {
        positions,
        normals,
        uvs,
        indices: indices_vec,
        vertex_count,
        triangle_count,
        aabb: (
            aabb[0], aabb[1], aabb[2],
            aabb[3], aabb[4], aabb[5],
        ),
        material,
    })
}

// ── Model Instance Rendering ─────────────────────────────────────────────────

/// A placed instance of a model in the world.
/// Used for buildings, units, and resource objects.
#[derive(Debug, Clone, PartialEq)]
pub struct ModelInstance {
    /// World-space X position (tile coordinates)
    pub x: f32,
    /// World-space Y position (tile coordinates)
    pub y: f32,
    /// Scale factor (1.0 = default size)
    pub scale: f32,
    /// Rotation around Y axis in degrees
    pub rotation_y: f32,
    /// Model type index (into MODEL_NAME_BY_ID lookup table)
    pub model_id: u8,
    /// Animation phase offset (radians). Used for unit idle wobble.
    /// Buildings use 0.0 (no wobble).
    pub anim_phase: f32,
}

impl ModelInstance {
    pub fn new(model_id: u8, x: f32, y: f32) -> Self {
        ModelInstance {
            x,
            y,
            scale: 1.0,
            rotation_y: 0.0,
            model_id,
            anim_phase: 0.0,
        }
    }

    pub fn with_scale(mut self, scale: f32) -> Self {
        self.scale = scale;
        self
    }

    pub fn with_rotation_y(mut self, degrees: f32) -> Self {
        self.rotation_y = degrees;
        self
    }

    pub fn with_anim_phase(mut self, phase: f32) -> Self {
        self.anim_phase = phase;
        self
    }
}

/// Maximum distance (in tile units) from camera before building model instances are culled.
/// Buildings beyond this distance are not rendered (performance optimization).
pub const MODEL_CULL_DISTANCE: f32 = 80.0;

/// Returns true if a model instance at (inst_x, inst_y) should be culled
/// based on its distance from the camera at (cam_x, cam_z).
/// Uses squared distance comparison for efficiency (avoids sqrt).
pub fn is_model_culled(inst_x: f32, inst_y: f32, cam_x: f32, cam_z: f32) -> bool {
    let dx = inst_x - cam_x;
    let dy = inst_y - cam_z;
    let dist_sq = dx * dx + dy * dy;
    dist_sq > MODEL_CULL_DISTANCE * MODEL_CULL_DISTANCE
}

/// Compute a 4x4 model-view-projection matrix for a model instance.
/// Returns column-major array of 16 floats.
pub fn compute_mvp(
    instance: &ModelInstance,
    view: &[f32; 16],
    projection: &[f32; 16],
) -> [f32; 16] {
    // Build model matrix: scale * rotation_y * translation
    let s = instance.scale;
    let ry = instance.rotation_y.to_radians();
    let cos_y = ry.cos();
    let sin_y = ry.sin();
    let tx = instance.x;
    let ty = 0.0; // models sit on ground plane
    let tz = instance.y;

    // Model matrix (column-major)
    let model: [f32; 16] = [
        s * cos_y, 0.0, s * sin_y, 0.0,
        0.0, s, 0.0, 0.0,
        -s * sin_y, 0.0, s * cos_y, 0.0,
        tx, ty, tz, 1.0,
    ];

    // MVP = Projection * View * Model
    let mv = mat4_mul(view, &model);
    mat4_mul(projection, &mv)
}

/// Column-major 4x4 matrix multiplication: C = A * B
pub fn mat4_mul(a: &[f32; 16], b: &[f32; 16]) -> [f32; 16] {
    let mut c = [0.0f32; 16];
    for row in 0..4 {
        for col in 0..4 {
            let mut sum = 0.0f32;
            for k in 0..4 {
                sum += a[row + k * 4] * b[k + col * 4];
            }
            c[row + col * 4] = sum;
        }
    }
    c
}

/// Create a perspective projection matrix (column-major, GL convention).
pub fn perspective(fov_degrees: f32, aspect: f32, near: f32, far: f32) -> [f32; 16] {
    let fov = fov_radians(fov_degrees);
    let f = 1.0 / (fov * 0.5).tan();
    let range_inv = 1.0 / (near - far);
    [
        f / aspect, 0.0, 0.0, 0.0,
        0.0, f, 0.0, 0.0,
        0.0, 0.0, (near + far) * range_inv, -1.0,
        0.0, 0.0, 2.0 * near * far * range_inv, 0.0,
    ]
}

/// Create a LookAt view matrix (column-major, GL convention).
pub fn look_at(eye: &[f32; 3], target: &[f32; 3], up: &[f32; 3]) -> [f32; 16] {
    let f = normalize3(target[0] - eye[0], target[1] - eye[1], target[2] - eye[2]);
    let s = normalize3(
        f[1] * up[2] - f[2] * up[1],
        f[2] * up[0] - f[0] * up[2],
        f[0] * up[1] - f[1] * up[0],
    );
    let u = [
        s[1] * f[2] - s[2] * f[1],
        s[2] * f[0] - s[0] * f[2],
        s[0] * f[1] - s[1] * f[0],
    ];

    [
        s[0], u[0], -f[0], 0.0,
        s[1], u[1], -f[1], 0.0,
        s[2], u[2], -f[2], 0.0,
        -dot3(&s, eye), -dot3(&u, eye), dot3(&f, eye), 1.0,
    ]
}

fn dot3(a: &[f32; 3], b: &[f32; 3]) -> f32 {
    a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

fn normalize3(x: f32, y: f32, z: f32) -> [f32; 3] {
    let len = (x * x + y * y + z * z).sqrt();
    if len < 1e-10 {
        [0.0, 0.0, 1.0]
    } else {
        [x / len, y / len, z / len]
    }
}

fn fov_radians(degrees: f32) -> f32 {
    degrees * std::f32::consts::PI / 180.0
}

/// Compute a combined View-Projection matrix from orbital camera parameters.
/// Returns a column-major 4x4 matrix (16 floats) suitable for WebGL2 uniforms.
#[inline]
pub fn compute_vp(
    eye: &[f32; 3],
    target: &[f32; 3],
    fov_degrees: f32,
    aspect: f32,
    near: f32,
    far: f32,
) -> [f32; 16] {
    let proj = perspective(fov_degrees, aspect, near, far);
    let view = look_at(eye, target, &[0.0, 1.0, 0.0]);
    mat4_mul(&proj, &view)
}

/// Compute a reflection View-Projection matrix: camera Y flipped across water plane.
#[inline]
pub fn compute_reflection_vp(
    eye: &[f32; 3],
    target: &[f32; 3],
    fov_degrees: f32,
    aspect: f32,
    near: f32,
    far: f32,
) -> [f32; 16] {
    let reye = [eye[0], -eye[1], eye[2]];
    let rtarget = [target[0], -target[1], target[2]];
    let proj = perspective(fov_degrees, aspect, near, far);
    let view = look_at(&reye, &rtarget, &[0.0, 1.0, 0.0]);
    mat4_mul(&proj, &view)
}

/// Compute the horizon Y coordinate in screen space for the reflection pass.
/// Returns a value in [0.01, 0.99].
#[inline]
pub fn compute_horizon_y(eye: &[f32; 3], target: &[f32; 3], fov_degrees: f32) -> f32 {
    let fwd_x = target[0] - eye[0];
    let fwd_y = target[1] - eye[1];
    let fwd_z = target[2] - eye[2];
    let fwd_len = (fwd_x * fwd_x + fwd_y * fwd_y + fwd_z * fwd_z).sqrt();
    let fwd_y = fwd_y / fwd_len;
    let f = 1.0 / (fov_radians(fov_degrees) * 0.5).tan();
    let fwd_horiz = (fwd_x * fwd_x + fwd_z * fwd_z).sqrt().max(0.01);
    let horizon_ndc = ((-fwd_y) / fwd_horiz * f - 0.02).clamp(-1.0, 1.0);
    ((1.0 - horizon_ndc) * 0.5).clamp(0.01, 0.99)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_obj_empty() {
        let mesh = parse_obj("");
        assert!(mesh.is_empty());
        assert_eq!(mesh.vertex_count, 0);
    }

    #[test]
    fn test_parse_obj_comments_only() {
        let mesh = parse_obj("# comment\n# another\n");
        assert!(mesh.is_empty());
    }

    #[test]
    fn test_parse_obj_single_triangle() {
        let src = "v 0.0 0.0 0.0\nv 1.0 0.0 0.0\nv 0.5 1.0 0.0\nf 1 2 3\n";
        let mesh = parse_obj(src);
        assert!(!mesh.is_empty());
        assert_eq!(mesh.vertex_count, 3);
        assert_eq!(mesh.triangle_count, 1);
        assert_eq!(mesh.positions.len(), 9);
        assert_eq!(mesh.normals.len(), 9);
        assert_eq!(mesh.uvs.len(), 6);
        assert_eq!(mesh.indices.len(), 3);
    }

    #[test]
    fn test_parse_obj_unit_cube() {
        let src = "v -0.5 -0.5 -0.5\nv 0.5 -0.5 -0.5\nv 0.5 0.5 -0.5\nv -0.5 0.5 -0.5\nv -0.5 -0.5 0.5\nv 0.5 -0.5 0.5\nv 0.5 0.5 0.5\nv -0.5 0.5 0.5\nf 1 2 3\nf 1 3 4\nf 5 7 6\nf 5 8 7\nf 1 6 2\nf 1 5 6\nf 2 7 3\nf 2 6 7\nf 3 8 4\nf 3 7 8\nf 4 5 1\nf 4 8 5\n";
        let mesh = parse_obj(src);
        assert_eq!(mesh.vertex_count, 8);
        assert_eq!(mesh.triangle_count, 12);
        assert_eq!(mesh.indices.len(), 36);
    }

    #[test]
    fn test_parse_obj_indices_zero_based() {
        let src = "v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n";
        let mesh = parse_obj(src);
        assert_eq!(mesh.indices, vec![0, 1, 2]);
    }

    #[test]
    fn test_parse_obj_skips_quads() {
        let src = "v 0 0 0\nv 1 0 0\nv 1 1 0\nv 0 1 0\nf 1 2 3 4\n";
        let mesh = parse_obj(src);
        assert_eq!(mesh.triangle_count, 1);
    }

    #[test]
    fn test_parse_obj_skips_vt_vn_mtllib() {
        let src = "mtllib test.mtl\nusemtl test\nvt 0.0 0.0\nvn 0.0 1.0 0.0\nv 0 0 0\nv 1 0 0\nv 0.5 1 0\nf 1 2 3\n";
        let mesh = parse_obj(src);
        assert_eq!(mesh.vertex_count, 3);
        assert_eq!(mesh.triangle_count, 1);
    }

    #[test]
    fn test_parse_obj_normals_unit_length() {
        let src = "v 0 0 0\nv 1 0 0\nv 0.5 1 0\nf 1 2 3\n";
        let mesh = parse_obj(src);
        for i in 0..mesh.vertex_count {
            let nx = mesh.normals[i*3];
            let ny = mesh.normals[i*3+1];
            let nz = mesh.normals[i*3+2];
            let len = (nx*nx + ny*ny + nz*nz).sqrt();
            assert!((len - 1.0).abs() < 0.001, "normal {} length {} != 1.0", i, len);
        }
    }

    #[test]
    fn test_parse_obj_aabb() {
        let src = "v -1 -2 -3\nv 4 5 6\nv 0 0 0\nf 1 2 3\n";
        let mesh = parse_obj(src);
        assert_eq!(mesh.aabb, (-1.0, -2.0, -3.0, 4.0, 5.0, 6.0));
    }

    #[test]
    fn test_parse_obj_up_normal() {
        let src = "v 0 0 0\nv 0 0 1\nv 1 0 0\nf 1 2 3\n";
        let mesh = parse_obj(src);
        for i in 0..mesh.vertex_count {
            assert!(mesh.normals[i*3+1] > 0.9, "expected +Y normal");
        }
    }

    #[test]
    fn test_parse_obj_armory_file() {
        let obj_str = include_str!("../../assets/models/armory.obj");
        let mesh = parse_obj(obj_str);
        assert!(!mesh.is_empty());
        assert!(mesh.vertex_count > 0);
        assert!(mesh.triangle_count > 0);
        assert_eq!(mesh.positions.len(), mesh.vertex_count * 3);
        assert_eq!(mesh.normals.len(), mesh.vertex_count * 3);
        assert_eq!(mesh.uvs.len(), mesh.vertex_count * 2);
        assert_eq!(mesh.indices.len(), mesh.triangle_count * 3);
    }

    #[test]
    fn test_model_registry_basic() {
        let mut reg = ModelRegistry::new();
        assert!(reg.is_empty());
        let mesh = parse_obj("v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n");
        reg.insert("tri", mesh);
        assert_eq!(reg.len(), 1);
        assert_eq!(reg.get("tri").unwrap().vertex_count, 3);
        assert!(reg.get("missing").is_none());
    }

    #[test]
    fn test_model_registry_remove() {
        let mut reg = ModelRegistry::new();
        reg.insert("a", ModelMesh::empty());
        reg.insert("b", ModelMesh::empty());
        assert_eq!(reg.len(), 2);
        reg.remove("a");
        assert_eq!(reg.len(), 1);
        assert!(reg.get("a").is_none());
    }

    #[test]
    fn test_model_registry_clear() {
        let mut reg = ModelRegistry::new();
        reg.insert("x", ModelMesh::empty());
        reg.clear();
        assert!(reg.is_empty());
    }

    #[test]
    fn test_model_registry_names() {
        let mut reg = ModelRegistry::new();
        reg.insert("castle", ModelMesh::empty());
        reg.insert("farm", ModelMesh::empty());
        let mut names: Vec<&str> = reg.names().collect();
        names.sort();
        assert_eq!(names, vec!["castle", "farm"]);
    }

    #[test]
    fn test_model_mesh_empty() {
        let m = ModelMesh::empty();
        assert!(m.is_empty());
    }

    #[test]
    fn test_model_mesh_non_empty() {
        let m = parse_obj("v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n");
        assert!(!m.is_empty());
    }

    #[test]
    fn test_face_normal_ccw() {
        let n = face_normal([0.0,0.0,0.0], [1.0,0.0,0.0], [0.0,1.0,0.0]);
        assert!(n[2] > 0.0);
    }

    #[test]
    fn test_face_normal_magnitude() {
        let n = face_normal([0.0,0.0,0.0], [2.0,0.0,0.0], [0.0,2.0,0.0]);
        let mag = (n[0]*n[0]+n[1]*n[1]+n[2]*n[2]).sqrt();
        assert!((mag - 4.0).abs() < 0.001);
    }

    #[test]
    fn test_parse_obj_index_slash() {
        let src = "v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1/1 2/2 3/3\n";
        let mesh = parse_obj(src);
        assert_eq!(mesh.indices, vec![0, 1, 2]);
    }

    #[test]
    fn test_parse_obj_index_double_slash() {
        let src = "v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1//1 2//2 3//3\n";
        let mesh = parse_obj(src);
        assert_eq!(mesh.indices, vec![0, 1, 2]);
    }

    #[test]
    fn test_parse_multiple_real_obj_files() {
        for (name, path) in [("armory", "../assets/models/armory.obj"), ("bakery", "../assets/models/bakery.obj"), ("blacksmith", "../assets/models/blacksmith.obj")] {
            let content = std::fs::read_to_string(path).unwrap();
            let mesh = parse_obj(&content);
            assert!(!mesh.is_empty(), "{} empty", name);
            assert!(mesh.vertex_count >= 3, "{} < 3 verts", name);
            assert!(mesh.triangle_count >= 1, "{} < 1 tri", name);
            assert_eq!(mesh.positions.len(), mesh.vertex_count * 3);
            assert_eq!(mesh.normals.len(), mesh.vertex_count * 3);
            assert_eq!(mesh.uvs.len(), mesh.vertex_count * 2);
            assert_eq!(mesh.indices.len(), mesh.triangle_count * 3);
        }
    }

    // ── JSON Mesh Tests ──────────────────────────────────────────────────

    #[test]
    fn test_parse_json_mesh_empty() {
        let result = parse_json_mesh("{}");
        assert!(result.is_err());
    }

    #[test]
    fn test_parse_json_mesh_invalid_version() {
        let src = r#"{"version": 99, "vertices": [], "normals": [], "uvs": [], "indices": [], "aabb": [0,0,0,0,0,0]}"#;
        let result = parse_json_mesh(src);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("unsupported"));
    }

    #[test]
    fn test_parse_json_mesh_empty_vertices() {
        let src = r#"{"version": 1, "vertices": [], "normals": [], "uvs": [], "indices": [], "aabb": [0,0,0,0,0,0]}"#;
        let mesh = parse_json_mesh(src).unwrap();
        assert!(mesh.is_empty());
    }

    #[test]
    fn test_parse_json_mesh_single_triangle() {
        let src = r#"{
            "version": 1,
            "vertices": [[0.0,0.0,0.0],[1.0,0.0,0.0],[0.5,1.0,0.0]],
            "normals": [[0.0,1.0,0.0],[0.0,1.0,0.0],[0.0,1.0,0.0]],
            "uvs": [[0.0,0.0],[1.0,0.0],[0.5,1.0]],
            "indices": [0,1,2],
            "aabb": [0.0,0.0,0.0,1.0,1.0,0.0]
        }"#;
        let mesh = parse_json_mesh(src).unwrap();
        assert!(!mesh.is_empty());
        assert_eq!(mesh.vertex_count, 3);
        assert_eq!(mesh.triangle_count, 1);
        assert_eq!(mesh.positions.len(), 9);
        assert_eq!(mesh.normals.len(), 9);
        assert_eq!(mesh.uvs.len(), 6);
        assert_eq!(mesh.indices, vec![0, 1, 2]);
    }

    #[test]
    fn test_parse_json_mesh_aabb() {
        let src = r#"{
            "version": 1,
            "vertices": [[-1.0,-2.0,-3.0],[4.0,5.0,6.0],[0.0,0.0,0.0]],
            "normals": [[0,1,0],[0,1,0],[0,1,0]],
            "uvs": [[0,0],[0,0],[0,0]],
            "indices": [0,1,2],
            "aabb": [-1.0,-2.0,-3.0,4.0,5.0,6.0]
        }"#;
        let mesh = parse_json_mesh(src).unwrap();
        assert_eq!(mesh.aabb, (-1.0, -2.0, -3.0, 4.0, 5.0, 6.0));
    }

    #[test]
    fn test_parse_json_mesh_generates_default_normals() {
        let src = r#"{
            "version": 1,
            "vertices": [[0.0,0.0,0.0],[1.0,0.0,0.0],[0.5,1.0,0.0]],
            "normals": [],
            "uvs": [],
            "indices": [0,1,2],
            "aabb": [0,0,0,1,1,0]
        }"#;
        let mesh = parse_json_mesh(src).unwrap();
        assert_eq!(mesh.normals.len(), 9);
        // Default normals should be +Y
        for i in 0..3 {
            assert!((mesh.normals[i * 3 + 1] - 1.0).abs() < 0.001);
        }
    }

    #[test]
    fn test_parse_json_mesh_generates_default_uvs() {
        let src = r#"{
            "version": 1,
            "vertices": [[0.0,0.0,0.0],[1.0,0.0,0.0],[0.5,1.0,0.0]],
            "normals": [[0,1,0],[0,1,0],[0,1,0]],
            "uvs": [],
            "indices": [0,1,2],
            "aabb": [0,0,0,1,1,0]
        }"#;
        let mesh = parse_json_mesh(src).unwrap();
        assert_eq!(mesh.uvs.len(), 6);
        assert_eq!(mesh.uvs, vec![0.0; 6]);
    }

    #[test]
    fn test_parse_json_mesh_with_material() {
        let src = r#"{
            "version": 1,
            "vertices": [[0.0,0.0,0.0],[1.0,0.0,0.0],[0.5,1.0,0.0]],
            "normals": [[0,1,0],[0,1,0],[0,1,0]],
            "uvs": [[0,0],[1,0],[0.5,1]],
            "indices": [0,1,2],
            "aabb": [0,0,0,1,1,0],
            "material": {"diffuse": [0.8, 0.6, 0.2], "roughness": 0.3, "metallic": 0.5}
        }"#;
        let mesh = parse_json_mesh(src).unwrap();
        assert_eq!(mesh.material.diffuse, [0.8, 0.6, 0.2]);
        assert!((mesh.material.roughness - 0.3).abs() < 0.001);
        assert!((mesh.material.metallic - 0.5).abs() < 0.001);
    }

    #[test]
    fn test_parse_json_mesh_default_material() {
        let src = r#"{
            "version": 1,
            "vertices": [[0.0,0.0,0.0],[1.0,0.0,0.0],[0.5,1.0,0.0]],
            "normals": [[0,1,0],[0,1,0],[0,1,0]],
            "uvs": [[0,0],[1,0],[0.5,1]],
            "indices": [0,1,2],
            "aabb": [0,0,0,1,1,0]
        }"#;
        let mesh = parse_json_mesh(src).unwrap();
        assert_eq!(mesh.material.diffuse, [0.55, 0.50, 0.45]);
        assert!((mesh.material.roughness - 0.7).abs() < 0.001);
    }

    // ── Model Instance Tests ─────────────────────────────────────────────

    #[test]
    fn test_model_instance_new() {
        let inst = ModelInstance::new(0, 5.0, 10.0);
        assert_eq!(inst.model_id, 0);
        assert_eq!(inst.x, 5.0);
        assert_eq!(inst.y, 10.0);
        assert_eq!(inst.scale, 1.0);
        assert_eq!(inst.rotation_y, 0.0);
    }

    #[test]
    fn test_model_instance_with_scale() {
        let inst = ModelInstance::new(10, 0.0, 0.0).with_scale(2.0);
        assert_eq!(inst.scale, 2.0);
    }

    #[test]
    fn test_model_instance_with_rotation() {
        let inst = ModelInstance::new(59, 1.0, 1.0).with_rotation_y(90.0);
        assert_eq!(inst.rotation_y, 90.0);
    }

    // ── Matrix Tests ─────────────────────────────────────────────────────

    #[test]
    fn test_mat4_mul_identity() {
        let identity = [
            1.0, 0.0, 0.0, 0.0,
            0.0, 1.0, 0.0, 0.0,
            0.0, 0.0, 1.0, 0.0,
            0.0, 0.0, 0.0, 1.0,
        ];
        let m = [
            1.0, 2.0, 3.0, 4.0,
            5.0, 6.0, 7.0, 8.0,
            9.0, 10.0, 11.0, 12.0,
            13.0, 14.0, 15.0, 16.0,
        ];
        let result = mat4_mul(&identity, &m);
        assert_eq!(result, m);
    }

    #[test]
    fn test_mat4_mul_translation() {
        let translation = [
            1.0, 0.0, 0.0, 0.0,
            0.0, 1.0, 0.0, 0.0,
            0.0, 0.0, 1.0, 0.0,
            10.0, 20.0, 30.0, 1.0,
        ];
        let identity = [
            1.0, 0.0, 0.0, 0.0,
            0.0, 1.0, 0.0, 0.0,
            0.0, 0.0, 1.0, 0.0,
            0.0, 0.0, 0.0, 1.0,
        ];
        let result = mat4_mul(&translation, &identity);
        assert_eq!(result[12], 10.0);
        assert_eq!(result[13], 20.0);
        assert_eq!(result[14], 30.0);
    }

    #[test]
    fn test_perspective_matrix() {
        let p = perspective(45.0, 1.78, 0.1, 500.0);
        // Check it's not all zeros
        assert!(p[0] > 0.0);
        assert!(p[5] > 0.0);
        // Check perspective divide
        assert_eq!(p[11], -1.0);
    }

    #[test]
    fn test_look_at_identity() {
        let eye = [0.0, 0.0, 5.0];
        let target = [0.0, 0.0, 0.0];
        let up = [0.0, 1.0, 0.0];
        let view = look_at(&eye, &target, &up);
        // f = normalize(target - eye) = [0, 0, -1]
        // Column-major: view[10] = -f.z = 1.0
        assert!(view[10] > 0.0, "view[10] should be positive, got {}", view[10]);
        // view[12] = -dot(s, eye) = 0 (s = [1,0,0], eye = [0,0,5])
        assert!(view[12].abs() < 0.001, "view[12] should be 0, got {}", view[12]);
        // view[15] = 1.0 (homogeneous)
        assert!((view[15] - 1.0).abs() < 0.001);
    }

    #[test]
    fn test_compute_mvp() {
        let inst = ModelInstance::new(0,0.0, 20.0);
        let view = [
            1.0, 0.0, 0.0, 0.0,
            0.0, 1.0, 0.0, 0.0,
            0.0, 0.0, 1.0, 0.0,
            0.0, 0.0, -20.0, 1.0,
        ];
        let proj = perspective(45.0, 1.78, 0.1, 500.0);
        let mvp = compute_mvp(&inst, &view, &proj);
        // MVP should not be all zeros
        let sum: f32 = mvp.iter().map(|v| v.abs()).sum();
        assert!(sum > 0.0);
        // Translation should be reflected
        assert!(mvp[12] != 0.0 || mvp[14] != 0.0);
    }

    #[test]
    fn test_compute_mvp_with_rotation() {
        let inst = ModelInstance::new(59, 0.0, 0.0).with_rotation_y(90.0);
        let view = [
            1.0, 0.0, 0.0, 0.0,
            0.0, 1.0, 0.0, 0.0,
            0.0, 0.0, 1.0, 0.0,
            0.0, 0.0, -10.0, 1.0,
        ];
        let proj = perspective(45.0, 1.0, 0.1, 100.0);
        let mvp = compute_mvp(&inst, &view, &proj);
        // With 90 degree Y rotation, the X and Z columns should swap
        assert!(mvp[0].abs() < 0.01); // cos(90) ≈ 0
        assert!(mvp[2].abs() > 0.99); // sin(90) ≈ 1
    }

    #[test]
    fn test_compute_mvp_with_scale() {
        let inst = ModelInstance::new(10, 0.0, 0.0).with_scale(2.0);
        let view = [
            1.0, 0.0, 0.0, 0.0,
            0.0, 1.0, 0.0, 0.0,
            0.0, 0.0, 1.0, 0.0,
            0.0, 0.0, -10.0, 1.0,
        ];
        let proj = perspective(45.0, 1.0, 0.1, 100.0);
        let mvp = compute_mvp(&inst, &view, &proj);
        // Scale of 2.0: model matrix has 2.0 on diagonal
        // After view (translation by -10 in z), then projection,
        // the scale effect is visible but mixed with perspective.
        // Check that the matrix is not identity-like (scale had effect)
        let mvp_sum: f32 = mvp.iter().map(|v| v.abs()).sum();
        assert!(mvp_sum > 5.0, "MVP should have significant values");
        // The model matrix diagonal should be 2.0 before projection
        // After projection, mvp[0] = proj[0] * 2.0 (approximately)
        assert!(mvp[0].abs() > 1.5, "mvp[0] should reflect scale 2.0, got {}", mvp[0]);
    }

    // ── Animation tests ─────────────────────────────────────────────────────

    #[test]
    fn test_model_instance_default_anim_phase_is_zero() {
        let inst = ModelInstance::new(59, 1.0, 2.0);
        assert_eq!(inst.anim_phase, 0.0, "default anim_phase should be 0.0 (no wobble)");
    }

    #[test]
    fn test_model_instance_with_anim_phase() {
        let inst = ModelInstance::new(59, 1.0, 2.0).with_anim_phase(std::f32::consts::PI);
        assert!((inst.anim_phase - std::f32::consts::PI).abs() < 0.001);
    }

    #[test]
    fn test_model_instance_building_anim_phase_zero() {
        // Buildings should have anim_phase = 0.0 (no wobble)
        let inst = ModelInstance::new(0, 5.0, 5.0).with_scale(0.7);
        assert_eq!(inst.anim_phase, 0.0, "building anim_phase should remain 0.0");
    }

    #[test]
    fn test_model_instance_unit_has_nonzero_anim_phase() {
        // Units should have non-zero anim_phase for wobble effect
        let phase = 2.5_f32;
        let inst = ModelInstance::new(59, 3.0, 4.0).with_anim_phase(phase);
        assert!(inst.anim_phase > 0.0, "unit anim_phase should be non-zero");
        assert!((inst.anim_phase - phase).abs() < 0.001);
    }

    #[test]
    fn test_model_instance_anim_phase_preserved_with_scale() {
        let inst = ModelInstance::new(60, 0.0, 0.0)
            .with_scale(1.5)
            .with_anim_phase(1.0);
        assert!((inst.scale - 1.5).abs() < 0.001);
        assert!((inst.anim_phase - 1.0).abs() < 0.001);
    }

    #[test]
    fn test_model_instance_anim_phase_preserved_with_rotation() {
        let inst = ModelInstance::new(61, 0.0, 0.0)
            .with_rotation_y(45.0)
            .with_anim_phase(2.0);
        assert!((inst.rotation_y - 45.0).abs() < 0.001);
        assert!((inst.anim_phase - 2.0).abs() < 0.001);
    }

    #[test]
    fn test_model_instance_clone_preserves_anim_phase() {
        let inst = ModelInstance::new(59, 1.0, 2.0).with_anim_phase(4.5);
        let cloned = inst.clone();
        assert!((cloned.anim_phase - 4.5).abs() < 0.001);
    }

    #[test]
    fn test_model_instance_partial_eq_includes_anim_phase() {
        let a = ModelInstance::new(59, 1.0, 2.0).with_anim_phase(1.0);
        let b = ModelInstance::new(59, 1.0, 2.0).with_anim_phase(1.0);
        let c = ModelInstance::new(59, 1.0, 2.0).with_anim_phase(2.0);
        assert_eq!(a, b);
        assert_ne!(a, c, "different anim_phase should make instances unequal");
    }
}

    #[test]
    fn test_compute_vp_identity() {
        // Camera at origin looking along +Z should produce a valid VP matrix
        let eye = [0.0_f32, 1.0, 0.0];
        let target = [0.0_f32, 0.0, 1.0];
        let vp = compute_vp(&eye, &target, 45.0, 1.0, 0.1, 500.0);
        // VP should be a valid 4x4 matrix (no NaN)
        for &v in &vp {
            assert!(!v.is_nan(), "VP matrix contains NaN");
        }
        // VP should be finite
        for &v in &vp {
            assert!(v.is_finite(), "VP matrix contains infinite value");
        }
    }

    #[test]
    fn test_compute_reflection_vp_flips_y() {
        let eye = [0.0_f32, 2.0, 0.0];
        let target = [0.0_f32, 0.0, 1.0];
        let vp_normal = compute_vp(&eye, &target, 45.0, 1.0, 0.1, 500.0);
        let vp_reflect = compute_reflection_vp(&eye, &target, 45.0, 1.0, 0.1, 500.0);
        // Reflection VP should differ from normal VP
        let diff: f32 = vp_normal.iter().zip(vp_reflect.iter()).map(|(a, b)| (a - b).abs()).sum();
        assert!(diff > 0.01, "Reflection VP should differ from normal VP");
    }

    #[test]
    fn test_compute_horizon_y_range() {
        // Looking straight ahead (horizontal) → horizon near middle of screen
        let eye = [0.0_f32, 1.0, 0.0];
        let target = [0.0_f32, 1.0, 1.0]; // same Y = horizontal
        let h = compute_horizon_y(&eye, &target, 45.0);
        assert!((0.01..=0.99).contains(&h), "horizon_y = {} (expected [0.01, 0.99])", h);

        // Looking up → horizon below center
        let target_up = [0.0_f32, 5.0, 1.0];
        let h_up = compute_horizon_y(&eye, &target_up, 45.0);
        assert!((0.01..=0.99).contains(&h_up), "horizon_y (up) = {} (expected [0.01, 0.99])", h_up);

        // Looking down → horizon above center
        let target_down = [0.0_f32, -3.0, 1.0];
        let h_down = compute_horizon_y(&eye, &target_down, 45.0);
        assert!((0.01..=0.99).contains(&h_down), "horizon_y (down) = {} (expected [0.01, 0.99])", h_down);
    }

    // ── Model instance distance culling tests ─────────────────────────────

    #[test]
    fn test_model_cull_zero_distance() {
        // Instance at camera position — should never be culled
        assert!(!is_model_culled(50.0, 50.0, 50.0, 50.0));
    }

    #[test]
    fn test_model_cull_within_range() {
        // 40 tiles away — well within 80-tile threshold
        assert!(!is_model_culled(10.0, 10.0, 0.0, 0.0));
    }

    #[test]
    fn test_model_cull_at_threshold() {
        // Exactly 80 tiles on one axis — squared = 6400 = threshold
        assert!(!is_model_culled(80.0, 0.0, 0.0, 0.0),
            "Exactly at 80 should not be culled (equality)");
    }

    #[test]
    fn test_model_cull_beyond_range() {
        // 81 tiles away on one axis — beyond 80-tile threshold
        assert!(is_model_culled(81.0, 0.0, 0.0, 0.0));
    }

    #[test]
    fn test_model_cull_far_distance() {
        // 200 tiles away — well beyond threshold
        assert!(is_model_culled(200.0, 200.0, 0.0, 0.0));
    }

    #[test]
    fn test_model_cull_diagonal() {
        // Diagonal distance ~113 tiles > 80
        assert!(is_model_culled(80.0, 80.0, 0.0, 0.0));
    }

    #[test]
    fn test_model_cull_diagonal_within() {
        // Diagonal distance ~70.7 tiles < 80
        assert!(!is_model_culled(50.0, 50.0, 0.0, 0.0));
    }

    #[test]
    fn test_model_cull_camera_offset() {
        // Camera not at origin — relative distance matters
        // Instance at (100,100), camera at (50,50) → distance ~70.7 < 80
        assert!(!is_model_culled(100.0, 100.0, 50.0, 50.0));
    }
