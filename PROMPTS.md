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

## Particle System Textures

Particle textures reference PNG files in `assets/textures/` (not yet
generated — placeholder paths in `src/game/particles/ParticleSystem.ts`):

| Particle    | Path                          | Generation Method |
|-------------|-------------------------------|-------------------|
| Smoke       | `particle_smoke.png`          | Procedural or gen |
| Fire        | `particle_fire.png`           | Procedural or gen |
| Explosion   | `particle_explosion.png`      | Procedural or gen |
| Spark       | `particle_spark.png`          | Procedural or gen |
| Dust        | `particle_dust.png`           | Procedural or gen |
| Rain        | `particle_rain.png`           | Procedural or gen |
| Snow        | `particle_snow.png`           | Procedural or gen |
| Water splash| `particle_water.png`          | Procedural or gen |
| Construction| `particle_construction.png`   | Procedural or gen |
| Spawn       | `particle_spawn.png`          | Procedural or gen |
| Death       | `particle_death.png`          | Procedural or gen |
| Flash       | `particle_flash.png`          | Procedural or gen |
| Impact      | `particle_impact.png`         | Procedural or gen |
| Fog         | `particle_fog.png`            | Procedural or gen |
| Magic       | `particle_magic.png`          | Procedural or gen |

---

## Sound Effects

Sound effects are **procedurally generated** via the Web Audio API in
`src/audio/SoundManager.ts`. Six default sounds (select, place, error,
tick, win, lose) are synthesized from oscillator tones with gain envelopes.
No AI prompts involved — pure procedural audio.

---

## Building / Unit Models

3D models are loaded as glTF via Babylon.js `SceneLoader` in
`src/rendering/BuildingMesh.ts`. Models are procedurally created as
Babylon.js meshes (boxes, extrusions). Future models may use Blender
or generative 3D — add prompts here when needed.

---

*Last updated: 2026-07-09 · See also: `scripts/generate_art.py` for the
Gemini/OpenRouter generation script.*
