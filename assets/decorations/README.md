# Decorations

## Purpose
This folder holds **environment decoration models** — flat, standalone 3D props
that are placed on the terrain to flesh out the world. These are *not* building
or unit meshes; they are purely decorative or represent static resource deposits.

All models in this folder are **shared across all nations** (i.e., they are
nation-agnostic). Nation-specific decoration variants (such as border posts with
nation-pennant colours) live under each nation pack in
`assets/nations/{nation}/models/decorations/`.

## File formats
- **OBJ** + **MTL** — Wavefront material files. Every `.obj` is paired with a
  matching `.mtl` of the same base name (e.g. `rock.obj` + `rock.mtl`).
- OBJ models here are simple, low-poly, and authored to sit on the ground plane
  at the origin (`y = 0`).

## Naming convention
- Lower-case, snake_case filenames derived from the asset purpose:
  `bush.obj`, `cactus.obj`, `rock_large.obj`, `deposit_iron.obj`,
  `flowers.obj`, `ruins.obj`, `bridge.obj`, `boat.obj`, etc.
- The OBJ `mtl` reference inside each `.obj` file must point to the matching
  `.mtl` via the `mtllib` directive (already handled by the generators).

## What is expected here
| Category | Example files | Notes |
|----------|--------------|-------|
| Vegetation | `bush`, `cactus`, `flowers`, `mushrooms`, `reed`, `driftwood` | Low-poly plants |
| Rocks / terrain features | `rock.obj`, `rock_large.obj` | Simple geometry |
| Resource deposits | `deposit_coal`, `deposit_iron`, `deposit_gold`, `deposit_stone`, `deposit_sulfur`, `deposit_grain`, `deposit_fish`, `deposit_game` | Mark resource locations |
| Structures | `ruins`, `runestone` | Ruins / lore props |
| Dynamic props | `bridge`, `cart`, `construction` | Bridges, carts, scaffolding |
| Flags | `flag` | Generic flag pole (nation-specific flags are in nation packs) |

## How assets are consumed
Decoration meshes are loaded by `src/rendering/` modules (e.g.
`BuildingMesh.ts`, `BorderPost.ts`) and placed on the map by the terrain / map
rendering pipeline. The Object Explorer (`src/ui/explorer/ObjectExplorer.ts`)
references decoration models under `assets/decorations/` for its static catalog.

## Regeneration
Decoration models are generated from scratch using OpenSCAD-style procedural
scripts. See `scripts/` and `assets/MODEL_LISTING.md` for the canonical catalog
of expected models.

## Asset Policy
**No original Siedler 4 assets.** Everything in this folder is generated from
scratch or sourced from CC0 libraries. See the Asset Policy in `AGENTS.md`.
