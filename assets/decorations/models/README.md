# Decoration Models

## Purpose
3D meshes (`.obj` + `.mtl` pairs or `.glb`) for all **shared environment
decoration props** — trees, rocks, bushes, resource deposits, bridges, carts,
flags, ruins, and more. These are nation-agnostic and loaded when a
nation-specific decoration is not available.

## File formats
- **OBJ + MTL** — Wavefront format. Every `.obj` has a paired `.mtl` of the
  same base name (e.g. `rock.obj` + `rock.mtl`).
- OBJ models here are simple, low-poly, and authored to sit on the ground
  plane at the origin (`y = 0`).

## Naming convention
- Lower-case, snake_case filenames derived from the asset purpose:
  `bush.obj`, `cactus.obj`, `rock_large.obj`, `deposit_iron.obj`,
  `flowers.obj`, `ruins.obj`, `bridge.obj`, `boat.obj`, etc.
- The OBJ `mtl` reference inside each `.obj` file must point to the matching
  `.mtl` via the `mtllib` directive.

## How assets are consumed
Decoration meshes are loaded by `src/rendering/` modules and the
Object Explorer references them at `/decorations/models/{filename}`.

## Regeneration
See `scripts/` and `assets/MODEL_LISTING.md` for the procedural generation
scripts and the canonical catalog of expected models.

## Asset Policy
No original Siedler 4 assets. All models are generated from scratch or sourced
from CC0 libraries. See `AGENTS.md`.
