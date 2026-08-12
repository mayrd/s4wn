# Icons — Mayans

## Purpose
UI icon textures for the **Mayans** nation pack. Small RGBA PNGs (typically
64×64 or 128×128) used in the build menu, HUD, training screens, and
resource displays.

## Sub-folders
| Sub-folder | Purpose |
|------------|---------|
| `buildings/` | Building icons for the build menu palette |
| `resources/` | Resource icons (wood, stone, iron, gold, ...) |
| `ui/` | Nation-specific UI assets (emblem, loading screen) |
| `units/` | Unit icons for the HUD / training menu |

## Naming convention
- **buildings**: `{buildingKey}.png`
- **resources**: `icon_{resource}.png`
- **units**: `unit_{unitKey}.png`
- **ui**: `emblem.png`, `loading_bg.png`

## Consumption
Icon paths are stored in `nation.json`:
```json
"icon": "icons/buildings/castle.png"
"icon": "icons/units/worker.png"
```
