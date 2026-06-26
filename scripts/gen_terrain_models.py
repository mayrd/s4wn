#!/usr/bin/env python3
"""
Generate 3D terrain feature models for S4WN.
Creates JSON model files for trees, rocks, and swamp vegetation.
Output: assets/models/json/terrain_*.json
"""

import os, json, math, random

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(SCRIPT_DIR, "..", "assets", "models", "json")

os.makedirs(MODEL_DIR, exist_ok=True)

def make_cone(segments=6, height=1.0, radius=0.3):
    """Generate a cone mesh (tree shape)."""
    vertices = []
    normals = []
    uvs = []
    indices = []
    
    # Base center
    base_center = len(vertices)
    vertices.append([0.0, 0.0, 0.0])
    normals.append([0.0, -1.0, 0.0])
    uvs.append([0.5, 0.5])
    
    # Base ring
    base_start = len(vertices)
    for i in range(segments):
        angle = 2 * math.pi * i / segments
        x = math.cos(angle) * radius
        z = math.sin(angle) * radius
        vertices.append([x, 0.0, z])
        normals.append([0.0, -1.0, 0.0])
        uvs.append([x / (2*radius) + 0.5, z / (2*radius) + 0.5])
    
    # Tip
    tip = len(vertices)
    vertices.append([0.0, height, 0.0])
    normals.append([0.0, 1.0, 0.0])
    uvs.append([0.5, 1.0])
    
    # Base triangles
    for i in range(segments):
        j = (i + 1) % segments
        indices.extend([base_center, base_start + i, base_start + j])
    
    # Side triangles
    for i in range(segments):
        j = (i + 1) % segments
        # Compute side normal
        v1 = [vertices[base_start + j][0] - vertices[base_start + i][0],
              vertices[base_start + j][1] - vertices[base_start + i][1],
              vertices[base_start + j][2] - vertices[base_start + i][2]]
        v2 = [vertices[tip][0] - vertices[base_start + i][0],
              vertices[tip][1] - vertices[base_start + i][1],
              vertices[tip][2] - vertices[base_start + i][2]]
        nx = v1[1]*v2[2] - v1[2]*v2[1]
        ny = v1[2]*v2[0] - v1[0]*v2[2]
        nz = v1[0]*v2[1] - v1[1]*v2[0]
        L = math.sqrt(nx*nx + ny*ny + nz*nz)
        if L > 1e-8:
            nx, ny, nz = nx/L, ny/L, nz/L
        else:
            nx, ny, nz = 0, 1, 0
        normals[base_start + i] = [nx, ny, nz]
        indices.extend([base_start + i, base_start + j, tip])
    
    aabb = [-radius, 0, -radius, radius, height, radius]
    return vertices, normals, uvs, indices, aabb

def make_box(w, h, d):
    """Generate a box mesh (rock shape with slight randomization)."""
    hw, hh, hd = w/2, h/2, d/2
    vertices = [
        [-hw, -hh, -hd], [hw, -hh, -hd], [hw, -hh, hd], [-hw, -hh, hd],
        [-hw, hh, -hd], [hw, hh, -hd], [hw, hh, hd], [-hw, hh, hd],
    ]
    # Slightly perturb vertices for natural rock look
    for v in vertices:
        v[0] += (random.random() - 0.5) * 0.05
        v[1] += (random.random() - 0.5) * 0.05
        v[2] += (random.random() - 0.5) * 0.05
    
    faces = [
        (0,1,2,3),(4,7,6,5),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)
    ]
    normals_per_face = [
        [0,-1,0],[0,1,0],[-1,0,0],[1,0,0],[0,0,1],[0,0,-1]
    ]
    
    all_verts, all_norms, all_uvs, all_idx = [], [], [], []
    for fi, (face, fn) in enumerate(zip(faces, normals_per_face)):
        base = len(all_verts)
        for vi in face:
            all_verts.append(list(vertices[vi]))
            all_norms.append(list(fn))
            all_uvs.append([vi/4.0, 0.5])
        all_idx.extend([base, base+1, base+2, base, base+2, base+3])
    
    aabb = [-hw-0.05, -hh-0.05, -hd-0.05, hw+0.05, hh+0.05, hd+0.05]
    return all_verts, all_norms, all_uvs, all_idx, aabb

def save_model(name, vertices, normals, uvs, indices, aabb, material=None):
    """Save as S4WN JSON model."""
    model = {
        "version": 1,
        "vertices": vertices,
        "normals": normals,
        "uvs": uvs,
        "indices": indices,
        "aabb": aabb,
        "material": material or {"diffuse": [0.5, 0.5, 0.5], "roughness": 0.7, "metallic": 0.05}
    }
    path = os.path.join(MODEL_DIR, f"terrain_{name}.json")
    with open(path, 'w') as f:
        json.dump(model, f, separators=(',', ':'))
    vc = len(vertices)
    fc = len(indices) // 3
    print(f"  terrain_{name}.json: {vc}v, {fc}f, {os.path.getsize(path)}B")
    return path

def main():
    print("Generating terrain feature models...")
    
    # Tree types (cones of different sizes)
    trees = [
        ("pine", 1.2, 0.3, 8, {"diffuse": [0.15, 0.42, 0.15], "roughness": 0.85, "metallic": 0.0}),
        ("oak", 0.9, 0.45, 8, {"diffuse": [0.25, 0.48, 0.18], "roughness": 0.8, "metallic": 0.0}),
        ("bush", 0.4, 0.35, 6, {"diffuse": [0.3, 0.5, 0.2], "roughness": 0.9, "metallic": 0.0}),
    ]
    for name, h, r, seg, mat in trees:
        v, n, u, i, aabb = make_cone(seg, h, r)
        save_model(f"tree_{name}", v, n, u, i, aabb, mat)
    
    # Rock types (boxes with perturbation)
    rocks = [
        ("boulder", 0.5, 0.35, 0.4, {"diffuse": [0.45, 0.48, 0.52], "roughness": 0.6, "metallic": 0.15}),
        ("stone", 0.25, 0.18, 0.22, {"diffuse": [0.55, 0.55, 0.58], "roughness": 0.55, "metallic": 0.1}),
        ("cliff", 0.8, 0.5, 0.6, {"diffuse": [0.38, 0.40, 0.45], "roughness": 0.5, "metallic": 0.2}),
    ]
    for name, w, h, d, mat in rocks:
        v, n, u, i, aabb = make_box(w, h, d)
        save_model(f"rock_{name}", v, n, u, i, aabb, mat)
    
    # Swamp vegetation (thin reeds)
    reeds_v = [[0,0,-0.05],[0,0.5,-0.05],[0,0,0.05],[0,0.5,0.05]]
    reeds_n = [[0,1,0]]*4
    reeds_u = [[0,0],[0,1],[1,0],[1,1]]
    reeds_i = [0,1,2,1,3,2]
    save_model("swamp_reed", reeds_v, reeds_n, reeds_u, reeds_i,
               [-0.05, 0, -0.05, 0.05, 0.5, 0.05],
               {"diffuse": [0.35, 0.5, 0.2], "roughness": 0.9, "metallic": 0.0})

if __name__ == "__main__":
    main()
