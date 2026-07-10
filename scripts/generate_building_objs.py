#!/usr/bin/env python3
"""
generate_building_objs.py — Procedural OBJ + MTL generator for all S4WN building types.

Each building gets a shape template (cottage, keep, mine, barn, temple, warehouse, house)
with distinctive features and a unique material color. No external models, no AI calls,
no Siedler 4 asset extraction — pure math.

Usage: python3 generate_building_objs.py [--dry-run]
Output: assets/models/<name>.obj + assets/models/<name>.mtl
"""

import os, sys, math

MODELS_DIR = os.path.join(os.path.dirname(__file__), "..", "assets", "models")

# ── Building catalog: name, shape template, size, color ─────────────

BUILDINGS = {
    # Production — gabled cottage with chimney
    "sawmill":          ("cottage", (2.0, 1.5, 2.5), (0.55, 0.35, 0.2)),
    "stonecutter":      ("cottage", (2.0, 1.5, 2.0), (0.6, 0.55, 0.5)),
    "toolsmith":        ("cottage", (2.5, 1.8, 2.5), (0.4, 0.3, 0.3)),
    "weaponsmith":      ("cottage", (2.5, 1.8, 2.5), (0.35, 0.25, 0.25)),
    "bakery":           ("cottage", (2.0, 1.5, 2.0), (0.7, 0.5, 0.3)),
    "butcher":          ("cottage", (2.0, 1.5, 2.0), (0.5, 0.2, 0.15)),
    "mill":             ("cottage", (2.5, 2.0, 2.5), (0.6, 0.4, 0.25)),
    "waterworks":       ("cottage", (1.8, 1.5, 2.0), (0.3, 0.5, 0.6)),
    "smelter":          ("cottage", (2.5, 2.0, 2.5), (0.35, 0.3, 0.3)),
    "gold_smelter":     ("cottage", (2.5, 2.0, 2.5), (0.7, 0.55, 0.2)),
    "iron_smelter":     ("cottage", (2.5, 2.0, 2.5), (0.4, 0.35, 0.35)),
    "powder_mill":      ("cottage", (2.0, 1.5, 2.0), (0.5, 0.45, 0.3)),
    "weapon_foundry":   ("cottage", (2.5, 1.8, 2.5), (0.3, 0.25, 0.25)),
    "oil_press":        ("cottage", (2.0, 1.5, 2.0), (0.65, 0.55, 0.35)),
    "distillery":       ("cottage", (2.0, 1.8, 2.0), (0.5, 0.4, 0.3)),
    "mead_maker":       ("cottage", (2.0, 1.8, 2.0), (0.6, 0.45, 0.25)),
    "vineyard":         ("cottage", (2.0, 1.5, 2.0), (0.4, 0.5, 0.3)),
    "slaughterhouse":   ("cottage", (2.0, 1.5, 2.5), (0.45, 0.15, 0.1)),
    "healer":           ("cottage", (2.0, 1.5, 2.0), (0.5, 0.6, 0.5)),

    # Mining — mine entrance with timber frame
    "mine":             ("mine", (2.0, 2.0, 2.0), (0.4, 0.35, 0.3)),
    "gold_mine":        ("mine", (2.0, 2.0, 2.0), (0.5, 0.4, 0.2)),
    "coal_mine":        ("mine", (2.0, 2.0, 2.0), (0.2, 0.2, 0.2)),
    "iron_ore_mine":    ("mine", (2.0, 2.0, 2.0), (0.45, 0.3, 0.2)),
    "sulfur_mine":      ("mine", (2.0, 2.0, 2.0), (0.55, 0.5, 0.2)),

    # Farming — low barn
    "farm":             ("barn", (3.0, 1.5, 2.5), (0.5, 0.45, 0.35)),
    "fisherman":        ("barn", (2.0, 1.5, 2.5), (0.4, 0.45, 0.5)),
    "woodcutter":       ("barn", (2.0, 1.5, 2.0), (0.45, 0.35, 0.25)),
    "forester":         ("barn", (2.0, 1.5, 2.0), (0.3, 0.5, 0.3)),
    "apiary":           ("barn", (1.5, 1.2, 1.5), (0.6, 0.5, 0.2)),
    "agave_farm":       ("barn", (2.5, 1.5, 2.5), (0.4, 0.55, 0.35)),
    "trojan_farm":      ("barn", (2.5, 1.5, 2.5), (0.55, 0.5, 0.2)),
    "mushroom_farm":    ("barn", (2.0, 1.5, 2.0), (0.3, 0.25, 0.25)),
    "goat_ranch":       ("barn", (2.5, 1.5, 3.0), (0.5, 0.4, 0.3)),
    "pig_ranch":        ("barn", (2.5, 1.5, 3.0), (0.55, 0.35, 0.3)),
    "goose_ranch":      ("barn", (2.5, 1.5, 3.0), (0.5, 0.45, 0.35)),
    "donkey_ranch":     ("barn", (2.5, 1.5, 3.0), (0.45, 0.4, 0.35)),

    # Military — keep with crenellations
    "barracks":         ("keep", (3.0, 3.5, 3.0), (0.45, 0.15, 0.15)),
    "guard_tower":      ("keep", (1.5, 5.0, 1.5), (0.5, 0.45, 0.4)),
    "fortress":         ("keep", (5.0, 6.0, 5.0), (0.4, 0.35, 0.35)),
    "siege_workshop":   ("keep", (3.0, 3.0, 4.0), (0.35, 0.3, 0.3)),
    "dark_fortress":    ("keep", (5.0, 6.0, 5.0), (0.15, 0.1, 0.15)),
    "demon_gate":       ("keep", (2.0, 4.0, 2.0), (0.2, 0.05, 0.1)),

    # Religious — temple with columns and pediment
    "temple_of_bacchus":          ("temple", (3.0, 3.5, 4.0), (0.8, 0.75, 0.65)),
    "colosseum":                  ("temple", (6.0, 4.0, 6.0), (0.7, 0.65, 0.6)),
    "sanctuary_of_minerva":       ("temple", (3.0, 3.5, 4.0), (0.75, 0.7, 0.6)),
    "sanctuary_of_vulcan":        ("temple", (3.0, 3.5, 4.0), (0.6, 0.35, 0.25)),
    "mead_hall":                  ("temple", (4.0, 3.0, 5.0), (0.5, 0.35, 0.2)),
    "sanctuary_of_odin":          ("temple", (3.0, 3.5, 4.0), (0.5, 0.45, 0.4)),
    "sanctuary_of_thor":          ("temple", (3.0, 3.5, 4.0), (0.45, 0.4, 0.35)),
    "sanctuary_of_freya":         ("temple", (3.0, 3.5, 4.0), (0.6, 0.5, 0.45)),
    "temple_of_chac":             ("temple", (3.5, 3.5, 5.0), (0.5, 0.55, 0.45)),
    "sanctuary_of_kukulkan":      ("temple", (3.5, 4.0, 5.0), (0.45, 0.5, 0.4)),
    "sanctuary_of_quetzalcoatl":  ("temple", (3.5, 4.0, 5.0), (0.4, 0.45, 0.35)),
    "sanctuary_of_huitzilopochtli":("temple",(3.5, 4.0, 5.0), (0.35, 0.3, 0.3)),
    "observatory":                ("temple", (2.5, 5.0, 2.5), (0.55, 0.5, 0.45)),
    "oracle_of_apollo":           ("temple", (3.0, 3.5, 4.0), (0.75, 0.7, 0.6)),
    "sanctuary_of_artemis":       ("temple", (3.0, 3.5, 4.0), (0.65, 0.6, 0.55)),
    "sanctuary_of_poseidon":      ("temple", (3.0, 3.5, 4.0), (0.4, 0.5, 0.6)),
    "sanctuary_of_apollo":        ("temple", (3.0, 3.5, 4.0), (0.7, 0.65, 0.55)),
    "amphitheater":               ("temple", (5.0, 3.0, 6.0), (0.7, 0.65, 0.6)),
    "dark_temple":                ("temple", (3.0, 3.5, 4.0), (0.1, 0.08, 0.12)),
    "dark_garden":                ("temple", (2.5, 2.5, 3.0), (0.15, 0.12, 0.15)),
    "sanctuary_of_morbus":        ("temple", (3.0, 3.5, 4.0), (0.15, 0.2, 0.1)),
    "sanctuary_of_pestilence":    ("temple", (3.0, 3.5, 4.0), (0.2, 0.15, 0.08)),
    "small_temple":               ("temple", (2.0, 2.5, 3.0), (0.7, 0.65, 0.6)),
    "large_temple":               ("temple", (4.0, 4.5, 5.0), (0.75, 0.7, 0.6)),

    # Logistics — wide warehouse
    "storehouse":       ("warehouse", (3.0, 2.5, 4.0), (0.45, 0.35, 0.25)),
    "marketplace":      ("warehouse", (4.0, 2.0, 4.0), (0.5, 0.4, 0.3)),
    "storage_yard":     ("warehouse", (3.0, 1.5, 3.0), (0.4, 0.35, 0.3)),
    "landing_dock":     ("warehouse", (3.0, 2.0, 3.0), (0.4, 0.45, 0.5)),
    "shipyard":         ("warehouse", (4.0, 2.5, 5.0), (0.35, 0.3, 0.25)),
    "road_layer":       ("warehouse", (2.0, 1.5, 2.0), (0.5, 0.5, 0.45)),

    # Housing — peaked house
    "small_residence":  ("house", (2.0, 2.0, 2.0), (0.55, 0.4, 0.25)),
    "medium_residence": ("house", (3.0, 2.5, 3.0), (0.5, 0.35, 0.2)),
    "large_residence":  ("house", (4.0, 3.0, 4.0), (0.45, 0.3, 0.15)),

    # Special / decorative
    "runestone":        ("pillar", (0.5, 3.0, 0.5), (0.5, 0.45, 0.4)),
}


# ── OBJ + MTL builder ────────────────────────────────────────────────

def write_obj(path, vertices, faces, mtl_name):
    """Write vertices and faces to an OBJ file."""
    with open(path, "w") as f:
        f.write(f"# Procedural S4WN building model\nmtllib {mtl_name}\n")
        f.write(f"o building\n")
        for v in vertices:
            f.write(f"v {v[0]:.4f} {v[1]:.4f} {v[2]:.4f}\n")
        f.write(f"usemtl material\n")
        for vn in vertices:  # simple face normals = vertex normals
            f.write(f"vn {vn[0]:.4f} {vn[1]:.4f} {vn[2]:.4f}\n")
        for face in faces:
            idx = [str(fi) for fi in face]
            f.write(f"f {' '.join(i + '//' + i for i in idx)}\n")

def write_mtl(path, rgb):
    """Write a simple MTL material file."""
    r, g, b = rgb
    with open(path, "w") as f:
        f.write(f"# Procedural S4WN material\n")
        f.write(f"newmtl material\n")
        f.write(f"Kd {r:.3f} {g:.3f} {b:.3f}\n")
        f.write(f"Ka {r*0.3:.3f} {g*0.3:.3f} {b*0.3:.3f}\n")
        f.write(f"Ks 0.1 0.1 0.1\n")
        f.write(f"Ns 10\n")
        f.write(f"d 1.0\n")
        f.write(f"illum 2\n")

def box_verts(w, h, d):
    """8 corners of a box centered at origin, X=width, Y=height, Z=depth."""
    hw, hh, hd = w/2, h/2, d/2
    return [
        (-hw, -hh,  hd), ( hw, -hh,  hd), ( hw,  hh,  hd), (-hw,  hh,  hd),  # front
        (-hw, -hh, -hd), ( hw, -hh, -hd), ( hw,  hh, -hd), (-hw,  hh, -hd),  # back
    ]

def box_faces():
    """Quad faces for a box: front, right, back, left, top, bottom."""
    return [
        (1,2,3,4), (2,6,7,3), (6,5,8,7), (5,1,4,8),  # sides (1-indexed)
        (4,3,7,8), (1,5,6,2),  # top, bottom
    ]

def append_verts(base, verts, v_offset):
    """Append translated vertices and return updated offset."""
    for v in verts:
        base.append((v[0] + v_offset[0], v[1] + v_offset[1], v[2] + v_offset[2]))
    return len(base)

def generate_shape(shape, size, rgb):
    """Generate vertex + face arrays for a shape template."""
    w, h, d = size
    all_verts = []
    all_faces = []
    v_idx = 0

    def add_box(vx, vy, vz, bw, bh, bd):
        nonlocal v_idx
        verts = box_verts(bw, bh, bd)
        faces = box_faces()
        append_verts(all_verts, verts, (vx, vy, vz))
        for f in faces:
            all_faces.append(tuple(fi + v_idx for fi in f))
        v_idx += 8

    if shape == "cottage":
        # Base box
        add_box(0, h/2, 0, w, h, d)
        # Gabled roof — two sloped planes (triangles)
        half_w, half_d = w*0.55, d*0.55
        peak_y = h + h*0.45
        r_verts = [
            (-half_w, h, -half_d), (half_w, h, -half_d),
            (half_w, h,  half_d), (-half_w, h,  half_d),
            (0, peak_y, -half_d), (0, peak_y, half_d),
        ]
        rv = append_verts(all_verts, r_verts, (0,0,0))
        # Roof triangles (1-indexed offsets from rv)
        all_faces.append((rv+1, rv+2, rv+4))  # front right
        all_faces.append((rv+2, rv+1, rv+3))  # should be: front left
        all_faces.append((rv+1, rv+5, rv+4))  # top
        all_faces.append((rv+2, rv+3, rv+6))  # bottom
        # Chimney
        add_box(w*0.25, h + h*0.55, 0, w*0.15, h*0.3, d*0.15)

    elif shape == "keep":
        # Main block
        add_box(0, h/2, 0, w, h, d)
        # Crenellations (battlements) around top
        cren_h = h * 0.12
        cren_w = w * 0.08
        for dx in [-w*0.35, -w*0.15, w*0.05, w*0.25]:
            add_box(dx, h + cren_h/2, -d*0.45, cren_w, cren_h, cren_w)
            add_box(dx, h + cren_h/2,  d*0.45, cren_w, cren_h, cren_w)
        for dz in [-d*0.35, -d*0.15, d*0.05, d*0.25]:
            add_box(-w*0.45, h + cren_h/2, dz, cren_w, cren_h, cren_w)
            add_box( w*0.45, h + cren_h/2, dz, cren_w, cren_h, cren_w)

    elif shape == "mine":
        # Timber frame (A-frame entrance)
        add_box(0, h*0.4, 0, w, h*0.8, d*0.3)
        # Dark entrance (small indent)
        add_box(0, h*0.35, d*0.15, w*0.5, h*0.5, d*0.15)
        # Crossbeam at top
        add_box(0, h*0.75, 0, w*1.05, h*0.08, d*0.35)

    elif shape == "barn":
        add_box(0, h/2, 0, w, h, d)
        # Sloped roof
        roof_h = h * 0.5
        add_box(0, h + roof_h/2 - 0.05, 0, w, roof_h, d*0.6)

    elif shape == "temple":
        # Stepped base
        add_box(0, h*0.15, 0, w*1.05, h*0.3, d*1.05)
        add_box(0, h*0.35, 0, w, h*0.5, d)
        # Columns (4 corner cylinders → approximated as skinny boxes)
        col_r = w * 0.06
        col_h = h * 1.8
        for cx, cz in [(-w*0.38, -d*0.38), (w*0.38, -d*0.38), (-w*0.38, d*0.38), (w*0.38, d*0.38)]:
            add_box(cx, col_h/2 + h*0.5, cz, col_r*2, col_h, col_r*2)
        # Pediment (triangular roof front)
        ped_h = h * 0.5
        add_box(0, col_h + h*0.6, 0, w*0.9, ped_h, d*0.15)

    elif shape == "warehouse":
        add_box(0, h/2, 0, w, h, d)
        # Flat roof overhang
        add_box(0, h + 0.03, 0, w*1.02, h*0.06, d*1.02)
        # Loading dock
        add_box(0, h*0.25, d*0.45, w*0.5, h*0.5, d*0.15)

    elif shape == "house":
        add_box(0, h/2, 0, w, h, d)
        # Peaked roof
        roof_h = h * 0.6
        half_rw, half_rd = w*0.55, d*0.55
        r_verts = [
            (-half_rw, h, -half_rd), (half_rw, h, -half_rd),
            (half_rw, h,  half_rd), (-half_rw, h,  half_rd),
            (0, h + roof_h, -half_rd), (0, h + roof_h, half_rd),
        ]
        rv = append_verts(all_verts, r_verts, (0,0,0))
        all_faces.append((rv+1, rv+2, rv+4))
        all_faces.append((rv+2, rv+1, rv+3))
        all_faces.append((rv+1, rv+5, rv+4))
        all_faces.append((rv+2, rv+3, rv+6))

    elif shape == "pillar":
        add_box(0, h/2, 0, w, h, d)

    return all_verts, all_faces


# ── Main ─────────────────────────────────────────────────────────────

def generate_all(dry_run=False):
    os.makedirs(MODELS_DIR, exist_ok=True)
    count = 0
    for name, (shape, size, rgb) in sorted(BUILDINGS.items()):
        obj_path = os.path.join(MODELS_DIR, f"{name}.obj")
        mtl_path = os.path.join(MODELS_DIR, f"{name}.mtl")
        mtl_name = f"{name}.mtl"

        if dry_run:
            print(f"[dry-run] {name}: {shape} {size} rgb={rgb} → {obj_path}, {mtl_path}")
            count += 1
            continue

        verts, faces = generate_shape(shape, size, rgb)
        write_obj(obj_path, verts, faces, mtl_name)
        write_mtl(mtl_path, rgb)
        count += 1

    print(f"Generated {count} building OBJ+MTL pairs in {MODELS_DIR}")

if __name__ == "__main__":
    dry = "--dry-run" in sys.argv
    generate_all(dry_run=dry)
