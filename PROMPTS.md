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

## Terrain Textures

Terrain textures are **procedurally generated** at runtime via a splat-map
shader in `src/rendering/TerrainRenderer.ts`. No AI prompts are used — the
`generateSplatMap()` method assigns RGB colors per terrain type:

| Terrain    | RGB           | Visual        |
|------------|---------------|---------------|
| Grass      | (50, 200, 50) | Green fields  |
| Forest     | (20, 100, 20) | Dark woodland |
| Desert     | (200, 200, 50)| Sandy plains  |
| Mountain   | (100, 100, 100)| Grey peaks   |
| Snow       | (220, 220, 255)| White caps   |
| Water      | (30, 80, 200) | Blue water    |
| DeepWater  | (10, 30, 100) | Dark ocean    |
| Swamp      | (50, 100, 50) | Murky marsh   |

**Future direction**: Replace procedural colors with AI-generated seamless
terrain texture atlases. Prompts for those should be added below when needed.

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

> **Unit textures are applied as diffuse color + simple detail on glTF/OBJ models.**
> Output path: `assets/textures/unit_<name>.png`
> Format: 256×256, flat color with subtle fabric/armor detail, PNG.

### Settler (`assets/textures/unit_settler.png`)
```
Simple unit texture for civilian settler character, 256×256 pixels. Flat
warm beige/cream tunic with brown leather belt. Slight fabric weave texture
visible on tunic. Neutral pose, no background. Used as diffuse map on 3D
character model. Siedler 4 style, simple geometric shapes.
```

### Soldier / Swordsman (`assets/textures/unit_soldier.png`)
```
Simple unit texture for military soldier character, 256×256 pixels. Dark
grey chainmail/armor with red tabard overlay. Metallic sheen on armor plates
(RGB ~120,115,110), deep red fabric (RGB ~160,40,35). Slight rivet detail on
armor. No background. Siedler 4 style, simple shapes.
```

### Archer / Bowman (`assets/textures/unit_archer.png`)
```
Simple unit texture for archer character, 256×256 pixels. Forest green tunic
(RGB ~80,140,70) with brown leather quiver on back. Lighter green hood.
Slight texture weave on fabric. No background. Siedler 4 style, simple shapes.
```

### Worker (`assets/textures/unit_worker.png`)
```
Simple unit texture for worker character, 256×256 pixels. Brown linen tunic
(RGB ~140,110,75) with grey apron. Simple functional clothing, slight wear
marks. Neutral pose, no background. Siedler 4 style, simple shapes.
```

### Pioneer (`assets/textures/unit_pioneer.png`)
```
Simple unit texture for pioneer character, 256×256 pixels. Dark brown leather
jerkin (RGB ~130,95,60) with tan undershirt. Mining/exploration aesthetic,
rugged appearance. No background. Siedler 4 style, simple shapes.
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
