# S4WN Asset Generation Prompts

Central reference for all prompts used to generate game assets.
For regenerating assets, run `python3 scripts/generate_art.py`.

---

## UI / Brand Assets

> **⚠️ Aspect ratio requirement:** Splash screen and menu background must work
> in BOTH 16:9 (desktop) and 9:16 (mobile/portrait). Generate at 4K resolution
> with the critical focal content inside a **center 9:16 safe zone** so the
> image crops cleanly to either orientation. The game uses CSS `object-fit: cover`
> or `background-size: cover` to auto-crop to the viewport.

### Splash Screen (`assets/images/splash.png`)
```
Epic splash screen for a medieval fantasy settlement-building strategy game
called S4WN. Rich painterly oil-painting style. A sprawling medieval village
nestled in a lush green valley at golden hour: timber-framed houses, a stone
castle on a hill, wheat fields, orchards, winding cobblestone paths, a river
with a watermill, distant snow-capped mountains, warm amber sunlight casting
long shadows. Foreground shows a wooden signpost reading "S4WN".

CRITICAL LAYOUT: All key subjects (castle, village, signpost, river, watermill)
must be inside the CENTER VERTICAL STRIP of the image so the composition works
when cropped to a narrow 9:16 phone screen. The left and right thirds can
contain scenic filler (trees, distant hills, sky) that can be safely cut off
without losing the focal point. The signpost with "S4WN" must be centered
horizontally. Vibrant, immersive, high fantasy but grounded in medieval
European aesthetics. No modern elements. Cinematic composition, 4K ultra HD
quality, highly detailed.
```

### Main Menu Background (`assets/images/menu-bg.png`)
```
Main menu background for medieval settlement strategy game S4WN. Twilight
atmosphere: medieval village silhouette against deep purple-orange sunset sky
with emerging stars. Soft glowing lanterns in cottage windows, a castle tower
silhouetted on the horizon, mist rolling over fields.

CRITICAL LAYOUT: The entire image must work at both 16:9 and 9:16 ratios.
The dark empty area for menu text overlay must be a CENTER BAND (not just the
left side) — centered both horizontally and vertically — so menu buttons are
legible in landscape AND portrait. The atmospheric elements (village, castle,
lanterns, stars) should frame this center band from above and below in 16:9,
and from top/bottom edges in 9:16 portrait. Painterly oil-painting style, rich
atmospheric lighting, cinematic. No text or UI elements — pure background art.
Dark edges, atmospheric, medieval European aesthetic.
```

### Logo (1024×1024 — `assets/images/logo-1024.png`)
```
Game logo for "S4WN" in classic Siedler 4 video game style. Bold rustic
medieval typography: "S4" large and prominent, "WN" smaller below. Carved
from weathered wood and stone texture. Bronze/gold metallic rim with medieval
ornamental flourishes — oak leaves, wheat sheaves, small castle tower emblem.
Colors: warm gold, aged bronze, dark wood brown, cream parchment. Professional
game logo, iconic. Sharp, clean. Transparent or neutral background.
```

### Favicon (256×256 — `assets/images/favicon-256.png`)
```
Favicon for strategy game S4WN. Medieval castle tower silhouette in warm gold
on a dark forest-green circular background. Clean, crisp, simple shapes.
Instantly recognizable at tiny size. No text. Transparent background.
```

---

## UI / Interface Textures

> **UI textures give the game Siedler 4's distinctive medieval panel-and-gold
> aesthetic.** These replace the current flat CSS gradients with textured
> backgrounds, decorated buttons, ornamental corners, and resource icons.
> Output path: `assets/textures/ui_<name>.png`

### Panel Background (`assets/textures/ui_panel.png`)
**Used by:** HUD panels, object explorer, debug panel, map editor
```
Seamless tileable dark wood panel texture, 256×256 pixels. Vertical wooden
planks with deep brown grain (RGB 70,45,30), subtle saw marks, slight gap
between planks. Heavy medieval wood — like a tavern tabletop. Flat view,
evenly lit. Must tile seamlessly top-to-bottom (panels scroll vertically).
No borders or ornaments — pure material. Photorealistic game UI texture.
```

### Panel Header Bar (`assets/textures/ui_header.png`)
**Used by:** Explorer/list headers, panel title bars
```
Horizontal ornamental UI header bar, 400×40 pixels. Rich dark wood with
carved gold ornamental border top and bottom, small gold rivets at corners.
Centered area slightly lighter for header text. Medieval Siedler 4 style
panel header. No text embedded — pure decorative bar. Flat view.
```

### Button — Normal (`assets/textures/ui_button.png`)
**Used by:** All menu and HUD buttons (default state)
```
Medieval UI button, 200×60 pixels. Rectangular stone block with carved gold
border rim, warm parchment-colored center. Slight bevel giving 3D raised
appearance. Gold corner ornaments with small rivets. Clean, crisp edges.
No text. Siedler 4 style game button. Flat view, evenly lit.
```

### Button — Hover (`assets/textures/ui_button_hover.png`)
**Used by:** Same buttons, hover/mouse-over state
```
Same medieval UI button as ui_button.png, 200×60 pixels, but brighter.
Gold border glows slightly, parchment center is warmer and brighter by ~15%.
Still raised appearance but illuminated as if highlighted. No text.
```

### Button — Pressed (`assets/textures/ui_button_pressed.png`)
**Used by:** Same buttons, pressed/active state
```
Same medieval UI button as ui_button.png, 200×60 pixels, but depressed.
Inset/depressed 3D appearance — gold border sinks inward, parchment center
darker and recessed. Slight shadow at inner edges. No text.
```

### Panel Corner Ornament (`assets/textures/ui_corner.png`)
**Used by:** Top-left, top-right, bottom-left, bottom-right corners of panels
```
Square medieval UI corner ornament, 64×64 pixels. Intricate gold filigree
in the corner of a dark wood panel. Curving gold scrollwork with small
gold rivet at the outermost tip. Transparent background outside the
ornament. Used in all four corners (CSS rotates for each). Siedler 4 style.
```

### Gold Divider (`assets/textures/ui_divider.png`)
**Used by:** Horizontal separators between UI sections
```
Horizontal gold ornamental divider line, 400×8 pixels. Thin gold bar with
small diamond-shaped gem in center, subtle engraved pattern along length.
Small decorative curls at ends. Semi-transparent on dark wood background.
Siedler 4 UI element. Flat view.
```

### Resource Icons — Sprite Sheet (`assets/textures/ui_resources.png`)
**Used by:** HUD resource display, economy panel
```
Sprite sheet of 14 medieval resource icons arranged in a 7×2 grid, each
32×32 pixels (total 224×64). Each icon is a small circular gold-rimmed
medallion with the resource depicted inside on a dark wood background.
Left-to-right, top-to-bottom:
Row 1: Wood (logs), Iron Ore (grey rock), Coal (black lump), Gold (coin),
Stone (grey block), Sulfur (yellow crystal), Fish (silver fish)
Row 2: Grain (wheat sheaf), Meat (drumstick), Water (blue drop),
Honey (golden pot), Planks (stacked boards), Tools (hammer+pickaxe),
Weapons (sword+shield)
Each icon: clean, simple, readable at 32×32. Siedler 4 style.
```

### Building Icons — Placeholder Note
> Building and unit selection icons should be generated per type once the
> building textures are available. Each 48×48 circular icon showing the
> building/unit silhouette on a gold-rimmed dark wood background.
> For now, OBJ thumbnail renders can serve this purpose once textures exist.

---

## Terrain Textures

> **All terrain textures: 1024×1024 pixels, seamless/tileable in all 4 directions,
> PNG format.** Terrain spans a 100×100 world map; textures tile across the entire
> plane. Each texture must wrap perfectly at all edges so identical tiles
> blend seamlessly at grid boundaries. Output paths are listed per type.
> Applied via Babylon.js `Texture` on the ground mesh in `TerrainRenderer.ts`.

### Terrain UV Layout

The terrain plane is a single quad spanning the full map. UVs repeat
across the [0,1] range per tile — so a 1024×1024 texture tiles once
per terrain cell. Tiling direction: X (right), Z (forward). The splat-map
shader blends up to 4 texture layers per pixel based on terrain type weights.

| Texture                       | Used for              | Output path                             |
|-------------------------------|-----------------------|-----------------------------------------|
| `terrain_grass.png`           | Grass, meadows        | `assets/textures/terrain_grass.png`     |
| `terrain_forest.png`          | Forest, woodland      | `assets/textures/terrain_forest.png`    |
| `terrain_desert.png`          | Desert, arid plains   | `assets/textures/terrain_desert.png`    |
| `terrain_mountain.png`        | Mountain, high peaks  | `assets/textures/terrain_mountain.png`  |
| `terrain_snow.png`            | Snow, ice caps        | `assets/textures/terrain_snow.png`      |
| `terrain_water.png`           | Shallow water, rivers | `assets/textures/terrain_water.png`     |
| `terrain_deepwater.png`       | Deep ocean            | `assets/textures/terrain_deepwater.png` |
| `terrain_swamp.png`           | Swamp, marsh          | `assets/textures/terrain_swamp.png`     |

### Grass (`assets/textures/terrain_grass.png`)
```
Seamless tileable medieval grass texture, top-down view, 1024×1024 pixels.
Lush green meadow with subtle variation: patches of lighter green, tiny
wildflowers scattered sparsely (white daisies, yellow dandelions), very
short grass blades. Slight natural variation in hue but no obvious repeating
pattern. Flat top-down orthographic view, evenly diffuse-lit. No shadows,
no modern elements, no text. Must tile seamlessly at all four edges —
identical texture at left and right edges, top and bottom edges. Photorealistic
game terrain texture.
```

### Forest (`assets/textures/terrain_forest.png`)
```
Seamless tileable forest floor texture, top-down view, 1024×1024 pixels.
Dark woodland ground: rich dark brown soil with fallen leaves (autumn
orange, brown, amber), small patches of green moss on stones, occasional
tiny ferns. Deep earthy tones. Flat top-down view, diffuse-lit. No
individual trees visible — this is the ground cover texture. Must tile
seamlessly at all four edges. Photorealistic game terrain texture.
```

### Desert (`assets/textures/terrain_desert.png`)
```
Seamless tileable desert sand texture, top-down view, 1024×1024 pixels.
Warm golden-orange sand with natural ripple patterns from wind, small
scattered pebbles and occasional tufts of dry grass. Slight dune-like
curve in sand ripple direction. Sandy beige-gold palette. Flat top-down
view, diffuse-lit. Must tile seamlessly at all four edges. Photorealistic
game terrain texture.
```

### Mountain (`assets/textures/terrain_mountain.png`)
```
Seamless tileable rocky mountain terrain texture, top-down view, 1024×1024
pixels. Jagged grey-brown rock surface with exposed stone faces, small
cracks, patches of sparse alpine grass between rocks. High-altitude feel.
Neutral grey-brown palette with subtle green-grey lichen patches. Flat
top-down view, diffuse-lit. Must tile seamlessly at all four edges.
Photorealistic game terrain texture.
```

### Snow (`assets/textures/terrain_snow.png`)
```
Seamless tileable snow-covered terrain texture, top-down view, 1024×1024
pixels. Pristine white snow with subtle crystalline sparkle, slight
undulation suggesting underlying ground shape. Occasional exposed grey
rock tip and small patches of ice-blue shadow in depressions. Bright
white with pale blue-grey undertones. Flat top-down view, diffuse-lit.
Must tile seamlessly at all four edges. Photorealistic game terrain texture.
```

### Water (`assets/textures/terrain_water.png`)
```
Seamless tileable shallow water texture, top-down view, 1024×1024 pixels.
Gentle rippling water surface in teal-blue, with subtle light caustic
patterns from sunlight refraction. Slightly darker in center of each
ripple, lighter at crests. See-through shallow-water feel with hints
of sandy riverbed below. Cool blue-green palette. Flat top-down view,
diffuse-lit. Must tile seamlessly at all four edges. Photorealistic
game terrain texture.
```

### Deep Water (`assets/textures/terrain_deepwater.png`)
```
Seamless tileable deep ocean water texture, top-down view, 1024×1024
pixels. Dark navy-blue water surface with slow, broad wave patterns.
Very subtle foam crests at wave peaks. Deep, opaque feel — no seafloor
visible. Dark blue-black palette with occasional deep teal highlight.
Flat top-down view, diffuse-lit. Must tile seamlessly at all four edges.
Photorealistic game terrain texture.
```

### Swamp (`assets/textures/terrain_swamp.png`)
```
Seamless tileable murky swamp texture, top-down view, 1024×1024 pixels.
Dark green-brown stagnant water with patches of floating algae, lily pads,
and exposed muddy ground. Small patches of tall reeds at scattered
positions. Murky olive-brown palette with dark green algae patches. Flat
top-down view, diffuse-lit. Must tile seamlessly at all four edges.
Photorealistic game terrain texture.
```

---

## UV Mapping Reference

> All building OBJs use a uniform box-projection UV layout so a single
> seamless texture maps correctly onto every face. Textures generated from
> the prompts below must respect these assumptions.

### OBJ Face Layout (per generated box)

Each box-shaped sub-mesh has 6 quad faces with UVs mapped to the full
[0,1] × [0,1] range per face:

| Face  | Normal  | UV (0,0) corner       | Wrapping                 |
|-------|---------|-----------------------|--------------------------|
| Front | +Z      | bottom-left (-w,-y,+d)| (0,0)→(1,0)→(1,1)→(0,1) |
| Right | +X      | bottom-left (+w,-y,+d)| (0,0)→(1,0)→(1,1)→(0,1) |
| Back  | -Z      | bottom-left (+w,-y,-d)| (0,0)→(1,0)→(1,1)→(0,1) |
| Left  | -X      | bottom-left (-w,-y,-d)| (0,0)→(1,0)→(1,1)→(0,1) |
| Top   | +Y      | bottom-left (-w,+y,+d)| (0,0)→(1,0)→(1,1)→(0,1) |
| Bottom| -Y      | bottom-left (-w,-y,+d)| (0,0)→(1,0)→(1,1)→(0,1) |

### Roof Triangles (cottage / house shapes)

Gabled roof slopes use triangular UVs:
- Front slope: (0,0) — (1,0) — (0.5,1)
- Back slope: same, inverted winding
- Side quads: standard [0,1] wrapping

### Texture Requirements

- **Every prompt must specify "seamless/tileable"** — a texture that tiles
  cleanly at all four edges without visible seams at face boundaries.
- **Square format (512×512)** — no aspect-ratio distortion on square UV faces.
- **Flat diffuse lighting** — no baked shadows, directional highlights, or
  ambient occlusion. Engine lighting handles that at runtime.
- **Grayscale is acceptable** — Babylon.js `StandardMaterial` can tint via
  `diffuseColor` on top of the texture, so neutral/desaturated works.

### Material → Texture Mapping

| OBJ shape template      | MTL reference            | Prompt section              |
|-------------------------|--------------------------|-----------------------------|
| cottage base, house     | `building_timber.png`    | Timber Planks               |
| cottage roof, barn      | `building_thatch.png`    | Thatch / Straw              |
| keep                   | `building_stone.png`     | Stone Masonry               |
| dark keep              | `building_darkstone.png` | Dark Stone                  |
| temple                 | `building_marble.png`    | White Marble                |
| cottage (forge), smith | `building_metal.png`     | Wrought Iron / Dark Metal   |
| mine, marketplace      | `building_adobe.png`     | Mud-Brick / Adobe           |
| humanoid               | `unit_*.png`             | Unit Textures               |

---

## Building Textures

> **All building textures: 512×512 pixels, seamless/tileable, PNG format.**
> Output path: `assets/textures/building_<name>.png`
> Applied via Babylon.js `StandardMaterial.diffuseTexture` in `BuildingMesh.ts`.
> Each prompt below targets one material category; run separately for each.

### Stone Masonry (`assets/textures/building_stone.png`)
**Used by:** Castle, Fortress, Guard Tower, Siege Workshop, Stonecutter, Quarry,
Dark Fortress, Demon Gate, Wall, Wall Corner, Wall Gate
```
Seamless tileable medieval stone masonry texture, 512×512 pixels. Hand-cut
grey-brown limestone blocks with visible mortar lines, irregular sizes and
shapes. Weathered surface with subtle moss patches in crevices, faint
discoloration from centuries of exposure. Rough chisel marks visible on
individual stones. Neutral warm grey palette (RGB ~140,130,115). Flat square-on
view, evenly lit. No shadows, no modern elements, no text. Pure material
texture, photorealistic game asset quality. Tiles seamlessly on all four edges.
```

### Timber Planks (`assets/textures/building_timber.png`)
**Used by:** Sawmill, Woodcutter, Storehouse, Storage Yard, Warehouse,
Road Layer, Small/Medium/Large Residence, Lumberjack, Shipyard
```
Seamless tileable rough-sawn timber plank texture, 512×512 pixels. Horizontal
wooden planks with visible grain, knot holes, and saw marks. Weathered warm
brown with grey aging along edges (RGB ~160,120,80). Iron nail heads visible
sparsely. Slight gaps between planks for shadow depth. Flat square-on view,
even diffuse lighting. No shadows, no modern elements, no text. Pure material
texture, photorealistic game asset quality. Tiles seamlessly on all four edges.
```

### Thatch / Straw (`assets/textures/building_thatch.png`)
**Used by:** Farm, Apiary, Bakery, Mill, Mead Maker, Fisheries, Vineyard,
Agave Farm, Ranch buildings (Goat/Pig/Goose/Donkey), Trojan Farm
```
Seamless tileable medieval thatched roof texture, 512×512 pixels. Dense bundles
of dried wheat straw, tightly packed in horizontal layers. Golden-brown with
patches of darker amber where weathered (RGB ~180,155,100). Slightly uneven
surface with individual straw strands visible, overlapping bundles creating
directional texture. Warm organic feel, cottage atmosphere. Flat square-on
view, evenly lit. No shadows, no modern elements, no text. Pure material
texture, photorealistic game asset quality. Tiles seamlessly on all four edges.
```

### White Marble (`assets/textures/building_marble.png`)
**Used by:** All temple/sanctuary buildings: Temple of Bacchus/Chac,
Colosseum, Amphitheater, Observatory, Oracle, Small/Large Temple,
all Sanctuary of * variants, Mead Hall
```
Seamless tileable white marble texture, 512×512 pixels. Smooth polished white
stone with faint grey veining running diagonally. Subtle crystalline sparkle,
minor natural imperfections and hairline cracks. Cool white base (RGB ~230,228,222)
with pale grey veins (RGB ~190,185,180). Classical Greco-Roman architectural
material, looks carved and monumental. Flat square-on view, evenly lit.
No shadows, no modern elements, no text. Pure material texture, photorealistic
game asset quality. Tiles seamlessly on all four edges.
```

### Wrought Iron / Dark Metal (`assets/textures/building_metal.png`)
**Used by:** Smelter, Gold/Iron Smelter, Blacksmith, Toolsmith, Weaponsmith,
Armory, Weapon Foundry, Powder Mill, Oil Press, Slaughterhouse
```
Seamless tileable dark wrought-iron metal texture, 512×512 pixels. Riveted
iron plates with hammer marks visible on surface. Dark charcoal-grey base
(RGB ~55,50,48) with patches of orange-brown rust around rivets and edges.
Subtle scratches and scuffs from heavy industrial use. Industrial forge
aesthetic. Flat square-on view, evenly lit. No shadows, no modern elements,
no text. Pure material texture, photorealistic game asset quality. Tiles
seamlessly on all four edges.
```

### Mud-Brick / Adobe (`assets/textures/building_adobe.png`)
**Used by:** Mine, Gold/Coal/Iron Ore/Sulfur Mine, Healer, Distillery,
Marketplace, Mushroom Farm, Runestone
```
Seamless tileable sun-baked mud-brick adobe texture, 512×512 pixels. Rough
rectangular clay bricks with sandy orange-brown color (RGB ~175,140,95).
Straw fibers visible embedded in dried mud. Irregular edges, slight erosion
and chipping on brick faces. Warm earthy tones, desert-appropriate material.
Flat square-on view, evenly lit. No shadows, no modern elements, no text.
Pure material texture, photorealistic game asset quality. Tiles seamlessly on
all four edges.
```

### Dark Stone (`assets/textures/building_darkstone.png`)
**Used by:** Dark Temple, Dark Garden, Dark Fortress, Demon Gate,
Sanctuary of Morbus, Sanctuary of Pestilence
```
Seamless tileable dark volcanic stone texture, 512×512 pixels. Basalt-like
dark grey-black blocks (RGB ~45,40,38) with sharp angular fractures. Faint
purple undertone in crevices suggesting dark magic corruption. Smooth but
slightly pitted surface. Ominous, gothic architectural material. Flat square-on
view, evenly lit. No shadows, no modern elements, no text. Pure material
texture, photorealistic game asset quality. Tiles seamlessly on all four edges.
```

---

## Particle Textures

> **All particle textures: 128×128 pixels, grayscale on transparent background, PNG.**
> Output path: `assets/textures/particle_<name>.png`
> Applied via Babylon.js `ParticleSystem.particleTexture` in `ParticleSystem.ts`.
>
> **UV layout:** Each particle is a single GPU billboard quad — one sprite per
> texture file. The sprite fills the full [0,1] UV range. No UV sheet or atlas
> layout needed. The texture should be centered with feathered edges fading to
> transparent so particles blend smoothly when overlapping.

### Smoke (`assets/textures/particle_smoke.png`)
```
Single soft billowy smoke puff on transparent background, 128×128 pixels.
Circular cloudy shape with feathered edges fading to full transparency.
Grayscale (white center fading to transparent at edges). No hard edges.
Used as a GPU particle sprite. High quality, professional particle texture.
```

### Fire (`assets/textures/particle_fire.png`)
```
Single flame particle sprite on transparent background, 128×128 pixels.
Teardrop-shaped orange-to-yellow gradient, bright white-hot core fading to
transparent orange edges. No hard outlines. Used as a GPU particle sprite.
High quality, professional particle texture.
```

### Explosion (`assets/textures/particle_explosion.png`)
```
Circular fireball burst particle sprite on transparent background, 128×128
pixels. Expanding ring of orange-red with irregular flame tendrils at edges,
darker red center. Grayscale-compatible but with warm tone. Feathered edges.
Used as a GPU particle sprite. High quality, professional particle texture.
```

### Spark (`assets/textures/particle_spark.png`)
```
Small bright spark particle sprite on transparent background, 128×128 pixels.
Tiny brilliant white circle with soft glow halo, fading rapidly to transparent.
Sharp center, soft falloff. Used as a GPU particle sprite. High quality,
professional particle texture.
```

### Dust (`assets/textures/particle_dust.png`)
```
Soft circular dust particle sprite on transparent background, 128×128 pixels.
Medium grey-brown cloudy circle with very feathered edges, semi-transparent
throughout. No hard center — fully diffuse cloud. Used as a GPU particle
sprite. High quality, professional particle texture.
```

### Rain (`assets/textures/particle_rain.png`)
```
Single raindrop streak particle sprite on transparent background, 128×128
pixels. Thin vertical white-blue line with motion-blur elongation, bright
center fading to transparent at tips. 45-degree slant optional. Used as a
GPU particle sprite. High quality, professional particle texture.
```

### Snow (`assets/textures/particle_snow.png`)
```
Single snowflake particle sprite on transparent background, 128×128 pixels.
Soft white circular blob with feathered edges, fully opaque center fading
to transparent. Gentle diffuse glow. Used as a GPU particle sprite.
High quality, professional particle texture.
```

### Water Splash (`assets/textures/particle_water.png`)
```
Water droplet/splash particle sprite on transparent background, 128×128
pixels. Small bright cyan-blue circle with slight irregular edge and soft
glow. Semi-transparent center, fully transparent edges. Used as a GPU
particle sprite. High quality, professional particle texture.
```

### Construction (`assets/textures/particle_construction.png`)
```
Wood chip / debris particle sprite on transparent background, 128×128 pixels.
Irregular polygonal shape in warm brown tones, like a small splinter of wood.
Opaque center, slightly feathered edges. Used as a GPU particle sprite.
High quality, professional particle texture.
```

### Spawn (`assets/textures/particle_spawn.png`)
```
Bright white radial glow particle sprite on transparent background, 128×128
pixels. Circular gradient from pure white center to fully transparent edge.
Soft flare quality, no hard transition. Used for unit/building spawn effects.
High quality, professional particle texture.
```

### Death (`assets/textures/particle_death.png`)
```
Crimson burst particle sprite on transparent background, 128×128 pixels.
Deep red circular shape with slightly irregular spiky edges, fading to
transparent. Dark burgundy center. Used for unit death effects. High quality,
professional particle texture.
```

### Flash (`assets/textures/particle_flash.png`)
```
Lens flare flash particle sprite on transparent background, 128×128 pixels.
Horizontal elongated bright white rectangle with soft glow halo. Sharp center,
rapid falloff. Used for impact/lightning effects. High quality, professional
particle texture.
```

### Impact (`assets/textures/particle_impact.png`)
```
Starburst impact spark sprite on transparent background, 128×128 pixels.
Irregular 4-point star shape in bright white-yellow, feathered edges.
Energetic, sharp feel. Used for combat hit effects. High quality,
professional particle texture.
```

### Fog (`assets/textures/particle_fog.png`)
```
Large diffuse mist particle sprite on transparent background, 128×128 pixels.
Very soft grey circular cloud, almost entirely semi-transparent with no
hard center. Extremely feathered edges. Used for atmospheric fog layers.
High quality, professional particle texture.
```

### Magic (`assets/textures/particle_magic.png`)
```
Magical sparkle particle sprite on transparent background, 128×128 pixels.
Small diamond/star shape in bright purple-magenta with white core and soft
glow halo. Enchanting, mystical feel. Used for spell effects. High quality,
professional particle texture.
```

---

## Unit Textures

> **Unit textures are 256×256 character UV sheets — each body region maps to
> a specific quadrant of the image. The humanoid OBJ uses 6 UV-mapped boxes
> (head, torso, left arm, right arm, left leg, right leg), each wrapping a
> full [0,1] UV quad. The prompt must describe what goes in each region so
> the generated texture wraps correctly around the model.**
>
> Output path: `assets/textures/unit_<name>.png`
> Format: 256×256 PNG.
>
> ### UV Sheet Layout (all unit types)
>
> ```
> ┌──────────────┬──────────────┐
> │    HEAD      │    HEAD      │
> │  (0.0,1.0)   │  (0.5,1.0)   │
> │  front face  │  back head   │
> ├──────┬───────┼──────┬───────┤
> │ LEFT │ RIGHT │ LEFT │ RIGHT │
> │ ARM  │ ARM   │ LEG  │ LEG   │
> │(0,.6)│(.5,.6)│(0,.2)│(.5,.2)│
> ├──────┴───────┼──────┴───────┤
> │    TORSO     │    TORSO     │
> │  (0.0,0.6)   │  (0.5,0.6)   │
> │  front body  │  back body   │
> └──────────────┴──────────────┘
> Dimensions: (x, y) ranges, origin at bottom-left
> ```

### Settler (`assets/textures/unit_settler.png`)
```
Character UV texture sheet for a medieval settler, 256×256 pixels. Layout
as described above. Head region (top half, left side): fair-skinned face
looking forward, brown eyes, short brown hair. Head back (top half, right):
same hair from behind. Torso front (bottom-left quadrant): warm beige/cream
linen tunic with brown leather belt across middle, slight fabric weave
texture. Torso back (bottom-right quadrant): same tunic from behind, belt
visible as horizontal line. Left arm (left center): cream sleeve matching
tunic, brown hand. Right arm (right center): same. Left leg (lower-left):
brown trousers, black leather boot. Right leg (lower-right): same. No
background — transparent outside UV islands. Seamless blending where tunic
meets sleeves. Flat diffuse lighting, no baked shadows. Siedler 4 style.
```

### Soldier / Swordsman (`assets/textures/unit_soldier.png`)
```
Character UV texture sheet for a medieval soldier, 256×256 pixels. Layout
as described above. Head front: stern face, short dark hair, grey steel
helmet covering top. Head back: helmet from behind. Torso front: dark grey
chainmail with deep red tabard overlay (RGB 160,40,35), metallic sheen on
mail rings, red fabric with subtle fold lines. Torso back: chainmail from
behind, tabard edge visible. Arms: chainmail sleeves, grey gauntlets. Legs:
dark grey plate greaves, metal boots. No background. Flat diffuse. Siedler 4 style.
```

### Archer / Bowman (`assets/textures/unit_archer.png`)
```
Character UV texture sheet for a medieval archer, 256×256 pixels. Layout
as described above. Head front: focused expression, brown hair, forest green
hood (RGB 80,140,70) framing face. Head back: green hood from behind.
Torso front: forest green tunic with brown leather cross-strap across chest
(for quiver mount). Slight fabric weave. Torso back: green tunic, brown
quiver strap visible across back. Arms: green sleeves rolled at elbow, bare
forearms (flesh tone). Legs: brown leather trousers, soft leather boots.
No background. Flat diffuse. Siedler 4 style.
```

### Worker (`assets/textures/unit_worker.png`)
```
Character UV texture sheet for a medieval worker, 256×256 pixels. Layout
as described above. Head front: friendly face, short brown hair, no helmet.
Head back: hair from behind. Torso front: brown linen tunic (RGB 140,110,75)
with grey apron overlay in center. Tool belt with small pouch. Slight dirt
stains on apron. Torso back: brown tunic, apron strings tied behind. Arms:
brown sleeves rolled up, work-worn hands. Legs: grey-brown trousers, simple
leather shoes. No background. Flat diffuse. Siedler 4 style.
```

### Pioneer (`assets/textures/unit_pioneer.png`)
```
Character UV texture sheet for a medieval pioneer/explorer, 256×256 pixels.
Layout as described above. Head front: rugged face, dusty brown hair, wide-
brimmed leather hat. Head back: hat from behind. Torso front: dark brown
leather jerkin (RGB 130,95,60) with tan cotton undershirt visible at neck
and hem. Small pickaxe emblem on chest. Torso back: leather jerkin, shoulder
straps. Arms: leather sleeves, reinforced gloves. Legs: dark brown trousers
tucked into tall boots. Dust layer on boots. No background. Flat diffuse.
Siedler 4 style.
```

---

## Sound Effects

Sound effects are **procedurally generated** via the Web Audio API in
`src/audio/SoundManager.ts`. Six default sounds (select, place, error,
tick, win, lose) are synthesized from oscillator tones with gain envelopes.
No AI prompts involved — pure procedural audio.

---

## Building & Unit Models

3D building models are generated procedurally by `scripts/generate_building_objs.py`
(76 OBJ+MTL pairs across 8 shape templates). Models are loaded via Babylon.js
`SceneLoader.ImportMeshAsync` in `src/rendering/BuildingMesh.ts`, with a
procedural-primitive fallback when OBJ files are missing. Texture prompts
above in §Building Textures and §Unit Textures.

---

*Last updated: 2026-07-10 · See also: `scripts/generate_art.py` for the
Gemini/OpenRouter generation script, `scripts/generate_building_objs.py` for
procedural building geometry.*
