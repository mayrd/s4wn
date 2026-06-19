//! 3D Model Loading & Mesh Data
//!
//! Phase 5 Step 7: OBJ parser + JSON model format.

use std::collections::HashMap;

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
}
