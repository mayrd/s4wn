# Textures — Vikings

## Purpose
Texture maps for the **Vikings** nation pack — material / diffuse textures for
buildings, units, and shared common surfaces.

## Sub-folders
| Sub-folder | Purpose |
|------------|---------|
| `buildings/` | Building material textures (timber, stone, marble, ...) |
| `shared/` | Common textures shared across units & buildings |
| `units/` | Unit texture maps (clothing, armor, skin tones, etc.) |

## File naming
Paths in `nation.json` reference textures relative to this folder. Files are
**PNG**, 1024×1024 or larger, SRGB colour space. Naming:
`building_{material}.png` or `unit_{unitKey}.png`.

## Regeneration
Nation textures are tinted / re-styled via Gemini image generation using the
prompts in `nation.json -> assetGeneration.geminiPrompts`. See
`assets/textures/README.md` for shared texture generation instructions.
