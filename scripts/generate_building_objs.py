#!/usr/bin/env python3
"""
generate_building_objs.py — Procedural UV-unwrapped OBJ + MTL generator.

Each building gets a shape template with per-face UV coordinates so
seamless textures map correctly. MTL files now reference texture paths.
No external models, no AI calls, no S4 asset extraction — pure math.

Output: assets/models/<name>.obj + assets/models/<name>.mtl
"""

import os, sys

MODELS_DIR = os.path.join(os.path.dirname(__file__), "..", "assets", "models")

# ── Building catalog ─────────────────────────────────────────────────

BUILDINGS = {
    # Production — cottage
    "sawmill":          ("cottage", (2.0, 1.5, 2.5), "building_timber.png"),
    "stonecutter":      ("cottage", (2.0, 1.5, 2.0), "building_stone.png"),
    "toolsmith":        ("cottage", (2.5, 1.8, 2.5), "building_metal.png"),
    "weaponsmith":      ("cottage", (2.5, 1.8, 2.5), "building_metal.png"),
    "bakery":           ("cottage", (2.0, 1.5, 2.0), "building_thatch.png"),
    "butcher":          ("cottage", (2.0, 1.5, 2.0), "building_thatch.png"),
    "mill":             ("cottage", (2.5, 2.0, 2.5), "building_thatch.png"),
    "waterworks":       ("cottage", (1.8, 1.5, 2.0), "building_adobe.png"),
    "smelter":          ("cottage", (2.5, 2.0, 2.5), "building_metal.png"),
    "gold_smelter":     ("cottage", (2.5, 2.0, 2.5), "building_metal.png"),
    "iron_smelter":     ("cottage", (2.5, 2.0, 2.5), "building_metal.png"),
    "powder_mill":      ("cottage", (2.0, 1.5, 2.0), "building_metal.png"),
    "weapon_foundry":   ("cottage", (2.5, 1.8, 2.5), "building_metal.png"),
    "oil_press":        ("cottage", (2.0, 1.5, 2.0), "building_adobe.png"),
    "distillery":       ("cottage", (2.0, 1.8, 2.0), "building_adobe.png"),
    "mead_maker":       ("cottage", (2.0, 1.8, 2.0), "building_thatch.png"),
    "vineyard":         ("cottage", (2.0, 1.5, 2.0), "building_thatch.png"),
    "slaughterhouse":   ("cottage", (2.0, 1.5, 2.5), "building_thatch.png"),
    "healer":           ("cottage", (2.0, 1.5, 2.0), "building_adobe.png"),

    # Mining — mine entrance
    "mine":             ("mine", (2.0, 2.0, 2.0), "building_adobe.png"),
    "gold_mine":        ("mine", (2.0, 2.0, 2.0), "building_adobe.png"),
    "coal_mine":        ("mine", (2.0, 2.0, 2.0), "building_adobe.png"),
    "iron_ore_mine":    ("mine", (2.0, 2.0, 2.0), "building_adobe.png"),
    "sulfur_mine":      ("mine", (2.0, 2.0, 2.0), "building_adobe.png"),

    # Farming — barn
    "farm":             ("barn", (3.0, 1.5, 2.5), "building_thatch.png"),
    "fisherman":        ("barn", (2.0, 1.5, 2.5), "building_thatch.png"),
    "woodcutter":       ("barn", (2.0, 1.5, 2.0), "building_timber.png"),
    "forester":         ("barn", (2.0, 1.5, 2.0), "building_thatch.png"),
    "apiary":           ("barn", (1.5, 1.2, 1.5), "building_thatch.png"),
    "agave_farm":       ("barn", (2.5, 1.5, 2.5), "building_thatch.png"),
    "trojan_farm":      ("barn", (2.5, 1.5, 2.5), "building_thatch.png"),
    "mushroom_farm":    ("barn", (2.0, 1.5, 2.0), "building_adobe.png"),
    "goat_ranch":       ("barn", (2.5, 1.5, 3.0), "building_thatch.png"),
    "pig_ranch":        ("barn", (2.5, 1.5, 3.0), "building_thatch.png"),
    "goose_ranch":      ("barn", (2.5, 1.5, 3.0), "building_thatch.png"),
    "donkey_ranch":     ("barn", (2.5, 1.5, 3.0), "building_thatch.png"),

    # Military — keep
    "barracks":         ("keep", (3.0, 3.5, 3.0), "building_stone.png"),
    "guard_tower":      ("keep", (1.5, 5.0, 1.5), "building_stone.png"),
    "fortress":         ("keep", (5.0, 6.0, 5.0), "building_stone.png"),
    "siege_workshop":   ("keep", (3.0, 3.0, 4.0), "building_stone.png"),
    "dark_fortress":    ("keep", (5.0, 6.0, 5.0), "building_darkstone.png"),
    "demon_gate":       ("keep", (2.0, 4.0, 2.0), "building_darkstone.png"),

    # Religious — temple
    "temple_of_bacchus":          ("temple", (3.0, 3.5, 4.0), "building_marble.png"),
    "colosseum":                  ("temple", (6.0, 4.0, 6.0), "building_marble.png"),
    "sanctuary_of_minerva":       ("temple", (3.0, 3.5, 4.0), "building_marble.png"),
    "sanctuary_of_vulcan":        ("temple", (3.0, 3.5, 4.0), "building_marble.png"),
    "mead_hall":                  ("temple", (4.0, 3.0, 5.0), "building_timber.png"),
    "sanctuary_of_odin":          ("temple", (3.0, 3.5, 4.0), "building_marble.png"),
    "sanctuary_of_thor":          ("temple", (3.0, 3.5, 4.0), "building_marble.png"),
    "sanctuary_of_freya":         ("temple", (3.0, 3.5, 4.0), "building_marble.png"),
    "temple_of_chac":             ("temple", (3.5, 3.5, 5.0), "building_marble.png"),
    "sanctuary_of_kukulkan":      ("temple", (3.5, 4.0, 5.0), "building_marble.png"),
    "sanctuary_of_quetzalcoatl":  ("temple", (3.5, 4.0, 5.0), "building_marble.png"),
    "sanctuary_of_huitzilopochtli":("temple",(3.5, 4.0, 5.0), "building_marble.png"),
    "observatory":                ("temple", (2.5, 5.0, 2.5), "building_marble.png"),
    "oracle_of_apollo":           ("temple", (3.0, 3.5, 4.0), "building_marble.png"),
    "sanctuary_of_artemis":       ("temple", (3.0, 3.5, 4.0), "building_marble.png"),
    "sanctuary_of_poseidon":      ("temple", (3.0, 3.5, 4.0), "building_marble.png"),
    "sanctuary_of_apollo":        ("temple", (3.0, 3.5, 4.0), "building_marble.png"),
    "amphitheater":               ("temple", (5.0, 3.0, 6.0), "building_marble.png"),
    "dark_temple":                ("temple", (3.0, 3.5, 4.0), "building_darkstone.png"),
    "dark_garden":                ("temple", (2.5, 2.5, 3.0), "building_darkstone.png"),
    "sanctuary_of_morbus":        ("temple", (3.0, 3.5, 4.0), "building_darkstone.png"),
    "sanctuary_of_pestilence":    ("temple", (3.0, 3.5, 4.0), "building_darkstone.png"),
    "small_temple":               ("temple", (2.0, 2.5, 3.0), "building_marble.png"),
    "large_temple":               ("temple", (4.0, 4.5, 5.0), "building_marble.png"),

    # Logistics — warehouse
    "storehouse":       ("warehouse", (3.0, 2.5, 4.0), "building_timber.png"),
    "marketplace":      ("warehouse", (4.0, 2.0, 4.0), "building_adobe.png"),
    "storage_yard":     ("warehouse", (3.0, 1.5, 3.0), "building_timber.png"),
    "landing_dock":     ("warehouse", (3.0, 2.0, 3.0), "building_timber.png"),
    "shipyard":         ("warehouse", (4.0, 2.5, 5.0), "building_timber.png"),
    "road_layer":       ("warehouse", (2.0, 1.5, 2.0), "building_timber.png"),

    # Housing — peaked house
    "small_residence":  ("house", (2.0, 2.0, 2.0), "building_timber.png"),
    "medium_residence": ("house", (3.0, 2.5, 3.0), "building_timber.png"),
    "large_residence":  ("house", (4.0, 3.0, 4.0), "building_timber.png"),

    # Decorative
    "runestone":        ("pillar", (0.5, 3.0, 0.5), "building_adobe.png"),

    # Also covering the castle (renamed from headquarters)
    "castle":           ("keep", (3.0, 4.0, 3.0), "building_stone.png"),

    # ── Units (humanoid shape, character UV sheet) ──────────────────
    "unit_archer":      ("humanoid", (0.3, 1.2, 0.3), "unit_archer.png"),
    "unit_soldier":     ("humanoid", (0.35, 1.2, 0.35), "unit_soldier.png"),
    "unit_worker":      ("humanoid", (0.3, 1.2, 0.3), "unit_worker.png"),
}


# ── OBJ + MTL generator (with UVs) ───────────────────────────────────

def write_obj(path, vertices, uvs, normals, faces, mtl_name):
    """Write an OBJ file with UV texture coordinates."""
    with open(path, "w") as f:
        f.write(f"# Procedural S4WN building model (UV-unwrapped)\n")
        f.write(f"mtllib {mtl_name}\n")
        f.write(f"o building\n")
        for v in vertices:
            f.write(f"v {v[0]:.4f} {v[1]:.4f} {v[2]:.4f}\n")
        for vt in uvs:
            f.write(f"vt {vt[0]:.4f} {vt[1]:.4f}\n")
        for vn in normals:
            f.write(f"vn {vn[0]:.4f} {vn[1]:.4f} {vn[2]:.4f}\n")
        f.write(f"usemtl material\n")
        for face in faces:
            f.write(f"f {' '.join(f'{vi}/{uvi}/{ni}' for vi, uvi, ni in face)}\n")


def write_mtl(path, texture_name):
    """Write MTL file referencing the texture."""
    with open(path, "w") as f:
        f.write(f"# Procedural S4WN material\n")
        f.write(f"newmtl material\n")
        f.write(f"Kd 0.8 0.8 0.8\n")
        f.write(f"Ka 0.2 0.2 0.2\n")
        f.write(f"Ks 0.0 0.0 0.0\n")
        f.write(f"Ns 0\n")
        f.write(f"d 1.0\n")
        f.write(f"illum 2\n")
        f.write(f"map_Kd ../textures/{texture_name}\n")


def box_vertices(w, h, d):
    """8 corners of a box at origin."""
    hw, hh, hd = w/2, h/2, d/2
    return {
        'front_bl': (-hw, -hh,  hd),  # 0 — front bottom-left
        'front_br': ( hw, -hh,  hd),  # 1 — front bottom-right
        'front_tr': ( hw,  hh,  hd),  # 2 — front top-right
        'front_tl': (-hw,  hh,  hd),  # 3 — front top-left
        'back_bl':  (-hw, -hh, -hd),  # 4 — back bottom-left
        'back_br':  ( hw, -hh, -hd),  # 5 — back bottom-right
        'back_tr':  ( hw,  hh, -hd),  # 6 — back top-right
        'back_tl':  (-hw,  hh, -hd),  # 7 — back top-left
    }


def box_uvs():
    """UVs for box corners: 8 corners, each face quadrant."""
    return [
        (0.0, 0.0), (1.0, 0.0), (1.0, 1.0), (0.0, 1.0),  # front
        (0.0, 0.0), (1.0, 0.0), (1.0, 1.0), (0.0, 1.0),  # right
        (0.0, 0.0), (1.0, 0.0), (1.0, 1.0), (0.0, 1.0),  # back
        (0.0, 0.0), (1.0, 0.0), (1.0, 1.0), (0.0, 1.0),  # left
        (0.0, 0.0), (1.0, 0.0), (1.0, 1.0), (0.0, 1.0),  # top
        (0.0, 0.0), (1.0, 0.0), (1.0, 1.0), (0.0, 1.0),  # bottom
    ]


def box_faces_uv(start_v, start_uv, start_vn):
    """Quad faces with UV/normal indices (1-indexed)."""
    v, uv, vn = start_v, start_uv, start_vn
    # front(+Z), right(+X), back(-Z), left(-X), top(+Y), bottom(-Y)
    return [
        # face: 4 verts, 4 uvs, 1 normal (use first vertex normal per face)
        [(v+0, uv+0, vn+0), (v+1, uv+1, vn+0), (v+2, uv+2, vn+0), (v+3, uv+3, vn+0)],  # front
        [(v+1, uv+4, vn+1), (v+5, uv+5, vn+1), (v+6, uv+6, vn+1), (v+2, uv+7, vn+1)],  # right
        [(v+5, uv+8, vn+2), (v+4, uv+9, vn+2), (v+7, uv+10, vn+2), (v+6, uv+11, vn+2)],  # back
        [(v+4, uv+12, vn+3), (v+0, uv+13, vn+3), (v+3, uv+14, vn+3), (v+7, uv+15, vn+3)],  # left
        [(v+3, uv+16, vn+4), (v+2, uv+17, vn+4), (v+6, uv+18, vn+4), (v+7, uv+19, vn+4)],  # top
        [(v+0, uv+20, vn+5), (v+4, uv+21, vn+5), (v+5, uv+22, vn+5), (v+1, uv+23, vn+5)],  # bottom
    ]


def face_normals():
    """Normal vectors for each of 6 box faces."""
    return [
        ( 0.0,  0.0,  1.0),  # front
        ( 1.0,  0.0,  0.0),  # right
        ( 0.0,  0.0, -1.0),  # back
        (-1.0,  0.0,  0.0),  # left
        ( 0.0,  1.0,  0.0),  # top
        ( 0.0, -1.0,  0.0),  # bottom
    ]


def add_box(verts, uvs, norms, faces, size, offset, apply_uvs=True):
    """Add a box to the vertex/UV/normal/face arrays. Returns new counts."""
    w, h, d = size
    ox, oy, oz = offset
    bv = box_vertices(w, h, d)
    ordered = [
        bv['front_bl'], bv['front_br'], bv['front_tr'], bv['front_tl'],
        bv['back_bl'],  bv['back_br'],  bv['back_tr'],  bv['back_tl'],
    ]

    v_start = len(verts) + 1  # 1-indexed
    for v in ordered:
        verts.append((v[0] + ox, v[1] + oy, v[2] + oz))

    uv_start = len(uvs) + 1
    if apply_uvs:
        uvs.extend(box_uvs())
    else:
        uvs.extend([(0, 0)] * 24)

    vn_start = len(norms) + 1
    norms.extend(face_normals())

    faces.extend(box_faces_uv(v_start, uv_start, vn_start))


def add_quad(verts, uvs, norms, faces, p1, p2, p3, p4, n):
    """Add a single quad face."""
    v_start = len(verts) + 1
    verts.extend([p1, p2, p3, p4])
    uvs.extend([(0,0), (1,0), (1,1), (0,1)])
    norms.extend([n] * 4)  # one normal per vertex for proper OBJ
    faces.append([(v_start+0, v_start+0, v_start+0),
                  (v_start+1, v_start+1, v_start+1),
                  (v_start+2, v_start+2, v_start+2),
                  (v_start+3, v_start+3, v_start+3)])


def add_triangle(verts, uvs, norms, faces, p1, p2, p3, n):
    """Add a single triangle face."""
    v_start = len(verts) + 1
    verts.extend([p1, p2, p3])
    uvs.extend([(0,0), (1,0), (0.5,1)])
    norms.extend([n] * 3)
    faces.append([(v_start+0, v_start+0, v_start+0),
                  (v_start+1, v_start+1, v_start+1),
                  (v_start+2, v_start+2, v_start+2)])


def generate_shape(shape, size, tex_name):
    """Generate full vertex/UV/normal/face arrays for a shape template."""
    w, h, d = size
    verts, uvs, norms, faces = [], [], [], []

    if shape == "cottage":
        add_box(verts, uvs, norms, faces, (w, h, d), (0, h/2, 0))
        # Gabled roof — two triangular slopes
        half_w, half_d = w*0.55, d*0.55
        peak_y = h + h*0.45
        n_front = (0, 0.7, 0.7)
        n_back = (0, 0.7, -0.7)
        n_top = (0, 1, 0)
        add_triangle(verts, uvs, norms, faces,
            (-half_w, h, -half_d), (half_w, h, -half_d), (0, peak_y, -half_d), n_front)
        add_triangle(verts, uvs, norms, faces,
            (half_w, h, half_d), (-half_w, h, half_d), (0, peak_y, half_d), n_back)
        add_quad(verts, uvs, norms, faces,
            (-half_w, h, -half_d), (0, peak_y, -half_d), (0, peak_y, half_d), (-half_w, h, half_d), (-0.7, 0.7, 0))
        add_quad(verts, uvs, norms, faces,
            (half_w, h, half_d), (0, peak_y, half_d), (0, peak_y, -half_d), (half_w, h, -half_d), (0.7, 0.7, 0))
        # Chimney
        add_box(verts, uvs, norms, faces, (w*0.15, h*0.3, d*0.15), (w*0.25, h + h*0.55, 0))

    elif shape == "keep":
        add_box(verts, uvs, norms, faces, (w, h, d), (0, h/2, 0))
        # Crenellations
        cren_h, cren_w = h * 0.12, w * 0.08
        for dx in [-w*0.35, -w*0.15, w*0.05, w*0.25]:
            add_box(verts, uvs, norms, faces, (cren_w, cren_h, cren_w),
                    (dx, h + cren_h/2, -d*0.45))
            add_box(verts, uvs, norms, faces, (cren_w, cren_h, cren_w),
                    (dx, h + cren_h/2,  d*0.45))
        for dz in [-d*0.35, -d*0.15, d*0.05, d*0.25]:
            add_box(verts, uvs, norms, faces, (cren_w, cren_h, cren_w),
                    (-w*0.45, h + cren_h/2, dz))
            add_box(verts, uvs, norms, faces, (cren_w, cren_h, cren_w),
                    ( w*0.45, h + cren_h/2, dz))

    elif shape == "mine":
        add_box(verts, uvs, norms, faces, (w, h*0.8, d*0.3), (0, h*0.4, 0))
        add_box(verts, uvs, norms, faces, (w*0.5, h*0.5, d*0.15), (0, h*0.35, d*0.15))
        add_box(verts, uvs, norms, faces, (w*1.05, h*0.08, d*0.35), (0, h*0.75, 0))

    elif shape == "barn":
        add_box(verts, uvs, norms, faces, (w, h, d), (0, h/2, 0))
        roof_h = h * 0.5
        add_box(verts, uvs, norms, faces, (w, roof_h, d*0.6), (0, h + roof_h/2 - 0.05, 0))

    elif shape == "temple":
        add_box(verts, uvs, norms, faces, (w*1.05, h*0.3, d*1.05), (0, h*0.15, 0))
        add_box(verts, uvs, norms, faces, (w, h*0.5, d), (0, h*0.35, 0))
        col_r, col_h = w * 0.06, h * 1.8
        for cx, cz in [(-w*0.38, -d*0.38), (w*0.38, -d*0.38), (-w*0.38, d*0.38), (w*0.38, d*0.38)]:
            add_box(verts, uvs, norms, faces, (col_r*2, col_h, col_r*2),
                    (cx, col_h/2 + h*0.5, cz))
        ped_h = h * 0.5
        add_box(verts, uvs, norms, faces, (w*0.9, ped_h, d*0.15), (0, col_h + h*0.6, 0))

    elif shape == "warehouse":
        add_box(verts, uvs, norms, faces, (w, h, d), (0, h/2, 0))
        add_box(verts, uvs, norms, faces, (w*1.02, h*0.06, d*1.02), (0, h + 0.03, 0))
        add_box(verts, uvs, norms, faces, (w*0.5, h*0.5, d*0.15), (0, h*0.25, d*0.45))

    elif shape == "house":
        add_box(verts, uvs, norms, faces, (w, h, d), (0, h/2, 0))
        roof_h = h * 0.6
        half_rw, half_rd = w*0.55, d*0.55
        n_front = (0, 0.7, 0.7)
        n_back = (0, 0.7, -0.7)
        add_triangle(verts, uvs, norms, faces,
            (-half_rw, h, -half_rd), (half_rw, h, -half_rd), (0, h + roof_h, -half_rd), n_front)
        add_triangle(verts, uvs, norms, faces,
            (half_rw, h, half_rd), (-half_rw, h, half_rd), (0, h + roof_h, half_rd), n_back)
        add_quad(verts, uvs, norms, faces,
            (-half_rw, h, -half_rd), (0, h + roof_h, -half_rd), (0, h + roof_h, half_rd), (-half_rw, h, half_rd), (-0.7, 0.7, 0))
        add_quad(verts, uvs, norms, faces,
            (half_rw, h, half_rd), (0, h + roof_h, half_rd), (0, h + roof_h, -half_rd), (half_rw, h, -half_rd), (0.7, 0.7, 0))

    elif shape == "pillar":
        add_box(verts, uvs, norms, faces, (w, h, d), (0, h/2, 0))

    elif shape == "humanoid":
        # ── Humanoid character for isometric view ──
        # Proportions: head 0.25, torso 0.4, legs 0.35 of total height
        hw, hh, hd = w, h, d  # rename for clarity
        # Head (top)
        head_h = hh * 0.25
        add_box(verts, uvs, norms, faces, (hw*1.3, head_h, hd*1.3), (0, hh - head_h/2, 0))
        # Torso (middle)
        torso_h = hh * 0.40
        add_box(verts, uvs, norms, faces, (hw*1.4, torso_h, hd*0.9), (0, hh*0.3, 0))
        # Arms (sides — narrow boxes)
        arm_h = hh * 0.38
        add_box(verts, uvs, norms, faces, (hw*0.22, arm_h, hd*0.22), ( hw*0.85, hh*0.28, 0))
        add_box(verts, uvs, norms, faces, (hw*0.22, arm_h, hd*0.22), (-hw*0.85, hh*0.28, 0))
        # Legs (bottom)
        leg_h = hh * 0.35
        add_box(verts, uvs, norms, faces, (hw*0.45, leg_h, hd*0.45), ( hw*0.3, leg_h/2, 0))
        add_box(verts, uvs, norms, faces, (hw*0.45, leg_h, hd*0.45), (-hw*0.3, leg_h/2, 0))

    return verts, uvs, norms, faces


# ── Main ─────────────────────────────────────────────────────────────

def generate_all(dry_run=False):
    os.makedirs(MODELS_DIR, exist_ok=True)
    count = 0
    for name, (shape, size, tex) in sorted(BUILDINGS.items()):
        obj_path = os.path.join(MODELS_DIR, f"{name}.obj")
        mtl_path = os.path.join(MODELS_DIR, f"{name}.mtl")

        if dry_run:
            print(f"[dry-run] {name}: {shape} {size} tex={tex} → {obj_path}")
            count += 1
            continue

        verts, uvs, norms, faces = generate_shape(shape, size, tex)
        write_obj(obj_path, verts, uvs, norms, faces, f"{name}.mtl")
        write_mtl(mtl_path, tex)
        count += 1

    print(f"Generated {count} UV-unwrapped OBJ+MTL pairs in {MODELS_DIR}")


if __name__ == "__main__":
    dry = "--dry-run" in sys.argv
    generate_all(dry_run=dry)
