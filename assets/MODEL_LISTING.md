# S4WN 3D Model Asset Listing

> Complete catalog of all 3D models needed for a Siedler 4 Web-Native map.
> Status: 🟡 = OBJ exists · 🟢 = GLB available (CC0) · ⬜ = not yet generated · ✅ = complete with textures

Last updated: 2026-06-15 (terrain textures updated for better S4 fidelity)

---

## CC0 Model Sources

All models in `/assets/models/poly_pizza/` are CC0 public domain from 
[Poly Pizza](https://poly.pizza) (by Quaternius). These can be used 
commercially without attribution. Downloaded models include:

- `castle.glb` - Castle/fortress (for Castle, Barracks)
- `house.glb` - House/Half-timber (for Farm, Sawmill)
- `town_center.glb` - Town center (for Storehouse, Marketplace)
- `windmill.glb` - Windmill (for Fisherman)
- `well.glb` - Well (for Stonecutter)
- `tree.glb` - Tree (for Bush, vegetation)
- `cactus.glb` - Cactus (for Desert)
- `rock.glb` - Rock (for deposits, decorations)
- `boat.glb` - Boat (for Water transport)

---

## 1. Terrain Tiles (8 models)

**Terrain textures have been enhanced** with richer noise patterns and 
S4-authentic color variations (see `scripts/generate_terrain_textures.js`).
Each tile now includes terrain-specific details:
- Grass: wildflower speckles, clover clusters
- Forest: fallen leaves, pine needle coverage
- Mountain: stratified rock layers, mineral veins
- Water: gentle ripples, caustics
- Desert: wind-rippled dunes, pebble details
- Snow: drift patterns, ice sparkles
- Swamp: algae patches, lily pads, twisted roots

| ID | Name | Status | Tris | Color | Notes |
|----|------|--------|------|-------|-------|
| T01 | terrain_grass | 🟢 | 14 | #3D7A35 | Enhanced with flower speckles |
| T02 | terrain_forest | 🟢 | 14 | #26591A | Enhanced with leaf coverage |
| T03 | terrain_mountain | 🟢 | 14 | #66605A | Enhanced with strata/vains |
| T04 | terrain_water | 🟢 | 14 | #2659B3 | Enhanced with ripples |
| T05 | terrain_deepwater | 🟢 | 14 | #143380 | Rich deep ocean pattern |
| T06 | terrain_desert | 🟢 | 14 | #D9BF66 | Enhanced with dunes |
| T07 | terrain_swamp | 🟢 | 14 | #4D6640 | Enhanced with algae/lily |
| T08 | terrain_snow | 🟢 | 14 | #E6EBF2 | Enhanced with sparkles |


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

---

## 2. Vegetation (5 models)

Trees and foliage placed on terrain tiles as decoration and resource indicators.

| ID | Name | Status | Tris | Color | Terrain | Notes |
|----|------|--------|------|-------|---------|-------|
| V01 | tree_pine | 🟡 | 68 | #267A1A | Forest, Mountain | Conifer, 3-tier cone shape |
| V02 | tree_broadleaf | 🟡 | 56 | #338C26 | Grass, Forest | Deciduous, jittered canopy |
| V03 | tree_palm | 🟡 | 26 | #599926 | Desert | Tropical palm with fronds |
| V04 | bush | 🟡 | 39 | #33731A | Grass, Swamp | Low shrub cluster |
| V05 | cactus | 🟡 | 68 | #408C33 | Desert | Saguaro-style with arms |

---

## 3. Rocks & Minerals (2 models)

Natural rock formations and standalone mineral indicators.

| ID | Name | Status | Tris | Color | Notes |
|----|------|--------|------|-------|-------|
| R01 | rock | 🟡 | 10 | #736B61 | Small boulder, low-poly icosahedron |
| R02 | rock_large | 🟡 | 30 | #807870 | Cluster of 5 jagged boulders, rocky terrain |

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
| D06 | deposit_fish | 🟡 | 15 | #6699E6 | Water | Fish |
| D07 | deposit_grain | 🟡 | 25 | #B3A633 | Grass | Grain |
| D08 | deposit_game | 🟡 | 85 | #8C5933 | Forest | Game (deer silhouette) |

---

## 5. Buildings — Production (9 models)

Buildings that produce resources, process goods, or extract raw materials.

| ID | Name | Status | Tris | Color | Workers | Produces |
|----|------|--------|------|-------|---------|----------|
| B01 | sawmill | 🟡 | 92 | #996633 | 1 | Wood → Boards |
| B02 | stonecutter | 🟡 | 42 | #808080 | 1 | Stone extraction |
| B03 | mine | 🟡 | 21 | #664D4D | 1 | Iron, Coal, Gold extraction |
| B04 | toolsmith | 🟡 | 44 | #CC3333 | 1 | Iron+Coal → Tools |
| B05 | weaponsmith | 🟡 | 66 | #B31A1A | 1 | Iron+Coal+Tools → Weapons |
| B06 | bakery | 🟡 | 32 | #CC9966 | 1 | Grain → Bread |
| B08 | butcher | 🟡 | 44 | #993333 | 1 | Game → Meat |

---

## 6. Buildings — Food & Raw Materials (3 models)

Primary resource gathering buildings.

| ID | Name | Status | Tris | Color | Workers | Produces |
|----|------|--------|------|-------|---------|----------|
| B10 | farm | 🟡 | 46 | #4DB34D | 1 | Grain (+ fields) |
| B11 | fisherman | 🟡 | 56 | #3380CC | 1 | Fish |
| B12 | woodcutter | 🟡 | 60 | #338033 | 1 | Wood |

---

## 7. Buildings — Military & Infrastructure (2 models)

| ID | Name | Status | Tris | Color | Workers | Function |
|----|------|--------|------|-------|---------|----------|
| B13 | castle | 🟡 | 90 | #FFCC33 | 0 | Central building, spawns settlers |
| B14 | storehouse | 🟡 | 32 | #998066 | 0 | +100 resource storage capacity |

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
| U01 | unit_settler | 🟡 | 84 | #3366FF | 50 | 1.0 | 0 | Builds, harvests, carries |
| U02 | unit_swordsman | 🟡 | 108 | #FF3333 | 100 | 0.8 | 15 | Melee, shield + sword |
| U03 | unit_bowman | 🟡 | 78 | #33CC33 | 75 | 0.7 | 10 | Ranged, bow |

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
| I08 | icon_boards | 🟡 | 12 | #996633 | Diamond | Boards |
| I09 | icon_tools | 🟡 | 20 | #808080 | Hexagon | Tools |
| I10 | icon_weapons | 🟡 | 20 | #992626 | Hexagon | Weapons |
| I11 | icon_beer | 🟡 | 28 | #F2BF33 | Circle | Beer |

---

## 15. Map Decoration (11 models)

Additional environmental detail for richer maps.

| ID | Name | Status | Tris | Terrain | Notes |
|----|------|--------|------|---------|-------|
| M01 | stump | 🟡 | 84 | Forest, Grass | Tree stump with exposed roots + growth ring |
| M02 | grain_field | 🟡 | 364 | Grass | 4×4 wheat stalk grid (farm visual) |
| M03 | flowers | 🟡 | 246 | Grass | 3 flowers: red/blue/yellow with petals + leaves |
| M04 | mushrooms | 🟡 | 96 | Forest, Swamp | 3 mushrooms: tall/medium/small with caps |
| M05 | reed | 🟡 | 174 | Water, Swamp | 6 cattails with leaf blades |
| M06 | driftwood | 🟡 | 40 | Water | Water-worn log with branch stub |
| M07 | skull | 🟡 | 68 | Desert, Swamp | Horned animal skull with eye sockets |
| M08 | ruins | 🟡 | 72 | Desert, Mountain | Broken stone pillar + scattered rubble + arch |
| M09 | snowdrift | 🟡 | 52 | Snow, Mountain | Smooth snow mound with drift tail |
| M10 | geyser | 🟡 | 65 | Desert, Swamp | Rock base with steam plume cones |
| M11 | nest | 🟡 | 92 | Forest, Mountain | Twig bowl with 3 eggs + protruding twigs |

---

## 16. Unit Animations (15 clips)

Procedural skeletal keyframe data — 12-bone humanoid rig, quaternion rotations,
30 FPS. Stored as JSON for engine loading. Format: per-bone keyframe arrays
with `[x, y, z, w]` quaternions.

| ID | Unit | State | Status | Duration | Loop | Keyframes | File |
|----|------|------|--------|----------|------|-----------|------|
| A01 | settler | idle | 🟡 | 2.0s | Yes | 60 | A01_settler_idle.json |
| A02 | settler | walk | 🟡 | 0.8s | Yes | 24 | A02_settler_walk.json |
| A03 | settler | work | 🟡 | 1.5s | Yes | 45 | A03_settler_work.json |
| A04 | settler | carry | 🟡 | 0.9s | Yes | 27 | A04_settler_carry.json |
| A05 | settler | die | 🟡 | 1.0s | Once | 30 | A05_settler_die.json |
| A06 | swordsman | idle | 🟡 | 2.0s | Yes | 60 | A06_swordsman_idle.json |
| A07 | swordsman | walk | 🟡 | 0.8s | Yes | 24 | A07_swordsman_walk.json |
| A08 | swordsman | fight | 🟡 | 0.6s | Trigger | 18 | A08_swordsman_fight.json |
| A09 | swordsman | defend | 🟡 | 1.0s | Yes | 30 | A09_swordsman_defend.json |
| A10 | swordsman | die | 🟡 | 1.0s | Once | 30 | A10_swordsman_die.json |
| A11 | bowman | idle | 🟡 | 2.0s | Yes | 60 | A11_bowman_idle.json |
| A12 | bowman | walk | 🟡 | 0.8s | Yes | 24 | A12_bowman_walk.json |
| A13 | bowman | fight | 🟡 | 0.6s | Trigger | 18 | A13_bowman_fight.json |
| A14 | bowman | aim | 🟡 | 0.4s | Yes | 12 | A14_bowman_aim.json |
| A15 | bowman | die | 🟡 | 1.0s | Once | 30 | A15_bowman_die.json |

## 17. Building Animations (2 clips)

| ID | Building | State | Status | Duration | Loop | Keyframes | File |
|----|----------|------|--------|----------|------|-----------|------|
| BA01 | all | construct | 🟡 | 3.0s | Once | 90 | BA01_building_construct.json |
| BA02 | all | idle | 🟡 | 2.0s | Yes | 60 | BA02_building_idle.json |

---

## Summary

| Category | Models | Status |
|----------|--------|--------|
| Terrain Tiles | 9 | 🟡 OBJ |
| Vegetation | 5 | 🟡 OBJ |
| Rocks & Minerals | 2 | 🟡 OBJ |
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
| Map Decorations | 11 | 🟡 OBJ |
| Unit Animations | 15 clips | 🟡 JSON keyframe data |
| Building Animations | 2 clips | 🟡 JSON keyframe data |

| | Count |
|---|-------|
| **Total OBJ models (existing)** | **74** |
| **Total models still needed** | **0** |
| **Total animations needed** | **17 clips** |
| **Total triangles (existing)** | **4,104** |
| **Total textures** | **44** |
| **Estimated animation data** | **~250 KB (glTF)** |

---

## 18. Texture Assets (44 textures)

All textures procedurally generated, seamless tiling, PNG/RGBA format.

### Terrain Textures (8) — 256×256 PNG

| ID | Name | Type | Format | Notes |
|----|------|------|--------|-------|
| TX01 | terrain_grass | Diffuse | PNG 256² | Green with subtle noise variation |
| TX02 | terrain_forest | Diffuse | PNG 256² | Dark green, dense noise |
| TX03 | terrain_mountain | Diffuse | PNG 256² | Grey-brown rocky surface |
| TX04 | terrain_water | Diffuse | PNG 256² | Blue with gentle wave pattern |
| TX05 | terrain_deepwater | Diffuse | PNG 256² | Dark navy, subtle variation |
| TX06 | terrain_desert | Diffuse | PNG 256² | Sandy yellow-beige |
| TX07 | terrain_swamp | Diffuse | PNG 256² | Murky green-brown |
| TX08 | terrain_snow | Diffuse | PNG 256² | White with subtle blue-grey variation |

### Building Materials (4) — 256×256 PNG

| ID | Name | Type | Format | Notes |
|----|------|------|--------|-------|
| TX10 | material_wood | Diffuse | PNG 256² | Brown with grain lines |
| TX11 | material_stone | Diffuse | PNG 256² | Grey-brown stone blocks |
| TX12 | material_thatch | Diffuse | PNG 256² | Golden straw with grain |
| TX13 | material_metal | Diffuse | PNG 256² | Silver-grey metallic |

### Unit Textures (3) — 128×128 PNG

| ID | Name | Type | Format | Notes |
|----|------|------|--------|-------|
| TX14 | unit_worker | Diffuse | PNG 128² | Blue fabric texture |
| TX15 | unit_soldier | Diffuse | PNG 128² | Red fabric texture |
| TX16 | unit_archer | Diffuse | PNG 128² | Green fabric texture |

### Resource Deposit Textures (8) — 128×128 PNG

| ID | Name | Type | Format | Notes |
|----|------|------|--------|-------|
| TX17 | deposit_iron | Diffuse | PNG 128² | Dark reddish-brown with metallic specks |
| TX18 | deposit_coal | Diffuse | PNG 128² | Near-black with subtle variation |
| TX19 | deposit_gold | Diffuse | PNG 128² | Yellow-gold with bright specks |
| TX20 | deposit_stone | Diffuse | PNG 128² | Grey with crystalline specks |
| TX21 | deposit_sulfur | Diffuse | PNG 128² | Bright yellow with specks |
| TX22 | deposit_fish | Diffuse | PNG 128² | Blue-grey aquatic |
| TX23 | deposit_game | Diffuse | PNG 128² | Warm brown animal hide |
| TX24 | deposit_grain | Diffuse | PNG 128² | Golden wheat |

### Vegetation Textures (3) — 128×128 PNG

| ID | Name | Type | Format | Notes |
|----|------|------|--------|-------|
| TX25 | veg_bark | Diffuse | PNG 128² | Brown with vertical grain lines |
| TX26 | veg_leaves | Diffuse | PNG 128² | Green with dot-cluster detail |
| TX27 | veg_palm | Diffuse | PNG 128² | Tropical green with leaf detail |

### Special Textures (2)

| ID | Name | Type | Format | Notes |
|----|------|------|--------|-------|
| TX28 | water_normal | Normal map | PNG 256² | RGB normal map for water ripples |
| TX29 | sky_gradient | Gradient | PNG 256×4 | Dawn→noon→dusk→night gradient |

### Resource Icons (11) — 64×64 RGBA PNG

| ID | Name | Type | Format | Notes |
|----|------|------|--------|-------|
| TX30 | icon_wood | Icon | RGBA 64² | Circle, transparent background |
| TX31 | icon_stone | Icon | RGBA 64² | Circle, transparent background |
| TX32 | icon_iron | Icon | RGBA 64² | Circle, transparent background |
| TX33 | icon_coal | Icon | RGBA 64² | Circle, transparent background |
| TX34 | icon_gold | Icon | RGBA 64² | Circle, transparent background |
| TX35 | icon_sulfur | Icon | RGBA 64² | Circle, transparent background |
| TX36 | icon_food | Icon | RGBA 64² | Circle, transparent background |
| TX37 | icon_boards | Icon | RGBA 64² | Circle, transparent background |
| TX38 | icon_tools | Icon | RGBA 64² | Circle, transparent background |
| TX39 | icon_weapons | Icon | RGBA 64² | Circle, transparent background |
| TX40 | icon_beer | Icon | RGBA 64² | Circle, transparent background |

### Particle Textures (4) — 64×64 RGBA PNG

| ID | Name | Type | Format | Notes |
|----|------|------|--------|-------|
| TX41 | particle_smoke | Particle | RGBA 64² | Soft grey radial gradient |
| TX42 | particle_spark | Particle | RGBA 64² | Sharp yellow-orange radial |
| TX43 | particle_dust | Particle | RGBA 64² | Soft tan radial gradient |
| TX44 | particle_leaves | Particle | RGBA 64² | Soft green radial gradient |

### Border Post Textures (5) — 256×256 PNG

> Border posts are placed by Pioneer settlers to mark territorial boundaries.
> Each nation has a distinct color-coded post.

| ID | Name | Type | Format | Notes |
|----|------|------|--------|-------|
| TX45 | borderpost_roman | Diffuse | PNG 256² | Weathered brown timber + crimson pennant |
| TX46 | borderpost_viking | Diffuse | PNG 256² | Dark brown timber + navy blue pennant |
| TX47 | borderpost_mayan | Diffuse | PNG 256² | Golden-brown timber + emerald pennant |
| TX48 | borderpost_trojan | Diffuse | PNG 256² | Tan timber + golden brown pennant |
| TX49 | borderpost_dark | Diffuse | PNG 256² | Obsidian-black stake + purple ethereal pennant |

### Border Post Models (5) — OBJ

> Simple stake model with pennant/flag, placed on borders by Pioneer settlers.

| ID | Name | Status | Tris | Color | Nation | Notes |
|----|------|--------|------|-------|--------|-------|
| BP01 | borderpost_roman | ⬜ | 40 | #CC3333 | Romans | Rough timber stake + crimson pennant flag |
| BP02 | borderpost_viking | ⬜ | 40 | #3366CC | Vikings | Dark timber stake + navy blue pennant |
| BP03 | borderpost_mayan | ⬜ | 40 | #33CC33 | Mayans | Golden-brown stake + emerald pennant |
| BP04 | borderpost_trojan | ⬜ | 40 | #CC9933 | Trojans | Tan timber stake + golden pennant |
| BP05 | borderpost_dark | ⬜ | 40 | #9933CC | Dark Tribe | Twisted obsidian stake + purple aura flag |

---

## 19. Border Posts (5 models)

Border posts are placed by Pioneer settlers to dynamically expand territory
without requiring military towers. Each post is color-coded to its nation.

| ID | Name | Status | Tris | Terrain | Nation | Function |
|----|------|--------|------|---------|--------|----------|
| BP01 | borderpost_roman | ⬜ | 40 | Border tiles | Roman | Territory marker, red pennant |
| BP02 | borderpost_viking | ⬜ | 40 | Border tiles | Viking | Territory marker, blue pennant |
| BP03 | borderpost_mayan | ⬜ | 40 | Border tiles | Mayan | Territory marker, green pennant |
| BP04 | borderpost_trojan | ⬜ | 40 | Border tiles | Trojan | Territory marker, tan pennant |
| BP05 | borderpost_dark | ⬜ | 40 | Border tiles | Dark Tribe | Territory marker, purple pennant |
