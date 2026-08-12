# Animations — Mayans

## Purpose
Animation clip definitions in JSON format for the **Mayans** nation pack.
Each JSON file describes keyframe-style animation clips that the rendering
layer plays for specific building or unit kinds.

## Sub-folders
| Sub-folder | Purpose |
|------------|---------|
| `buildings/` | Building animations (construction, production, demolition) |
| `units/` | Unit animations (idle, walk, work, carry, attack) |

## File format
JSON conforming to the internal animation schema. Each file may:
- Define multiple named **clips** (`construction`, `production`, `idle`,
  `walk`, `attack`, etc.).
- Inherit from another file via `"extends": "generic"`.
- Reference particle effects via the `particle` field.
- Define **transitions** between clips (e.g. `"idle->walk"`).

## Consumption
Animations are loaded by name from the path stored in `nation.json`:
```json
"animations": "animations/units/worker.json"
```
