# Models — Mayans

## Purpose
3D meshes for the **Mayans** nation pack, loaded via Babylon.js `SceneLoader`.

## Sub-folders
| Sub-folder | Purpose |
|------------|---------|
| `buildings/` | Building geometry — castles, workshops, houses |
| `decorations/` | Border posts, flags, and other decorative props |
| `units/` | Unit models — workers, soldiers, archers, settlers |

## File formats
- **OBJ + MTL** — Wavefront format. Every `.obj` has a paired `.mtl` file.
- **GLB** — Binary glTF. Preferred for units; falls back to OBJ when absent.

## Naming convention
File basenames (without extension) **must match** the building/unit key used
in `nation.json` and `BASE.md` (e.g. `sanctuary_of_thor.obj`).
