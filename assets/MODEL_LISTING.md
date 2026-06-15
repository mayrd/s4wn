# S4WN 3D Model Asset Listing

> Complete catalog of all 3D models needed for a Siedler 4 Web-Native map.
> Status: 🟡 = OBJ exists · ⬜ = not yet generated · ✅ = complete with textures

Last updated: 2026-06-15

---

## 1. Terrain Tiles (9 models)

Base terrain tiles — one per terrain type. Flat diamond shapes for isometric view,
height-displaced quads for full 3D.

| ID | Name | Status | Tris | Color | Notes |
|----|------|--------|------|-------|-------|
| T01 | terrain_grass | 🟡 | 14 | #406620 | Fertile grassland, buildable |
| T02 | terrain_forest | 🟡 | 14 | #26591A | Darker grass with trees |
| T03 | terrain_mountain | 🟡 | 14 | #66605A | Rocky, unbuildable, impassable |
| T04 | terrain_water | 🟡 | 14 | #2659B3 | Shallow water, impassable |
| T05 | terrain_deepwater | 🟡 | 14 | #143380 | Deep water, completely impassable |
| T06 | terrain_desert | 🟡 | 14 | #D9BF66 | Sandy, buildable, slow movement |
| T07 | terrain_swamp | 🟡 | 14 | #4D6640 | Swampy, unbuildable, slow |
| T08 | terrain_snow | 🟡 | 14 | #E6EBF2 | Snow-capped, high elevation |
| T09 | terrain_coast | 🟡 | 14 | #A6B366 | Coastal transition zone |

---

## 2. Vegetation (5 models)

Trees and foliage placed on terrain tiles as decoration and resource indicators.

| ID | Name | Status | Tris | Color | Terrain | Notes |
|----|------|--------|------|-------|---------|-------|
| V01 | tree_pine | 🟡 | 68 | #267A1A | Forest, Mountain | Conifer, 3-tier cone shape |
| V02 | tree_broadleaf | 🟡 | 56 | #338C26 | Grass, Forest | Deciduous, jittered canopy |
| V03 | tree_palm | 🟡 | 26 | #599926 | Desert, Coast | Tropical palm with fronds |
| V04 | bush | 🟡 | 39 | #33731A | Grass, Swamp | Low shrub cluster |
| V05 | cactus | 🟡 | 68 | #408C33 | Desert | Saguaro-style with arms |

---

## 3. Rocks & Minerals (2 models)

Natural rock formations and standalone mineral indicators.

| ID | Name | Status | Tris | Color | Notes |
|----|------|--------|------|-------|-------|
| R01 | rock | 🟡 | 10 | #736B61 | Small boulder, low-poly icosahedron |
| R02 | rock_large | ⬜ | ~30 | #736B61 | Larger rock cluster, 2-3 boulders |

---

## 4. Resource Deposits (8 models)

Harvestable natural resources placed on specific terrain types.

| ID | Name | Status | Tris | Color | Terrain | Resource |
|----|------|--------|------|-------|---------|----------|
| D01 | deposit_stone | 🟡 | 36 | #8C857A | Grass, Mountain | Stone |
| D02 | deposit_iron | 🟡 | 36 | #593326 | Forest, Mountain | Iron |
| D03 | deposit_coal | 🟡 | 36 | #1A1A1A | Grass, Swamp | Coal |
| D04 | deposit_gold | 🟡 | 36 | #D9B326 | Mountain | Gold |
| D05 | deposit_sulfur | 🟡 | 36 | #E6D91A | Desert | Sulfur |
| D06 | deposit_fish | 🟡 | 15 | #6699E6 | Water, Coast | Fish |
| D07 | deposit_grain | 🟡 | 25 | #B3A633 | Grass | Grain |
| D08 | deposit_game | 🟡 | 85 | #8C5933 | Forest | Game (deer silhouette) |

---

## 5. Buildings — Production (9 models)

Buildings that produce resources, process goods, or extract raw materials.

| ID | Name | Status | Tris | Color | Workers | Produces |
|----|------|--------|------|-------|---------|----------|
| B01 | sawmill | 🟡 | 92 | #996633 | 1 | Wood → Planks |
| B02 | quarry | 🟡 | 42 | #808080 | 1 | Stone extraction |
| B03 | mine | 🟡 | 21 | #664D4D | 1 | Iron, Coal, Gold extraction |
| B04 | blacksmith | 🟡 | 44 | #CC3333 | 1 | Iron+Coal → Tools |
| B05 | armory | 🟡 | 66 | #B31A1A | 1 | Iron+Coal+Tools → Weapons |
| B06 | brewery | 🟡 | 74 | #E6B333 | 1 | Grain → Beer |
| B07 | bakery | 🟡 | 32 | #CC9966 | 1 | Grain → Bread |
| B08 | butcher | 🟡 | 44 | #993333 | 1 | Game → Meat |
| B09 | tannery | 🟡 | 56 | #804D33 | 1 | Game → Leather |

---

## 6. Buildings — Food & Raw Materials (3 models)

Primary resource gathering buildings.

| ID | Name | Status | Tris | Color | Workers | Produces |
|----|------|--------|------|-------|---------|----------|
| B10 | farm | 🟡 | 46 | #4DB34D | 1 | Grain (+ fields) |
| B11 | fishery | 🟡 | 56 | #3380CC | 1 | Fish |
| B12 | lumberjack | 🟡 | 60 | #338033 | 1 | Wood |

---

## 7. Buildings — Military & Infrastructure (2 models)

| ID | Name | Status | Tris | Color | Workers | Function |
|----|------|--------|------|-------|---------|----------|
| B13 | headquarters | 🟡 | 90 | #FFCC33 | 0 | Central building, spawn point |
| B14 | warehouse | 🟡 | 32 | #998066 | 0 | +100 resource storage capacity |

---

## 8. Buildings — Construction State (1 model)

Building under construction — scaffolding visible until build time completes.

| ID | Name | Status | Tris | Color | Notes |
|----|------|--------|------|-------|-------|
| C01 | construction | 🟡 | 168 | #B38C4D | Wooden scaffolding frame, 4 posts + beams |

---

## 9. Units — Workers & Military (3 models)

Player-controlled and AI-driven game agents. Require skeletal rigging and animations.

| ID | Name | Status | Tris | Color | HP | Speed | Attack | Notes |
|----|------|--------|------|-------|----|-------|--------|-------|
| U01 | unit_worker | 🟡 | 84 | #3366FF | 50 | 1.0 | 0 | Builds, harvests, carries |
| U02 | unit_soldier | 🟡 | 108 | #FF3333 | 100 | 0.8 | 15 | Melee, shield + sword |
| U03 | unit_archer | 🟡 | 78 | #33CC33 | 75 | 0.7 | 10 | Ranged, bow |

---

## 10. Structures — Roads & Paths (3 models)

Player-placed infrastructure for unit movement and territory expansion.

| ID | Name | Status | Tris | Color | Notes |
|----|------|--------|------|-------|-------|
| S01 | road | 🟡 | 26 | #807366 | Straight segment, cobblestone border |
| S02 | road_cross | 🟡 | 2 | #807366 | 4-way intersection |
| S03 | road_t | 🟡 | 2 | #807366 | T-junction |

---

## 11. Structures — Walls & Fortifications (3 models)

Defensive structures for territory protection.

| ID | Name | Status | Tris | Color | Notes |
|----|------|--------|------|-------|-------|
| S04 | wall | 🟡 | 60 | #807A73 | Straight wall segment with crenellations |
| S05 | wall_corner | 🟡 | 96 | #807A73 | L-shaped corner piece |
| S06 | wall_gate | 🟡 | 64 | #807A73 | Gate with iron bars |

---

## 12. Structures — Special (3 models)

| ID | Name | Status | Tris | Color | Notes |
|----|------|--------|------|-------|-------|
| S07 | bridge | 🟡 | 132 | #8C5933 | Wooden bridge with railings, spans water |
| S08 | flag | 🟡 | 40 | #FF3333 | Banner on pole, territory marker |
| S09 | cart | 🟡 | 160 | #996633 | Wooden cart with 4 wheels, trade transport |

---

## 13. Vehicles (1 model)

| ID | Name | Status | Tris | Color | Notes |
|----|------|--------|------|-------|-------|
| V01 | boat | 🟡 | 28 | #805933 | Small fishing boat with sail, water transport |

---

## 14. Resource Icons — Floating HUD Indicators (11 models)

Small floating shapes that hover above resource deposits or appear in the HUD.

| ID | Name | Status | Tris | Color | Shape | Resource |
|----|------|--------|------|-------|-------|----------|
| I01 | icon_wood | 🟡 | 12 | #8C6633 | Diamond | Wood |
| I02 | icon_stone | 🟡 | 12 | #8C8C8C | Diamond | Stone |
| I03 | icon_iron | 🟡 | 20 | #664033 | Hexagon | Iron |
| I04 | icon_coal | 🟡 | 20 | #262626 | Hexagon | Coal |
| I05 | icon_gold | 🟡 | 28 | #E6BF1A | Circle | Gold |
| I06 | icon_sulfur | 🟡 | 20 | #F2E61A | Hexagon | Sulfur |
| I07 | icon_food | 🟡 | 28 | #CC8033 | Circle | Food (general) |
| I08 | icon_planks | 🟡 | 12 | #996633 | Diamond | Planks |
| I09 | icon_tools | 🟡 | 20 | #808080 | Hexagon | Tools |
| I10 | icon_weapons | 🟡 | 20 | #992626 | Hexagon | Weapons |
| I11 | icon_beer | 🟡 | 28 | #F2BF33 | Circle | Beer |

---

## 15. Map Decoration — Not Yet Generated (11 models)

Additional environmental detail for richer maps.

| ID | Name | Status | Tris | Terrain | Notes |
|----|------|--------|------|---------|-------|
| M01 | stump | ⬜ | ~20 | Forest, Grass | Tree stump after logging |
| M02 | grain_field | ⬜ | ~40 | Grass | Wheat field rows (farm visual) |
| M03 | flowers | ⬜ | ~15 | Grass | Small flower cluster, 3 varieties |
| M04 | mushrooms | ⬜ | ~20 | Forest, Swamp | Fungus cluster |
| M05 | reed | ⬜ | ~25 | Water, Swamp | Cattails/reeds along water edge |
| M06 | driftwood | ⬜ | ~15 | Coast, Water | Washed-up log on shore |
| M07 | skull | ⬜ | ~30 | Desert, Swamp | Animal skull/bones |
| M08 | ruins | ⬜ | ~60 | Desert, Mountain | Broken stone pillar/arch |
| M09 | snowdrift | ⬜ | ~15 | Snow, Mountain | Snow mound |
| M10 | geyser | ⬜ | ~40 | Desert, Swamp | Steam vent with particle effect |
| M11 | nest | ⬜ | ~25 | Forest, Mountain | Bird nest on ground/rock |

---

## 16. Unit Animations — Not Yet Generated (15 animation clips)

Each unit needs animations for all game states. Stored as glTF animation clips.

| ID | Unit | State | Status | Duration | Loop | Keyframes |
|----|------|------|--------|----------|------|-----------|
| A01 | worker | idle | ⬜ | 2.0s | Yes | Stand with slight sway, pickaxe idle |
| A02 | worker | walk | ⬜ | 0.8s | Yes | Walk cycle with pickaxe over shoulder |
| A03 | worker | work | ⬜ | 1.5s | Yes | Mining/harvesting/building swing |
| A04 | worker | carry | ⬜ | 0.9s | Yes | Walk with resource carried |
| A05 | worker | die | ⬜ | 1.0s | Once | Fall and fade |
| A06 | soldier | idle | ⬜ | 2.0s | Yes | Guard stance, shield ready |
| A07 | soldier | walk | ⬜ | 0.8s | Yes | March with shield + sword |
| A08 | soldier | fight | ⬜ | 0.6s | Trigger | Sword swing attack |
| A09 | soldier | defend | ⬜ | 1.0s | Yes | Shield block stance |
| A10 | soldier | die | ⬜ | 1.0s | Once | Fall, drop weapons |
| A11 | archer | idle | ⬜ | 2.0s | Yes | Bow at rest |
| A12 | archer | walk | ⬜ | 0.8s | Yes | Walk with bow |
| A13 | archer | fight | ⬜ | 0.6s | Trigger | Draw and loose arrow |
| A14 | archer | aim | ⬜ | 0.4s | Yes | Bow drawn, aiming |
| A15 | archer | die | ⬜ | 1.0s | Once | Fall, drop bow |

---

## 17. Building Animations — Not Yet Generated (2 animation clips)

| ID | Building | State | Status | Duration | Loop | Notes |
|----|----------|------|--------|----------|------|-------|
| BA01 | all | construct | ⬜ | 3.0s | Once | Scale from 0→1, scaffolding appears/shrinks |
| BA02 | all | idle | ⬜ | — | Yes | Production buildings: small smoke from chimney (particle) |

---

## Summary

| Category | Models | Status |
|----------|--------|--------|
| Terrain Tiles | 9 | 🟡 OBJ |
| Vegetation | 5 | 🟡 OBJ |
| Rocks & Minerals | 2 | 🟡 1 / ⬜ 1 |
| Resource Deposits | 8 | 🟡 OBJ |
| Production Buildings | 9 | 🟡 OBJ |
| Food Buildings | 3 | 🟡 OBJ |
| Military/Infrastructure | 2 | 🟡 OBJ |
| Construction State | 1 | 🟡 OBJ |
| Units | 3 | 🟡 OBJ |
| Roads & Paths | 3 | 🟡 OBJ |
| Walls & Fortifications | 3 | 🟡 OBJ |
| Special Structures | 3 | 🟡 OBJ |
| Vehicles | 1 | 🟡 OBJ |
| Resource Icons | 11 | 🟡 OBJ |
| Map Decorations | 11 | ⬜ |
| Unit Animations | 15 clips | ⬜ |
| Building Animations | 2 clips | ⬜ |

| | Count |
|---|-------|
| **Total OBJ models (existing)** | **62** |
| **Total models still needed** | **11 decorations** |
| **Total animations needed** | **17 clips** |
| **Total triangles (existing)** | **2,721** |
| **Estimated final tris (with decorations)** | **~3,100** |
| **Estimated animation data** | **~250 KB (glTF)** |
