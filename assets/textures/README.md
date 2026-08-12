# Shared / Global Textures

## Purpose
This folder contains **global texture assets** that are shared across all
nations and game systems. It holds building material textures (used as fallback
when a nation pack doesn't override), resource icon textures, particle effect
sheets, and prompt documentation.

> **Nation-specific textures** live under each nation pack in
> `assets/nations/{nation}/textures/`. This folder is for the *shared/fallback*
> set only.

## Sub-folders
This folder is intentionally **flat** — all files live directly here (no
sub-directories). See `PROMPTS.md` in this folder for the Gemini prompts used to
generate the UI textures, and `assets/MODEL_LISTING.md` for the canonical asset
catalog.

## What is expected here

### Building material textures
Shared material textures used as fallback for any building whose nation pack
doesn't provide an override. Referenced from `nation.json` as
`textures/buildings/building_{material}.png`.

| File | Description |
|------|-------------|
| `building_timber.png` | Weathered timber / wood planks |
| `building_stone.png` | Cut stone, warm grey |
| `building_marble.png` | Polished marble, white / cream |
| `building_thatch.png` | Thatch roof + timber walls |

### Resource icons
Small circular icons used in HUD, economy overlay, and logistics UI.

| File | Resource |
|------|----------|
| `icon_wood.png` | Wood / planks |
| `icon_stone.png` | Stone |
| `icon_iron.png` | Iron ore |
| `icon_coal.png` | Coal |
| `icon_gold.png` | Gold |
| `icon_sulfur.png` | Sulfur |
| `icon_food.png` | Food |
| `icon_planks.png` | Processed planks |
| `icon_tools.png` | Tools |
| `icon_weapons.png` | Weapons |
| `icon_beer.png` | Beer / mead |

### Particle textures
Small square sprites used by the Babylon.js particle systems (smoke, sparks,
dust, leaves).

| File | Description |
|------|-------------|
| `particle_smoke.png` | Soft grey radial gradient — smoke |
| `particle_spark.png` | Sharp yellow-orange radial — sparks |

### Prompt documentation
| File | Description |
|------|-------------|
| `PROMPTS.md` | Gemini prompts + generation instructions for all procedural UI textures in this folder |

## Regeneration
```bash
python3 scripts/generate_ui_textures.py
```
See `PROMPTS.md` in this folder and `assets/ui/README.md` for details.

## Asset Policy
All textures here are **generated from scratch** (Gemini image generation or
procedural). No original Siedler 4 textures are used.
